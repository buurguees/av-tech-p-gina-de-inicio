-- 24. RPC: Resumen por perÃ­odo
CREATE OR REPLACE FUNCTION public.finance_get_period_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  period_start DATE,
  period_end DATE,
  total_invoiced NUMERIC,
  total_paid NUMERIC,
  total_pending NUMERIC,
  invoice_count BIGINT,
  paid_invoice_count BIGINT,
  partial_invoice_count BIGINT,
  overdue_invoice_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_start DATE;
  v_end DATE;
BEGIN
  -- Si no se proporcionan fechas, usar el mes actual
  v_start := COALESCE(p_start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
  v_end := COALESCE(p_end_date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE);
  
  RETURN QUERY
  SELECT 
    v_start AS period_start,
    v_end AS period_end,
    SUM(COALESCE(i.total, 0)) AS total_invoiced,
    SUM(COALESCE(i.paid_amount, 0)) AS total_paid,
    SUM(COALESCE(i.pending_amount, 0)) AS total_pending,
    COUNT(*) FILTER (WHERE i.status != 'CANCELLED') AS invoice_count,
    COUNT(*) FILTER (WHERE i.status = 'PAID') AS paid_invoice_count,
    COUNT(*) FILTER (WHERE i.status = 'PARTIAL') AS partial_invoice_count,
    COUNT(*) FILTER (WHERE i.status = 'OVERDUE') AS overdue_invoice_count
  FROM sales.invoices i
  WHERE i.issue_date BETWEEN v_start AND v_end
    OR (v_start IS NULL AND v_end IS NULL);
END;
$$;

-- ============================================
-- FASE 6: SEGURIDAD (RLS)
-- ============================================

-- 25. Habilitar RLS en invoice_payments
ALTER TABLE sales.invoice_payments ENABLE ROW LEVEL SECURITY;

-- 26. PolÃ­tica de lectura: usuarios autenticados pueden ver pagos
DROP POLICY IF EXISTS "Authenticated users can view invoice payments" ON sales.invoice_payments;
CREATE POLICY "Authenticated users can view invoice payments"
  ON sales.invoice_payments
  FOR SELECT
  TO authenticated
  USING (true);

-- 27. PolÃ­tica de inserciÃ³n: usuarios autenticados pueden crear pagos
DROP POLICY IF EXISTS "Authenticated users can create invoice payments" ON sales.invoice_payments;
CREATE POLICY "Authenticated users can create invoice payments"
  ON sales.invoice_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 28. PolÃ­tica de actualizaciÃ³n: usuarios autenticados pueden actualizar pagos
DROP POLICY IF EXISTS "Authenticated users can update invoice payments" ON sales.invoice_payments;
CREATE POLICY "Authenticated users can update invoice payments"
  ON sales.invoice_payments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 29. PolÃ­tica de eliminaciÃ³n: solo usuarios autenticados (validaciÃ³n adicional en RPC)
DROP POLICY IF EXISTS "Authenticated users can delete invoice payments" ON sales.invoice_payments;
CREATE POLICY "Authenticated users can delete invoice payments"
  ON sales.invoice_payments
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- FASE 7: PREPARACIÃ“N PARA FACTURAS DE COMPRA (Opcional)
-- ============================================

-- 30. Crear tabla para facturas de compra (gastos/proveedores)
CREATE TABLE IF NOT EXISTS sales.purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE,
  supplier_name TEXT NOT NULL,
  supplier_tax_id TEXT,
  project_id UUID REFERENCES projects.projects(id),
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED')),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  pending_amount NUMERIC(12,2) GENERATED ALWAYS AS (COALESCE(total, 0) - COALESCE(paid_amount, 0)) STORED,
  notes TEXT,
  internal_notes TEXT,
  created_by UUID REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ
);

-- 31. Crear tabla para pagos de facturas de compra
CREATE TABLE IF NOT EXISTS sales.purchase_invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID NOT NULL REFERENCES sales.purchase_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('TRANSFER', 'CASH', 'CARD', 'CHECK', 'OTHER')),
  bank_reference TEXT,
  notes TEXT,
  is_confirmed BOOLEAN DEFAULT true,
  registered_by UUID NOT NULL REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_purchase_amount_positive CHECK (amount > 0)
);

-- 32. Ãndices para facturas de compra
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_project ON sales.purchase_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON sales.purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_payments_invoice ON sales.purchase_invoice_payments(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_payments_date ON sales.purchase_invoice_payments(payment_date);

-- 33. Vista: Resumen financiero completo (ventas vs compras)
CREATE OR REPLACE VIEW sales.financial_summary AS
SELECT 
  'SALES' AS transaction_type,
  SUM(COALESCE(i.total, 0)) AS total_amount,
  SUM(COALESCE(i.paid_amount, 0)) AS total_paid,
  SUM(COALESCE(i.pending_amount, 0)) AS total_pending,
  COUNT(*) AS transaction_count
FROM sales.invoices i
WHERE i.status != 'CANCELLED'
UNION ALL
SELECT 
  'PURCHASES' AS transaction_type,
  -SUM(COALESCE(pi.total, 0)) AS total_amount,
  -SUM(COALESCE(pi.paid_amount, 0)) AS total_paid,
  -SUM(COALESCE(pi.pending_amount, 0)) AS total_pending,
  COUNT(*) AS transaction_count
FROM sales.purchase_invoices pi
WHERE pi.status != 'CANCELLED';


