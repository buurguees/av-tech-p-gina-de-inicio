-- =====================================================
-- Fix: Aprobación de nóminas y registro de pagos
-- 1. payroll_payments: añadir company_bank_account_id
-- 2. create_payroll_payment_entry: corregir bug net_amount + usar banco correcto
-- 3. create_partner_compensation_entry: usar PAYROLL_PARTNER (como create_payroll_entry)
-- 4. create_payroll_payment: añadir p_company_bank_account_id
-- =====================================================

-- 1. Añadir company_bank_account_id a payroll_payments PRIMERO
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'accounting' AND table_name = 'payroll_payments' AND column_name = 'company_bank_account_id'
  ) THEN
    ALTER TABLE accounting.payroll_payments ADD COLUMN company_bank_account_id UUID REFERENCES internal.company_bank_accounts(id);
  END IF;
END $$;

-- 2. Corregir create_payroll_payment_entry: bug net_amount + banco correcto
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
  v_account_bank TEXT;
  v_amount NUMERIC(12,2);
  v_user_id UUID;
  v_description TEXT;
  v_net_amount NUMERIC(12,2);
BEGIN
  SELECT 
    pp.id, pp.payment_number, pp.payroll_run_id, pp.partner_compensation_run_id,
    pp.amount, pp.payment_date, pp.created_by, pp.company_bank_account_id
  INTO v_payment
  FROM accounting.payroll_payments pp
  WHERE pp.id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago no encontrado: %', p_payment_id;
  END IF;
  
  v_amount := v_payment.amount;
  v_user_id := v_payment.created_by;
  
  -- Obtener cuenta bancaria: la del pago o 572000 por defecto
  IF v_payment.company_bank_account_id IS NOT NULL THEN
    SELECT accounting_code INTO v_account_bank
    FROM internal.company_bank_accounts
    WHERE id = v_payment.company_bank_account_id AND is_active = TRUE;
  END IF;
  IF v_account_bank IS NULL THEN
    v_account_bank := '572000';
  END IF;
  
  IF v_payment.payroll_run_id IS NOT NULL THEN
    SELECT payroll_number, net_amount INTO v_payroll.payroll_number, v_net_amount
    FROM accounting.payroll_runs WHERE id = v_payment.payroll_run_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Nómina no encontrada: %', v_payment.payroll_run_id; END IF;
    v_description := 'Pago nómina: ' || v_payroll.payroll_number;
  ELSIF v_payment.partner_compensation_run_id IS NOT NULL THEN
    SELECT compensation_number, net_amount INTO v_compensation.compensation_number, v_net_amount
    FROM accounting.partner_compensation_runs WHERE id = v_payment.partner_compensation_run_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Retribución no encontrada: %', v_payment.partner_compensation_run_id; END IF;
    v_description := 'Pago retribución: ' || v_compensation.compensation_number;
  ELSE
    RAISE EXCEPTION 'El pago debe estar asociado a una nómina o retribución';
  END IF;
  
  v_entry_number := (SELECT accounting.get_next_entry_number());
  
  INSERT INTO accounting.journal_entries (entry_number, entry_date, entry_type, description, reference_id, reference_type, created_by)
  VALUES (v_entry_number, p_entry_date, 'PAYMENT_MADE'::accounting.journal_entry_type, v_description, v_payment.id, 'payroll_payment', v_user_id)
  RETURNING id INTO v_entry_id;
  
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_credit, amount, description, line_order)
  VALUES (v_entry_id, v_account_pending, 'DEBIT', v_amount, v_description, 1);
  
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_credit, amount, description, line_order)
  VALUES (v_entry_id, v_account_bank, 'CREDIT', v_amount, 'Pago ' || v_payment.payment_number, 2);
  
  UPDATE accounting.payroll_payments SET journal_entry_id = v_entry_id, updated_at = now() WHERE id = p_payment_id;
  
  -- Actualizar estado a PAID si está completamente pagado (usando v_net_amount)
  IF v_payment.payroll_run_id IS NOT NULL THEN
    UPDATE accounting.payroll_runs SET status = 'PAID', updated_at = now()
    WHERE id = v_payment.payroll_run_id
      AND (SELECT COALESCE(SUM(amount), 0) FROM accounting.payroll_payments WHERE payroll_run_id = v_payment.payroll_run_id) >= v_net_amount;
    UPDATE accounting.payroll_runs SET status = 'PARTIAL', updated_at = now()
    WHERE id = v_payment.payroll_run_id AND status != 'PAID';
  END IF;
  
  IF v_payment.partner_compensation_run_id IS NOT NULL THEN
    UPDATE accounting.partner_compensation_runs SET status = 'PAID', updated_at = now()
    WHERE id = v_payment.partner_compensation_run_id
      AND (SELECT COALESCE(SUM(amount), 0) FROM accounting.payroll_payments WHERE partner_compensation_run_id = v_payment.partner_compensation_run_id) >= v_net_amount;
    UPDATE accounting.partner_compensation_runs SET status = 'PARTIAL', updated_at = now()
    WHERE id = v_payment.partner_compensation_run_id AND status != 'PAID';
  END IF;
  
  RETURN v_entry_id;
END;
$$;

-- 3. Actualizar create_payroll_payment para aceptar company_bank_account_id
DROP FUNCTION IF EXISTS accounting.create_payroll_payment(NUMERIC, UUID, UUID, DATE, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION accounting.create_payroll_payment(
  p_amount NUMERIC(12,2),
  p_payroll_run_id UUID DEFAULT NULL,
  p_partner_compensation_run_id UUID DEFAULT NULL,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_payment_method TEXT DEFAULT 'TRANSFER',
  p_bank_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_company_bank_account_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, internal
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
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;
  
  IF p_payroll_run_id IS NULL AND p_partner_compensation_run_id IS NULL THEN
    RAISE EXCEPTION 'Debe proporcionarse una nómina o retribución';
  END IF;
  
  v_year := EXTRACT(YEAR FROM p_payment_date);
  v_month := EXTRACT(MONTH FROM p_payment_date);
  v_day := EXTRACT(DAY FROM p_payment_date);
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 16 FOR 4) AS INTEGER)), 0) + 1
  INTO v_number
  FROM accounting.payroll_payments
  WHERE payment_number LIKE 'PAG-NOM-' || v_year || LPAD(v_month::TEXT, 2, '0') || LPAD(v_day::TEXT, 2, '0') || '-%';
  
  v_payment_number := 'PAG-NOM-' || v_year || LPAD(v_month::TEXT, 2, '0') || LPAD(v_day::TEXT, 2, '0') || '-' || LPAD(v_number::TEXT, 4, '0');
  
  INSERT INTO accounting.payroll_payments (
    payment_number, payroll_run_id, partner_compensation_run_id,
    payment_date, amount, payment_method, bank_reference, notes,
    company_bank_account_id, created_by
  ) VALUES (
    v_payment_number, p_payroll_run_id, p_partner_compensation_run_id,
    p_payment_date, p_amount, p_payment_method, p_bank_reference, p_notes,
    p_company_bank_account_id, v_user_id
  ) RETURNING id INTO v_payment_id;
  
  PERFORM accounting.create_payroll_payment_entry(v_payment_id, p_payment_date);
  
  RETURN v_payment_id;
END;
$$;

-- 3b. Actualizar wrapper público create_payroll_payment
DROP FUNCTION IF EXISTS public.create_payroll_payment(NUMERIC, UUID, UUID, DATE, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.create_payroll_payment(
  p_amount NUMERIC(12,2),
  p_payroll_run_id UUID DEFAULT NULL,
  p_partner_compensation_run_id UUID DEFAULT NULL,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_payment_method TEXT DEFAULT 'TRANSFER',
  p_bank_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_company_bank_account_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, internal, public
AS $$
BEGIN
  RETURN accounting.create_payroll_payment(
    p_amount, p_payroll_run_id, p_partner_compensation_run_id,
    p_payment_date, p_payment_method, p_bank_reference, p_notes,
    p_company_bank_account_id
  );
END;
$$;

-- 4. Añadir PAYROLL_PARTNER al enum (PostgreSQL 9.1+)
ALTER TYPE accounting.journal_entry_type ADD VALUE IF NOT EXISTS 'PAYROLL_PARTNER';

-- 5. Permitir aprobar nóminas a usuarios autorizados (no solo admin)
CREATE OR REPLACE FUNCTION accounting.post_payroll_run(p_payroll_run_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = accounting, internal AS $$
DECLARE v_entry_id UUID; v_status TEXT; v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuario no autorizado'; END IF;
  SELECT status INTO v_status FROM accounting.payroll_runs WHERE id = p_payroll_run_id;
  IF v_status != 'DRAFT' THEN RAISE EXCEPTION 'Solo se pueden postear nóminas en estado DRAFT. Estado actual: %', v_status; END IF;
  v_entry_id := accounting.create_payroll_entry(p_payroll_run_id);
  RETURN v_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION accounting.post_partner_compensation_run(p_compensation_run_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = accounting, internal AS $$
DECLARE v_entry_id UUID; v_status TEXT; v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuario no autorizado'; END IF;
  SELECT status INTO v_status FROM accounting.partner_compensation_runs WHERE id = p_compensation_run_id;
  IF v_status != 'DRAFT' THEN RAISE EXCEPTION 'Solo se pueden postear retribuciones en estado DRAFT. Estado actual: %', v_status; END IF;
  v_entry_id := accounting.create_partner_compensation_entry(p_compensation_run_id);
  RETURN v_entry_id;
END;
$$;

-- 6. Corregir create_partner_compensation_entry: usar PAYROLL_PARTNER (como create_payroll_entry)
CREATE OR REPLACE FUNCTION accounting.create_partner_compensation_entry(
  p_compensation_run_id UUID,
  p_entry_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'accounting', 'internal'
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_compensation RECORD;
  v_partner RECORD;
  v_account_salary TEXT := '640000';
  v_account_pending TEXT := '465000';
  v_account_irpf TEXT := '475100';
  v_gross_amount NUMERIC(12,2);
  v_irpf_amount NUMERIC(12,2);
  v_net_amount NUMERIC(12,2);
  v_user_id UUID;
BEGIN
  SELECT pcr.id, pcr.compensation_number, pcr.partner_id, pcr.gross_amount, pcr.irpf_amount, pcr.net_amount, pcr.created_by
  INTO v_compensation FROM accounting.partner_compensation_runs pcr WHERE pcr.id = p_compensation_run_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Retribución no encontrada: %', p_compensation_run_id; END IF;
  
  SELECT p.id, p.partner_number, p.full_name INTO v_partner
  FROM internal.partners p WHERE p.id = v_compensation.partner_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Socio no encontrado: %', v_compensation.partner_id; END IF;
  
  v_gross_amount := v_compensation.gross_amount;
  v_irpf_amount := v_compensation.irpf_amount;
  v_net_amount := v_compensation.net_amount;
  v_user_id := v_compensation.created_by;
  
  v_entry_number := (SELECT accounting.get_next_entry_number());
  
  INSERT INTO accounting.journal_entries (entry_number, entry_date, entry_type, description, reference_id, reference_type, created_by)
  VALUES (v_entry_number, p_entry_date, 'PAYROLL_PARTNER'::accounting.journal_entry_type,
    'Retribución socio: ' || v_compensation.compensation_number || ' - ' || v_partner.full_name,
    v_compensation.id, 'partner_compensation', v_user_id)
  RETURNING id INTO v_entry_id;
  
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_credit, amount, description, line_order)
  VALUES (v_entry_id, v_account_salary, 'DEBIT', v_gross_amount, 'Retribución ' || v_compensation.compensation_number || ' - ' || v_partner.full_name, 1);
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_credit, amount, description, line_order)
  VALUES (v_entry_id, v_account_pending, 'CREDIT', v_net_amount, 'Neto a pagar retribución ' || v_compensation.compensation_number, 2);
  IF v_irpf_amount > 0 THEN
    INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_credit, amount, description, line_order)
    VALUES (v_entry_id, v_account_irpf, 'CREDIT', v_irpf_amount, 'Retención IRPF retribución ' || v_compensation.compensation_number, 3);
  END IF;
  
  UPDATE accounting.partner_compensation_runs SET journal_entry_id = v_entry_id, status = 'POSTED', updated_at = now() WHERE id = p_compensation_run_id;
  RETURN v_entry_id;
END;
$$;

-- 7. Crear/actualizar pay_partner_compensation_run: wrapper que usa create_payroll_payment con banco
CREATE OR REPLACE FUNCTION public.pay_partner_compensation_run(
  p_compensation_run_id UUID,
  p_bank_account_id UUID,
  p_bank_name TEXT,
  p_amount NUMERIC(12,2),
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_payment_method TEXT DEFAULT 'TRANSFER',
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(entry_id UUID, entry_number TEXT, payment_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, internal, public
AS $$
DECLARE
  v_payment_id UUID;
  v_entry_id UUID;
  v_entry_number TEXT;
BEGIN
  v_payment_id := accounting.create_payroll_payment(
    p_amount,
    NULL,
    p_compensation_run_id,
    p_payment_date,
    p_payment_method,
    NULL,
    p_notes,
    p_bank_account_id
  );
  SELECT je.id, je.entry_number INTO v_entry_id, v_entry_number
  FROM accounting.payroll_payments pp
  JOIN accounting.journal_entries je ON pp.journal_entry_id = je.id
  WHERE pp.id = v_payment_id;
  RETURN QUERY SELECT v_entry_id, v_entry_number, v_payment_id;
END;
$$;
