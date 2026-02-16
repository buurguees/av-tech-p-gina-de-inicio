

# Plan: NEXO AI Chat V2 — ALB357 + Ollama via Supabase Bus

## Resumen

Evolucionar V1 para que un worker externo en ALB357 procese requests con Ollama. Supabase actua como bus asincrono. El frontend deja de llamar la Edge Function, muestra estados (queued/processing/error) y permite reintentar. Se incorporan los 4 ajustes criticos del review.

---

## Fase 1: Migracion SQL

Una sola migracion que:

### 1.1 Nuevas columnas en `ai.chat_requests`

```text
processor text NOT NULL DEFAULT 'alb357'
model text
temperature numeric DEFAULT 0.2
max_tokens int DEFAULT 450
context_payload jsonb
latency_ms int
processed_by text
attempt_count int NOT NULL DEFAULT 0
locked_at timestamptz
locked_by text
```

### 1.2 Nuevas RPCs

**`ai_lock_next_chat_request(p_processor text, p_lock_owner text)`**
- SECURITY DEFINER (solo service_role puede ejecutarlo)
- Filtra `WHERE status = 'queued' AND processor = p_processor` (ajuste critico 1: filtra por processor)
- Tambien recoge stale locks: `OR (status = 'processing' AND locked_at < now() - interval '5 minutes')` (ajuste critico 2: timeout de locks)
- Usa `FOR UPDATE SKIP LOCKED LIMIT 1`
- UPDATE: status='processing', locked_at=now(), locked_by=p_lock_owner, attempt_count+1
- Retorna el request completo con los campos V2

**`ai_complete_chat_request(p_request_id uuid, p_lock_owner text, p_latency_ms int, p_model text)`**
- Valida `WHERE id = p_request_id AND status = 'processing' AND locked_by = p_lock_owner` (ajuste critico 3: validar locked_by)
- UPDATE: status='done', latency_ms, model, processed_by=p_lock_owner, updated_at

**`ai_fail_chat_request(p_request_id uuid, p_error text)`**
- UPDATE: status='error', error, updated_at, locked_at=NULL, locked_by=NULL

**`ai_retry_chat_request(p_request_id uuid)`**
- Valida ownership (usuario original o admin/manager)
- Solo si status='error'
- UPDATE: status='queued', error=NULL, locked_at=NULL, locked_by=NULL, attempt_count mantenido

### 1.3 Modificar `ai_create_chat_request` existente

Anadir parametro `p_processor text DEFAULT 'alb357'` y los opcionales (model, temperature, max_tokens).

### 1.4 Realtime: NO anadir ai.chat_requests (ajuste critico 4)

Se mantiene realtime solo en `ai.messages` (INSERT). El estado del request se consulta por RPC puntual o se infiere del flujo de mensajes.

---

## Fase 2: Frontend — Cambios minimos

### 2.1 `types.ts` — Extender ChatRequest

Anadir campos V2:

```text
processor: 'edge' | 'alb357';
model: string | null;
latency_ms: number | null;
processed_by: string | null;
attempt_count: number;
```

### 2.2 `useSendMessage.ts` — Eliminar fetch a Edge Function

- Llamar `ai_create_chat_request` con `p_processor: 'alb357'`
- Eliminar completamente el bloque fetch() a la Edge Function
- El request queda `queued` y ALB357 lo recoge

### 2.3 Nuevo hook: `useRequestStatus.ts`

Hook ligero que tras enviar un mensaje:
- Hace polling (cada 3s, max 60s) al ultimo request activo de la conversacion via RPC
- Devuelve: `requestStatus` ('idle' | 'queued' | 'processing' | 'done' | 'error'), `requestError`, `retryRequest()`
- Se detiene cuando llega un mensaje assistant (via messages) o status='done'/'error'
- `retryRequest()` llama `ai_retry_chat_request`

Nueva RPC necesaria: `ai_get_latest_request_status(p_conversation_id uuid)` que retorna status y error del ultimo request de esa conversacion.

### 2.4 `ChatPanel.tsx` — Indicadores de estado + Reintentar

- Banner entre mensajes y input:
  - `queued`: icono reloj + "Esperando agente..."
  - `processing`: spinner + "Analizando..."
  - `error`: icono alerta + mensaje error + boton "Reintentar"
- Se oculta cuando status='idle' o 'done'

### 2.5 `AIChatPage.tsx` — Integrar useRequestStatus

- Conectar el hook con la conversacion activa
- Pasar props de estado al ChatPanel

---

## Fase 3: Edge Function — Sin cambios

La Edge Function `ai-chat-processor` se mantiene intacta como fallback manual. El frontend simplemente deja de invocarla. No se elimina ni modifica.

---

## Fase 4: Documentacion

### Crear `docs/important/NEXO-AI-CHAT-V2-ALB357.md`

Contenido:
1. Flujo V2 completo (ERP -> Supabase queue -> ALB357 -> Supabase -> ERP via Realtime)
2. Contrato del worker externo: RPCs en orden, parametros, errores
3. Esquema ai.chat_requests con campos V2
4. Ejemplo de polling loop para el worker
5. Manejo de stale locks y recovery
6. Seguridad: service_role solo en servidor
7. Configuracion Ollama esperada
8. Diferencias V1 vs V2
9. Metadata recomendada en ai.messages (request_id, mode, model, latency_ms, processor)

---

## Archivos a crear (2)

```text
src/pages/nexo_av/ai/logic/hooks/useRequestStatus.ts
docs/important/NEXO-AI-CHAT-V2-ALB357.md
```

## Archivos a modificar (4)

```text
src/pages/nexo_av/ai/logic/types.ts                    -- Campos V2 en ChatRequest
src/pages/nexo_av/ai/logic/hooks/useSendMessage.ts      -- Eliminar fetch Edge Fn, anadir p_processor
src/pages/nexo_av/ai/desktop/components/ChatPanel.tsx   -- UI estados + reintentar
src/pages/nexo_av/ai/desktop/AIChatPage.tsx             -- Integrar useRequestStatus
```

## Migracion SQL (1)

```text
- ALTER TABLE ai.chat_requests ADD COLUMN (10 columnas V2)
- CREATE/REPLACE ai_lock_next_chat_request (con filtro processor + stale lock recovery)
- CREATE/REPLACE ai_complete_chat_request (con validacion locked_by)
- CREATE/REPLACE ai_fail_chat_request
- CREATE/REPLACE ai_retry_chat_request
- CREATE ai_get_latest_request_status
- ALTER ai_create_chat_request (nuevo parametro p_processor)
```

---

## Detalles tecnicos

### Polling vs Realtime para estados

Se usa polling ligero (RPC cada 3s) en lugar de Realtime en ai.chat_requests porque:
- Evita problemas de RLS con Realtime en tablas que el worker modifica via service_role
- El volumen es minimo (1 query cada 3s solo mientras hay request activo)
- La respuesta final llega via Realtime de ai.messages (ya funciona en V1)

### Worker contract (para documentacion)

```text
1. supabase.rpc('ai_lock_next_chat_request', { p_processor: 'alb357', p_lock_owner: 'nexo-orchestrator@alb357' })
2. Si retorna request:
   a. rpc('ai_get_message_content', { p_message_id: request.latest_user_message_id })
   b. rpc('ai_get_context_{mode}', { p_user_id: request.user_id })
   c. POST http://127.0.0.1:11434/api/chat (Ollama)
   d. rpc('ai_add_assistant_message', { ..., p_metadata: { request_id, mode, model, latency_ms, processor: 'alb357' } })
   e. rpc('ai_complete_chat_request', { p_request_id, p_lock_owner, p_latency_ms, p_model })
3. Si falla: rpc('ai_fail_chat_request', { p_request_id, p_error })
```

---

## Orden de implementacion

1. Migracion SQL (columnas V2 + RPCs locking + retry + status)
2. types.ts (campos V2)
3. useSendMessage (quitar fetch, anadir processor)
4. useRequestStatus (nuevo hook polling)
5. ChatPanel + AIChatPage (UI estados + retry)
6. Documentacion V2

