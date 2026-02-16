
-- ============================================
-- FEATURE: Project Sites (SINGLE_SITE / MULTI_SITE)
-- ============================================

-- 1) Enum
DO $$ BEGIN
  CREATE TYPE projects.site_mode AS ENUM ('SINGLE_SITE', 'MULTI_SITE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Columns on projects
ALTER TABLE projects.projects
  ADD COLUMN IF NOT EXISTS site_mode projects.site_mode NOT NULL DEFAULT 'SINGLE_SITE',
  ADD COLUMN IF NOT EXISTS default_site_id UUID NULL;

-- 3) project_sites table
CREATE TABLE IF NOT EXISTS projects.project_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  address TEXT, city TEXT, postal_code TEXT, province TEXT,
  country TEXT DEFAULT 'ES',
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
  contact_name TEXT, contact_phone TEXT, contact_email TEXT,
  site_reference TEXT, floor_area TEXT, notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_sites_project_id ON projects.project_sites(project_id);

DO $$ BEGIN
  ALTER TABLE projects.projects ADD CONSTRAINT fk_projects_default_site
    FOREIGN KEY (default_site_id) REFERENCES projects.project_sites(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4) site_id on documents
ALTER TABLE quotes.quotes ADD COLUMN IF NOT EXISTS site_id UUID NULL REFERENCES projects.project_sites(id) ON DELETE SET NULL;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS site_id UUID NULL REFERENCES projects.project_sites(id) ON DELETE SET NULL;
ALTER TABLE sales.purchase_orders ADD COLUMN IF NOT EXISTS site_id UUID NULL REFERENCES projects.project_sites(id) ON DELETE SET NULL;
ALTER TABLE sales.purchase_invoices ADD COLUMN IF NOT EXISTS site_id UUID NULL REFERENCES projects.project_sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_site_id ON quotes.quotes(site_id);
CREATE INDEX IF NOT EXISTS idx_invoices_site_id ON sales.invoices(site_id);
CREATE INDEX IF NOT EXISTS idx_po_site_id ON sales.purchase_orders(site_id);
CREATE INDEX IF NOT EXISTS idx_pi_site_id ON sales.purchase_invoices(site_id);

-- 5) RLS
ALTER TABLE projects.project_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_sites_select_auth" ON projects.project_sites FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "project_sites_insert_auth" ON projects.project_sites FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "project_sites_update_auth" ON projects.project_sites FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "project_sites_delete_admin" ON projects.project_sites FOR DELETE USING (internal.is_admin() OR internal.is_manager());

-- 6) updated_at trigger
CREATE OR REPLACE FUNCTION projects.update_project_sites_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_project_sites_updated_at BEFORE UPDATE ON projects.project_sites
  FOR EACH ROW EXECUTE FUNCTION projects.update_project_sites_updated_at();

-- 7) Migrate existing projects
DO $$
DECLARE proj RECORD; new_site_id UUID;
BEGIN
  FOR proj IN SELECT id, project_name, project_city, local_name FROM projects.projects WHERE default_site_id IS NULL
  LOOP
    new_site_id := gen_random_uuid();
    INSERT INTO projects.project_sites (id, project_id, site_name, city)
    VALUES (new_site_id, proj.id, COALESCE(proj.local_name, proj.project_name, 'Sitio Principal'), proj.project_city);
    UPDATE projects.projects SET default_site_id = new_site_id, site_mode = 'SINGLE_SITE' WHERE id = proj.id;
    UPDATE quotes.quotes SET site_id = new_site_id WHERE project_id = proj.id AND site_id IS NULL;
    UPDATE sales.invoices SET site_id = new_site_id WHERE project_id = proj.id AND site_id IS NULL;
    UPDATE sales.purchase_orders SET site_id = new_site_id WHERE project_id = proj.id AND site_id IS NULL;
    UPDATE sales.purchase_invoices SET site_id = new_site_id WHERE project_id = proj.id AND site_id IS NULL;
  END LOOP;
END $$;

-- ============================================
-- RPCs - Drop existing first to change return types
-- ============================================

DROP FUNCTION IF EXISTS public.get_project(UUID);
DROP FUNCTION IF EXISTS public.create_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_project(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- list_project_sites
CREATE OR REPLACE FUNCTION public.list_project_sites(p_project_id UUID)
RETURNS TABLE(
  id UUID, project_id UUID, site_name TEXT,
  address TEXT, city TEXT, postal_code TEXT, province TEXT, country TEXT,
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
  contact_name TEXT, contact_phone TEXT, contact_email TEXT,
  site_reference TEXT, floor_area TEXT, notes TEXT,
  is_active BOOLEAN, is_default BOOLEAN,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'projects' AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  RETURN QUERY
  SELECT ps.id, ps.project_id, ps.site_name,
    ps.address, ps.city, ps.postal_code, ps.province, ps.country,
    ps.latitude, ps.longitude, ps.contact_name, ps.contact_phone, ps.contact_email,
    ps.site_reference, ps.floor_area, ps.notes, ps.is_active,
    (ps.id = p.default_site_id) AS is_default, ps.created_at, ps.updated_at
  FROM projects.project_sites ps
  JOIN projects.projects p ON p.id = ps.project_id
  WHERE ps.project_id = p_project_id
  ORDER BY (ps.id = p.default_site_id) DESC, ps.created_at ASC;
END; $fn$;

-- create_project_site
CREATE OR REPLACE FUNCTION public.create_project_site(
  p_project_id UUID, p_site_name TEXT,
  p_address TEXT DEFAULT NULL, p_city TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL, p_province TEXT DEFAULT NULL,
  p_country TEXT DEFAULT 'ES',
  p_latitude DOUBLE PRECISION DEFAULT NULL, p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_contact_name TEXT DEFAULT NULL, p_contact_phone TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_site_reference TEXT DEFAULT NULL, p_floor_area TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL, p_set_as_default BOOLEAN DEFAULT FALSE
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'projects' AS $fn$
DECLARE v_site_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM projects.projects WHERE id = p_project_id) THEN RAISE EXCEPTION 'Project not found'; END IF;
  INSERT INTO projects.project_sites (project_id, site_name, address, city, postal_code, province, country,
    latitude, longitude, contact_name, contact_phone, contact_email, site_reference, floor_area, notes)
  VALUES (p_project_id, p_site_name, p_address, p_city, p_postal_code, p_province, p_country,
    p_latitude, p_longitude, p_contact_name, p_contact_phone, p_contact_email, p_site_reference, p_floor_area, p_notes)
  RETURNING id INTO v_site_id;
  IF p_set_as_default THEN UPDATE projects.projects SET default_site_id = v_site_id WHERE id = p_project_id; END IF;
  RETURN v_site_id;
END; $fn$;

-- update_project_site
CREATE OR REPLACE FUNCTION public.update_project_site(
  p_site_id UUID, p_site_name TEXT DEFAULT NULL, p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL, p_postal_code TEXT DEFAULT NULL, p_province TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL, p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL, p_contact_name TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL, p_contact_email TEXT DEFAULT NULL,
  p_site_reference TEXT DEFAULT NULL, p_floor_area TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'projects' AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE projects.project_sites SET
    site_name = COALESCE(p_site_name, site_name), address = COALESCE(p_address, address),
    city = COALESCE(p_city, city), postal_code = COALESCE(p_postal_code, postal_code),
    province = COALESCE(p_province, province), country = COALESCE(p_country, country),
    latitude = COALESCE(p_latitude, latitude), longitude = COALESCE(p_longitude, longitude),
    contact_name = COALESCE(p_contact_name, contact_name), contact_phone = COALESCE(p_contact_phone, contact_phone),
    contact_email = COALESCE(p_contact_email, contact_email), site_reference = COALESCE(p_site_reference, site_reference),
    floor_area = COALESCE(p_floor_area, floor_area), notes = COALESCE(p_notes, notes)
  WHERE id = p_site_id;
  RETURN FOUND;
END; $fn$;

-- set_default_project_site
CREATE OR REPLACE FUNCTION public.set_default_project_site(p_project_id UUID, p_site_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'projects' AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM projects.project_sites WHERE id = p_site_id AND project_id = p_project_id) THEN
    RAISE EXCEPTION 'Site does not belong to this project';
  END IF;
  UPDATE projects.projects SET default_site_id = p_site_id WHERE id = p_project_id;
  RETURN FOUND;
END; $fn$;

-- archive_project_site
CREATE OR REPLACE FUNCTION public.archive_project_site(p_site_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'projects' AS $fn$
DECLARE v_project_id UUID; v_is_default BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT ps.project_id, (p.default_site_id = ps.id) INTO v_project_id, v_is_default
  FROM projects.project_sites ps JOIN projects.projects p ON p.id = ps.project_id WHERE ps.id = p_site_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Site not found'; END IF;
  IF (SELECT COUNT(*) FROM projects.project_sites WHERE project_id = v_project_id AND is_active = TRUE) <= 1 THEN
    RAISE EXCEPTION 'Cannot archive the last active site';
  END IF;
  UPDATE projects.project_sites SET is_active = FALSE WHERE id = p_site_id;
  IF v_is_default THEN
    UPDATE projects.projects SET default_site_id = (
      SELECT id FROM projects.project_sites WHERE project_id = v_project_id AND is_active = TRUE AND id != p_site_id
      ORDER BY created_at ASC LIMIT 1
    ) WHERE id = v_project_id;
  END IF;
  RETURN TRUE;
END; $fn$;

-- get_project (new signature with site info)
CREATE OR REPLACE FUNCTION public.get_project(p_project_id UUID)
RETURNS TABLE(
  id UUID, client_id UUID, client_name TEXT, client_order_number TEXT,
  created_at TIMESTAMPTZ, created_by UUID, created_by_name TEXT,
  local_name TEXT, notes TEXT, project_address TEXT, project_city TEXT,
  project_name TEXT, project_number TEXT, quote_id UUID, status TEXT,
  updated_at TIMESTAMPTZ,
  site_mode TEXT, default_site_id UUID,
  default_site_name TEXT, default_site_address TEXT, default_site_city TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'projects', 'internal' AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  RETURN QUERY
  SELECT p.id, p.client_id, c.company_name, p.client_order_number,
    p.created_at, p.created_by, COALESCE(au.full_name, ''),
    p.local_name, p.description, ''::TEXT, p.project_city,
    p.project_name, p.project_number, p.quote_id, p.status::TEXT,
    p.updated_at,
    p.site_mode::TEXT, p.default_site_id,
    ps.site_name, ps.address, ps.city
  FROM projects.projects p
  LEFT JOIN crm.clients c ON c.id = p.client_id
  LEFT JOIN internal.authorized_users au ON au.id = p.created_by
  LEFT JOIN projects.project_sites ps ON ps.id = p.default_site_id
  WHERE p.id = p_project_id;
END; $fn$;

-- create_project (new signature with site_mode)
CREATE OR REPLACE FUNCTION public.create_project(
  p_client_id UUID, p_client_order_number TEXT DEFAULT NULL,
  p_local_name TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL,
  p_project_address TEXT DEFAULT NULL, p_project_city TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'NEGOTIATION',
  p_site_mode TEXT DEFAULT 'SINGLE_SITE', p_site_name TEXT DEFAULT NULL
) RETURNS TABLE(project_id UUID, project_name TEXT, project_number TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'projects', 'internal', 'crm' AS $fn$
DECLARE
  v_user_id UUID; v_project_id UUID; v_project_number TEXT;
  v_project_name TEXT; v_client_name TEXT; v_site_id UUID;
  v_site_mode projects.site_mode;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  BEGIN v_site_mode := p_site_mode::projects.site_mode;
  EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Invalid site_mode'; END;
  SELECT company_name INTO v_client_name FROM crm.clients WHERE id = p_client_id;
  IF v_client_name IS NULL THEN RAISE EXCEPTION 'Client not found'; END IF;
  v_project_number := projects.generate_project_number();
  v_project_name := v_project_number || ' - ' || v_client_name;
  IF p_client_order_number IS NOT NULL AND p_client_order_number != '' THEN v_project_name := v_project_name || ' - ' || p_client_order_number; END IF;
  IF p_project_city IS NOT NULL AND p_project_city != '' THEN v_project_name := v_project_name || ' - ' || p_project_city; END IF;
  IF p_local_name IS NOT NULL AND p_local_name != '' THEN v_project_name := v_project_name || ' - ' || p_local_name; END IF;
  INSERT INTO projects.projects (project_number, project_name, client_id, client_order_number,
    local_name, description, project_city, status, created_by, site_mode)
  VALUES (v_project_number, v_project_name, p_client_id, p_client_order_number,
    p_local_name, p_notes, p_project_city, p_status::projects.project_status, v_user_id, v_site_mode)
  RETURNING id INTO v_project_id;
  v_site_id := gen_random_uuid();
  INSERT INTO projects.project_sites (id, project_id, site_name, city)
  VALUES (v_site_id, v_project_id, COALESCE(NULLIF(p_site_name, ''), COALESCE(p_local_name, 'Sitio Principal')), p_project_city);
  UPDATE projects.projects SET default_site_id = v_site_id WHERE id = v_project_id;
  RETURN QUERY SELECT v_project_id, v_project_name, v_project_number;
END; $fn$;

-- update_project (new signature with site_mode)
CREATE OR REPLACE FUNCTION public.update_project(
  p_project_id UUID, p_client_order_number TEXT DEFAULT NULL,
  p_local_name TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL,
  p_project_address TEXT DEFAULT NULL, p_project_city TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL, p_site_mode TEXT DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'projects' AS $fn$
DECLARE v_current_mode projects.site_mode; v_new_mode projects.site_mode; v_site_count INT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_site_mode IS NOT NULL THEN
    SELECT site_mode INTO v_current_mode FROM projects.projects WHERE id = p_project_id;
    BEGIN v_new_mode := p_site_mode::projects.site_mode;
    EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Invalid site_mode'; END;
    IF v_current_mode = 'MULTI_SITE' AND v_new_mode = 'SINGLE_SITE' THEN
      SELECT COUNT(*) INTO v_site_count FROM projects.project_sites WHERE project_id = p_project_id AND is_active = TRUE;
      IF v_site_count > 1 THEN RAISE EXCEPTION 'Cannot change to SINGLE_SITE: % active sites', v_site_count; END IF;
    END IF;
  END IF;
  UPDATE projects.projects SET
    client_order_number = COALESCE(p_client_order_number, client_order_number),
    local_name = COALESCE(p_local_name, local_name),
    description = COALESCE(p_notes, description),
    project_city = COALESCE(p_project_city, project_city),
    status = COALESCE(p_status::projects.project_status, status),
    site_mode = COALESCE(v_new_mode, site_mode)
  WHERE id = p_project_id;
  RETURN FOUND;
END; $fn$;
