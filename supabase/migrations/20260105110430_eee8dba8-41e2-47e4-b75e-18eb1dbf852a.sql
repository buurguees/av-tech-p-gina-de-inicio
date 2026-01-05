
-- ============================================
-- NEXOAV DATABASE - FASE 6: USUARIO ADMIN INICIAL
-- ============================================

-- Insertar usuario autorizado (se vinculará después con auth.users)
INSERT INTO internal.authorized_users (
  email,
  full_name,
  department,
  is_active,
  notes
) VALUES (
  'alex.burgues@avtechesdeveniments.com',
  'Alex Burgués',
  'ADMIN',
  true,
  'Administrador principal del sistema NexoAV'
);

-- Asignar rol de admin al usuario
INSERT INTO internal.user_roles (user_id, role_id)
SELECT 
  au.id,
  r.id
FROM internal.authorized_users au
CROSS JOIN internal.roles r
WHERE au.email = 'alex.burgues@avtechesdeveniments.com'
  AND r.name = 'admin';

-- Función para vincular automáticamente auth.users con authorized_users
CREATE OR REPLACE FUNCTION internal.link_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal
AS $$
BEGIN
  -- Buscar si el email existe en authorized_users y vincular
  UPDATE internal.authorized_users
  SET 
    auth_user_id = NEW.id,
    last_login_at = now(),
    updated_at = now()
  WHERE email = NEW.email
    AND auth_user_id IS NULL;
  
  -- Si el email no está en la allowlist, registrar pero no vincular
  -- (el usuario no tendrá acceso a la app)
  
  RETURN NEW;
END;
$$;

-- Trigger para vincular cuando se crea usuario en auth.users
CREATE TRIGGER trigger_link_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION internal.link_auth_user();

-- Función para actualizar last_login
CREATE OR REPLACE FUNCTION internal.update_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal
AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE internal.authorized_users
    SET last_login_at = NEW.last_sign_in_at
    WHERE auth_user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_last_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_last_login();

-- Función para verificar si un email está autorizado
CREATE OR REPLACE FUNCTION public.is_email_authorized(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT EXISTS (
    SELECT 1 FROM internal.authorized_users
    WHERE email = p_email AND is_active = true
  )
$$;

-- Función para obtener info del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_user_info()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  department internal.department_type,
  roles TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = internal, public
AS $$
  SELECT 
    au.id,
    au.email,
    au.full_name,
    au.department,
    ARRAY_AGG(r.name ORDER BY r.level) as roles
  FROM internal.authorized_users au
  LEFT JOIN internal.user_roles ur ON ur.user_id = au.id
  LEFT JOIN internal.roles r ON r.id = ur.role_id
  WHERE au.auth_user_id = auth.uid()
    AND au.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  GROUP BY au.id, au.email, au.full_name, au.department
$$;
