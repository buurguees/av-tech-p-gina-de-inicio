-- ============================================
-- FUNCIONES PARA GENERAR ASIENTOS DE NÓMINAS Y RETRIBUCIONES
-- ============================================

-- 1. FUNCIÓN: Generar asiento desde nómina de empleado
CREATE OR REPLACE FUNCTION accounting.create_payroll_entry(
  p_payroll_run_id UUID,
  p_entry_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, internal
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_payroll RECORD;
  v_employee RECORD;
  v_account_salary TEXT := '640000';  -- O usar 640100 si se separa
  v_account_pending TEXT := '465000';
  v_account_irpf TEXT := '475100';
  v_gross_amount NUMERIC(12,2);
  v_irpf_amount NUMERIC(12,2);
  v_net_amount NUMERIC(12,2);
  v_user_id UUID;
BEGIN
  -- Obtener datos de la nómina
  SELECT 
    pr.id,
    pr.payroll_number,
    pr.employee_id,
    pr.gross_amount,
    pr.irpf_amount,
    pr.net_amount,
    pr.created_by
  INTO v_payroll
  FROM accounting.payroll_runs pr
  WHERE pr.id = p_payroll_run_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nómina no encontrada: %', p_payroll_run_id;
  END IF;
  
  -- Obtener datos del empleado
  SELECT 
    e.id,
    e.employee_number,
    e.full_name
  INTO v_employee
  FROM internal.employees e
  WHERE e.id = v_payroll.employee_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empleado no encontrado: %', v_payroll.employee_id;
  END IF;
  
  v_gross_amount := v_payroll.gross_amount;
  v_irpf_amount := v_payroll.irpf_amount;
  v_net_amount := v_payroll.net_amount;
  v_user_id := v_payroll.created_by;
  
  -- Generar número de asiento
  v_entry_number := accounting.get_next_entry_number();
  
  -- Crear asiento
  INSERT INTO accounting.journal_entries (
    entry_number,
    entry_date,
    entry_type,
    description,
    reference_id,
    reference_type,
    created_by
  ) VALUES (
    v_entry_number,
    p_entry_date,
    'MANUAL',
    'Nómina: ' || v_payroll.payroll_number || ' - ' || v_employee.full_name,
    v_payroll.id,
    'payroll',
    v_user_id
  ) RETURNING id INTO v_entry_id;
  
  -- DEBE: Sueldos y salarios (640000)
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    v_account_salary,
    'DEBIT',
    v_gross_amount,
    'Nómina ' || v_payroll.payroll_number || ' - ' || v_employee.full_name,
    1
  );
  
  -- HABER: Remuneraciones pendientes (465000)
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    v_account_pending,
    'CREDIT',
    v_net_amount,
    'Neto a pagar nómina ' || v_payroll.payroll_number,
    2
  );
  
  -- HABER: HP retenciones IRPF (475100) - si hay IRPF
  IF v_irpf_amount > 0 THEN
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id,
      account_code,
      debit_credit,
      amount,
      description,
      line_order
    ) VALUES (
      v_entry_id,
      v_account_irpf,
      'CREDIT',
      v_irpf_amount,
      'Retención IRPF nómina ' || v_payroll.payroll_number,
      3
    );
  END IF;
  
  -- Actualizar nómina con el asiento generado
  UPDATE accounting.payroll_runs
  SET journal_entry_id = v_entry_id,
      status = 'POSTED',
      updated_at = now()
  WHERE id = p_payroll_run_id;
  
  RETURN v_entry_id;
END;
$$;

-- 2. FUNCIÓN: Generar asiento desde retribución de socio
CREATE OR REPLACE FUNCTION accounting.create_partner_compensation_entry(
  p_compensation_run_id UUID,
  p_entry_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, internal
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_compensation RECORD;
  v_partner RECORD;
  v_account_salary TEXT := '640000';  -- O usar 640200 si se separa
  v_account_pending TEXT := '465000';
  v_account_irpf TEXT := '475100';
  v_gross_amount NUMERIC(12,2);
  v_irpf_amount NUMERIC(12,2);
  v_net_amount NUMERIC(12,2);
  v_user_id UUID;
BEGIN
  -- Obtener datos de la retribución
  SELECT 
    pcr.id,
    pcr.compensation_number,
    pcr.partner_id,
    pcr.gross_amount,
    pcr.irpf_amount,
    pcr.net_amount,
    pcr.created_by
  INTO v_compensation
  FROM accounting.partner_compensation_runs pcr
  WHERE pcr.id = p_compensation_run_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retribución no encontrada: %', p_compensation_run_id;
  END IF;
  
  -- Obtener datos del socio
  SELECT 
    p.id,
    p.partner_number,
    p.full_name
  INTO v_partner
  FROM internal.partners p
  WHERE p.id = v_compensation.partner_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Socio no encontrado: %', v_compensation.partner_id;
  END IF;
  
  v_gross_amount := v_compensation.gross_amount;
  v_irpf_amount := v_compensation.irpf_amount;
  v_net_amount := v_compensation.net_amount;
  v_user_id := v_compensation.created_by;
  
  -- Generar número de asiento
  v_entry_number := accounting.get_next_entry_number();
  
  -- Crear asiento
  INSERT INTO accounting.journal_entries (
    entry_number,
    entry_date,
    entry_type,
    description,
    reference_id,
    reference_type,
    created_by
  ) VALUES (
    v_entry_number,
    p_entry_date,
    'MANUAL',
    'Retribución socio: ' || v_compensation.compensation_number || ' - ' || v_partner.full_name,
    v_compensation.id,
    'partner_compensation',
    v_user_id
  ) RETURNING id INTO v_entry_id;
  
  -- DEBE: Sueldos y salarios (640000 o 640200)
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    v_account_salary,
    'DEBIT',
    v_gross_amount,
    'Retribución ' || v_compensation.compensation_number || ' - ' || v_partner.full_name,
    1
  );
  
  -- HABER: Remuneraciones pendientes (465000)
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    v_account_pending,
    'CREDIT',
    v_net_amount,
    'Neto a pagar retribución ' || v_compensation.compensation_number,
    2
  );
  
  -- HABER: HP retenciones IRPF (475100) - si hay IRPF
  IF v_irpf_amount > 0 THEN
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id,
      account_code,
      debit_credit,
      amount,
      description,
      line_order
    ) VALUES (
      v_entry_id,
      v_account_irpf,
      'CREDIT',
      v_irpf_amount,
      'Retención IRPF retribución ' || v_compensation.compensation_number,
      3
    );
  END IF;
  
  -- Actualizar retribución con el asiento generado
  UPDATE accounting.partner_compensation_runs
  SET journal_entry_id = v_entry_id,
      status = 'POSTED',
      updated_at = now()
  WHERE id = p_compensation_run_id;
  
  RETURN v_entry_id;
END;
$$;

-- 3. FUNCIÓN: Generar asiento de pago de nómina/retribución
CREATE OR REPLACE FUNCTION accounting.create_payroll_payment_entry(
  p_payment_id UUID,
  p_entry_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, internal
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_payment RECORD;
  v_payroll RECORD;
  v_compensation RECORD;
  v_account_pending TEXT := '465000';
  v_account_bank TEXT := '572000';
  v_amount NUMERIC(12,2);
  v_user_id UUID;
  v_description TEXT;
BEGIN
  -- Obtener datos del pago
  SELECT 
    pp.id,
    pp.payment_number,
    pp.payroll_run_id,
    pp.partner_compensation_run_id,
    pp.amount,
    pp.payment_date,
    pp.created_by
  INTO v_payment
  FROM accounting.payroll_payments pp
  WHERE pp.id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago no encontrado: %', p_payment_id;
  END IF;
  
  v_amount := v_payment.amount;
  v_user_id := v_payment.created_by;
  
  -- Determinar si es nómina o retribución
  IF v_payment.payroll_run_id IS NOT NULL THEN
    SELECT payroll_number INTO v_payroll.payroll_number
    FROM accounting.payroll_runs
    WHERE id = v_payment.payroll_run_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Nómina no encontrada: %', v_payment.payroll_run_id;
    END IF;
    
    v_description := 'Pago nómina: ' || v_payroll.payroll_number;
    
  ELSIF v_payment.partner_compensation_run_id IS NOT NULL THEN
    SELECT compensation_number INTO v_compensation.compensation_number
    FROM accounting.partner_compensation_runs
    WHERE id = v_payment.partner_compensation_run_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Retribución no encontrada: %', v_payment.partner_compensation_run_id;
    END IF;
    
    v_description := 'Pago retribución: ' || v_compensation.compensation_number;
  ELSE
    RAISE EXCEPTION 'El pago debe estar asociado a una nómina o retribución';
  END IF;
  
  -- Generar número de asiento
  v_entry_number := accounting.get_next_entry_number();
  
  -- Crear asiento
  INSERT INTO accounting.journal_entries (
    entry_number,
    entry_date,
    entry_type,
    description,
    reference_id,
    reference_type,
    created_by
  ) VALUES (
    v_entry_number,
    p_entry_date,
    'PAYMENT_MADE',
    v_description,
    v_payment.id,
    'payroll_payment',
    v_user_id
  ) RETURNING id INTO v_entry_id;
  
  -- DEBE: Remuneraciones pendientes (465000)
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    v_account_pending,
    'DEBIT',
    v_amount,
    v_description,
    1
  );
  
  -- HABER: Banco (572000)
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    v_account_bank,
    'CREDIT',
    v_amount,
    'Pago ' || v_payment.payment_number,
    2
  );
  
  -- Actualizar pago con el asiento generado
  UPDATE accounting.payroll_payments
  SET journal_entry_id = v_entry_id,
      updated_at = now()
  WHERE id = p_payment_id;
  
  -- Actualizar estado de nómina/retribución si está completamente pagada
  IF v_payment.payroll_run_id IS NOT NULL THEN
    UPDATE accounting.payroll_runs
    SET status = 'PAID',
        updated_at = now()
    WHERE id = v_payment.payroll_run_id
      AND (SELECT COALESCE(SUM(amount), 0) FROM accounting.payroll_payments WHERE payroll_run_id = v_payment.payroll_run_id) >= net_amount;
  END IF;
  
  IF v_payment.partner_compensation_run_id IS NOT NULL THEN
    UPDATE accounting.partner_compensation_runs
    SET status = 'PAID',
        updated_at = now()
    WHERE id = v_payment.partner_compensation_run_id
      AND (SELECT COALESCE(SUM(amount), 0) FROM accounting.payroll_payments WHERE partner_compensation_run_id = v_payment.partner_compensation_run_id) >= net_amount;
  END IF;
  
  RETURN v_entry_id;
END;
$$;

-- 4. FUNCIÓN: Validar que la nómina/retribución esté en estado POSTED antes de pagar
CREATE OR REPLACE FUNCTION accounting.validate_payroll_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status TEXT;
BEGIN
  -- Validar estado de la nómina/retribución
  IF NEW.payroll_run_id IS NOT NULL THEN
    SELECT status INTO v_status
    FROM accounting.payroll_runs
    WHERE id = NEW.payroll_run_id;
    
    IF v_status != 'POSTED' THEN
      RAISE EXCEPTION 'No se puede pagar una nómina que no esté en estado POSTED';
    END IF;
  END IF;
  
  IF NEW.partner_compensation_run_id IS NOT NULL THEN
    SELECT status INTO v_status
    FROM accounting.partner_compensation_runs
    WHERE id = NEW.partner_compensation_run_id;
    
    IF v_status != 'POSTED' THEN
      RAISE EXCEPTION 'No se puede pagar una retribución que no esté en estado POSTED';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. TRIGGER: Validar antes de insertar pago
CREATE TRIGGER trigger_validate_payroll_payment
  BEFORE INSERT ON accounting.payroll_payments
  FOR EACH ROW
  EXECUTE FUNCTION accounting.validate_payroll_payment();

-- Comentarios
COMMENT ON FUNCTION accounting.create_payroll_entry IS 'Genera automáticamente el asiento contable al postear una nómina de empleado';
COMMENT ON FUNCTION accounting.create_partner_compensation_entry IS 'Genera automáticamente el asiento contable al postear una retribución de socio';
COMMENT ON FUNCTION accounting.create_payroll_payment_entry IS 'Genera automáticamente el asiento contable al registrar un pago de nómina/retribución';
