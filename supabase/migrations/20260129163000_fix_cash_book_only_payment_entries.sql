-- =====================================================
-- Libro de Caja: Solo movimientos con pago registrado
-- Las facturas (venta/compra), cobros y tickets SIN pago
-- registrado NO deben aparecer en el Libro de Caja.
-- Solo: PAYMENT_RECEIVED, PAYMENT, PAYMENT_MADE, 
--      BANK_TRANSFER, ADJUSTMENT (excl. 129000)
-- =====================================================

CREATE OR REPLACE FUNCTION accounting.list_cash_movements(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_bank_account_code text DEFAULT NULL,
  p_limit integer DEFAULT 500,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  movement_id uuid,
  entry_id uuid,
  entry_number text,
  entry_date date,
  entry_type text,
  movement_type text,
  amount numeric,
  bank_account_code text,
  bank_account_name text,
  counterpart_account_code text,
  counterpart_account_name text,
  third_party_id uuid,
  third_party_type text,
  third_party_name text,
  description text,
  payment_method text,
  bank_reference text,
  reference_id uuid,
  reference_type text,
  is_locked boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'accounting', 'crm', 'internal'
AS $function$
BEGIN
  RETURN QUERY
  WITH bank_movements AS (
    -- Solo movimientos de cuentas 572 que representan PAGOS REALES
    -- EXCLUYE: INVOICE_SALE, INVOICE_PURCHASE (facturas/tickets sin pago)
    -- INCLUYE: PAYMENT_RECEIVED (cobros), PAYMENT/PAYMENT_MADE (pagos),
    --          BANK_TRANSFER (traspasos), ADJUSTMENT (ajustes bancarios)
    SELECT 
      jel.id as movement_id,
      je.id as entry_id,
      je.entry_number,
      je.entry_date,
      je.entry_type::TEXT,
      CASE 
        WHEN jel.debit_credit = 'DEBIT' THEN 'INCOME'::TEXT
        WHEN jel.debit_credit = 'CREDIT' THEN 'EXPENSE'::TEXT
      END as movement_type,
      jel.amount,
      jel.account_code as bank_account_code,
      coa_bank.account_name as bank_account_name,
      jel.third_party_id,
      jel.third_party_type::TEXT,
      jel.description,
      je.reference_id,
      je.reference_type,
      je.is_locked,
      je.created_at
    FROM accounting.journal_entry_lines jel
    JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
    LEFT JOIN accounting.chart_of_accounts coa_bank ON jel.account_code = coa_bank.account_code
    WHERE jel.account_code LIKE '572%'
      AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
      AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
      AND (p_bank_account_code IS NULL OR jel.account_code = p_bank_account_code)
      -- Solo asientos que representan pago/cobro real (no facturas sin pago)
      AND je.entry_type IN (
        'PAYMENT_RECEIVED',  -- Cobro de factura venta
        'PAYMENT',           -- Pago factura compra
        'PAYMENT_MADE',      -- Pago factura compra (legacy)
        'BANK_TRANSFER',     -- Traspaso entre cuentas
        'ADJUSTMENT'         -- Ajuste bancario
      )
      -- Excluir ajustes con contrapartida 129000 (ajustes iniciales)
      AND NOT EXISTS (
        SELECT 1 FROM accounting.journal_entry_lines jel2
        WHERE jel2.journal_entry_id = je.id
          AND jel2.account_code = '129000'
      )
  ),
  counterpart_data AS (
    SELECT 
      bm.movement_id,
      bm.entry_id,
      bm.entry_number,
      bm.entry_date,
      bm.entry_type,
      bm.movement_type,
      bm.amount,
      bm.bank_account_code,
      bm.bank_account_name,
      bm.third_party_id,
      bm.third_party_type,
      bm.description,
      bm.reference_id,
      bm.reference_type,
      bm.is_locked,
      bm.created_at,
      (
        SELECT jel2.account_code
        FROM accounting.journal_entry_lines jel2
        WHERE jel2.journal_entry_id = bm.entry_id
          AND jel2.id != bm.movement_id
          AND jel2.account_code NOT LIKE '572%'
        LIMIT 1
      ) as counterpart_account_code,
      (
        SELECT coa2.account_name
        FROM accounting.journal_entry_lines jel2
        LEFT JOIN accounting.chart_of_accounts coa2 ON jel2.account_code = coa2.account_code
        WHERE jel2.journal_entry_id = bm.entry_id
          AND jel2.id != bm.movement_id
          AND jel2.account_code NOT LIKE '572%'
        LIMIT 1
      ) as counterpart_account_name
    FROM bank_movements bm
  )
  SELECT 
    cd.movement_id,
    cd.entry_id,
    cd.entry_number,
    cd.entry_date,
    cd.entry_type,
    cd.movement_type,
    cd.amount,
    cd.bank_account_code,
    cd.bank_account_name,
    cd.counterpart_account_code,
    cd.counterpart_account_name,
    cd.third_party_id,
    cd.third_party_type,
    CASE 
      WHEN cd.third_party_type = 'CLIENT' THEN (
        SELECT c.company_name FROM crm.clients c WHERE c.id = cd.third_party_id
      )
      WHEN cd.third_party_type = 'SUPPLIER' THEN (
        SELECT s.company_name FROM internal.suppliers s WHERE s.id = cd.third_party_id
      )
      WHEN cd.third_party_type = 'TECHNICIAN' THEN (
        SELECT t.company_name FROM internal.technicians t WHERE t.id = cd.third_party_id
      )
      ELSE NULL
    END as third_party_name,
    cd.description,
    NULL::TEXT as payment_method,
    NULL::TEXT as bank_reference,
    cd.reference_id,
    cd.reference_type,
    cd.is_locked,
    cd.created_at
  FROM counterpart_data cd
  ORDER BY cd.entry_date DESC, cd.entry_number DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;
