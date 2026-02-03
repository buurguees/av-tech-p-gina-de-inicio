-- =====================================================
-- FASE D: Validación de consistencia contable mensual
-- RPC: accounting.validate_month_consistency(p_year, p_month)
-- Devuelve checks con passed + severity + detail + meta (JSON).
-- Tolerancia por defecto 0.01 (céntimos).
-- =====================================================

CREATE OR REPLACE FUNCTION accounting.validate_month_consistency(
  p_year  INT,
  p_month INT,
  p_tolerance NUMERIC(12,2) DEFAULT 0.01
)
RETURNS TABLE (
  check_code TEXT,
  check_name TEXT,
  passed BOOLEAN,
  severity TEXT,
  detail TEXT,
  meta JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, sales, internal, crm
AS $$
DECLARE
  v_start DATE;
  v_end   DATE;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end   := (date_trunc('month', v_start::timestamp) + interval '1 month - 1 day')::date;

  -- -----------------------------------------------------
  -- CHECK 1: Asientos desbalanceados dentro del mes
  -- (agg siempre devuelve una fila aunque no haya asientos)
  -- -----------------------------------------------------
  RETURN QUERY
  WITH je AS (
    SELECT id, entry_number, entry_date, entry_type
    FROM accounting.journal_entries
    WHERE entry_date BETWEEN v_start AND v_end
  ),
  sums AS (
    SELECT
      je.id,
      je.entry_number,
      COALESCE(SUM(CASE WHEN jel.debit_credit = 'DEBIT'  THEN jel.amount ELSE 0 END), 0) AS total_debit,
      COALESCE(SUM(CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE 0 END), 0) AS total_credit
    FROM je
    JOIN accounting.journal_entry_lines jel ON jel.journal_entry_id = je.id
    GROUP BY je.id, je.entry_number
  ),
  agg AS (
    SELECT
      COUNT(*) FILTER (WHERE ABS(total_debit - total_credit) > p_tolerance) AS unbalanced_count,
      jsonb_agg(jsonb_build_object('entry_number', entry_number, 'diff', (total_debit - total_credit)))
        FILTER (WHERE ABS(total_debit - total_credit) > p_tolerance) AS examples
    FROM sums
  )
  SELECT
    'JE_BALANCED'::text,
    'Asientos balanceados (Debe=Haber)'::text,
    ((SELECT unbalanced_count FROM agg) = 0),
    'BLOCKER'::text,
    CASE WHEN (SELECT unbalanced_count FROM agg) = 0 THEN 'OK' ELSE 'Hay asientos descuadrados en el período' END,
    jsonb_build_object('unbalanced_count', (SELECT unbalanced_count FROM agg), 'examples', (SELECT examples FROM agg))
  FROM agg;

  -- -----------------------------------------------------
  -- CHECK 2: Compras APPROVED sin asiento INVOICE_PURCHASE
  -- -----------------------------------------------------
  RETURN QUERY
  WITH pi AS (
    SELECT id, issue_date
    FROM sales.purchase_invoices
    WHERE status = 'APPROVED'
      AND COALESCE(issue_date, v_start) BETWEEN v_start AND v_end
  ),
  missing AS (
    SELECT pi.id
    FROM pi
    LEFT JOIN accounting.journal_entries je
      ON je.reference_id = pi.id
     AND je.reference_type = 'purchase_invoice'
     AND je.entry_type = 'INVOICE_PURCHASE'
    WHERE je.id IS NULL
  ),
  agg2 AS (
    SELECT COUNT(*) AS missing_count, (SELECT jsonb_agg(id) FROM (SELECT id FROM missing LIMIT 20) t) AS examples
    FROM missing
  )
  SELECT
    'PURCHASE_APPROVED_HAS_ENTRY'::text,
    'Compras APPROVED con asiento contable'::text,
    ((SELECT missing_count FROM agg2) = 0),
    'BLOCKER'::text,
    CASE WHEN (SELECT missing_count FROM agg2) = 0 THEN 'OK' ELSE 'Hay facturas de compra APPROVED sin asiento INVOICE_PURCHASE' END,
    jsonb_build_object('missing_count', (SELECT missing_count FROM agg2), 'examples', (SELECT examples FROM agg2))
  FROM agg2;

  -- -----------------------------------------------------
  -- CHECK 3: Duplicados TAX_PROVISION en el año
  -- -----------------------------------------------------
  RETURN QUERY
  WITH y AS (
    SELECT date_trunc('year', v_start::timestamp)::date AS y_start,
           (date_trunc('year', v_start::timestamp) + interval '1 year - 1 day')::date AS y_end
  ),
  prov AS (
    SELECT je.id, je.entry_number, je.entry_date
    FROM accounting.journal_entries je, y
    WHERE je.entry_type = 'TAX_PROVISION'
      AND je.reference_type = 'corporate_tax'
      AND je.entry_date BETWEEN y.y_start AND y.y_end
  ),
  agg3 AS (
    SELECT COUNT(*) AS prov_count, (SELECT jsonb_agg(jsonb_build_object('entry_number', entry_number, 'date', entry_date)) FROM prov) AS entries
    FROM prov
  )
  SELECT
    'TAX_PROVISION_UNIQUE'::text,
    'Provisión IS sin duplicados (anual)'::text,
    ((SELECT prov_count FROM agg3) <= 1),
    'BLOCKER'::text,
    CASE WHEN (SELECT prov_count FROM agg3) <= 1 THEN 'OK' ELSE 'Hay más de una provisión IS (TAX_PROVISION) en el año' END,
    jsonb_build_object('count', (SELECT prov_count FROM agg3), 'entries', (SELECT entries FROM agg3))
  FROM agg3;

  -- -----------------------------------------------------
  -- CHECK 4: Coherencia 465 vs nóminas POSTED del mes
  -- (payroll_runs / partner_compensation_runs: status POSTED = pendiente pago)
  -- -----------------------------------------------------
  RETURN QUERY
  WITH posted AS (
    SELECT net_amount
    FROM accounting.payroll_runs
    WHERE status = 'POSTED'
      AND make_date(period_year, period_month, 1) = v_start
    UNION ALL
    SELECT net_amount
    FROM accounting.partner_compensation_runs
    WHERE status = 'POSTED'
      AND make_date(period_year, period_month, 1) = v_start
  ),
  pending_payroll AS (
    SELECT COALESCE(SUM(net_amount), 0)::numeric(12,2) AS total_pending
    FROM posted
  ),
  acc465 AS (
    SELECT COALESCE(SUM(
      CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE -jel.amount END
    ), 0)::numeric(12,2) AS balance_465
    FROM accounting.journal_entries je
    JOIN accounting.journal_entry_lines jel ON jel.journal_entry_id = je.id
    WHERE je.entry_date <= v_end
      AND jel.account_code = '465000'
  )
  SELECT
    'PAYROLL_465_COHERENCE'::text,
    'Coherencia 465 vs nóminas POSTED del mes'::text,
    (ABS((SELECT balance_465 FROM acc465) - (SELECT total_pending FROM pending_payroll)) <= 5.00),
    'WARNING'::text,
    'Comparación aproximada (465 acumulado vs neto pendiente del mes). Revisión si difiere.',
    jsonb_build_object(
      'balance_465', (SELECT balance_465 FROM acc465),
      'pending_month_net', (SELECT total_pending FROM pending_payroll)
    );

  -- -----------------------------------------------------
  -- CHECK 5: Facturas de venta ISSUED en el mes con asiento
  -- -----------------------------------------------------
  RETURN QUERY
  WITH inv AS (
    SELECT i.id, i.invoice_number, i.issue_date
    FROM sales.invoices i
    WHERE i.status = 'ISSUED'
      AND i.issue_date BETWEEN v_start AND v_end
  ),
  missing_sale AS (
    SELECT inv.id
    FROM inv
    LEFT JOIN accounting.journal_entries je
      ON je.reference_id = inv.id
     AND je.reference_type = 'invoice'
     AND je.entry_type = 'INVOICE_SALE'
    WHERE je.id IS NULL
  ),
  agg5 AS (
    SELECT COUNT(*) AS missing_count, (SELECT jsonb_agg(id) FROM (SELECT id FROM missing_sale LIMIT 20) t) AS examples
    FROM missing_sale
  )
  SELECT
    'SALES_ISSUED_HAS_ENTRY'::text,
    'Ventas ISSUED con asiento contable'::text,
    ((SELECT missing_count FROM agg5) = 0),
    'BLOCKER'::text,
    CASE WHEN (SELECT missing_count FROM agg5) = 0 THEN 'OK' ELSE 'Hay facturas de venta ISSUED sin asiento INVOICE_SALE' END,
    jsonb_build_object('missing_count', (SELECT missing_count FROM agg5), 'examples', (SELECT examples FROM agg5))
  FROM agg5;

  RETURN;
END;
$$;

COMMENT ON FUNCTION accounting.validate_month_consistency IS
  'Valida consistencia contable del mes (cierre). Devuelve check_code, passed, severity, detail, meta.';

-- Wrapper público para uso desde frontend
CREATE OR REPLACE FUNCTION public.validate_month_consistency(
  p_year INT,
  p_month INT,
  p_tolerance NUMERIC(12,2) DEFAULT 0.01
)
RETURNS TABLE (
  check_code TEXT,
  check_name TEXT,
  passed BOOLEAN,
  severity TEXT,
  detail TEXT,
  meta JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, accounting
AS $$
  SELECT * FROM accounting.validate_month_consistency(p_year, p_month, p_tolerance);
$$;

COMMENT ON FUNCTION public.validate_month_consistency IS 'Wrapper: validación de consistencia contable mensual (cierre).';
