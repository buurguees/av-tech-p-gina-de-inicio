--
-- Módulo de Compras - Fase 3 & 7: Gestión de Líneas y Automatización de Pagos
--

-- 1. RPC: Añadir línea a Factura de Compra
CREATE OR REPLACE FUNCTION public.add_purchase_invoice_line(
    p_purchase_invoice_id UUID,
    p_description TEXT,
    p_quantity NUMERIC,
    p_unit_price NUMERIC,
    p_tax_rate NUMERIC DEFAULT 21,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
    v_line_id UUID;
    v_line_number INTEGER;
BEGIN
    -- Obtener siguiente número de línea
    SELECT COALESCE(MAX(line_number), 0) + 1 INTO v_line_number
    FROM sales.purchase_invoice_lines
    WHERE purchase_invoice_id = p_purchase_invoice_id;

    INSERT INTO sales.purchase_invoice_lines (
        purchase_invoice_id, line_number, description,
        quantity, unit_price, tax_rate, notes
    ) VALUES (
        p_purchase_invoice_id, v_line_number, p_description,
        p_quantity, p_unit_price, p_tax_rate, p_notes
    )
    RETURNING id INTO v_line_id;

    -- Recalcular cabecera
    PERFORM public.recalculate_purchase_invoice(p_purchase_invoice_id);

    RETURN v_line_id;
END;
$$;

-- 2. Trigger: Recalcular paid_amount tras pagos
CREATE OR REPLACE FUNCTION sales.trigger_recalculate_purchase_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sales.purchase_invoices
  SET 
    paid_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM sales.purchase_invoice_payments
      WHERE purchase_invoice_id = COALESCE(NEW.purchase_invoice_id, OLD.purchase_invoice_id)
    ),
    -- El estado cambia automáticamente a PAID si el pendiente es 0
    status = CASE 
      WHEN (SELECT COALESCE(SUM(amount), 0) FROM sales.purchase_invoice_payments WHERE purchase_invoice_id = COALESCE(NEW.purchase_invoice_id, OLD.purchase_invoice_id)) >= total THEN 'PAID'
      WHEN (SELECT COALESCE(SUM(amount), 0) FROM sales.purchase_invoice_payments WHERE purchase_invoice_id = COALESCE(NEW.purchase_invoice_id, OLD.purchase_invoice_id)) > 0 THEN 'PARTIAL'
      ELSE 'REGISTERED'
    END,
    updated_at = now()
  WHERE id = COALESCE(NEW.purchase_invoice_id, OLD.purchase_invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_recalculate_purchase_paid ON sales.purchase_invoice_payments;
CREATE TRIGGER tr_recalculate_purchase_paid
AFTER INSERT OR UPDATE OR DELETE ON sales.purchase_invoice_payments
FOR EACH ROW EXECUTE FUNCTION sales.trigger_recalculate_purchase_paid_amount();

-- 3. RPC: Registrar Pago de Compra
CREATE OR REPLACE FUNCTION public.register_purchase_payment(
    p_purchase_invoice_id UUID,
    p_amount NUMERIC,
    p_payment_date DATE,
    p_payment_method TEXT,
    p_company_bank_account_id TEXT DEFAULT NULL,
    p_bank_reference TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, internal, public
AS $$
DECLARE
    v_payment_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    INSERT INTO sales.purchase_invoice_payments (
        purchase_invoice_id, amount, payment_date, payment_method,
        company_bank_account_id, bank_reference, notes, registered_by
    ) VALUES (
        p_purchase_invoice_id, p_amount, p_payment_date, p_payment_method,
        p_company_bank_account_id, p_bank_reference, p_notes, v_user_id
    )
    RETURNING id INTO v_payment_id;

    RETURN v_payment_id;
END;
$$;
