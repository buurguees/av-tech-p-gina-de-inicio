-- Align purchase invoices and tickets with the active sales schema.

CREATE OR REPLACE FUNCTION public.create_purchase_invoice(
  p_invoice_number text,
  p_document_type text DEFAULT 'INVOICE',
  p_status text DEFAULT 'PENDING_VALIDATION',
  p_supplier_id uuid DEFAULT NULL,
  p_technician_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_issue_date date DEFAULT CURRENT_DATE,
  p_due_date date DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_file_path text DEFAULT NULL,
  p_file_name text DEFAULT NULL,
  p_expense_category text DEFAULT NULL,
  p_supplier_invoice_number text DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_site_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal, sales
AS $$
DECLARE
  v_invoice_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());

  INSERT INTO sales.purchase_invoices (
    invoice_number,
    document_type,
    status,
    supplier_id,
    technician_id,
    project_id,
    issue_date,
    due_date,
    notes,
    file_path,
    file_name,
    expense_category,
    supplier_invoice_number,
    client_id,
    site_id,
    created_by
  ) VALUES (
    p_invoice_number,
    p_document_type,
    COALESCE(p_status, 'PENDING_VALIDATION'),
    p_supplier_id,
    p_technician_id,
    p_project_id,
    COALESCE(p_issue_date, CURRENT_DATE),
    p_due_date,
    p_notes,
    p_file_path,
    p_file_name,
    p_expense_category,
    p_supplier_invoice_number,
    p_client_id,
    p_site_id,
    v_user_id
  )
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id::text;
END;
$$;

DROP FUNCTION IF EXISTS public.get_purchase_invoice(uuid);

CREATE OR REPLACE FUNCTION public.get_purchase_invoice(p_invoice_id UUID)
RETURNS TABLE(
  id UUID,
  invoice_number TEXT,
  internal_purchase_number TEXT,
  supplier_invoice_number TEXT,
  document_type TEXT,
  status TEXT,
  supplier_id UUID,
  supplier_name TEXT,
  supplier_number TEXT,
  supplier_tax_id TEXT,
  technician_id UUID,
  technician_name TEXT,
  technician_number TEXT,
  technician_tax_id TEXT,
  project_id UUID,
  project_name TEXT,
  project_number TEXT,
  client_id UUID,
  issue_date DATE,
  due_date DATE,
  tax_base NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC,
  paid_amount NUMERIC,
  pending_amount NUMERIC,
  notes TEXT,
  internal_notes TEXT,
  expense_category TEXT,
  manual_beneficiary_name TEXT,
  file_path TEXT,
  file_name TEXT,
  is_locked BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  created_by_name TEXT,
  withholding_amount NUMERIC,
  site_id UUID,
  site_name TEXT,
  site_city TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.id,
    pi.invoice_number,
    pi.internal_purchase_number,
    pi.supplier_invoice_number,
    pi.document_type::TEXT,
    pi.status::TEXT,
    pi.supplier_id,
    COALESCE(s.company_name, '')::TEXT,
    COALESCE(s.supplier_number, '')::TEXT,
    COALESCE(s.tax_id, '')::TEXT,
    pi.technician_id,
    COALESCE(t.company_name, '')::TEXT,
    COALESCE(t.technician_number, '')::TEXT,
    COALESCE(t.tax_id, '')::TEXT,
    pi.project_id,
    COALESCE(pp.project_name, '')::TEXT,
    COALESCE(pp.project_number, '')::TEXT,
    pi.client_id,
    pi.issue_date,
    pi.due_date,
    pi.subtotal,
    pi.tax_amount,
    pi.total,
    pi.paid_amount,
    pi.pending_amount,
    pi.notes,
    pi.internal_notes,
    pi.expense_category,
    pi.manual_beneficiary_name,
    pi.file_path,
    pi.file_name,
    pi.is_locked,
    pi.created_at,
    pi.updated_at,
    pi.created_by,
    COALESCE(au.full_name, '')::TEXT,
    pi.withholding_amount,
    pi.site_id,
    ps.site_name,
    ps.city
  FROM sales.purchase_invoices pi
  LEFT JOIN internal.suppliers s ON s.id = pi.supplier_id
  LEFT JOIN internal.technicians t ON t.id = pi.technician_id
  LEFT JOIN projects.projects pp ON pp.id = pi.project_id
  LEFT JOIN internal.authorized_users au ON au.id = pi.created_by
  LEFT JOIN projects.project_sites ps ON ps.id = pi.site_id
  WHERE pi.id = p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_purchase_invoice(p_invoice_id UUID)
RETURNS TABLE (invoice_number TEXT, is_locked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, internal, public
AS $$
DECLARE
  v_definitive TEXT;
  v_row sales.purchase_invoices%ROWTYPE;
  v_inv TEXT;
  v_already_paid BOOLEAN;
BEGIN
  SELECT * INTO v_row FROM sales.purchase_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura de compra no encontrada: %', p_invoice_id;
  END IF;

  IF v_row.internal_purchase_number IS NOT NULL THEN
    RETURN QUERY SELECT v_row.internal_purchase_number::TEXT, COALESCE(v_row.is_locked, false);
    RETURN;
  END IF;

  v_inv := v_row.invoice_number;

  IF v_row.document_type IN ('EXPENSE', 'TICKET') THEN
    IF v_inv IS NOT NULL AND v_inv ~ '^TICKET-BORR-[0-9]{2}-[0-9]{6}$' THEN
      v_definitive := 'TICKET-' || substring(v_inv from 13 for 9);
    ELSE
      v_definitive := 'TICKET-' || to_char(CURRENT_DATE, 'YY') || '-' || lpad(nextval('sales.purchase_invoice_ticket_seq')::TEXT, 6, '0');
    END IF;
  ELSE
    IF v_inv IS NOT NULL AND v_inv ~ '^C-BORR-[0-9]{2}-[0-9]{6}$' THEN
      v_definitive := 'C-' || substring(v_inv from 8 for 9);
    ELSE
      v_definitive := public.generate_internal_purchase_number(v_row.document_type, v_row.supplier_id, v_row.technician_id);
    END IF;
  END IF;

  v_already_paid := (v_row.status = 'PAID') OR (v_row.total IS NOT NULL AND v_row.total <> 0 AND v_row.paid_amount >= v_row.total);

  IF v_already_paid THEN
    UPDATE sales.purchase_invoices
    SET internal_purchase_number = v_definitive,
        is_locked = true,
        updated_at = now()
    WHERE id = p_invoice_id;
  ELSE
    UPDATE sales.purchase_invoices
    SET status = 'APPROVED',
        internal_purchase_number = v_definitive,
        is_locked = true,
        updated_at = now()
    WHERE id = p_invoice_id;
  END IF;

  RETURN QUERY SELECT v_definitive, true;
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_purchase_invoice_lines(
  p_invoice_id UUID,
  p_lines JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line JSONB;
  v_existing RECORD;
BEGIN
  FOR v_existing IN
    SELECT id
    FROM public.get_purchase_invoice_lines(p_invoice_id)
  LOOP
    PERFORM public.delete_purchase_invoice_line(v_existing.id);
  END LOOP;

  FOR v_line IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_lines, '[]'::jsonb))
  LOOP
    PERFORM public.add_purchase_invoice_line(
      p_invoice_id := p_invoice_id,
      p_concept := COALESCE(v_line->>'concept', ''),
      p_description := NULLIF(v_line->>'description', ''),
      p_quantity := COALESCE((v_line->>'quantity')::NUMERIC, 0),
      p_unit_price := COALESCE((v_line->>'unit_price')::NUMERIC, 0),
      p_tax_rate := COALESCE((v_line->>'tax_rate')::NUMERIC, 0),
      p_discount_percent := COALESCE((v_line->>'discount_percent')::NUMERIC, 0),
      p_withholding_tax_rate := COALESCE((v_line->>'withholding_tax_rate')::NUMERIC, 0)
    );
  END LOOP;
END;
$$;
