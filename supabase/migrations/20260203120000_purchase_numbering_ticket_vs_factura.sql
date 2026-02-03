--
-- Numeración clara: PENDIENTE (escáner) → TICKET-BORR/C-BORR (asignados) → TICKET-YY-XXXXXX / C-YY-XXXXXX (aprobados).
-- Tickets en Gastos, Facturas en Facturas de compra. Números distintos por tipo.
--

-- 1. Secuencia solo para tickets (TICKET-BORR-YY-XXXXXX → TICKET-YY-XXXXXX al aprobar)
CREATE SEQUENCE IF NOT EXISTS sales.purchase_invoice_ticket_seq START 1;

-- 2. PENDIENTE: solo para documentos subidos al Escáner (y "nueva factura" en Facturas de compra).
--    get_next_provisional_purchase_number devuelve solo PENDIENTE-XXXXXX (usado en Facturas de compra al subir).
CREATE OR REPLACE FUNCTION public.get_next_provisional_purchase_number(p_document_type TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
BEGIN
  RETURN 'PENDIENTE-' || lpad(nextval('sales.purchase_invoice_provisional_seq')::TEXT, 6, '0');
END;
$$;

-- 3. TICKET-BORR-YY-XXXXXX: al asignar desde Escáner como ticket o al subir en Gastos.
CREATE OR REPLACE FUNCTION public.get_next_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_year TEXT;
  v_next BIGINT;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YY');
  v_next := nextval('sales.purchase_invoice_ticket_seq');
  RETURN 'TICKET-BORR-' || v_year || '-' || lpad(v_next::TEXT, 6, '0');
END;
$$;

-- 4. C-BORR-YY-XXXXXX: al asignar desde Escáner como factura de compra. Usa la misma secuencia que C-YY (al aprobar se reutiliza el número).
CREATE OR REPLACE FUNCTION public.get_next_factura_borr_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_year TEXT;
  v_next BIGINT;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YY');
  v_next := nextval('sales.purchase_invoice_definitive_seq');
  RETURN 'C-BORR-' || v_year || '-' || lpad(v_next::TEXT, 6, '0');
END;
$$;

-- 5. Aprobar: ticket → TICKET-YY-XXXXXX; factura con C-BORR → C-YY-XXXXXX; factura con PENDIENTE → C-YY-XXXXXX (nuevo desde secuencia).
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
      v_definitive := 'TICKET-' || substring(v_inv from 13 for 9);  -- YY-XXXXXX
    ELSE
      v_definitive := 'TICKET-' || to_char(CURRENT_DATE, 'YY') || '-' || lpad(nextval('sales.purchase_invoice_ticket_seq')::TEXT, 6, '0');
    END IF;
  ELSE
    -- Factura: C-BORR-YY-XXXXXX → C-YY-XXXXXX (mismo número), o PENDIENTE-xxx → C-YY-XXXXXX (nuevo)
    IF v_inv IS NOT NULL AND v_inv ~ '^C-BORR-[0-9]{2}-[0-9]{6}$' THEN
      v_definitive := 'C-' || substring(v_inv from 8 for 9);  -- YY-XXXXXX
    ELSE
      v_definitive := public.generate_internal_purchase_number(v_row.document_type, v_row.supplier_id, v_row.technician_id);
    END IF;
  END IF;

  UPDATE sales.purchase_invoices
  SET
    status = 'APPROVED',
    internal_purchase_number = v_definitive,
    is_locked = true,
    updated_at = now()
  WHERE id = p_invoice_id;

  RETURN QUERY SELECT v_definitive, true;
END;
$$;
