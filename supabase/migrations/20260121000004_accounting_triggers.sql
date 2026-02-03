-- ============================================
-- TRIGGERS PARA GENERAR ASIENTOS AUTOMÁTICOS
-- ============================================

-- 1. FUNCIÓN: Generar asiento automático cuando se emite una factura de venta
CREATE OR REPLACE FUNCTION accounting.auto_create_invoice_sale_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, sales, crm, internal
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  -- Solo generar asiento cuando la factura pasa a estado ISSUED
  IF NEW.status = 'ISSUED' AND (OLD.status IS NULL OR OLD.status != 'ISSUED') THEN
    -- Verificar que no existe ya un asiento para esta factura
    SELECT id INTO v_entry_id
    FROM accounting.journal_entries
    WHERE reference_id = NEW.id
      AND reference_type = 'invoice'
      AND entry_type = 'INVOICE_SALE';
    
    -- Solo crear si no existe
    IF v_entry_id IS NULL THEN
      PERFORM accounting.create_invoice_sale_entry(
        p_invoice_id := NEW.id,
        p_entry_date := NEW.issue_date
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. TRIGGER: Activar generación automática de asiento al emitir factura de venta
DROP TRIGGER IF EXISTS trigger_auto_create_invoice_sale_entry ON sales.invoices;
CREATE TRIGGER trigger_auto_create_invoice_sale_entry
  AFTER UPDATE OF status ON sales.invoices
  FOR EACH ROW
  WHEN (NEW.status = 'ISSUED' AND (OLD.status IS NULL OR OLD.status != 'ISSUED'))
  EXECUTE FUNCTION accounting.auto_create_invoice_sale_entry();

-- 3. FUNCIÓN: Generar asiento automático cuando se emite una factura de compra
CREATE OR REPLACE FUNCTION accounting.auto_create_invoice_purchase_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, sales, internal
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  -- Solo generar asiento cuando la factura pasa a estado ISSUED o REGISTERED
  IF (NEW.status = 'ISSUED' OR NEW.status = 'REGISTERED') 
     AND (OLD.status IS NULL OR (OLD.status != 'ISSUED' AND OLD.status != 'REGISTERED')) THEN
    -- Verificar que no existe ya un asiento para esta factura
    SELECT id INTO v_entry_id
    FROM accounting.journal_entries
    WHERE reference_id = NEW.id
      AND reference_type = 'purchase_invoice'
      AND entry_type = 'INVOICE_PURCHASE';
    
    -- Solo crear si no existe
    IF v_entry_id IS NULL THEN
      PERFORM accounting.create_invoice_purchase_entry(
        p_purchase_invoice_id := NEW.id,
        p_entry_date := NEW.issue_date
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. TRIGGER: Activar generación automática de asiento al emitir factura de compra
DROP TRIGGER IF EXISTS trigger_auto_create_invoice_purchase_entry ON sales.purchase_invoices;
CREATE TRIGGER trigger_auto_create_invoice_purchase_entry
  AFTER UPDATE OF status ON sales.purchase_invoices
  FOR EACH ROW
  WHEN ((NEW.status = 'ISSUED' OR NEW.status = 'REGISTERED') 
        AND (OLD.status IS NULL OR (OLD.status != 'ISSUED' AND OLD.status != 'REGISTERED')))
  EXECUTE FUNCTION accounting.auto_create_invoice_purchase_entry();

-- 5. FUNCIÓN: Verificar que los asientos estén balanceados (DEBE = HABER)
CREATE OR REPLACE FUNCTION accounting.validate_balanced_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_debit NUMERIC(12,2) := 0;
  v_total_credit NUMERIC(12,2) := 0;
BEGIN
  -- Calcular totales
  SELECT 
    COALESCE(SUM(CASE WHEN debit_credit = 'DEBIT' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN debit_credit = 'CREDIT' THEN amount ELSE 0 END), 0)
  INTO v_total_debit, v_total_credit
  FROM accounting.journal_entry_lines
  WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
  
  -- Verificar balance
  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Asiento desbalanceado: DEBE (%) != HABER (%)', v_total_debit, v_total_credit;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. TRIGGER: Validar balance antes de permitir bloqueo de asiento
DROP TRIGGER IF EXISTS trigger_validate_balanced_entry ON accounting.journal_entries;
CREATE TRIGGER trigger_validate_balanced_entry
  BEFORE UPDATE OF is_locked ON accounting.journal_entries
  FOR EACH ROW
  WHEN (NEW.is_locked = true AND (OLD.is_locked IS NULL OR OLD.is_locked = false))
  EXECUTE FUNCTION accounting.validate_balanced_entry();

-- Comentarios
COMMENT ON FUNCTION accounting.auto_create_invoice_sale_entry IS 'Genera automáticamente un asiento contable cuando se emite una factura de venta';
COMMENT ON FUNCTION accounting.auto_create_invoice_purchase_entry IS 'Genera automáticamente un asiento contable cuando se emite una factura de compra';
COMMENT ON FUNCTION accounting.validate_balanced_entry IS 'Valida que un asiento esté balanceado (DEBE = HABER) antes de bloquearlo';
