-- Migración: RPC para retenciones IRPF de profesionales (facturas de compra)
-- Fecha: 2026-03-20
-- Contexto: get_irpf_model_111_summary solo incluye nóminas y retribuciones de socios.
-- Las facturas de compra con withholding_amount (retención IRPF a profesionales)
-- tienen asiento en cuenta 4751 pero no aparecen en el resumen del Modelo 111.
-- Esta RPC expone esos datos para el Modelo 111 (casillas 04-06).

CREATE OR REPLACE FUNCTION accounting.get_professional_withholding_irpf(
  p_start DATE,
  p_end DATE
)
RETURNS TABLE (
  purchase_invoice_id UUID,
  invoice_number TEXT,
  issue_date DATE,
  supplier_name TEXT,
  supplier_tax_id TEXT,
  subtotal NUMERIC,
  withholding_amount NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    pi.id AS purchase_invoice_id,
    pi.invoice_number,
    pi.issue_date,
    pi.supplier_name,
    pi.supplier_tax_id,
    pi.subtotal,
    COALESCE(pi.withholding_amount, 0) AS withholding_amount
  FROM sales.purchase_invoices pi
  WHERE pi.issue_date BETWEEN p_start AND p_end
    AND COALESCE(pi.withholding_amount, 0) > 0
    AND pi.status IN ('APPROVED', 'PAID', 'PARTIAL')
  ORDER BY pi.issue_date;
$$;

-- Wrapper público (si existe RLS que requiera esquema público)
CREATE OR REPLACE FUNCTION get_professional_withholding_irpf(
  p_start DATE,
  p_end DATE
)
RETURNS TABLE (
  purchase_invoice_id UUID,
  invoice_number TEXT,
  issue_date DATE,
  supplier_name TEXT,
  supplier_tax_id TEXT,
  subtotal NUMERIC,
  withholding_amount NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM accounting.get_professional_withholding_irpf(p_start, p_end);
$$;
