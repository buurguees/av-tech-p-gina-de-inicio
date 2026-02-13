
-- Drop old version of settle_credit_installment with different signature
DROP FUNCTION IF EXISTS public.settle_credit_installment(UUID, NUMERIC, NUMERIC, UUID, DATE);

-- ============================================================
-- MIGRACIÓN: Correcciones críticas sistema cobros/pagos
-- ============================================================

-- ============================================================
-- 1) CRÍTICO #1: Fix trigger auto_create_purchase_payment_entry
--    Branch by payer_type: COMPANY → D400/H572, PERSONAL → D400/H551xxx
-- ============================================================

CREATE OR REPLACE FUNCTION accounting.auto_create_purchase_payment_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_invoice RECORD;
  v_supplier_account_code TEXT := '400000';
  v_counterpart_code TEXT := '572000';
  v_description TEXT;
  v_fiscal_year INTEGER;
  v_third_party_id UUID;
  v_third_party_type accounting.third_party_type;
  v_internal_user_id UUID;
  v_abs_amount NUMERIC;
  v_is_refund BOOLEAN;
  v_partner RECORD;
BEGIN
  IF NEW.is_confirmed IS NOT NULL AND NEW.is_confirmed = false THEN
    RETURN NEW;
  END IF;

  v_is_refund := NEW.amount < 0;
  v_abs_amount := ABS(NEW.amount);

  SELECT 
    pi.id, pi.internal_purchase_number, pi.supplier_id, pi.technician_id, pi.project_id,
    COALESCE(s.company_name, t.company_name, 'Proveedor') as provider_name
  INTO v_invoice
  FROM sales.purchase_invoices pi
  LEFT JOIN internal.suppliers s ON pi.supplier_id = s.id
  LEFT JOIN internal.technicians t ON pi.technician_id = t.id
  WHERE pi.id = NEW.purchase_invoice_id;

  IF v_invoice IS NULL THEN
    RAISE EXCEPTION 'Invoice not found for payment';
  END IF;

  IF v_invoice.supplier_id IS NOT NULL THEN
    v_third_party_id := v_invoice.supplier_id;
    v_third_party_type := 'SUPPLIER';
  ELSIF v_invoice.technician_id IS NOT NULL THEN
    v_third_party_id := v_invoice.technician_id;
    v_third_party_type := 'TECHNICIAN';
  END IF;

  v_fiscal_year := EXTRACT(YEAR FROM NEW.payment_date);
  v_entry_number := accounting.get_next_entry_number(v_fiscal_year);
  v_internal_user_id := internal.get_authorized_user_id(auth.uid());

  -- ===== BRANCH BY PAYER TYPE =====
  IF NEW.payer_type = 'PERSONAL' THEN
    IF NEW.payer_person_id IS NULL THEN
      RAISE EXCEPTION 'payer_person_id is required for PERSONAL payments';
    END IF;

    SELECT id, full_name, account_code INTO v_partner
    FROM internal.partners WHERE id = NEW.payer_person_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Partner not found: %', NEW.payer_person_id;
    END IF;

    -- 551xxx for personal expense payments (cuenta corriente con socios)
    v_counterpart_code := COALESCE(
      REPLACE(v_partner.account_code, '465', '551'),
      '551000'
    );

    INSERT INTO accounting.chart_of_accounts (account_code, account_name, account_type, description)
    VALUES (v_counterpart_code, 'Cta. corriente ' || v_partner.full_name, 'LIABILITY', 'Deuda con socio por gastos personales')
    ON CONFLICT (account_code) DO NOTHING;

    v_description := 'Pago personal ' || v_partner.full_name || ' - ' || COALESCE(v_invoice.internal_purchase_number, 'N/A');

  ELSE
    -- COMPANY payment: D 400 / H 572xxx
    IF NEW.company_bank_account_id IS NOT NULL THEN
      SELECT accounting_code INTO v_counterpart_code
      FROM internal.company_bank_accounts
      WHERE id = NEW.company_bank_account_id::uuid AND is_active = true
      LIMIT 1;
      
      IF v_counterpart_code IS NULL THEN
        v_counterpart_code := '572000';
      END IF;
    END IF;

    IF v_is_refund THEN
      v_description := 'Reembolso ' || COALESCE(v_invoice.internal_purchase_number, 'N/A') || ' - ' || v_invoice.provider_name;
    ELSE
      v_description := 'Pago ' || COALESCE(v_invoice.internal_purchase_number, 'N/A') || ' - ' || v_invoice.provider_name;
    END IF;
  END IF;

  INSERT INTO accounting.journal_entries (
    entry_number, entry_date, entry_type, description,
    reference_id, reference_type, project_id, is_automatic, created_by
  ) VALUES (
    v_entry_number, NEW.payment_date, 'PAYMENT'::accounting.journal_entry_type,
    v_description, NEW.id, 'PURCHASE_PAYMENT', v_invoice.project_id, true, v_internal_user_id
  ) RETURNING id INTO v_entry_id;

  IF v_is_refund THEN
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id, account_code, debit_credit, amount, third_party_id, third_party_type, description, line_order
    ) VALUES 
      (v_entry_id, v_counterpart_code, 'DEBIT', v_abs_amount, NULL, NULL, v_description, 1),
      (v_entry_id, v_supplier_account_code, 'CREDIT', v_abs_amount, v_third_party_id, v_third_party_type, v_description, 2);
  ELSE
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id, account_code, debit_credit, amount, third_party_id, third_party_type, description, line_order
    ) VALUES 
      (v_entry_id, v_supplier_account_code, 'DEBIT', v_abs_amount, v_third_party_id, v_third_party_type, v_description, 1),
      (v_entry_id, v_counterpart_code, 'CREDIT', v_abs_amount, 
       CASE WHEN NEW.payer_type = 'PERSONAL' THEN NEW.payer_person_id ELSE NULL END,
       CASE WHEN NEW.payer_type = 'PERSONAL' THEN 'PARTNER'::accounting.third_party_type ELSE NULL END,
       v_description, 2);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal, accounting, sales;


-- ============================================================
-- 2) CRÍTICO #2: credit_installments - añadir settlement_id y paid_date
-- ============================================================

ALTER TABLE accounting.credit_installments 
  ADD COLUMN IF NOT EXISTS settlement_id UUID REFERENCES accounting.credit_settlements(id),
  ADD COLUMN IF NOT EXISTS paid_date DATE;


-- ============================================================
-- 3) CRÍTICO #2b: RPC para liquidar cuotas de crédito
-- ============================================================

CREATE OR REPLACE FUNCTION public.settle_credit_installment(
  p_installment_id UUID,
  p_bank_account_id UUID,
  p_settlement_date DATE DEFAULT CURRENT_DATE,
  p_bank_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal, accounting
AS $$
DECLARE
  v_installment RECORD;
  v_operation RECORD;
  v_provider RECORD;
  v_settlement_id UUID;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_user_id UUID;
  v_bank_code TEXT;
  v_fee_per_installment NUMERIC;
  v_description TEXT;
BEGIN
  IF NOT (internal.is_admin() OR internal.is_manager()) THEN
    RAISE EXCEPTION 'Permisos insuficientes';
  END IF;

  v_user_id := internal.get_authorized_user_id(auth.uid());

  SELECT * INTO v_installment FROM accounting.credit_installments WHERE id = p_installment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cuota no encontrada'; END IF;
  IF v_installment.status != 'PENDING' THEN RAISE EXCEPTION 'La cuota ya está pagada o cancelada'; END IF;

  SELECT * INTO v_operation FROM accounting.credit_operations WHERE id = v_installment.operation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Operación de crédito no encontrada'; END IF;

  SELECT * INTO v_provider FROM accounting.external_credit_providers WHERE id = v_operation.provider_id;

  SELECT accounting_code INTO v_bank_code
  FROM internal.company_bank_accounts WHERE id = p_bank_account_id AND is_active = true;
  IF v_bank_code IS NULL THEN RAISE EXCEPTION 'Cuenta bancaria no encontrada o inactiva'; END IF;

  v_fee_per_installment := ROUND(v_operation.fee_amount / v_operation.num_installments, 2);

  INSERT INTO accounting.credit_settlements (
    operation_id, settlement_date, gross_amount, fee_amount, net_amount, bank_account_id, created_by
  ) VALUES (
    v_operation.id, p_settlement_date, v_installment.amount, v_fee_per_installment,
    v_installment.amount - v_fee_per_installment, p_bank_account_id, v_user_id
  ) RETURNING id INTO v_settlement_id;

  v_entry_number := accounting.get_next_entry_number(EXTRACT(YEAR FROM p_settlement_date)::integer);
  v_description := 'Pago cuota ' || v_installment.installment_number || '/' || v_operation.num_installments 
                   || ' ' || COALESCE(v_provider.name, 'Financiación');

  INSERT INTO accounting.journal_entries (
    entry_number, entry_date, entry_type, description,
    reference_id, reference_type, is_automatic, created_by
  ) VALUES (
    v_entry_number, p_settlement_date, 'PAYMENT'::accounting.journal_entry_type,
    v_description, v_settlement_id, 'CREDIT_SETTLEMENT', true, v_user_id
  ) RETURNING id INTO v_entry_id;

  -- D 520xxx (capital)
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id, account_code, debit_credit, amount, description, line_order
  ) VALUES (
    v_entry_id, COALESCE(v_provider.creditor_account_code, '520000'), 'DEBIT', 
    v_installment.amount, 'Capital cuota ' || v_installment.installment_number, 1
  );

  -- D 669xxx (financial expenses) if fee > 0
  IF v_fee_per_installment > 0 THEN
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id, account_code, debit_credit, amount, description, line_order
    ) VALUES (
      v_entry_id, COALESCE(v_provider.expense_account_code, '669000'), 'DEBIT',
      v_fee_per_installment, 'Gastos financieros cuota ' || v_installment.installment_number, 2
    );
  END IF;

  -- H 572xxx (bank)
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id, account_code, debit_credit, amount, description, line_order
  ) VALUES (
    v_entry_id, v_bank_code, 'CREDIT',
    v_installment.amount + v_fee_per_installment, 'Pago desde banco', 3
  );

  UPDATE accounting.credit_settlements SET journal_entry_id = v_entry_id WHERE id = v_settlement_id;

  UPDATE accounting.credit_installments 
  SET status = 'PAID', settlement_id = v_settlement_id, paid_date = p_settlement_date
  WHERE id = p_installment_id;

  UPDATE accounting.credit_operations
  SET pending_installments = (
    SELECT COUNT(*) FROM accounting.credit_installments 
    WHERE operation_id = v_operation.id AND status = 'PENDING'
  )
  WHERE id = v_operation.id;

  RETURN v_settlement_id;
END;
$$;


-- ============================================================
-- 4) CRÍTICO #3: Función de validación de equilibrio de asientos
-- ============================================================

CREATE OR REPLACE FUNCTION accounting.assert_entry_balanced(p_entry_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_debit NUMERIC;
  v_total_credit NUMERIC;
  v_diff NUMERIC;
BEGIN
  SELECT 
    COALESCE(SUM(CASE WHEN debit_credit = 'DEBIT' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN debit_credit = 'CREDIT' THEN amount ELSE 0 END), 0)
  INTO v_total_debit, v_total_credit
  FROM accounting.journal_entry_lines
  WHERE journal_entry_id = p_entry_id;

  v_diff := ABS(v_total_debit - v_total_credit);

  IF v_diff > 0.01 THEN
    RAISE EXCEPTION 'Asiento % desequilibrado: Debe=% Haber=% Diferencia=%',
      p_entry_id, v_total_debit, v_total_credit, v_diff;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_credit_installment(UUID, UUID, DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accounting.assert_entry_balanced(UUID) TO authenticated;
