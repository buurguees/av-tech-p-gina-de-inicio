-- Migración: RPC para exportar detalle IVA (Modelo 303)
-- Fecha: 2026-03-20
-- Contexto: FASE 2 auditoría Q1 2026. La RPC devuelve una fila por factura y tipo de IVA
-- para exportar a Excel y alimentar la vista detalle en AccountingPage.
-- Columnas para el Modelo 303:
--   REPERCUTIDO: base imponible, tipo, cuota (casillas 01-09 según tipo)
--   SOPORTADO: base imponible, tipo, cuota (casillas 28-36 según tipo)

CREATE OR REPLACE FUNCTION accounting.get_vat_detail_for_export(
  p_start DATE,
  p_end DATE
)
RETURNS TABLE (
  tipo TEXT,
  invoice_id UUID,
  invoice_number TEXT,
  issue_date DATE,
  third_party_name TEXT,
  third_party_tax_id TEXT,
  tax_rate NUMERIC,
  base_imponible NUMERIC,
  cuota_iva NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- IVA Repercutido: facturas de venta (por línea y tipo de IVA)
  SELECT
    'REPERCUTIDO'::TEXT AS tipo,
    i.id AS invoice_id,
    i.invoice_number,
    i.issue_date,
    COALESCE(c.company_name, i.project_name)::TEXT AS third_party_name,
    c.tax_id AS third_party_tax_id,
    il.tax_rate,
    ROUND(
      SUM(il.quantity * il.unit_price * (1 - COALESCE(il.discount_percent, 0) / 100))::NUMERIC,
      2
    ) AS base_imponible,
    ROUND(
      SUM(il.quantity * il.unit_price * (1 - COALESCE(il.discount_percent, 0) / 100) * il.tax_rate / 100)::NUMERIC,
      2
    ) AS cuota_iva
  FROM sales.invoices i
  JOIN sales.invoice_lines il ON il.invoice_id = i.id
  LEFT JOIN crm.clients c ON c.id = i.client_id
  WHERE i.status IN ('ISSUED', 'SENT', 'PAID', 'PARTIAL')
    AND i.issue_date BETWEEN p_start AND p_end
    AND il.tax_rate > 0
  GROUP BY i.id, i.invoice_number, i.issue_date, c.company_name, i.project_name, c.tax_id, il.tax_rate

  UNION ALL

  -- IVA Soportado: facturas de compra (por línea y tipo de IVA)
  SELECT
    'SOPORTADO'::TEXT AS tipo,
    pi.id AS invoice_id,
    pi.invoice_number,
    pi.issue_date,
    pi.supplier_name AS third_party_name,
    pi.supplier_tax_id AS third_party_tax_id,
    pil.tax_rate,
    ROUND(SUM(pil.subtotal)::NUMERIC, 2) AS base_imponible,
    ROUND(SUM(pil.tax_amount)::NUMERIC, 2) AS cuota_iva
  FROM sales.purchase_invoices pi
  JOIN sales.purchase_invoice_lines pil ON pil.purchase_invoice_id = pi.id
  WHERE pi.status IN ('APPROVED', 'PAID', 'PARTIAL')
    AND pi.issue_date BETWEEN p_start AND p_end
    AND pil.tax_rate > 0
  GROUP BY pi.id, pi.invoice_number, pi.issue_date, pi.supplier_name, pi.supplier_tax_id, pil.tax_rate

  ORDER BY issue_date, tipo;
$$;

-- Wrapper público
CREATE OR REPLACE FUNCTION get_vat_detail_for_export(
  p_start DATE,
  p_end DATE
)
RETURNS TABLE (
  tipo TEXT,
  invoice_id UUID,
  invoice_number TEXT,
  issue_date DATE,
  third_party_name TEXT,
  third_party_tax_id TEXT,
  tax_rate NUMERIC,
  base_imponible NUMERIC,
  cuota_iva NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM accounting.get_vat_detail_for_export(p_start, p_end);
$$;
