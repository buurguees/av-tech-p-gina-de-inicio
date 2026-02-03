-- ============================================
-- FUNCIONES PARA GENERAR ASIENTOS AUTOMÁTICOS
-- ============================================

-- 1. FUNCIÓN: Generar asiento desde factura de venta
CREATE OR REPLACE FUNCTION accounting.create_invoice_sale_entry(
  p_invoice_id UUID,
  p_entry_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, sales, crm, internal
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_invoice RECORD;
  v_client RECORD;
  v_account_client TEXT := '430000';
  v_account_sales TEXT := '700000';
  v_account_vat TEXT := '477000';
  v_base_amount NUMERIC(12,2);
  v_vat_amount NUMERIC(12,2);
  v_total_amount NUMERIC(12,2);
  v_line RECORD;
BEGIN
  -- Obtener datos de la factura
  SELECT 
    i.id,
    i.invoice_number,
    i.client_id,
    i.subtotal,
    i.tax_amount,
    i.total,
    i.project_id,
    i.created_by
  INTO v_invoice
  FROM sales.invoices i
  WHERE i.id = p_invoice_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada: %', p_invoice_id;
  END IF;
  
  -- Obtener datos del cliente
  SELECT 
    c.id,
    c.client_number,
    c.company_name
  INTO v_client
  FROM crm.clients c
  WHERE c.id = v_invoice.client_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado: %', v_invoice.client_id;
  END IF;
  
  v_base_amount := COALESCE(v_invoice.subtotal, 0);
  v_vat_amount := COALESCE(v_invoice.tax_amount, 0);
  v_total_amount := COALESCE(v_invoice.total, 0);
  
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
    project_id,
    created_by
  ) VALUES (
    v_entry_number,
    p_entry_date,
    'INVOICE_SALE',
    'Factura emitida: ' || v_invoice.invoice_number || ' - ' || v_client.company_name,
    v_invoice.id,
    'invoice',
    v_invoice.project_id,
    v_invoice.created_by
  ) RETURNING id INTO v_entry_id;
  
  -- DEBE: Clientes (430000)
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    third_party_id,
    third_party_type,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    v_account_client,
    'DEBIT',
    v_total_amount,
    v_client.id,
    'CLIENT',
    'Factura ' || v_invoice.invoice_number,
    1
  );
  
  -- HABER: Ventas (700000)
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    third_party_id,
    third_party_type,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    v_account_sales,
    'CREDIT',
    v_base_amount,
    v_client.id,
    'CLIENT',
    'Base imponible factura ' || v_invoice.invoice_number,
    2
  );
  
  -- HABER: IVA repercutido (477000) - si hay IVA
  IF v_vat_amount > 0 THEN
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id,
      account_code,
      debit_credit,
      amount,
      description,
      line_order
    ) VALUES (
      v_entry_id,
      v_account_vat,
      'CREDIT',
      v_vat_amount,
      'IVA repercutido factura ' || v_invoice.invoice_number,
      3
    );
  END IF;
  
  RETURN v_entry_id;
END;
$$;

-- 2. FUNCIÓN: Generar asiento desde factura de compra (proveedor o técnico)
CREATE OR REPLACE FUNCTION accounting.create_invoice_purchase_entry(
  p_purchase_invoice_id UUID,
  p_entry_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, sales, internal
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_invoice RECORD;
  v_supplier RECORD;
  v_technician RECORD;
  v_account_supplier TEXT;
  v_account_technician TEXT := '410000';
  v_account_supplier_base TEXT := '400000';
  v_account_expense TEXT := '623000';
  v_account_vat_supported TEXT := '472000';
  v_account_irpf TEXT := '475100';
  v_base_amount NUMERIC(12,2);
  v_vat_amount NUMERIC(12,2);
  v_irpf_amount NUMERIC(12,2);
  v_total_amount NUMERIC(12,2);
  v_third_party_id UUID;
  v_third_party_type accounting.third_party_type;
  v_third_party_name TEXT;
BEGIN
  -- Obtener datos de la factura de compra
  SELECT 
    pi.id,
    pi.invoice_number,
    pi.supplier_id,
    pi.technician_id,
    pi.subtotal,
    pi.tax_amount,
    pi.total,
    pi.retention_amount,
    pi.project_id,
    pi.created_by
  INTO v_invoice
  FROM sales.purchase_invoices pi
  WHERE pi.id = p_purchase_invoice_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura de compra no encontrada: %', p_purchase_invoice_id;
  END IF;
  
  -- Determinar tipo de tercero y obtener datos
  IF v_invoice.supplier_id IS NOT NULL THEN
    SELECT 
      s.id,
      s.supplier_number,
      s.company_name
    INTO v_supplier
    FROM internal.suppliers s
    WHERE s.id = v_invoice.supplier_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Proveedor no encontrado: %', v_invoice.supplier_id;
    END IF;
    
    v_third_party_id := v_supplier.id;
    v_third_party_type := 'SUPPLIER';
    v_third_party_name := v_supplier.company_name;
    v_account_supplier := v_account_supplier_base;
    
  ELSIF v_invoice.technician_id IS NOT NULL THEN
    SELECT 
      t.id,
      t.technician_number,
      t.company_name
    INTO v_technician
    FROM internal.technicians t
    WHERE t.id = v_invoice.technician_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Técnico no encontrado: %', v_invoice.technician_id;
    END IF;
    
    v_third_party_id := v_technician.id;
    v_third_party_type := 'TECHNICIAN';
    v_third_party_name := v_technician.company_name;
    v_account_supplier := v_account_technician;
    
  ELSE
    RAISE EXCEPTION 'La factura de compra debe tener un proveedor o técnico asociado';
  END IF;
  
  v_base_amount := COALESCE(v_invoice.subtotal, 0);
  v_vat_amount := COALESCE(v_invoice.tax_amount, 0);
  v_irpf_amount := COALESCE(v_invoice.retention_amount, 0);
  v_total_amount := COALESCE(v_invoice.total, 0);
  
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
    project_id,
    created_by
  ) VALUES (
    v_entry_number,
    p_entry_date,
    'INVOICE_PURCHASE',
    'Factura recibida: ' || v_invoice.invoice_number || ' - ' || v_third_party_name,
    v_invoice.id,
    'purchase_invoice',
    v_invoice.project_id,
    v_invoice.created_by
  ) RETURNING id INTO v_entry_id;
  
  -- DEBE: Servicios profesionales (623000)
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    third_party_id,
    third_party_type,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    v_account_expense,
    'DEBIT',
    v_base_amount,
    v_third_party_id,
    v_third_party_type,
    'Base imponible factura ' || v_invoice.invoice_number,
    1
  );
  
  -- DEBE: IVA soportado (472000) - si hay IVA
  IF v_vat_amount > 0 THEN
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id,
      account_code,
      debit_credit,
      amount,
      description,
      line_order
    ) VALUES (
      v_entry_id,
      v_account_vat_supported,
      'DEBIT',
      v_vat_amount,
      'IVA soportado factura ' || v_invoice.invoice_number,
      2
    );
  END IF;
  
  -- HABER: Acreedores (400000 o 410000)
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    third_party_id,
    third_party_type,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    v_account_supplier,
    'CREDIT',
    v_total_amount,
    v_third_party_id,
    v_third_party_type,
    'Factura ' || v_invoice.invoice_number,
    3
  );
  
  -- HABER: HP retenciones IRPF (475100) - si hay retención
  IF v_irpf_amount > 0 THEN
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id,
      account_code,
      debit_credit,
      amount,
      description,
      line_order
    ) VALUES (
      v_entry_id,
      v_account_irpf,
      'CREDIT',
      v_irpf_amount,
      'Retención IRPF factura ' || v_invoice.invoice_number,
      4
    );
  END IF;
  
  RETURN v_entry_id;
END;
$$;

-- 3. FUNCIÓN: Generar asiento de liquidación de IVA
CREATE OR REPLACE FUNCTION accounting.create_vat_settlement_entry(
  p_settlement_date DATE DEFAULT CURRENT_DATE,
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_vat_received NUMERIC(12,2) := 0;  -- IVA repercutido
  v_vat_paid NUMERIC(12,2) := 0;      -- IVA soportado
  v_vat_balance NUMERIC(12,2);        -- Diferencia
  v_period_filter TEXT;
  v_user_id UUID;
BEGIN
  -- Obtener usuario actual
  SELECT auth.uid() INTO v_user_id;
  
  -- Construir filtro de período
  IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL THEN
    v_period_filter := ' AND je.entry_date BETWEEN ''' || p_period_start || ''' AND ''' || p_period_end || '''';
  ELSE
    v_period_filter := '';
  END IF;
  
  -- Calcular IVA repercutido acumulado
  EXECUTE format('
    SELECT COALESCE(SUM(jel.amount), 0)
    FROM accounting.journal_entry_lines jel
    JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
    WHERE jel.account_code = ''477000''
      AND jel.debit_credit = ''CREDIT''
      %s
  ', v_period_filter) INTO v_vat_received;
  
  -- Calcular IVA soportado acumulado
  EXECUTE format('
    SELECT COALESCE(SUM(jel.amount), 0)
    FROM accounting.journal_entry_lines jel
    JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
    WHERE jel.account_code = ''472000''
      AND jel.debit_credit = ''DEBIT''
      %s
  ', v_period_filter) INTO v_vat_paid;
  
  v_vat_balance := v_vat_received - v_vat_paid;
  
  -- Generar número de asiento
  v_entry_number := accounting.get_next_entry_number();
  
  -- Crear asiento
  INSERT INTO accounting.journal_entries (
    entry_number,
    entry_date,
    entry_type,
    description,
    reference_type,
    created_by
  ) VALUES (
    v_entry_number,
    p_settlement_date,
    'TAX_SETTLEMENT',
    'Liquidación IVA - Período: ' || COALESCE(p_period_start::TEXT, 'Total') || ' a ' || COALESCE(p_period_end::TEXT, 'Actual'),
    'vat_settlement',
    v_user_id
  ) RETURNING id INTO v_entry_id;
  
  -- DEBE: IVA repercutido (477000) - cerrar cuenta
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    '477000',
    'DEBIT',
    v_vat_received,
    'Cierre IVA repercutido',
    1
  );
  
  -- HABER: IVA soportado (472000) - cerrar cuenta
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    '472000',
    'CREDIT',
    v_vat_paid,
    'Cierre IVA soportado',
    2
  );
  
  -- Si hay diferencia, ir a Banco (572000)
  IF v_vat_balance != 0 THEN
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id,
      account_code,
      debit_credit,
      amount,
      description,
      line_order
    ) VALUES (
      v_entry_id,
      '572000',
      CASE WHEN v_vat_balance > 0 THEN 'DEBIT' ELSE 'CREDIT' END,
      ABS(v_vat_balance),
      CASE WHEN v_vat_balance > 0 THEN 'IVA a pagar' ELSE 'IVA a devolver' END,
      3
    );
  END IF;
  
  RETURN v_entry_id;
END;
$$;

-- 4. FUNCIÓN: Generar asiento de liquidación de IRPF
CREATE OR REPLACE FUNCTION accounting.create_irpf_settlement_entry(
  p_settlement_date DATE DEFAULT CURRENT_DATE,
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_irpf_accumulated NUMERIC(12,2) := 0;
  v_period_filter TEXT;
  v_user_id UUID;
BEGIN
  -- Obtener usuario actual
  SELECT auth.uid() INTO v_user_id;
  
  -- Construir filtro de período
  IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL THEN
    v_period_filter := ' AND je.entry_date BETWEEN ''' || p_period_start || ''' AND ''' || p_period_end || '''';
  ELSE
    v_period_filter := '';
  END IF;
  
  -- Calcular IRPF acumulado
  EXECUTE format('
    SELECT COALESCE(SUM(jel.amount), 0)
    FROM accounting.journal_entry_lines jel
    JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
    WHERE jel.account_code = ''475100''
      AND jel.debit_credit = ''CREDIT''
      %s
  ', v_period_filter) INTO v_irpf_accumulated;
  
  IF v_irpf_accumulated = 0 THEN
    RAISE EXCEPTION 'No hay retenciones IRPF acumuladas en el período especificado';
  END IF;
  
  -- Generar número de asiento
  v_entry_number := accounting.get_next_entry_number();
  
  -- Crear asiento
  INSERT INTO accounting.journal_entries (
    entry_number,
    entry_date,
    entry_type,
    description,
    reference_type,
    created_by
  ) VALUES (
    v_entry_number,
    p_settlement_date,
    'TAX_SETTLEMENT',
    'Liquidación IRPF - Período: ' || COALESCE(p_period_start::TEXT, 'Total') || ' a ' || COALESCE(p_period_end::TEXT, 'Actual'),
    'irpf_settlement',
    v_user_id
  ) RETURNING id INTO v_entry_id;
  
  -- DEBE: HP retenciones IRPF (475100)
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    '475100',
    'DEBIT',
    v_irpf_accumulated,
    'Cierre retenciones IRPF',
    1
  );
  
  -- HABER: Banco (572000)
  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id,
    account_code,
    debit_credit,
    amount,
    description,
    line_order
  ) VALUES (
    v_entry_id,
    '572000',
    'CREDIT',
    v_irpf_accumulated,
    'Pago retenciones IRPF',
    2
  );
  
  RETURN v_entry_id;
END;
$$;
