-- Fix finance_issue_invoice: Resolve ambiguous column reference
-- The error "column reference 'invoice_number' is ambiguous" occurs because
-- the search_path includes multiple schemas that might have invoice_number columns

CREATE OR REPLACE FUNCTION public.finance_issue_invoice(p_invoice_id UUID)
RETURNS TABLE (
  invoice_number TEXT,
  issue_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, audit, internal, public
AS $$
DECLARE
  v_invoice RECORD;
  v_user_id UUID;
  v_year INTEGER;
  v_next_number INTEGER;
  v_invoice_number TEXT;
  v_current_invoice_number TEXT;
BEGIN
  -- Validar usuario
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;
  
  -- Obtener datos de la factura (usar alias para evitar ambigüedad)
  SELECT 
    inv.id, 
    inv.status, 
    inv.invoice_number, 
    inv.issue_date,
    inv.preliminary_number
  INTO v_invoice
  FROM sales.invoices inv
  WHERE inv.id = p_invoice_id;
  
  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;
  
  IF v_invoice.status != 'DRAFT' THEN
    RAISE EXCEPTION 'Solo se pueden emitir facturas en estado DRAFT';
  END IF;
  
  -- Guardar el número actual antes de actualizar
  v_current_invoice_number := v_invoice.invoice_number;
  
  -- Generar número de factura si no existe o está vacío o es BORR
  IF v_current_invoice_number IS NULL OR v_current_invoice_number = '' OR v_current_invoice_number LIKE '%BORR%' THEN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    
    -- Increment sequence manually to control formatting
    INSERT INTO audit.sequence_counters (prefix, year, current_number, last_generated_at)
    VALUES ('INV', v_year, 1, now())
    ON CONFLICT (prefix, year) DO UPDATE
    SET current_number = audit.sequence_counters.current_number + 1,
        last_generated_at = now()
    RETURNING current_number INTO v_next_number;
    
    -- Format: F-YY-XXXXXX (e.g., F-26-000001)
    v_invoice_number := 'F-' || RIGHT(v_year::TEXT, 2) || '-' || LPAD(v_next_number::TEXT, 6, '0');
  ELSE
    v_invoice_number := v_current_invoice_number;
  END IF;
  
  -- Actualizar factura: emitir y bloquear (usar alias para evitar ambigüedad)
  -- Fecha de emisión: día actual
  -- Fecha de vencimiento: 30 días después de la emisión
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
    updated_at = now()
  WHERE inv.id = p_invoice_id;
  
  -- Retornar datos
  RETURN QUERY
  SELECT 
    v_invoice_number,
    CURRENT_DATE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finance_issue_invoice TO authenticated;
