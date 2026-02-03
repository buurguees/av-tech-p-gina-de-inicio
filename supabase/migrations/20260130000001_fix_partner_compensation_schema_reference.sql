-- =====================================================
-- FIX: Corregir referencia de esquema para partner_compensation_runs
-- La tabla está en accounting, no en internal
-- =====================================================

CREATE OR REPLACE FUNCTION accounting.check_month_closure_readiness(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE(
  check_name TEXT,
  passed BOOLEAN,
  detail TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'accounting', 'sales', 'internal'
AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_count INTEGER;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + interval '1 month' - interval '1 day')::date;

  -- Ventas: no existen facturas con issue_date en período en DRAFT o CANCELLED
  SELECT COUNT(*) INTO v_count
  FROM sales.invoices
  WHERE issue_date >= v_start AND issue_date <= v_end
    AND status IN ('DRAFT', 'CANCELLED');

  check_name := 'ventas_no_pendientes';
  passed := (v_count = 0);
  detail := CASE WHEN v_count > 0 THEN v_count::text || ' factura(s) en DRAFT/CANCELLED' ELSE 'OK' END;
  RETURN NEXT;

  -- Compras: no existen facturas con issue_date en período en estados no contabilizados
  SELECT COUNT(*) INTO v_count
  FROM sales.purchase_invoices
  WHERE issue_date >= v_start AND issue_date <= v_end
    AND status IN ('DRAFT', 'PENDING', 'PENDING_VALIDATION');

  check_name := 'compras_no_pendientes';
  passed := (v_count = 0);
  detail := CASE WHEN v_count > 0 THEN v_count::text || ' factura(s) no contabilizadas' ELSE 'OK' END;
  RETURN NEXT;

  -- Nóminas: no existen nóminas del período en DRAFT
  -- CORRECCIÓN: partner_compensation_runs está en accounting, no en internal
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT 1 FROM accounting.payroll_runs
    WHERE period_year = p_year AND period_month = p_month AND status = 'DRAFT'
    UNION ALL
    SELECT 1 FROM accounting.partner_compensation_runs
    WHERE period_year = p_year AND period_month = p_month AND status = 'DRAFT'
  ) t;

  check_name := 'nominas_no_draft';
  passed := (v_count = 0);
  detail := CASE WHEN v_count > 0 THEN v_count::text || ' nómina(s) en DRAFT' ELSE 'OK' END;
  RETURN NEXT;

  -- IS: informativo (existe provisión)
  SELECT COUNT(*) INTO v_count
  FROM accounting.journal_entries
  WHERE entry_type = 'TAX_PROVISION'
    AND entry_date >= v_start AND entry_date <= v_end;

  check_name := 'provision_is';
  passed := (v_count > 0);
  detail := CASE WHEN v_count = 0 THEN 'Sin provisión IS (informativo)' ELSE 'OK' END;
  RETURN NEXT;
END;
$$;
