
-- =====================================================
-- Planning system: site lifecycle, assignments, visits
-- =====================================================

-- 1. Add planning fields to project_sites
ALTER TABLE projects.project_sites
  ADD COLUMN IF NOT EXISTS planned_start_date DATE,
  ADD COLUMN IF NOT EXISTS planned_end_date DATE,
  ADD COLUMN IF NOT EXISTS planned_days INTEGER,
  ADD COLUMN IF NOT EXISTS actual_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS site_status TEXT NOT NULL DEFAULT 'PLANNED';

-- Add check constraint for site_status
ALTER TABLE projects.project_sites
  ADD CONSTRAINT chk_site_status CHECK (
    site_status IN ('PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'READY_TO_INVOICE', 'INVOICED', 'CLOSED')
  );

-- 2. Create site_technician_assignments table
CREATE TABLE IF NOT EXISTS projects.site_technician_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES projects.project_sites(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL,
  role TEXT DEFAULT 'INSTALLER',
  date_from DATE,
  date_to DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE projects.site_technician_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_assignments_access" ON projects.site_technician_assignments
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Create site_visits table
CREATE TABLE IF NOT EXISTS projects.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES projects.project_sites(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE projects.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_visits_access" ON projects.site_visits
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_site_assignments_site ON projects.site_technician_assignments(site_id);
CREATE INDEX IF NOT EXISTS idx_site_assignments_tech ON projects.site_technician_assignments(technician_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_site ON projects.site_visits(site_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_tech ON projects.site_visits(technician_id);

-- =====================================================
-- RPCs for Planning
-- =====================================================

-- 5. update_site_planning
CREATE OR REPLACE FUNCTION public.update_site_planning(
  p_site_id UUID,
  p_planned_start_date DATE DEFAULT NULL,
  p_planned_days INTEGER DEFAULT NULL,
  p_planned_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
  v_user_id UUID;
  v_calc_end DATE;
  v_current_status TEXT;
  v_new_status TEXT;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());

  SELECT ps.site_status INTO v_current_status
  FROM projects.project_sites ps WHERE ps.id = p_site_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Site not found';
  END IF;

  -- Calculate end date from start + days
  IF p_planned_start_date IS NOT NULL AND p_planned_days IS NOT NULL AND p_planned_end_date IS NULL THEN
    v_calc_end := p_planned_start_date + (p_planned_days - 1);
  ELSE
    v_calc_end := p_planned_end_date;
  END IF;

  -- Determine status transition
  v_new_status := v_current_status;
  IF v_current_status = 'PLANNED' AND p_planned_start_date IS NOT NULL THEN
    v_new_status := 'SCHEDULED';
  END IF;

  UPDATE projects.project_sites
  SET
    planned_start_date = COALESCE(p_planned_start_date, planned_start_date),
    planned_days = COALESCE(p_planned_days, planned_days),
    planned_end_date = COALESCE(v_calc_end, planned_end_date),
    site_status = v_new_status,
    updated_at = now()
  WHERE id = p_site_id;

  RETURN json_build_object('status', v_new_status, 'planned_end_date', v_calc_end);
END;
$$;

-- 6. set_site_actual_dates
CREATE OR REPLACE FUNCTION public.set_site_actual_dates(
  p_site_id UUID,
  p_actual_start_at TIMESTAMPTZ DEFAULT NULL,
  p_actual_end_at TIMESTAMPTZ DEFAULT NULL,
  p_mark_ready_to_invoice BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
  v_new_status TEXT;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());

  SELECT ps.site_status INTO v_current_status
  FROM projects.project_sites ps WHERE ps.id = p_site_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Site not found';
  END IF;

  v_new_status := v_current_status;

  -- Start actual → IN_PROGRESS
  IF p_actual_start_at IS NOT NULL AND v_current_status IN ('PLANNED', 'SCHEDULED') THEN
    v_new_status := 'IN_PROGRESS';
  END IF;

  -- End actual + mark ready → READY_TO_INVOICE
  IF p_actual_end_at IS NOT NULL AND p_mark_ready_to_invoice AND v_current_status IN ('IN_PROGRESS', 'SCHEDULED') THEN
    v_new_status := 'READY_TO_INVOICE';
  END IF;

  UPDATE projects.project_sites
  SET
    actual_start_at = COALESCE(p_actual_start_at, actual_start_at),
    actual_end_at = COALESCE(p_actual_end_at, actual_end_at),
    site_status = v_new_status,
    updated_at = now()
  WHERE id = p_site_id;

  RETURN json_build_object('status', v_new_status);
END;
$$;

-- =====================================================
-- RPCs for Assignments
-- =====================================================

-- 7. list_site_assignments
CREATE OR REPLACE FUNCTION public.list_site_assignments(p_site_id UUID)
RETURNS TABLE(
  id UUID,
  site_id UUID,
  technician_id UUID,
  technician_name TEXT,
  technician_number TEXT,
  role TEXT,
  date_from DATE,
  date_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.site_id, a.technician_id,
    COALESCE(t.company_name, '')::TEXT AS technician_name,
    COALESCE(t.technician_number, '')::TEXT AS technician_number,
    a.role, a.date_from, a.date_to, a.notes, a.created_at
  FROM projects.site_technician_assignments a
  LEFT JOIN workers.technicians t ON t.id = a.technician_id
  WHERE a.site_id = p_site_id
  ORDER BY a.date_from NULLS LAST, a.created_at;
END;
$$;

-- 8. upsert_site_assignment
CREATE OR REPLACE FUNCTION public.upsert_site_assignment(
  p_site_id UUID,
  p_technician_id UUID,
  p_role TEXT DEFAULT 'INSTALLER',
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_assignment_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
  v_user_id UUID;
  v_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());

  IF p_assignment_id IS NOT NULL THEN
    UPDATE projects.site_technician_assignments
    SET technician_id = p_technician_id,
        role = COALESCE(p_role, role),
        date_from = p_date_from,
        date_to = p_date_to,
        notes = p_notes,
        updated_at = now()
    WHERE id = p_assignment_id
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO projects.site_technician_assignments (site_id, technician_id, role, date_from, date_to, notes, created_by)
    VALUES (p_site_id, p_technician_id, COALESCE(p_role, 'INSTALLER'), p_date_from, p_date_to, p_notes, v_user_id)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- 9. delete_site_assignment
CREATE OR REPLACE FUNCTION public.delete_site_assignment(p_assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
BEGIN
  DELETE FROM projects.site_technician_assignments WHERE id = p_assignment_id;
  RETURN FOUND;
END;
$$;

-- =====================================================
-- RPCs for Visits
-- =====================================================

-- 10. list_site_visits
CREATE OR REPLACE FUNCTION public.list_site_visits(p_site_id UUID)
RETURNS TABLE(
  id UUID,
  site_id UUID,
  technician_id UUID,
  technician_name TEXT,
  technician_number TEXT,
  visit_date DATE,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, v.site_id, v.technician_id,
    COALESCE(t.company_name, '')::TEXT AS technician_name,
    COALESCE(t.technician_number, '')::TEXT AS technician_number,
    v.visit_date, v.check_in_at, v.check_out_at, v.notes, v.created_at
  FROM projects.site_visits v
  LEFT JOIN workers.technicians t ON t.id = v.technician_id
  WHERE v.site_id = p_site_id
  ORDER BY v.visit_date DESC, v.check_in_at DESC;
END;
$$;

-- 11. register_site_visit
CREATE OR REPLACE FUNCTION public.register_site_visit(
  p_site_id UUID,
  p_technician_id UUID,
  p_visit_date DATE DEFAULT NULL,
  p_check_in_at TIMESTAMPTZ DEFAULT NULL,
  p_check_out_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
  v_user_id UUID;
  v_id UUID;
  v_current_status TEXT;
  v_has_actual_start BOOLEAN;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());

  -- Insert visit
  INSERT INTO projects.site_visits (site_id, technician_id, visit_date, check_in_at, check_out_at, notes, created_by)
  VALUES (p_site_id, p_technician_id, COALESCE(p_visit_date, CURRENT_DATE), p_check_in_at, p_check_out_at, p_notes, v_user_id)
  RETURNING id INTO v_id;

  -- Auto-transition: first visit → IN_PROGRESS + set actual_start_at
  SELECT ps.site_status, (ps.actual_start_at IS NOT NULL)
  INTO v_current_status, v_has_actual_start
  FROM projects.project_sites ps WHERE ps.id = p_site_id;

  IF v_current_status IN ('PLANNED', 'SCHEDULED') THEN
    UPDATE projects.project_sites
    SET site_status = 'IN_PROGRESS',
        actual_start_at = COALESCE(actual_start_at, COALESCE(p_check_in_at, now())),
        updated_at = now()
    WHERE id = p_site_id;
  END IF;

  RETURN v_id;
END;
$$;

-- 12. close_site_visit
CREATE OR REPLACE FUNCTION public.close_site_visit(
  p_visit_id UUID,
  p_check_out_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
BEGIN
  UPDATE projects.site_visits
  SET check_out_at = COALESCE(p_check_out_at, now()),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_visit_id AND check_out_at IS NULL;

  RETURN FOUND;
END;
$$;

-- =====================================================
-- Trigger: Auto-update site_status on invoice status change
-- =====================================================

-- 13. Trigger function for invoice status changes affecting site_status
CREATE OR REPLACE FUNCTION internal.update_site_status_on_invoice_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
DECLARE
  v_site_id UUID;
  v_current_site_status TEXT;
BEGIN
  v_site_id := NEW.site_id;

  -- Only proceed if invoice has a site_id
  IF v_site_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get current site status
  SELECT ps.site_status INTO v_current_site_status
  FROM projects.project_sites ps WHERE ps.id = v_site_id;

  IF v_current_site_status IS NULL THEN
    RETURN NEW;
  END IF;

  -- ISSUED → INVOICED (if site is READY_TO_INVOICE or IN_PROGRESS)
  IF NEW.status = 'ISSUED' AND OLD.status IS DISTINCT FROM 'ISSUED' THEN
    IF v_current_site_status IN ('READY_TO_INVOICE', 'IN_PROGRESS') THEN
      UPDATE projects.project_sites
      SET site_status = 'INVOICED', updated_at = now()
      WHERE id = v_site_id;
    END IF;
  END IF;

  -- Check if fully paid → CLOSED
  IF NEW.paid_amount >= NEW.total AND NEW.total > 0 AND OLD.paid_amount < OLD.total THEN
    IF v_current_site_status IN ('INVOICED', 'READY_TO_INVOICE') THEN
      UPDATE projects.project_sites
      SET site_status = 'CLOSED', updated_at = now()
      WHERE id = v_site_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on sales.invoices
DROP TRIGGER IF EXISTS trg_invoice_site_status ON sales.invoices;
CREATE TRIGGER trg_invoice_site_status
  AFTER UPDATE ON sales.invoices
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_site_status_on_invoice_change();

-- =====================================================
-- Update list_project_sites to return planning fields
-- =====================================================

DROP FUNCTION IF EXISTS public.list_project_sites(UUID);
CREATE FUNCTION public.list_project_sites(p_project_id UUID)
RETURNS TABLE(
  id UUID,
  project_id UUID,
  site_name TEXT,
  site_reference TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  province TEXT,
  country TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  floor_area TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN,
  is_active BOOLEAN,
  planned_start_date DATE,
  planned_end_date DATE,
  planned_days INTEGER,
  actual_start_at TIMESTAMPTZ,
  actual_end_at TIMESTAMPTZ,
  site_status TEXT,
  assignment_count BIGINT,
  visit_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id, ps.project_id, ps.site_name, ps.site_reference,
    ps.address, ps.city, ps.postal_code, ps.province, ps.country,
    ps.contact_name, ps.contact_phone, ps.contact_email,
    ps.notes, ps.floor_area, ps.latitude, ps.longitude,
    ps.is_default, ps.is_active,
    ps.planned_start_date, ps.planned_end_date, ps.planned_days,
    ps.actual_start_at, ps.actual_end_at, ps.site_status,
    (SELECT count(*) FROM projects.site_technician_assignments a WHERE a.site_id = ps.id)::BIGINT AS assignment_count,
    (SELECT count(*) FROM projects.site_visits v WHERE v.site_id = ps.id)::BIGINT AS visit_count,
    ps.created_at, ps.updated_at
  FROM projects.project_sites ps
  WHERE ps.project_id = p_project_id
  ORDER BY ps.is_default DESC, ps.is_active DESC, ps.site_name;
END;
$$;
