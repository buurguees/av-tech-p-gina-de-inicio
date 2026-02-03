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


