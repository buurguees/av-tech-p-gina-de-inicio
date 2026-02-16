
-- Fix list_project_sites: remove reference to non-existent is_default column
CREATE OR REPLACE FUNCTION public.list_project_sites(p_project_id UUID)
RETURNS TABLE(
  id UUID, project_id UUID, site_name TEXT, site_reference TEXT,
  address TEXT, city TEXT, postal_code TEXT, province TEXT, country TEXT,
  contact_name TEXT, contact_phone TEXT, contact_email TEXT,
  notes TEXT, floor_area TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
  is_default BOOLEAN, is_active BOOLEAN,
  planned_start_date DATE, planned_end_date DATE, planned_days INT,
  actual_start_at TIMESTAMPTZ, actual_end_at TIMESTAMPTZ, site_status TEXT,
  assignment_count BIGINT, visit_count BIGINT,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id, ps.project_id, ps.site_name, ps.site_reference,
    ps.address, ps.city, ps.postal_code, ps.province, ps.country,
    ps.contact_name, ps.contact_phone, ps.contact_email,
    ps.notes, ps.floor_area, ps.latitude, ps.longitude,
    FALSE AS is_default, ps.is_active,
    ps.planned_start_date, ps.planned_end_date, ps.planned_days,
    ps.actual_start_at, ps.actual_end_at, ps.site_status,
    (SELECT count(*) FROM projects.site_technician_assignments a WHERE a.site_id = ps.id)::BIGINT AS assignment_count,
    (SELECT count(*) FROM projects.site_visits v WHERE v.site_id = ps.id)::BIGINT AS visit_count,
    ps.created_at, ps.updated_at
  FROM projects.project_sites ps
  WHERE ps.project_id = p_project_id
  ORDER BY ps.is_active DESC, ps.site_name;
END;
$$;

-- Fix notifications_refresh_for_user: replace ps.status with ps.site_status
CREATE OR REPLACE FUNCTION public.notifications_refresh_for_user(p_user_id UUID DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID; v_count INT := 0; v_today DATE := CURRENT_DATE;
  v_dedupe TEXT; v_roles TEXT[]; v_is_admin BOOLEAN; v_is_manager BOOLEAN; rec RECORD;
BEGIN
  v_user_id := COALESCE(p_user_id, internal.get_authorized_user_id(auth.uid()));
  IF v_user_id IS NULL THEN RETURN 0; END IF;

  SELECT array_agg(ur.role::TEXT) INTO v_roles
  FROM public.user_roles ur
  WHERE ur.user_id = (SELECT auth_user_id FROM internal.authorized_users WHERE id = v_user_id);

  v_is_admin := 'admin' = ANY(COALESCE(v_roles, ARRAY[]::TEXT[]));
  v_is_manager := 'manager' = ANY(COALESCE(v_roles, ARRAY[]::TEXT[]));

  -- Sites starting today (manager/admin)
  IF v_is_admin OR v_is_manager THEN
    FOR rec IN
      SELECT ps.id AS site_id, ps.site_name, pp.project_name, pp.id AS proj_id
      FROM projects.project_sites ps
      JOIN projects.projects pp ON pp.id = ps.project_id
      WHERE ps.planned_start_date = v_today AND ps.site_status NOT IN ('COMPLETED', 'ARCHIVED', 'CANCELLED')
    LOOP
      v_dedupe := v_user_id || ':SITE_STARTS_TODAY:' || rec.site_id || ':' || v_today;
      INSERT INTO internal.user_notifications (user_id, type, severity, title, message, action_url, entity_type, entity_id, dedupe_key)
      VALUES (v_user_id, 'SITE_STARTS_TODAY', 'INFO', 'Site empieza hoy: ' || rec.site_name,
        'El site "' || rec.site_name || '" del proyecto "' || rec.project_name || '" comienza hoy.',
        '/projects/' || rec.proj_id || '/sites/' || rec.site_id, 'site', rec.site_id, v_dedupe)
      ON CONFLICT (dedupe_key) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;

  -- Sites ready to invoice (admin/manager)
  IF v_is_admin OR v_is_manager THEN
    FOR rec IN
      SELECT ps.id AS site_id, ps.site_name, pp.project_name, pp.id AS proj_id
      FROM projects.project_sites ps
      JOIN projects.projects pp ON pp.id = ps.project_id
      WHERE ps.site_status = 'READY_TO_INVOICE'
    LOOP
      v_dedupe := v_user_id || ':SITE_READY_INVOICE:' || rec.site_id || ':' || v_today;
      INSERT INTO internal.user_notifications (user_id, type, severity, title, message, action_url, entity_type, entity_id, dedupe_key)
      VALUES (v_user_id, 'SITE_READY_INVOICE', 'WARNING', 'Site listo para facturar: ' || rec.site_name,
        'El site "' || rec.site_name || '" está listo para facturar.',
        '/projects/' || rec.proj_id || '/sites/' || rec.site_id, 'site', rec.site_id, v_dedupe)
      ON CONFLICT (dedupe_key) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;

  -- Overdue invoices (admin)
  IF v_is_admin THEN
    FOR rec IN
      SELECT i.id AS inv_id, i.invoice_number, i.due_date, i.pending_amount
      FROM sales.invoices i
      WHERE i.status IN ('ISSUED', 'PARTIAL') AND i.due_date < v_today AND i.pending_amount > 0
    LOOP
      v_dedupe := v_user_id || ':INVOICE_OVERDUE:' || rec.inv_id || ':' || v_today;
      INSERT INTO internal.user_notifications (user_id, type, severity, title, message, action_url, entity_type, entity_id, dedupe_key)
      VALUES (v_user_id, 'INVOICE_OVERDUE', 'CRITICAL', 'Factura vencida: ' || rec.invoice_number,
        'Factura ' || rec.invoice_number || ' venció el ' || rec.due_date || '. Pendiente: ' || rec.pending_amount || '€',
        '/invoices/' || rec.inv_id, 'invoice', rec.inv_id, v_dedupe)
      ON CONFLICT (dedupe_key) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;

  -- Invoices due in 7 days (admin)
  IF v_is_admin THEN
    FOR rec IN
      SELECT i.id AS inv_id, i.invoice_number, i.due_date, i.pending_amount
      FROM sales.invoices i
      WHERE i.status IN ('ISSUED', 'PARTIAL') AND i.due_date BETWEEN v_today AND v_today + 7 AND i.pending_amount > 0
    LOOP
      v_dedupe := v_user_id || ':INVOICE_DUE_SOON:' || rec.inv_id || ':' || v_today;
      INSERT INTO internal.user_notifications (user_id, type, severity, title, message, action_url, entity_type, entity_id, dedupe_key)
      VALUES (v_user_id, 'INVOICE_DUE_SOON', 'WARNING', 'Factura próxima a vencer: ' || rec.invoice_number,
        'Factura ' || rec.invoice_number || ' vence el ' || rec.due_date || '. Pendiente: ' || rec.pending_amount || '€',
        '/invoices/' || rec.inv_id, 'invoice', rec.inv_id, v_dedupe)
      ON CONFLICT (dedupe_key) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;

  RETURN v_count;
END;
$$;
