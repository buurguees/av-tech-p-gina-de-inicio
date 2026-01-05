
-- ============================================
-- NEXOAV DATABASE - FASE 1: INFRAESTRUCTURA
-- ============================================

-- 1. CREAR SCHEMAS
-- ============================================
CREATE SCHEMA IF NOT EXISTS internal;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS sales;
CREATE SCHEMA IF NOT EXISTS projects;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS audit;

-- 2. CREAR TIPOS ENUM
-- ============================================

-- Departamentos
CREATE TYPE internal.department_type AS ENUM ('COMMERCIAL', 'TECHNICAL', 'ADMIN', 'DIRECTION');

-- Roles del sistema
CREATE TYPE internal.app_role_extended AS ENUM ('admin', 'manager', 'sales', 'tech', 'readonly');

-- Acciones de auditoría
CREATE TYPE audit.audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'REASSIGN', 'VIEW_SENSITIVE');

-- CRM ENUMs
CREATE TYPE crm.lead_stage AS ENUM ('NEW', 'CONTACTED', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST', 'PAUSED');
CREATE TYPE crm.lead_source AS ENUM ('WEBSITE', 'INSTAGRAM', 'REFERRAL', 'OUTBOUND', 'TRADE_SHOW', 'PARTNER', 'LINKEDIN', 'OTHER');
CREATE TYPE crm.industry_sector AS ENUM ('RETAIL', 'HOSPITALITY', 'GYM', 'OFFICE', 'EVENTS', 'EDUCATION', 'HEALTHCARE', 'OTHER');
CREATE TYPE crm.urgency_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE crm.contact_type AS ENUM ('DECISION_MAKER', 'TECHNICAL', 'FINANCIAL', 'ADMINISTRATIVE');
CREATE TYPE crm.interaction_type AS ENUM ('CALL', 'EMAIL', 'MEETING', 'VISIT', 'WHATSAPP', 'OTHER');
CREATE TYPE crm.interaction_outcome AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'FOLLOW_UP_NEEDED');

-- Sales ENUMs
CREATE TYPE sales.quote_status AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'SUPERSEDED', 'EXPIRED');
CREATE TYPE sales.document_type AS ENUM ('PDF_QUOTE', 'TECHNICAL_SPEC', 'IMAGE', 'OTHER');

-- Projects ENUMs
CREATE TYPE projects.project_type AS ENUM ('CUSTOMER_ORDER', 'AV_PROJECT');
CREATE TYPE projects.project_status AS ENUM ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE projects.priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE projects.task_status AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED');
CREATE TYPE projects.project_category AS ENUM ('IMMERSIVE_ROOM', 'RETAIL_EXPERIENCE', 'CORPORATE_AV', 'EVENT', 'SIGNAGE', 'CUSTOM');
CREATE TYPE projects.phase_status AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REVISION_NEEDED', 'COMPLETED');
CREATE TYPE projects.document_type AS ENUM ('DESIGN', 'TECHNICAL_DRAWING', 'PHOTO', 'VIDEO', 'MANUAL', 'CERTIFICATE', 'OTHER');

-- 3. TABLA: internal.authorized_users
-- ============================================
CREATE TABLE internal.authorized_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  department internal.department_type NOT NULL DEFAULT 'COMMERCIAL',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  deactivated_at TIMESTAMPTZ,
  notes TEXT,
  
  CONSTRAINT fk_auth_user FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Índices para authorized_users
CREATE INDEX idx_authorized_users_email ON internal.authorized_users(email);
CREATE INDEX idx_authorized_users_active ON internal.authorized_users(is_active, department);
CREATE INDEX idx_authorized_users_auth ON internal.authorized_users(auth_user_id);

-- 4. TABLA: internal.roles
-- ============================================
CREATE TABLE internal.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  level INTEGER NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABLA: internal.user_roles
-- ============================================
CREATE TABLE internal.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES internal.authorized_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES internal.roles(id) ON DELETE RESTRICT,
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID REFERENCES internal.authorized_users(id),
  expires_at TIMESTAMPTZ,
  
  CONSTRAINT unique_user_role UNIQUE(user_id, role_id)
);

-- Índices para user_roles (sin índice parcial con now())
CREATE INDEX idx_internal_user_roles_user ON internal.user_roles(user_id);
CREATE INDEX idx_internal_user_roles_expires ON internal.user_roles(user_id, role_id, expires_at);

-- 6. TABLA: audit.audit_log
-- ============================================
CREATE TABLE audit.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL,
  action audit.audit_action NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  changed_fields JSONB,
  ip_address INET,
  user_agent TEXT
);

-- Índices para audit_log
CREATE INDEX idx_audit_timestamp ON audit.audit_log(timestamp DESC);
CREATE INDEX idx_audit_user ON audit.audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_table ON audit.audit_log(table_name, record_id);
CREATE INDEX idx_audit_action ON audit.audit_log(action, timestamp DESC);

-- 7. TABLA: audit.sequence_counters
-- ============================================
CREATE TABLE audit.sequence_counters (
  prefix TEXT NOT NULL,
  year INTEGER NOT NULL,
  current_number INTEGER NOT NULL DEFAULT 0,
  last_generated_at TIMESTAMPTZ,
  
  PRIMARY KEY (prefix, year),
  CONSTRAINT check_number_range CHECK (current_number >= 0 AND current_number < 100000),
  CONSTRAINT check_year_range CHECK (year >= 2024 AND year <= 2100)
);

-- 8. FUNCIONES AUXILIARES
-- ============================================

-- Función para obtener el siguiente número de secuencia
CREATE OR REPLACE FUNCTION audit.get_next_number(p_prefix TEXT, p_year INTEGER DEFAULT EXTRACT(YEAR FROM now())::INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit
AS $$
DECLARE
  v_number INTEGER;
BEGIN
  INSERT INTO audit.sequence_counters (prefix, year, current_number, last_generated_at)
  VALUES (p_prefix, p_year, 1, now())
  ON CONFLICT (prefix, year) DO UPDATE
  SET current_number = audit.sequence_counters.current_number + 1,
      last_generated_at = now()
  RETURNING current_number INTO v_number;
  
  RETURN p_prefix || '-' || p_year || '-' || LPAD(v_number::TEXT, 4, '0');
END;
$$;

-- Función para verificar si un usuario tiene un rol específico
CREATE OR REPLACE FUNCTION internal.user_has_role(p_auth_user_id UUID, p_role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM internal.user_roles ur
    JOIN internal.roles r ON r.id = ur.role_id
    JOIN internal.authorized_users au ON au.id = ur.user_id
    WHERE au.auth_user_id = p_auth_user_id
      AND r.name = p_role_name
      AND au.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  )
$$;

-- Función para obtener el ID de usuario autorizado desde auth.uid()
CREATE OR REPLACE FUNCTION internal.get_authorized_user_id(p_auth_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT id FROM internal.authorized_users WHERE auth_user_id = p_auth_user_id AND is_active = true
$$;

-- Función para verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION internal.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT internal.user_has_role(auth.uid(), 'admin')
$$;

-- Función para verificar si el usuario actual es manager
CREATE OR REPLACE FUNCTION internal.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT internal.user_has_role(auth.uid(), 'manager')
$$;

-- Función para verificar si el usuario actual es sales
CREATE OR REPLACE FUNCTION internal.is_sales()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT internal.user_has_role(auth.uid(), 'sales')
$$;

-- Función para verificar si el usuario actual es tech
CREATE OR REPLACE FUNCTION internal.is_tech()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT internal.user_has_role(auth.uid(), 'tech')
$$;

-- Función para verificar si el usuario actual es readonly
CREATE OR REPLACE FUNCTION internal.is_readonly()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT internal.user_has_role(auth.uid(), 'readonly')
$$;

-- Función para obtener el departamento del usuario actual
CREATE OR REPLACE FUNCTION internal.get_user_department()
RETURNS internal.department_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT department FROM internal.authorized_users WHERE auth_user_id = auth.uid() AND is_active = true
$$;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION internal.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Aplicar trigger a authorized_users
CREATE TRIGGER update_authorized_users_updated_at
  BEFORE UPDATE ON internal.authorized_users
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

-- 9. HABILITAR RLS
-- ============================================
ALTER TABLE internal.authorized_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.sequence_counters ENABLE ROW LEVEL SECURITY;

-- 10. POLÍTICAS RLS PARA internal.authorized_users
-- ============================================

-- Admin puede ver todos los usuarios
CREATE POLICY "Admin can view all users"
  ON internal.authorized_users
  FOR SELECT
  USING (internal.is_admin() OR internal.is_manager() OR internal.is_readonly());

-- Admin puede gestionar usuarios
CREATE POLICY "Admin can manage users"
  ON internal.authorized_users
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

-- Usuario puede ver su propio perfil
CREATE POLICY "User can view own profile"
  ON internal.authorized_users
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- 11. POLÍTICAS RLS PARA internal.roles
-- ============================================

-- Todos los usuarios autenticados pueden ver roles
CREATE POLICY "Authenticated users can view roles"
  ON internal.roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Solo admin puede gestionar roles
CREATE POLICY "Admin can manage roles"
  ON internal.roles
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

-- 12. POLÍTICAS RLS PARA internal.user_roles
-- ============================================

-- Admin y managers pueden ver asignaciones de roles
CREATE POLICY "Admin and managers can view role assignments"
  ON internal.user_roles
  FOR SELECT
  USING (internal.is_admin() OR internal.is_manager());

-- Usuario puede ver sus propios roles
CREATE POLICY "User can view own roles"
  ON internal.user_roles
  FOR SELECT
  USING (
    user_id = internal.get_authorized_user_id(auth.uid())
  );

-- Solo admin puede gestionar asignaciones de roles
CREATE POLICY "Admin can manage role assignments"
  ON internal.user_roles
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

-- 13. POLÍTICAS RLS PARA audit.audit_log
-- ============================================

-- Solo admin puede ver todos los logs
CREATE POLICY "Admin can view all audit logs"
  ON audit.audit_log
  FOR SELECT
  USING (internal.is_admin());

-- Manager puede ver logs
CREATE POLICY "Manager can view audit logs"
  ON audit.audit_log
  FOR SELECT
  USING (internal.is_manager());

-- Insertar logs
CREATE POLICY "System can insert audit logs"
  ON audit.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 14. POLÍTICAS RLS PARA audit.sequence_counters
-- ============================================

-- Admin puede ver y gestionar contadores
CREATE POLICY "Admin can manage sequence counters"
  ON audit.sequence_counters
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

-- Permitir generación de secuencias
CREATE POLICY "Allow sequence generation"
  ON audit.sequence_counters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 15. INSERTAR DATOS INICIALES (SEED)
-- ============================================

-- Roles del sistema
INSERT INTO internal.roles (name, display_name, description, level, is_system) VALUES
  ('admin', 'Administrador', 'Acceso total al sistema', 1, true),
  ('manager', 'Gerente', 'Supervisión de departamento', 2, true),
  ('sales', 'Comercial', 'Gestión de leads y presupuestos asignados', 3, true),
  ('tech', 'Técnico', 'Gestión de proyectos técnicos', 4, true),
  ('readonly', 'Solo Lectura', 'Consulta sin modificación', 5, true);

-- Contadores iniciales
INSERT INTO audit.sequence_counters (prefix, year, current_number) VALUES
  ('Q', 2026, 0),
  ('PRJ', 2026, 0),
  ('WO', 2026, 0);
