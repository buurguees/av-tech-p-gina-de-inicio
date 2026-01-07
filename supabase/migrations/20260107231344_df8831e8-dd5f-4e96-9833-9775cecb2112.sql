
-- =====================================================
-- SISTEMA DE AUDITORÍA COMPLETO
-- Solo visible para administradores
-- =====================================================

-- Asegurar que el schema audit existe
CREATE SCHEMA IF NOT EXISTS audit;

-- Tabla principal de eventos de auditoría
CREATE TABLE IF NOT EXISTS audit.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  resource_type TEXT,
  resource_id TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit.events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit.events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit.events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit.events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_category ON audit.events(event_category);

-- Habilitar RLS
ALTER TABLE audit.events ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver los eventos de auditoría
DROP POLICY IF EXISTS "Only admins can view audit events" ON audit.events;
CREATE POLICY "Only admins can view audit events"
ON audit.events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'::public.app_role
  )
);

-- Solo service_role puede insertar (desde Edge Functions y triggers)
DROP POLICY IF EXISTS "Service role can insert audit events" ON audit.events;
CREATE POLICY "Service role can insert audit events"
ON audit.events
FOR INSERT
TO service_role
WITH CHECK (true);

-- Función para registrar eventos de auditoría (SECURITY DEFINER para bypasear RLS)
CREATE OR REPLACE FUNCTION audit.log_event(
  p_event_type TEXT,
  p_event_category TEXT,
  p_action TEXT,
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'info',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO audit.events (
    event_type,
    event_category,
    action,
    user_id,
    user_email,
    user_name,
    resource_type,
    resource_id,
    details,
    severity,
    ip_address,
    user_agent,
    session_id
  ) VALUES (
    p_event_type,
    p_event_category,
    p_action,
    p_user_id,
    p_user_email,
    p_user_name,
    p_resource_type,
    p_resource_id,
    p_details,
    p_severity,
    p_ip_address,
    p_user_agent,
    p_session_id
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Función para obtener eventos de auditoría (solo admins)
CREATE OR REPLACE FUNCTION audit.list_events(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_event_type TEXT DEFAULT NULL,
  p_event_category TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_severity TEXT DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  event_category TEXT,
  severity TEXT,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  resource_type TEXT,
  resource_id TEXT,
  action TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public, internal
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- Verificar que el usuario es admin
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Contar total
  SELECT COUNT(*) INTO v_total
  FROM audit.events e
  WHERE (p_event_type IS NULL OR e.event_type = p_event_type)
    AND (p_event_category IS NULL OR e.event_category = p_event_category)
    AND (p_user_id IS NULL OR e.user_id = p_user_id)
    AND (p_severity IS NULL OR e.severity = p_severity)
    AND (p_from_date IS NULL OR e.created_at >= p_from_date)
    AND (p_to_date IS NULL OR e.created_at <= p_to_date)
    AND (p_search IS NULL OR 
         e.user_email ILIKE '%' || p_search || '%' OR
         e.user_name ILIKE '%' || p_search || '%' OR
         e.action ILIKE '%' || p_search || '%' OR
         e.resource_id ILIKE '%' || p_search || '%');

  RETURN QUERY
  SELECT 
    e.id,
    e.event_type,
    e.event_category,
    e.severity,
    e.user_id,
    e.user_email,
    e.user_name,
    e.resource_type,
    e.resource_id,
    e.action,
    e.details,
    e.ip_address,
    e.user_agent,
    e.created_at,
    v_total
  FROM audit.events e
  WHERE (p_event_type IS NULL OR e.event_type = p_event_type)
    AND (p_event_category IS NULL OR e.event_category = p_event_category)
    AND (p_user_id IS NULL OR e.user_id = p_user_id)
    AND (p_severity IS NULL OR e.severity = p_severity)
    AND (p_from_date IS NULL OR e.created_at >= p_from_date)
    AND (p_to_date IS NULL OR e.created_at <= p_to_date)
    AND (p_search IS NULL OR 
         e.user_email ILIKE '%' || p_search || '%' OR
         e.user_name ILIKE '%' || p_search || '%' OR
         e.action ILIKE '%' || p_search || '%' OR
         e.resource_id ILIKE '%' || p_search || '%')
  ORDER BY e.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Trigger para auditar cambios en authorized_users
CREATE OR REPLACE FUNCTION audit.trigger_authorized_users_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, internal, public
AS $$
DECLARE
  v_action TEXT;
  v_details JSONB;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Obtener usuario actual
  v_user_id := internal.get_authorized_user_id(auth.uid());
  
  SELECT email INTO v_user_email 
  FROM internal.authorized_users 
  WHERE id = v_user_id;

  IF TG_OP = 'INSERT' THEN
    v_action := 'USER_CREATED';
    v_details := jsonb_build_object(
      'new_user_email', NEW.email,
      'new_user_name', NEW.full_name,
      'department', NEW.department
    );
    
    PERFORM audit.log_event(
      'USER_MANAGEMENT',
      'security',
      v_action,
      v_user_id,
      v_user_email,
      NULL,
      'authorized_user',
      NEW.id::TEXT,
      v_details,
      'info'
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'USER_UPDATED';
    v_details := jsonb_build_object(
      'user_email', NEW.email,
      'changes', jsonb_build_object(
        'full_name', CASE WHEN OLD.full_name != NEW.full_name THEN jsonb_build_object('old', OLD.full_name, 'new', NEW.full_name) ELSE NULL END,
        'is_active', CASE WHEN OLD.is_active != NEW.is_active THEN jsonb_build_object('old', OLD.is_active, 'new', NEW.is_active) ELSE NULL END,
        'department', CASE WHEN OLD.department != NEW.department THEN jsonb_build_object('old', OLD.department, 'new', NEW.department) ELSE NULL END
      )
    );
    
    -- Detectar desactivación de usuario
    IF OLD.is_active = true AND NEW.is_active = false THEN
      v_action := 'USER_DEACTIVATED';
      v_details := v_details || jsonb_build_object('severity_note', 'User access revoked');
    END IF;
    
    PERFORM audit.log_event(
      'USER_MANAGEMENT',
      'security',
      v_action,
      v_user_id,
      v_user_email,
      NULL,
      'authorized_user',
      NEW.id::TEXT,
      v_details,
      CASE WHEN v_action = 'USER_DEACTIVATED' THEN 'warning' ELSE 'info' END
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'USER_DELETED';
    v_details := jsonb_build_object(
      'deleted_user_email', OLD.email,
      'deleted_user_name', OLD.full_name
    );
    
    PERFORM audit.log_event(
      'USER_MANAGEMENT',
      'security',
      v_action,
      v_user_id,
      v_user_email,
      NULL,
      'authorized_user',
      OLD.id::TEXT,
      v_details,
      'warning'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear trigger en authorized_users
DROP TRIGGER IF EXISTS audit_authorized_users ON internal.authorized_users;
CREATE TRIGGER audit_authorized_users
  AFTER INSERT OR UPDATE OR DELETE ON internal.authorized_users
  FOR EACH ROW EXECUTE FUNCTION audit.trigger_authorized_users_audit();

-- Trigger para auditar cambios en user_roles
CREATE OR REPLACE FUNCTION audit.trigger_user_roles_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, internal, public
AS $$
DECLARE
  v_action TEXT;
  v_details JSONB;
  v_admin_id UUID;
  v_admin_email TEXT;
  v_target_email TEXT;
BEGIN
  -- Obtener admin actual
  v_admin_id := internal.get_authorized_user_id(auth.uid());
  
  SELECT email INTO v_admin_email 
  FROM internal.authorized_users 
  WHERE id = v_admin_id;

  IF TG_OP = 'INSERT' THEN
    -- Obtener email del usuario al que se le asigna el rol
    SELECT email INTO v_target_email 
    FROM internal.authorized_users 
    WHERE auth_user_id = NEW.user_id;
    
    v_action := 'ROLE_ASSIGNED';
    v_details := jsonb_build_object(
      'target_user_email', v_target_email,
      'role', NEW.role
    );
    
    PERFORM audit.log_event(
      'ROLE_CHANGE',
      'security',
      v_action,
      v_admin_id,
      v_admin_email,
      NULL,
      'user_role',
      NEW.id::TEXT,
      v_details,
      'warning'
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    SELECT email INTO v_target_email 
    FROM internal.authorized_users 
    WHERE auth_user_id = OLD.user_id;
    
    v_action := 'ROLE_REVOKED';
    v_details := jsonb_build_object(
      'target_user_email', v_target_email,
      'role', OLD.role
    );
    
    PERFORM audit.log_event(
      'ROLE_CHANGE',
      'security',
      v_action,
      v_admin_id,
      v_admin_email,
      NULL,
      'user_role',
      OLD.id::TEXT,
      v_details,
      'warning'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear trigger en user_roles
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION audit.trigger_user_roles_audit();

-- Trigger para auditar cambios en clientes
CREATE OR REPLACE FUNCTION audit.trigger_clients_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, internal, crm
AS $$
DECLARE
  v_action TEXT;
  v_details JSONB;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  
  SELECT email INTO v_user_email 
  FROM internal.authorized_users 
  WHERE id = v_user_id;

  IF TG_OP = 'INSERT' THEN
    v_action := 'CLIENT_CREATED';
    v_details := jsonb_build_object(
      'company_name', NEW.company_name,
      'contact_email', NEW.contact_email
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'CLIENT_UPDATED';
    v_details := jsonb_build_object(
      'company_name', NEW.company_name,
      'contact_email', NEW.contact_email
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'CLIENT_DELETED';
    v_details := jsonb_build_object(
      'company_name', OLD.company_name,
      'contact_email', OLD.contact_email
    );
  END IF;
  
  PERFORM audit.log_event(
    'DATA_MODIFICATION',
    'crm',
    v_action,
    v_user_id,
    v_user_email,
    NULL,
    'client',
    COALESCE(NEW.id, OLD.id)::TEXT,
    v_details,
    CASE WHEN TG_OP = 'DELETE' THEN 'warning' ELSE 'info' END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear trigger en clients
DROP TRIGGER IF EXISTS audit_clients ON crm.clients;
CREATE TRIGGER audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON crm.clients
  FOR EACH ROW EXECUTE FUNCTION audit.trigger_clients_audit();

-- Función para limpiar eventos antiguos
CREATE OR REPLACE FUNCTION audit.cleanup_old_events(
  p_older_than_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM audit.events
  WHERE created_at < now() - (p_older_than_days || ' days')::INTERVAL
    AND severity NOT IN ('critical', 'error');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Función de estadísticas de auditoría
CREATE OR REPLACE FUNCTION audit.get_stats(
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_events BIGINT,
  events_by_category JSONB,
  events_by_severity JSONB,
  events_by_type JSONB,
  top_users JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, internal
AS $$
BEGIN
  -- Verificar admin
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM audit.events WHERE created_at >= now() - (p_days || ' days')::INTERVAL),
    (SELECT jsonb_object_agg(event_category, cnt) FROM (
      SELECT event_category, COUNT(*) as cnt 
      FROM audit.events 
      WHERE created_at >= now() - (p_days || ' days')::INTERVAL
      GROUP BY event_category
    ) t),
    (SELECT jsonb_object_agg(severity, cnt) FROM (
      SELECT severity, COUNT(*) as cnt 
      FROM audit.events 
      WHERE created_at >= now() - (p_days || ' days')::INTERVAL
      GROUP BY severity
    ) t),
    (SELECT jsonb_object_agg(event_type, cnt) FROM (
      SELECT event_type, COUNT(*) as cnt 
      FROM audit.events 
      WHERE created_at >= now() - (p_days || ' days')::INTERVAL
      GROUP BY event_type
      ORDER BY cnt DESC
      LIMIT 10
    ) t),
    (SELECT jsonb_agg(jsonb_build_object('email', user_email, 'count', cnt)) FROM (
      SELECT user_email, COUNT(*) as cnt 
      FROM audit.events 
      WHERE created_at >= now() - (p_days || ' days')::INTERVAL
        AND user_email IS NOT NULL
      GROUP BY user_email
      ORDER BY cnt DESC
      LIMIT 5
    ) t);
END;
$$;
