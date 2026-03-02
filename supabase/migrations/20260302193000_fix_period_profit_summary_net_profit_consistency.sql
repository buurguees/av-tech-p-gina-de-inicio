CREATE OR REPLACE FUNCTION accounting.get_period_profit_summary(
  p_start DATE DEFAULT NULL,
  p_end DATE DEFAULT NULL
)
RETURNS TABLE(
  total_revenue NUMERIC,
  operating_expenses NUMERIC,
  profit_before_tax NUMERIC,
  corporate_tax_amount NUMERIC,
  net_profit NUMERIC,
  data_completeness JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'accounting'
AS $$
  WITH profit_base AS (
    SELECT
      COALESCE(pbt.total_revenue, 0)::numeric(12,2) AS total_revenue,
      COALESCE(pbt.total_expenses, 0)::numeric(12,2) AS operating_expenses,
      COALESCE(pbt.profit_before_tax, 0)::numeric(12,2) AS profit_before_tax
    FROM accounting.calculate_profit_before_tax(
      p_period_start := p_start,
      p_period_end := p_end
    ) pbt
    LIMIT 1
  ),
  tax_base AS (
    SELECT
      COALESCE(cts.tax_amount, 0)::numeric(12,2) AS corporate_tax_amount
    FROM accounting.get_corporate_tax_summary(
      p_period_start := p_start,
      p_period_end := p_end
    ) cts
    LIMIT 1
  )
  SELECT
    profit_base.total_revenue,
    profit_base.operating_expenses,
    profit_base.profit_before_tax,
    COALESCE(tax_base.corporate_tax_amount, 0)::numeric(12,2) AS corporate_tax_amount,
    (profit_base.profit_before_tax - COALESCE(tax_base.corporate_tax_amount, 0))::numeric(12,2) AS net_profit,
    '{}'::jsonb AS data_completeness
  FROM profit_base
  LEFT JOIN tax_base ON TRUE;
$$;

CREATE OR REPLACE FUNCTION public.get_period_profit_summary(
  p_start DATE DEFAULT NULL,
  p_end DATE DEFAULT NULL
)
RETURNS TABLE(
  total_revenue NUMERIC,
  operating_expenses NUMERIC,
  profit_before_tax NUMERIC,
  corporate_tax_amount NUMERIC,
  net_profit NUMERIC,
  data_completeness JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM accounting.get_period_profit_summary(p_start, p_end);
$$;

COMMENT ON FUNCTION accounting.get_period_profit_summary IS 'Resumen canonico de PyG por periodo. Devuelve ingresos, gastos operativos, BAI, IS y neto con una sola logica consistente.';
COMMENT ON FUNCTION public.get_period_profit_summary IS 'Wrapper publico para accounting.get_period_profit_summary.';
