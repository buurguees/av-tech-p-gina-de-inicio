
-- =============================================
-- BLOQUE A: APLAZAME / FINANCIACIÓN EXTERNA
-- BLOQUE B: COMPRAS PAGADAS POR SOCIOS
-- =============================================

-- 1) NEW ENUM TYPES
CREATE TYPE accounting.credit_provider_type AS ENUM ('BNPL', 'OTHER');
CREATE TYPE accounting.credit_operation_status AS ENUM ('CONFIRMED', 'SETTLED', 'CANCELLED');
CREATE TYPE accounting.credit_installment_status AS ENUM ('PENDING', 'PAID');
CREATE TYPE accounting.payer_type AS ENUM ('COMPANY', 'PERSONAL');
CREATE TYPE accounting.reimbursement_status AS ENUM ('PENDING', 'REIMBURSED', 'NOT_REQUIRED');

-- 2) Add new journal entry types
ALTER TYPE accounting.journal_entry_type ADD VALUE IF NOT EXISTS 'CREDIT_RECLASSIFICATION';
ALTER TYPE accounting.journal_entry_type ADD VALUE IF NOT EXISTS 'CREDIT_SETTLEMENT';
ALTER TYPE accounting.journal_entry_type ADD VALUE IF NOT EXISTS 'REIMBURSEMENT';

-- 3) EXTERNAL CREDIT PROVIDERS
CREATE TABLE accounting.external_credit_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  provider_type accounting.credit_provider_type NOT NULL DEFAULT 'BNPL',
  creditor_account_code TEXT NOT NULL DEFAULT '520000',
  expense_account_code TEXT NOT NULL DEFAULT '669000',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE accounting.external_credit_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manager_all" ON accounting.external_credit_providers FOR ALL
  USING (internal.is_admin() OR internal.is_manager())
  WITH CHECK (internal.is_admin() OR internal.is_manager());
CREATE POLICY "users_select" ON accounting.external_credit_providers FOR SELECT
  USING (true);

-- 4) CREDIT OPERATIONS
CREATE TABLE accounting.credit_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL DEFAULT 'PAY' CHECK (direction = 'PAY'),
  provider_id UUID NOT NULL REFERENCES accounting.external_credit_providers(id),
  purchase_invoice_id UUID NOT NULL,
  gross_amount NUMERIC(14,2) NOT NULL,
  fee_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL,
  num_installments INT NOT NULL DEFAULT 1,
  status accounting.credit_operation_status NOT NULL DEFAULT 'CONFIRMED',
  journal_entry_id UUID REFERENCES accounting.journal_entries(id),
  settlement_bank_account_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_id, purchase_invoice_id)
);

ALTER TABLE accounting.credit_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manager_all" ON accounting.credit_operations FOR ALL
  USING (internal.is_admin() OR internal.is_manager())
  WITH CHECK (internal.is_admin() OR internal.is_manager());
CREATE POLICY "users_select" ON accounting.credit_operations FOR SELECT
  USING (true);

-- 5) CREDIT INSTALLMENTS
CREATE TABLE accounting.credit_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES accounting.credit_operations(id) ON DELETE CASCADE,
  installment_number INT NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  status accounting.credit_installment_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(operation_id, installment_number)
);

ALTER TABLE accounting.credit_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manager_all" ON accounting.credit_installments FOR ALL
  USING (internal.is_admin() OR internal.is_manager())
  WITH CHECK (internal.is_admin() OR internal.is_manager());
CREATE POLICY "users_select" ON accounting.credit_installments FOR SELECT
  USING (true);

-- 6) CREDIT SETTLEMENTS
CREATE TABLE accounting.credit_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES accounting.credit_operations(id),
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gross_amount NUMERIC(14,2) NOT NULL,
  fee_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL,
  bank_account_id UUID NOT NULL,
  journal_entry_id UUID REFERENCES accounting.journal_entries(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE accounting.credit_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manager_all" ON accounting.credit_settlements FOR ALL
  USING (internal.is_admin() OR internal.is_manager())
  WITH CHECK (internal.is_admin() OR internal.is_manager());
CREATE POLICY "users_select" ON accounting.credit_settlements FOR SELECT
  USING (true);

-- 7) EXTEND purchase_invoice_payments with payer info
ALTER TABLE sales.purchase_invoice_payments
  ADD COLUMN IF NOT EXISTS payer_type TEXT NOT NULL DEFAULT 'COMPANY',
  ADD COLUMN IF NOT EXISTS payer_person_id UUID,
  ADD COLUMN IF NOT EXISTS reimbursement_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS reimbursement_date DATE,
  ADD COLUMN IF NOT EXISTS reimbursement_journal_entry_id UUID;

-- Add constraint: if PERSONAL, payer_person_id required
ALTER TABLE sales.purchase_invoice_payments
  ADD CONSTRAINT chk_personal_payer 
  CHECK (
    (payer_type = 'COMPANY') OR 
    (payer_type = 'PERSONAL' AND payer_person_id IS NOT NULL)
  );

-- 8) NEW CHART OF ACCOUNTS entries
INSERT INTO accounting.chart_of_accounts (account_code, account_name, account_type, description)
VALUES 
  ('520000', 'Deudas a c/p con entidades de crédito', 'LIABILITY', 'Financiaciones externas tipo Aplazame, BNPL'),
  ('551000', 'Cuenta corriente con socios', 'LIABILITY', 'Deudas con socios por gastos pagados personalmente'),
  ('669000', 'Otros gastos financieros', 'EXPENSE', 'Comisiones y gastos de financiación externa'),
  ('626000', 'Servicios bancarios y similares', 'EXPENSE', 'Comisiones bancarias y servicios financieros')
ON CONFLICT (account_code) DO NOTHING;

-- 9) RPC: List external credit providers
CREATE OR REPLACE FUNCTION public.list_external_credit_providers()
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  provider_type TEXT,
  creditor_account_code TEXT,
  expense_account_code TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, accounting
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.code, p.provider_type::TEXT, 
         p.creditor_account_code, p.expense_account_code,
         p.is_active, p.created_at
  FROM accounting.external_credit_providers p
  ORDER BY p.name;
END;
$$;

-- 10) RPC: Create external credit provider
CREATE OR REPLACE FUNCTION public.create_external_credit_provider(
  p_name TEXT,
  p_code TEXT,
  p_provider_type TEXT DEFAULT 'BNPL',
  p_creditor_account_code TEXT DEFAULT '520000',
  p_expense_account_code TEXT DEFAULT '669000'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, accounting, internal
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden crear proveedores de crédito';
  END IF;

  INSERT INTO accounting.external_credit_providers (name, code, provider_type, creditor_account_code, expense_account_code)
  VALUES (p_name, UPPER(p_code), p_provider_type::accounting.credit_provider_type, p_creditor_account_code, p_expense_account_code)
  RETURNING accounting.external_credit_providers.id INTO v_id;

  RETURN v_id;
END;
$$;

-- 11) RPC: Update external credit provider
CREATE OR REPLACE FUNCTION public.update_external_credit_provider(
  p_id UUID,
  p_name TEXT DEFAULT NULL,
  p_creditor_account_code TEXT DEFAULT NULL,
  p_expense_account_code TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, accounting, internal
AS $$
BEGIN
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden modificar proveedores de crédito';
  END IF;

  UPDATE accounting.external_credit_providers SET
    name = COALESCE(p_name, name),
    creditor_account_code = COALESCE(p_creditor_account_code, creditor_account_code),
    expense_account_code = COALESCE(p_expense_account_code, expense_account_code),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_id;

  RETURN FOUND;
END;
$$;

-- 12) RPC: Delete external credit provider
CREATE OR REPLACE FUNCTION public.delete_external_credit_provider(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, accounting, internal
AS $$
BEGIN
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar proveedores de crédito';
  END IF;

  -- Check no operations exist
  IF EXISTS (SELECT 1 FROM accounting.credit_operations WHERE provider_id = p_id) THEN
    RAISE EXCEPTION 'No se puede eliminar: existen operaciones de crédito asociadas';
  END IF;

  DELETE FROM accounting.external_credit_providers WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- 13) RPC: Create credit operation (Aplazame PAY)
-- Reclassifies debt from supplier (400) to financial creditor (520)
CREATE OR REPLACE FUNCTION public.create_credit_operation(
  p_purchase_invoice_id UUID,
  p_provider_id UUID,
  p_gross_amount NUMERIC,
  p_fee_amount NUMERIC DEFAULT 0,
  p_num_installments INT DEFAULT 1,
  p_first_due_date DATE DEFAULT NULL,
  p_settlement_bank_account_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, accounting, internal, sales
AS $$
DECLARE
  v_op_id UUID;
  v_net_amount NUMERIC;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_provider RECORD;
  v_invoice RECORD;
  v_user_id UUID;
  v_installment_amount NUMERIC;
  v_due DATE;
  i INT;
BEGIN
  IF NOT (internal.is_admin() OR internal.is_manager()) THEN
    RAISE EXCEPTION 'Permisos insuficientes';
  END IF;

  v_user_id := internal.get_authorized_user_id(auth.uid());
  v_net_amount := p_gross_amount - p_fee_amount;

  -- Get provider info
  SELECT * INTO v_provider FROM accounting.external_credit_providers WHERE id = p_provider_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proveedor de crédito no encontrado o inactivo'; END IF;

  -- Get invoice info (must be approved)
  SELECT pi.id, pi.status, pi.total, pi.supplier_id, pi.technician_id
  INTO v_invoice
  FROM sales.purchase_invoices pi WHERE pi.id = p_purchase_invoice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Factura de compra no encontrada'; END IF;
  IF v_invoice.status NOT IN ('APPROVED', 'PARTIAL') THEN 
    RAISE EXCEPTION 'La factura debe estar aprobada para financiar'; 
  END IF;

  -- Idempotency check
  IF EXISTS (SELECT 1 FROM accounting.credit_operations WHERE provider_id = p_provider_id AND purchase_invoice_id = p_purchase_invoice_id AND status != 'CANCELLED') THEN
    RAISE EXCEPTION 'Ya existe una operación de financiación para esta factura';
  END IF;

  -- Create journal entry: reclassify 400 -> 520
  SELECT accounting.next_entry_number() INTO v_entry_number;
  
  INSERT INTO accounting.journal_entries (entry_number, entry_date, entry_type, description, reference_id, reference_type, is_automatic, created_by)
  VALUES (v_entry_number, CURRENT_DATE, 'CREDIT_RECLASSIFICATION', 
          'Reclasificación deuda proveedor a ' || v_provider.name,
          p_purchase_invoice_id, 'credit_operation', true, v_user_id)
  RETURNING accounting.journal_entries.id INTO v_entry_id;

  -- DEBE 400 Proveedor (cancelamos deuda con proveedor)
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_amount, credit_amount, description, line_order)
  VALUES (v_entry_id, '400000', p_gross_amount, 0, 'Cancelación deuda proveedor por financiación', 1);

  -- HABER 520 Acreedor financiero (nueva deuda con Aplazame)
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_amount, credit_amount, description, line_order)
  VALUES (v_entry_id, v_provider.creditor_account_code, 0, p_gross_amount, 'Deuda con ' || v_provider.name, 2);

  -- Create operation
  INSERT INTO accounting.credit_operations (direction, provider_id, purchase_invoice_id, gross_amount, fee_amount, net_amount, num_installments, status, journal_entry_id, settlement_bank_account_id, created_by)
  VALUES ('PAY', p_provider_id, p_purchase_invoice_id, p_gross_amount, p_fee_amount, v_net_amount, p_num_installments, 'CONFIRMED', v_entry_id, p_settlement_bank_account_id, v_user_id)
  RETURNING accounting.credit_operations.id INTO v_op_id;

  -- Generate installments
  v_due := COALESCE(p_first_due_date, CURRENT_DATE + INTERVAL '30 days');
  v_installment_amount := ROUND(p_gross_amount / p_num_installments, 2);

  FOR i IN 1..p_num_installments LOOP
    INSERT INTO accounting.credit_installments (operation_id, installment_number, due_date, amount)
    VALUES (v_op_id, i, v_due + ((i-1) * INTERVAL '30 days'), 
            CASE WHEN i = p_num_installments THEN p_gross_amount - (v_installment_amount * (p_num_installments - 1)) ELSE v_installment_amount END);
  END LOOP;

  -- Mark invoice as paid (the supplier is paid via Aplazame)
  UPDATE sales.purchase_invoice_payments 
  SET is_confirmed = true 
  WHERE purchase_invoice_id = p_purchase_invoice_id;

  RETURN v_op_id;
END;
$$;

-- 14) RPC: Settle credit installment (pay Aplazame)
CREATE OR REPLACE FUNCTION public.settle_credit_installment(
  p_operation_id UUID,
  p_gross_amount NUMERIC,
  p_fee_amount NUMERIC DEFAULT 0,
  p_bank_account_id UUID DEFAULT NULL,
  p_settlement_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, accounting, internal
AS $$
DECLARE
  v_settlement_id UUID;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_net_amount NUMERIC;
  v_op RECORD;
  v_provider RECORD;
  v_user_id UUID;
  v_bank_code TEXT;
  v_next_installment RECORD;
BEGIN
  IF NOT (internal.is_admin() OR internal.is_manager()) THEN
    RAISE EXCEPTION 'Permisos insuficientes';
  END IF;

  v_user_id := internal.get_authorized_user_id(auth.uid());
  v_net_amount := p_gross_amount - p_fee_amount;

  SELECT * INTO v_op FROM accounting.credit_operations WHERE id = p_operation_id AND status = 'CONFIRMED';
  IF NOT FOUND THEN RAISE EXCEPTION 'Operación no encontrada o no está confirmada'; END IF;

  SELECT * INTO v_provider FROM accounting.external_credit_providers WHERE id = v_op.provider_id;

  -- Determine bank
  v_bank_code := accounting.get_bank_account_code(COALESCE(p_bank_account_id, v_op.settlement_bank_account_id));
  IF v_bank_code IS NULL THEN RAISE EXCEPTION 'Cuenta bancaria no encontrada'; END IF;

  -- Journal entry: pay Aplazame
  SELECT accounting.next_entry_number() INTO v_entry_number;

  INSERT INTO accounting.journal_entries (entry_number, entry_date, entry_type, description, reference_id, reference_type, is_automatic, created_by)
  VALUES (v_entry_number, COALESCE(p_settlement_date, CURRENT_DATE), 'CREDIT_SETTLEMENT',
          'Liquidación cuota ' || v_provider.name, p_operation_id, 'credit_settlement', true, v_user_id)
  RETURNING accounting.journal_entries.id INTO v_entry_id;

  -- DEBE 520 Acreedor financiero (cancelamos deuda)
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_amount, credit_amount, description, line_order)
  VALUES (v_entry_id, v_provider.creditor_account_code, p_gross_amount, 0, 'Pago cuota ' || v_provider.name, 1);

  -- DEBE 669 Gastos financieros (si hay fee)
  IF p_fee_amount > 0 THEN
    INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_amount, credit_amount, description, line_order)
    VALUES (v_entry_id, v_provider.expense_account_code, p_fee_amount, 0, 'Comisión financiación ' || v_provider.name, 2);
  END IF;

  -- HABER 572 Banco (importe neto)
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_amount, credit_amount, description, line_order)
  VALUES (v_entry_id, v_bank_code, 0, v_net_amount + p_fee_amount, 'Pago ' || v_provider.name, 3);

  -- Create settlement record
  INSERT INTO accounting.credit_settlements (operation_id, settlement_date, gross_amount, fee_amount, net_amount, bank_account_id, journal_entry_id, created_by)
  VALUES (p_operation_id, COALESCE(p_settlement_date, CURRENT_DATE), p_gross_amount, p_fee_amount, v_net_amount, 
          COALESCE(p_bank_account_id, v_op.settlement_bank_account_id), v_entry_id, v_user_id)
  RETURNING accounting.credit_settlements.id INTO v_settlement_id;

  -- Mark next pending installment as PAID
  SELECT * INTO v_next_installment FROM accounting.credit_installments 
  WHERE operation_id = p_operation_id AND status = 'PENDING' 
  ORDER BY installment_number LIMIT 1;
  
  IF FOUND THEN
    UPDATE accounting.credit_installments SET status = 'PAID' WHERE id = v_next_installment.id;
  END IF;

  -- Check if all installments paid -> SETTLED
  IF NOT EXISTS (SELECT 1 FROM accounting.credit_installments WHERE operation_id = p_operation_id AND status = 'PENDING') THEN
    UPDATE accounting.credit_operations SET status = 'SETTLED', updated_at = now() WHERE id = p_operation_id;
  END IF;

  RETURN v_settlement_id;
END;
$$;

-- 15) RPC: Get credit operations for a purchase invoice
CREATE OR REPLACE FUNCTION public.get_credit_operations(p_purchase_invoice_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  direction TEXT,
  provider_id UUID,
  provider_name TEXT,
  provider_code TEXT,
  purchase_invoice_id UUID,
  gross_amount NUMERIC,
  fee_amount NUMERIC,
  net_amount NUMERIC,
  num_installments INT,
  status TEXT,
  settlement_bank_account_id UUID,
  created_at TIMESTAMPTZ,
  total_settled NUMERIC,
  pending_installments INT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, accounting
AS $$
BEGIN
  RETURN QUERY
  SELECT co.id, co.direction, co.provider_id, p.name AS provider_name, p.code AS provider_code,
         co.purchase_invoice_id, co.gross_amount, co.fee_amount, co.net_amount,
         co.num_installments, co.status::TEXT, co.settlement_bank_account_id,
         co.created_at,
         COALESCE((SELECT SUM(cs.gross_amount) FROM accounting.credit_settlements cs WHERE cs.operation_id = co.id), 0) AS total_settled,
         (SELECT COUNT(*)::INT FROM accounting.credit_installments ci WHERE ci.operation_id = co.id AND ci.status = 'PENDING') AS pending_installments
  FROM accounting.credit_operations co
  JOIN accounting.external_credit_providers p ON p.id = co.provider_id
  WHERE (p_purchase_invoice_id IS NULL OR co.purchase_invoice_id = p_purchase_invoice_id)
  ORDER BY co.created_at DESC;
END;
$$;

-- 16) RPC: Get credit installments
CREATE OR REPLACE FUNCTION public.get_credit_installments(p_operation_id UUID)
RETURNS TABLE (
  id UUID,
  installment_number INT,
  due_date DATE,
  amount NUMERIC,
  status TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, accounting
AS $$
BEGIN
  RETURN QUERY
  SELECT ci.id, ci.installment_number, ci.due_date, ci.amount, ci.status::TEXT
  FROM accounting.credit_installments ci
  WHERE ci.operation_id = p_operation_id
  ORDER BY ci.installment_number;
END;
$$;

-- 17) RPC: Register purchase payment by partner (personal)
CREATE OR REPLACE FUNCTION public.register_personal_purchase_payment(
  p_purchase_invoice_id UUID,
  p_amount NUMERIC,
  p_payer_person_id UUID,
  p_payment_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, accounting, internal, sales
AS $$
DECLARE
  v_payment_id UUID;
  v_user_id UUID;
  v_partner RECORD;
  v_partner_account TEXT;
  v_invoice RECORD;
BEGIN
  IF NOT (internal.is_admin() OR internal.is_manager()) THEN
    RAISE EXCEPTION 'Permisos insuficientes';
  END IF;

  v_user_id := internal.get_authorized_user_id(auth.uid());

  -- Get partner info
  SELECT * INTO v_partner FROM internal.partners WHERE id = p_payer_person_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Socio no encontrado'; END IF;

  v_partner_account := COALESCE(v_partner.account_code, '551000');

  -- Ensure account exists in chart
  INSERT INTO accounting.chart_of_accounts (account_code, account_name, account_type, description)
  VALUES (v_partner_account, 'Cuenta corriente con ' || v_partner.full_name, 'LIABILITY', 'Deuda con socio por gastos personales')
  ON CONFLICT (account_code) DO NOTHING;

  -- Get invoice
  SELECT pi.id, pi.status, pi.total INTO v_invoice
  FROM sales.purchase_invoices pi WHERE pi.id = p_purchase_invoice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Factura no encontrada'; END IF;

  -- Register payment
  INSERT INTO sales.purchase_invoice_payments (purchase_invoice_id, amount, payment_date, payment_method, notes, registered_by, payer_type, payer_person_id, reimbursement_status)
  VALUES (p_purchase_invoice_id, p_amount, COALESCE(p_payment_date, CURRENT_DATE), 'PERSONAL', p_notes, v_user_id, 'PERSONAL', p_payer_person_id, 'PENDING')
  RETURNING sales.purchase_invoice_payments.id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

-- 18) RPC: Reimburse personal purchase payment
CREATE OR REPLACE FUNCTION public.reimburse_personal_purchase(
  p_payment_id UUID,
  p_bank_account_id UUID,
  p_reimbursement_date DATE DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, accounting, internal, sales
AS $$
DECLARE
  v_payment RECORD;
  v_partner RECORD;
  v_partner_account TEXT;
  v_bank_code TEXT;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_user_id UUID;
BEGIN
  IF NOT (internal.is_admin() OR internal.is_manager()) THEN
    RAISE EXCEPTION 'Permisos insuficientes';
  END IF;

  v_user_id := internal.get_authorized_user_id(auth.uid());

  -- Get payment
  SELECT * INTO v_payment FROM sales.purchase_invoice_payments WHERE id = p_payment_id AND payer_type = 'PERSONAL';
  IF NOT FOUND THEN RAISE EXCEPTION 'Pago personal no encontrado'; END IF;
  IF v_payment.reimbursement_status = 'REIMBURSED' THEN RAISE EXCEPTION 'Ya ha sido reembolsado'; END IF;

  -- Get partner
  SELECT * INTO v_partner FROM internal.partners WHERE id = v_payment.payer_person_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Socio no encontrado'; END IF;

  v_partner_account := COALESCE(v_partner.account_code, '551000');
  v_bank_code := accounting.get_bank_account_code(p_bank_account_id);
  IF v_bank_code IS NULL THEN RAISE EXCEPTION 'Cuenta bancaria no encontrada'; END IF;

  -- Create journal entry: reimburse partner
  SELECT accounting.next_entry_number() INTO v_entry_number;

  INSERT INTO accounting.journal_entries (entry_number, entry_date, entry_type, description, reference_id, reference_type, is_automatic, created_by)
  VALUES (v_entry_number, COALESCE(p_reimbursement_date, CURRENT_DATE), 'REIMBURSEMENT',
          'Reembolso a ' || v_partner.full_name, p_payment_id, 'reimbursement', true, v_user_id)
  RETURNING accounting.journal_entries.id INTO v_entry_id;

  -- DEBE 551/465 Socio (cancelamos deuda)
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_amount, credit_amount, description, line_order)
  VALUES (v_entry_id, v_partner_account, v_payment.amount, 0, 'Reembolso gasto personal a ' || v_partner.full_name, 1);

  -- HABER 572 Banco
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_amount, credit_amount, description, line_order)
  VALUES (v_entry_id, v_bank_code, 0, v_payment.amount, 'Pago reembolso desde banco', 2);

  -- Update payment
  UPDATE sales.purchase_invoice_payments 
  SET reimbursement_status = 'REIMBURSED', 
      reimbursement_date = COALESCE(p_reimbursement_date, CURRENT_DATE),
      reimbursement_journal_entry_id = v_entry_id,
      updated_at = now()
  WHERE id = p_payment_id;

  RETURN true;
END;
$$;

-- 19) RPC: List pending reimbursements
CREATE OR REPLACE FUNCTION public.list_pending_reimbursements()
RETURNS TABLE (
  payment_id UUID,
  purchase_invoice_id UUID,
  invoice_number TEXT,
  supplier_name TEXT,
  amount NUMERIC,
  payment_date DATE,
  payer_person_id UUID,
  payer_name TEXT,
  partner_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, accounting, internal, sales
AS $$
BEGIN
  RETURN QUERY
  SELECT pip.id AS payment_id, pip.purchase_invoice_id, 
         pi.internal_purchase_number AS invoice_number,
         COALESCE(s.company_name, t.company_name, 'N/A') AS supplier_name,
         pip.amount, pip.payment_date, pip.payer_person_id,
         p.full_name AS payer_name, p.partner_number,
         pip.notes, pip.created_at
  FROM sales.purchase_invoice_payments pip
  JOIN sales.purchase_invoices pi ON pi.id = pip.purchase_invoice_id
  LEFT JOIN internal.suppliers s ON s.id = pi.supplier_id
  LEFT JOIN internal.technicians t ON t.id = pi.technician_id
  LEFT JOIN internal.partners p ON p.id = pip.payer_person_id
  WHERE pip.payer_type = 'PERSONAL' AND pip.reimbursement_status = 'PENDING'
  ORDER BY pip.payment_date DESC;
END;
$$;

-- 20) RPC: List partners (for selector)
CREATE OR REPLACE FUNCTION public.list_partners_for_selector()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  partner_number TEXT,
  account_code TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.full_name, p.partner_number, p.account_code
  FROM internal.partners p
  WHERE p.status = 'ACTIVE'
  ORDER BY p.full_name;
END;
$$;
