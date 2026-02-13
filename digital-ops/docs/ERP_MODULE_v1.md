# ERP Module V1 — Digital Ops / Agentes IA

> **Versión:** 1.2  
> **Fecha:** 2026-02-12  
> **Estado:** Diseño previo a implementación  
> **Alcance:** Integración del Departamento Digital IA dentro del ERP existente (nexo_av)  
> **Naturaleza:** Herramienta interna (NO producto externo)  
> **Stack:** React 18 + TypeScript + Vite 7 + Supabase (PostgreSQL + Auth + Edge Functions)  
> **Cambios v1.2:** Estado `executing`, bloqueo doble aprobación, protección agente loco, whitelist tablas

---

## 1. Objetivo

Definir cómo el Departamento Digital de Agentes IA se integra dentro del ERP actual, convirtiendo el ERP en el **centro operativo (Control Tower)**.

Este módulo permitirá:

- Recibir propuestas generadas por agentes
- Aprobar / rechazar cambios
- Gestionar proyectos IA
- Visualizar tareas por departamento
- Auditar ejecuciones
- Mantener trazabilidad total

**El ERP será la única interfaz humana del sistema.**

---

## 1.1 Stack real y convención backend

| Capa | Tecnología | Notas |
|------|-----------|-------|
| **Frontend** | React 18 + TypeScript + Vite 7 | SPA con layouts desktop + mobile |
| **UI** | Tailwind CSS + shadcn/ui (Radix) + Lucide | Componentes reutilizables existentes |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions + Storage) | BaaS, sin backend propio |
| **Data fetching** | `supabase.rpc()` como estándar | Nada de REST externo. Todo por funciones PostgreSQL |
| **Auth** | Supabase Auth (password + OTP) | Roles: `admin`, `manager`, `comercial`, `tecnico` |
| **Realtime** | Supabase Realtime (WebSocket) | Para badges y notificaciones en vivo |
| **Deploy** | Firebase Hosting | `npm run build && firebase deploy` |

**Convención clave:** El patrón del ERP existente es 100% `supabase.rpc()`. Las tablas `ai_*` seguirán exactamente el mismo patrón: cada operación expuesta como función PostgreSQL, llamada desde el frontend vía `supabase.rpc('nombre_rpc', { params })`.

**Bridge agentes:** Los agentes IA NO usan auth humano. Escriben en tablas `ai_*` vía la Edge Function `ai-agent-bridge`, que usa `service_role` (bypass RLS). Ver sección 11.

---

## 2. Principios del Módulo IA en ERP

1. El ERP es la **fuente de verdad**.
2. Los agentes **NO** escriben en tablas core.
3. Los agentes **solo** escriben en tablas `ai_*`.
4. Ningún cambio crítico se aplica sin **aprobación humana**.
5. Todo cambio ejecutado genera **log y registro de auditoría**.
6. Debe existir **rollback documentado** para cambios estructurales.

---

## 3. Estructura del Módulo en el ERP (Pantallas UI)

### 3.1 Inbox — Propuestas Pendientes

Vista tipo tablero/lista con:

- Título
- Departamento
- Impacto estimado (€ / tiempo / riesgo)
- Tipo (mejora ERP / campaña / análisis / producto)
- Fecha
- Estado
- Botones:
  - Aprobar
  - Rechazar
  - Solicitar cambios

---

### 3.2 Vista Detalle de Propuesta

Debe mostrar:

- Descripción completa
- Justificación
- Impacto esperado
- Riesgos
- Plan de ejecución
- Plan de rollback
- Deliverables asociados
- Historial de comentarios
- Botón de aprobación

---

### 3.3 Proyectos IA

Listado con:

- Nombre
- Departamento líder
- Estado
- Progreso (%)
- Número de tareas
- Fecha inicio
- Fecha estimada
- Owner

**Estados posibles:**

- `intake`
- `triage`
- `planning`
- `executing`
- `qa`
- `delivered`
- `closed`

---

### 3.4 Tareas IA

Vista por:

- Departamento
- Proyecto
- Estado

**Estados:**

- `pending`
- `in_progress`
- `blocked`
- `review`
- `done`

Cada tarea debe tener:

- Responsable (agente)
- Input
- Output esperado
- Dependencias
- Definition of Done
- Log de actividad

---

### 3.5 Ejecuciones (AI Runs)

Registro de cada ejecución realizada por los agentes:

- `run_id`
- Proyecto asociado
- Tipo de acción
- Modelo usado
- Proveedor usado (ollama, gemini, groq, etc.)
- Duración
- Resultado
- Estado
- Usuario aprobador (si aplica)
- Timestamp

---

### 3.6 Logs / Auditoría

Historial completo de:

- Propuestas generadas
- Aprobaciones
- Rechazos
- Cambios ejecutados
- Rollbacks
- PR generados
- Scripts ejecutados

**Retención mínima recomendada:** 90 días.

---

## 4. Modelo de Datos (SQL Base)

### 4.1 `ai_projects`

```sql
CREATE TABLE ai_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT,
  owner_user_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 `ai_tasks`

```sql
CREATE TABLE ai_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ai_projects(id),
  department TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  assigned_agent TEXT,
  dependencies JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.3 `ai_insights`

```sql
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT,
  description TEXT,
  impact_level TEXT,
  related_project UUID REFERENCES ai_projects(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.4 `ai_deliverables`

```sql
CREATE TABLE ai_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ai_projects(id),
  type TEXT,
  description TEXT,
  location TEXT,
  version TEXT,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.5 `ai_approvals`

```sql
CREATE TABLE ai_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID REFERENCES ai_deliverables(id),
  approved_by UUID,
  decision TEXT,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.6 `ai_runs`

```sql
CREATE TABLE ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ai_projects(id),
  agent TEXT,
  provider TEXT,
  model TEXT,
  action_type TEXT,
  duration_ms INTEGER,
  status TEXT,
  approved_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. Flujo Operativo ERP + IA

1. Usuario crea **Request** en ERP.
2. JEFE IA genera **proyecto**.
3. Se crean **tareas**.
4. Se generan **deliverables**.
5. Deliverable queda en estado `pending_approval`.
6. Usuario **aprueba** (solo si estado = `pending_approval`, bloqueo doble aprobación).
7. Deliverable pasa a `approved`.
8. Se inicia ejecución → estado `executing` (trazabilidad de runs largos).
9. Se registra **run** en `ai_runs`.
10. Si éxito → `executed`. Si error → vuelve a `approved` (reintento). Si rollback → `rolled_back`.
11. Se actualiza **proyecto**.

### 5.1 Diagrama de estados del deliverable

```
draft → pending_approval → approved → executing → executed
                         → rejected               → rolled_back
                                    → (error) → approved (reintento)
```

### 5.2 Protecciones de integridad

| Protección | Dónde | Qué evita |
|-----------|-------|-----------|
| **Bloqueo doble aprobación** | `ai_approve_deliverable` / `ai_reject_deliverable` | Aprobar algo ya aprobado/ejecutado/rechazado |
| **Whitelist de tablas** | `ai_agent_submit_deliverable` | Agente proponiendo cambios en tablas no autorizadas |
| **Campos obligatorios** | `ai_agent_submit_deliverable` | Deliverables `erp_change` sin rollback_plan ni impact_summary |
| **Critical = admin-only** | `ai_approve_deliverable` | Manager aprobando riesgo critical (solo admin) |
| **Critical = rollback obligatorio** | `ai_agent_submit_deliverable` | Propuestas critical sin plan de reversión |

---

## 6. Permisos y Roles

### CEO
- Aprobar cambios críticos
- Ejecutar rollbacks
- Ver todo

### JEFE IA
- Crear proyectos
- Aprobar cambios medios
- Gestionar tareas

### Usuario Operativo
- Crear requests
- Aprobar campañas
- Rechazar propuestas

### Observador
- Solo lectura

---

## 7. Acciones Críticas (Requieren Aprobación)

- Cambios en ERP
- Scripts SQL
- Deploy
- Merge en main
- Propuestas salariales
- Publicación campañas

---

## 8. Eventos Lógicos del Sistema

| Evento | Descripción | Estado deliverable |
|--------|-------------|-------------------|
| `request_created` | Usuario crea un nuevo request en el ERP | — |
| `project_created` | JEFE IA genera un proyecto a partir del request | — |
| `deliverable_generated` | Agente genera un entregable/propuesta | `draft` |
| `approval_requested` | Deliverable pasa a estado `pending_approval` | `pending_approval` |
| `approval_granted` | Humano aprueba la propuesta | `approved` |
| `approval_rejected` | Humano rechaza la propuesta | `rejected` |
| `run_started` | Ejecución iniciada (run en curso) | `executing` |
| `run_completed` | Cambio aplicado exitosamente | `executed` |
| `run_failed` | Ejecución falló (disponible para reintento) | `approved` |
| `rollback_executed` | Cambio revertido | `rolled_back` |

---

## 9. Integraciones

### GitHub
- Crear PR en draft
- No merge automático
- Registrar PR URL en `ai_deliverables`

### ERP Core
- Solo lectura directa vía `supabase.rpc()` (funciones PostgreSQL existentes)
- Cambios aplicados vía proceso controlado (propuesta → aprobación → ejecución)

---

## 10. Catálogo oficial de RPCs (contrato de implementación)

Todas las funciones siguen el patrón existente del ERP: `supabase.rpc('nombre', { params })`.

### 10.1 RPCs — Inbox y propuestas (frontend humano)

| RPC | Tipo | Params principales | Returns |
|-----|------|-------------------|---------|
| `ai_list_deliverables` | SELECT | `p_status`, `p_department`, `p_priority`, `p_page`, `p_page_size` | Array de deliverables paginado |
| `ai_get_deliverable` | SELECT | `p_deliverable_id` | Deliverable completo con proyecto y tarea asociados |
| `ai_approve_deliverable` | INSERT+UPDATE | `p_deliverable_id`, `p_comment`, `p_risk_level` | Registra en `ai_approvals`, cambia estado a `approved` |
| `ai_reject_deliverable` | INSERT+UPDATE | `p_deliverable_id`, `p_comment` (obligatorio) | Registra en `ai_approvals`, cambia estado a `rejected` |
| `ai_request_changes` | UPDATE | `p_deliverable_id`, `p_comment` | Devuelve a `draft` con feedback |

### 10.2 RPCs — Proyectos y tareas (frontend humano)

| RPC | Tipo | Params principales | Returns |
|-----|------|-------------------|---------|
| `ai_list_projects` | SELECT | `p_status`, `p_department`, `p_priority`, `p_page`, `p_page_size` | Array de proyectos paginado |
| `ai_get_project` | SELECT | `p_project_id` | Proyecto con tareas, deliverables e insights |
| `ai_list_tasks` | SELECT | `p_project_id`, `p_department`, `p_status` | Array de tareas |
| `ai_get_task` | SELECT | `p_task_id` | Tarea con logs de actividad |

### 10.3 RPCs — Ejecuciones y auditoría (frontend humano)

| RPC | Tipo | Params principales | Returns |
|-----|------|-------------------|---------|
| `ai_list_runs` | SELECT | `p_project_id`, `p_agent`, `p_status`, `p_page`, `p_page_size` | Array de runs paginado |
| `ai_get_run` | SELECT | `p_run_id` | Detalle de ejecución con payload |
| `ai_execute_run` | INSERT+UPDATE | `p_deliverable_id`, `p_approval_id` | Ejecuta cambio aprobado, registra en `ai_runs` |
| `ai_rollback_run` | INSERT+UPDATE | `p_run_id` | Revierte cambio, registra rollback |
| `ai_list_insights` | SELECT | `p_department`, `p_severity`, `p_page`, `p_page_size` | Array de insights |

### 10.4 RPCs — Dashboard IA (frontend humano)

| RPC | Tipo | Params | Returns |
|-----|------|--------|---------|
| `ai_get_dashboard_metrics` | SELECT | ninguno | `{ pending_count, approved_today, rejected_today, active_projects, total_runs }` |
| `ai_count_pending_deliverables` | SELECT | ninguno | `integer` (para badge sidebar) |

### 10.5 RPCs — Agentes (llamadas vía Edge Function, NO desde frontend)

| RPC | Tipo | Params principales | Returns | Protecciones |
|-----|------|-------------------|---------|-------------|
| `ai_agent_create_project` | INSERT | `p_name`, `p_department`, `p_priority` | UUID del proyecto creado | — |
| `ai_agent_create_task` | INSERT | `p_project_id`, `p_title`, `p_department`, `p_assigned_agent` | UUID de la tarea | — |
| `ai_agent_submit_deliverable` | INSERT | `p_project_id`, `p_task_id`, `p_type`, `p_description`, `p_location` | UUID del deliverable (estado: `pending_approval`) | Whitelist tablas, campos obligatorios para `erp_change`, rollback obligatorio para `critical` |
| `ai_agent_create_insight` | INSERT | `p_source`, `p_description`, `p_impact_level`, `p_related_project` | UUID del insight | — |
| `ai_agent_log_run` | INSERT | `p_project_id`, `p_agent`, `p_provider`, `p_model`, `p_action_type`, `p_duration_ms`, `p_status` | UUID del run | — |

> El SQL detallado de cada RPC (con todas las protecciones) está en `SUPABASE_AI_SCHEMA_V1.md`.

### 10.6 Protecciones en RPCs (resumen)

| Protección | RPC afectada | Comportamiento |
|-----------|-------------|---------------|
| **Bloqueo doble aprobación** | `ai_approve_deliverable`, `ai_reject_deliverable` | Solo permite operar si `status = 'pending_approval'` |
| **Whitelist de tablas core** | `ai_agent_submit_deliverable` | Rechaza propuestas con `target_table` fuera de la whitelist |
| **Campos obligatorios para ERP change** | `ai_agent_submit_deliverable` | Exige `impact_summary`, `rollback_plan` y `target_table` si `type = 'erp_change'` |
| **Critical = rollback obligatorio** | `ai_agent_submit_deliverable` | Impacto `critical` requiere `rollback_plan` e `impact_summary` |
| **Critical = admin-only** | `ai_approve_deliverable` | Solo `admin` puede aprobar riesgo `high` o `critical` |
| **Estado `executing`** | Trigger `auto_update_deliverable_on_run` | Marca deliverable como `executing` durante runs largos; vuelve a `approved` si falla |

---

## 11. Edge Function: ai-agent-bridge

### 11.1 Propósito

Punto de entrada único para que los agentes OpenClaw escriban en tablas `ai_*`. Aísla completamente a los agentes del sistema de auth humano.

### 11.2 Especificación

| Campo | Valor |
|-------|-------|
| **Ruta** | `supabase/functions/ai-agent-bridge/index.ts` |
| **Método** | POST |
| **Auth** | Token de agente (`AI_AGENT_TOKEN`) en header `Authorization: Bearer <token>` |
| **Rol Supabase** | `service_role` (bypass RLS) |
| **Input** | `{ action: string, params: object }` |
| **Output** | `{ success: boolean, data?: any, error?: string }` |

### 11.3 Flujo

```
OpenClaw Agent
    │  POST /ai-agent-bridge
    │  Authorization: Bearer <AI_AGENT_TOKEN>
    │  Body: { action: "submit_deliverable", params: {...} }
    ▼
Edge Function (ai-agent-bridge)
    │  1. Validar AI_AGENT_TOKEN contra env var
    │  2. Validar action está en whitelist
    │  3. Crear supabase client con service_role
    │  4. Llamar supabase.rpc('ai_agent_' + action, params)
    │  5. Retornar resultado
    ▼
Tabla ai_* (escritura directa vía service_role)
    │
    ▼ Supabase Realtime
Badge actualizado en Sidebar del ERP
```

### 11.4 Actions permitidas (whitelist)

```typescript
const ALLOWED_ACTIONS = [
  'create_project',
  'create_task',
  'submit_deliverable',
  'create_insight',
  'log_run',
] as const;
```

Cualquier action fuera de esta lista → 403 Forbidden.

### 11.5 Motivo de diseño

- Los agentes **NO** tienen cuenta de usuario Supabase.
- Los agentes **NO** usan la anon key del frontend.
- Los agentes **NO** pueden autenticarse con password/OTP.
- El bridge centraliza y limita qué pueden hacer los agentes.
- Si un agente se compromete, solo puede ejecutar las 5 acciones de la whitelist.

---

## 12. RLS, Roles y Permisos (Supabase)

### 12.1 Roles humanos (existentes en el ERP)

| Rol Supabase (`app_role`) | Permisos módulo IA |
|--------------------------|-------------------|
| `admin` | Ver todo, aprobar/rechazar todo, ejecutar rollbacks |
| `manager` | Ver todo, aprobar/rechazar riesgo medio/bajo |
| `comercial` | Ver proyectos/tareas de su departamento (solo lectura) |
| `tecnico` | Ver proyectos/tareas de su departamento (solo lectura) |

### 12.2 Permisos de aprobación

| Nivel de riesgo | Quién puede aprobar |
|----------------|-------------------|
| `critical` / `high` | Solo `admin` |
| `medium` | `admin` o `manager` |
| `low` | `admin` o `manager` |

### 12.3 Agentes (vía Edge Function)

- Los agentes escriben vía `ai-agent-bridge` con `service_role`.
- `service_role` **bypasses RLS** — por eso la whitelist de actions es crítica.
- El `service_role` key **NUNCA** se expone al frontend.
- El frontend humano **siempre** usa auth de usuario + RLS.

### 12.4 Resumen de acceso

| Actor | Método | RLS | Tablas core | Tablas `ai_*` |
|-------|--------|-----|-------------|--------------|
| Humano (frontend) | `supabase.rpc()` con auth | Sí | SELECT (vía RPCs existentes) | SELECT + INSERT en `ai_approvals` |
| Agente (OpenClaw) | Edge Function `ai-agent-bridge` | No (service_role) | Sin acceso | INSERT + UPDATE |
| Edge Function | `service_role` | No | Sin acceso directo | INSERT + UPDATE (solo acciones whitelisted) |

---

## 13. Realtime y Triggers

### 13.1 Badge en Sidebar (Realtime)

El Sidebar del ERP muestra un badge con el número de propuestas pendientes, actualizado en tiempo real:

```tsx
// En Sidebar.tsx — escucha cambios en ai_deliverables
const [pendingCount, setPendingCount] = useState(0);

useEffect(() => {
  // Carga inicial
  supabase.rpc('ai_count_pending_deliverables').then(({ data }) => {
    setPendingCount(data || 0);
  });

  // Escucha en tiempo real
  const channel = supabase
    .channel('ai-inbox-badge')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ai_deliverables',
      filter: 'status=eq.pending_approval'
    }, () => {
      supabase.rpc('ai_count_pending_deliverables').then(({ data }) => {
        setPendingCount(data || 0);
      });
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

### 13.2 Notificación ERP → Agentes (cuando humano aprueba/rechaza)

**Opción A — Supabase Realtime (recomendada):**

OpenClaw escucha vía WebSocket los cambios en `ai_approvals`:

```typescript
supabase
  .channel('ai-approvals')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'ai_approvals'
  }, (payload) => {
    if (payload.new.decision === 'approved') {
      // Ejecutar el cambio aprobado
    } else if (payload.new.decision === 'rejected') {
      // Registrar rechazo, opcionalmente generar nueva propuesta
    }
  })
  .subscribe();
```

**Opción B — Database trigger + pg_net (alternativa, solo si se necesita):**

```sql
CREATE OR REPLACE FUNCTION notify_agent_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.decision = 'approved' THEN
    PERFORM net.http_post(
      url := 'http://localhost:18789/webhook/approval',
      headers := '{"Authorization": "Bearer " || current_setting(''app.agent_token'')}'::jsonb,
      body := json_build_object(
        'deliverable_id', NEW.deliverable_id,
        'decision', NEW.decision
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_agent
AFTER INSERT ON ai_approvals
FOR EACH ROW EXECUTE FUNCTION notify_agent_on_approval();
```

> Recomendación: empezar con Opción A (Realtime). Pasar a B solo si se necesita webhook directo.

### 13.3 Triggers automáticos (PostgreSQL)

| Trigger | Evento | Acción |
|---------|--------|--------|
| Nuevo deliverable pendiente | INSERT en `ai_deliverables` con `status = 'pending_approval'` | Badge Sidebar se actualiza (Realtime) |
| Aprobación | INSERT en `ai_approvals` con `decision = 'approved'` | Notificar agente (Realtime) |
| Rechazo | INSERT en `ai_approvals` con `decision = 'rejected'` | Notificar agente (Realtime) |
| Ejecución iniciada | INSERT en `ai_runs` con `action_type = 'execute'` | Auto-update `ai_deliverables.status` → `executing` |
| Ejecución completada | INSERT en `ai_runs` con `status = 'success'` | Auto-update `ai_deliverables.status` → `executed` |
| Ejecución fallida | INSERT en `ai_runs` con `status = 'error'` | Auto-update `ai_deliverables.status` → `approved` (reintento) |
| Rollback | INSERT en `ai_runs` con `action_type = 'rollback'` | Auto-update estado → `rolled_back`, alerta al admin |
| Insight crítico | INSERT en `ai_insights` con `impact_level = 'critical'` | Notificación push al admin |

---

## 14. Rutas UI en el ERP (React Router)

Nuevas rutas bajo `/nexo-av/:userId/`:

| Ruta | Componente | Acceso |
|------|-----------|--------|
| `ai` | `AIDashboardPage` | admin, manager |
| `ai/inbox` | `AIInboxPage` | admin, manager |
| `ai/inbox/:deliverableId` | `AIDeliverableDetailPage` | admin, manager |
| `ai/projects` | `AIProjectsPage` | admin, manager |
| `ai/projects/:projectId` | `AIProjectDetailPage` | admin, manager |
| `ai/tasks` | `AITasksPage` | admin, manager |
| `ai/runs` | `AIRunsPage` | admin, manager |
| `ai/runs/:runId` | `AIRunDetailPage` | admin, manager |
| `ai/insights` | `AIInsightsPage` | admin, manager |

**Sección Sidebar** (nueva carpeta "Agentes IA", solo visible para admin/manager):

```
📂 Agentes IA
   ├── Dashboard IA       → /ai
   ├── Inbox Propuestas    → /ai/inbox        (badge: pendingCount)
   ├── Proyectos IA        → /ai/projects
   ├── Tareas IA           → /ai/tasks
   ├── Ejecuciones         → /ai/runs
   └── Insights            → /ai/insights
```

**Componentes existentes reutilizados:**

| Componente | Uso en módulo IA |
|-----------|-----------------|
| `DataList` | Todas las tablas/listas |
| `PaginationControls` | Paginación |
| `SearchBar` | Búsqueda en inbox y proyectos |
| `DetailNavigationBar` | Cabecera de páginas |
| `DetailActionButton` | Botón "Aprobar" |
| `ConfirmActionDialog` | Confirmación de aprobación/rechazo |
| `FormDialog` | Formulario de comentario |
| `StatusSelector` | Filtro de estado |
| `MoreOptionsDropdown` | Acciones secundarias |

**Componentes nuevos necesarios (mínimos):**

| Componente | Propósito |
|-----------|-----------|
| `AIApprovalActions` | Bloque Aprobar/Rechazar/Pedir cambios + comentario obligatorio |
| `AIRiskBadge` | Badge visual de riesgo (low/medium/high/critical) |
| `AIAgentBadge` | Badge que muestra agente + modelo que generó la propuesta |

---

## 15. Orden de implementación

| Paso | Qué | Dependencia | Por qué primero |
|------|-----|------------|----------------|
| **1** | Crear tablas `ai_*` en Supabase (migration) | Ninguna | Base de todo |
| **2** | Crear RPCs de lectura (`ai_list_*`, `ai_get_*`, `ai_count_*`) | Paso 1 | Necesarias para la UI |
| **3** | Crear `AIInboxPage` + `AIDeliverableDetailPage` | Paso 2 | Pantalla más importante |
| **4** | Crear RPCs de aprobación/rechazo | Paso 1 | Flujo humano funcional |
| **5** | Crear Edge Function `ai-agent-bridge` | Paso 1 | Los agentes pueden escribir |
| **6** | Configurar Realtime para badge en Sidebar | Paso 2 | Sincronización en vivo |
| **7** | Crear resto de páginas (Projects, Tasks, Runs, Insights) | Paso 2 | Visibilidad completa |
| **8** | Conectar OpenClaw al bridge | Paso 5 | Agentes operativos end-to-end |

---

## 16. Próxima Fase (V2)

- Métricas por departamento (widgets en dashboard)
- Panel de rendimiento IA (tokens consumidos, tiempo, tasa aprobación)
- Sistema de scoring de decisiones (calidad de propuestas por agente)
- Alertas automáticas (push notifications en ERP)
- Opción B de triggers (pg_net webhooks)

---

## Conclusión

Este módulo convierte el ERP en:

- **Centro de decisión**
- **Centro de aprobación**
- **Registro permanente**
- **Interfaz humana del sistema de agentes**

> Sin este módulo, los agentes son asistentes.  
> **Con este módulo, se convierten en estructura operativa real.**

Todo se implementa dentro del stack existente: **React + Supabase RPC + shadcn/ui**. Sin frameworks nuevos, sin backend adicional, sin APIs REST externas.

> SQL completo: ver `SUPABASE_AI_SCHEMA_V1.md`
