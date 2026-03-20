-- Migration: 20260320120000_extend_create_project_full_address
-- Extends create_project RPC to accept and propagate full address
-- (p_postal_code, p_province, p_country) to the default site INSERT.
-- p_project_address was already a param but was never stored in project_sites;
-- this migration fixes that by including it in the site INSERT.
-- The projects.projects table does NOT get address/postal_code/province columns
-- (canonical location lives in project_sites). project_city is kept for fast listing.

-- Drop old signature (adding params requires DROP + CREATE in PostgreSQL)
DROP FUNCTION IF EXISTS public.create_project(uuid, text, text, text, text, text, text, text, text, text);

CREATE FUNCTION public.create_project(
  p_client_id         uuid,
  p_client_order_number text  DEFAULT NULL::text,
  p_local_name        text    DEFAULT NULL::text,
  p_notes             text    DEFAULT NULL::text,
  p_project_address   text    DEFAULT NULL::text,
  p_project_city      text    DEFAULT NULL::text,
  p_status            text    DEFAULT 'NEGOTIATION'::text,
  p_site_mode         text    DEFAULT 'SINGLE_SITE'::text,
  p_site_name         text    DEFAULT NULL::text,
  p_project_type      text    DEFAULT 'INSTALLATION'::text,
  p_postal_code       text    DEFAULT NULL::text,
  p_province          text    DEFAULT NULL::text,
  p_country           text    DEFAULT NULL::text
)
RETURNS TABLE(project_id uuid, project_name text, project_number text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $_$
DECLARE
  v_user_id       UUID;
  v_project_id    UUID;
  v_project_number TEXT;
  v_short_number  TEXT;
  v_project_name  TEXT;
  v_client_name   TEXT;
  v_site_id       UUID;
  v_site_mode     projects.site_mode;
  v_project_type  projects.project_type;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  BEGIN
    v_site_mode := p_site_mode::projects.site_mode;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid site_mode: %', p_site_mode;
  END;

  BEGIN
    v_project_type := p_project_type::projects.project_type;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid project_type: %', p_project_type;
  END;

  SELECT company_name INTO v_client_name
  FROM crm.clients WHERE id = p_client_id;
  IF v_client_name IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  -- Generate project number (e.g. PRJ-2026-000026)
  v_project_number := audit.get_next_number('PRJ');
  -- Extract sequential digits for display name (e.g. 000026)
  v_short_number := SUBSTRING(v_project_number FROM '[0-9]{6}$');

  v_project_name := v_short_number || ' - ' || v_client_name;
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
    project_number, project_name, title, project_type,
    client_id, client_order_number,
    local_name, description, project_city, status, created_by, site_mode
  )
  VALUES (
    v_project_number, v_project_name, v_project_name, v_project_type,
    p_client_id, p_client_order_number,
    p_local_name, p_notes, p_project_city, p_status::projects.project_status,
    v_user_id, v_site_mode
  )
  RETURNING id INTO v_project_id;

  -- Create default site with full address propagated
  v_site_id := gen_random_uuid();
  INSERT INTO projects.project_sites (
    id, project_id, site_name, address, city, postal_code, province, country
  )
  VALUES (
    v_site_id,
    v_project_id,
    COALESCE(NULLIF(p_site_name, ''), COALESCE(NULLIF(p_local_name, ''), 'Sitio Principal')),
    NULLIF(p_project_address, ''),
    NULLIF(p_project_city, ''),
    NULLIF(p_postal_code, ''),
    NULLIF(p_province, ''),
    COALESCE(NULLIF(p_country, ''), 'España')
  );

  UPDATE projects.projects
  SET default_site_id = v_site_id
  WHERE id = v_project_id;

  RETURN QUERY SELECT v_project_id, v_project_name, v_project_number;
END;
$_$;

ALTER FUNCTION public.create_project(uuid, text, text, text, text, text, text, text, text, text, text, text, text) OWNER TO postgres;
