--
-- Dashboard - RPC: Consolidated Metrics
--

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_period TEXT DEFAULT 'quarter'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, projects, crm, internal, public
AS $$
DECLARE
  v_result JSONB;
  v_start_date DATE;
  v_end_date DATE;
  v_now DATE := CURRENT_DATE;
BEGIN
  -- Determine period dates for KPIs
  IF p_period = 'year' THEN
    v_start_date := DATE_TRUNC('year', v_now)::DATE;
    v_end_date := (v_start_date + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
  ELSE
    v_start_date := DATE_TRUNC('quarter', v_now)::DATE;
    v_end_date := (v_start_date + INTERVAL '3 months' - INTERVAL '1 day')::DATE;
  END IF;

  -- Build final JSON result
  SELECT jsonb_build_object(
    'kpis', (
      SELECT jsonb_build_object(
        'invoicesAmount', COALESCE(SUM(total), 0),
        'invoicesCount', COUNT(*),
        'pendingAmount', (SELECT COALESCE(SUM(pending_amount), 0) FROM sales.invoices WHERE status NOT IN ('PAID', 'CANCELLED', 'DRAFT')),
        'pendingCount', (SELECT COUNT(*) FROM sales.invoices WHERE status NOT IN ('PAID', 'CANCELLED', 'DRAFT')),
        'quotesAmount', (SELECT COALESCE(SUM(total), 0) FROM sales.quotes WHERE created_at::DATE BETWEEN v_start_date AND v_end_date AND status != 'CANCELLED'),
        'quotesCount', (SELECT COUNT(*) FROM sales.quotes WHERE created_at::DATE BETWEEN v_start_date AND v_end_date AND status != 'CANCELLED'),
        'activeProjects', (SELECT COUNT(*) FROM projects.projects WHERE status IN ('IN_PROGRESS', 'PLANNED')),
        'totalClients', (SELECT COUNT(*) FROM crm.clients)
      )
      FROM sales.invoices
      WHERE issue_date BETWEEN v_start_date AND v_end_date
        AND status != 'CANCELLED'
    ),
    'revenueChart', (
      SELECT jsonb_agg(d)
      FROM (
        SELECT 
          to_char(m, 'Mon') as month,
          EXTRACT(MONTH FROM m) as month_num,
          EXTRACT(YEAR FROM m) as year_num,
          COALESCE((SELECT SUM(amount) FROM sales.financial_movements WHERE movement_type = 'INCOME' AND date_trunc('month', issue_date) = m), 0) as revenue,
          COALESCE((SELECT ABS(SUM(amount)) FROM sales.financial_movements WHERE movement_type = 'EXPENSE' AND date_trunc('month', issue_date) = m), 0) as expenses
        FROM generate_series(
          date_trunc('month', v_now) - interval '5 months',
          date_trunc('month', v_now),
          interval '1 month'
        ) m
      ) d
    ),
    'taxes', (
      SELECT jsonb_build_object(
        'collected', COALESCE(SUM(tax_amount), 0),
        'paid', (SELECT COALESCE(SUM(tax_amount), 0) FROM sales.purchase_invoices WHERE issue_date BETWEEN date_trunc('quarter', v_now)::DATE AND (date_trunc('quarter', v_now) + INTERVAL '3 months' - INTERVAL '1 day')::DATE AND status != 'CANCELLED')
      )
      FROM sales.invoices
      WHERE issue_date BETWEEN date_trunc('quarter', v_now)::DATE AND (date_trunc('quarter', v_now) + INTERVAL '3 months' - INTERVAL '1 day')::DATE
        AND status != 'CANCELLED'
    ),
    'profitability', (
      SELECT jsonb_build_object(
        'revenue', r,
        'costs', c,
        'profit', r - c,
        'margin', CASE WHEN r > 0 THEN ((r - c) / r) * 100 ELSE 0 END
      )
      FROM (
        SELECT 
          COALESCE(SUM(amount), 0) as r,
          (SELECT COALESCE(ABS(SUM(amount)), 0) FROM sales.financial_movements WHERE movement_type = 'EXPENSE') as c
        FROM sales.financial_movements
        WHERE movement_type = 'INCOME'
      ) s
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
