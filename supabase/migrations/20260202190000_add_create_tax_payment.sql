--
-- Función create_tax_payment: registrar pagos de impuestos (303, 111, IS, AEAT)
-- desde el detalle de cuenta bancaria. Crea asiento TAX_PAYMENT con fecha
-- p_payment_date (permite registrar pagos de ejercicios anteriores).
--
ALTER TYPE accounting.journal_entry_type ADD VALUE IF NOT EXISTS 'TAX_PAYMENT';

CREATE OR REPLACE FUNCTION public.create_tax_payment(
  p_bank_account_id uuid,
  p_bank_name text,
  p_tax_type text,
  p_amount numeric,
  p_payment_date date DEFAULT CURRENT_DATE,
  p_period text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(entry_id uuid, entry_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'accounting', 'internal'
AS $$
DECLARE
  v_bank_code text;
  v_liability_account text;
  v_entry_id uuid;
  v_entry_number text;
  v_user_id uuid;
  v_description text;
  v_tax_label text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El importe debe ser positivo';
  END IF;

  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  SELECT accounting_code INTO v_bank_code
  FROM internal.company_bank_accounts
  WHERE id = p_bank_account_id AND is_active = TRUE;
  IF v_bank_code IS NULL THEN
    RAISE EXCEPTION 'Cuenta bancaria no encontrada';
  END IF;

  v_tax_label := CASE p_tax_type
    WHEN 'IVA' THEN 'IVA (Modelo 303)'
    WHEN 'IRPF' THEN 'IRPF (Modelo 111)'
    WHEN 'IS' THEN 'Impuesto de Sociedades'
    WHEN 'AEAT' THEN 'Impuestos AEAT'
    ELSE 'Impuesto '
  END;

  v_liability_account := CASE p_tax_type
    WHEN 'IVA' THEN '477000'
    WHEN 'IRPF' THEN '475100'
    WHEN 'IS' THEN '475200'
    WHEN 'AEAT' THEN '475200'
    ELSE NULL
  END;
  IF v_liability_account IS NULL THEN
    RAISE EXCEPTION 'Tipo de impuesto no válido: %. Use IVA, IRPF, IS o AEAT', p_tax_type;
  END IF;

  v_description := 'Pago ' || v_tax_label || COALESCE(' - ' || NULLIF(TRIM(p_period), ''), '') || COALESCE(' - ' || NULLIF(TRIM(p_notes), ''), '');
  v_description := TRIM(BOTH ' -' FROM v_description);

  v_entry_number := accounting.get_next_entry_number();

  INSERT INTO accounting.journal_entries (
    entry_number, entry_date, entry_type, description,
    reference_type, is_locked, created_by
  ) VALUES (
    v_entry_number,
    p_payment_date,
    'TAX_PAYMENT'::accounting.journal_entry_type,
    v_description,
    'TAX_PAYMENT',
    FALSE,
    v_user_id
  )
  RETURNING id INTO v_entry_id;

  INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, description, amount, debit_credit)
  VALUES (v_entry_id, 1, v_liability_account, 'Pago a Hacienda - ' || v_tax_label, p_amount, 'DEBIT');

  INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, description, amount, debit_credit)
  VALUES (v_entry_id, 2, v_bank_code, 'Pago impuesto desde ' || COALESCE(p_bank_name, 'Banco'), p_amount, 'CREDIT');

  RETURN QUERY SELECT v_entry_id, v_entry_number;
END;
$$;
