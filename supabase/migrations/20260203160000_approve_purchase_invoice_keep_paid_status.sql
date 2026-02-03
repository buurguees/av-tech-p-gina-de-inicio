--
-- Aprobar factura/ticket: si ya está PAID (o totalmente pagado), solo asignar número definitivo
-- y no cambiar status a APPROVED para no perder el estado de pagado.
--
CREATE OR REPLACE FUNCTION public.approve_purchase_invoice(p_invoice_id UUID)
RETURNS TABLE (invoice_number TEXT, is_locked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, internal, public
AS $$
DECLARE
  v_definitive TEXT;
  v_row sales.purchase_invoices%ROWTYPE;
  v_inv TEXT;
  v_already_paid BOOLEAN;
BEGIN
  SELECT * INTO v_row FROM sales.purchase_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura de compra no encontrada: %', p_invoice_id;
  END IF;

  IF v_row.internal_purchase_number IS NOT NULL THEN
    RETURN QUERY SELECT v_row.internal_purchase_number::TEXT, COALESCE(v_row.is_locked, false);
    RETURN;
  END IF;

  v_inv := v_row.invoice_number;

  -- Ticket: TICKET-BORR-YY-XXXXXX → TICKET-YY-XXXXXX (mismo número)
  IF v_row.document_type = 'EXPENSE' THEN
    IF v_inv IS NOT NULL AND v_inv ~ '^TICKET-BORR-[0-9]{2}-[0-9]{6}$' THEN
      v_definitive := 'TICKET-' || substring(v_inv from 13 for 9);
    ELSE
      v_definitive := 'TICKET-' || to_char(CURRENT_DATE, 'YY') || '-' || lpad(nextval('sales.purchase_invoice_ticket_seq')::TEXT, 6, '0');
    END IF;
  ELSE
    -- Factura: C-BORR-YY-XXXXXX → C-YY-XXXXXX, o PENDIENTE-xxx → C-YY-XXXXXX
    IF v_inv IS NOT NULL AND v_inv ~ '^C-BORR-[0-9]{2}-[0-9]{6}$' THEN
      v_definitive := 'C-' || substring(v_inv from 8 for 9);
    ELSE
      v_definitive := public.generate_internal_purchase_number(v_row.document_type, v_row.supplier_id, v_row.technician_id);
    END IF;
  END IF;

  -- Si ya está pagado (PAID o pagado al 100%), solo asignar número definitivo y bloquear
  v_already_paid := (v_row.status = 'PAID') OR (v_row.total IS NOT NULL AND v_row.total <> 0 AND v_row.paid_amount >= v_row.total);

  IF v_already_paid THEN
    UPDATE sales.purchase_invoices
    SET
      internal_purchase_number = v_definitive,
      is_locked = true,
      updated_at = now()
    WHERE id = p_invoice_id;
  ELSE
    UPDATE sales.purchase_invoices
    SET
      status = 'APPROVED',
      internal_purchase_number = v_definitive,
      is_locked = true,
      updated_at = now()
    WHERE id = p_invoice_id;
  END IF;

  RETURN QUERY SELECT v_definitive, true;
END;
$$;
