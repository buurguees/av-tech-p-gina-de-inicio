# NEXO AI Chat V2 — ALB357 + Ollama via Supabase Bus

## 1. Visión general

V2 evoluciona el chat IA del ERP para que las respuestas sean generadas por un modelo local (Ollama) ejecutándose en el servidor ALB357, usando Supabase como bus asíncrono de mensajería.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  ERP (Web)   │────▶│    Supabase      │◀────│  ALB357 Worker      │
│  Firebase    │     │  ai.chat_requests│     │  nexo-orchestrator  │
│  Hosting     │◀────│  ai.messages     │────▶│  Ollama (local)     │
└─────────────┘     └──────────────────┘     └─────────────────────┘
    Realtime             Bus asíncrono           service_role
```

### Flujo completo

1. Usuario escribe mensaje en el ERP
2. Frontend llama `ai_add_user_message()` → inserta en `ai.messages`
3. Frontend llama `ai_create_chat_request(processor='alb357')` → inserta en `ai.chat_requests` con status `queued`
4. **NO se llama a la Edge Function** — el request queda en cola
5. Worker ALB357 hace polling con `ai_lock_next_chat_request('alb357', 'nexo-orchestrator@alb357')`
6. Worker lee mensaje del usuario + contexto ERP via RPCs
7. Worker llama a Ollama local (`POST http://127.0.0.1:11434/api/chat`)
8. Worker inserta respuesta con `ai_add_assistant_message()` (metadata incluye request_id, model, latency_ms)
9. Worker marca completado con `ai_complete_chat_request()`
10. ERP recibe el nuevo mensaje via **Realtime** en `ai.messages` (INSERT)
11. Frontend muestra la respuesta sin refresh

---

## 2. Esquema `ai.chat_requests` (V2)

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| id | uuid | gen_random_uuid() | PK |
| conversation_id | uuid | — | FK a ai.conversations |
| user_id | uuid | — | Usuario que creó el request |
| mode | ai.department_scope | 'general' | Departamento/contexto |
| latest_user_message_id | uuid | NULL | Último mensaje del usuario |
| status | ai.request_status | 'queued' | queued/processing/done/error |
| error | text | NULL | Mensaje de error |
| **processor** | text | **'alb357'** | 'edge' \| 'alb357' |
| **model** | text | NULL | Ej: 'qwen2.5:3b' |
| **temperature** | numeric | 0.2 | Temperatura del modelo |
| **max_tokens** | int | 450 | Tokens máximos de respuesta |
| **context_payload** | jsonb | NULL | Cache del contexto enviado |
| **latency_ms** | int | NULL | Latencia de procesamiento |
| **processed_by** | text | NULL | Ej: 'nexo-orchestrator@alb357' |
| **attempt_count** | int | 0 | Intentos de procesamiento |
| **locked_at** | timestamptz | NULL | Timestamp del lock |
| **locked_by** | text | NULL | Identidad del worker |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |

---

## 3. Contrato del Worker externo (ALB357)

### 3.1 Autenticación

El worker usa `SUPABASE_SERVICE_ROLE_KEY` almacenada **solo en el servidor ALB357**. Nunca en frontend.

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://takvthfatlcjsqgssnta.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY // SOLO en servidor
);
```

### 3.2 Polling loop

```javascript
async function pollLoop() {
  while (true) {
    const { data, error } = await supabase.rpc('ai_lock_next_chat_request', {
      p_processor: 'alb357',
      p_lock_owner: 'nexo-orchestrator@alb357'
    });

    if (error) {
      console.error('Lock error:', error);
      await sleep(5000);
      continue;
    }

    const request = data?.[0];
    if (!request) {
      await sleep(3000); // No hay requests pendientes
      continue;
    }

    await processRequest(request);
  }
}
```

### 3.3 Procesamiento de un request

```javascript
async function processRequest(request) {
  const startTime = Date.now();
  try {
    // 1. Leer mensaje del usuario
    const { data: msgData } = await supabase.rpc('ai_get_message_content', {
      p_message_id: request.latest_user_message_id
    });
    const userMessage = msgData?.[0]?.content;

    // 2. Obtener contexto ERP
    const contextRpc = `ai_get_context_${request.mode}`;
    const { data: context } = await supabase.rpc(contextRpc, {
      p_user_id: request.user_id
    });

    // 3. Llamar a Ollama
    const ollamaResponse = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model || 'qwen2.5:3b',
        messages: [
          { role: 'system', content: buildSystemPrompt(request.mode, context) },
          { role: 'user', content: userMessage }
        ],
        options: {
          temperature: request.temperature || 0.2,
          num_predict: request.max_tokens || 450
        },
        stream: false
      })
    });
    const result = await ollamaResponse.json();
    const assistantContent = result.message?.content;
    const latencyMs = Date.now() - startTime;
    const modelUsed = result.model || request.model || 'qwen2.5:3b';

    // 4. Guardar respuesta
    await supabase.rpc('ai_add_assistant_message', {
      p_conversation_id: request.conversation_id,
      p_content: assistantContent,
      p_mode: request.mode,
      p_metadata: {
        request_id: request.id,
        mode: request.mode,
        model: modelUsed,
        latency_ms: latencyMs,
        processor: 'alb357'
      }
    });

    // 5. Marcar completado
    await supabase.rpc('ai_complete_chat_request', {
      p_request_id: request.id,
      p_lock_owner: 'nexo-orchestrator@alb357',
      p_latency_ms: latencyMs,
      p_model: modelUsed
    });

  } catch (err) {
    // 6. Marcar error
    await supabase.rpc('ai_fail_chat_request', {
      p_request_id: request.id,
      p_error: err.message || 'Unknown error'
    });
  }
}
```

---

## 4. RPCs V2

### `ai_lock_next_chat_request(p_processor, p_lock_owner)`

- **SECURITY DEFINER** — solo ejecutable con service_role
- Filtra por `processor = p_processor` (ajuste crítico: no mezcla procesadores)
- Recupera stale locks: requests en `processing` con `locked_at > 5 min` atrás
- Usa `FOR UPDATE SKIP LOCKED LIMIT 1` para atomicidad
- Incrementa `attempt_count`
- Retorna: id, conversation_id, user_id, mode, latest_user_message_id, status, processor, model, temperature, max_tokens, attempt_count, created_at

### `ai_complete_chat_request(p_request_id, p_lock_owner, p_latency_ms, p_model)`

- **SECURITY DEFINER**
- Valida `status = 'processing' AND locked_by = p_lock_owner` (ajuste crítico: evita que otro proceso marque done)
- Registra: latency_ms, model, processed_by

### `ai_fail_chat_request(p_request_id, p_error)`

- **SECURITY DEFINER**
- Marca error, limpia locked_at y locked_by

### `ai_retry_chat_request(p_request_id)`

- **SECURITY INVOKER** — valida ownership del usuario
- Solo si `status = 'error'`
- Re-pone en `queued`, limpia error y locks
- Mantiene `attempt_count` para trazabilidad

### `ai_get_latest_request_status(p_conversation_id)`

- **SECURITY INVOKER** — valida ownership
- Retorna status y error del último request de la conversación
- Usado por el frontend para polling ligero (cada 3s)

### `ai_create_chat_request` (modificada V2)

- Nuevos parámetros: `p_processor` (default 'alb357'), `p_model`, `p_temperature`, `p_max_tokens`

---

## 5. Frontend V2 — Cambios

### 5.1 `useSendMessage.ts`

- Ya NO llama `fetch()` a la Edge Function
- Crea request con `p_processor: 'alb357'`
- El request queda `queued` y ALB357 lo recoge

### 5.2 `useRequestStatus.ts` (nuevo)

- Polling ligero: RPC `ai_get_latest_request_status` cada 3s (máx 60s)
- Devuelve: `requestStatus` ('idle'|'queued'|'processing'|'done'|'error'), `requestError`, `retryRequest()`
- Se detiene cuando llega mensaje assistant (via Realtime en ai.messages) o status terminal
- No usa Realtime en ai.chat_requests (evita problemas RLS con service_role)

### 5.3 `ChatPanel.tsx`

- Banner de estado entre mensajes e input:
  - `queued` → 🕐 "Esperando agente..."
  - `processing` → ⏳ "Analizando..."
  - `error` → ⚠️ mensaje error + botón "Reintentar"
- Se oculta cuando status='idle' o 'done'

---

## 6. Seguridad

| Aspecto | Implementación |
|---------|---------------|
| service_role | Solo en ALB357, nunca en frontend |
| RLS | Estricta en conversaciones y mensajes (ya V1) |
| Lock RPCs | SECURITY DEFINER — solo service_role |
| Retry RPC | SECURITY INVOKER — valida ownership |
| Status RPC | SECURITY INVOKER — valida ownership |
| Realtime | Solo en ai.messages (INSERT), NO en ai.chat_requests |

---

## 7. Configuración Ollama esperada

```yaml
# En ALB357
modelo: qwen2.5:3b
endpoint: http://127.0.0.1:11434
temperatura_default: 0.2
max_tokens_default: 450
```

El worker puede pasar cualquier modelo disponible en Ollama. El modelo se registra en `ai.chat_requests.model` y en la metadata del mensaje assistant.

---

## 8. Diferencias V1 vs V2

| Aspecto | V1 | V2 |
|---------|----|----|
| Procesador | Edge Function (stub/template) | ALB357 + Ollama |
| Modelo | Ninguno (respuesta plantilla) | qwen2.5:3b (configurable) |
| Invocación | Frontend llama Edge Function | Frontend crea request, worker lo recoge |
| Concurrencia | N/A | FOR UPDATE SKIP LOCKED + locked_by |
| Trazabilidad | Básica | processor, model, latency_ms, processed_by, attempt_count |
| Estado en UI | Solo "Procesando..." | queued/processing/error + retry |
| Stale lock recovery | N/A | Locks > 5 min se re-procesan |
| Retry | N/A | RPC ai_retry_chat_request |

---

## 9. Metadata recomendada en `ai.messages`

Al insertar el mensaje assistant, el worker debe incluir en `metadata`:

```json
{
  "request_id": "uuid-del-request",
  "mode": "general",
  "model": "qwen2.5:3b",
  "latency_ms": 1234,
  "processor": "alb357"
}
```

Esto permite análisis posterior de rendimiento y uso por departamento.
