# NEXO AI — API Reference

## RPCs de Conversaciones

### `ai_list_conversations(p_scope?, p_department?, p_limit?, p_cursor?)`
Lista conversaciones accesibles por el usuario autenticado.
- `p_scope`: `'user'` | `'department'` (opcional, filtra)
- `p_department`: `'general'` | `'administration'` | `'commercial'` | `'marketing'` | `'programming'`
- `p_limit`: número (default 50)
- `p_cursor`: timestamp para paginación
- **Retorna**: `{id, title, scope, department, owner_user_id, created_at, updated_at, last_message_at, message_count}`

### `ai_create_conversation(p_title, p_scope?, p_department?)`
Crea una conversación nueva.
- **Retorna**: `{id, title}`

### `ai_get_or_create_personal_conversation()`
Idempotente. Devuelve siempre la misma conversación personal del usuario.
- **Retorna**: `{id, title, created_at}`

### `ai_add_member(p_conversation_id, p_user_id)`
Añade miembro a conversación departamental. Solo admin/manager/owner.

## RPCs de Mensajes

### `ai_list_messages(p_conversation_id, p_limit?, p_before?)`
Lista mensajes de una conversación. Paginación por cursor temporal.
- **Retorna**: `{id, conversation_id, sender, content, mode, metadata, created_at}`

### `ai_add_user_message(p_conversation_id, p_content, p_mode?)`
Inserta mensaje del usuario. Actualiza `updated_at` de la conversación.
- **Retorna**: `{id, created_at}`

### `ai_add_assistant_message(p_conversation_id, p_content, p_mode?, p_metadata?)`
SECURITY DEFINER. Solo para service_role (Edge Function).

## RPCs de Requests

### `ai_create_chat_request(p_conversation_id, p_mode?, p_latest_user_message_id?)`
Crea job en cola con status `queued`.

### `ai_mark_request_processing(p_request_id)`
### `ai_mark_request_done(p_request_id)`
### `ai_mark_request_error(p_request_id, p_error)`

## RPCs de Contexto

### `ai_get_context_general(p_user_id)` → JSONB
`{user, active_projects, active_projects_count, open_quotes_count}`

### `ai_get_context_administration(p_user_id)` → JSONB
`{pending_sale_invoices, pending_sale_count, pending_purchase_invoices, pending_purchase_count}`

### `ai_get_context_commercial(p_user_id)` → JSONB
`{recent_clients, total_clients, open_quotes, open_quotes_count}`

### `ai_get_context_marketing(p_user_id)` → JSONB (placeholder V1)
### `ai_get_context_programming(p_user_id)` → JSONB (placeholder V1)

## Edge Function

### `POST /functions/v1/ai-chat-processor`
- **Headers**: `Authorization: Bearer <jwt>`
- **Body**: `{ "request_id": "<uuid>" }`
- **Respuesta**: `{ "success": true }` o error
