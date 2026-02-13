# Supabase AI Schema V1 — SQL Definitivo

> **Versión:** 1.1  
> **Fecha:** 2026-02-12  
> **Estado:** Listo para implementar como migration  
> **Cambios v1.1:** Estado `executing`, bloqueo doble aprobación, protección agente loco  
> **Propósito:** Contrato de implementación SQL. Separado del diseño funcional (ERP_MODULE_v1.md).  
> **Destino:** `supabase/migrations/` del proyecto nexo_av

---

## 1. Enums

```sql
-- Enum: estados de proyecto IA
CREATE TYPE ai_project_status AS ENUM (
  'intake',
  'triage',
  'planning',
  'executing',
  'qa',
  'delivered',
  'closed'
);

-- Enum: estados de tarea IA
CREATE TYPE ai_task_status AS ENUM (
  'pending',
  'in_progress',
  'blocked',
  'review',
  'done'
);

-- Enum: estados de deliverable (propuesta)
CREATE TYPE ai_deliverable_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'executing',       -- ← NUEVO: run en curso (trazabilidad de ejecuciones largas)
  'executed',
  'rolled_back'
);

-- Enum: decisión de aprobación
CREATE TYPE ai_approval_decision AS ENUM (
  'approved',
  'rejected'
);

-- Enum: nivel de impacto / riesgo
CREATE TYPE ai_impact_level AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- Enum: resultado de ejecución
CREATE TYPE ai_run_status AS ENUM (
  'success',
  'error',
  'rolled_back'
);

-- Enum: departamento IA
CREATE TYPE ai_department AS ENUM (
  'programacion',
  'marketing',
  'comercial',
  'administracion'
);

-- Enum: prioridad
CREATE TYPE ai_priority AS ENUM (
  'alta',
  'media',
  'baja'
);
```

---

## 2. Tablas

### 2.1 `ai_projects`

```sql
CREATE TABLE ai_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  department      ai_department NOT NULL,
  status          ai_project_status NOT NULL DEFAULT 'intake',
  priority        ai_priority NOT NULL DEFAULT 'media',
  owner_user_id   UUID REFERENCES auth.users(id),  -- humano solicitante (nullable para proyectos auto-generados)
  assigned_agent  TEXT,                              -- agente JEFE asignado
  deadline        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_ai_projects
  BEFORE UPDATE ON ai_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2.2 `ai_tasks`

```sql
CREATE TABLE ai_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  department      ai_department NOT NULL,
  status          ai_task_status NOT NULL DEFAULT 'pending',
  assigned_agent  TEXT NOT NULL,
  input_desc      TEXT,                     -- descripción de inputs
  expected_output TEXT,                     -- output esperado
  definition_done TEXT,                     -- criterios de "hecho"
  dependencies    JSONB DEFAULT '[]',       -- IDs de tareas bloqueantes
  estimated_hours DECIMAL(5,2),
  actual_hours    DECIMAL(5,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_ai_tasks
  BEFORE UPDATE ON ai_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2.3 `ai_insights`

```sql
CREATE TABLE ai_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES ai_projects(id) ON DELETE SET NULL,
  task_id         UUID REFERENCES ai_tasks(id) ON DELETE SET NULL,
  agent_id        TEXT NOT NULL,
  department      ai_department NOT NULL,
  type            TEXT NOT NULL,             -- observation | anomaly | recommendation | metric | alert
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  impact_level    ai_impact_level NOT NULL DEFAULT 'low',
  data_source     TEXT,                      -- de dónde sacó los datos
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.4 `ai_deliverables`

```sql
CREATE TABLE ai_deliverables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES ai_projects(id) ON DELETE SET NULL,
  task_id         UUID REFERENCES ai_tasks(id) ON DELETE SET NULL,
  agent_id        TEXT NOT NULL,
  department      ai_department NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  type            TEXT NOT NULL,             -- erp_change | campaign | analysis | product | script | pr
  status          ai_deliverable_status NOT NULL DEFAULT 'draft',
  impact_level    ai_impact_level NOT NULL DEFAULT 'low',
  impact_summary  TEXT,                      -- qué tablas/datos se afectan
  rollback_plan   TEXT,                      -- cómo revertir
  change_payload  JSONB,                     -- detalle técnico del cambio propuesto
  target_table    TEXT,                      -- tabla core afectada (si aplica)
  location        TEXT,                      -- ruta a archivo/PR/link
  version         TEXT,
  attachments     JSONB DEFAULT '[]',        -- rutas a adjuntos
  rejection_reason TEXT,                     -- motivo de rechazo (si rejected)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_ai_deliverables
  BEFORE UPDATE ON ai_deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2.5 `ai_approvals`

```sql
CREATE TABLE ai_approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id  UUID NOT NULL REFERENCES ai_deliverables(id) ON DELETE CASCADE,
  decision        ai_approval_decision NOT NULL,
  approved_by     UUID NOT NULL REFERENCES auth.users(id),  -- usuario humano
  comment         TEXT NOT NULL,             -- comentario obligatorio
  risk_level      ai_impact_level,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.6 `ai_runs`

```sql
CREATE TABLE ai_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id  UUID REFERENCES ai_deliverables(id) ON DELETE SET NULL,
  approval_id     UUID REFERENCES ai_approvals(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES ai_projects(id) ON DELETE SET NULL,
  agent_id        TEXT NOT NULL,
  provider        TEXT NOT NULL,              -- ollama | gemini | groq | openrouter
  model           TEXT NOT NULL,              -- qwen2.5-coder:7b | gemini-2.0-flash | etc.
  action_type     TEXT NOT NULL,              -- execute | rollback | analysis | generation
  target_table    TEXT,                       -- tabla afectada (si aplica)
  change_payload  JSONB,                      -- detalle exacto del cambio
  status          ai_run_status NOT NULL,
  error_message   TEXT,
  rollback_status TEXT DEFAULT 'not_needed',  -- available | executed | expired | not_needed
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Índices

```sql
-- Inbox: consultas frecuentes por estado y departamento
CREATE INDEX idx_deliverables_status ON ai_deliverables(status);
CREATE INDEX idx_deliverables_department ON ai_deliverables(department);
CREATE INDEX idx_deliverables_status_dept ON ai_deliverables(status, department);
CREATE INDEX idx_deliverables_created ON ai_deliverables(created_at DESC);

-- Proyectos activos
CREATE INDEX idx_projects_status ON ai_projects(status);
CREATE INDEX idx_projects_department ON ai_projects(department);

-- Tareas por proyecto y estado
CREATE INDEX idx_tasks_project ON ai_tasks(project_id);
CREATE INDEX idx_tasks_status ON ai_tasks(status);
CREATE INDEX idx_tasks_agent ON ai_tasks(assigned_agent);

-- Auditoría
CREATE INDEX idx_approvals_deliverable ON ai_approvals(deliverable_id);
CREATE INDEX idx_approvals_created ON ai_approvals(created_at DESC);
CREATE INDEX idx_runs_deliverable ON ai_runs(deliverable_id);
CREATE INDEX idx_runs_project ON ai_runs(project_id);
CREATE INDEX idx_runs_created ON ai_runs(created_at DESC);

-- Insights
CREATE INDEX idx_insights_impact ON ai_insights(impact_level);
CREATE INDEX idx_insights_department ON ai_insights(department);
CREATE INDEX idx_insights_project ON ai_insights(project_id);
```

---

## 4. RLS Policies

### 4.1 Habilitar RLS en todas las tablas

```sql
ALTER TABLE ai_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;
```

### 4.2 Policies para usuarios humanos (frontend)

```sql
-- Lectura: admin y manager pueden ver todo en tablas ai_*
CREATE POLICY "ai_read_admin_manager" ON ai_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Misma policy para todas las tablas ai_*
CREATE POLICY "ai_read_admin_manager" ON ai_tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "ai_read_admin_manager" ON ai_insights
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "ai_read_admin_manager" ON ai_deliverables
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "ai_read_admin_manager" ON ai_approvals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "ai_read_admin_manager" ON ai_runs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );
```

### 4.3 Policies de escritura para humanos (aprobaciones)

```sql
-- Solo admin y manager pueden insertar aprobaciones
CREATE POLICY "ai_approvals_insert" ON ai_approvals
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
```

### 4.4 Bypass para Edge Function (service_role)

Las Edge Functions que usan `service_role` key **bypasses RLS automáticamente**. No se necesitan policies adicionales. Esto es cómo los agentes escriben vía `ai-agent-bridge`.

> **Nunca exponer `service_role` al frontend.** Ver SEGURIDAD.md §4.5.

---

## 5. RPCs (funciones PostgreSQL)

### 5.1 Dashboard y contadores

```sql
-- Contar deliverables pendientes (para badge sidebar)
CREATE OR REPLACE FUNCTION ai_count_pending_deliverables()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM ai_deliverables
  WHERE status = 'pending_approval';
$$;

-- Métricas del dashboard IA
CREATE OR REPLACE FUNCTION ai_get_dashboard_metrics()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'pending_count', (SELECT COUNT(*) FROM ai_deliverables WHERE status = 'pending_approval'),
    'approved_today', (SELECT COUNT(*) FROM ai_approvals WHERE decision = 'approved' AND created_at >= CURRENT_DATE),
    'rejected_today', (SELECT COUNT(*) FROM ai_approvals WHERE decision = 'rejected' AND created_at >= CURRENT_DATE),
    'active_projects', (SELECT COUNT(*) FROM ai_projects WHERE status NOT IN ('delivered', 'closed')),
    'total_runs_today', (SELECT COUNT(*) FROM ai_runs WHERE created_at >= CURRENT_DATE)
  );
$$;
```

### 5.2 Listado de deliverables (Inbox)

```sql
CREATE OR REPLACE FUNCTION ai_list_deliverables(
  p_status TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_impact_level TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER := (p_page - 1) * p_page_size;
  v_total INTEGER;
  v_items JSON;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM ai_deliverables d
  WHERE (p_status IS NULL OR d.status::TEXT = p_status)
    AND (p_department IS NULL OR d.department::TEXT = p_department)
    AND (p_impact_level IS NULL OR d.impact_level::TEXT = p_impact_level);

  SELECT json_agg(row_to_json(t)) INTO v_items
  FROM (
    SELECT
      d.id, d.title, d.description, d.type,
      d.department, d.status, d.impact_level,
      d.agent_id, d.target_table, d.location,
      d.created_at, d.updated_at,
      p.name AS project_name
    FROM ai_deliverables d
    LEFT JOIN ai_projects p ON d.project_id = p.id
    WHERE (p_status IS NULL OR d.status::TEXT = p_status)
      AND (p_department IS NULL OR d.department::TEXT = p_department)
      AND (p_impact_level IS NULL OR d.impact_level::TEXT = p_impact_level)
    ORDER BY d.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) t;

  RETURN json_build_object(
    'items', COALESCE(v_items, '[]'::JSON),
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size
  );
END;
$$;
```

### 5.3 Detalle de deliverable

```sql
CREATE OR REPLACE FUNCTION ai_get_deliverable(p_deliverable_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'deliverable', row_to_json(d),
    'project', row_to_json(p),
    'task', row_to_json(t),
    'approvals', (
      SELECT COALESCE(json_agg(row_to_json(a)), '[]'::JSON)
      FROM ai_approvals a WHERE a.deliverable_id = d.id
    ),
    'runs', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::JSON)
      FROM ai_runs r WHERE r.deliverable_id = d.id
    )
  ) INTO v_result
  FROM ai_deliverables d
  LEFT JOIN ai_projects p ON d.project_id = p.id
  LEFT JOIN ai_tasks t ON d.task_id = t.id
  WHERE d.id = p_deliverable_id;

  RETURN v_result;
END;
$$;
```

### 5.4 Aprobar deliverable

```sql
CREATE OR REPLACE FUNCTION ai_approve_deliverable(
  p_deliverable_id UUID,
  p_comment TEXT,
  p_risk_level TEXT DEFAULT 'low'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_approval_id UUID;
  v_user_role TEXT;
  v_current_status TEXT;
BEGIN
  -- ── GUARD 1: Verificar estado actual (bloqueo doble aprobación) ──
  SELECT status::TEXT INTO v_current_status
  FROM ai_deliverables WHERE id = p_deliverable_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Deliverable no encontrado: %', p_deliverable_id;
  END IF;

  IF v_current_status != 'pending_approval' THEN
    RAISE EXCEPTION 'Deliverable no está pendiente de aprobación (estado actual: %)', v_current_status;
  END IF;

  -- ── GUARD 2: Verificar que el usuario tiene permisos ──
  SELECT role INTO v_user_role
  FROM user_roles WHERE user_id = auth.uid();

  IF v_user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'No tienes permisos para aprobar';
  END IF;

  -- ── GUARD 3: Verificar que admin aprueba high/critical ──
  IF p_risk_level IN ('high', 'critical') AND v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo admin puede aprobar riesgo alto/crítico';
  END IF;

  -- Insertar aprobación
  INSERT INTO ai_approvals (deliverable_id, decision, approved_by, comment, risk_level)
  VALUES (p_deliverable_id, 'approved', auth.uid(), p_comment, p_risk_level::ai_impact_level)
  RETURNING id INTO v_approval_id;

  -- Actualizar estado del deliverable
  UPDATE ai_deliverables SET status = 'approved' WHERE id = p_deliverable_id;

  RETURN json_build_object('approval_id', v_approval_id, 'status', 'approved');
END;
$$;
```

### 5.5 Rechazar deliverable

```sql
CREATE OR REPLACE FUNCTION ai_reject_deliverable(
  p_deliverable_id UUID,
  p_comment TEXT  -- obligatorio
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_approval_id UUID;
  v_current_status TEXT;
BEGIN
  -- ── GUARD 1: Verificar estado actual (bloqueo doble rechazo / operación inválida) ──
  SELECT status::TEXT INTO v_current_status
  FROM ai_deliverables WHERE id = p_deliverable_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Deliverable no encontrado: %', p_deliverable_id;
  END IF;

  IF v_current_status != 'pending_approval' THEN
    RAISE EXCEPTION 'Deliverable no está pendiente de aprobación (estado actual: %)', v_current_status;
  END IF;

  -- ── GUARD 2: Comentario obligatorio ──
  IF p_comment IS NULL OR TRIM(p_comment) = '' THEN
    RAISE EXCEPTION 'El comentario es obligatorio al rechazar';
  END IF;

  -- Insertar rechazo
  INSERT INTO ai_approvals (deliverable_id, decision, approved_by, comment)
  VALUES (p_deliverable_id, 'rejected', auth.uid(), p_comment)
  RETURNING id INTO v_approval_id;

  -- Actualizar estado y razón
  UPDATE ai_deliverables
  SET status = 'rejected', rejection_reason = p_comment
  WHERE id = p_deliverable_id;

  RETURN json_build_object('approval_id', v_approval_id, 'status', 'rejected');
END;
$$;
```

### 5.6 RPCs de agentes (llamadas vía Edge Function)

```sql
-- Agente crea proyecto
CREATE OR REPLACE FUNCTION ai_agent_create_project(
  p_name TEXT,
  p_department TEXT,
  p_priority TEXT DEFAULT 'media',
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO ai_projects (name, description, department, priority)
  VALUES (p_name, p_description, p_department::ai_department, p_priority::ai_priority)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Agente crea tarea
CREATE OR REPLACE FUNCTION ai_agent_create_task(
  p_project_id UUID,
  p_title TEXT,
  p_department TEXT,
  p_assigned_agent TEXT,
  p_description TEXT DEFAULT NULL,
  p_expected_output TEXT DEFAULT NULL,
  p_definition_done TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO ai_tasks (project_id, title, description, department, assigned_agent, expected_output, definition_done)
  VALUES (p_project_id, p_title, p_description, p_department::ai_department, p_assigned_agent, p_expected_output, p_definition_done)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Agente envía deliverable (propuesta) — CON PROTECCIONES
CREATE OR REPLACE FUNCTION ai_agent_submit_deliverable(
  p_project_id UUID,
  p_task_id UUID DEFAULT NULL,
  p_agent_id TEXT DEFAULT 'unknown',
  p_department TEXT DEFAULT 'programacion',
  p_title TEXT DEFAULT '',
  p_description TEXT DEFAULT '',
  p_type TEXT DEFAULT 'analysis',
  p_impact_level TEXT DEFAULT 'low',
  p_impact_summary TEXT DEFAULT NULL,
  p_rollback_plan TEXT DEFAULT NULL,
  p_change_payload JSONB DEFAULT NULL,
  p_target_table TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  -- ── Whitelist de tablas core que un agente puede PROPONER modificar ──
  -- Si la tabla no está aquí, el deliverable se rechaza automáticamente.
  -- Añadir tablas aquí requiere revisión humana del código.
  v_allowed_tables TEXT[] := ARRAY[
    'invoices', 'invoice_lines', 'projects', 'project_workers',
    'clients', 'products', 'services',
    'social_posts', 'campaigns',
    'salaries', 'expenses'
  ];
BEGIN
  -- ── GUARD 1: Validar target_table contra whitelist ──
  IF p_target_table IS NOT NULL AND p_target_table != '' THEN
    IF NOT (p_target_table = ANY(v_allowed_tables)) THEN
      RAISE EXCEPTION 'Tabla "%" no está en la whitelist de tablas permitidas para agentes. Tablas permitidas: %',
        p_target_table, array_to_string(v_allowed_tables, ', ');
    END IF;
  END IF;

  -- ── GUARD 2: Campos obligatorios para cambios ERP ──
  IF p_type = 'erp_change' THEN
    IF p_impact_summary IS NULL OR TRIM(p_impact_summary) = '' THEN
      RAISE EXCEPTION 'impact_summary es obligatorio para deliverables de tipo erp_change';
    END IF;
    IF p_rollback_plan IS NULL OR TRIM(p_rollback_plan) = '' THEN
      RAISE EXCEPTION 'rollback_plan es obligatorio para deliverables de tipo erp_change';
    END IF;
    IF p_target_table IS NULL OR TRIM(p_target_table) = '' THEN
      RAISE EXCEPTION 'target_table es obligatorio para deliverables de tipo erp_change';
    END IF;
  END IF;

  -- ── GUARD 3: Impacto critical → forzar revisión admin-only ──
  -- No bloqueamos la creación, pero aseguramos que el impact_level quede marcado.
  -- La aprobación ya verifica: solo admin puede aprobar high/critical (ver ai_approve_deliverable).
  -- Adicionalmente, si es critical y el agente no especificó rollback, bloquear.
  IF p_impact_level = 'critical' THEN
    IF p_rollback_plan IS NULL OR TRIM(p_rollback_plan) = '' THEN
      RAISE EXCEPTION 'rollback_plan es OBLIGATORIO para deliverables con impacto critical';
    END IF;
    IF p_impact_summary IS NULL OR TRIM(p_impact_summary) = '' THEN
      RAISE EXCEPTION 'impact_summary es OBLIGATORIO para deliverables con impacto critical';
    END IF;
  END IF;

  INSERT INTO ai_deliverables (
    project_id, task_id, agent_id, department, title, description,
    type, status, impact_level, impact_summary, rollback_plan,
    change_payload, target_table, location
  ) VALUES (
    p_project_id, p_task_id, p_agent_id, p_department::ai_department,
    p_title, p_description, p_type, 'pending_approval',
    p_impact_level::ai_impact_level, p_impact_summary, p_rollback_plan,
    p_change_payload, p_target_table, p_location
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Agente registra insight
CREATE OR REPLACE FUNCTION ai_agent_create_insight(
  p_agent_id TEXT,
  p_department TEXT,
  p_title TEXT,
  p_content TEXT,
  p_type TEXT DEFAULT 'observation',
  p_impact_level TEXT DEFAULT 'low',
  p_source TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO ai_insights (agent_id, department, type, title, content, impact_level, data_source, project_id, task_id)
  VALUES (p_agent_id, p_department::ai_department, p_type, p_title, p_content, p_impact_level::ai_impact_level, p_source, p_project_id, p_task_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Agente registra run (ejecución)
CREATE OR REPLACE FUNCTION ai_agent_log_run(
  p_agent_id TEXT,
  p_provider TEXT,
  p_model TEXT,
  p_action_type TEXT,
  p_status TEXT,
  p_project_id UUID DEFAULT NULL,
  p_deliverable_id UUID DEFAULT NULL,
  p_approval_id UUID DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL,
  p_target_table TEXT DEFAULT NULL,
  p_change_payload JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO ai_runs (
    agent_id, provider, model, action_type, status,
    project_id, deliverable_id, approval_id,
    duration_ms, target_table, change_payload, error_message
  ) VALUES (
    p_agent_id, p_provider, p_model, p_action_type, p_status::ai_run_status,
    p_project_id, p_deliverable_id, p_approval_id,
    p_duration_ms, p_target_table, p_change_payload, p_error_message
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
```

---

## 6. Triggers automáticos

```sql
-- Auto-update deliverable status según el ciclo de vida del run
-- Flujo completo: approved → executing → executed | rolled_back
CREATE OR REPLACE FUNCTION auto_update_deliverable_on_run()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deliverable_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cuando se inicia un run de tipo execute → marcar deliverable como "executing"
  IF NEW.action_type = 'execute' AND NEW.status != 'error' THEN
    UPDATE ai_deliverables SET status = 'executing' WHERE id = NEW.deliverable_id;
  END IF;

  -- Cuando el run termina con éxito → marcar como "executed"
  IF NEW.status = 'success' AND NEW.action_type = 'execute' THEN
    UPDATE ai_deliverables SET status = 'executed' WHERE id = NEW.deliverable_id;
  END IF;

  -- Cuando el run falla → volver a "approved" (listo para reintentar)
  IF NEW.status = 'error' AND NEW.action_type = 'execute' THEN
    UPDATE ai_deliverables SET status = 'approved' WHERE id = NEW.deliverable_id;
  END IF;

  -- Rollback → marcar como "rolled_back"
  IF NEW.action_type = 'rollback' THEN
    UPDATE ai_deliverables SET status = 'rolled_back' WHERE id = NEW.deliverable_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_update_deliverable
  AFTER INSERT ON ai_runs
  FOR EACH ROW EXECUTE FUNCTION auto_update_deliverable_on_run();
```

> **Diagrama de estados del deliverable:**
> ```
> draft → pending_approval → approved → executing → executed
>                          → rejected                → rolled_back
>                                     → (error) → approved (reintento)
> ```

---

## 7. Seeds de ejemplo (para test UI)

```sql
-- Proyecto de ejemplo
INSERT INTO ai_projects (id, name, description, department, status, priority)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Optimización flujo de facturación',
  'Análisis y propuesta de mejora del proceso de facturación en el ERP',
  'programacion',
  'executing',
  'alta'
);

-- Tarea de ejemplo
INSERT INTO ai_tasks (id, project_id, title, department, status, assigned_agent, expected_output, definition_done)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Analizar tiempos de procesamiento de facturas',
  'programacion',
  'done',
  'admin-agent',
  'Informe con tiempos medios por fase',
  'Informe generado con datos de los últimos 3 meses'
);

-- Deliverable pendiente de aprobación
INSERT INTO ai_deliverables (id, project_id, task_id, agent_id, department, title, description, type, status, impact_level, impact_summary, rollback_plan, target_table)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'admin-agent',
  'programacion',
  'Propuesta: Índice en invoice_lines para acelerar consultas',
  'Crear índice compuesto en invoice_lines(invoice_id, product_id) para reducir tiempo de consulta de 850ms a ~50ms.',
  'erp_change',
  'pending_approval',
  'medium',
  'Tabla afectada: invoice_lines. Sin modificación de datos, solo estructura.',
  'DROP INDEX IF EXISTS idx_invoice_lines_composite;',
  'invoice_lines'
);

-- Deliverable aprobado
INSERT INTO ai_deliverables (id, project_id, agent_id, department, title, description, type, status, impact_level)
VALUES (
  'c0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'marketing-agent',
  'marketing',
  'Calendario de contenido — Febrero 2026',
  'Planificación de 12 publicaciones para redes sociales durante febrero.',
  'campaign',
  'approved',
  'low'
);

-- Deliverable rechazado
INSERT INTO ai_deliverables (id, project_id, agent_id, department, title, description, type, status, impact_level, rejection_reason)
VALUES (
  'c0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'admin-agent',
  'administracion',
  'Propuesta salarial Q1 2026',
  'Revisión de sueldos basada en rentabilidad por proyecto.',
  'analysis',
  'rejected',
  'critical',
  'Necesita incluir análisis de cashflow proyectado antes de aprobar.'
);

-- Insight de ejemplo
INSERT INTO ai_insights (project_id, agent_id, department, type, title, content, impact_level, data_source)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin-agent',
  'administracion',
  'anomaly',
  'Margen negativo detectado en proyecto PRJ-2024-089',
  'El proyecto PRJ-2024-089 tiene un margen de -12.3%. Los costes de técnicos superan el presupuesto en un 34%.',
  'high',
  'finance_list_invoices + list_projects'
);

-- Run de ejemplo
INSERT INTO ai_runs (project_id, agent_id, provider, model, action_type, status, duration_ms)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin-agent',
  'ollama',
  'llama3.3:8b',
  'analysis',
  'success',
  4520
);
```

---

## 8. Checklist de implementación SQL

- [ ] Crear enums (§1)
- [ ] Crear tablas con triggers de `updated_at` (§2)
- [ ] Crear índices (§3)
- [ ] Habilitar RLS + crear policies (§4)
- [ ] Crear RPCs de lectura: `ai_count_pending_deliverables`, `ai_get_dashboard_metrics`, `ai_list_deliverables`, `ai_get_deliverable` (§5.1-5.3)
- [ ] Crear RPCs de aprobación: `ai_approve_deliverable`, `ai_reject_deliverable` (§5.4-5.5)
- [ ] Crear RPCs de agentes: `ai_agent_create_project`, `ai_agent_create_task`, `ai_agent_submit_deliverable`, `ai_agent_create_insight`, `ai_agent_log_run` (§5.6)
- [ ] Crear trigger `auto_update_deliverable_on_run` (§6)
- [ ] Insertar seeds de test (§7)
- [ ] Verificar desde frontend: `supabase.rpc('ai_list_deliverables')` devuelve datos
- [ ] Verificar permisos: usuario `comercial` NO puede ver tablas `ai_*`
- [ ] Verificar Edge Function: POST a `ai-agent-bridge` inserta en `ai_deliverables`

---

> **Nota:** Este archivo es el "contrato de implementación SQL". Cualquier cambio en schema debe actualizarse aquí primero, luego aplicarse como migration en Supabase.
