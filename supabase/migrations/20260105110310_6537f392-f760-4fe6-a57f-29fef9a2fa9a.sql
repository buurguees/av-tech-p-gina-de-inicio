
-- ============================================
-- NEXOAV DATABASE - FASE 4: PROJECTS
-- ============================================

-- 1. TABLA: projects.projects (tabla base)
-- ============================================
CREATE TABLE projects.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number TEXT UNIQUE NOT NULL,
  project_type projects.project_type NOT NULL,
  title TEXT NOT NULL,
  client_id UUID REFERENCES crm.clients(id),
  location_id UUID REFERENCES crm.locations(id),
  quote_id UUID REFERENCES sales.quotes(id),
  status projects.project_status NOT NULL DEFAULT 'PLANNED',
  priority projects.priority_level DEFAULT 'MEDIUM',
  start_date DATE,
  end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  assigned_to UUID REFERENCES internal.authorized_users(id),
  assigned_team UUID[],
  estimated_hours NUMERIC(8,2),
  actual_hours NUMERIC(8,2) DEFAULT 0,
  budget NUMERIC(12,2),
  description TEXT,
  internal_notes TEXT,
  created_by UUID NOT NULL REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT check_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT check_actual_dates CHECK (actual_end_date IS NULL OR actual_start_date IS NULL OR actual_end_date >= actual_start_date),
  CONSTRAINT check_hours CHECK ((estimated_hours IS NULL OR estimated_hours >= 0) AND actual_hours >= 0),
  CONSTRAINT check_budget CHECK (budget IS NULL OR budget >= 0)
);

-- Índices para projects
CREATE INDEX idx_projects_number ON projects.projects(project_number);
CREATE INDEX idx_projects_client ON projects.projects(client_id, start_date DESC);
CREATE INDEX idx_projects_assigned ON projects.projects(assigned_to, status);
CREATE INDEX idx_projects_type_status ON projects.projects(project_type, status, start_date);
CREATE INDEX idx_projects_dates ON projects.projects(start_date, end_date) WHERE status != 'CANCELLED';

-- 2. TABLA: projects.customer_orders
-- ============================================
CREATE TABLE projects.customer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
  customer_order_number TEXT UNIQUE NOT NULL,
  installation_date DATE NOT NULL,
  installation_time_start TIME,
  installation_time_end TIME,
  installation_checklist JSONB DEFAULT '[]',
  access_requirements TEXT,
  special_conditions TEXT,
  delivery_address TEXT,
  contact_person_onsite TEXT,
  contact_phone_onsite TEXT,
  post_installation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para customer_orders
CREATE INDEX idx_customer_orders_project ON projects.customer_orders(project_id);
CREATE INDEX idx_customer_orders_number ON projects.customer_orders(customer_order_number);
CREATE INDEX idx_customer_orders_date ON projects.customer_orders(installation_date);

-- 3. TABLA: projects.av_projects
-- ============================================
CREATE TABLE projects.av_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
  internal_project_code TEXT UNIQUE,
  customer_project_reference TEXT,
  project_category projects.project_category,
  design_phase_status projects.phase_status DEFAULT 'PENDING',
  design_approved_at TIMESTAMPTZ,
  production_phase_status projects.phase_status DEFAULT 'PENDING',
  production_completed_at TIMESTAMPTZ,
  installation_phase_status projects.phase_status DEFAULT 'PENDING',
  installation_completed_at TIMESTAMPTZ,
  commissioning_phase_status projects.phase_status DEFAULT 'PENDING',
  commissioning_completed_at TIMESTAMPTZ,
  technical_specifications JSONB DEFAULT '{}',
  equipment_list JSONB DEFAULT '[]',
  warranty_until DATE,
  maintenance_contract BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para av_projects
CREATE INDEX idx_av_projects_project ON projects.av_projects(project_id);
CREATE INDEX idx_av_projects_code ON projects.av_projects(internal_project_code);
CREATE INDEX idx_av_projects_category ON projects.av_projects(project_category);

-- 4. TABLA: projects.project_tasks
-- ============================================
CREATE TABLE projects.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES projects.project_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES internal.authorized_users(id),
  status projects.task_status NOT NULL DEFAULT 'TODO',
  priority projects.priority_level DEFAULT 'MEDIUM',
  due_date DATE,
  estimated_hours NUMERIC(6,2),
  actual_hours NUMERIC(6,2) DEFAULT 0,
  completion_percentage INTEGER DEFAULT 0,
  blocked_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_completion CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  CONSTRAINT check_task_hours CHECK ((estimated_hours IS NULL OR estimated_hours >= 0) AND actual_hours >= 0),
  CONSTRAINT check_no_self_parent CHECK (parent_task_id IS NULL OR parent_task_id != id)
);

-- Índices para project_tasks
CREATE INDEX idx_project_tasks_project ON projects.project_tasks(project_id, status);
CREATE INDEX idx_project_tasks_assigned ON projects.project_tasks(assigned_to, status, due_date);
CREATE INDEX idx_project_tasks_parent ON projects.project_tasks(parent_task_id);
CREATE INDEX idx_project_tasks_due ON projects.project_tasks(due_date) WHERE status != 'COMPLETED';

-- 5. TABLA: projects.project_documents
-- ============================================
CREATE TABLE projects.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
  document_type projects.document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_doc_file_size CHECK (file_size_bytes IS NULL OR file_size_bytes > 0)
);

-- Índices para project_documents
CREATE INDEX idx_project_docs_project ON projects.project_documents(project_id, document_type);

-- 6. FUNCIÓN: Generar número de proyecto
-- ============================================
CREATE OR REPLACE FUNCTION projects.generate_project_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = projects, audit
AS $$
BEGIN
  IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
    IF NEW.project_type = 'CUSTOMER_ORDER' THEN
      NEW.project_number := audit.get_next_number('WO');
    ELSE
      NEW.project_number := audit.get_next_number('PRJ');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_project_number
  BEFORE INSERT ON projects.projects
  FOR EACH ROW
  EXECUTE FUNCTION projects.generate_project_number();

-- 7. FUNCIÓN: Actualizar horas actuales del proyecto desde tareas
-- ============================================
CREATE OR REPLACE FUNCTION projects.update_project_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = projects
AS $$
DECLARE
  v_total_hours NUMERIC(8,2);
BEGIN
  SELECT COALESCE(SUM(actual_hours), 0)
  INTO v_total_hours
  FROM projects.project_tasks
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
  
  UPDATE projects.projects
  SET actual_hours = v_total_hours, updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_project_hours
  AFTER INSERT OR UPDATE OR DELETE ON projects.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION projects.update_project_hours();

-- Triggers para updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects.projects
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

CREATE TRIGGER update_customer_orders_updated_at
  BEFORE UPDATE ON projects.customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

CREATE TRIGGER update_av_projects_updated_at
  BEFORE UPDATE ON projects.av_projects
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON projects.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

-- 8. HABILITAR RLS
-- ============================================
ALTER TABLE projects.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects.customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects.av_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects.project_documents ENABLE ROW LEVEL SECURITY;

-- 9. FUNCIÓN AUXILIAR: Verificar acceso a proyecto
-- ============================================
CREATE OR REPLACE FUNCTION projects.can_access_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = projects, internal
AS $$
  SELECT 
    internal.is_admin() OR 
    internal.is_manager() OR 
    internal.is_readonly() OR
    (internal.is_tech() AND EXISTS (
      SELECT 1 FROM projects.projects 
      WHERE id = p_project_id 
      AND (
        assigned_to = internal.get_authorized_user_id(auth.uid()) OR
        internal.get_authorized_user_id(auth.uid()) = ANY(assigned_team)
      )
    )) OR
    (internal.is_sales() AND EXISTS (
      SELECT 1 FROM projects.projects p
      JOIN sales.quotes q ON p.quote_id = q.id
      WHERE p.id = p_project_id 
      AND q.assigned_to = internal.get_authorized_user_id(auth.uid())
    ))
$$;

-- 10. POLÍTICAS RLS PARA projects.projects
-- ============================================
CREATE POLICY "Admin manager readonly can view all projects"
  ON projects.projects
  FOR SELECT
  USING (
    internal.is_admin() OR 
    internal.is_manager() OR 
    internal.is_readonly()
  );

CREATE POLICY "Tech can view assigned projects"
  ON projects.projects
  FOR SELECT
  USING (
    internal.is_tech() AND (
      assigned_to = internal.get_authorized_user_id(auth.uid()) OR
      internal.get_authorized_user_id(auth.uid()) = ANY(assigned_team)
    )
  );

CREATE POLICY "Sales can view related projects"
  ON projects.projects
  FOR SELECT
  USING (
    internal.is_sales() AND EXISTS (
      SELECT 1 FROM sales.quotes q
      WHERE projects.projects.quote_id = q.id 
      AND q.assigned_to = internal.get_authorized_user_id(auth.uid())
    )
  );

CREATE POLICY "Admin manager tech can create projects"
  ON projects.projects
  FOR INSERT
  WITH CHECK (
    internal.is_admin() OR 
    internal.is_manager() OR 
    internal.is_tech()
  );

CREATE POLICY "Admin manager can update all projects"
  ON projects.projects
  FOR UPDATE
  USING (internal.is_admin() OR internal.is_manager())
  WITH CHECK (internal.is_admin() OR internal.is_manager());

CREATE POLICY "Tech can update assigned projects"
  ON projects.projects
  FOR UPDATE
  USING (
    internal.is_tech() AND (
      assigned_to = internal.get_authorized_user_id(auth.uid()) OR
      internal.get_authorized_user_id(auth.uid()) = ANY(assigned_team)
    )
  )
  WITH CHECK (
    internal.is_tech() AND (
      assigned_to = internal.get_authorized_user_id(auth.uid()) OR
      internal.get_authorized_user_id(auth.uid()) = ANY(assigned_team)
    )
  );

CREATE POLICY "Admin can delete projects"
  ON projects.projects
  FOR DELETE
  USING (internal.is_admin());

-- 11. POLÍTICAS RLS PARA subtablas (heredan de projects)
-- ============================================
CREATE POLICY "Users can view customer orders"
  ON projects.customer_orders
  FOR SELECT
  USING (projects.can_access_project(project_id));

CREATE POLICY "Users can manage customer orders"
  ON projects.customer_orders
  FOR ALL
  USING (projects.can_access_project(project_id))
  WITH CHECK (projects.can_access_project(project_id));

CREATE POLICY "Users can view av projects"
  ON projects.av_projects
  FOR SELECT
  USING (projects.can_access_project(project_id));

CREATE POLICY "Users can manage av projects"
  ON projects.av_projects
  FOR ALL
  USING (projects.can_access_project(project_id))
  WITH CHECK (projects.can_access_project(project_id));

CREATE POLICY "Users can view project tasks"
  ON projects.project_tasks
  FOR SELECT
  USING (projects.can_access_project(project_id));

CREATE POLICY "Users can manage project tasks"
  ON projects.project_tasks
  FOR ALL
  USING (projects.can_access_project(project_id))
  WITH CHECK (projects.can_access_project(project_id));

CREATE POLICY "Users can view project documents"
  ON projects.project_documents
  FOR SELECT
  USING (projects.can_access_project(project_id));

CREATE POLICY "Users can manage project documents"
  ON projects.project_documents
  FOR ALL
  USING (projects.can_access_project(project_id))
  WITH CHECK (projects.can_access_project(project_id));
