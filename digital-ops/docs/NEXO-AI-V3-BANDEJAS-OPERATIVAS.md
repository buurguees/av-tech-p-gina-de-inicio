# NEXO AI — V3: Bandejas Operativas

> **Estado:** Preparación estructural completada — Sin lógica automática activa  
> **Fecha de inicio:** 2026-02-16  
> **Riesgo producción:** 0 — Solo tablas y UI nuevas, sin modificar V2

---

## 1. Objetivo

Evolucionar los **grupos de departamento** del módulo NEXO AI hacia un modelo de **Bandejas Operativas**: canales donde agentes autónomos pueden analizar, sugerir e intervenir de forma controlada.

### Filosofía

- **V2** → Los grupos son conversaciones entre usuarios y el agente por demanda.
- **V3** → Los grupos se convierten en **bandejas** donde agentes autónomos trabajan de forma proactiva.
- **Preparación sin ejecución**: toda la estructura (tablas, RPCs, UI) queda lista para activar sin riesgo.

---

## 2. Reglas de oro (CRÍTICAS)

| Regla | Detalle |
|-------|---------|
| No modificar tablas V2 | `ai.chat_requests`, `ai.messages`, `ai.agent_config`, `ai.suggestions` intactas |
| No tocar RLS existentes | Solo se crean policies nuevas para tablas nuevas |
| No tocar worker ALB357 | El worker V2 sigue funcionando sin cambios |
| No añadir lógica automática | Sin polling de eventos, sin interceptar mensajes, sin triggers automáticos |
| No cambiar enums existentes | `ai.department_scope`, etc. sin modificar |
| No reutilizar `ai.chat_requests` para eventos | Tabla de eventos separada |
| No mezclar sugerencias con eventos | Son flujos independientes |

---

## 3. Nuevas tablas

### 3.1 `ai.group_agent_settings`

Configuración del agente autónomo por grupo de departamento.

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| `conversation_id` | uuid (PK, FK → ai.conversations) | — | Conversación de grupo |
| `department` | ai.department_scope | — | Departamento |
| `agent_name` | text | 'NEXO AI' | Nombre visual del agente |
| `model` | text | 'qwen2.5:3b' | Modelo asignado (visual por ahora) |
| `auto_mode` | boolean | false | Si true, agente puede intervenir |
| `intervention_level` | text (check: low/medium/high) | 'medium' | Nivel de intervención |
| `last_intervention_at` | timestamptz | null | Última intervención del agente |
| `cooldown_minutes` | integer | 10 | Minutos mínimos entre intervenciones |
| `created_at` | timestamptz | now() | — |
| `updated_at` | timestamptz | now() | Trigger automático |

**Índices:** `idx_group_agent_settings_department (department)`

**Trigger:** `trg_group_agent_settings_updated_at` → auto-actualiza `updated_at`

**RLS:**
- `gas_admin_all` → Admin: lectura + escritura
- `gas_manager_select` → Manager: solo lectura
- Usuarios normales: sin acceso

### 3.2 `ai.group_events_log`

Log de análisis y decisiones de agentes autónomos (preparado para V3 futura).

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| `id` | uuid (PK) | gen_random_uuid() | — |
| `conversation_id` | uuid (FK → ai.conversations) | — | Grupo analizado |
| `message_id` | uuid (FK → ai.messages) | null | Mensaje que disparó el análisis |
| `analyzed_at` | timestamptz | now() | Momento del análisis |
| `classified_intent` | text | null | Intención clasificada |
| `intervention_decision` | boolean | false | Si el agente decidió intervenir |
| `created_chat_request_id` | uuid | null | Request generado (si intervino) |
| `error` | text | null | Error durante análisis |

**Índices:**
- `idx_group_events_log_conversation (conversation_id)`
- `idx_group_events_log_analyzed_at (analyzed_at DESC)`

**RLS:**
- `gel_admin_select` → Admin: solo lectura
- `gel_manager_select` → Manager: solo lectura
- Inserción: solo vía `service_role` (bypass RLS)

---

## 4. RPCs nuevas

### 4.1 `public.ai_get_group_agent_settings(p_conversation_id uuid)`

| Aspecto | Valor |
|---------|-------|
| **Tipo** | SECURITY INVOKER |
| **Acceso** | Admin + Manager |
| **Retorna** | jsonb con la configuración o defaults si no existe |
| **Compatibilidad** | Si no existe config → devuelve `exists: false` + valores por defecto (V2 normal) |

### 4.2 `public.ai_update_group_agent_settings(...)`

| Aspecto | Valor |
|---------|-------|
| **Tipo** | SECURITY INVOKER |
| **Acceso** | Solo Admin |
| **Parámetros** | `p_conversation_id, p_agent_name, p_model, p_auto_mode, p_intervention_level, p_cooldown_minutes` |
| **Comportamiento** | Upsert — crea si no existe, actualiza solo campos proporcionados (COALESCE) |
| **Validaciones** | Verifica que la conversación sea `scope='department'`, valida `intervention_level` |

---

## 5. Frontend — Cambios realizados

### 5.1 `ConversationList.tsx`

- **Renombrado sección** de "Grupos" a "Bandejas"
- **Badge visual** por grupo:
  - 🟢 (punto verde) → `auto_mode = true`
  - ⚪ (punto gris) → `auto_mode = false` (manual)
- **Botón ⚙️** (Settings2) visible solo para admin, al hacer hover sobre un grupo
  - Abre modal de configuración del agente

### 5.2 `GroupAgentSettingsDialog.tsx` (nuevo)

Modal de configuración del agente para cada grupo:

- **Toggle**: Activar/desactivar modo automático
- **Input**: Nombre del agente
- **Select**: Modelo asignado (visual, backend no ejecuta todavía):
  - Qwen 2.5 3B (actual)
  - Qwen 2.5 7B
  - Llama 3.2 3B
  - Mistral 7B
- **Select**: Nivel de intervención:
  - Bajo → Solo observa y registra
  - Medio → Sugiere acciones
  - Alto → Interviene activamente
- **Input**: Cooldown (minutos entre intervenciones)
- Guarda via RPC `ai_update_group_agent_settings`

### 5.3 `ChatPanel.tsx`

- **Banner verde** en el header cuando la bandeja activa tiene `auto_mode = true`:
  - "Modo Automático Activo — El agente interviene en esta bandeja"

### 5.4 `useGroupAgentSettings.ts` (nuevo hook)

- `fetchSettings(conversationId)` → llama `ai_get_group_agent_settings`
- `updateSettings(conversationId, updates)` → llama `ai_update_group_agent_settings`
- Expone: `settings`, `loading`, `saving`, `error`

### 5.5 `AIChatPage.tsx`

- Integra detección de rol admin via `get_current_user_info`
- Carga `auto_mode` de todos los grupos (para badges)
- Pasa `isAdmin`, `groupAutoModes`, `onOpenGroupSettings` al ConversationList
- Pasa `isAutoGroup` al ChatPanel
- Renderiza `GroupAgentSettingsDialog` cuando se abre config de un grupo

---

## 6. Lo que NO se implementa todavía

| Feature | Estado |
|---------|--------|
| Lógica automática de análisis | ❌ No implementado |
| Worker nuevo / adicional | ❌ No implementado |
| Clasificación de intents | ❌ No implementado |
| Llamadas automáticas a modelos | ❌ No implementado |
| Polling de eventos | ❌ No implementado |
| Interceptación de mensajes | ❌ No implementado |
| Triggers automáticos en DB | ❌ No implementado |

---

## 7. Compatibilidad V2

- Si `group_agent_settings` **no existe** para un grupo → funciona exactamente como V2 normal.
- La RPC `ai_get_group_agent_settings` devuelve defaults con `exists: false`.
- **Nada rompe el flujo actual** de chat, mensajes, requests, ni worker.
- El worker ALB357 no necesita ningún cambio.

---

## 8. Seguridad

| Control | Estado |
|---------|--------|
| `service_role` solo en servidor | ✅ |
| Escrituras solo vía RPC | ✅ |
| Usuarios normales no pueden modificar config | ✅ (solo admin) |
| Manager solo lectura | ✅ |
| RLS en todas las tablas nuevas | ✅ |
| Trigger function con search_path fijo | ✅ |

---

## 9. Diagnóstico de riesgo

| Área | Nivel |
|------|-------|
| Backend (tablas/RPCs) | 🟢 Bajo |
| RLS | 🟢 Bajo |
| Worker V2 | 🟢 Cero (sin cambios) |
| Producción | 🟢 Cero |
| Frontend | 🟢 Bajo (solo visual + modal admin) |

---

## 10. Arquitectura tras este paso

```
V2 Worker (estable, sin cambios)
+
Tablas V3 preparadas (group_agent_settings, group_events_log)
+
UI preparada (badges, modal config, banner)
=
Sistema listo para activar agentes autónomos
```

**Todavía sin riesgo.**

---

## 11. Próximos pasos (V3 futura)

| # | Feature | Prioridad |
|---|---------|-----------|
| 1 | Worker V3 de análisis (polling `group_events_log`) | Alta |
| 2 | Clasificador de intents por mensaje | Alta |
| 3 | Lógica de decisión de intervención | Alta |
| 4 | Integración cooldown + last_intervention_at | Media |
| 5 | Dashboard admin: vista de eventos/decisiones | Media |
| 6 | Multi-modelo por grupo | Media |
| 7 | Métricas de agentes autónomos | Baja |
| 8 | Escalado horizontal de workers | Baja |

---

## 12. Archivos de referencia

### Base de datos (migraciones)
- `v3_create_group_agent_settings` — Tabla + RLS + trigger + índice
- `v3_create_group_events_log` — Tabla + RLS + índices
- `v3_group_agent_settings_rpcs` — RPCs GET/UPDATE
- `v3_fix_trigger_search_path` — Fix search_path advisory

### Frontend
- `src/pages/nexo_av/ai/logic/hooks/useGroupAgentSettings.ts`
- `src/pages/nexo_av/ai/desktop/components/GroupAgentSettingsDialog.tsx`
- `src/pages/nexo_av/ai/desktop/components/ConversationList.tsx` (modificado)
- `src/pages/nexo_av/ai/desktop/components/ChatPanel.tsx` (modificado)
- `src/pages/nexo_av/ai/desktop/AIChatPage.tsx` (modificado)

---

*Documento generado: 2026-02-16*  
*Versión: V3-prep-1.0*
