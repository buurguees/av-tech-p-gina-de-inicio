-- Unify purchase invoices / tickets site assignment with sales documents.

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
  v_site_mode text;
  v_default_site_id uuid;
  v_final_site_id uuid;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  v_final_site_id := p_site_id;

  IF p_project_id IS NOT NULL THEN
    SELECT pp.site_mode, pp.default_site_id
    INTO v_site_mode, v_default_site_id
    FROM projects.projects pp
    WHERE pp.id = p_project_id;

    IF v_site_mode = 'MULTI_SITE' AND v_final_site_id IS NULL THEN
      RAISE EXCEPTION 'site_id is required for MULTI_SITE projects';
    END IF;

    IF v_site_mode = 'SINGLE_SITE' AND v_final_site_id IS NULL THEN
      v_final_site_id := v_default_site_id;
    END IF;

    IF v_final_site_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM projects.project_sites ps
      WHERE ps.id = v_final_site_id
        AND ps.project_id = p_project_id
        AND ps.is_active = true
    ) THEN
      RAISE EXCEPTION 'site_id does not belong to this project or is inactive';
    END IF;
  ELSE
    v_final_site_id := NULL;
  END IF;

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
    v_final_site_id,
    v_user_id
  )
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id::text;
END;
$$;

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
  p_manual_beneficiary_name TEXT DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_site_mode text;
  v_default_site_id uuid;
  v_final_site_id uuid;
BEGIN
  v_final_site_id := p_site_id;

  IF p_project_id IS NOT NULL THEN
    SELECT pp.site_mode, pp.default_site_id
    INTO v_site_mode, v_default_site_id
    FROM projects.projects pp
    WHERE pp.id = p_project_id;

    IF v_site_mode = 'MULTI_SITE' AND v_final_site_id IS NULL THEN
      RAISE EXCEPTION 'site_id is required for MULTI_SITE projects';
    END IF;

    IF v_site_mode = 'SINGLE_SITE' AND v_final_site_id IS NULL THEN
      v_final_site_id := v_default_site_id;
    END IF;

    IF v_final_site_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM projects.project_sites ps
      WHERE ps.id = v_final_site_id
        AND ps.project_id = p_project_id
        AND ps.is_active = true
    ) THEN
      RAISE EXCEPTION 'site_id does not belong to this project or is inactive';
    END IF;
  ELSE
    v_final_site_id := NULL;
  END IF;

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
    site_id = v_final_site_id,
    manual_beneficiary_name = CASE
      WHEN p_supplier_id IS NOT NULL OR p_technician_id IS NOT NULL THEN NULL
      ELSE COALESCE(p_manual_beneficiary_name, manual_beneficiary_name)
    END,
    updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;
