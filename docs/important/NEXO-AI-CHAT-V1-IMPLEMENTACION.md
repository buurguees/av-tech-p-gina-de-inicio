# NEXO AI Chat V1 — Documentación Técnica de Implementación

**Fecha:** 2026-02-16
**Estado:** V1 operativa (template responses, sin LLM)
**Preparado para:** V2 con ALB357/Ollama sin cambios en frontend

---

## 1. Visión General

NEXO AI es el módulo de chat inteligente del ERP. En V1 funciona con respuestas template basadas en contexto real del ERP. El sistema está diseñado para que en V2 solo se sustituya la lógica de generación de respuesta por un LLM (ALB357/Ollama) sin modificar frontend, base de datos ni flujo asíncrono.

### Flujo completo de un mensaje

```
Usuario escribe mensaje
      │
      ▼
useSendMessage.ts
      │
      ├─ 1. RPC ai_add_user_message() ──▶ INSERT en ai.messages (sender=user)
      │
      ├─ 2. RPC ai_create_chat_request() ──▶ INSERT en ai.chat_requests (status=queued)
      │
      └─ 3. fetch() POST ai-chat-processor Edge Function (fire-and-forget)
              │
              ▼
      Edge Function (ai-chat-processor/index.ts)
              │
              ├─ Valida JWT con getClaims()
              ├─ Resuelve authorized_user_id via get_authorized_user_by_auth_id()
              ├─ Carga chat_request via ai_get_chat_request_for_processing()
              ├─ Verifica ownership (user_id === userId)
              ├─ Marca request como "processing" via ai_mark_request_processing()
              ├─ Carga mensaje del usuario via ai_get_message_content()
              ├─ Carga contexto ERP via ai_get_context_{mode}()
              ├─ Genera respuesta template (V1) o LLM (V2)
              ├─ Guarda respuesta via ai_add_assistant_message()
              └─ Marca request como "done" via ai_mark_request_done()
              
      Mientras tanto, el frontend escucha via Realtime:
      
      supabase.channel('ai-messages-{conversationId}')
        .on('postgres_changes', { event: 'INSERT', schema: 'ai', table: 'messages' })
              │
              ▼
      Mensaje assistant aparece automáticamente en el chat
```

---

## 2. Estructura de Archivos

```
src/pages/nexo_av/ai/
├── desktop/
│   ├── AIChatPage.tsx                    # Página principal (layout 2 columnas)
│   └── components/
│       ├── ConversationList.tsx           # Lista lateral de conversaciones
│       ├── ChatPanel.tsx                  # Panel de mensajes + input
│       ├── ModeSelector.tsx              # Selector de modo (5 modos)
│       ├── MessageBubble.tsx             # Burbuja de mensaje individual
│       └── NewConversationDialog.tsx     # Dialog para crear conversación
├── logic/
│   ├── types.ts                          # Tipos TS (Conversation, Message, ChatRequest)
│   ├── constants.ts                      # AI_MODES con labels y descripciones
│   └── hooks/
│       ├── useConversations.ts           # Lista/crea conversaciones
│       ├── useMessages.ts               # Lista mensajes + suscripción Realtime
│       └── useSendMessage.ts            # Envío: user msg + chat request + edge fn
└── docs/
    ├── architecture.md                   # Diagrama de arquitectura
    └── api-reference.md                  # Referencia de RPCs

supabase/functions/
└── ai-chat-processor/
    └── index.ts                          # Edge Function procesadora
```

---

## 3. Base de Datos — Schema `ai`

### 3.1 Enums

| Enum | Valores |
|------|---------|
| `ai.conversation_scope` | `user`, `department` |
| `ai.department_scope` | `general`, `programming`, `marketing`, `commercial`, `administration` |
| `ai.message_sender` | `user`, `assistant`, `system` |
| `ai.request_status` | `queued`, `processing`, `done`, `error` |

### 3.2 Tablas

#### `ai.conversations`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| title | text | Título de la conversación |
| scope | conversation_scope | `user` (privada) o `department` (compartida) |
| department | department_scope | Departamento asociado |
| owner_user_id | uuid | FK a `internal.authorized_users.id` |
| created_at, updated_at | timestamptz | |

#### `ai.conversation_members`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| conversation_id | uuid FK | → ai.conversations |
| user_id | uuid | authorized_user_id |
| role | text | `owner` o `member` |
| UNIQUE(conversation_id, user_id) | | |

#### `ai.messages`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| conversation_id | uuid FK | → ai.conversations |
| sender | message_sender | `user`, `assistant`, `system` |
| content | text | Contenido del mensaje |
| mode | department_scope | Modo activo al enviar (para trazabilidad) |
| metadata | jsonb | Datos extra (versión, contexto usado, etc.) |
| created_at | timestamptz | |

**Índice:** `(conversation_id, created_at)`
**Realtime:** `ALTER PUBLICATION supabase_realtime ADD TABLE ai.messages`

#### `ai.chat_requests`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| conversation_id | uuid FK | → ai.conversations |
| user_id | uuid | authorized_user_id del solicitante |
| mode | department_scope | Modo de contexto solicitado |
| latest_user_message_id | uuid FK | → ai.messages |
| status | request_status | Estado del procesamiento |
| error | text | Mensaje de error (si status=error) |
| created_at, updated_at | timestamptz | |

**Índice:** `(status, created_at)` — para que ALB357 en V2 pueda hacer polling eficiente.

### 3.3 RLS

- **ai.conversations:** SELECT donde `owner_user_id = usuario` (scope=user) O es miembro (scope=department) O admin/manager.
- **ai.messages:** SELECT solo en conversaciones accesibles. INSERT solo `sender=user` en conversaciones accesibles.
- **ai.chat_requests:** INSERT en conversaciones accesibles. SELECT propio o admin/manager.

Todas las políticas usan `internal.get_authorized_user_id(auth.uid())`, `internal.is_admin()`, `internal.is_manager()` — consistente con el resto del ERP.

---

## 4. RPCs (schema `public`, operan sobre `ai.*`)

Todas son `SECURITY DEFINER` con `SET search_path = ''`.

### Conversaciones
| RPC | Descripción |
|-----|-------------|
| `ai_list_conversations(p_scope?, p_department?, p_limit?, p_cursor?)` | Lista conversaciones accesibles |
| `ai_create_conversation(p_title, p_scope, p_department?)` | Crea conversación + member owner |
| `ai_get_or_create_personal_conversation()` | Idempotente: devuelve siempre "Mi chat" personal |
| `ai_add_member(p_conversation_id, p_user_id)` | Solo admin/manager/owner |

### Mensajes
| RPC | Descripción |
|-----|-------------|
| `ai_list_messages(p_conversation_id, p_limit?, p_before?)` | Paginación por cursor |
| `ai_add_user_message(p_conversation_id, p_content, p_mode?)` | Inserta mensaje del usuario |
| `ai_add_assistant_message(p_conversation_id, p_content, p_mode?, p_metadata?)` | Solo service_role (Edge Fn) |

### Cola de trabajo
| RPC | Descripción |
|-----|-------------|
| `ai_create_chat_request(p_conversation_id, p_mode, p_latest_user_message_id?)` | Crea job en cola |
| `ai_mark_request_processing(p_request_id)` | Marca processing |
| `ai_mark_request_done(p_request_id)` | Marca done |
| `ai_mark_request_error(p_request_id, p_error)` | Marca error con mensaje |

### RPCs auxiliares (Edge Function)
| RPC | Descripción |
|-----|-------------|
| `ai_get_chat_request_for_processing(p_request_id)` | Lee request desde schema ai (SECURITY DEFINER) |
| `ai_get_message_content(p_message_id)` | Lee contenido de mensaje desde schema ai |

### Contexto ERP
| RPC | Datos que devuelve (V1) |
|-----|------------------------|
| `ai_get_context_general(p_user_id)` | Usuario, rol, departamento, proyectos activos, presupuestos abiertos |
| `ai_get_context_administration(p_user_id)` | Facturas venta/compra pendientes (conteos) |
| `ai_get_context_commercial(p_user_id)` | Total clientes, presupuestos abiertos |
| `ai_get_context_marketing(p_user_id)` | Placeholder V1 (contrato definido) |
| `ai_get_context_programming(p_user_id)` | Placeholder V1 (contrato definido) |

---

## 5. Edge Function: `ai-chat-processor`

**Archivo:** `supabase/functions/ai-chat-processor/index.ts`
**Config:** `verify_jwt = false` (validación manual con `getClaims()`)

### Autenticación

```
1. Extrae Authorization: Bearer <jwt>
2. Valida con supabase.auth.getClaims(token)
3. Extrae authUserId = claims.sub
4. Resuelve userId via get_authorized_user_by_auth_id(authUserId)
5. Verifica que chat_request.user_id === userId
```

### Procesamiento V1

La función `generateTemplateResponse(mode, userMessage, context)` genera respuestas basadas en el contexto real del ERP:

- **Mode general:** Muestra perfil del usuario, proyectos activos, presupuestos abiertos.
- **Mode administration:** Facturas de venta/compra pendientes.
- **Mode commercial:** Total clientes, presupuestos abiertos.
- **Otros modos:** Mensaje placeholder indicando disponibilidad en V2.

### Manejo de errores

Si cualquier paso falla, la función intenta marcar el request como `error` con el mensaje de error (best-effort), y retorna HTTP 500.

---

## 6. Frontend

### Routing

```
/nexo-av/:userId/ai/chat → AIChatPage (lazy loaded)
```

Integrado en el layout responsive existente (`ResponsiveLayout`).

### Componentes

| Componente | Función |
|------------|---------|
| `AIChatPage` | Layout 2 columnas: sidebar (w-72) + panel principal |
| `ConversationList` | Sección "Personal" (Mi chat) + "Conversaciones" + botón "+" |
| `ChatPanel` | Header + área mensajes (auto-scroll) + textarea + botón enviar |
| `ModeSelector` | shadcn Select con 5 modos (General, Administración, Comercial, Marketing, Programación) |
| `MessageBubble` | User = derecha/primary, Assistant = izquierda/muted |
| `NewConversationDialog` | Dialog para crear conversación departamental |

### Hooks

| Hook | Responsabilidad |
|------|----------------|
| `useConversations` | `ai_list_conversations` + `ai_get_or_create_personal_conversation` + `ai_create_conversation` |
| `useMessages` | `ai_list_messages` + suscripción Realtime a `ai.messages` INSERT |
| `useSendMessage` | `ai_add_user_message` → `ai_create_chat_request` → `fetch(edge-fn)` |

### Realtime

```typescript
supabase.channel(`ai-messages-${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'ai',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // Añade mensaje al array si no existe (dedup por id)
  })
  .subscribe()
```

---

## 7. Seguridad

| Aspecto | Implementación |
|---------|---------------|
| JWT | Validado en código con `getClaims()` |
| Ownership | Edge Function verifica que `request.user_id === authenticated_user_id` |
| Schema aislado | `ai.*` separado de `public`, `crm`, `sales`, etc. |
| RLS | Todas las tablas con RLS activo y políticas por usuario/rol |
| Service role | Solo la Edge Function usa service_role para operaciones privilegiadas |
| CORS | Usa `_shared/cors.ts` con origins permitidos |

---

## 8. Preparación para V2 (ALB357/Ollama)

### Qué cambia en V2

Solo la Edge Function `ai-chat-processor`:
1. En lugar de `generateTemplateResponse()`, se llama a ALB357/Ollama API.
2. Se pasa el contexto ERP como system prompt + datos estructurados.
3. La respuesta del LLM se guarda via `ai_add_assistant_message()`.

### Qué NO cambia

- **Frontend:** Sigue escuchando Realtime en `ai.messages`. Sin modificaciones.
- **Base de datos:** Mismas tablas, mismos RPCs.
- **Flujo asíncrono:** Mismo patrón request → processing → done.
- **RPCs de contexto:** Se pueden ampliar sin romper el contrato.

### Alternativa ALB357 autónomo

ALB357 podría escuchar `ai.chat_requests` via Realtime (status=queued), procesarlos directamente y marcarlos como done. En ese caso, la Edge Function V1 se desactiva y ALB357 actúa como procesador independiente.

---

## 9. Decisiones técnicas clave

| Decisión | Razón |
|----------|-------|
| Schema `ai` dedicado | Coherencia con `crm`, `sales`, `accounting`, `projects`. Facilita backups y permisos. |
| `verify_jwt = false` + validación manual | Requerido por signing-keys de Supabase. `getClaims()` es el método correcto. |
| RPCs auxiliares para Edge Function | El cliente JS de Supabase solo expone schema `public` por API. Las tablas `ai.*` se acceden via RPCs SECURITY DEFINER. |
| Campo `mode` en messages | Trazabilidad: saber en qué modo se generó cada respuesta. |
| `ai_get_or_create_personal_conversation()` | Evita duplicados de "Mi chat" con lógica idempotente en servidor. |
| Fire-and-forget en Edge Function | El frontend no espera la respuesta HTTP. La respuesta llega via Realtime. |

---

## 10. Archivos de configuración

### supabase/config.toml
```toml
[functions.ai-chat-processor]
verify_jwt = false
```

### Ruta en App.tsx
```tsx
<Route path="ai/chat" element={<NexoAIChatPage />} />
```
Dentro del bloque `<Route path="/nexo-av/:userId" element={<ResponsiveLayout />}>`.

### Sidebar.tsx
Navegación a `/nexo-av/${userId}/ai/chat` con icono de AI en la barra lateral.
