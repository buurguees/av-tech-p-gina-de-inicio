-- =====================================================
-- Fix: Resumen contable + Traspasos + Pagos banco correcto
-- 1. Saldo Total Bancos: suma todas 572xxx (corregido en UI)
-- 2. create_bank_transfer: usar BANK_TRANSFER en vez de TRANSFER
-- 3. auto_create_purchase_payment_entry: usar company_bank_account_id directo
-- =====================================================

-- Fix public.create_bank_transfer: entry_type BANK_TRANSFER
CREATE OR REPLACE FUNCTION public.create_bank_transfer(
  p_source_bank_id uuid,
  p_source_bank_name text,
  p_target_bank_id uuid,
  p_target_bank_name text,
  p_amount numeric,
  p_transfer_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(entry_id uuid, entry_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'accounting', 'internal'
AS $$
DECLARE
  v_source_code TEXT;
  v_target_code TEXT;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_user_id UUID;
BEGIN
  IF p_source_bank_id = p_target_bank_id THEN
    RAISE EXCEPTION 'El banco origen y destino deben ser diferentes';
  END IF;
  
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El importe debe ser positivo';
  END IF;
  
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;
  
  SELECT accounting_code INTO v_source_code
  FROM internal.company_bank_accounts
  WHERE id = p_source_bank_id AND is_active = TRUE;
  
  SELECT accounting_code INTO v_target_code
  FROM internal.company_bank_accounts
  WHERE id = p_target_bank_id AND is_active = TRUE;
  
  IF v_source_code IS NULL OR v_target_code IS NULL THEN
    RAISE EXCEPTION 'Cuenta bancaria no encontrada';
  END IF;
  
  v_entry_number := accounting.get_next_entry_number();
  
  INSERT INTO accounting.journal_entries (
    entry_number, entry_date, entry_type, description,
    reference_type, is_automatic, is_locked, created_by
  ) VALUES (
    v_entry_number, p_transfer_date,
    'BANK_TRANSFER'::accounting.journal_entry_type,
    'Traspaso ' || p_source_bank_name || ' → ' || p_target_bank_name || COALESCE(' - ' || p_notes, ''),
    'BANK_TRANSFER', FALSE, FALSE, v_user_id
  )
  RETURNING id INTO v_entry_id;
  
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, description, amount, debit_credit)
  VALUES (v_entry_id, 1, v_target_code, 'Traspaso desde ' || p_source_bank_name, p_amount, 'DEBIT');
  
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, description, amount, debit_credit)
  VALUES (v_entry_id, 2, v_source_code, 'Traspaso a ' || p_target_bank_name, p_amount, 'CREDIT');
  
  RETURN QUERY SELECT v_entry_id, v_entry_number;
END;
$$;
