-- Create helper functions in public schema to access internal tables from edge functions

-- Function to get authorized user by auth_user_id
CREATE OR REPLACE FUNCTION public.get_authorized_user_by_auth_id(p_auth_user_id uuid)
RETURNS TABLE(id uuid, email text, is_active boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT au.id, au.email, au.is_active
  FROM internal.authorized_users au
  WHERE au.auth_user_id = p_auth_user_id
    AND au.is_active = true
  LIMIT 1;
$$;

-- Function to get user roles by user_id
CREATE OR REPLACE FUNCTION public.get_user_roles_by_user_id(p_user_id uuid)
RETURNS TABLE(role_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT r.name as role_name
  FROM internal.user_roles ur
  JOIN internal.roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND (ur.expires_at IS NULL OR ur.expires_at > now());
$$;

-- Function to list all authorized users (admin only, security handled by edge function)
CREATE OR REPLACE FUNCTION public.list_authorized_users()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  phone text,
  department text,
  job_position text,
  is_active boolean,
  created_at timestamptz,
  last_login_at timestamptz,
  roles text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT 
    au.id,
    au.email,
    au.full_name,
    au.phone,
    au.department::text,
    au.job_position,
    au.is_active,
    au.created_at,
    au.last_login_at,
    COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as roles
  FROM internal.authorized_users au
  LEFT JOIN internal.user_roles ur ON ur.user_id = au.id
  LEFT JOIN internal.roles r ON r.id = ur.role_id
  GROUP BY au.id, au.email, au.full_name, au.phone, au.department, au.job_position, au.is_active, au.created_at, au.last_login_at
  ORDER BY au.created_at DESC;
$$;

-- Function to list all roles
CREATE OR REPLACE FUNCTION public.list_roles()
RETURNS TABLE(id uuid, name text, display_name text, level int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT r.id, r.name, r.display_name, r.level
  FROM internal.roles r
  ORDER BY r.level;
$$;

-- Function to update authorized user info (own info only)
CREATE OR REPLACE FUNCTION public.update_own_user_info(
  p_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_job_position text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal
AS $$
BEGIN
  UPDATE internal.authorized_users
  SET 
    full_name = COALESCE(p_full_name, full_name),
    phone = COALESCE(p_phone, phone),
    job_position = COALESCE(p_job_position, job_position),
    updated_at = now()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to create authorized user
CREATE OR REPLACE FUNCTION public.create_authorized_user(
  p_email text,
  p_full_name text,
  p_phone text,
  p_department text,
  p_job_position text,
  p_auth_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  INSERT INTO internal.authorized_users (
    email, full_name, phone, department, job_position, auth_user_id, is_active
  ) VALUES (
    p_email, p_full_name, p_phone, p_department::department_type, p_job_position, p_auth_user_id, true
  )
  RETURNING id INTO v_user_id;
  
  RETURN v_user_id;
END;
$$;

-- Function to check if email exists
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT EXISTS (
    SELECT 1 FROM internal.authorized_users WHERE email = p_email
  );
$$;

-- Function to update authorized user (admin)
CREATE OR REPLACE FUNCTION public.update_authorized_user(
  p_user_id uuid,
  p_full_name text,
  p_phone text,
  p_department text,
  p_job_position text,
  p_is_active boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal
AS $$
BEGIN
  UPDATE internal.authorized_users
  SET 
    full_name = p_full_name,
    phone = p_phone,
    department = p_department::department_type,
    job_position = p_job_position,
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to get user auth_user_id
CREATE OR REPLACE FUNCTION public.get_user_auth_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT auth_user_id FROM internal.authorized_users WHERE id = p_user_id;
$$;

-- Function to delete authorized user
CREATE OR REPLACE FUNCTION public.delete_authorized_user(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal
AS $$
DECLARE
  v_auth_user_id uuid;
BEGIN
  -- Get auth_user_id before deletion
  SELECT auth_user_id INTO v_auth_user_id
  FROM internal.authorized_users WHERE id = p_user_id;
  
  -- Delete user roles first
  DELETE FROM internal.user_roles WHERE user_id = p_user_id;
  
  -- Delete authorized user
  DELETE FROM internal.authorized_users WHERE id = p_user_id;
  
  RETURN v_auth_user_id;
END;
$$;

-- Function to toggle user status
CREATE OR REPLACE FUNCTION public.toggle_user_status(p_user_id uuid, p_is_active boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal
AS $$
BEGIN
  UPDATE internal.authorized_users
  SET is_active = p_is_active, updated_at = now()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to assign role to user
CREATE OR REPLACE FUNCTION public.assign_user_role(p_user_id uuid, p_role_name text, p_assigned_by uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal
AS $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM internal.roles WHERE name = p_role_name;
  
  IF v_role_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO internal.user_roles (user_id, role_id, assigned_by)
  VALUES (p_user_id, v_role_id, p_assigned_by)
  ON CONFLICT DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- Function to clear user roles
CREATE OR REPLACE FUNCTION public.clear_user_roles(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = internal
AS $$
  DELETE FROM internal.user_roles WHERE user_id = p_user_id;
$$;