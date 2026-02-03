-- FASE 3: FUNCIONES Y TRIGGERS
CREATE OR REPLACE FUNCTION sales.recalculate_invoice_paid_amount(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_total_paid NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM sales.invoice_payments
  WHERE invoice_id = p_invoice_id
    AND is_confirmed = true;
  
  UPDATE sales.invoices
  SET paid_amount = v_total_paid,
      updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION sales.update_invoice_status_from_payments(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_invoice RECORD;
BEGIN
  SELECT id, total, paid_amount, status, due_date
  INTO v_invoice
  FROM sales.invoices
  WHERE id = p_invoice_id;
  
  IF v_invoice.id IS NULL THEN
    RETURN;
  END IF;
  
  IF v_invoice.paid_amount >= COALESCE(v_invoice.total, 0) THEN
    UPDATE sales.invoices
    SET status = 'PAID',
        updated_at = now()
    WHERE id = p_invoice_id
      AND status NOT IN ('PAID', 'CANCELLED');
      
  ELSIF v_invoice.paid_amount > 0 AND v_invoice.paid_amount < COALESCE(v_invoice.total, 0) THEN
    UPDATE sales.invoices
    SET status = 'PARTIAL',
        updated_at = now()
    WHERE id = p_invoice_id
      AND status NOT IN ('PAID', 'CANCELLED');
      
  ELSIF v_invoice.status = 'ISSUED' 
    AND v_invoice.due_date IS NOT NULL 
    AND v_invoice.due_date < CURRENT_DATE 
    AND v_invoice.paid_amount < COALESCE(v_invoice.total, 0) THEN
    UPDATE sales.invoices
    SET status = 'OVERDUE',
        updated_at = now()
    WHERE id = p_invoice_id
      AND status NOT IN ('PAID', 'CANCELLED');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION sales.lock_invoice_on_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
BEGIN
  IF NEW.status = 'ISSUED' AND (OLD.status IS NULL OR OLD.status != 'ISSUED') THEN
    NEW.is_locked := true;
    NEW.locked_at := now();
    
    IF NEW.issue_date IS NULL THEN
      NEW.issue_date := CURRENT_DATE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sales.trigger_recalculate_paid_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;
  
  PERFORM sales.recalculate_invoice_paid_amount(v_invoice_id);
  PERFORM sales.update_invoice_status_from_payments(v_invoice_id);
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

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
