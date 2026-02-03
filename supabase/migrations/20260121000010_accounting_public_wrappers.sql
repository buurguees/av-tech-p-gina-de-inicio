-- ============================================
-- FUNCIONES RPC PÚBLICAS PARA EXPONER ACCOUNTING
-- ============================================

-- 1. Wrapper: get_balance_sheet
CREATE OR REPLACE FUNCTION public.get_balance_sheet(
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
SET search_path = accounting, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM accounting.get_balance_sheet(p_as_of_date);
END;
$$;

-- 2. Wrapper: get_profit_loss
CREATE OR REPLACE FUNCTION public.get_profit_loss(
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
SET search_path = accounting, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM accounting.get_profit_loss(p_period_start, p_period_end);
END;
$$;

-- 3. Wrapper: get_client_balances (actualizar si existe)
DROP FUNCTION IF EXISTS public.get_client_balances(DATE);
CREATE OR REPLACE FUNCTION public.get_client_balances(
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  client_id TEXT,
  client_number TEXT,
  client_name TEXT,
  debit_balance NUMERIC(12,2),
  credit_balance NUMERIC(12,2),
  net_balance NUMERIC(12,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, crm, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id::TEXT,
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

-- 4. Wrapper: get_supplier_technician_balances (actualizar si existe)
DROP FUNCTION IF EXISTS public.get_supplier_technician_balances(DATE);
CREATE OR REPLACE FUNCTION public.get_supplier_technician_balances(
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  third_party_id TEXT,
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
SET search_path = accounting, internal, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id::TEXT,
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
  
  SELECT 
    t.id::TEXT,
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

-- 5. Wrapper: get_vat_summary
CREATE OR REPLACE FUNCTION public.get_vat_summary(
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
SET search_path = accounting, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM accounting.get_vat_summary(p_period_start, p_period_end);
END;
$$;

-- 6. Wrapper: get_irpf_summary (actualizar si existe)
DROP FUNCTION IF EXISTS public.get_irpf_summary(date, date);
CREATE OR REPLACE FUNCTION public.get_irpf_summary(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS NUMERIC(12,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, public
AS $$
DECLARE
  v_irpf NUMERIC(12,2) := 0;
  v_period_filter TEXT;
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
  
  RETURN v_irpf;
END;
$$;

-- 7. Wrapper: get_corporate_tax_summary
CREATE OR REPLACE FUNCTION public.get_corporate_tax_summary(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  profit_before_tax NUMERIC(12,2),
  tax_rate NUMERIC(5,2),
  tax_amount NUMERIC(12,2),
  provision_entry_id UUID,
  provision_entry_number TEXT,
  provision_date DATE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM accounting.get_corporate_tax_summary(p_period_start, p_period_end);
END;
$$;

-- 8. Wrapper: list_journal_entries (actualizar para coincidir con firma existente)
DROP FUNCTION IF EXISTS public.list_journal_entries(date, date, text, text, uuid, text, integer, integer);
CREATE OR REPLACE FUNCTION public.list_journal_entries(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_entry_type TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
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
SET search_path = accounting, internal, public
AS $$
DECLARE
  v_entry_type_enum accounting.journal_entry_type;
BEGIN
  -- Convertir TEXT a enum si se proporciona
  IF p_entry_type IS NOT NULL THEN
    v_entry_type_enum := p_entry_type::accounting.journal_entry_type;
  END IF;
  
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
    AND (p_entry_type IS NULL OR je.entry_type = v_entry_type_enum)
    AND (p_reference_type IS NULL OR je.reference_type = p_reference_type)
    AND (p_project_id IS NULL OR je.project_id = p_project_id)
    AND (p_search IS NULL OR 
         je.description ILIKE '%' || p_search || '%' OR
         je.entry_number ILIKE '%' || p_search || '%')
  GROUP BY je.id, je.entry_number, je.entry_date, je.entry_type, je.description,
           je.reference_id, je.reference_type, je.project_id, p.title,
           je.is_locked, au.full_name, je.created_at
  ORDER BY je.entry_date DESC, je.entry_number DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 9. Wrapper: list_chart_of_accounts (actualizar si existe)
DROP FUNCTION IF EXISTS public.list_chart_of_accounts(text, boolean);
CREATE OR REPLACE FUNCTION public.list_chart_of_accounts(
  p_account_type TEXT DEFAULT NULL,
  p_only_active BOOLEAN DEFAULT true
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  is_active BOOLEAN,
  description TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    coa.account_code,
    coa.account_name,
    coa.account_type::TEXT,
    coa.is_active,
    coa.description
  FROM accounting.chart_of_accounts coa
  WHERE (p_account_type IS NULL OR coa.account_type::TEXT = p_account_type)
    AND (NOT p_only_active OR coa.is_active = true)
  ORDER BY coa.account_code;
END;
$$;

-- 10. Wrapper: list_payroll_runs
CREATE OR REPLACE FUNCTION public.list_payroll_runs(
  p_period_year INTEGER DEFAULT NULL,
  p_period_month INTEGER DEFAULT NULL,
  p_employee_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  payroll_number TEXT,
  period_year INTEGER,
  period_month INTEGER,
  employee_id UUID,
  employee_number TEXT,
  employee_name TEXT,
  gross_amount NUMERIC(12,2),
  irpf_rate NUMERIC(5,2),
  irpf_amount NUMERIC(12,2),
  net_amount NUMERIC(12,2),
  status TEXT,
  journal_entry_id UUID,
  journal_entry_number TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, internal, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM accounting.list_payroll_runs(
    p_period_year,
    p_period_month,
    p_employee_id,
    p_status,
    p_limit,
    p_offset
  );
END;
$$;

-- 11. Wrapper: list_partner_compensation_runs
CREATE OR REPLACE FUNCTION public.list_partner_compensation_runs(
  p_period_year INTEGER DEFAULT NULL,
  p_period_month INTEGER DEFAULT NULL,
  p_partner_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  compensation_number TEXT,
  period_year INTEGER,
  period_month INTEGER,
  partner_id UUID,
  partner_number TEXT,
  partner_name TEXT,
  gross_amount NUMERIC(12,2),
  irpf_rate NUMERIC(5,2),
  irpf_amount NUMERIC(12,2),
  net_amount NUMERIC(12,2),
  status TEXT,
  journal_entry_id UUID,
  journal_entry_number TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, internal, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM accounting.list_partner_compensation_runs(
    p_period_year,
    p_period_month,
    p_partner_id,
    p_status,
    p_limit,
    p_offset
  );
END;
$$;

-- 12. Wrapper: list_payroll_payments
CREATE OR REPLACE FUNCTION public.list_payroll_payments(
  p_payroll_run_id UUID DEFAULT NULL,
  p_partner_compensation_run_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  payment_number TEXT,
  payment_date DATE,
  amount NUMERIC(12,2),
  payment_method TEXT,
  bank_reference TEXT,
  payroll_run_id UUID,
  payroll_number TEXT,
  partner_compensation_run_id UUID,
  compensation_number TEXT,
  journal_entry_id UUID,
  journal_entry_number TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM accounting.list_payroll_payments(
    p_payroll_run_id,
    p_partner_compensation_run_id,
    p_start_date,
    p_end_date,
    p_limit,
    p_offset
  );
END;
$$;

-- 13. Wrapper: get_irpf_by_period
CREATE OR REPLACE FUNCTION public.get_irpf_by_period(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  period_year INTEGER,
  period_month INTEGER,
  total_irpf NUMERIC(12,2),
  payroll_count INTEGER,
  compensation_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM accounting.get_irpf_by_period(p_period_start, p_period_end);
END;
$$;

-- 14. Wrapper: get_irpf_by_person
CREATE OR REPLACE FUNCTION public.get_irpf_by_person(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  person_type TEXT,
  person_id UUID,
  person_number TEXT,
  person_name TEXT,
  total_irpf NUMERIC(12,2),
  total_gross NUMERIC(12,2),
  total_net NUMERIC(12,2),
  document_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, internal, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM accounting.get_irpf_by_person(p_period_start, p_period_end);
END;
$$;

-- 15. Wrapper: get_irpf_model_111_summary
CREATE OR REPLACE FUNCTION public.get_irpf_model_111_summary(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  total_irpf_accumulated NUMERIC(12,2),
  total_payroll_irpf NUMERIC(12,2),
  total_compensation_irpf NUMERIC(12,2),
  total_documents INTEGER,
  total_employees INTEGER,
  total_partners INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM accounting.get_irpf_model_111_summary(p_period_start, p_period_end);
END;
$$;

-- 16. Wrapper: create_payroll_run
CREATE OR REPLACE FUNCTION public.create_payroll_run(
  p_employee_id UUID,
  p_period_year INTEGER,
  p_period_month INTEGER,
  p_gross_amount NUMERIC(12,2),
  p_irpf_rate NUMERIC(5,2) DEFAULT 19.00,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, internal, public
AS $$
BEGIN
  RETURN accounting.create_payroll_run(
    p_employee_id,
    p_period_year,
    p_period_month,
    p_gross_amount,
    p_irpf_rate,
    p_notes
  );
END;
$$;

-- 17. Wrapper: post_payroll_run
CREATE OR REPLACE FUNCTION public.post_payroll_run(
  p_payroll_run_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, public
AS $$
BEGIN
  RETURN accounting.post_payroll_run(p_payroll_run_id);
END;
$$;

-- 18. Wrapper: create_partner_compensation_run
CREATE OR REPLACE FUNCTION public.create_partner_compensation_run(
  p_partner_id UUID,
  p_period_year INTEGER,
  p_period_month INTEGER,
  p_gross_amount NUMERIC(12,2),
  p_irpf_rate NUMERIC(5,2) DEFAULT 19.00,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, internal, public
AS $$
BEGIN
  RETURN accounting.create_partner_compensation_run(
    p_partner_id,
    p_period_year,
    p_period_month,
    p_gross_amount,
    p_irpf_rate,
    p_notes
  );
END;
$$;

-- 19. Wrapper: post_partner_compensation_run
CREATE OR REPLACE FUNCTION public.post_partner_compensation_run(
  p_compensation_run_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, public
AS $$
BEGIN
  RETURN accounting.post_partner_compensation_run(p_compensation_run_id);
END;
$$;

-- 20. Wrapper: create_payroll_payment
CREATE OR REPLACE FUNCTION public.create_payroll_payment(
  p_amount NUMERIC(12,2),
  p_payroll_run_id UUID DEFAULT NULL,
  p_partner_compensation_run_id UUID DEFAULT NULL,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_payment_method TEXT DEFAULT 'TRANSFER',
  p_bank_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, public
AS $$
BEGIN
  RETURN accounting.create_payroll_payment(
    p_amount,
    p_payroll_run_id,
    p_partner_compensation_run_id,
    p_payment_date,
    p_payment_method,
    p_bank_reference,
    p_notes
  );
END;
$$;

-- 21. Wrapper: list_employees (actualizar si existe)
DROP FUNCTION IF EXISTS public.list_employees(text);
CREATE OR REPLACE FUNCTION public.list_employees(
  p_status TEXT DEFAULT 'ACTIVE'
)
RETURNS TABLE (
  id UUID,
  employee_number TEXT,
  full_name TEXT,
  tax_id TEXT,
  email TEXT,
  phone TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = internal, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.employee_number,
    e.full_name,
    e.tax_id,
    e.email,
    e.phone,
    e.status,
    e.created_at
  FROM internal.employees e
  WHERE (p_status IS NULL OR e.status = p_status)
  ORDER BY e.full_name;
END;
$$;

-- 22. Wrapper: list_partners (actualizar si existe)
DROP FUNCTION IF EXISTS public.list_partners(text);
CREATE OR REPLACE FUNCTION public.list_partners(
  p_status TEXT DEFAULT 'ACTIVE'
)
RETURNS TABLE (
  id UUID,
  partner_number TEXT,
  full_name TEXT,
  tax_id TEXT,
  email TEXT,
  phone TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = internal, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.partner_number,
    p.full_name,
    p.tax_id,
    p.email,
    p.phone,
    p.status,
    p.created_at
  FROM internal.partners p
  WHERE (p_status IS NULL OR p.status = p_status)
  ORDER BY p.full_name;
END;
$$;

-- Comentarios
COMMENT ON FUNCTION public.get_balance_sheet IS 'Wrapper público para accounting.get_balance_sheet';
COMMENT ON FUNCTION public.get_profit_loss IS 'Wrapper público para accounting.get_profit_loss';
COMMENT ON FUNCTION public.list_journal_entries IS 'Wrapper público para accounting.list_journal_entries';
COMMENT ON FUNCTION public.list_chart_of_accounts IS 'Wrapper público para listar plan contable';
COMMENT ON FUNCTION public.list_employees IS 'Wrapper público para listar empleados';
COMMENT ON FUNCTION public.list_partners IS 'Wrapper público para listar socios';
