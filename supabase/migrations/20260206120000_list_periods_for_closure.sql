--
-- list_periods_for_closure: listado de meses del año actual (cerrados o por cerrar) para la UI de Contabilidad > PyG.
-- Solo año actual, ordenado por mes: Enero, Febrero, Marzo...
--
CREATE OR REPLACE FUNCTION accounting.list_periods_for_closure(
  p_months_back INTEGER DEFAULT 24
)
RETURNS TABLE(
  year INTEGER,
  month INTEGER,
  period_start DATE,
  period_end DATE,
  is_closed BOOLEAN,
  closed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO accounting
AS $$
  WITH current_year AS (
    SELECT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER AS y
  ),
  months AS (
    SELECT
      cy.y AS year,
      m.month,
      make_date(cy.y, m.month, 1) AS period_start,
      (make_date(cy.y, m.month, 1) + interval '1 month' - interval '1 day')::date AS period_end
    FROM current_year cy
    CROSS JOIN generate_series(1, 12) AS m(month)
  )
  SELECT
    m.year,
    m.month,
    m.period_start,
    m.period_end,
    (pc.id IS NOT NULL AND pc.is_locked = true) AS is_closed,
    pc.closed_at
  FROM months m
  LEFT JOIN accounting.period_closures pc ON pc.year = m.year AND pc.month = m.month
  ORDER BY m.month ASC;
$$;

CREATE OR REPLACE FUNCTION public.list_periods_for_closure(
  p_months_back INTEGER DEFAULT 24
)
RETURNS TABLE(
  year INTEGER,
  month INTEGER,
  period_start DATE,
  period_end DATE,
  is_closed BOOLEAN,
  closed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM accounting.list_periods_for_closure(p_months_back);
$$;

COMMENT ON FUNCTION accounting.list_periods_for_closure IS 'Lista los 12 meses del año actual con estado de cierre (cerrado/abierto), ordenado Enero a Diciembre.';
