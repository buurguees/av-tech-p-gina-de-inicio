--
-- Tickets: nombre manual (parking, peajes, dietas, gasolina) y cuenta contable específica (627000).
-- Si el ticket tiene project_id, el gasto se mantiene vinculado al proyecto.
--

-- 1. Columna para concepto/beneficiario manual en tickets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'purchase_invoices' AND column_name = 'manual_beneficiary_name'
  ) THEN
    ALTER TABLE sales.purchase_invoices ADD COLUMN manual_beneficiary_name TEXT;
    COMMENT ON COLUMN sales.purchase_invoices.manual_beneficiary_name IS 'Concepto manual para tickets (parking, peajes, dietas, gasolina, etc.) cuando no hay proveedor/técnico.';
  END IF;
END $$;

-- 2. Nueva cuenta contable para gastos por tickets
INSERT INTO accounting.chart_of_accounts (account_code, account_name, account_type, description, is_active) VALUES
  ('627000', 'Gastos por tickets y otros', 'EXPENSE', 'Parking, peajes, dietas, gasolina y gastos similares sin proveedor registrado', true)
ON CONFLICT (account_code) DO UPDATE SET
  account_name = EXCLUDED.account_name,
  description = EXCLUDED.description,
  is_active = true;

-- 3. create_invoice_purchase_entry: soporte para tickets sin proveedor/técnico (solo concepto manual)
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
  v_account_expense_tickets TEXT := '627000';
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
    pi.id,
    pi.invoice_number,
    pi.document_type,
    pi.supplier_id,
    pi.technician_id,
    pi.manual_beneficiary_name,
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
  ELSIF v_invoice.document_type = 'EXPENSE' AND (v_invoice.manual_beneficiary_name IS NOT NULL AND trim(v_invoice.manual_beneficiary_name) != '') THEN
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
  v_irpf_amount := COALESCE(v_invoice.retention_amount, 0);
  v_total_amount := COALESCE(v_invoice.total, 0);
  v_entry_number := accounting.get_next_entry_number();
  
  INSERT INTO accounting.journal_entries (
    entry_number, entry_date, entry_type, description, reference_id, reference_type, project_id, created_by
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

-- 4. list_purchase_invoices: incluir manual_beneficiary_name en provider_name y en búsqueda
CREATE OR REPLACE FUNCTION public.list_purchase_invoices(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_technician_id UUID DEFAULT NULL,
  p_document_type TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  document_type TEXT,
  issue_date DATE,
  due_date DATE,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  retention_amount NUMERIC,
  total NUMERIC,
  paid_amount NUMERIC,
  pending_amount NUMERIC,
  status TEXT,
  provider_id UUID,
  provider_name TEXT,
  provider_type TEXT,
  provider_tax_id TEXT,
  file_path TEXT,
  project_id UUID,
  project_name TEXT,
  is_locked BOOLEAN,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, internal, projects, public
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  RETURN QUERY
  WITH filtered_invoices AS (
    SELECT 
      pi.*,
      COALESCE(s.company_name, t.company_name, NULLIF(trim(pi.manual_beneficiary_name), '')) AS provider_name,
      CASE 
        WHEN pi.supplier_id IS NOT NULL THEN 'SUPPLIER'
        WHEN pi.technician_id IS NOT NULL THEN 'TECHNICIAN'
        ELSE 'OTHER'
      END AS provider_type,
      COALESCE(s.tax_id, t.tax_id) AS provider_tax_id,
      p.name AS proj_name
    FROM sales.purchase_invoices pi
    LEFT JOIN internal.suppliers s ON pi.supplier_id = s.id
    LEFT JOIN internal.technicians t ON pi.technician_id = t.id
    LEFT JOIN projects.projects p ON pi.project_id = p.id
    WHERE
      (p_search IS NULL OR
       pi.invoice_number ILIKE '%' || p_search || '%' OR
       s.company_name ILIKE '%' || p_search || '%' OR
       t.company_name ILIKE '%' || p_search || '%' OR
       pi.manual_beneficiary_name ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR pi.status = p_status)
      AND (p_supplier_id IS NULL OR pi.supplier_id = p_supplier_id)
      AND (p_technician_id IS NULL OR pi.technician_id = p_technician_id)
      AND (p_document_type IS NULL OR pi.document_type = p_document_type)
  )
  SELECT
    fi.id,
    fi.invoice_number,
    fi.document_type,
    fi.issue_date,
    fi.due_date,
    fi.subtotal,
    fi.tax_amount,
    fi.retention_amount,
    fi.total,
    fi.paid_amount,
    fi.pending_amount,
    fi.status,
    COALESCE(fi.supplier_id, fi.technician_id) AS provider_id,
    fi.provider_name,
    fi.provider_type,
    fi.provider_tax_id,
    fi.file_path,
    fi.project_id,
    fi.proj_name AS project_name,
    fi.is_locked,
    fi.created_at,
    (SELECT COUNT(*) FROM filtered_invoices) AS total_count
  FROM filtered_invoices fi
  ORDER BY fi.issue_date DESC, fi.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

-- 5. update_purchase_invoice: aceptar p_manual_beneficiary_name (para tickets)
CREATE OR REPLACE FUNCTION public.update_purchase_invoice(
  p_invoice_id UUID,
  p_supplier_invoice_number TEXT DEFAULT NULL,
  p_issue_date DATE DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_expense_category TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_technician_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_manual_beneficiary_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
BEGIN
  UPDATE sales.purchase_invoices
  SET
    supplier_invoice_number = COALESCE(p_supplier_invoice_number, supplier_invoice_number),
    issue_date = COALESCE(p_issue_date, issue_date),
    due_date = COALESCE(p_due_date, due_date),
    status = COALESCE(p_status, status),
    expense_category = COALESCE(p_expense_category, expense_category),
    notes = COALESCE(p_notes, notes),
    internal_notes = COALESCE(p_internal_notes, internal_notes),
    supplier_id = p_supplier_id,
    technician_id = p_technician_id,
    project_id = p_project_id,
    manual_beneficiary_name = CASE
      WHEN p_supplier_id IS NOT NULL OR p_technician_id IS NOT NULL THEN NULL
      ELSE COALESCE(p_manual_beneficiary_name, manual_beneficiary_name)
    END,
    updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;

-- 6. backfill_purchase_payments: contabilizar pagos de tickets sin proveedor (cuenta 410000)
CREATE OR REPLACE FUNCTION accounting.backfill_purchase_payments()
RETURNS TABLE (
  payment_id UUID,
  entry_id UUID,
  entry_number TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, sales, internal
AS $$
DECLARE
  v_payment RECORD;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_account_pending TEXT;
  v_account_bank TEXT := '572000';
  v_count INTEGER := 0;
BEGIN
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
      pi.document_type,
      pi.manual_beneficiary_name,
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
      IF v_payment.supplier_id IS NOT NULL THEN
        v_account_pending := '400000';
      ELSIF v_payment.technician_id IS NOT NULL THEN
        v_account_pending := '410000';
      ELSIF v_payment.document_type = 'EXPENSE' AND (v_payment.manual_beneficiary_name IS NOT NULL AND trim(v_payment.manual_beneficiary_name) != '') THEN
        v_account_pending := '410000';
      ELSE
        CONTINUE;
      END IF;

      v_entry_number := accounting.get_next_entry_number();

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
