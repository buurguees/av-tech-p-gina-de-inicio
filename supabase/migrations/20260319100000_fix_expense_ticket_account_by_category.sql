-- Migración: usar cuenta 629.x según expense_category en asientos de tickets/gastos
-- Antes: todos los tickets usaban cuenta 627000 (hardcoded)
-- Ahora: se usa la cuenta del grupo 629 según la categoría del ticket

CREATE OR REPLACE FUNCTION "accounting"."create_invoice_purchase_entry"("p_purchase_invoice_id" "uuid", "p_entry_date" "date" DEFAULT CURRENT_DATE) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'accounting', 'public'
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
  v_account_expense_tickets TEXT;
  v_account_vat_supported TEXT := '472000';
  v_account_irpf TEXT := '475100';
  v_base_amount NUMERIC(12,2);
  v_vat_amount NUMERIC(12,2);
  v_irpf_amount NUMERIC(12,2);
  v_total_amount NUMERIC(12,2);
  v_third_party_id UUID;
  v_third_party_type accounting.third_party_type;
  v_third_party_name TEXT;
  v_is_ticket_without_provider BOOLEAN := false;
BEGIN
  SELECT
    pi.id, pi.invoice_number, pi.document_type,
    pi.supplier_id, pi.technician_id, pi.manual_beneficiary_name,
    pi.subtotal, pi.tax_amount, pi.total,
    pi.expense_category,
    GREATEST(COALESCE(pi.retention_amount, 0), COALESCE(pi.withholding_amount, 0)) AS effective_retention,
    pi.project_id, pi.created_by
  INTO v_invoice
  FROM sales.purchase_invoices pi
  WHERE pi.id = p_purchase_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura de compra no encontrada: %', p_purchase_invoice_id;
  END IF;

  -- Determinar cuenta del grupo 629 según categoría del ticket
  v_account_expense_tickets := CASE v_invoice.expense_category
    WHEN 'DIET'          THEN '629.1'
    WHEN 'FUEL'          THEN '629.2'
    WHEN 'MATERIAL'      THEN '629.3'
    WHEN 'PARKING'       THEN '629.5'
    WHEN 'TRANSPORT'     THEN '629.6'
    WHEN 'ACCOMMODATION' THEN '629.7'
    WHEN 'FINE'          THEN '629.8'
    WHEN 'OTHER'         THEN '629.9'
    ELSE '627000'
  END;

  IF v_invoice.supplier_id IS NOT NULL THEN
    SELECT s.id, s.supplier_number, s.company_name INTO v_supplier
    FROM internal.suppliers s WHERE s.id = v_invoice.supplier_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Proveedor no encontrado: %', v_invoice.supplier_id; END IF;
    v_third_party_id := v_supplier.id;
    v_third_party_type := 'SUPPLIER';
    v_third_party_name := v_supplier.company_name;
    v_account_supplier := v_account_supplier_base;
  ELSIF v_invoice.technician_id IS NOT NULL THEN
    SELECT t.id, t.technician_number, t.company_name INTO v_technician
    FROM internal.technicians t WHERE t.id = v_invoice.technician_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Técnico no encontrado: %', v_invoice.technician_id; END IF;
    v_third_party_id := v_technician.id;
    v_third_party_type := 'TECHNICIAN';
    v_third_party_name := v_technician.company_name;
    v_account_supplier := v_account_technician;
  ELSIF v_invoice.document_type IN ('EXPENSE', 'TICKET') AND (v_invoice.manual_beneficiary_name IS NOT NULL AND trim(v_invoice.manual_beneficiary_name) != '') THEN
    v_is_ticket_without_provider := true;
    v_third_party_id := NULL;
    v_third_party_type := NULL;
    v_third_party_name := trim(v_invoice.manual_beneficiary_name);
    v_account_supplier := v_account_technician;
  ELSE
    RAISE EXCEPTION 'La factura de compra debe tener un proveedor, un técnico o (si es ticket) un concepto manual.';
  END IF;

  v_base_amount := COALESCE(v_invoice.subtotal, 0);
  v_vat_amount := COALESCE(v_invoice.tax_amount, 0);
  v_irpf_amount := COALESCE(v_invoice.effective_retention, 0);
  v_total_amount := COALESCE(v_invoice.total, 0);
  v_entry_number := accounting.get_next_entry_number();

  INSERT INTO accounting.journal_entries (
    entry_number, entry_date, entry_type, description, reference_id, reference_type, project_id, created_by
  ) VALUES (
    v_entry_number, p_entry_date, 'INVOICE_PURCHASE',
    'Factura recibida: ' || v_invoice.invoice_number || ' - ' || v_third_party_name,
    v_invoice.id, 'purchase_invoice', v_invoice.project_id, v_invoice.created_by
  ) RETURNING id INTO v_entry_id;

  IF v_is_ticket_without_provider THEN
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id, account_code, debit_credit, amount, third_party_id, third_party_type, description, line_order
    ) VALUES (
      v_entry_id, v_account_expense_tickets, 'DEBIT', v_base_amount, NULL, NULL,
      'Tickets: ' || v_third_party_name || ' - ' || v_invoice.invoice_number, 1
    );
  ELSE
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id, account_code, debit_credit, amount, third_party_id, third_party_type, description, line_order
    ) VALUES (
      v_entry_id, v_account_expense, 'DEBIT', v_base_amount, v_third_party_id, v_third_party_type,
      'Base imponible factura ' || v_invoice.invoice_number, 1
    );
  END IF;

  IF v_vat_amount > 0 THEN
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id, account_code, debit_credit, amount, description, line_order
    ) VALUES (
      v_entry_id, v_account_vat_supported, 'DEBIT', v_vat_amount,
      'IVA soportado factura ' || v_invoice.invoice_number, 2
    );
  END IF;

  INSERT INTO accounting.journal_entry_lines (
    journal_entry_id, account_code, debit_credit, amount, third_party_id, third_party_type, description, line_order
  ) VALUES (
    v_entry_id, v_account_supplier, 'CREDIT', v_total_amount,
    v_third_party_id, v_third_party_type,
    CASE WHEN v_is_ticket_without_provider THEN 'Ticket ' || v_invoice.invoice_number || ' - ' || v_third_party_name ELSE 'Factura ' || v_invoice.invoice_number END,
    3
  );

  IF v_irpf_amount > 0 THEN
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id, account_code, debit_credit, amount, description, line_order
    ) VALUES (
      v_entry_id, v_account_irpf, 'CREDIT', v_irpf_amount,
      'Retención IRPF factura ' || v_invoice.invoice_number, 4
    );
  END IF;

  RETURN v_entry_id;
END;
$$;

COMMENT ON FUNCTION "accounting"."create_invoice_purchase_entry"("p_purchase_invoice_id" "uuid", "p_entry_date" "date")
  IS 'Asiento al APPROVED. Fecha contable: issue_date, updated_at (aprobación) o CURRENT_DATE. Para tickets EXPENSE usa cuenta 629.x según expense_category; fallback 627000.';
