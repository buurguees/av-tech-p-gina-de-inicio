
-- ═══════════════════════════════════════════════════════
-- 1. CHECK CONSTRAINTS on project_sites for data integrity
-- ═══════════════════════════════════════════════════════

-- planned_days >= 0
ALTER TABLE projects.project_sites
  ADD CONSTRAINT chk_planned_days_non_negative
  CHECK (planned_days IS NULL OR planned_days >= 0);

-- If planned_start_date set, planned_end_date must also be set
-- (we allow end without start for flexibility, but not start without end after planning)
-- Actually: if planned_end_date is set, it must be >= planned_start_date
ALTER TABLE projects.project_sites
  ADD CONSTRAINT chk_planned_dates_order
  CHECK (
    planned_start_date IS NULL
    OR planned_end_date IS NULL
    OR planned_end_date >= planned_start_date
  );

-- If actual_end_at set, actual_start_at must be set and end >= start
ALTER TABLE projects.project_sites
  ADD CONSTRAINT chk_actual_dates_order
  CHECK (
    actual_end_at IS NULL
    OR (actual_start_at IS NOT NULL AND actual_end_at >= actual_start_at)
  );

-- ═══════════════════════════════════════════════════════
-- 2. Unique open visit per technician+site
-- ═══════════════════════════════════════════════════════
CREATE UNIQUE INDEX uq_one_open_visit_per_tech_site
  ON projects.site_visits (technician_id, site_id)
  WHERE check_out_at IS NULL;

-- ═══════════════════════════════════════════════════════
-- 3. Trigger to block planning edits on INVOICED/CLOSED sites
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION projects.trg_block_locked_site_edits()
RETURNS TRIGGER AS $$
BEGIN
  -- If site is INVOICED or CLOSED, block changes to planning/execution fields
  IF OLD.site_status IN ('INVOICED', 'CLOSED') THEN
    -- Allow only notes and is_active changes
    IF (
      NEW.planned_start_date IS DISTINCT FROM OLD.planned_start_date OR
      NEW.planned_end_date IS DISTINCT FROM OLD.planned_end_date OR
      NEW.planned_days IS DISTINCT FROM OLD.planned_days OR
      NEW.actual_start_at IS DISTINCT FROM OLD.actual_start_at OR
      NEW.actual_end_at IS DISTINCT FROM OLD.actual_end_at
    ) THEN
      RAISE EXCEPTION 'No se pueden modificar fechas de un sitio en estado %', OLD.site_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_site_lock_check
  BEFORE UPDATE ON projects.project_sites
  FOR EACH ROW
  EXECUTE FUNCTION projects.trg_block_locked_site_edits();

-- ═══════════════════════════════════════════════════════
-- 4. RPC: Get site financial totals (quotes + invoices)
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_site_financials(p_site_id UUID)
RETURNS TABLE(
  quoted_total NUMERIC,
  quoted_count INTEGER,
  invoiced_total NUMERIC,
  invoiced_count INTEGER,
  paid_total NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((
      SELECT SUM(q.total) FROM sales.quotes q WHERE q.site_id = p_site_id AND q.status NOT IN ('REJECTED','EXPIRED')
    ), 0)::NUMERIC AS quoted_total,
    COALESCE((
      SELECT COUNT(*)::INTEGER FROM sales.quotes q WHERE q.site_id = p_site_id AND q.status NOT IN ('REJECTED','EXPIRED')
    ), 0)::INTEGER AS quoted_count,
    COALESCE((
      SELECT SUM(i.total) FROM sales.invoices i WHERE i.site_id = p_site_id AND i.doc_status != 'CANCELLED'
    ), 0)::NUMERIC AS invoiced_total,
    COALESCE((
      SELECT COUNT(*)::INTEGER FROM sales.invoices i WHERE i.site_id = p_site_id AND i.doc_status != 'CANCELLED'
    ), 0)::INTEGER AS invoiced_count,
    COALESCE((
      SELECT SUM(ip.amount) FROM sales.invoice_payments ip
      JOIN sales.invoices i ON i.id = ip.invoice_id
      WHERE i.site_id = p_site_id AND i.doc_status != 'CANCELLED'
    ), 0)::NUMERIC AS paid_total;
END;
$$;

-- ═══════════════════════════════════════════════════════
-- 5. RPC: Suggest project status based on site states
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_suggested_project_status(p_project_id UUID)
RETURNS TABLE(
  suggested_status TEXT,
  reason TEXT,
  site_summary JSONB
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total INTEGER;
  v_closed INTEGER;
  v_invoiced INTEGER;
  v_in_progress INTEGER;
  v_ready INTEGER;
  v_scheduled INTEGER;
  v_planned INTEGER;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE ps.site_status = 'CLOSED'),
    COUNT(*) FILTER (WHERE ps.site_status = 'INVOICED'),
    COUNT(*) FILTER (WHERE ps.site_status = 'IN_PROGRESS'),
    COUNT(*) FILTER (WHERE ps.site_status = 'READY_TO_INVOICE'),
    COUNT(*) FILTER (WHERE ps.site_status = 'SCHEDULED'),
    COUNT(*) FILTER (WHERE ps.site_status = 'PLANNED')
  INTO v_total, v_closed, v_invoiced, v_in_progress, v_ready, v_scheduled, v_planned
  FROM projects.project_sites ps
  WHERE ps.project_id = p_project_id AND ps.is_active = true;

  IF v_total = 0 THEN
    RETURN QUERY SELECT 'NEGOTIATION'::TEXT, 'Sin sitios activos'::TEXT,
      jsonb_build_object('total', 0);
    RETURN;
  END IF;

  -- All closed
  IF v_closed = v_total THEN
    RETURN QUERY SELECT 'CLOSED'::TEXT, 'Todos los sitios están cerrados'::TEXT,
      jsonb_build_object('total', v_total, 'closed', v_closed);
    RETURN;
  END IF;

  -- All invoiced or closed
  IF (v_invoiced + v_closed) = v_total THEN
    RETURN QUERY SELECT 'INVOICED'::TEXT, 'Todos los sitios facturados o cerrados'::TEXT,
      jsonb_build_object('total', v_total, 'invoiced', v_invoiced, 'closed', v_closed);
    RETURN;
  END IF;

  -- All completed (ready + invoiced + closed)
  IF (v_ready + v_invoiced + v_closed) = v_total THEN
    RETURN QUERY SELECT 'COMPLETED'::TEXT, 'Todos los sitios listos para facturar o ya facturados'::TEXT,
      jsonb_build_object('total', v_total, 'ready', v_ready, 'invoiced', v_invoiced, 'closed', v_closed);
    RETURN;
  END IF;

  -- Any in progress or ready
  IF v_in_progress > 0 OR v_ready > 0 THEN
    RETURN QUERY SELECT 'IN_PROGRESS'::TEXT,
      format('%s sitio(s) en ejecución, %s listo(s) para facturar', v_in_progress, v_ready)::TEXT,
      jsonb_build_object('total', v_total, 'in_progress', v_in_progress, 'ready', v_ready, 'invoiced', v_invoiced, 'closed', v_closed);
    RETURN;
  END IF;

  -- All planned/scheduled
  RETURN QUERY SELECT 'NEGOTIATION'::TEXT,
    format('%s sitio(s) planificados, %s programados', v_planned, v_scheduled)::TEXT,
    jsonb_build_object('total', v_total, 'planned', v_planned, 'scheduled', v_scheduled);
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.get_site_financials(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suggested_project_status(UUID) TO authenticated;
