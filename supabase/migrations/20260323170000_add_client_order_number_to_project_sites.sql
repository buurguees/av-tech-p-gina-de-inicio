-- Migration: añadir client_order_number a project_sites
-- Para proyectos MULTI_SITE, cada sitio puede tener su propio nº de pedido del cliente.
-- Para SINGLE_SITE, el nº de pedido sigue en el proyecto (projects.client_order_number).

ALTER TABLE projects.project_sites
  ADD COLUMN IF NOT EXISTS client_order_number TEXT;

DROP FUNCTION IF EXISTS public.list_project_sites(uuid);

CREATE OR REPLACE FUNCTION public.list_project_sites(p_project_id uuid)
  RETURNS TABLE(
    id uuid, project_id uuid, site_name text, site_reference text,
    address text, city text, postal_code text, province text, country text,
    contact_name text, contact_phone text, contact_email text,
    notes text, floor_area text, latitude double precision, longitude double precision,
    is_default boolean, is_active boolean,
    planned_start_date date, planned_end_date date, planned_days integer,
    actual_start_at timestamptz, actual_end_at timestamptz, site_status text,
    assignment_count bigint, visit_count bigint,
    created_at timestamptz, updated_at timestamptz,
    client_order_number text
  )
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path TO 'public', 'sales', 'accounting', 'internal', 'crm', 'quotes'
AS $$
DECLARE
  v_default_site_id UUID;
BEGIN
  SELECT p.default_site_id INTO v_default_site_id
  FROM projects.projects p WHERE p.id = p_project_id;

  RETURN QUERY
  SELECT
    ps.id, ps.project_id, ps.site_name, ps.site_reference,
    ps.address, ps.city, ps.postal_code, ps.province, ps.country,
    ps.contact_name, ps.contact_phone, ps.contact_email,
    ps.notes, ps.floor_area, ps.latitude, ps.longitude,
    (ps.id = v_default_site_id) AS is_default, ps.is_active,
    ps.planned_start_date, ps.planned_end_date, ps.planned_days,
    ps.actual_start_at, ps.actual_end_at, ps.site_status,
    (SELECT count(*) FROM projects.site_technician_assignments a WHERE a.site_id = ps.id)::BIGINT,
    (SELECT count(*) FROM projects.site_visits v WHERE v.site_id = ps.id)::BIGINT,
    ps.created_at, ps.updated_at,
    ps.client_order_number
  FROM projects.project_sites ps
  WHERE ps.project_id = p_project_id
  ORDER BY ps.is_active DESC, ps.site_name;
END;
$$;

GRANT ALL ON FUNCTION public.list_project_sites(uuid) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.create_project_site(uuid, text, text, text, text, text, text, double precision, double precision, text, text, text, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.create_project_site(
  p_project_id          uuid,
  p_site_name           text,
  p_address             text    DEFAULT NULL,
  p_city                text    DEFAULT NULL,
  p_postal_code         text    DEFAULT NULL,
  p_province            text    DEFAULT NULL,
  p_country             text    DEFAULT 'ES',
  p_latitude            double precision DEFAULT NULL,
  p_longitude           double precision DEFAULT NULL,
  p_contact_name        text    DEFAULT NULL,
  p_contact_phone       text    DEFAULT NULL,
  p_contact_email       text    DEFAULT NULL,
  p_site_reference      text    DEFAULT NULL,
  p_floor_area          text    DEFAULT NULL,
  p_notes               text    DEFAULT NULL,
  p_set_as_default      boolean DEFAULT false,
  p_client_order_number text    DEFAULT NULL
)
  RETURNS uuid
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE v_site_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM projects.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
  INSERT INTO projects.project_sites (
    project_id, site_name, address, city, postal_code, province, country,
    latitude, longitude, contact_name, contact_phone, contact_email,
    site_reference, floor_area, notes, client_order_number
  )
  VALUES (
    p_project_id, p_site_name, p_address, p_city, p_postal_code, p_province, p_country,
    p_latitude, p_longitude, p_contact_name, p_contact_phone, p_contact_email,
    p_site_reference, p_floor_area, p_notes, p_client_order_number
  )
  RETURNING id INTO v_site_id;
  IF p_set_as_default THEN
    UPDATE projects.projects SET default_site_id = v_site_id WHERE id = p_project_id;
  END IF;
  RETURN v_site_id;
END;
$$;

GRANT ALL ON FUNCTION public.create_project_site(uuid, text, text, text, text, text, text, double precision, double precision, text, text, text, text, text, text, boolean, text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.update_project_site(uuid, text, text, text, text, text, text, double precision, double precision, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.update_project_site(
  p_site_id              uuid,
  p_site_name            text    DEFAULT NULL,
  p_address              text    DEFAULT NULL,
  p_city                 text    DEFAULT NULL,
  p_postal_code          text    DEFAULT NULL,
  p_province             text    DEFAULT NULL,
  p_country              text    DEFAULT NULL,
  p_latitude             double precision DEFAULT NULL,
  p_longitude            double precision DEFAULT NULL,
  p_contact_name         text    DEFAULT NULL,
  p_contact_phone        text    DEFAULT NULL,
  p_contact_email        text    DEFAULT NULL,
  p_site_reference       text    DEFAULT NULL,
  p_floor_area           text    DEFAULT NULL,
  p_notes                text    DEFAULT NULL,
  p_client_order_number  text    DEFAULT NULL
)
  RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE projects.project_sites SET
    site_name           = COALESCE(p_site_name,    site_name),
    address             = COALESCE(p_address,       address),
    city                = COALESCE(p_city,          city),
    postal_code         = COALESCE(p_postal_code,   postal_code),
    province            = COALESCE(p_province,      province),
    country             = COALESCE(p_country,       country),
    latitude            = COALESCE(p_latitude,      latitude),
    longitude           = COALESCE(p_longitude,     longitude),
    contact_name        = COALESCE(p_contact_name,  contact_name),
    contact_phone       = COALESCE(p_contact_phone, contact_phone),
    contact_email       = COALESCE(p_contact_email, contact_email),
    site_reference      = COALESCE(p_site_reference, site_reference),
    floor_area          = COALESCE(p_floor_area,    floor_area),
    notes               = COALESCE(p_notes,         notes),
    client_order_number = CASE
      WHEN p_client_order_number IS NOT NULL THEN NULLIF(p_client_order_number, '')
      ELSE client_order_number
    END
  WHERE id = p_site_id;
  RETURN FOUND;
END;
$$;

GRANT ALL ON FUNCTION public.update_project_site(uuid, text, text, text, text, text, text, double precision, double precision, text, text, text, text, text, text, text) TO anon, authenticated, service_role;
