--
-- Módulo de Compras - Fase 8: Integración con Informes (Vista Consolidada)
--

-- 1. Vista: Movimientos Financieros (Ingresos y Gastos)
CREATE OR REPLACE VIEW sales.financial_movements AS
SELECT 
  'INCOME' as movement_type,
  i.id,
  i.invoice_number,
  i.issue_date,
  i.total as amount,
  c.company_name as counterparty,
  'CLIENT' as counterparty_type,
  i.project_id
FROM sales.invoices i
JOIN crm.clients c ON i.client_id = c.id
WHERE i.status IN ('ISSUED', 'PAID', 'PARTIAL')

UNION ALL

SELECT 
  'EXPENSE' as movement_type,
  pi.id,
  pi.invoice_number,
  pi.issue_date,
  -pi.total as amount,  -- Negativo para gastos
  COALESCE(s.company_name, t.company_name, pi.supplier_name) as counterparty,
  CASE 
    WHEN pi.supplier_id IS NOT NULL THEN 'SUPPLIER'
    WHEN pi.technician_id IS NOT NULL THEN 'TECHNICIAN'
    ELSE 'EXPENSE'
  END as counterparty_type,
  pi.project_id
FROM sales.purchase_invoices pi
LEFT JOIN internal.suppliers s ON pi.supplier_id = s.id
LEFT JOIN internal.technicians t ON pi.technician_id = t.id
WHERE pi.status IN ('ISSUED', 'REGISTERED', 'PARTIAL', 'PAID');

-- Comentario para documentación
COMMENT ON VIEW sales.financial_movements IS 'Vista consolidada de todos los movimientos de facturación (Ventas y Compras) para trazabilidad financiera.';
