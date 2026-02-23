
-- Drop ALL overloads of create_purchase_invoice and recreate a single unified version
-- First, find and drop existing functions

-- Drop the version WITHOUT p_site_id (old overload)
DROP FUNCTION IF EXISTS public.create_purchase_invoice(
  text, text, text, uuid, uuid, uuid, text, date, date, text, text, text, text, text
);

-- Drop the version WITH p_site_id (new overload)  
DROP FUNCTION IF EXISTS public.create_purchase_invoice(
  text, text, text, uuid, uuid, uuid, text, date, date, text, text, text, text, uuid, text, uuid
);

-- Drop by parameter names to be thorough
DROP FUNCTION IF EXISTS public.create_purchase_invoice(
  p_invoice_number text,
  p_document_type text,
  p_status text,
  p_supplier_id uuid,
  p_technician_id uuid,
  p_project_id uuid,
  p_issue_date date,
  p_due_date date,
  p_notes text,
  p_file_path text,
  p_file_name text,
  p_expense_category text,
  p_supplier_invoice_number text,
  p_client_id uuid,
  p_site_id uuid
);

DROP FUNCTION IF EXISTS public.create_purchase_invoice(
  p_invoice_number text,
  p_document_type text,
  p_status text,
  p_supplier_id uuid,
  p_technician_id uuid,
  p_project_id uuid,
  p_issue_date date,
  p_due_date date,
  p_notes text,
  p_file_path text,
  p_file_name text,
  p_expense_category text,
  p_supplier_invoice_number text,
  p_client_id uuid
);

-- Now recreate a single unified function with ALL parameters
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
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_user_id uuid;
BEGIN
  -- Get the authorized user
  v_user_id := internal.get_authorized_user_id(auth.uid());
  
  INSERT INTO purchases.purchase_invoices (
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
    p_status,
    p_supplier_id,
    p_technician_id,
    p_project_id,
    p_issue_date,
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
  
  -- Log the creation
  PERFORM internal.log_audit_event(
    p_event_type := 'PURCHASE_INVOICE_CREATED',
    p_event_category := 'PURCHASES',
    p_resource_type := 'purchase_invoice',
    p_resource_id := v_invoice_id::text,
    p_severity := 'INFO',
    p_details := jsonb_build_object(
      'invoice_number', p_invoice_number,
      'document_type', p_document_type,
      'status', p_status
    )
  );
  
  RETURN v_invoice_id::text;
END;
$$;
