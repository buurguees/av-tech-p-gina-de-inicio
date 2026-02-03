-- ============================================
-- FUNCIONES RPC PARA GESTIÓN DE NÓMINAS Y RETRIBUCIONES
-- ============================================

-- 1. FUNCIÓN: Crear nómina de empleado
CREATE OR REPLACE FUNCTION accounting.create_payroll_run(
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
SET search_path = accounting, internal
AS $$
DECLARE
  v_payroll_id UUID;
  v_payroll_number TEXT;
  v_irpf_amount NUMERIC(12,2);
  v_net_amount NUMERIC(12,2);
  v_user_id UUID;
BEGIN
  -- Verificar que el usuario es admin
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden crear nóminas';
  END IF;
  
  -- Obtener usuario actual
  SELECT auth.uid() INTO v_user_id;
  
  -- Validar que no existe nómina para este período y empleado
  IF EXISTS (
    SELECT 1 FROM accounting.payroll_runs
    WHERE employee_id = p_employee_id
      AND period_year = p_period_year
      AND period_month = p_period_month
      AND status != 'CANCELLED'
  ) THEN
    RAISE EXCEPTION 'Ya existe una nómina para este empleado en el período %/%', p_period_year, p_period_month;
  END IF;
  
  -- Calcular IRPF y neto
  v_irpf_amount := p_gross_amount * (p_irpf_rate / 100);
  v_net_amount := p_gross_amount - v_irpf_amount;
  
  -- Generar número de nómina
  v_payroll_number := accounting.get_next_payroll_number();
  
  -- Crear nómina
  INSERT INTO accounting.payroll_runs (
    payroll_number,
    period_year,
    period_month,
    employee_id,
    gross_amount,
    irpf_rate,
    irpf_amount,
    net_amount,
    notes,
    created_by
  ) VALUES (
    v_payroll_number,
    p_period_year,
    p_period_month,
    p_employee_id,
    p_gross_amount,
    p_irpf_rate,
    v_irpf_amount,
    v_net_amount,
    p_notes,
    v_user_id
  ) RETURNING id INTO v_payroll_id;
  
  RETURN v_payroll_id;
END;
$$;

-- 2. FUNCIÓN: Postear nómina (genera asiento)
CREATE OR REPLACE FUNCTION accounting.post_payroll_run(
  p_payroll_run_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting
AS $$
DECLARE
  v_entry_id UUID;
  v_status TEXT;
BEGIN
  -- Verificar que el usuario es admin
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden postear nóminas';
  END IF;
  
  -- Verificar estado
  SELECT status INTO v_status
  FROM accounting.payroll_runs
  WHERE id = p_payroll_run_id;
  
  IF v_status != 'DRAFT' THEN
    RAISE EXCEPTION 'Solo se pueden postear nóminas en estado DRAFT. Estado actual: %', v_status;
  END IF;
  
  -- Generar asiento
  v_entry_id := accounting.create_payroll_entry(p_payroll_run_id);
  
  RETURN v_entry_id;
END;
$$;

-- 3. FUNCIÓN: Crear retribución de socio
CREATE OR REPLACE FUNCTION accounting.create_partner_compensation_run(
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
SET search_path = accounting, internal
AS $$
DECLARE
  v_compensation_id UUID;
  v_compensation_number TEXT;
  v_irpf_amount NUMERIC(12,2);
  v_net_amount NUMERIC(12,2);
  v_user_id UUID;
BEGIN
  -- Verificar que el usuario es admin
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden crear retribuciones';
  END IF;
  
  -- Obtener usuario actual
  SELECT auth.uid() INTO v_user_id;
  
  -- Validar que no existe retribución para este período y socio
  IF EXISTS (
    SELECT 1 FROM accounting.partner_compensation_runs
    WHERE partner_id = p_partner_id
      AND period_year = p_period_year
      AND period_month = p_period_month
      AND status != 'CANCELLED'
  ) THEN
    RAISE EXCEPTION 'Ya existe una retribución para este socio en el período %/%', p_period_year, p_period_month;
  END IF;
  
  -- Calcular IRPF y neto
  v_irpf_amount := p_gross_amount * (p_irpf_rate / 100);
  v_net_amount := p_gross_amount - v_irpf_amount;
  
  -- Generar número de retribución
  v_compensation_number := accounting.get_next_compensation_number();
  
  -- Crear retribución
  INSERT INTO accounting.partner_compensation_runs (
    compensation_number,
    period_year,
    period_month,
    partner_id,
    gross_amount,
    irpf_rate,
    irpf_amount,
    net_amount,
    notes,
    created_by
  ) VALUES (
    v_compensation_number,
    p_period_year,
    p_period_month,
    p_partner_id,
    p_gross_amount,
    p_irpf_rate,
    v_irpf_amount,
    v_net_amount,
    p_notes,
    v_user_id
  ) RETURNING id INTO v_compensation_id;
  
  RETURN v_compensation_id;
END;
$$;

-- 4. FUNCIÓN: Postear retribución (genera asiento)
CREATE OR REPLACE FUNCTION accounting.post_partner_compensation_run(
  p_compensation_run_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting
AS $$
DECLARE
  v_entry_id UUID;
  v_status TEXT;
BEGIN
  -- Verificar que el usuario es admin
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden postear retribuciones';
  END IF;
  
  -- Verificar estado
  SELECT status INTO v_status
  FROM accounting.partner_compensation_runs
  WHERE id = p_compensation_run_id;
  
  IF v_status != 'DRAFT' THEN
    RAISE EXCEPTION 'Solo se pueden postear retribuciones en estado DRAFT. Estado actual: %', v_status;
  END IF;
  
  -- Generar asiento
  v_entry_id := accounting.create_partner_compensation_entry(p_compensation_run_id);
  
  RETURN v_entry_id;
END;
$$;

-- 5. FUNCIÓN: Registrar pago de nómina/retribución
CREATE OR REPLACE FUNCTION accounting.create_payroll_payment(
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
SET search_path = accounting
AS $$
DECLARE
  v_payment_id UUID;
  v_payment_number TEXT;
  v_user_id UUID;
  v_year INTEGER;
  v_month INTEGER;
  v_day INTEGER;
  v_number INTEGER;
BEGIN
  -- Verificar que el usuario es admin
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden registrar pagos';
  END IF;
  
  -- Validar que se proporcione una fuente
  IF p_payroll_run_id IS NULL AND p_partner_compensation_run_id IS NULL THEN
    RAISE EXCEPTION 'Debe proporcionarse una nómina o retribución';
  END IF;
  
  -- Obtener usuario actual
  SELECT auth.uid() INTO v_user_id;
  
  -- Generar número de pago
  v_year := EXTRACT(YEAR FROM p_payment_date);
  v_month := EXTRACT(MONTH FROM p_payment_date);
  v_day := EXTRACT(DAY FROM p_payment_date);
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 16 FOR 4) AS INTEGER)), 0) + 1
  INTO v_number
  FROM accounting.payroll_payments
  WHERE payment_number LIKE 'PAG-NOM-' || v_year || LPAD(v_month::TEXT, 2, '0') || LPAD(v_day::TEXT, 2, '0') || '-%';
  
  v_payment_number := 'PAG-NOM-' || v_year || LPAD(v_month::TEXT, 2, '0') || LPAD(v_day::TEXT, 2, '0') || '-' || LPAD(v_number::TEXT, 4, '0');
  
  -- Crear pago
  INSERT INTO accounting.payroll_payments (
    payment_number,
    payroll_run_id,
    partner_compensation_run_id,
    payment_date,
    amount,
    payment_method,
    bank_reference,
    notes,
    created_by
  ) VALUES (
    v_payment_number,
    p_payroll_run_id,
    p_partner_compensation_run_id,
    p_payment_date,
    p_amount,
    p_payment_method,
    p_bank_reference,
    p_notes,
    v_user_id
  ) RETURNING id INTO v_payment_id;
  
  -- Generar asiento automáticamente
  PERFORM accounting.create_payroll_payment_entry(v_payment_id, p_payment_date);
  
  RETURN v_payment_id;
END;
$$;

-- 6. FUNCIÓN: Listar nóminas
CREATE OR REPLACE FUNCTION accounting.list_payroll_runs(
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
SET search_path = accounting, internal
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.payroll_number,
    pr.period_year,
    pr.period_month,
    pr.employee_id,
    e.employee_number,
    e.full_name,
    pr.gross_amount,
    pr.irpf_rate,
    pr.irpf_amount,
    pr.net_amount,
    pr.status,
    pr.journal_entry_id,
    je.entry_number,
    pr.created_at
  FROM accounting.payroll_runs pr
  JOIN internal.employees e ON pr.employee_id = e.id
  LEFT JOIN accounting.journal_entries je ON pr.journal_entry_id = je.id
  WHERE 
    (p_period_year IS NULL OR pr.period_year = p_period_year)
    AND (p_period_month IS NULL OR pr.period_month = p_period_month)
    AND (p_employee_id IS NULL OR pr.employee_id = p_employee_id)
    AND (p_status IS NULL OR pr.status = p_status)
  ORDER BY pr.period_year DESC, pr.period_month DESC, pr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 7. FUNCIÓN: Listar retribuciones
CREATE OR REPLACE FUNCTION accounting.list_partner_compensation_runs(
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
SET search_path = accounting, internal
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pcr.id,
    pcr.compensation_number,
    pcr.period_year,
    pcr.period_month,
    pcr.partner_id,
    p.partner_number,
    p.full_name,
    pcr.gross_amount,
    pcr.irpf_rate,
    pcr.irpf_amount,
    pcr.net_amount,
    pcr.status,
    pcr.journal_entry_id,
    je.entry_number,
    pcr.created_at
  FROM accounting.partner_compensation_runs pcr
  JOIN internal.partners p ON pcr.partner_id = p.id
  LEFT JOIN accounting.journal_entries je ON pcr.journal_entry_id = je.id
  WHERE 
    (p_period_year IS NULL OR pcr.period_year = p_period_year)
    AND (p_period_month IS NULL OR pcr.period_month = p_period_month)
    AND (p_partner_id IS NULL OR pcr.partner_id = p_partner_id)
    AND (p_status IS NULL OR pcr.status = p_status)
  ORDER BY pcr.period_year DESC, pcr.period_month DESC, pcr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 8. FUNCIÓN: Listar pagos
CREATE OR REPLACE FUNCTION accounting.list_payroll_payments(
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
SET search_path = accounting
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id,
    pp.payment_number,
    pp.payment_date,
    pp.amount,
    pp.payment_method,
    pp.bank_reference,
    pp.payroll_run_id,
    pr.payroll_number,
    pp.partner_compensation_run_id,
    pcr.compensation_number,
    pp.journal_entry_id,
    je.entry_number,
    pp.created_at
  FROM accounting.payroll_payments pp
  LEFT JOIN accounting.payroll_runs pr ON pp.payroll_run_id = pr.id
  LEFT JOIN accounting.partner_compensation_runs pcr ON pp.partner_compensation_run_id = pcr.id
  LEFT JOIN accounting.journal_entries je ON pp.journal_entry_id = je.id
  WHERE 
    (p_payroll_run_id IS NULL OR pp.payroll_run_id = p_payroll_run_id)
    AND (p_partner_compensation_run_id IS NULL OR pp.partner_compensation_run_id = p_partner_compensation_run_id)
    AND (p_start_date IS NULL OR pp.payment_date >= p_start_date)
    AND (p_end_date IS NULL OR pp.payment_date <= p_end_date)
  ORDER BY pp.payment_date DESC, pp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Comentarios
COMMENT ON FUNCTION accounting.create_payroll_run IS 'Crea una nómina de empleado en estado DRAFT';
COMMENT ON FUNCTION accounting.post_payroll_run IS 'Postea una nómina generando el asiento contable automáticamente';
COMMENT ON FUNCTION accounting.create_partner_compensation_run IS 'Crea una retribución de socio en estado DRAFT';
COMMENT ON FUNCTION accounting.post_partner_compensation_run IS 'Postea una retribución generando el asiento contable automáticamente';
COMMENT ON FUNCTION accounting.create_payroll_payment IS 'Registra un pago de nómina/retribución y genera el asiento automáticamente';
