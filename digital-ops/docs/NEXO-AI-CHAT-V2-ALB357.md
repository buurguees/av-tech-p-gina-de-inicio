# NEXO AI Chat V2 — ALB357 + Ollama via Supabase Bus

> **Estado:** Completado — Backend + Frontend + Worker listos para producción
> **Última actualización:** 2026-02-16
> **Migraciones V2:** 16 (desde `fix_ai_get_context_general_enum_values` hasta `update_context_general_read_from_agent_config`)

---

## 1. Visión general

V2 evoluciona el chat IA del ERP para que las respuestas sean generadas por un modelo local (Ollama) ejecutándose en el servidor ALB357, usando Supabase como bus asíncrono de mensajería. Incluye control de acceso por rol, contexto ERP enriquecido, conversaciones de grupo por departamento, configuración de agentes desde el repositorio, y un sistema de detección de sugerencias.

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  ERP (Frontend)  │────▶│      Supabase        │◀────│  ALB357 Worker      │
│  Firebase Host   │     │  ai.chat_requests    │     │  nexo-orchestrator  │
│                  │◀────│  ai.messages         │────▶│  Ollama (local)     │
│                  │     │  ai.agent_config     │     │  qwen2.5:3b         │
│                  │     │  ai.suggestions      │     │                     │
│                  │     │  ai.conversations    │     │                     │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘
    Realtime              Bus asíncrono + Config         service_role
```

### Flujo completo de un mensaje

1. Usuario escribe mensaje en el ERP
2. Frontend llama `ai_add_user_message()` → inserta en `ai.messages`
3. Frontend llama `ai_create_chat_request(processor='alb357')` → status `queued`
4. **NO se llama a Edge Function** — el request queda en cola
5. Worker ALB357 hace polling con `ai_lock_next_chat_request('alb357', 'nexo-orchestrator@alb357')`
6. Worker obtiene contexto ERP role-aware con `ai_get_context_general(user_id)`
   - El contexto ya incluye `system_instructions` completo (base + perfil + sugerencias)
7. Worker lee mensaje del usuario con `ai_get_message_content()`
8. Worker construye system prompt: `context.system_instructions + datos ERP`
9. Worker llama a Ollama local (`POST http://127.0.0.1:11434/api/chat`)
10. Worker parsea respuesta: detecta marcadores `<!--SUGGESTION:...-->` si hay
11. Si hay sugerencia → llama a `ai_save_suggestion()` y limpia el marcador del texto visible
12. Worker inserta respuesta con `ai_add_assistant_message()` (metadata: request_id, model, latency_ms, access_level)
13. Worker marca completado con `ai_complete_chat_request()`
14. ERP recibe mensaje via **Realtime** en `ai.messages` (INSERT)
15. Frontend muestra la respuesta sin refresh

---

## 2. Estado de implementación

### COMPLETADO

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | Bus asíncrono | ERP → Supabase → ALB357 → Ollama → Supabase → ERP |
| 2 | Worker Docker | nexo-orchestrator arranca, conecta a Supabase y Ollama |
| 3 | Worker: código en repo | `digital-ops/worker/` — Dockerfile, docker-compose, processor.js |
| 4 | Worker: leer `system_instructions` | El processor usa `context.system_instructions` del contexto role-aware |
| 5 | Worker: parsear sugerencias | Detecta `<!--SUGGESTION:...-->`, guarda con `ai_save_suggestion()`, limpia marcador |
| 6 | Polling + locking | `FOR UPDATE SKIP LOCKED`, stale lock recovery 5 min |
| 7 | Primera respuesta Ollama | qwen2.5:3b respondió correctamente (79s cold start) |
| 8 | `ai_complete_chat_request` | Corregido: acepta `p_processed_by` del worker |
| 9 | Contexto role-aware | 5 perfiles: full, management, financial, commercial, technical |
| 10 | Datos financieros reales | Facturación mensual, pendientes, cobros — solo para perfiles autorizados |
| 11 | Comercial filtrado por cliente | Solo ve facturación de `crm.clients.assigned_to = user_id` |
| 12 | Pautas técnicos | 8 reglas de facturación (desplazamiento, comida, km, horas extra...) |
| 13 | Conversaciones de grupo | 5 grupos creados (General, Programación, Marketing, Comercial, Administración) |
| 14 | Control acceso departamento | `ai.get_user_allowed_departments()` + RLS actualizada |
| 15 | Tabla `ai.agent_config` | Config base + 5 perfiles + sugerencias — runtime sin reiniciar Docker |
| 16 | Archivos config en repo | `digital-ops/agents/base.json` + `profiles/*.json` |
| 17 | Locale EUR/€ | Moneda, formato números, timezone Europe/Madrid |
| 18 | Tabla `ai.suggestions` | Sistema completo: pending → accepted/rejected/implemented |
| 19 | RPCs sugerencias | `ai_save_suggestion`, `ai_list_suggestions`, `ai_review_suggestion`, `ai_get_suggestion_stats` |
| 20 | Fix enums incorrectos | `ACTIVE`→`NEGOTIATION`, `PLANNING`→`PLANNED`, `PENDING`→correcto en 3 RPCs |
| 21 | Fix RLS conversations | Bug `cm.id` → `c.id` en EXISTS, + acceso por departamento |
| 22 | Frontend: chat base V2 | `useSendMessage`, `useRequestStatus`, ChatPanel con banners |
| 23 | Frontend: UI grupos | Sección GRUPOS fijada arriba en sidebar con auto-join y contadores |
| 24 | Frontend: Sugerencias | Página Auditoría > Sugerencias con stats, filtros, review dialog |
| 25 | Frontend: Sidebar actualizado | Auditoría ahora es carpeta: Eventos + Sugerencias |
| 26 | Frontend: eliminar chats | Botón basura en cada chat personal con popup de confirmación |
| 27 | RPC `ai_delete_conversation` | Elimina conversación personal (valida ownership, limpia FKs, no permite eliminar grupos) |
| 28 | Sidebar chat reordenado | Grupos fijados arriba, chats personales debajo |
| 29 | Servidor: swap 4GB | Anti-OOM para ALB357 (8GB RAM) |
| 30 | Servidor: Docker log rotation | max-size 10MB, max-file 5 |
| 31 | Servidor: Ollama warmup | systemd timer: 2min tras boot + cada 6h |

### PENDIENTE (post-V2 / V3)

| Componente | Prioridad | Descripción |
|------------|-----------|-------------|
| Grupos como bandejas de agentes | **Alta** | Los grupos evolucionan a "bandejas" donde agentes autónomos publican sugerencias, cambios y notificaciones. Paso hacia agentes trabajando proactivamente desde NEXO AI. |
| Testing E2E: respuesta con € | **Media** | Verificar que Ollama formatea importes en euros |
| Optimización latencia | **Baja** | Primera respuesta 79s (cold start). Siguientes deberían ser 5-15s |
| Multi-modelo | **Baja** | Soporte para cambiar modelo por conversación/request |
| Historial conversación completo | **Baja** | Enviar últimos N mensajes a Ollama para mantener contexto |
| Mobile: chat AI | **Baja** | Versión responsive del chat para dispositivos móviles |

---

## 3. Esquema de datos V2

### 3.1 `ai.chat_requests`

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| id | uuid | gen_random_uuid() | PK |
| conversation_id | uuid | — | FK a ai.conversations |
| user_id | uuid | — | Usuario que creó el request |
| mode | ai.department_scope | 'general' | Departamento/contexto |
| latest_user_message_id | uuid | NULL | Último mensaje del usuario |
| status | ai.request_status | 'queued' | queued/processing/done/error |
| error | text | NULL | Mensaje de error |
| processor | text | 'alb357' | 'edge' \| 'alb357' |
| model | text | NULL | Ej: 'qwen2.5:3b' |
| temperature | numeric | 0.2 | Temperatura del modelo |
| max_tokens | int | 450 | Tokens máximos de respuesta |
| context_payload | jsonb | NULL | Cache del contexto enviado |
| latency_ms | int | NULL | Latencia de procesamiento |
| processed_by | text | NULL | Ej: 'nexo-orchestrator@alb357' |
| attempt_count | int | 0 | Intentos de procesamiento |
| locked_at | timestamptz | NULL | Timestamp del lock |
| locked_by | text | NULL | Identidad del worker |

### 3.2 `ai.agent_config` (nueva V2)

| Key | Contenido | Descripción |
|-----|-----------|-------------|
| `base` | Identidad, locale (€), comportamiento | Config compartida por todos los perfiles |
| `profile:full` | System prompt admin/dirección | Acceso total |
| `profile:management` | System prompt manager | Todo excepto compras |
| `profile:financial` | System prompt administración | Datos financieros completos |
| `profile:commercial` | System prompt comercial | Solo sus clientes |
| `profile:technical` | System prompt + 8 pautas facturación | Personal técnico/externo |
| `suggestions` | Config detección sugerencias | Marcador, frecuencia, ejemplos |

### 3.3 `ai.suggestions` (nueva V2)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| conversation_id | uuid | FK — de qué conversación surgió |
| message_id | uuid | FK — mensaje donde se detectó |
| user_id | uuid | Quién hizo la sugerencia |
| content | text | Descripción de la sugerencia |
| category | ai.suggestion_category | ui_improvement, feature_request, notification, workflow, data_visibility, performance, other |
| context_summary | text | Resumen del contexto |
| status | ai.suggestion_status | pending → accepted / rejected / implemented / duplicate |
| admin_notes | text | Notas del admin al revisar |
| reviewed_by | uuid | Admin que revisó |
| reviewed_at | timestamptz | Cuándo se revisó |

### 3.4 Conversaciones de grupo (ampliación V2)

5 conversaciones `scope='department'` pre-creadas:

| Grupo | department | Quién accede |
|-------|-----------|-------------|
| General — Grupo | general | Todos |
| Programación — Grupo | programming | TECHNICAL + manager + admin |
| Marketing — Grupo | marketing | manager + admin |
| Comercial — Grupo | commercial | COMMERCIAL + manager + admin |
| Administración — Grupo | administration | ADMIN + admin (NO manager) |

---

## 4. Control de acceso por rol

### 4.1 Perfiles y datos que reciben

```
┌─────────────┐  ┌────────────────────────────────────────────────────────┐
│   PERFIL    │  │           DATOS EN EL CONTEXTO AI                     │
├─────────────┤  ├──────────┬──────────┬───────────┬────────┬────────────┤
│             │  │ Proyectos│Presupues.│Facturación│Compras │ Técnico    │
├─────────────┤  ├──────────┼──────────┼───────────┼────────┼────────────┤
│ full        │  │ Todos    │ Todos    │ Completa  │ Sí     │ —          │
│ management  │  │ Todos    │ Todos    │ Solo venta│ No     │ —          │
│ financial   │  │ Todos    │ Todos    │ Completa  │ Sí     │ —          │
│ commercial  │  │ Todos*   │ SUS clts │ SUS clts  │ No     │ —          │
│ technical   │  │ Asignados│ No       │ No        │ No     │ Pautas+vis │
└─────────────┘  └──────────┴──────────┴───────────┴────────┴────────────┘
  * Vista general sin importes
```

### 4.2 Mapeo role/department → perfil

| Condición | Perfil | `access_level` |
|-----------|--------|----------------|
| Role `admin` O department `DIRECTION` | full | Todos los datos |
| Role `manager` | management | Sin compras ni márgenes |
| Department `ADMIN` | financial | Datos financieros completos |
| Department `COMMERCIAL` | commercial | Solo sus clientes asignados |
| Department `TECHNICAL` | technical | Solo sus proyectos + pautas |

### 4.3 Ejemplo real verificado — Eric (COMMERCIAL)

```json
{
  "access_level": "commercial",
  "my_clients": ["EIKONOS", "AVINYO", "SHARK EVENTS", "RAMON I COCA"],
  "my_clients_billing": [
    {"client": "EIKONOS", "total_billed": 677.60, "total_pending": 677.60},
    {"client": "RAMON I COCA", "total_billed": 145.20, "total_collected": 145.20}
  ],
  "my_pipeline_value": 96660.85
}
```

No ve: facturación global, facturas de compra, clientes de otros comerciales.

### 4.4 Pautas de facturación para técnicos

Incluidas en `agent_config` y en el contexto del perfil technical:

| Concepto | Regla |
|----------|-------|
| Desplazamiento | 50% de tarifa de trabajo |
| Comida | Si desplazamiento > 4h con justificante. Máx 15 € |
| Kilometraje | 0,19 €/km vehículo propio |
| Materiales | Factura a nombre de la empresa |
| Horas extra | +25% (más de 8h/día) |
| Festivos/fines de semana | +50% |
| Parte de trabajo | Siempre firmado por el cliente |
| Plazo factura | Antes del día 5 del mes siguiente |
| Plazo pago | 30 días desde recepción correcta |

---

## 5. Sistema de sugerencias

### Flujo completo

```
Usuario dice "Necesito notificaciones de vencimiento"
        │
        ▼
   Ollama detecta sugerencia (gracias al system prompt de detection_instructions)
        │
        ▼
   Respuesta incluye:
   "He registrado tu sugerencia..."
   <!--SUGGESTION:{"content":"Notificaciones de fechas de vencimiento","category":"notification"}-->
        │
        ▼
   Worker (processor.js) parsea marcador → ai_save_suggestion()
   Worker limpia marcador → el usuario no ve el HTML comment
        │
        ▼
   Admin abre Auditoría > Sugerencias en el sidebar
        │
        ▼
   Tabla con filtros (estado, categoría), stats (pendientes, aceptadas...)
        │
        ▼
   Admin revisa con ThumbsUp/ThumbsDown → ai_review_suggestion()
```

### RPCs

| RPC | Seguridad | Quién la usa |
|-----|-----------|-------------|
| `ai_save_suggestion()` | SECURITY DEFINER | Worker (service_role) |
| `ai_list_suggestions(status, category, limit, offset)` | INVOKER — admin/manager | Frontend: Auditoría > Sugerencias |
| `ai_review_suggestion(id, status, notes)` | INVOKER — solo admin | Frontend: aceptar/rechazar |
| `ai_get_suggestion_stats()` | INVOKER — admin/manager | Dashboard de sugerencias |

### Prompting sutil

El AI tiene instrucción de preguntar de forma natural (máx 1 de cada 6 respuestas):
- "¿Hay algo en esta sección que te gustaría que funcionara diferente?"
- "Si necesitas que la plataforma te muestre esta información de otra manera, dímelo."

---

## 6. Configuración de agentes

### Arquitectura

```
digital-ops/agents/         ← Source of truth (git, PR, code review)
├── base.json               ← Identidad, locale (€), comportamiento
└── profiles/
    ├── full.json
    ├── management.json
    ├── financial.json
    ├── commercial.json
    └── technical.json
         │
         ▼  (migración SQL)
  ai.agent_config (Supabase)  ← Runtime
         │
         ▼  (RPC ai_get_agent_config)
  Worker ALB357               ← Lee en cada request, sin reiniciar Docker
```

### Locale

```json
{
  "currency": "EUR",
  "currency_symbol": "€",
  "decimal_separator": ",",
  "thousands_separator": ".",
  "date_format": "DD/MM/YYYY",
  "timezone": "Europe/Madrid"
}
```

System prompt base incluye: *"Todos los importes deben mostrarse en euros (€) con formato europeo (punto para miles, coma para decimales). Ejemplo: 1.234,56 €"*

### Para cambiar un prompt o pauta

1. Edita el JSON en `digital-ops/agents/profiles/`
2. Aplica migración que actualiza `ai.agent_config`
3. No reinicies Docker — el worker lee la config en cada request

---

## 7. RPCs V2 — Catálogo completo

### Bus asíncrono (SECURITY DEFINER — service_role)

| RPC | Descripción |
|-----|-------------|
| `ai_lock_next_chat_request(p_processor, p_lock_owner)` | Lock atómico del siguiente request en cola |
| `ai_complete_chat_request(p_request_id, p_lock_owner, p_latency_ms, p_model, p_processed_by)` | Marca done |
| `ai_fail_chat_request(p_request_id, p_error)` | Marca error |
| `ai_get_message_content(p_message_id)` | Lee contenido del mensaje |
| `ai_get_agent_config(p_profile)` | Config completa: base + perfil + sugerencias |
| `ai_save_suggestion(p_conversation_id, p_message_id, p_user_id, p_content, p_category)` | Guarda sugerencia detectada |

### Contexto ERP (SECURITY DEFINER)

| RPC | Descripción |
|-----|-------------|
| `ai_get_context_general(p_user_id)` | Contexto role-aware: datos filtrados según perfil del usuario |
| `ai_get_context_commercial(p_user_id)` | Contexto departamento comercial |
| `ai_get_context_administration(p_user_id)` | Contexto departamento administración |
| `ai_get_context_marketing(p_user_id)` | Stub — pendiente V3 |
| `ai_get_context_programming(p_user_id)` | Stub — pendiente V3 |

### Frontend (SECURITY INVOKER — valida ownership/role)

| RPC | Descripción |
|-----|-------------|
| `ai_create_chat_request(p_conversation_id, p_mode, ...)` | Crea request con processor='alb357' |
| `ai_retry_chat_request(p_request_id)` | Re-encola request fallido |
| `ai_get_latest_request_status(p_conversation_id)` | Polling ligero del estado |
| `ai_get_or_create_department_conversation(p_department)` | Obtiene/crea grupo + auto-join |
| `ai_list_department_conversations()` | Lista grupos accesibles al usuario |
| `ai_join_department_conversation(p_conversation_id)` | Unirse a un grupo |
| `ai_delete_conversation(p_conversation_id)` | Elimina conversación personal (owner only, no grupos) |
| `ai_list_suggestions(p_status, p_category, ...)` | Lista sugerencias (admin/manager) |
| `ai_review_suggestion(p_suggestion_id, p_status, p_admin_notes)` | Revisar sugerencia (admin) |
| `ai_get_suggestion_stats()` | Contadores para dashboard |

### Acceso departamentos (helpers internos)

| Función | Descripción |
|---------|-------------|
| `ai.get_user_allowed_departments(p_user_id)` | Retorna department_scope[] permitidos |
| `ai.user_can_access_department(p_department)` | Verifica acceso del usuario actual |
| `ai.user_can_access_conversation(p_conversation_id)` | Actualizada: incluye acceso por departamento |

---

## 8. Worker (ALB357) — Código en repositorio

### 8.1 Ubicación del código

```
digital-ops/worker/
├── package.json            ← nexo-orchestrator v2.1.0
├── Dockerfile              ← Node 20 Alpine
├── docker-compose.yml      ← Config para producción en ALB357
├── .env.example            ← Variables de entorno necesarias
└── src/
    ├── index.js            ← Entry point: polling loop
    └── processor.js        ← Lógica: contexto → Ollama → sugerencias → respuesta
```

### 8.2 Despliegue

```bash
cd digital-ops/worker
cp .env.example .env
# Editar .env con service_role key real
docker compose up -d --build
docker logs -f nexo-orchestrator
```

### 8.3 Procesamiento de un request

```javascript
// processor.js — flujo simplificado

// 1. Obtener contexto ERP role-aware
const { data: context } = await supabase.rpc('ai_get_context_general', {
  p_user_id: request.user_id,
});
// context.system_instructions ya contiene: base + perfil + sugerencias

// 2. Leer mensaje del usuario
const { data: msgData } = await supabase.rpc('ai_get_message_content', {
  p_message_id: request.latest_user_message_id,
});

// 3. Construir system prompt
const systemPrompt = context.system_instructions
  + '\n\nFecha actual: ' + context.today
  + '\n\nDatos del ERP:\n' + JSON.stringify(contextData);

// 4. Llamar a Ollama
const response = await fetch('http://127.0.0.1:11434/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    model: 'qwen2.5:3b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    options: { temperature: 0.2, num_predict: 450 },
    stream: false,
  }),
});

// 5. Detectar sugerencias
const match = assistantContent.match(/<!--SUGGESTION:(.*?)-->/s);
if (match) {
  const suggestion = JSON.parse(match[1]);
  await supabase.rpc('ai_save_suggestion', { ... });
  assistantContent = assistantContent.replace(/<!--SUGGESTION:.*?-->/s, '').trim();
}

// 6. Guardar respuesta + marcar completado
await supabase.rpc('ai_add_assistant_message', { ... });
await supabase.rpc('ai_complete_chat_request', { ... });
```

### 8.4 Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | service_role key (NUNCA en frontend) |
| `OLLAMA_URI` | No | Default: `http://127.0.0.1:11434` |
| `LOCK_OWNER` | No | Default: `nexo-orchestrator@alb357` |
| `POLL_MS` | No | Default: `3000` (3 segundos) |
| `DEFAULT_MODEL` | No | Default: `qwen2.5:3b` |

---

## 9. Frontend V2 — Completo

### 9.1 Estructura de archivos

```
src/pages/nexo_av/ai/
├── logic/
│   ├── types.ts                ← Conversation, Message, ChatRequest, scopes
│   ├── constants.ts            ← AI_MODES, DEFAULT_MODE
│   └── hooks/
│       ├── useConversations.ts ← Personal + grupos departamento + join
│       ├── useMessages.ts      ← Fetch + Realtime subscription
│       ├── useSendMessage.ts   ← RPC ai_add_user_message + ai_create_chat_request
│       └── useRequestStatus.ts ← Polling 3s, max 60s, auto-stop en Realtime
└── desktop/
    ├── AIChatPage.tsx          ← Layout: sidebar 72px + chat panel
    └── components/
        ├── ConversationList.tsx ← Personal + GRUPOS (auto-join, contadores)
        ├── ChatPanel.tsx       ← Header + Messages + Status banner + Input
        ├── MessageBubble.tsx   ← User (derecha) / Assistant (izquierda) / System
        ├── ModeSelector.tsx    ← Dropdown de departamento
        └── NewConversationDialog.tsx ← Crear conversación personal/grupo
```

### 9.2 Componentes clave

| Componente | Funcionalidad |
|------------|--------------|
| **ConversationList** | Sección **GRUPOS** fijada arriba (bandejas de departamento). Sección **MIS CHATS** debajo con personales. Badge "Unirse" con auto-join. Botón eliminar (basura) con popup de confirmación. La conversación personal principal no se puede eliminar. |
| **ChatPanel** | Banners de estado: `queued` → "Esperando agente...", `processing` → "Analizando...", `error` → mensaje + botón Reintentar. Enter para enviar, Shift+Enter para salto de línea. |
| **useConversations** | `fetchConversations()` para personales, `fetchDepartmentConversations()` para grupos, `joinDepartmentConversation()` para auto-join, `deleteConversation()` para eliminar chats personales. |
| **useRequestStatus** | Polling cada 3s vía `ai_get_latest_request_status()`. Auto-stop cuando llega mensaje assistant via Realtime o tras 60s. Retry con `ai_retry_chat_request()`. |

### 9.3 Página Auditoría > Sugerencias

```
src/pages/nexo_av/desktop/pages/SuggestionsPage.tsx
```

| Elemento | Descripción |
|----------|-------------|
| **Ruta** | `/nexo-av/:userId/audit/suggestions` |
| **Acceso** | Admin y Manager (comprobado vía `get_current_user_info`) |
| **Stats cards** | Pendientes, Aceptadas, Implementadas, Rechazadas, Total |
| **Filtros** | Por estado + por categoría, con botón limpiar |
| **Tabla** | Fecha, Estado (badge), Categoría (badge), Contenido (tooltip), Usuario, Contexto |
| **Acciones** | Admin: Aceptar (ThumbsUp), Rechazar (ThumbsDown), Duplicada (Copy). Para aceptadas: Implementada (Sparkles) |
| **Review dialog** | Confirmación con campo de notas opcionales |
| **Paginación** | 30 por página, con `PaginationControls` |

### 9.4 Sidebar actualizado

Auditoría ahora es una carpeta expandible con sub-items:

```
🛡️ Auditoría
  ├── 📜 Eventos         ← /audit (página existente)
  └── 💡 Sugerencias     ← /audit/suggestions (nueva)
```

Auto-expand cuando el usuario está en cualquier ruta de auditoría.

---

## 10. Seguridad V2

| Aspecto | Implementación |
|---------|---------------|
| service_role | Solo en ALB357 (worker), nunca en frontend |
| RLS conversations | Personal: owner. Grupo: `user_can_access_department()`. No admin/manager bypass global |
| RLS messages | Via `user_can_access_conversation()` (incluye acceso por departamento) |
| RLS suggestions | Admin/manager ven todas. Usuario ve las suyas. Insert via RPC DEFINER |
| Lock RPCs | SECURITY DEFINER — solo service_role |
| Context filtering | Datos filtrados en PostgreSQL ANTES de enviarse al modelo. El AI no puede "inventar" datos que no recibe |
| Technical isolation | Técnicos no reciben datos financieros en el contexto. Doble barrera: sin datos + instrucción de rechazo |
| Realtime | Solo en `ai.messages` (INSERT), NO en `ai.chat_requests` ni `ai.suggestions` |
| Suggestion markers | El worker limpia `<!--SUGGESTION:...-->` antes de guardar el mensaje → el usuario nunca ve el marcador |

---

## 11. Diferencias V1 vs V2

| Aspecto | V1 | V2 |
|---------|----|----|
| Procesador | Edge Function (stub) | ALB357 + Ollama local |
| Modelo | Ninguno (plantilla) | qwen2.5:3b (configurable) |
| Invocación | Frontend → Edge Function | Frontend → cola → Worker la recoge |
| Contexto | Ninguno | Role-aware: 5 perfiles con datos reales del ERP |
| Datos financieros | No | Sí, filtrados por rol (€, formato europeo) |
| Concurrencia | N/A | FOR UPDATE SKIP LOCKED + locked_by |
| Trazabilidad | Básica | processor, model, latency_ms, processed_by, attempt_count, access_level |
| Estado UI | "Procesando..." | queued/processing/error + retry |
| Conversaciones | Solo personales | Personales + grupos por departamento |
| Acceso departamento | N/A | Función + RLS por role/department |
| Config agentes | Hardcoded | Repo → Supabase → runtime (sin reiniciar Docker) |
| Sugerencias | N/A | Detección automática + revisión admin en UI |
| Pautas técnicos | N/A | 8 reglas de facturación incluidas en config |
| Moneda | N/A | EUR/€ forzado en config y system prompt |
| Stale lock recovery | N/A | Locks > 5 min se re-procesan |
| Retry | N/A | RPC `ai_retry_chat_request` + botón en UI |
| Worker en repo | N/A | `digital-ops/worker/` con Dockerfile |
| Página sugerencias | N/A | Auditoría > Sugerencias (stats + tabla + review) |

---

## 12. Bugs corregidos durante V2

| Bug | Causa | Fix |
|-----|-------|-----|
| `invalid input value for enum project_status: "ACTIVE"` | Enum inexistente en `ai_get_context_general` | `ACTIVE`→`NEGOTIATION`, `PLANNING`→`PLANNED` |
| `invalid input value for enum quote_status: "PENDING"` | Enum inexistente en 2 RPCs de contexto | Eliminado en commercial, cambiado en administration |
| `Could not find function ai_complete_chat_request(p_processed_by...)` | Worker envía parámetro que la función no aceptaba | Añadido `p_processed_by` como parámetro opcional |
| `PENDING` en purchase_invoices | No es valor válido (es `PENDING_VALIDATION`) | Corregido en `ai_get_context_administration` |
| RLS `ai_conv_select` usaba `cm.id` en vez de `c.id` | Bug en EXISTS de la policy | Reescrita con acceso por departamento |

---

## 13. Métricas de la primera ejecución real

| Métrica | Valor |
|---------|-------|
| Request procesado | `52e64d07` — "Hola" |
| Modelo | qwen2.5:3b |
| Latencia | 79.095 ms (~79s, cold start) |
| Processor | alb357 |
| Processed by | nexo-orchestrator@alb357 |
| Respuesta | "¡Hola! ¿En qué puedo ayudarte hoy?..." |
| Nota | Latencia alta por cold start de Ollama. Siguiente ejecución esperada: 5-15s |

---

## 14. Ajustes de servidor (ALB357)

Estabilización de la ejecución 24/7 del worker `nexo-orchestrator` (Docker) + Ollama en CPU, evitando OOM, mejorando operación y asegurando persistencia tras reinicios.

### 14.1 Swap (anti-OOM) — APLICADO

ALB357 tiene 8 GB RAM. Ollama + modelo 3B en CPU + Docker + Node pueden provocar picos de memoria; sin swap el kernel puede matar procesos (OOM killer).

| Acción | Detalle |
|--------|---------|
| Creación de swapfile | 4 GB |
| Activación inmediata | `swapon` |
| Persistencia | Entrada en `/etc/fstab` |
| Verificación | `free -h` muestra `Swap: 4.0Gi` |

### 14.2 Docker + Docker Compose — APLICADO

Despliegue reproducible del worker en contenedor, sin dependencias locales.

| Acción | Detalle |
|--------|---------|
| Instalación | Docker Engine + Docker Compose plugin |
| Permisos | `usermod -aG docker $USER` (sin sudo) |
| Verificación | `docker --version`, `docker compose version`, `docker ps` |

### 14.3 Worker V2 en background — APLICADO

El worker se ejecuta en modo detached, no requiere terminal abierta.

```bash
# Arrancar
docker compose up -d --build

# Ver logs recientes
docker logs nexo-orchestrator --tail 100

# Seguir logs en vivo (solo debug)
docker logs -f nexo-orchestrator
```

Verificación: `docker ps` muestra contenedor `Up`, logs muestran `[ok] ... model=qwen2.5:3b`.

### 14.4 Incidencia detectada (ya corregida)

Error PostgreSQL `project_status: "ACTIVE"` — corregido en migración `fix_ai_context_rpcs_enum_values` (ver sección 12).

### 14.5 Docker log rotation — APLICADO

Se configuró `/etc/docker/daemon.json` para rotar logs del driver `json-file` y evitar crecimiento infinito de logs y consumo de disco.

| Parámetro | Valor |
|-----------|-------|
| max-size | 10 MB |
| max-file | 5 |
| Reinicio | `sudo systemctl restart docker` |

### 14.6 Ollama warmup automático — APLICADO

Precarga automática del modelo para reducir el cold-start (~60-80s) tras reinicios.

| Archivo | Descripción |
|---------|-------------|
| `/opt/nexo-ai-worker/warmup.sh` | Script de precarga del modelo |
| `/etc/systemd/system/ollama-warmup.service` | Servicio systemd |
| `/etc/systemd/system/ollama-warmup.timer` | Timer systemd |

| Comportamiento | Detalle |
|----------------|---------|
| Tras boot | Ejecuta warmup 2 minutos después del arranque |
| Periódico | Repite cada 6 horas |
| Manual | `systemctl start ollama-warmup.service` |
| Verificación | `systemctl list-timers \| grep warmup` / `journalctl -u ollama-warmup.service` |

### 14.7 Recomendaciones pendientes

| Recomendación | Descripción | Prioridad |
|---------------|-------------|-----------|
| **Healthcheck** | Comprobar periódicamente `/api/tags` o `/api/chat` de Ollama y reiniciar contenedor si no responde | Media |

---

## 15. Estado actual del servidor — ALB357

### 15.1 Arquitectura general

ALB357 actúa como nodo de procesamiento externo para NEXO AI Chat V2. No expone ninguna clave sensible al frontend — la `SUPABASE_SERVICE_ROLE_KEY` reside exclusivamente en ALB357.

| Paso | Acción |
|------|--------|
| 1 | Escucha requests en `ai.chat_requests` con `processor = 'alb357'` |
| 2 | Bloquea mediante `ai_lock_next_chat_request` |
| 3 | Obtiene mensaje + contexto role-aware |
| 4 | Llama a Ollama local |
| 5 | Guarda respuesta en `ai.messages` |
| 6 | Marca request como `done` |
| 7 | Registra métricas (latencia, modelo, processed_by) |

### 15.2 Componentes activos

#### Docker

| Elemento | Valor |
|----------|-------|
| Docker Engine | 29.x |
| Docker Compose | v2 |
| Contenedor | `nexo-orchestrator` — `node:20-alpine` |
| Estado | `docker ps` → `Up` |

El contenedor ejecuta el worker Node.js que hace polling cada 3000ms, procesa jobs secuencialmente, maneja errores y registra logs estructurados.

#### Worker (nexo-orchestrator)

| Variable | Valor |
|----------|-------|
| `LOCK_OWNER` | `nexo-orchestrator@alb357` |
| `POLL_MS` | `3000` |
| `OLLAMA_URL` | `http://127.0.0.1:11434` |

Funciona en modo asíncrono puro. No depende de la Edge Function V1.

#### Ollama

| Elemento | Valor |
|----------|-------|
| Instalación | Servicio del sistema |
| Modelo | `qwen2.5:3b` |
| Endpoint | `http://127.0.0.1:11434/api/chat` |
| Warmup | `ollama-warmup.service` + `ollama-warmup.timer` (activos) |

### 15.3 Recursos del servidor

| Recurso | Valor |
|---------|-------|
| RAM | 8 GB |
| Swap | 4 GB |
| SO | Ubuntu LTS |
| Runtime | Node 20 (contenedor Docker) |
| Modelo 3B | Compatible con 8 GB RAM |
| Latencia media | ~13–20s |

### 15.4 Seguridad

| Check | Estado |
|-------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` solo en servidor | OK |
| No se expone en frontend | OK |
| RLS activa en Supabase | OK |
| Locking seguro (`FOR UPDATE SKIP LOCKED`) | OK |
| Worker desacoplado del ERP | OK |

### 15.5 Flujo V2 en producción

```
Usuario → ERP Frontend
        → Supabase (INSERT ai.chat_requests)
        → ALB357 Worker (lock + process)
        → Ollama local
        → Supabase (assistant message + done)
        → Realtime → ERP
```

No hay llamadas directas ERP → Ollama. Supabase actúa como bus de mensajería.

### 15.6 Estado de estabilidad

| Componente | Estado |
|------------|--------|
| Worker | Funcionando correctamente |
| Docker | Estable |
| Ollama | Respondiendo |
| Warmup | Operativo |
| Realtime | Funcionando |
| Requests | Procesándose correctamente |

**V2 puede considerarse estable y funcional.**

---

## 16. Archivos de referencia

| Archivo | Ubicación |
|---------|-----------|
| Config base agente | `digital-ops/agents/base.json` |
| Perfil full | `digital-ops/agents/profiles/full.json` |
| Perfil commercial | `digital-ops/agents/profiles/commercial.json` |
| Perfil technical | `digital-ops/agents/profiles/technical.json` |
| Worker: entry point | `digital-ops/worker/src/index.js` |
| Worker: processor | `digital-ops/worker/src/processor.js` |
| Worker: Dockerfile | `digital-ops/worker/Dockerfile` |
| Worker: compose | `digital-ops/worker/docker-compose.yml` |
| Frontend AI chat | `src/pages/nexo_av/ai/` |
| Hooks V2 | `src/pages/nexo_av/ai/logic/hooks/` |
| Página sugerencias | `src/pages/nexo_av/desktop/pages/SuggestionsPage.tsx` |
| Sidebar | `src/pages/nexo_av/desktop/components/layout/Sidebar.tsx` |
| Documentación V1 | `digital-ops/docs/NEXO-AI-CHAT-V1-IMPLEMENTACION.md` |
| Modelos y hardware | `digital-ops/docs/AGENTES_Y_MODELOS.md` |
