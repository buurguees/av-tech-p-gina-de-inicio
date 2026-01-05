-- Drop and recreate get_current_user_info to include phone and job_position
DROP FUNCTION IF EXISTS public.get_current_user_info();

CREATE FUNCTION public.get_current_user_info()
 RETURNS TABLE(user_id uuid, email text, full_name text, department internal.department_type, roles text[], phone text, job_position text)
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
    au.job_position
  FROM internal.authorized_users au
  LEFT JOIN internal.user_roles ur ON ur.user_id = au.id
  LEFT JOIN internal.roles r ON r.id = ur.role_id
  WHERE au.auth_user_id = auth.uid()
    AND au.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  GROUP BY au.id, au.email, au.full_name, au.department, au.phone, au.job_position
$$;