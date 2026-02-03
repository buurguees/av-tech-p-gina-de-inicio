-- =====================================================
-- FIX CRÍTICO: PyG, Balance y Saldos filtran por fecha
-- correctamente (solo sumar líneas de asientos en período).
-- Antes: LEFT JOIN con fecha en ON → jel seguía entrando
-- en el SUM aunque je quedara NULL → datos fuera de período.
-- Ahora: CTE de asientos filtrados, luego líneas solo de esos.
-- =====================================================

-- 1. get_balance_sheet: solo asientos con entry_date <= p_as_of_date
CREATE OR REPLACE FUNCTION accounting.get_balance_sheet(
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  debit_balance NUMERIC(12,2),
  credit_balance NUMERIC(12,2),
  net_balance NUMERIC(12,2)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = accounting
AS $$
  WITH entries AS (
    SELECT id
    FROM accounting.journal_entries
    WHERE entry_date <= p_as_of_date
  ),
  lines AS (
    SELECT jel.*
    FROM accounting.journal_entry_lines jel
    JOIN entries e ON e.id = jel.journal_entry_id
  )
  SELECT
    coa.account_code,
    coa.account_name,
    coa.account_type,
    COALESCE(SUM(CASE WHEN l.debit_credit = 'DEBIT' THEN l.amount ELSE 0 END), 0)::numeric(12,2) AS debit_balance,
    COALESCE(SUM(CASE WHEN l.debit_credit = 'CREDIT' THEN l.amount ELSE 0 END), 0)::numeric(12,2) AS credit_balance,
    CASE
      WHEN coa.account_type IN ('ASSET', 'EXPENSE') THEN
        COALESCE(SUM(CASE WHEN l.debit_credit = 'DEBIT' THEN l.amount ELSE -l.amount END), 0)
      ELSE
        COALESCE(SUM(CASE WHEN l.debit_credit = 'CREDIT' THEN l.amount ELSE -l.amount END), 0)
    END::numeric(12,2) AS net_balance
  FROM accounting.chart_of_accounts coa
  LEFT JOIN lines l ON l.account_code = coa.account_code
  WHERE coa.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
    AND coa.is_active = true
  GROUP BY coa.account_code, coa.account_name, coa.account_type
  ORDER BY coa.account_code;
$$;

-- 2. get_profit_loss: solo asientos con entry_date en período
CREATE OR REPLACE FUNCTION accounting.get_profit_loss(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  amount NUMERIC(12,2)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = accounting
AS $$
  WITH entries AS (
    SELECT id
    FROM accounting.journal_entries
    WHERE (p_period_start IS NULL AND p_period_end IS NULL)
       OR (p_period_start IS NOT NULL AND p_period_end IS NOT NULL AND entry_date BETWEEN p_period_start AND p_period_end)
  ),
  lines AS (
    SELECT jel.*
    FROM accounting.journal_entry_lines jel
    JOIN entries e ON e.id = jel.journal_entry_id
  )
  SELECT
    coa.account_code,
    coa.account_name,
    coa.account_type,
    COALESCE(SUM(
      CASE
        WHEN coa.account_type = 'REVENUE' THEN CASE WHEN l.debit_credit = 'CREDIT' THEN l.amount ELSE -l.amount END
        WHEN coa.account_type = 'EXPENSE' THEN CASE WHEN l.debit_credit = 'DEBIT' THEN l.amount ELSE -l.amount END
        ELSE 0
      END
    ), 0)::numeric(12,2) AS amount
  FROM accounting.chart_of_accounts coa
  LEFT JOIN lines l ON l.account_code = coa.account_code
  WHERE coa.account_type IN ('REVENUE', 'EXPENSE')
    AND coa.is_active = true
  GROUP BY coa.account_code, coa.account_name, coa.account_type
  HAVING COALESCE(SUM(
    CASE
      WHEN coa.account_type = 'REVENUE' THEN CASE WHEN l.debit_credit = 'CREDIT' THEN l.amount ELSE -l.amount END
      WHEN coa.account_type = 'EXPENSE' THEN CASE WHEN l.debit_credit = 'DEBIT' THEN l.amount ELSE -l.amount END
      ELSE 0
    END
  ), 0) <> 0
  ORDER BY coa.account_code;
$$;

-- 3. get_client_balances: solo asientos con entry_date <= p_as_of_date
CREATE OR REPLACE FUNCTION accounting.get_client_balances(
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  client_id UUID,
  client_number TEXT,
  client_name TEXT,
  debit_balance NUMERIC(12,2),
  credit_balance NUMERIC(12,2),
  net_balance NUMERIC(12,2)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = accounting, crm
AS $$
  WITH entries AS (
    SELECT id
    FROM accounting.journal_entries
    WHERE entry_date <= p_as_of_date
  ),
  lines AS (
    SELECT jel.*
    FROM accounting.journal_entry_lines jel
    JOIN entries e ON e.id = jel.journal_entry_id
  )
  SELECT
    c.id AS client_id,
    c.client_number,
    c.company_name AS client_name,
    COALESCE(SUM(CASE WHEN l.debit_credit = 'DEBIT' THEN l.amount ELSE 0 END), 0)::numeric(12,2) AS debit_balance,
    COALESCE(SUM(CASE WHEN l.debit_credit = 'CREDIT' THEN l.amount ELSE 0 END), 0)::numeric(12,2) AS credit_balance,
    COALESCE(SUM(CASE WHEN l.debit_credit = 'DEBIT' THEN l.amount ELSE -l.amount END), 0)::numeric(12,2) AS net_balance
  FROM crm.clients c
  LEFT JOIN lines l ON l.third_party_id = c.id
    AND l.third_party_type = 'CLIENT'
    AND l.account_code = '430000'
  WHERE c.deleted_at IS NULL
  GROUP BY c.id, c.client_number, c.company_name
  HAVING COALESCE(SUM(CASE WHEN l.debit_credit = 'DEBIT' THEN l.amount ELSE -l.amount END), 0) <> 0
  ORDER BY net_balance DESC;
$$;

-- 4. get_supplier_technician_balances: solo asientos con entry_date <= p_as_of_date
CREATE OR REPLACE FUNCTION accounting.get_supplier_technician_balances(
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  third_party_id UUID,
  third_party_type TEXT,
  third_party_number TEXT,
  third_party_name TEXT,
  account_code TEXT,
  debit_balance NUMERIC(12,2),
  credit_balance NUMERIC(12,2),
  net_balance NUMERIC(12,2)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = accounting, internal
AS $$
  WITH entries AS (
    SELECT id
    FROM accounting.journal_entries
    WHERE entry_date <= p_as_of_date
  ),
  lines AS (
    SELECT jel.*
    FROM accounting.journal_entry_lines jel
    JOIN entries e ON e.id = jel.journal_entry_id
  )
  (
    -- Proveedores (400000)
    SELECT
      s.id AS third_party_id,
      'SUPPLIER'::TEXT AS third_party_type,
      s.supplier_number AS third_party_number,
      s.company_name AS third_party_name,
      '400000'::TEXT AS account_code,
      COALESCE(SUM(CASE WHEN l.debit_credit = 'DEBIT' THEN l.amount ELSE 0 END), 0)::numeric(12,2) AS debit_balance,
      COALESCE(SUM(CASE WHEN l.debit_credit = 'CREDIT' THEN l.amount ELSE 0 END), 0)::numeric(12,2) AS credit_balance,
      COALESCE(SUM(CASE WHEN l.debit_credit = 'CREDIT' THEN l.amount ELSE -l.amount END), 0)::numeric(12,2) AS net_balance
    FROM internal.suppliers s
    LEFT JOIN lines l ON l.third_party_id = s.id
      AND l.third_party_type = 'SUPPLIER'
      AND l.account_code = '400000'
    GROUP BY s.id, s.supplier_number, s.company_name
    HAVING COALESCE(SUM(CASE WHEN l.debit_credit = 'CREDIT' THEN l.amount ELSE -l.amount END), 0) <> 0
  )
  UNION ALL
  (
    -- Técnicos (410000)
    SELECT
      t.id AS third_party_id,
      'TECHNICIAN'::TEXT AS third_party_type,
      t.technician_number AS third_party_number,
      t.company_name AS third_party_name,
      '410000'::TEXT AS account_code,
      COALESCE(SUM(CASE WHEN l.debit_credit = 'DEBIT' THEN l.amount ELSE 0 END), 0)::numeric(12,2) AS debit_balance,
      COALESCE(SUM(CASE WHEN l.debit_credit = 'CREDIT' THEN l.amount ELSE 0 END), 0)::numeric(12,2) AS credit_balance,
      COALESCE(SUM(CASE WHEN l.debit_credit = 'CREDIT' THEN l.amount ELSE -l.amount END), 0)::numeric(12,2) AS net_balance
    FROM internal.technicians t
    LEFT JOIN lines l ON l.third_party_id = t.id
      AND l.third_party_type = 'TECHNICIAN'
      AND l.account_code = '410000'
    GROUP BY t.id, t.technician_number, t.company_name
    HAVING COALESCE(SUM(CASE WHEN l.debit_credit = 'CREDIT' THEN l.amount ELSE -l.amount END), 0) <> 0
  )
  ORDER BY net_balance DESC;
$$;

COMMENT ON FUNCTION accounting.get_balance_sheet IS 'Balance de situación a fecha. Solo incluye asientos con entry_date <= p_as_of_date.';
COMMENT ON FUNCTION accounting.get_profit_loss IS 'Cuenta de resultados del período. Solo incluye asientos con entry_date en [p_period_start, p_period_end].';
COMMENT ON FUNCTION accounting.get_client_balances IS 'Saldos por cliente (430000) a fecha. Solo asientos con entry_date <= p_as_of_date.';
COMMENT ON FUNCTION accounting.get_supplier_technician_balances IS 'Saldos proveedores/técnicos (400000/410000) a fecha. Solo asientos con entry_date <= p_as_of_date.';
