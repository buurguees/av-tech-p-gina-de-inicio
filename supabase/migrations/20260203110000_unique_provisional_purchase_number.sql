-- Números provisionales únicos: secuencia en BD para TICKET-xxx y PENDIENTE-xxx (evitar duplicados por Date.now()).
CREATE SEQUENCE IF NOT EXISTS sales.purchase_invoice_provisional_seq START 1;

CREATE OR REPLACE FUNCTION public.get_next_provisional_purchase_number(p_document_type TEXT DEFAULT 'INVOICE')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_next BIGINT;
  v_prefix TEXT;
BEGIN
  v_next := nextval('sales.purchase_invoice_provisional_seq');
  v_prefix := CASE WHEN p_document_type = 'EXPENSE' THEN 'TICKET' ELSE 'PENDIENTE' END;
  RETURN v_prefix || '-' || lpad(v_next::TEXT, 6, '0');
END;
$$;
