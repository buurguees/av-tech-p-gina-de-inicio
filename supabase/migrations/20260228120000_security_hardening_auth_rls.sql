-- ============================================
-- SECURITY HARDENING: AUTH, RLS AND RPC ACCESS
-- ============================================

ALTER TABLE internal.authorized_users
ADD COLUMN IF NOT EXISTS last_otp_verified_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION internal.can_manage_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = internal, projects, sales
AS $$
  SELECT
    internal.is_admin()
    OR internal.is_manager()
    OR (
      internal.is_tech()
      AND EXISTS (
        SELECT 1
        FROM projects.projects p
        WHERE p.id = p_project_id
          AND (
            p.assigned_to = internal.get_authorized_user_id(auth.uid())
            OR internal.get_authorized_user_id(auth.uid()) = ANY(p.assigned_team)
          )
      )
    )
$$;

DROP FUNCTION IF EXISTS public.get_current_user_info();

CREATE OR REPLACE FUNCTION public.get_current_user_info()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  full_name TEXT,
  department internal.department_type,
  roles TEXT[],
  phone TEXT,
  job_position TEXT,
  theme_preference TEXT,
  last_otp_verified_at TIMESTAMPTZ,
  otp_verified_for_today BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO internal, public
AS $$
  SELECT
    au.id,
    au.email,
    au.full_name,
    au.department,
    COALESCE(ARRAY_AGG(r.name ORDER BY r.level) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::TEXT[]) AS roles,
    au.phone,
    au.job_position,
    COALESCE(au.theme_preference, 'light') AS theme_preference,
    au.last_otp_verified_at,
    (
      au.last_otp_verified_at IS NOT NULL
      AND (au.last_otp_verified_at AT TIME ZONE 'Europe/Madrid')::DATE = (now() AT TIME ZONE 'Europe/Madrid')::DATE
    ) AS otp_verified_for_today
  FROM internal.authorized_users au
  LEFT JOIN internal.user_roles ur ON ur.user_id = au.id
  LEFT JOIN internal.roles r ON r.id = ur.role_id
  WHERE au.auth_user_id = auth.uid()
    AND au.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > now() OR ur.id IS NULL)
  GROUP BY
    au.id,
    au.email,
    au.full_name,
    au.department,
    au.phone,
    au.job_position,
    au.theme_preference,
    au.last_otp_verified_at;
$$;

CREATE OR REPLACE FUNCTION public.mark_current_user_otp_verified()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
DECLARE
  v_user_id UUID;
  v_verified_at TIMESTAMPTZ := now();
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;

  UPDATE internal.authorized_users
  SET
    last_otp_verified_at = v_verified_at,
    updated_at = now()
  WHERE id = v_user_id;

  RETURN v_verified_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_own_user_info(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_job_position TEXT DEFAULT NULL,
  p_theme_preference TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;

  IF p_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Cannot update another user';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM internal.authorized_users
    WHERE id = p_user_id
      AND is_active = true
  ) THEN
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

DROP FUNCTION IF EXISTS public.list_project_sites(UUID);

CREATE OR REPLACE FUNCTION public.list_project_sites(p_project_id UUID)
RETURNS TABLE(
  id UUID,
  project_id UUID,
  site_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  province TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  site_reference TEXT,
  floor_area TEXT,
  notes TEXT,
  is_active BOOLEAN,
  planning_notes TEXT,
  installation_date DATE,
  site_contact_person TEXT,
  site_contact_phone TEXT,
  access_requirements TEXT,
  estimated_duration_hours NUMERIC,
  technicians_assigned UUID[],
  project_phase TEXT,
  is_default BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, projects, internal
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT projects.can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    ps.id,
    ps.project_id,
    ps.site_name,
    ps.address,
    ps.city,
    ps.postal_code,
    ps.province,
    ps.country,
    ps.latitude,
    ps.longitude,
    ps.contact_name,
    ps.contact_phone,
    ps.contact_email,
    ps.site_reference,
    ps.floor_area,
    ps.notes,
    ps.is_active,
    ps.planning_notes,
    ps.installation_date,
    ps.site_contact_person,
    ps.site_contact_phone,
    ps.access_requirements,
    ps.estimated_duration_hours,
    ps.technicians_assigned,
    ps.project_phase,
    (ps.id = p.default_site_id) AS is_default,
    ps.created_at,
    ps.updated_at
  FROM projects.project_sites ps
  JOIN projects.projects p ON p.id = ps.project_id
  WHERE ps.project_id = p_project_id
  ORDER BY (ps.id = p.default_site_id) DESC, ps.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_project_site(
  p_project_id UUID,
  p_site_name TEXT,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_province TEXT DEFAULT NULL,
  p_country TEXT DEFAULT 'ES',
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_contact_name TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_site_reference TEXT DEFAULT NULL,
  p_floor_area TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_set_as_default BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, projects, internal
AS $$
DECLARE
  v_site_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT internal.can_manage_project(p_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM projects.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  INSERT INTO projects.project_sites (
    project_id,
    site_name,
    address,
    city,
    postal_code,
    province,
    country,
    latitude,
    longitude,
    contact_name,
    contact_phone,
    contact_email,
    site_reference,
    floor_area,
    notes
  )
  VALUES (
    p_project_id,
    p_site_name,
    p_address,
    p_city,
    p_postal_code,
    p_province,
    p_country,
    p_latitude,
    p_longitude,
    p_contact_name,
    p_contact_phone,
    p_contact_email,
    p_site_reference,
    p_floor_area,
    p_notes
  )
  RETURNING id INTO v_site_id;

  IF p_set_as_default THEN
    UPDATE projects.projects
    SET default_site_id = v_site_id
    WHERE id = p_project_id;
  END IF;

  RETURN v_site_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_project_site(
  p_site_id UUID,
  p_site_name TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_province TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_contact_name TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_site_reference TEXT DEFAULT NULL,
  p_floor_area TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, projects, internal
AS $$
DECLARE
  v_project_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT project_id INTO v_project_id
  FROM projects.project_sites
  WHERE id = p_site_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Site not found';
  END IF;

  IF NOT internal.can_manage_project(v_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE projects.project_sites
  SET
    site_name = COALESCE(p_site_name, site_name),
    address = COALESCE(p_address, address),
    city = COALESCE(p_city, city),
    postal_code = COALESCE(p_postal_code, postal_code),
    province = COALESCE(p_province, province),
    country = COALESCE(p_country, country),
    latitude = COALESCE(p_latitude, latitude),
    longitude = COALESCE(p_longitude, longitude),
    contact_name = COALESCE(p_contact_name, contact_name),
    contact_phone = COALESCE(p_contact_phone, contact_phone),
    contact_email = COALESCE(p_contact_email, contact_email),
    site_reference = COALESCE(p_site_reference, site_reference),
    floor_area = COALESCE(p_floor_area, floor_area),
    notes = COALESCE(p_notes, notes)
  WHERE id = p_site_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_default_project_site(p_project_id UUID, p_site_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, projects, internal
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT internal.can_manage_project(p_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM projects.project_sites
    WHERE id = p_site_id
      AND project_id = p_project_id
  ) THEN
    RAISE EXCEPTION 'Site does not belong to this project';
  END IF;

  UPDATE projects.projects
  SET default_site_id = p_site_id
  WHERE id = p_project_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_project_site(p_site_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, projects, internal
AS $$
DECLARE
  v_project_id UUID;
  v_is_default BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT ps.project_id, (p.default_site_id = ps.id)
  INTO v_project_id, v_is_default
  FROM projects.project_sites ps
  JOIN projects.projects p ON p.id = ps.project_id
  WHERE ps.id = p_site_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Site not found';
  END IF;

  IF NOT internal.can_manage_project(v_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM projects.project_sites
    WHERE project_id = v_project_id
      AND is_active = TRUE
  ) <= 1 THEN
    RAISE EXCEPTION 'Cannot archive the last active site';
  END IF;

  UPDATE projects.project_sites
  SET is_active = FALSE
  WHERE id = p_site_id;

  IF v_is_default THEN
    UPDATE projects.projects
    SET default_site_id = (
      SELECT id
      FROM projects.project_sites
      WHERE project_id = v_project_id
        AND is_active = TRUE
        AND id != p_site_id
      ORDER BY created_at ASC
      LIMIT 1
    )
    WHERE id = v_project_id;
  END IF;

  RETURN TRUE;
END;
$$;

DROP FUNCTION IF EXISTS public.get_project(UUID);

CREATE OR REPLACE FUNCTION public.get_project(p_project_id UUID)
RETURNS TABLE(
  id UUID,
  client_id UUID,
  client_name TEXT,
  client_order_number TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  created_by_name TEXT,
  local_name TEXT,
  notes TEXT,
  project_address TEXT,
  project_city TEXT,
  project_name TEXT,
  project_number TEXT,
  quote_id UUID,
  status TEXT,
  updated_at TIMESTAMPTZ,
  site_mode TEXT,
  default_site_id UUID,
  default_site_name TEXT,
  default_site_address TEXT,
  default_site_city TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, projects, internal, crm
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT projects.can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.client_id,
    c.company_name,
    p.client_order_number,
    p.created_at,
    p.created_by,
    COALESCE(au.full_name, ''),
    p.local_name,
    p.description,
    ''::TEXT,
    p.project_city,
    p.project_name,
    p.project_number,
    p.quote_id,
    p.status::TEXT,
    p.updated_at,
    p.site_mode::TEXT,
    p.default_site_id,
    ps.site_name,
    ps.address,
    ps.city
  FROM projects.projects p
  LEFT JOIN crm.clients c ON c.id = p.client_id
  LEFT JOIN internal.authorized_users au ON au.id = p.created_by
  LEFT JOIN projects.project_sites ps ON ps.id = p.default_site_id
  WHERE p.id = p_project_id;
END;
$$;

DROP FUNCTION IF EXISTS public.create_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_project(
  p_client_id UUID,
  p_client_order_number TEXT DEFAULT NULL,
  p_local_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_project_address TEXT DEFAULT NULL,
  p_project_city TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'NEGOTIATION',
  p_site_mode TEXT DEFAULT 'SINGLE_SITE',
  p_site_name TEXT DEFAULT NULL
)
RETURNS TABLE(project_id UUID, project_name TEXT, project_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, projects, internal, crm
AS $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
  v_project_number TEXT;
  v_project_name TEXT;
  v_client_name TEXT;
  v_site_id UUID;
  v_site_mode projects.site_mode;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (internal.is_admin() OR internal.is_manager() OR internal.is_tech()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  BEGIN
    v_site_mode := p_site_mode::projects.site_mode;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid site_mode';
  END;

  SELECT company_name INTO v_client_name
  FROM crm.clients
  WHERE id = p_client_id;

  IF v_client_name IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  v_project_number := projects.generate_project_number();
  v_project_name := v_project_number || ' - ' || v_client_name;

  IF p_client_order_number IS NOT NULL AND p_client_order_number != '' THEN
    v_project_name := v_project_name || ' - ' || p_client_order_number;
  END IF;

  IF p_project_city IS NOT NULL AND p_project_city != '' THEN
    v_project_name := v_project_name || ' - ' || p_project_city;
  END IF;

  IF p_local_name IS NOT NULL AND p_local_name != '' THEN
    v_project_name := v_project_name || ' - ' || p_local_name;
  END IF;

  INSERT INTO projects.projects (
    project_number,
    project_name,
    client_id,
    client_order_number,
    local_name,
    description,
    project_city,
    status,
    created_by,
    site_mode
  )
  VALUES (
    v_project_number,
    v_project_name,
    p_client_id,
    p_client_order_number,
    p_local_name,
    p_notes,
    p_project_city,
    p_status::projects.project_status,
    v_user_id,
    v_site_mode
  )
  RETURNING id INTO v_project_id;

  v_site_id := gen_random_uuid();

  INSERT INTO projects.project_sites (id, project_id, site_name, city)
  VALUES (
    v_site_id,
    v_project_id,
    COALESCE(NULLIF(p_site_name, ''), COALESCE(p_local_name, 'Sitio Principal')),
    p_project_city
  );

  UPDATE projects.projects
  SET default_site_id = v_site_id
  WHERE id = v_project_id;

  RETURN QUERY
  SELECT v_project_id, v_project_name, v_project_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_project(
  p_project_id UUID,
  p_client_order_number TEXT DEFAULT NULL,
  p_local_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_project_address TEXT DEFAULT NULL,
  p_project_city TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_site_mode TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, projects, internal
AS $$
DECLARE
  v_current_mode projects.site_mode;
  v_new_mode projects.site_mode;
  v_site_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT internal.can_manage_project(p_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_site_mode IS NOT NULL THEN
    SELECT site_mode INTO v_current_mode
    FROM projects.projects
    WHERE id = p_project_id;

    BEGIN
      v_new_mode := p_site_mode::projects.site_mode;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Invalid site_mode';
    END;

    IF v_current_mode = 'MULTI_SITE' AND v_new_mode = 'SINGLE_SITE' THEN
      SELECT COUNT(*) INTO v_site_count
      FROM projects.project_sites
      WHERE project_id = p_project_id
        AND is_active = TRUE;

      IF v_site_count > 1 THEN
        RAISE EXCEPTION 'Cannot change to SINGLE_SITE: % active sites', v_site_count;
      END IF;
    END IF;
  END IF;

  UPDATE projects.projects
  SET
    client_order_number = COALESCE(p_client_order_number, client_order_number),
    local_name = COALESCE(p_local_name, local_name),
    description = COALESCE(p_notes, description),
    project_city = COALESCE(p_project_city, project_city),
    status = COALESCE(p_status::projects.project_status, status),
    site_mode = COALESCE(v_new_mode, site_mode)
  WHERE id = p_project_id;

  RETURN FOUND;
END;
$$;

DROP FUNCTION IF EXISTS public.get_quote_notes(UUID);

CREATE OR REPLACE FUNCTION public.get_quote_notes(p_quote_id UUID)
RETURNS TABLE(
  id UUID,
  content TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, quotes, internal, sales
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT sales.can_access_quote(p_quote_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    qn.id,
    qn.content,
    qn.created_by,
    COALESCE(au.full_name, au.email, 'Usuario') AS created_by_name,
    qn.created_at
  FROM quotes.quote_notes qn
  LEFT JOIN internal.authorized_users au ON au.id = qn.created_by
  WHERE qn.quote_id = p_quote_id
  ORDER BY qn.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_quote_note(
  p_quote_id UUID,
  p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, quotes, internal, sales
AS $$
DECLARE
  v_note_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;

  IF NOT sales.can_access_quote(p_quote_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Note content cannot be empty';
  END IF;

  INSERT INTO quotes.quote_notes (quote_id, content, created_by)
  VALUES (p_quote_id, trim(p_content), v_user_id)
  RETURNING id INTO v_note_id;

  RETURN v_note_id;
END;
$$;

DROP POLICY IF EXISTS payroll_settings_select ON internal.payroll_settings;
CREATE POLICY payroll_settings_select
ON internal.payroll_settings
FOR SELECT
USING (internal.is_admin() OR internal.is_manager());

DROP POLICY IF EXISTS payroll_settings_audit_select ON internal.payroll_settings_audit;
CREATE POLICY payroll_settings_audit_select
ON internal.payroll_settings_audit
FOR SELECT
USING (internal.is_admin() OR internal.is_manager());

DROP POLICY IF EXISTS partner_payroll_profiles_select ON internal.partner_payroll_profiles;
CREATE POLICY partner_payroll_profiles_select
ON internal.partner_payroll_profiles
FOR SELECT
USING (internal.is_admin() OR internal.is_manager());

DROP POLICY IF EXISTS "Users can view quote history" ON quotes.quote_history;
CREATE POLICY "Users can view quote history"
ON quotes.quote_history
FOR SELECT
USING (sales.can_access_quote(quote_id));

DROP POLICY IF EXISTS "System can insert history" ON quotes.quote_history;

DROP POLICY IF EXISTS "project_sites_select_auth" ON projects.project_sites;
DROP POLICY IF EXISTS "project_sites_insert_auth" ON projects.project_sites;
DROP POLICY IF EXISTS "project_sites_update_auth" ON projects.project_sites;

CREATE POLICY "project_sites_select_access"
ON projects.project_sites
FOR SELECT
USING (projects.can_access_project(project_id));

CREATE POLICY "project_sites_insert_manage"
ON projects.project_sites
FOR INSERT
WITH CHECK (internal.can_manage_project(project_id));

CREATE POLICY "project_sites_update_manage"
ON projects.project_sites
FOR UPDATE
USING (internal.can_manage_project(project_id))
WITH CHECK (internal.can_manage_project(project_id));

REVOKE EXECUTE ON FUNCTION public.get_authorized_user_by_auth_id(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_roles_by_user_id(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_authorized_users() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_roles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_authorized_user(TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_email_exists(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_authorized_user(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_auth_id(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_authorized_user(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_user_status(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_user_role(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clear_user_roles(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_authorized_user_by_auth_id(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_roles_by_user_id(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_authorized_users() TO service_role;
GRANT EXECUTE ON FUNCTION public.list_roles() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_authorized_user(TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_authorized_user(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_auth_id(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_authorized_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_user_status(UUID, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.assign_user_role(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_user_roles(UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_own_user_info(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_own_user_info(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_current_user_info() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_info() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.mark_current_user_otp_verified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_current_user_otp_verified() TO authenticated, service_role;
