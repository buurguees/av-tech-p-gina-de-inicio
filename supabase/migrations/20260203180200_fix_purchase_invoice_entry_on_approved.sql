-- =====================================================
-- FIX: Asiento de compra se genera al APROBAR (APPROVED)
-- El flujo real es DRAFT → PENDING_VALIDATION → REGISTERED → APPROVED.
-- Contabilizar al pasar a APPROVED y mantener idempotencia.
-- =====================================================

-- Función: generar asiento solo cuando la factura de compra pasa a APPROVED
CREATE OR REPLACE FUNCTION accounting.auto_create_invoice_purchase_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, sales, internal
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_date DATE;
BEGIN
  -- Generar asiento cuando pasa a APPROVED (estado contabilizable)
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    SELECT id INTO v_entry_id
    FROM accounting.journal_entries
    WHERE reference_id = NEW.id
      AND reference_type = 'purchase_invoice'
      AND entry_type = 'INVOICE_PURCHASE';

    IF v_entry_id IS NULL THEN
      -- Fecha contable: issue_date si existe, sino fecha de aprobación
      v_entry_date := COALESCE(NEW.issue_date, CURRENT_DATE);
      PERFORM accounting.create_invoice_purchase_entry(
        p_purchase_invoice_id := NEW.id,
        p_entry_date := v_entry_date
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: disparar en UPDATE de status cuando pasa a APPROVED
DROP TRIGGER IF EXISTS trigger_auto_create_invoice_purchase_entry ON sales.purchase_invoices;
CREATE TRIGGER trigger_auto_create_invoice_purchase_entry
  AFTER UPDATE OF status ON sales.purchase_invoices
  FOR EACH ROW
  WHEN (NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED'))
  EXECUTE FUNCTION accounting.auto_create_invoice_purchase_entry();

COMMENT ON FUNCTION accounting.auto_create_invoice_purchase_entry IS 'Genera asiento contable cuando la factura de compra pasa a APPROVED (idempotente).';
