

# Plan: NEXO AI Chat V1 (Read-Only) — Corregido y Listo para Implementar

## Correcciones aplicadas (5 puntos criticos + 2 mejoras)

1. **Edge Function con JWT validado en codigo** — `verify_jwt = false` en config (requerido por signing-keys), pero `getClaims()` valida JWT obligatoriamente en codigo. Sin JWT valido = 401.
2. **Schema `ai` dedicado** — Como `crm`, `sales`, `accounting`, `projects`. No `public` con prefijo.
3. **Ruta integrada: `ai/chat`** bajo `/nexo-av/:userId/` dentro del layout existente. Sidebar corregido de `nexo-ai` a `ai/chat`.
4. **UI 100% Tailwind + shadcn** — Sin CSS BEM nuevo.
5. **Realtime controlado** — Solo `ai.messages` en publication, RLS estricta por conversacion accesible.
6. **Campo `mode` en `ai.messages`** — Para trazabilidad.
7. **RPC `ai_get_or_create_personal_conversation()`** — Evita duplicados de "Mi chat".

---

## Fase 1: Migracion SQL completa

Una sola migracion que crea todo:

### Schema y Enums
- `CREATE SCHEMA IF NOT EXISTS ai`
- Enums en schema `ai`: `conversation_scope`, `department_scope`, `message_sender`, `request_status`

### Tablas (todas en `ai.*`)

**ai.conversations** — id, title, scope, department, owner_user_id, created_at, updated_at

**ai.conversation_members** — id, conversation_id (fk), user_id, role (owner|member), unique(conversation_id, user_id)

**ai.messages** — id, conversation_id (fk), sender, content, mode (department_scope), metadata (jsonb), created_at. Index: (conversation_id, created_at)

**ai.chat_requests** — id, conversation_id (fk), user_id, mode, latest_user_message_id (fk), status, error, created_at, updated_at. Index: (status, created_at)

### RLS (patron existente con `internal.get_authorized_user_id(auth.uid())`, `internal.is_admin()`, `internal.is_manager()`)

- **ai.conversations**: SELECT donde owner = usuario autenticado (scope=user) O es miembro (scope=department) O admin/manager
- **ai.conversation_members**: SELECT donde user_id = usuario O admin/manager
- **ai.messages**: SELECT solo en conversaciones accesibles; INSERT solo sender=user en conversaciones accesibles
- **ai.chat_requests**: INSERT en conversaciones accesibles; SELECT propio o admin/manager

### RPCs (SECURITY DEFINER, en schema public, operan sobre ai.*)

**Conversaciones**
- `ai_list_conversations(p_scope, p_department, p_limit, p_cursor)`
- `ai_create_conversation(p_title, p_scope, p_department)`
- `ai_get_or_create_personal_conversation()` — Devuelve siempre la misma conversacion personal; la crea si no existe (idempotente)
- `ai_add_member(p_conversation_id, p_user_id)` — Solo admin/manager/owner

**Mensajes**
- `ai_list_messages(p_conversation_id, p_limit, p_before)`
- `ai_add_user_message(p_conversation_id, p_content, p_mode)` — Con mode para trazabilidad
- `ai_add_assistant_message(p_conversation_id, p_content, p_mode, p_metadata)` — SECURITY DEFINER, uso exclusivo de service_role

**Requests**
- `ai_create_chat_request(p_conversation_id, p_mode, p_latest_user_message_id)`
- `ai_mark_request_processing(p_request_id)`
- `ai_mark_request_done(p_request_id)`
- `ai_mark_request_error(p_request_id, p_error)`

**Contexto (solo lectura)**
- `ai_get_context_general(p_user_id)` — Usuario, rol, proyectos activos, presupuestos abiertos
- `ai_get_context_administration(p_user_id)` — Facturas venta/compra pendientes (top 10, conteos)
- `ai_get_context_commercial(p_user_id)` — Clientes recientes, presupuestos abiertos
- `ai_get_context_marketing(p_user_id)` — Placeholder V1 (contrato definido, arrays vacios)
- `ai_get_context_programming(p_user_id)` — Placeholder V1 (contrato definido, arrays vacios)

### Realtime
```text
ALTER PUBLICATION supabase_realtime ADD TABLE ai.messages;
```

### Backup (ya aplicado)
La funcion `backup.run_daily_backup()` ya incluye las 4 tablas `ai.*` (migracion anterior).

---

## Fase 2: Edge Function `ai-chat-processor`

Archivo: `supabase/functions/ai-chat-processor/index.ts`

Config (`supabase/config.toml`):
```text
[functions.ai-chat-processor]
verify_jwt = false
```

Validacion JWT en codigo (patron `getClaims()`):
1. Extrae `Authorization: Bearer <jwt>` del header
2. Valida con `supabase.auth.getClaims(token)` — rechaza si invalido (401)
3. Extrae `userId` de `claims.sub`
4. Crea cliente con `SUPABASE_SERVICE_ROLE_KEY` para operaciones privilegiadas
5. Verifica que el `chat_request` pertenece al usuario autenticado
6. Marca request `processing`
7. Carga ultimo mensaje y llama RPC de contexto segun `mode`
8. Genera respuesta V1 (template basado en contexto, sin LLM)
9. Guarda mensaje assistant via `ai_add_assistant_message` (service_role)
10. Marca request `done` (o `error` si falla)

Usa `_shared/cors.ts` existente.

---

## Fase 3: Logic Layer

Estructura:
```text
src/pages/nexo_av/ai/logic/
  types.ts           -- Conversation, Message, ChatRequest, enums TS
  constants.ts       -- AI_MODES array con labels
  hooks/
    useConversations.ts  -- supabase.rpc('ai_list_conversations') + ai_get_or_create_personal_conversation
    useMessages.ts       -- supabase.rpc('ai_list_messages') + Realtime subscription INSERT en ai.messages
    useSendMessage.ts    -- ai_add_user_message + ai_create_chat_request + invoke Edge Function
```

---

## Fase 4: Frontend Desktop (solo Tailwind + shadcn)

```text
src/pages/nexo_av/ai/desktop/
  AIChatPage.tsx
  components/
    ConversationList.tsx
    ChatPanel.tsx
    ModeSelector.tsx
    MessageBubble.tsx
    NewConversationDialog.tsx
```

**AIChatPage**: Layout flex 2 columnas (w-72 border-r | flex-1). Sin CSS BEM nuevo.

**ConversationList**: Seccion "Personal" (Mi chat, autocreado via RPC) + Seccion "Departamentos" + Boton "+" (NewConversationDialog)

**ChatPanel**: Header (titulo + ModeSelector) + Area mensajes (scroll, auto-scroll) + Input textarea + boton enviar. Estado "procesando..." mientras request en curso.

**ModeSelector**: shadcn Select con 5 modos.

**MessageBubble**: User = derecha fondo primary, Assistant = izquierda fondo muted. Markdown basico con `prose` classes.

---

## Fase 5: Routing y Sidebar

### Sidebar.tsx
Cambiar linea 332: `navigate(\`/nexo-av/\${userId}/nexo-ai\`)` a `navigate(\`/nexo-av/\${userId}/ai/chat\`)`
Cambiar lineas 333-335: isActive path de `nexo-ai` a `ai/chat`

### App.tsx
Anadir lazy import:
```text
const NexoAIChatPage = lazy(() => import("./pages/nexo_av/ai/desktop/AIChatPage"));
```
Anadir ruta dentro del bloque `<Route path="/nexo-av/:userId" element={<ResponsiveLayout />}>`:
```text
<Route path="ai/chat" element={<NexoAIChatPage />} />
```

---

## Fase 6: Documentacion

```text
src/pages/nexo_av/ai/docs/
  architecture.md   -- Flujo asincrono, preparacion ALB357, diagrama
  api-reference.md  -- RPCs con parametros y respuestas
```

---

## Resumen de archivos

**Nuevos (14)**
- 5 componentes UI desktop
- 3 hooks + types + constants (logic)
- 1 Edge Function
- 2 docs

**Modificados (3)**
- `src/App.tsx` — Ruta ai/chat
- `src/pages/nexo_av/desktop/components/layout/Sidebar.tsx` — Corregir ruta nexo-ai a ai/chat
- `supabase/config.toml` — Config edge function

**Migracion SQL (1)**
- Schema ai completo + enums + tablas + indices + RLS + RPCs + Realtime

---

## Orden de implementacion

1. Migracion SQL (schema + tablas + RLS + RPCs + Realtime)
2. Edge Function ai-chat-processor
3. Logic layer (types, constants, hooks)
4. Componentes UI desktop
5. AIChatPage + Sidebar fix + ruta App.tsx
6. Documentacion

