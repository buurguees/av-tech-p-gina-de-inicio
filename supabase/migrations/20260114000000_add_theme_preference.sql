-- ============================================
-- Agregar campo theme_preference a authorized_users
-- ============================================

-- Agregar columna theme_preference a internal.authorized_users
ALTER TABLE internal.authorized_users
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark'));

-- Actualizar función get_current_user_info para incluir theme_preference
DROP FUNCTION IF EXISTS public.get_current_user_info();

CREATE FUNCTION public.get_current_user_info()
 RETURNS TABLE(user_id uuid, email text, full_name text, department internal.department_type, roles text[], phone text, job_position text, theme_preference text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'internal', 'public'
AS $$
  SELECT 
    au.id,
    au.email,
    au.full_name,
    au.department,
    ARRAY_AGG(r.name ORDER BY r.level) as roles,
    au.phone,
    au.job_position,
    COALESCE(au.theme_preference, 'light') as theme_preference
  FROM internal.authorized_users au
  LEFT JOIN internal.user_roles ur ON ur.user_id = au.id
  LEFT JOIN internal.roles r ON r.id = ur.role_id
  WHERE au.auth_user_id = auth.uid()
    AND au.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  GROUP BY au.id, au.email, au.full_name, au.department, au.phone, au.job_position, au.theme_preference
$$;

-- Actualizar función update_own_user_info para incluir theme_preference
CREATE OR REPLACE FUNCTION public.update_own_user_info(
  p_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_job_position text DEFAULT NULL,
  p_theme_preference text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal
AS $$
BEGIN
  -- Verificar que el usuario existe y está activo
  IF NOT EXISTS (SELECT 1 FROM internal.authorized_users WHERE id = p_user_id AND is_active = true) THEN
    RAISE EXCEPTION 'User not found or inactive';
  END IF;

  UPDATE internal.authorized_users
  SET 
    full_name = CASE WHEN p_full_name IS NOT NULL THEN p_full_name ELSE full_name END,
    phone = CASE WHEN p_phone IS NOT NULL THEN p_phone ELSE phone END,
    job_position = CASE WHEN p_job_position IS NOT NULL THEN p_job_position ELSE job_position END,
    theme_preference = CASE WHEN p_theme_preference IS NOT NULL THEN p_theme_preference ELSE theme_preference END,
    updated_at = now()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;
