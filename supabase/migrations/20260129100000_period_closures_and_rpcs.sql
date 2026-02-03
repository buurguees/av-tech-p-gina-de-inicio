-- =====================================================
-- period_closures: tabla para cierre mensual
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting.period_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_by UUID REFERENCES internal.authorized_users(id),
  is_locked BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(year, month)
);

COMMENT ON TABLE accounting.period_closures IS 'Cierres de período mensual para PyG fiable y bonus socios';

-- =====================================================
-- get_period_profit_summary: fuente única de verdad
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.get_period_profit_summary(
  p_start DATE DEFAULT NULL,
  p_end DATE DEFAULT NULL
)
RETURNS TABLE(
  total_revenue NUMERIC,
  operating_expenses NUMERIC,
  profit_before_tax NUMERIC,
  corporate_tax_amount NUMERIC,
  net_profit NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'accounting'
AS $$
DECLARE
  v_revenue NUMERIC(12,2) := 0;
  v_expenses NUMERIC(12,2) := 0;
  v_pbt NUMERIC(12,2) := 0;
  v_tax NUMERIC(12,2) := 0;
BEGIN
  SELECT pbt.total_revenue, pbt.total_expenses, pbt.profit_before_tax
  INTO v_revenue, v_expenses, v_pbt
  FROM accounting.calculate_profit_before_tax(p_start, p_end) pbt
  LIMIT 1;

  SELECT COALESCE(cts.tax_amount, 0)
  INTO v_tax
  FROM accounting.get_corporate_tax_summary(p_start, p_end) cts
  LIMIT 1;

  RETURN QUERY SELECT
    COALESCE(v_revenue, 0),
    COALESCE(v_expenses, 0),
    COALESCE(v_pbt, 0),
    COALESCE(v_tax, 0),
    COALESCE(v_pbt, 0) - COALESCE(v_tax, 0);
END;
$$;

-- Wrapper público
CREATE OR REPLACE FUNCTION public.get_period_profit_summary(
  p_start DATE DEFAULT NULL,
  p_end DATE DEFAULT NULL
)
RETURNS TABLE(
  total_revenue NUMERIC,
  operating_expenses NUMERIC,
  profit_before_tax NUMERIC,
  corporate_tax_amount NUMERIC,
  net_profit NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM accounting.get_period_profit_summary(p_start, p_end);
$$;

-- =====================================================
-- is_period_closed
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.is_period_closed(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'accounting'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM accounting.period_closures
    WHERE year = p_year AND month = p_month AND is_locked = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_period_closed(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT accounting.is_period_closed(p_year, p_month);
$$;

-- =====================================================
-- check_month_closure_readiness: checklist verificable
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
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT 1 FROM accounting.payroll_runs
    WHERE period_year = p_year AND period_month = p_month AND status = 'DRAFT'
    UNION ALL
    SELECT 1 FROM internal.partner_compensation_runs
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

CREATE OR REPLACE FUNCTION public.check_month_closure_readiness(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE(
  check_name TEXT,
  passed BOOLEAN,
  detail TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM accounting.check_month_closure_readiness(p_year, p_month);
$$;

-- =====================================================
-- close_period
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.close_period(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'accounting', 'internal'
AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_user_id UUID;
  v_id UUID;
  v_failed TEXT;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + interval '1 month' - interval '1 day')::date;

  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  -- Verificar checklist (solo checks críticos: ventas, compras, nóminas)
  SELECT c.detail INTO v_failed
  FROM accounting.check_month_closure_readiness(p_year, p_month) c
  WHERE c.check_name IN ('ventas_no_pendientes', 'compras_no_pendientes', 'nominas_no_draft')
    AND NOT c.passed
  LIMIT 1;

  IF v_failed IS NOT NULL THEN
    RAISE EXCEPTION 'No se puede cerrar: %', v_failed;
  END IF;

  IF accounting.is_period_closed(p_year, p_month) THEN
    RAISE EXCEPTION 'El período %/% ya está cerrado', p_year, p_month;
  END IF;

  INSERT INTO accounting.period_closures (year, month, period_start, period_end, closed_by)
  VALUES (p_year, p_month, v_start, v_end, v_user_id)
  ON CONFLICT (year, month) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM accounting.period_closures WHERE year = p_year AND month = p_month;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_period(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT accounting.close_period(p_year, p_month);
$$;

-- =====================================================
-- assert_period_not_closed: hook para bloqueo (fase 1: warn)
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.assert_period_not_closed(
  p_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'accounting'
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_closed BOOLEAN;
BEGIN
  v_year := EXTRACT(YEAR FROM p_date)::INTEGER;
  v_month := EXTRACT(MONTH FROM p_date)::INTEGER;

  v_closed := accounting.is_period_closed(v_year, v_month);

  -- Fase 1: solo log/warn, no bloquea
  -- Fase 2: descomentar para enforcement:
  -- IF v_closed THEN
  --   RAISE EXCEPTION 'El período %/% está cerrado. No se pueden registrar movimientos en períodos cerrados.', v_year, v_month;
  -- END IF;

  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_period_not_closed(
  p_date DATE
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT accounting.assert_period_not_closed(p_date);
$$;
