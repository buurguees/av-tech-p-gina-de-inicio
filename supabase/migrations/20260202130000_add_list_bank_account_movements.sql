--
-- Migración: list_bank_account_movements para vista detalle por banco
-- Contexto: Revolut no mostraba el positivo en traspasos Sabadell→Revolut
-- porque accountCode era incorrecto. Esta función devuelve movimientos por cuenta 572xxx.
--

CREATE OR REPLACE FUNCTION public.list_bank_account_movements(
  p_account_code TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  entry_number TEXT,
  entry_date DATE,
  entry_type TEXT,
  description TEXT,
  debit_amount NUMERIC,
  credit_amount NUMERIC,
  running_balance NUMERIC,
  reference_id UUID,
  reference_type TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'accounting'
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_lines AS (
    SELECT
      jel.id AS line_id,
      je.entry_number,
      je.entry_date,
      je.entry_type::TEXT,
      COALESCE(jel.description, je.description) AS line_desc,
      CASE WHEN jel.debit_credit = 'DEBIT' THEN jel.amount ELSE 0 END AS debit,
      CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE 0 END AS credit,
      je.reference_id,
      je.reference_type
    FROM accounting.journal_entry_lines jel
    JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
    WHERE jel.account_code = p_account_code
      AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
      AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
    ORDER BY je.entry_date ASC, je.entry_number ASC, jel.line_order ASC
  ),
  with_balance AS (
    SELECT
      fl.line_id,
      fl.entry_number,
      fl.entry_date,
      fl.entry_type,
      fl.line_desc,
      fl.debit,
      fl.credit,
      fl.reference_id,
      fl.reference_type,
      SUM(fl.debit - fl.credit) OVER (ORDER BY fl.entry_date, fl.entry_number, fl.line_id) AS running
    FROM filtered_lines fl
  )
  SELECT
    wb.line_id AS id,
    wb.entry_number,
    wb.entry_date,
    wb.entry_type,
    wb.line_desc AS description,
    wb.debit AS debit_amount,
    wb.credit AS credit_amount,
    wb.running AS running_balance,
    wb.reference_id,
    wb.reference_type
  FROM with_balance wb;
END;
$$;

COMMENT ON FUNCTION public.list_bank_account_movements(TEXT, DATE, DATE) IS 
'Movimientos de una cuenta bancaria (572xxx) para la vista detalle. Incluye traspasos (BANK_TRANSFER), cobros, pagos, etc.';

GRANT EXECUTE ON FUNCTION public.list_bank_account_movements(TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_bank_account_movements(TEXT, DATE, DATE) TO service_role;
