-- =============================================
-- MEJORA DE SISTEMA DE PAGOS: CUENTAS BANCARIAS Y EDICIÓN
-- =============================================
-- Fecha: 2026-01-17
-- Descripción: Añade soporte para rastrear en qué cuenta bancaria se recibe el pago
--              y permite la edición de registros de pago existentes.
-- =============================================

BEGIN;

-- 1. Añadir columna para la cuenta bancaria de la empresa
ALTER TABLE sales.invoice_payments 
ADD COLUMN IF NOT EXISTS company_bank_account_id TEXT;

-- 2. Actualizar RPC para registrar pagos incluyendo la cuenta bancaria
-- Primero eliminamos la función anterior para evitar conflictos de firma
DROP FUNCTION IF EXISTS public.finance_register_payment(uuid, numeric, date, text, text, text);

CREATE OR REPLACE FUNCTION public.finance_register_payment(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_payment_date DATE,
  p_payment_method TEXT,
  p_bank_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_company_bank_account_id TEXT DEFAULT NULL
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
  
  -- Validar que no exceda el total (permitimos un margen pequeño por redondeo o forzamos exactitud)
  -- Si el usuario quiere permitir sobrepago, habría que cambiar esta lógica.
  -- Por ahora mantenemos la restricción por seguridad.
  IF (v_current_total_paid + p_amount) > (COALESCE(v_invoice.total, 0) + 0.01) THEN
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
    registered_by,
    company_bank_account_id
  )
  VALUES (
    p_invoice_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_bank_reference,
    p_notes,
    v_user_id,
    p_company_bank_account_id
  )
  RETURNING id INTO v_payment_id;
  
  RETURN v_payment_id;
END;
$$;

-- 3. Crear RPC para actualizar pagos existentes
CREATE OR REPLACE FUNCTION public.finance_update_payment(
  p_payment_id UUID,
  p_amount NUMERIC DEFAULT NULL,
  p_payment_date DATE DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_bank_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_company_bank_account_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, internal, public
AS $$
DECLARE
  v_user_id UUID;
  v_payment RECORD;
  v_invoice RECORD;
  v_new_total_paid NUMERIC(12,2);
BEGIN
  -- Validar usuario
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;
  
  -- Obtener datos del pago actual
  SELECT * INTO v_payment
  FROM sales.invoice_payments
  WHERE id = p_payment_id;
  
  IF v_payment.id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Obtener total de la factura
  SELECT total FROM sales.invoices WHERE id = v_payment.invoice_id INTO v_invoice;
  
  -- Si se cambia el importe, validar que el nuevo total no exceda el de la factura
  IF p_amount IS NOT NULL AND p_amount != v_payment.amount THEN
    SELECT COALESCE(SUM(amount), 0) - v_payment.amount + p_amount
    INTO v_new_total_paid
    FROM sales.invoice_payments
    WHERE invoice_id = v_payment.invoice_id
      AND is_confirmed = true;
      
    IF v_new_total_paid > (v_invoice.total + 0.01) THEN
      RAISE EXCEPTION 'El nuevo importe total de pagos excede el total de la factura';
    END IF;
  END IF;
  
  -- Actualizar registro
  UPDATE sales.invoice_payments
  SET
    amount = COALESCE(p_amount, amount),
    payment_date = COALESCE(p_payment_date, payment_date),
    payment_method = COALESCE(p_payment_method, payment_method),
    bank_reference = COALESCE(p_bank_reference, bank_reference),
    notes = COALESCE(p_notes, notes),
    company_bank_account_id = COALESCE(p_company_bank_account_id, company_bank_account_id),
    updated_at = now()
  WHERE id = p_payment_id;
  
  -- El trigger de la tabla se encargará de recalcular el status de la factura
  
  RETURN FOUND;
END;
$$;

-- 4. Actualizar finance_get_invoice_payments para incluir el ID del banco
-- IMPORTANTE: Eliminamos primero porque cambiamos el tipo de retorno (DROP CASCADE no es necesario aqui, solo la función)
DROP FUNCTION IF EXISTS public.finance_get_invoice_payments(uuid);

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
  created_at TIMESTAMPTZ,
  company_bank_account_id TEXT
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
    ip.created_at,
    ip.company_bank_account_id
  FROM sales.invoice_payments ip
  LEFT JOIN internal.authorized_users au ON au.id = ip.registered_by
  WHERE ip.invoice_id = p_invoice_id
  ORDER BY ip.payment_date DESC, ip.created_at DESC;
END;
$$;

COMMIT;
