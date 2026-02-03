-- ============================================
-- SCRIPT PARA CONTABILIZAR DATOS HISTÓRICOS
-- ============================================
-- Este script genera asientos contables para todos los datos existentes
-- que aún no han sido contabilizados (facturas, gastos, pagos, etc.)

-- 1. FUNCIÓN: Contabilizar facturas de venta históricas (ISSUED/PAID)
CREATE OR REPLACE FUNCTION accounting.backfill_sales_invoices()
RETURNS TABLE (
  invoice_id UUID,
  entry_id UUID,
  entry_number TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, sales, crm
AS $$
DECLARE
  v_invoice RECORD;
  v_entry_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Procesar todas las facturas emitidas que no tienen asiento contable
  FOR v_invoice IN
    SELECT 
      i.id,
      i.invoice_number,
      i.issue_date,
      i.status,
      i.total,
      i.tax_amount,
      i.subtotal,
      i.client_id,
      c.client_number,
      c.company_name,
      i.project_id,
      i.created_by
    FROM sales.invoices i
    JOIN crm.clients c ON i.client_id = c.id
    WHERE i.status IN ('ISSUED', 'PAID', 'SENT')
      AND NOT EXISTS (
        SELECT 1 FROM accounting.journal_entries je
        WHERE je.reference_id = i.id
          AND je.reference_type = 'invoice'
      )
    ORDER BY i.issue_date, i.created_at
  LOOP
    BEGIN
      -- Generar asiento contable
      v_entry_id := accounting.create_invoice_sale_entry(
        v_invoice.id,
        v_invoice.issue_date
      );
      
      v_count := v_count + 1;
      
      RETURN QUERY SELECT 
        v_invoice.id,
        v_entry_id,
        (SELECT entry_number FROM accounting.journal_entries WHERE id = v_entry_id),
        'SUCCESS'::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        v_invoice.id,
        NULL::UUID,
        NULL::TEXT,
        ('ERROR: ' || SQLERRM)::TEXT;
    END;
  END LOOP;
  
  RAISE NOTICE 'Procesadas % facturas de venta', v_count;
END;
$$;

-- 2. FUNCIÓN: Contabilizar facturas de compra históricas (ISSUED/REGISTERED/PAID)
CREATE OR REPLACE FUNCTION accounting.backfill_purchase_invoices()
RETURNS TABLE (
  invoice_id UUID,
  entry_id UUID,
  entry_number TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, sales, internal
AS $$
DECLARE
  v_invoice RECORD;
  v_entry_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Procesar todas las facturas de compra que no tienen asiento contable
  FOR v_invoice IN
    SELECT 
      pi.id,
      pi.invoice_number,
      pi.issue_date,
      pi.status,
      pi.total,
      pi.supplier_id,
      pi.technician_id,
      pi.document_type,
      pi.created_by
    FROM sales.purchase_invoices pi
    WHERE pi.status IN ('ISSUED', 'REGISTERED', 'PAID')
      AND NOT EXISTS (
        SELECT 1 FROM accounting.journal_entries je
        WHERE je.reference_id = pi.id
          AND je.reference_type = 'purchase_invoice'
      )
    ORDER BY pi.issue_date, pi.created_at
  LOOP
    BEGIN
      -- Generar asiento contable
      v_entry_id := accounting.create_invoice_purchase_entry(
        v_invoice.id,
        v_invoice.issue_date
      );
      
      v_count := v_count + 1;
      
      RETURN QUERY SELECT 
        v_invoice.id,
        v_entry_id,
        (SELECT entry_number FROM accounting.journal_entries WHERE id = v_entry_id),
        'SUCCESS'::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        v_invoice.id,
        NULL::UUID,
        NULL::TEXT,
        ('ERROR: ' || SQLERRM)::TEXT;
    END;
  END LOOP;
  
  RAISE NOTICE 'Procesadas % facturas de compra', v_count;
END;
$$;

-- 3. FUNCIÓN: Contabilizar pagos de facturas de compra históricos
CREATE OR REPLACE FUNCTION accounting.backfill_purchase_payments()
RETURNS TABLE (
  payment_id UUID,
  entry_id UUID,
  entry_number TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, sales
AS $$
DECLARE
  v_payment RECORD;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_account_pending TEXT;
  v_account_bank TEXT := '572000';
  v_count INTEGER := 0;
BEGIN
  -- Procesar todos los pagos que no tienen asiento contable
  FOR v_payment IN
    SELECT 
      pip.id,
      pip.purchase_invoice_id,
      pip.payment_date,
      pip.amount,
      pip.payment_method,
      pip.bank_reference,
      pi.invoice_number,
      pi.supplier_id,
      pi.technician_id,
      pip.created_by
    FROM sales.purchase_invoice_payments pip
    JOIN sales.purchase_invoices pi ON pip.purchase_invoice_id = pi.id
    WHERE NOT EXISTS (
        SELECT 1 FROM accounting.journal_entries je
        WHERE je.reference_id = pip.id
          AND je.reference_type = 'purchase_payment'
      )
    ORDER BY pip.payment_date, pip.created_at
  LOOP
    BEGIN
      -- Determinar cuenta de pendiente según tipo
      IF v_payment.supplier_id IS NOT NULL THEN
        v_account_pending := '400000'; -- Proveedores
      ELSIF v_payment.technician_id IS NOT NULL THEN
        v_account_pending := '410000'; -- Acreedores por servicios
      ELSE
        CONTINUE; -- Saltar si no tiene proveedor ni técnico
      END IF;
      
      -- Generar número de asiento
      v_entry_number := accounting.get_next_entry_number();
      
      -- Crear asiento
      INSERT INTO accounting.journal_entries (
        entry_number,
        entry_date,
        entry_type,
        description,
        reference_id,
        reference_type,
        created_by
      ) VALUES (
        v_entry_number,
        v_payment.payment_date,
        'PAYMENT_MADE',
        'Pago factura compra: ' || v_payment.invoice_number,
        v_payment.id,
        'purchase_payment',
        v_payment.created_by
      ) RETURNING id INTO v_entry_id;
      
      -- DEBE: Proveedores/Acreedores
      INSERT INTO accounting.journal_entry_lines (
        journal_entry_id,
        account_code,
        debit_credit,
        amount,
        description,
        line_order
      ) VALUES (
        v_entry_id,
        v_account_pending,
        'DEBIT',
        v_payment.amount,
        'Pago ' || v_payment.invoice_number,
        1
      );
      
      -- HABER: Banco
      INSERT INTO accounting.journal_entry_lines (
        journal_entry_id,
        account_code,
        debit_credit,
        amount,
        description,
        line_order
      ) VALUES (
        v_entry_id,
        v_account_bank,
        'CREDIT',
        v_payment.amount,
        'Pago factura ' || v_payment.invoice_number,
        2
      );
      
      v_count := v_count + 1;
      
      RETURN QUERY SELECT 
        v_payment.id,
        v_entry_id,
        v_entry_number,
        'SUCCESS'::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        v_payment.id,
        NULL::UUID,
        NULL::TEXT,
        ('ERROR: ' || SQLERRM)::TEXT;
    END;
  END LOOP;
  
  RAISE NOTICE 'Procesados % pagos de compra', v_count;
END;
$$;

-- 4. FUNCIÓN: Contabilizar pagos recibidos de clientes históricos
CREATE OR REPLACE FUNCTION accounting.backfill_client_payments()
RETURNS TABLE (
  payment_id UUID,
  entry_id UUID,
  entry_number TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, sales, crm
AS $$
DECLARE
  v_payment RECORD;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_account_client TEXT := '430000';
  v_account_bank TEXT := '572000';
  v_count INTEGER := 0;
BEGIN
  -- Procesar todos los pagos recibidos que no tienen asiento contable
  -- NOTA: Asumiendo que existe una tabla de pagos de clientes
  -- Si no existe, esta función no hará nada
  FOR v_payment IN
    SELECT 
      ip.id,
      ip.invoice_id,
      ip.payment_date,
      ip.amount,
      ip.payment_method,
      i.invoice_number,
      i.client_id,
      i.total,
      ip.created_by
    FROM sales.invoice_payments ip
    JOIN sales.invoices i ON ip.invoice_id = i.id
    WHERE NOT EXISTS (
        SELECT 1 FROM accounting.journal_entries je
        WHERE je.reference_id = ip.id
          AND je.reference_type = 'invoice_payment'
      )
    ORDER BY ip.payment_date, ip.created_at
  LOOP
    BEGIN
      -- Generar número de asiento
      v_entry_number := accounting.get_next_entry_number();
      
      -- Crear asiento
      INSERT INTO accounting.journal_entries (
        entry_number,
        entry_date,
        entry_type,
        description,
        reference_id,
        reference_type,
        created_by
      ) VALUES (
        v_entry_number,
        v_payment.payment_date,
        'PAYMENT_RECEIVED',
        'Cobro factura: ' || v_payment.invoice_number,
        v_payment.id,
        'invoice_payment',
        v_payment.created_by
      ) RETURNING id INTO v_entry_id;
      
      -- DEBE: Banco
      INSERT INTO accounting.journal_entry_lines (
        journal_entry_id,
        account_code,
        debit_credit,
        amount,
        description,
        line_order,
        third_party_id,
        third_party_type
      ) VALUES (
        v_entry_id,
        v_account_bank,
        'DEBIT',
        v_payment.amount,
        'Cobro ' || v_payment.invoice_number,
        1,
        v_payment.client_id,
        'CLIENT'
      );
      
      -- HABER: Clientes
      INSERT INTO accounting.journal_entry_lines (
        journal_entry_id,
        account_code,
        debit_credit,
        amount,
        description,
        line_order,
        third_party_id,
        third_party_type
      ) VALUES (
        v_entry_id,
        v_account_client,
        'CREDIT',
        v_payment.amount,
        'Cobro factura ' || v_payment.invoice_number,
        2,
        v_payment.client_id,
        'CLIENT'
      );
      
      v_count := v_count + 1;
      
      RETURN QUERY SELECT 
        v_payment.id,
        v_entry_id,
        v_entry_number,
        'SUCCESS'::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        v_payment.id,
        NULL::UUID,
        NULL::TEXT,
        ('ERROR: ' || SQLERRM)::TEXT;
    END;
  END LOOP;
  
  RAISE NOTICE 'Procesados % pagos de clientes', v_count;
END;
$$;

-- 5. FUNCIÓN: Ejecutar todo el proceso de contabilización histórica
CREATE OR REPLACE FUNCTION accounting.backfill_all_historical_data()
RETURNS TABLE (
  process_name TEXT,
  records_processed INTEGER,
  errors_count INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, public
AS $$
DECLARE
  v_sales_count INTEGER;
  v_purchase_count INTEGER;
  v_purchase_payments_count INTEGER;
  v_client_payments_count INTEGER;
  v_sales_errors INTEGER;
  v_purchase_errors INTEGER;
  v_purchase_payments_errors INTEGER;
  v_client_payments_errors INTEGER;
BEGIN
  -- Contabilizar facturas de venta
  SELECT COUNT(*) INTO v_sales_count
  FROM accounting.backfill_sales_invoices() b
  WHERE b.status = 'SUCCESS';
  
  SELECT COUNT(*) INTO v_sales_errors
  FROM accounting.backfill_sales_invoices() b
  WHERE b.status LIKE 'ERROR%';
  
  RETURN QUERY SELECT 
    'Facturas de Venta'::TEXT,
    v_sales_count,
    v_sales_errors,
    CASE WHEN v_sales_errors > 0 THEN 'COMPLETED_WITH_ERRORS' ELSE 'SUCCESS' END;
  
  -- Contabilizar facturas de compra
  SELECT COUNT(*) INTO v_purchase_count
  FROM accounting.backfill_purchase_invoices() b
  WHERE b.status = 'SUCCESS';
  
  SELECT COUNT(*) INTO v_purchase_errors
  FROM accounting.backfill_purchase_invoices() b
  WHERE b.status LIKE 'ERROR%';
  
  RETURN QUERY SELECT 
    'Facturas de Compra'::TEXT,
    v_purchase_count,
    v_purchase_errors,
    CASE WHEN v_purchase_errors > 0 THEN 'COMPLETED_WITH_ERRORS' ELSE 'SUCCESS' END;
  
  -- Contabilizar pagos de compra
  SELECT COUNT(*) INTO v_purchase_payments_count
  FROM accounting.backfill_purchase_payments() b
  WHERE b.status = 'SUCCESS';
  
  SELECT COUNT(*) INTO v_purchase_payments_errors
  FROM accounting.backfill_purchase_payments() b
  WHERE b.status LIKE 'ERROR%';
  
  RETURN QUERY SELECT 
    'Pagos de Compra'::TEXT,
    v_purchase_payments_count,
    v_purchase_payments_errors,
    CASE WHEN v_purchase_payments_errors > 0 THEN 'COMPLETED_WITH_ERRORS' ELSE 'SUCCESS' END;
  
  -- Contabilizar pagos de clientes (si existe la tabla)
  BEGIN
    SELECT COUNT(*) INTO v_client_payments_count
    FROM accounting.backfill_client_payments() b
    WHERE b.status = 'SUCCESS';
    
    SELECT COUNT(*) INTO v_client_payments_errors
    FROM accounting.backfill_client_payments() b
    WHERE b.status LIKE 'ERROR%';
    
    RETURN QUERY SELECT 
      'Pagos de Clientes'::TEXT,
      v_client_payments_count,
      v_client_payments_errors,
      CASE WHEN v_client_payments_errors > 0 THEN 'COMPLETED_WITH_ERRORS' ELSE 'SUCCESS' END;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Pagos de Clientes'::TEXT,
      0,
      0,
      'SKIPPED (table does not exist)'::TEXT;
  END;
  
END;
$$;

-- Comentarios
COMMENT ON FUNCTION accounting.backfill_sales_invoices IS 'Genera asientos contables para facturas de venta históricas que aún no están contabilizadas';
COMMENT ON FUNCTION accounting.backfill_purchase_invoices IS 'Genera asientos contables para facturas de compra históricas que aún no están contabilizadas';
COMMENT ON FUNCTION accounting.backfill_purchase_payments IS 'Genera asientos contables para pagos de compra históricos que aún no están contabilizados';
COMMENT ON FUNCTION accounting.backfill_client_payments IS 'Genera asientos contables para pagos de clientes históricos que aún no están contabilizados';
COMMENT ON FUNCTION accounting.backfill_all_historical_data IS 'Ejecuta todo el proceso de contabilización histórica y devuelve un resumen';
