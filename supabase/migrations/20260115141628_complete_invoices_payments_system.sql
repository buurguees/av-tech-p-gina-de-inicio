-- ============================================
-- MIGRACIÓN COMPLETA: SISTEMA DE PAGOS Y FACTURAS
-- ============================================
-- Fecha: 2026-01-15
-- Descripción: Implementa sistema completo de pagos para facturas con trazabilidad,
--              validaciones, triggers automáticos y reporting
-- ============================================

BEGIN;

-- ============================================
-- FASE 1: ACTUALIZACIÓN DE TABLA EXISTENTE
-- ============================================

-- 1. Añadir columnas faltantes a sales.invoices
ALTER TABLE sales.invoices
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- 2. Añadir columna GENERATED para pending_amount
-- Nota: No podemos usar IF NOT EXISTS con GENERATED, así que verificamos primero
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'sales' 
    AND table_name = 'invoices' 
    AND column_name = 'pending_amount'
  ) THEN
    ALTER TABLE sales.invoices
      ADD COLUMN pending_amount NUMERIC(12,2) 
        GENERATED ALWAYS AS (COALESCE(total, 0) - COALESCE(paid_amount, 0)) STORED;
  END IF;
END $$;

-- 3. Actualizar CHECK constraint de status para incluir 'PARTIAL'
ALTER TABLE sales.invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;
  
ALTER TABLE sales.invoices
  ADD CONSTRAINT invoices_status_check 
    CHECK (status = ANY (ARRAY['DRAFT'::text, 'ISSUED'::text, 'SENT'::text, 'PARTIAL'::text, 'PAID'::text, 'OVERDUE'::text, 'CANCELLED'::text]));

-- 4. Inicializar paid_amount para facturas existentes con status = 'PAID'
UPDATE sales.invoices
SET paid_amount = COALESCE(total, 0)
WHERE status = 'PAID' AND (paid_amount IS NULL OR paid_amount = 0);

-- 5. Bloquear facturas emitidas existentes
UPDATE sales.invoices
SET is_locked = true, 
    locked_at = COALESCE(issue_date::timestamptz, created_at)
WHERE status IN ('ISSUED', 'SENT', 'PAID', 'OVERDUE') 
  AND (is_locked IS NULL OR is_locked = false);

-- ============================================
-- FASE 2: CREACIÓN DE NUEVA TABLA
-- ============================================

-- 6. Crear tabla sales.invoice_payments
CREATE TABLE IF NOT EXISTS sales.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sales.invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('TRANSFER', 'CASH', 'CARD', 'DIRECT_DEBIT', 'CHECK', 'OTHER')),
  bank_reference TEXT,
  notes TEXT,
  is_confirmed BOOLEAN DEFAULT true,
  registered_by UUID NOT NULL REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_amount_positive CHECK (amount > 0)
);

-- 7. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON sales.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_date ON sales.invoice_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_registered_by ON sales.invoice_payments(registered_by);

-- ============================================
-- FASE 3: FUNCIONES Y TRIGGERS
-- ============================================

-- 8. Función para recalcular paid_amount desde pagos
CREATE OR REPLACE FUNCTION sales.recalculate_invoice_paid_amount(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_total_paid NUMERIC(12,2);
BEGIN
  -- Sumar todos los pagos confirmados
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM sales.invoice_payments
  WHERE invoice_id = p_invoice_id
    AND is_confirmed = true;
  
  -- Actualizar paid_amount en la factura
  UPDATE sales.invoices
  SET paid_amount = v_total_paid,
      updated_at = now()
  WHERE id = p_invoice_id;
  
  -- pending_amount se recalcula automáticamente (GENERATED)
END;
$$;

-- 9. Función para actualizar estado de factura según pagos
CREATE OR REPLACE FUNCTION sales.update_invoice_status_from_payments(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_invoice RECORD;
BEGIN
  -- Obtener datos de la factura
  SELECT id, total, paid_amount, status, due_date
  INTO v_invoice
  FROM sales.invoices
  WHERE id = p_invoice_id;
  
  IF v_invoice.id IS NULL THEN
    RETURN;
  END IF;
  
  -- Actualizar estado según pagos
  IF v_invoice.paid_amount >= COALESCE(v_invoice.total, 0) THEN
    -- Completamente pagada
    UPDATE sales.invoices
    SET status = 'PAID',
        updated_at = now()
    WHERE id = p_invoice_id
      AND status NOT IN ('PAID', 'CANCELLED');
      
  ELSIF v_invoice.paid_amount > 0 AND v_invoice.paid_amount < COALESCE(v_invoice.total, 0) THEN
    -- Parcialmente pagada
    UPDATE sales.invoices
    SET status = 'PARTIAL',
        updated_at = now()
    WHERE id = p_invoice_id
      AND status NOT IN ('PAID', 'CANCELLED');
      
  ELSIF v_invoice.status = 'ISSUED' 
    AND v_invoice.due_date IS NOT NULL 
    AND v_invoice.due_date < CURRENT_DATE 
    AND v_invoice.paid_amount < COALESCE(v_invoice.total, 0) THEN
    -- Vencida
    UPDATE sales.invoices
    SET status = 'OVERDUE',
        updated_at = now()
    WHERE id = p_invoice_id
      AND status NOT IN ('PAID', 'CANCELLED');
  END IF;
END;
$$;

-- 10. Función para bloquear factura al emitir
CREATE OR REPLACE FUNCTION sales.lock_invoice_on_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
BEGIN
  -- Si el estado cambia a ISSUED, bloquear la factura
  IF NEW.status = 'ISSUED' AND (OLD.status IS NULL OR OLD.status != 'ISSUED') THEN
    NEW.is_locked := true;
    NEW.locked_at := now();
    
    -- Asegurar que issue_date esté establecido
    IF NEW.issue_date IS NULL THEN
      NEW.issue_date := CURRENT_DATE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 11. Trigger para recalcular paid_amount cuando cambian los pagos
CREATE OR REPLACE FUNCTION sales.trigger_recalculate_paid_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  -- Determinar invoice_id según la operación
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;
  
  -- Recalcular paid_amount
  PERFORM sales.recalculate_invoice_paid_amount(v_invoice_id);
  
  -- Actualizar estado según pagos
  PERFORM sales.update_invoice_status_from_payments(v_invoice_id);
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 12. Crear triggers
DROP TRIGGER IF EXISTS trigger_recalculate_paid_amount ON sales.invoice_payments;
CREATE TRIGGER trigger_recalculate_paid_amount
  AFTER INSERT OR UPDATE OR DELETE ON sales.invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION sales.trigger_recalculate_paid_amount();

DROP TRIGGER IF EXISTS trigger_lock_invoice_on_issue ON sales.invoices;
CREATE TRIGGER trigger_lock_invoice_on_issue
  BEFORE UPDATE OF status ON sales.invoices
  FOR EACH ROW
  EXECUTE FUNCTION sales.lock_invoice_on_issue();

-- Trigger para actualizar updated_at en invoice_payments
CREATE OR REPLACE FUNCTION sales.update_invoice_payment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_invoice_payment_updated_at ON sales.invoice_payments;
CREATE TRIGGER trigger_update_invoice_payment_updated_at
  BEFORE UPDATE ON sales.invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION sales.update_invoice_payment_updated_at();

-- ============================================
-- FASE 4: RPCs DE FINANCE
-- ============================================

-- 13. RPC: Obtener factura completa con todos los campos
CREATE OR REPLACE FUNCTION public.finance_get_invoice(p_invoice_id UUID)
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  preliminary_number TEXT,
  source_quote_id UUID,
  source_quote_number TEXT,
  client_id UUID,
  client_name TEXT,
  project_id UUID,
  project_name TEXT,
  project_number TEXT,
  status TEXT,
  issue_date DATE,
  due_date DATE,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC,
  paid_amount NUMERIC,
  pending_amount NUMERIC,
  discount_amount NUMERIC,
  internal_notes TEXT,
  payment_terms TEXT,
  is_locked BOOLEAN,
  notes TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, crm, projects, quotes, internal, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.invoice_number,
    i.preliminary_number,
    i.source_quote_id,
    q.quote_number AS source_quote_number,
    i.client_id,
    c.company_name AS client_name,
    i.project_id,
    i.project_name,
    p.project_number,
    i.status,
    i.issue_date,
    i.due_date,
    COALESCE(i.subtotal, 0) AS subtotal,
    COALESCE(i.tax_amount, 0) AS tax_amount,
    COALESCE(i.total, 0) AS total,
    COALESCE(i.paid_amount, 0) AS paid_amount,
    COALESCE(i.pending_amount, 0) AS pending_amount,
    COALESCE(i.discount_amount, 0) AS discount_amount,
    i.internal_notes,
    i.payment_terms,
    COALESCE(i.is_locked, false) AS is_locked,
    i.notes,
    i.created_by,
    au.full_name AS created_by_name,
    i.created_at,
    i.updated_at
  FROM sales.invoices i
  LEFT JOIN crm.clients c ON c.id = i.client_id
  LEFT JOIN projects.projects p ON p.id = i.project_id
  LEFT JOIN quotes.quotes q ON q.id = i.source_quote_id
  LEFT JOIN internal.authorized_users au ON au.id = i.created_by
  WHERE i.id = p_invoice_id;
END;
$$;

-- 14. RPC: Registrar pago
CREATE OR REPLACE FUNCTION public.finance_register_payment(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_date DATE,
  p_payment_method TEXT,
  p_bank_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, internal, public
AS $$
DECLARE
  v_invoice RECORD;
  v_user_id UUID;
  v_payment_id UUID;
  v_current_total_paid NUMERIC(12,2);
BEGIN
  -- Validar usuario
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;
  
  -- Validar amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El importe del pago debe ser mayor que 0';
  END IF;
  
  -- Obtener datos de la factura
  SELECT id, total, paid_amount, status, is_locked
  INTO v_invoice
  FROM sales.invoices
  WHERE id = p_invoice_id;
  
  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;
  
  -- Validar estado de factura
  IF v_invoice.status NOT IN ('ISSUED', 'PARTIAL', 'OVERDUE') THEN
    RAISE EXCEPTION 'Solo se pueden registrar pagos en facturas emitidas, parcialmente pagadas o vencidas';
  END IF;
  
  -- Calcular total actual de pagos
  SELECT COALESCE(SUM(amount), 0)
  INTO v_current_total_paid
  FROM sales.invoice_payments
  WHERE invoice_id = p_invoice_id
    AND is_confirmed = true;
  
  -- Validar que no exceda el total
  IF (v_current_total_paid + p_amount) > COALESCE(v_invoice.total, 0) THEN
    RAISE EXCEPTION 'El importe del pago excede el saldo pendiente de la factura';
  END IF;
  
  -- Insertar pago
  INSERT INTO sales.invoice_payments (
    invoice_id,
    amount,
    payment_date,
    payment_method,
    bank_reference,
    notes,
    registered_by
  )
  VALUES (
    p_invoice_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_bank_reference,
    p_notes,
    v_user_id
  )
  RETURNING id INTO v_payment_id;
  
  -- El trigger recalculará automáticamente paid_amount y actualizará el estado
  
  RETURN v_payment_id;
END;
$$;

-- 15. RPC: Obtener pagos de una factura
CREATE OR REPLACE FUNCTION public.finance_get_invoice_payments(p_invoice_id UUID)
RETURNS TABLE (
  id UUID,
  amount NUMERIC,
  payment_date DATE,
  payment_method TEXT,
  bank_reference TEXT,
  notes TEXT,
  is_confirmed BOOLEAN,
  registered_by UUID,
  registered_by_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, internal, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ip.id,
    ip.amount,
    ip.payment_date,
    ip.payment_method,
    ip.bank_reference,
    ip.notes,
    ip.is_confirmed,
    ip.registered_by,
    au.full_name AS registered_by_name,
    ip.created_at
  FROM sales.invoice_payments ip
  LEFT JOIN internal.authorized_users au ON au.id = ip.registered_by
  WHERE ip.invoice_id = p_invoice_id
  ORDER BY ip.payment_date DESC, ip.created_at DESC;
END;
$$;

-- 16. RPC: Eliminar pago
CREATE OR REPLACE FUNCTION public.finance_delete_payment(p_payment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, internal, public
AS $$
DECLARE
  v_user_id UUID;
  v_payment RECORD;
BEGIN
  -- Validar usuario
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;
  
  -- Obtener datos del pago
  SELECT id, invoice_id, is_confirmed
  INTO v_payment
  FROM sales.invoice_payments
  WHERE id = p_payment_id;
  
  IF v_payment.id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Solo permitir eliminar si está confirmado o es admin
  -- (Aquí se podría añadir validación de rol admin si es necesario)
  
  -- Eliminar pago (el trigger recalculará automáticamente)
  DELETE FROM sales.invoice_payments
  WHERE id = p_payment_id;
  
  RETURN FOUND;
END;
$$;

-- 17. RPC: Actualizar factura con validaciones
CREATE OR REPLACE FUNCTION public.finance_update_invoice(
  p_invoice_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL,
  p_payment_terms TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, internal, public
AS $$
DECLARE
  v_invoice RECORD;
  v_user_id UUID;
  v_has_payments BOOLEAN;
BEGIN
  -- Validar usuario
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;
  
  -- Obtener datos de la factura
  SELECT id, is_locked, status, client_id, project_id
  INTO v_invoice
  FROM sales.invoices
  WHERE id = p_invoice_id;
  
  IF v_invoice.id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Validar que no esté bloqueada (excepto para cambiar status a CANCELLED)
  IF v_invoice.is_locked = true AND (p_status IS NULL OR p_status != 'CANCELLED') THEN
    RAISE EXCEPTION 'No se puede editar una factura bloqueada';
  END IF;
  
  -- Verificar si hay pagos registrados
  SELECT EXISTS(SELECT 1 FROM sales.invoice_payments WHERE invoice_id = p_invoice_id)
  INTO v_has_payments;
  
  -- No permitir cambiar cliente o proyecto si hay pagos
  IF v_has_payments THEN
    IF (p_client_id IS NOT NULL AND p_client_id != v_invoice.client_id) OR
       (p_project_id IS NOT NULL AND p_project_id != v_invoice.project_id) THEN
      RAISE EXCEPTION 'No se puede modificar el cliente o proyecto de una factura con pagos registrados';
    END IF;
  END IF;
  
  -- Actualizar factura
  UPDATE sales.invoices
  SET
    client_id = COALESCE(p_client_id, client_id),
    project_id = COALESCE(p_project_id, project_id),
    project_name = COALESCE(p_project_name, project_name),
    due_date = COALESCE(p_due_date, due_date),
    notes = COALESCE(p_notes, notes),
    internal_notes = COALESCE(p_internal_notes, internal_notes),
    payment_terms = COALESCE(p_payment_terms, payment_terms),
    status = COALESCE(p_status, status),
    updated_at = now()
  WHERE id = p_invoice_id;
  
  RETURN FOUND;
END;
$$;

-- 18. RPC: Emitir factura
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
BEGIN
  -- Validar usuario
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;
  
  -- Obtener datos de la factura
  SELECT id, status, invoice_number, issue_date
  INTO v_invoice
  FROM sales.invoices
  WHERE id = p_invoice_id;
  
  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;
  
  IF v_invoice.status != 'DRAFT' THEN
    RAISE EXCEPTION 'Solo se pueden emitir facturas en estado DRAFT';
  END IF;
  
  -- Generar número de factura si no existe
  IF v_invoice.invoice_number IS NULL THEN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    
    -- Obtener siguiente número usando audit.get_next_number
    v_invoice_number := audit.get_next_number('INV', v_year);
  ELSE
    v_invoice_number := v_invoice.invoice_number;
  END IF;
  
  -- Actualizar factura: emitir y bloquear
  UPDATE sales.invoices
  SET
    invoice_number = v_invoice_number,
    issue_date = CURRENT_DATE,
    status = 'ISSUED',
    is_locked = true,
    locked_at = now(),
    updated_at = now()
  WHERE id = p_invoice_id;
  
  -- Retornar datos
  RETURN QUERY
  SELECT 
    v_invoice_number,
    CURRENT_DATE;
END;
$$;

-- ============================================
-- FASE 5: VISTAS Y REPORTING
-- ============================================

-- 19. Vista: Pagos con detalles completos
CREATE OR REPLACE VIEW sales.invoice_payments_with_details AS
SELECT 
  ip.id,
  ip.invoice_id,
  i.invoice_number,
  ip.amount,
  ip.payment_date,
  ip.payment_method,
  ip.bank_reference,
  ip.notes,
  ip.is_confirmed,
  ip.registered_by,
  au.full_name AS registered_by_name,
  ip.created_at,
  i.client_id,
  c.company_name AS client_name,
  i.project_id,
  p.project_number,
  i.project_name
FROM sales.invoice_payments ip
JOIN sales.invoices i ON i.id = ip.invoice_id
LEFT JOIN crm.clients c ON c.id = i.client_id
LEFT JOIN projects.projects p ON p.id = i.project_id
LEFT JOIN internal.authorized_users au ON au.id = ip.registered_by;

-- 20. Vista: Resumen de pagos por cliente
CREATE OR REPLACE VIEW sales.client_payment_summary AS
SELECT 
  i.client_id,
  c.company_name AS client_name,
  COUNT(DISTINCT i.id) AS invoice_count,
  COUNT(ip.id) AS payment_count,
  SUM(ip.amount) AS total_paid,
  SUM(i.total) AS total_invoiced,
  SUM(COALESCE(i.pending_amount, 0)) AS total_pending
FROM sales.invoices i
LEFT JOIN sales.invoice_payments ip ON ip.invoice_id = i.id AND ip.is_confirmed = true
LEFT JOIN crm.clients c ON c.id = i.client_id
WHERE i.status != 'CANCELLED'
GROUP BY i.client_id, c.company_name;

-- 21. Vista: Resumen de pagos por proyecto
CREATE OR REPLACE VIEW sales.project_payment_summary AS
SELECT 
  i.project_id,
  p.project_number,
  i.project_name,
  COUNT(DISTINCT i.id) AS invoice_count,
  COUNT(ip.id) AS payment_count,
  SUM(ip.amount) AS total_paid,
  SUM(i.total) AS total_invoiced,
  SUM(COALESCE(i.pending_amount, 0)) AS total_pending
FROM sales.invoices i
LEFT JOIN sales.invoice_payments ip ON ip.invoice_id = i.id AND ip.is_confirmed = true
LEFT JOIN projects.projects p ON p.id = i.project_id
WHERE i.status != 'CANCELLED'
  AND i.project_id IS NOT NULL
GROUP BY i.project_id, p.project_number, i.project_name;

-- 22. RPC: Obtener pagos de un cliente
CREATE OR REPLACE FUNCTION public.finance_get_client_payments(p_client_id UUID)
RETURNS TABLE (
  payment_id UUID,
  invoice_id UUID,
  invoice_number TEXT,
  payment_date DATE,
  amount NUMERIC,
  payment_method TEXT,
  total_invoice NUMERIC,
  project_id UUID,
  project_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, projects, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ip.id AS payment_id,
    i.id AS invoice_id,
    i.invoice_number,
    ip.payment_date,
    ip.amount,
    ip.payment_method,
    i.total AS total_invoice,
    i.project_id,
    i.project_name
  FROM sales.invoice_payments ip
  JOIN sales.invoices i ON i.id = ip.invoice_id
  WHERE i.client_id = p_client_id
    AND ip.is_confirmed = true
  ORDER BY ip.payment_date DESC;
END;
$$;

-- 23. RPC: Obtener pagos de un proyecto
CREATE OR REPLACE FUNCTION public.finance_get_project_payments(p_project_id UUID)
RETURNS TABLE (
  payment_id UUID,
  invoice_id UUID,
  invoice_number TEXT,
  payment_date DATE,
  amount NUMERIC,
  payment_method TEXT,
  total_invoice NUMERIC,
  client_id UUID,
  client_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, crm, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ip.id AS payment_id,
    i.id AS invoice_id,
    i.invoice_number,
    ip.payment_date,
    ip.amount,
    ip.payment_method,
    i.total AS total_invoice,
    i.client_id,
    c.company_name AS client_name
  FROM sales.invoice_payments ip
  JOIN sales.invoices i ON i.id = ip.invoice_id
  LEFT JOIN crm.clients c ON c.id = i.client_id
  WHERE i.project_id = p_project_id
    AND ip.is_confirmed = true
  ORDER BY ip.payment_date DESC;
END;
$$;

-- 24. RPC: Resumen por período
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

-- 26. Política de lectura: usuarios autenticados pueden ver pagos
DROP POLICY IF EXISTS "Authenticated users can view invoice payments" ON sales.invoice_payments;
CREATE POLICY "Authenticated users can view invoice payments"
  ON sales.invoice_payments
  FOR SELECT
  TO authenticated
  USING (true);

-- 27. Política de inserción: usuarios autenticados pueden crear pagos
DROP POLICY IF EXISTS "Authenticated users can create invoice payments" ON sales.invoice_payments;
CREATE POLICY "Authenticated users can create invoice payments"
  ON sales.invoice_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 28. Política de actualización: usuarios autenticados pueden actualizar pagos
DROP POLICY IF EXISTS "Authenticated users can update invoice payments" ON sales.invoice_payments;
CREATE POLICY "Authenticated users can update invoice payments"
  ON sales.invoice_payments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 29. Política de eliminación: solo usuarios autenticados (validación adicional en RPC)
DROP POLICY IF EXISTS "Authenticated users can delete invoice payments" ON sales.invoice_payments;
CREATE POLICY "Authenticated users can delete invoice payments"
  ON sales.invoice_payments
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- FASE 7: PREPARACIÓN PARA FACTURAS DE COMPRA (Opcional)
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

-- 32. Índices para facturas de compra
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

COMMIT;
