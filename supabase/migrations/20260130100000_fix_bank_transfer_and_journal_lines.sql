-- =====================================================
-- Fix: Traspasos bancarios + list_journal_entry_lines_by_period
-- 1. create_bank_transfer: quitar is_automatic si no existe
-- 2. Añadir BANK_TRANSFER al enum si falta
-- 3. list_journal_entry_lines_by_period: usar debit_credit/amount y reference_*
-- =====================================================

-- 1. Añadir BANK_TRANSFER al enum journal_entry_type si no existe
ALTER TYPE accounting.journal_entry_type ADD VALUE IF NOT EXISTS 'BANK_TRANSFER';

-- 2. Fix create_bank_transfer: usar solo columnas que existen en journal_entries
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
  
  -- Usar solo columnas existentes: reference_type en vez de is_automatic
  INSERT INTO accounting.journal_entries (
    entry_number, entry_date, entry_type, description,
    reference_type, is_locked, created_by
  ) VALUES (
    v_entry_number, p_transfer_date,
    'BANK_TRANSFER'::accounting.journal_entry_type,
    'Traspaso ' || p_source_bank_name || ' → ' || p_target_bank_name || COALESCE(' - ' || p_notes, ''),
    'BANK_TRANSFER', FALSE, v_user_id
  )
  RETURNING id INTO v_entry_id;
  
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, description, amount, debit_credit)
  VALUES (v_entry_id, 1, v_target_code, 'Traspaso desde ' || p_source_bank_name, p_amount, 'DEBIT');
  
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, line_order, account_code, description, amount, debit_credit)
  VALUES (v_entry_id, 2, v_source_code, 'Traspaso a ' || p_target_bank_name, p_amount, 'CREDIT');
  
  RETURN QUERY SELECT v_entry_id, v_entry_number;
END;
$$;

-- 3. Fix list_journal_entry_lines_by_period: usar debit_credit/amount y reference_*
CREATE OR REPLACE FUNCTION accounting.list_journal_entry_lines_by_period(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  entry_id UUID,
  entry_number TEXT,
  entry_date DATE,
  entry_type TEXT,
  description TEXT,
  is_locked BOOLEAN,
  source_type TEXT,
  source_id UUID,
  line_id UUID,
  account_code TEXT,
  account_name TEXT,
  line_description TEXT,
  debit NUMERIC,
  credit NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'accounting'
AS $$
  SELECT
    je.id AS entry_id,
    je.entry_number,
    je.entry_date,
    je.entry_type::text,
    je.description,
    je.is_locked,
    je.reference_type AS source_type,
    je.reference_id AS source_id,
    jel.id AS line_id,
    jel.account_code,
    coa.account_name,
    jel.description AS line_description,
    CASE WHEN jel.debit_credit = 'DEBIT' THEN jel.amount ELSE 0 END AS debit,
    CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE 0 END AS credit
  FROM accounting.journal_entries je
  JOIN accounting.journal_entry_lines jel ON jel.journal_entry_id = je.id
  LEFT JOIN accounting.chart_of_accounts coa ON coa.account_code = jel.account_code
  WHERE je.entry_date >= p_start_date AND je.entry_date <= p_end_date
  ORDER BY je.entry_date, je.entry_number, jel.id;
$$;
