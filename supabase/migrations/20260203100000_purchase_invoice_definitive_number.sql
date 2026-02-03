--
-- Nº de compra definitivo: al aprobar una factura/ticket se asigna un número definitivo (C-YY-NNNNNN).
-- Así en Facturas de Compra se muestra un único concepto "Número": provisional (TICKET-xxx / PENDIENTE-xxx)
-- hasta que se apruebe, y después el definitivo (C-26-000001).
--

-- 1. Columna internal_purchase_number en sales.purchase_invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'purchase_invoices' AND column_name = 'internal_purchase_number'
  ) THEN
    ALTER TABLE sales.purchase_invoices ADD COLUMN internal_purchase_number TEXT;
    COMMENT ON COLUMN sales.purchase_invoices.internal_purchase_number IS 'Número de compra definitivo (C-YY-NNNNNN), asignado al aprobar.';
  END IF;
END $$;

-- 2. Secuencia para números definitivos (por año)
CREATE SEQUENCE IF NOT EXISTS sales.purchase_invoice_definitive_seq START 1;

-- 3. Función: generar próximo número definitivo (C-YY-NNNNNN)
CREATE OR REPLACE FUNCTION public.generate_internal_purchase_number(
  p_document_type TEXT DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_technician_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_year TEXT;
  v_next INTEGER;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YY');
  v_next := nextval('sales.purchase_invoice_definitive_seq');
  RETURN 'C-' || v_year || '-' || lpad(v_next::TEXT, 6, '0');
END;
$$;

-- 4. Función: aprobar factura de compra y asignar número definitivo
CREATE OR REPLACE FUNCTION public.approve_purchase_invoice(p_invoice_id UUID)
RETURNS TABLE (invoice_number TEXT, is_locked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, internal, public
AS $$
DECLARE
  v_definitive TEXT;
  v_row sales.purchase_invoices%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM sales.purchase_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura de compra no encontrada: %', p_invoice_id;
  END IF;

  IF v_row.internal_purchase_number IS NOT NULL THEN
    -- Ya aprobada y con número definitivo
    RETURN QUERY SELECT v_row.internal_purchase_number::TEXT, COALESCE(v_row.is_locked, false);
    RETURN;
  END IF;

  v_definitive := public.generate_internal_purchase_number(
    v_row.document_type,
    v_row.supplier_id,
    v_row.technician_id
  );

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

-- 5. Nota: list_purchase_invoices debe devolver internal_purchase_number.
-- Si en tu proyecto esa función hace SELECT de sales.purchase_invoices (p.ej. pi.*),
-- añade la columna internal_purchase_number al RETURNS TABLE y al SELECT de la función.
-- La UI ya muestra internal_purchase_number || invoice_number como "Número".
