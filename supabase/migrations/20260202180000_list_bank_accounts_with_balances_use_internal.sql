--
-- list_bank_accounts_with_balances: devolver bank_account_id desde internal.company_bank_accounts
-- para que el sidebar de contabilidad muestre el saldo correcto en cada banco (por accounting_code).
--
CREATE OR REPLACE FUNCTION public.list_bank_accounts_with_balances(p_as_of_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(bank_account_id uuid, bank_name text, account_code text, balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'internal', 'accounting'
AS $function$
BEGIN
  RETURN QUERY
  WITH balances AS (
    SELECT
      jel.account_code,
      SUM(CASE WHEN jel.debit_credit = 'DEBIT' THEN jel.amount ELSE 0 END) -
      SUM(CASE WHEN jel.debit_credit = 'CREDIT' THEN jel.amount ELSE 0 END) AS net_balance
    FROM accounting.journal_entries je
    JOIN accounting.journal_entry_lines jel ON jel.journal_entry_id = je.id
    WHERE jel.account_code LIKE '572%'
      AND jel.account_code != '572000'
      AND je.entry_date <= p_as_of_date
    GROUP BY jel.account_code
  )
  SELECT
    cba.id AS bank_account_id,
    cba.bank_name,
    cba.accounting_code AS account_code,
    COALESCE(b.net_balance, 0)::numeric AS balance
  FROM internal.company_bank_accounts cba
  LEFT JOIN balances b ON b.account_code = cba.accounting_code
  WHERE cba.is_active = TRUE
  ORDER BY cba.accounting_code;
END;
$function$;
