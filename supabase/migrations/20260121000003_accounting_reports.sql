-- ============================================
-- FUNCIONES RPC PARA INFORMES CONTABLES
-- ============================================

-- 1. FUNCIÓN: Balance de situación
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    coa.account_code,
    coa.account_name,
    coa.account_type,
    COALESCE(SUM(CASE WHEN jel.debit_credit = 'DEBIT' THEN jel.amount ELSE 0 END), 0) as debit_balance,
    COALESCE(SUM(CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE 0 END), 0) as credit_balance,
    CASE 
      WHEN coa.account_type IN ('ASSET', 'EXPENSE') THEN
        COALESCE(SUM(CASE WHEN jel.debit_credit = 'DEBIT' THEN jel.amount ELSE -jel.amount END), 0)
      ELSE
        COALESCE(SUM(CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE -jel.amount END), 0)
    END as net_balance
  FROM accounting.chart_of_accounts coa
  LEFT JOIN accounting.journal_entry_lines jel ON jel.account_code = coa.account_code
  LEFT JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
    AND je.entry_date <= p_as_of_date
  WHERE coa.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
    AND coa.is_active = true
  GROUP BY coa.account_code, coa.account_name, coa.account_type
  ORDER BY coa.account_code;
END;
$$;

-- 2. FUNCIÓN: Cuenta de resultados
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting
AS $$
DECLARE
  v_period_filter TEXT;
BEGIN
  -- Construir filtro de período
  IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL THEN
    v_period_filter := ' AND je.entry_date BETWEEN ''' || p_period_start || ''' AND ''' || p_period_end || '''';
  ELSE
    v_period_filter := '';
  END IF;
  
  RETURN QUERY
  EXECUTE format('
    SELECT 
      coa.account_code,
      coa.account_name,
      coa.account_type,
      COALESCE(SUM(
        CASE 
          WHEN coa.account_type = ''REVENUE'' THEN
            CASE WHEN jel.debit_credit = ''CREDIT'' THEN jel.amount ELSE -jel.amount END
          WHEN coa.account_type = ''EXPENSE'' THEN
            CASE WHEN jel.debit_credit = ''DEBIT'' THEN jel.amount ELSE -jel.amount END
          ELSE 0
        END
      ), 0) as amount
    FROM accounting.chart_of_accounts coa
    LEFT JOIN accounting.journal_entry_lines jel ON jel.account_code = coa.account_code
    LEFT JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
      %s
    WHERE coa.account_type IN (''REVENUE'', ''EXPENSE'')
      AND coa.is_active = true
    GROUP BY coa.account_code, coa.account_name, coa.account_type
    HAVING COALESCE(SUM(
      CASE 
        WHEN coa.account_type = ''REVENUE'' THEN
          CASE WHEN jel.debit_credit = ''CREDIT'' THEN jel.amount ELSE -jel.amount END
        WHEN coa.account_type = ''EXPENSE'' THEN
          CASE WHEN jel.debit_credit = ''DEBIT'' THEN jel.amount ELSE -jel.amount END
        ELSE 0
      END
    ), 0) != 0
    ORDER BY coa.account_code
  ', v_period_filter);
END;
$$;

-- 3. FUNCIÓN: Saldos por cliente (cuenta 430000)
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, crm
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.client_number,
    c.company_name,
    COALESCE(SUM(CASE WHEN jel.debit_credit = 'DEBIT' THEN jel.amount ELSE 0 END), 0) as debit_balance,
    COALESCE(SUM(CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE 0 END), 0) as credit_balance,
    COALESCE(SUM(CASE WHEN jel.debit_credit = 'DEBIT' THEN jel.amount ELSE -jel.amount END), 0) as net_balance
  FROM crm.clients c
  LEFT JOIN accounting.journal_entry_lines jel ON jel.third_party_id = c.id
    AND jel.third_party_type = 'CLIENT'
    AND jel.account_code = '430000'
  LEFT JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
    AND je.entry_date <= p_as_of_date
  WHERE c.deleted_at IS NULL
  GROUP BY c.id, c.client_number, c.company_name
  HAVING COALESCE(SUM(CASE WHEN jel.debit_credit = 'DEBIT' THEN jel.amount ELSE -jel.amount END), 0) != 0
  ORDER BY net_balance DESC;
END;
$$;

-- 4. FUNCIÓN: Saldos por proveedor/técnico (cuentas 400000 y 410000)
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, internal
AS $$
BEGIN
  RETURN QUERY
  -- Proveedores (400000)
  SELECT 
    s.id,
    'SUPPLIER'::TEXT,
    s.supplier_number,
    s.company_name,
    '400000'::TEXT,
    COALESCE(SUM(CASE WHEN jel.debit_credit = 'DEBIT' THEN jel.amount ELSE 0 END), 0) as debit_balance,
    COALESCE(SUM(CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE 0 END), 0) as credit_balance,
    COALESCE(SUM(CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE -jel.amount END), 0) as net_balance
  FROM internal.suppliers s
  LEFT JOIN accounting.journal_entry_lines jel ON jel.third_party_id = s.id
    AND jel.third_party_type = 'SUPPLIER'
    AND jel.account_code = '400000'
  LEFT JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
    AND je.entry_date <= p_as_of_date
  GROUP BY s.id, s.supplier_number, s.company_name
  HAVING COALESCE(SUM(CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE -jel.amount END), 0) != 0
  
  UNION ALL
  
  -- Técnicos (410000)
  SELECT 
    t.id,
    'TECHNICIAN'::TEXT,
    t.technician_number,
    t.company_name,
    '410000'::TEXT,
    COALESCE(SUM(CASE WHEN jel.debit_credit = 'DEBIT' THEN jel.amount ELSE 0 END), 0) as debit_balance,
    COALESCE(SUM(CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE 0 END), 0) as credit_balance,
    COALESCE(SUM(CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE -jel.amount END), 0) as net_balance
  FROM internal.technicians t
  LEFT JOIN accounting.journal_entry_lines jel ON jel.third_party_id = t.id
    AND jel.third_party_type = 'TECHNICIAN'
    AND jel.account_code = '410000'
  LEFT JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
    AND je.entry_date <= p_as_of_date
  GROUP BY t.id, t.technician_number, t.company_name
  HAVING COALESCE(SUM(CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE -jel.amount END), 0) != 0
  
  ORDER BY net_balance DESC;
END;
$$;

-- 5. FUNCIÓN: Resumen de IVA (repercutido vs soportado)
CREATE OR REPLACE FUNCTION accounting.get_vat_summary(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  vat_received NUMERIC(12,2),
  vat_paid NUMERIC(12,2),
  vat_balance NUMERIC(12,2),
  vat_to_pay NUMERIC(12,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting
AS $$
DECLARE
  v_period_filter TEXT;
  v_vat_received NUMERIC(12,2) := 0;
  v_vat_paid NUMERIC(12,2) := 0;
BEGIN
  -- Construir filtro de período
  IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL THEN
    v_period_filter := ' AND je.entry_date BETWEEN ''' || p_period_start || ''' AND ''' || p_period_end || '''';
  ELSE
    v_period_filter := '';
  END IF;
  
  -- Calcular IVA repercutido
  EXECUTE format('
    SELECT COALESCE(SUM(jel.amount), 0)
    FROM accounting.journal_entry_lines jel
    JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
    WHERE jel.account_code = ''477000''
      AND jel.debit_credit = ''CREDIT''
      %s
  ', v_period_filter) INTO v_vat_received;
  
  -- Calcular IVA soportado
  EXECUTE format('
    SELECT COALESCE(SUM(jel.amount), 0)
    FROM accounting.journal_entry_lines jel
    JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
    WHERE jel.account_code = ''472000''
      AND jel.debit_credit = ''DEBIT''
      %s
  ', v_period_filter) INTO v_vat_paid;
  
  RETURN QUERY SELECT 
    v_vat_received,
    v_vat_paid,
    v_vat_received - v_vat_paid,
    CASE WHEN v_vat_received - v_vat_paid > 0 THEN v_vat_received - v_vat_paid ELSE 0 END;
END;
$$;

-- 6. FUNCIÓN: Resumen de IRPF acumulado
CREATE OR REPLACE FUNCTION accounting.get_irpf_summary(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  irpf_accumulated NUMERIC(12,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting
AS $$
DECLARE
  v_period_filter TEXT;
  v_irpf NUMERIC(12,2) := 0;
BEGIN
  -- Construir filtro de período
  IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL THEN
    v_period_filter := ' AND je.entry_date BETWEEN ''' || p_period_start || ''' AND ''' || p_period_end || '''';
  ELSE
    v_period_filter := '';
  END IF;
  
  -- Calcular IRPF acumulado
  EXECUTE format('
    SELECT COALESCE(SUM(jel.amount), 0)
    FROM accounting.journal_entry_lines jel
    JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
    WHERE jel.account_code = ''475100''
      AND jel.debit_credit = ''CREDIT''
      %s
  ', v_period_filter) INTO v_irpf;
  
  RETURN QUERY SELECT v_irpf;
END;
$$;

-- 7. FUNCIÓN: Listar asientos contables con filtros
CREATE OR REPLACE FUNCTION accounting.list_journal_entries(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_entry_type accounting.journal_entry_type DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  entry_number TEXT,
  entry_date DATE,
  entry_type TEXT,
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  project_id UUID,
  project_name TEXT,
  is_locked BOOLEAN,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  total_debit NUMERIC(12,2),
  total_credit NUMERIC(12,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, projects, internal
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    je.id,
    je.entry_number,
    je.entry_date,
    je.entry_type::TEXT,
    je.description,
    je.reference_id,
    je.reference_type,
    je.project_id,
    p.title as project_name,
    je.is_locked,
    au.full_name as created_by_name,
    je.created_at,
    COALESCE(SUM(CASE WHEN jel.debit_credit = 'DEBIT' THEN jel.amount ELSE 0 END), 0) as total_debit,
    COALESCE(SUM(CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE 0 END), 0) as total_credit
  FROM accounting.journal_entries je
  LEFT JOIN projects.projects p ON je.project_id = p.id
  LEFT JOIN internal.authorized_users au ON je.created_by = au.id
  LEFT JOIN accounting.journal_entry_lines jel ON jel.journal_entry_id = je.id
  WHERE 
    (p_start_date IS NULL OR je.entry_date >= p_start_date)
    AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
    AND (p_entry_type IS NULL OR je.entry_type = p_entry_type)
    AND (p_project_id IS NULL OR je.project_id = p_project_id)
  GROUP BY je.id, je.entry_number, je.entry_date, je.entry_type, je.description, 
           je.reference_id, je.reference_type, je.project_id, p.title, 
           je.is_locked, au.full_name, je.created_at
  ORDER BY je.entry_date DESC, je.entry_number DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Comentarios
COMMENT ON FUNCTION accounting.get_balance_sheet IS 'Obtiene el balance de situación a una fecha determinada';
COMMENT ON FUNCTION accounting.get_profit_loss IS 'Obtiene la cuenta de resultados para un período';
COMMENT ON FUNCTION accounting.get_client_balances IS 'Obtiene los saldos por cliente (cuenta 430000)';
COMMENT ON FUNCTION accounting.get_supplier_technician_balances IS 'Obtiene los saldos por proveedor/técnico (cuentas 400000 y 410000)';
COMMENT ON FUNCTION accounting.get_vat_summary IS 'Obtiene resumen de IVA repercutido vs soportado';
COMMENT ON FUNCTION accounting.get_irpf_summary IS 'Obtiene el IRPF acumulado';
COMMENT ON FUNCTION accounting.list_journal_entries IS 'Lista asientos contables con filtros';
