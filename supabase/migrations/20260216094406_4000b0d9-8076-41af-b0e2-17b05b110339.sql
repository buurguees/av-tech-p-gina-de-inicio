
CREATE OR REPLACE FUNCTION public.get_purchase_invoice(p_invoice_id UUID)
RETURNS TABLE(
  id UUID, invoice_number TEXT, internal_purchase_number TEXT, supplier_invoice_number TEXT,
  document_type TEXT, status TEXT, supplier_id UUID,
  supplier_name TEXT, supplier_number TEXT, supplier_tax_id TEXT,
  technician_id UUID, technician_name TEXT, technician_number TEXT, technician_tax_id TEXT,
  project_id UUID, project_name TEXT, project_number TEXT, client_id UUID,
  issue_date DATE, due_date DATE, tax_base NUMERIC, tax_amount NUMERIC, total NUMERIC,
  paid_amount NUMERIC, pending_amount NUMERIC,
  notes TEXT, internal_notes TEXT, expense_category TEXT, file_path TEXT, file_name TEXT,
  is_locked BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  created_by UUID, created_by_name TEXT, withholding_amount NUMERIC,
  site_id UUID, site_name TEXT, site_city TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pi.id, pi.invoice_number, pi.internal_purchase_number, pi.supplier_invoice_number,
    pi.document_type::TEXT, pi.status::TEXT, pi.supplier_id,
    COALESCE(s.company_name, '')::TEXT, COALESCE(s.supplier_number, '')::TEXT, COALESCE(s.tax_id, '')::TEXT,
    pi.technician_id, COALESCE(t.company_name, '')::TEXT, COALESCE(t.technician_number, '')::TEXT, COALESCE(t.tax_id, '')::TEXT,
    pi.project_id, COALESCE(pp.project_name, '')::TEXT, COALESCE(pp.project_number, '')::TEXT, pi.client_id,
    pi.issue_date, pi.due_date, pi.subtotal, pi.tax_amount, pi.total, pi.paid_amount, pi.pending_amount,
    pi.notes, pi.internal_notes, pi.expense_category, pi.file_path, pi.file_name, pi.is_locked,
    pi.created_at, pi.updated_at, pi.created_by, COALESCE(au.full_name, '')::TEXT, pi.withholding_amount,
    pi.site_id, ps.site_name, ps.city
  FROM sales.purchase_invoices pi
  LEFT JOIN internal.suppliers s ON s.id = pi.supplier_id
  LEFT JOIN internal.technicians t ON t.id = pi.technician_id
  LEFT JOIN projects.projects pp ON pp.id = pi.project_id
  LEFT JOIN internal.authorized_users au ON au.id = pi.created_by
  LEFT JOIN projects.project_sites ps ON ps.id = pi.site_id
  WHERE pi.id = p_invoice_id;
END;
$$;
