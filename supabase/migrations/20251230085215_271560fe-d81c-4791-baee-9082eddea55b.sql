-- =============================================
-- FASE 1: Arquitectura base + CRM (formulario de contacto)
-- Preparado para Fase 2: Plataforma interna con roles
-- =============================================

-- 1. CREAR SCHEMAS
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS audit;

-- 2. ENUM PARA ROLES (preparado para Fase 2)
CREATE TYPE public.app_role AS ENUM ('admin', 'comercial', 'tecnico');

-- 3. TABLA DE ROLES DE USUARIO (preparado para Fase 2)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. FUNCIÓN PARA VERIFICAR ROLES (Security Definer - evita recursión RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. FUNCIÓN PARA VERIFICAR DOMINIO PERMITIDO
CREATE OR REPLACE FUNCTION public.is_allowed_domain(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT _email LIKE '%@avtechesdeveniments.com'
$$;

-- 6. TABLA DE MENSAJES DE CONTACTO (CRM)
CREATE TABLE crm.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Datos del contacto
    nombre TEXT NOT NULL,
    empresa TEXT,
    email TEXT NOT NULL,
    telefono TEXT,
    
    -- Tipo de solicitud
    tipo_solicitud TEXT NOT NULL CHECK (tipo_solicitud IN ('presupuesto', 'visita')),
    tipo_espacio TEXT CHECK (tipo_espacio IN ('retail', 'corporativo', 'evento', 'otro')),
    
    -- Mensaje
    mensaje TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    
    -- Estado del lead (para gestión futura)
    status TEXT NOT NULL DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'contactado', 'en_proceso', 'cerrado', 'descartado')),
    assigned_to UUID REFERENCES auth.users(id),
    
    -- Notas internas (para equipo)
    notas_internas TEXT
);

ALTER TABLE crm.contact_messages ENABLE ROW LEVEL SECURITY;

-- 7. TABLA DE AUDITORÍA
CREATE TABLE audit.logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Qué se hizo
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    
    -- Quién lo hizo
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    
    -- Cuándo y desde dónde
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    
    -- Datos adicionales (JSON)
    old_data JSONB,
    new_data JSONB,
    metadata JSONB
);

ALTER TABLE audit.logs ENABLE ROW LEVEL SECURITY;

-- 8. POLÍTICAS RLS

-- contact_messages: Solo backend puede insertar (público), usuarios internos pueden leer
CREATE POLICY "Service role can insert contact messages"
ON crm.contact_messages
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Authenticated users can view contact messages"
ON crm.contact_messages
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial') OR 
    public.has_role(auth.uid(), 'tecnico')
);

CREATE POLICY "Admin and comercial can update contact messages"
ON crm.contact_messages
FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial')
);

-- user_roles: Solo admin puede gestionar
CREATE POLICY "Admin can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- audit.logs: Solo admins pueden ver
CREATE POLICY "Admin can view audit logs"
ON audit.logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert audit logs"
ON audit.logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- 9. ÍNDICES PARA RENDIMIENTO
CREATE INDEX idx_contact_messages_created_at ON crm.contact_messages(created_at DESC);
CREATE INDEX idx_contact_messages_status ON crm.contact_messages(status);
CREATE INDEX idx_contact_messages_tipo ON crm.contact_messages(tipo_solicitud);
CREATE INDEX idx_audit_logs_created_at ON audit.logs(created_at DESC);
CREATE INDEX idx_audit_logs_table ON audit.logs(table_name);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- 10. FUNCIÓN PARA REGISTRAR AUDITORÍA
CREATE OR REPLACE FUNCTION audit.log_action(
    _action TEXT,
    _table_name TEXT,
    _record_id UUID DEFAULT NULL,
    _user_id UUID DEFAULT NULL,
    _user_email TEXT DEFAULT NULL,
    _ip_address INET DEFAULT NULL,
    _user_agent TEXT DEFAULT NULL,
    _old_data JSONB DEFAULT NULL,
    _new_data JSONB DEFAULT NULL,
    _metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit
AS $$
DECLARE
    _log_id UUID;
BEGIN
    INSERT INTO audit.logs (
        action, table_name, record_id, user_id, user_email,
        ip_address, user_agent, old_data, new_data, metadata
    ) VALUES (
        _action, _table_name, _record_id, _user_id, _user_email,
        _ip_address, _user_agent, _old_data, _new_data, _metadata
    )
    RETURNING id INTO _log_id;
    
    RETURN _log_id;
END;
$$;