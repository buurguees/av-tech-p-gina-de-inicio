-- Fix create_invoice_sale_entry: Validate created_by exists in authorized_users
-- The error occurs when trying to create journal entries with a created_by
-- that doesn't exist in internal.authorized_users

CREATE OR REPLACE FUNCTION accounting.create_invoice_sale_entry(
  p_invoice_id UUID,
  p_entry_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, sales, crm, internal, public
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
  v_authorized_user_id UUID;
  v_created_by UUID;
BEGIN
  -- Obtener el usuario autorizado actual
  v_authorized_user_id := internal.get_authorized_user_id(auth.uid());
  
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
  
  -- Determinar created_by: usar el de la factura si existe en authorized_users,
  -- si no, usar el usuario actual si existe, si tampoco existe, usar NULL
  v_created_by := NULL;
  
  IF v_invoice.created_by IS NOT NULL THEN
    -- Verificar si el created_by de la factura existe en authorized_users
    SELECT id INTO v_created_by
    FROM internal.authorized_users
    WHERE id = v_invoice.created_by;
  END IF;
  
  -- Si no se encontró un created_by válido, intentar usar el usuario actual
  IF v_created_by IS NULL AND v_authorized_user_id IS NOT NULL THEN
    -- Verificar si el usuario actual existe en authorized_users
    SELECT id INTO v_created_by
    FROM internal.authorized_users
    WHERE id = v_authorized_user_id;
  END IF;
  
  -- Si después de todas las validaciones v_created_by sigue siendo NULL,
  -- se insertará NULL en la base de datos (la columna permite NULL)
  
  v_base_amount := COALESCE(v_invoice.subtotal, 0);
  v_vat_amount := COALESCE(v_invoice.tax_amount, 0);
  v_total_amount := COALESCE(v_invoice.total, 0);
  
  -- Generar número de asiento
  v_entry_number := accounting.get_next_entry_number();
  
  -- Crear asiento (created_by puede ser NULL si no hay usuario autorizado)
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
    v_created_by
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

GRANT EXECUTE ON FUNCTION accounting.create_invoice_sale_entry TO authenticated;
