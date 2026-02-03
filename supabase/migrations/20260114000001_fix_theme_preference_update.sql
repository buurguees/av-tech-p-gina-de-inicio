-- ============================================
-- Corregir función update_own_user_info para manejar correctamente theme_preference
-- ============================================

-- Actualizar función update_own_user_info para manejar mejor theme_preference
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
DECLARE
  v_updated boolean := false;
BEGIN
  -- Verificar que el usuario existe y está activo
  IF NOT EXISTS (SELECT 1 FROM internal.authorized_users WHERE id = p_user_id AND is_active = true) THEN
    RAISE EXCEPTION 'User not found or inactive';
  END IF;

  -- Actualizar campos solo si se proporcionan (no NULL)
  UPDATE internal.authorized_users
  SET 
    full_name = CASE 
      WHEN p_full_name IS NOT NULL THEN p_full_name 
      ELSE full_name 
    END,
    phone = CASE 
      WHEN p_phone IS NOT NULL THEN p_phone 
      ELSE phone 
    END,
    job_position = CASE 
      WHEN p_job_position IS NOT NULL THEN p_job_position 
      ELSE job_position 
    END,
    theme_preference = CASE 
      WHEN p_theme_preference IS NOT NULL THEN p_theme_preference 
      ELSE theme_preference 
    END,
    updated_at = now()
  WHERE id = p_user_id;
  
  -- FOUND is a special PL/pgSQL variable, use it directly
  v_updated := FOUND;
  
  RETURN v_updated;
END;
$$;
