-- Migration: finance_issue_invoice — marcar presupuesto origen como INVOICED al emitir factura
-- Al emitir una factura que tiene source_quote_id, el presupuesto asociado pasa a estado INVOICED.

CREATE OR REPLACE FUNCTION "public"."finance_issue_invoice"("p_invoice_id" "uuid")
  RETURNS TABLE("invoice_number" "text", "issue_date" "date")
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public', 'sales', 'accounting', 'internal', 'audit'
AS $$
DECLARE
  v_invoice RECORD;
  v_user_id UUID;
  v_year INTEGER;
  v_next_number INTEGER;
  v_invoice_number TEXT;
  v_current_invoice_number TEXT;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  SELECT
    inv.id,
    inv.status,
    inv.invoice_number,
    inv.issue_date,
    inv.preliminary_number,
    inv.source_quote_id
  INTO v_invoice
  FROM sales.invoices inv
  WHERE inv.id = p_invoice_id;

  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;

  IF v_invoice.status != 'DRAFT' THEN
    RAISE EXCEPTION 'Solo se pueden emitir facturas en estado DRAFT';
  END IF;

  v_current_invoice_number := v_invoice.invoice_number;

  IF v_current_invoice_number IS NULL OR v_current_invoice_number = '' OR v_current_invoice_number LIKE '%BORR%' THEN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

    INSERT INTO audit.sequence_counters (prefix, year, current_number, last_generated_at)
    VALUES ('INV', v_year, 1, now())
    ON CONFLICT (prefix, year) DO UPDATE
    SET current_number = audit.sequence_counters.current_number + 1,
        last_generated_at = now()
    RETURNING current_number INTO v_next_number;

    v_invoice_number := 'F-' || RIGHT(v_year::TEXT, 2) || '-' || LPAD(v_next_number::TEXT, 6, '0');
  ELSE
    v_invoice_number := v_current_invoice_number;
  END IF;

  UPDATE sales.invoices inv
  SET
    preliminary_number = CASE
      WHEN inv.preliminary_number IS NULL THEN v_current_invoice_number
      ELSE inv.preliminary_number
    END,
    invoice_number = v_invoice_number,
    issue_date = CURRENT_DATE,
    due_date = CURRENT_DATE + INTERVAL '30 days',
    status = 'ISSUED',
    is_locked = true,
    locked_at = now(),
    is_number_definitive = true,
    number_assigned_at = now(),
    updated_at = now()
  WHERE inv.id = p_invoice_id;

  -- Marcar presupuesto origen como INVOICED si existe
  IF v_invoice.source_quote_id IS NOT NULL THEN
    UPDATE quotes.quotes
    SET status = 'INVOICED', updated_at = now()
    WHERE id = v_invoice.source_quote_id
      AND status != 'INVOICED';
  END IF;

  RETURN QUERY
  SELECT
    v_invoice_number,
    CURRENT_DATE;
END;
$$;
