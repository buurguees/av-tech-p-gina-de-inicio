
-- Drop functions with changed return types first
DROP FUNCTION IF EXISTS public.get_quote(UUID);
DROP FUNCTION IF EXISTS public.finance_get_invoice(UUID);
DROP FUNCTION IF EXISTS public.get_purchase_invoice(UUID);
DROP FUNCTION IF EXISTS public.get_purchase_order(UUID);

-- 1. Update create_quote_with_number to accept p_site_id
CREATE OR REPLACE FUNCTION public.create_quote_with_number(
  p_client_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_valid_until DATE DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS TABLE(quote_id UUID, quote_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
  v_quote_id UUID;
  v_quote_number TEXT;
  v_user_id UUID;
  v_project_name TEXT;
  v_site_mode TEXT;
  v_default_site_id UUID;
  v_final_site_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF p_project_id IS NOT NULL AND p_project_name IS NULL THEN
    SELECT pp.project_name INTO v_project_name FROM projects.projects pp WHERE pp.id = p_project_id;
  ELSE
    v_project_name := p_project_name;
  END IF;

  v_final_site_id := p_site_id;
  IF p_project_id IS NOT NULL THEN
    SELECT pp.site_mode, pp.default_site_id INTO v_site_mode, v_default_site_id FROM projects.projects pp WHERE pp.id = p_project_id;
    IF v_site_mode = 'MULTI_SITE' AND v_final_site_id IS NULL THEN RAISE EXCEPTION 'site_id is required for MULTI_SITE projects'; END IF;
    IF v_site_mode = 'SINGLE_SITE' AND v_final_site_id IS NULL THEN v_final_site_id := v_default_site_id; END IF;
    IF v_final_site_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects.project_sites ps WHERE ps.id = v_final_site_id AND ps.project_id = p_project_id AND ps.is_active = true) THEN
      RAISE EXCEPTION 'site_id does not belong to this project or is inactive';
    END IF;
  END IF;

  v_quote_number := internal.generate_quote_number();
  INSERT INTO quotes.quotes (client_id, project_id, project_name, quote_number, valid_until, created_by, site_id)
  VALUES (p_client_id, p_project_id, v_project_name, v_quote_number, COALESCE(p_valid_until, CURRENT_DATE + INTERVAL '30 days'), v_user_id, v_final_site_id)
  RETURNING quotes.quotes.id INTO v_quote_id;

  PERFORM internal.log_audit_event(v_user_id, 'quote.created', 'QUOTE', v_quote_id::TEXT,
    jsonb_build_object('quote_number', v_quote_number, 'client_id', p_client_id, 'site_id', v_final_site_id), 'info', 'FINANCIAL');
  RETURN QUERY SELECT v_quote_id, v_quote_number;
END;
$$;

-- 2. Update create_invoice_with_number to accept p_site_id
CREATE OR REPLACE FUNCTION public.create_invoice_with_number(
  p_client_id UUID, p_project_id UUID DEFAULT NULL, p_project_name TEXT DEFAULT NULL,
  p_issue_date DATE DEFAULT NULL, p_due_date DATE DEFAULT NULL, p_source_quote_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS TABLE(invoice_id UUID, invoice_number TEXT, preliminary_number TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal
AS $$
DECLARE
  v_invoice_id UUID; v_invoice_number TEXT; v_preliminary_number TEXT; v_user_id UUID;
  v_project_name TEXT; v_site_mode TEXT; v_default_site_id UUID; v_final_site_id UUID;
  v_issue DATE; v_due DATE;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  v_issue := COALESCE(p_issue_date, CURRENT_DATE);
  v_due := COALESCE(p_due_date, v_issue + INTERVAL '30 days');
  PERFORM internal.assert_period_not_closed(v_issue);

  IF p_project_id IS NOT NULL AND p_project_name IS NULL THEN
    SELECT pp.project_name INTO v_project_name FROM projects.projects pp WHERE pp.id = p_project_id;
  ELSE v_project_name := p_project_name; END IF;

  v_final_site_id := p_site_id;
  IF p_project_id IS NOT NULL THEN
    SELECT pp.site_mode, pp.default_site_id INTO v_site_mode, v_default_site_id FROM projects.projects pp WHERE pp.id = p_project_id;
    IF v_site_mode = 'MULTI_SITE' AND v_final_site_id IS NULL THEN RAISE EXCEPTION 'site_id is required for MULTI_SITE projects'; END IF;
    IF v_site_mode = 'SINGLE_SITE' AND v_final_site_id IS NULL THEN v_final_site_id := v_default_site_id; END IF;
    IF v_final_site_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects.project_sites ps WHERE ps.id = v_final_site_id AND ps.project_id = p_project_id AND ps.is_active = true) THEN
      RAISE EXCEPTION 'site_id does not belong to this project or is inactive';
    END IF;
  END IF;

  v_preliminary_number := internal.generate_preliminary_invoice_number();
  v_invoice_number := v_preliminary_number;
  INSERT INTO sales.invoices (client_id, project_id, project_name, invoice_number, preliminary_number, issue_date, due_date, source_quote_id, created_by, site_id)
  VALUES (p_client_id, p_project_id, v_project_name, v_invoice_number, v_preliminary_number, v_issue, v_due, p_source_quote_id, v_user_id, v_final_site_id)
  RETURNING sales.invoices.id INTO v_invoice_id;

  PERFORM internal.log_audit_event(v_user_id, 'invoice.created', 'INVOICE', v_invoice_id::TEXT,
    jsonb_build_object('invoice_number', v_invoice_number, 'client_id', p_client_id, 'site_id', v_final_site_id), 'info', 'FINANCIAL');
  RETURN QUERY SELECT v_invoice_id, v_invoice_number, v_preliminary_number;
END;
$$;

-- 3. Update create_purchase_invoice to accept p_site_id
CREATE OR REPLACE FUNCTION public.create_purchase_invoice(
  p_invoice_number TEXT, p_document_type TEXT DEFAULT 'INVOICE', p_status TEXT DEFAULT 'DRAFT',
  p_supplier_id UUID DEFAULT NULL, p_technician_id UUID DEFAULT NULL, p_project_id UUID DEFAULT NULL,
  p_issue_date DATE DEFAULT NULL, p_due_date DATE DEFAULT NULL, p_notes TEXT DEFAULT NULL,
  p_file_path TEXT DEFAULT NULL, p_file_name TEXT DEFAULT NULL, p_supplier_invoice_number TEXT DEFAULT NULL,
  p_expense_category TEXT DEFAULT NULL, p_client_id UUID DEFAULT NULL, p_site_id UUID DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal
AS $$
DECLARE
  v_invoice_id UUID; v_user_id UUID; v_internal_number TEXT;
  v_site_mode TEXT; v_default_site_id UUID; v_final_site_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  v_final_site_id := p_site_id;
  IF p_project_id IS NOT NULL THEN
    SELECT pp.site_mode, pp.default_site_id INTO v_site_mode, v_default_site_id FROM projects.projects pp WHERE pp.id = p_project_id;
    IF v_site_mode = 'SINGLE_SITE' AND v_final_site_id IS NULL THEN v_final_site_id := v_default_site_id; END IF;
    IF v_final_site_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects.project_sites ps WHERE ps.id = v_final_site_id AND ps.project_id = p_project_id AND ps.is_active = true) THEN
      RAISE EXCEPTION 'site_id does not belong to this project or is inactive';
    END IF;
  END IF;

  v_internal_number := internal.generate_internal_purchase_number(p_document_type, p_supplier_id, p_technician_id);
  INSERT INTO sales.purchase_invoices (invoice_number, internal_purchase_number, document_type, status, supplier_id, technician_id, project_id,
    issue_date, due_date, notes, file_path, file_name, supplier_invoice_number, expense_category, client_id, created_by, site_id)
  VALUES (p_invoice_number, v_internal_number, p_document_type, COALESCE(p_status, 'DRAFT'), p_supplier_id, p_technician_id, p_project_id,
    COALESCE(p_issue_date, CURRENT_DATE), p_due_date, p_notes, p_file_path, p_file_name, p_supplier_invoice_number, p_expense_category, p_client_id, v_user_id, v_final_site_id)
  RETURNING sales.purchase_invoices.id INTO v_invoice_id;

  PERFORM internal.log_audit_event(v_user_id, 'purchase_invoice.created', 'PURCHASE_INVOICE', v_invoice_id::TEXT,
    jsonb_build_object('invoice_number', p_invoice_number, 'document_type', p_document_type, 'site_id', v_final_site_id), 'info', 'FINANCIAL');
  RETURN v_invoice_id;
END;
$$;

-- 4. Update create_purchase_order to accept p_site_id
CREATE OR REPLACE FUNCTION public.create_purchase_order(
  p_supplier_id UUID DEFAULT NULL, p_technician_id UUID DEFAULT NULL, p_project_id UUID DEFAULT NULL,
  p_issue_date DATE DEFAULT NULL, p_notes TEXT DEFAULT NULL, p_internal_notes TEXT DEFAULT NULL,
  p_expected_start_date DATE DEFAULT NULL, p_expected_end_date DATE DEFAULT NULL, p_site_id UUID DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal
AS $$
DECLARE
  v_order_id UUID; v_user_id UUID; v_po_number TEXT;
  v_site_mode TEXT; v_default_site_id UUID; v_final_site_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  v_final_site_id := p_site_id;
  IF p_project_id IS NOT NULL THEN
    SELECT pp.site_mode, pp.default_site_id INTO v_site_mode, v_default_site_id FROM projects.projects pp WHERE pp.id = p_project_id;
    IF v_site_mode = 'SINGLE_SITE' AND v_final_site_id IS NULL THEN v_final_site_id := v_default_site_id; END IF;
    IF v_final_site_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects.project_sites ps WHERE ps.id = v_final_site_id AND ps.project_id = p_project_id AND ps.is_active = true) THEN
      RAISE EXCEPTION 'site_id does not belong to this project or is inactive';
    END IF;
  END IF;

  v_po_number := internal.generate_purchase_order_number();
  INSERT INTO sales.purchase_orders (po_number, supplier_id, technician_id, project_id, issue_date, notes, internal_notes, expected_start_date, expected_end_date, created_by, site_id)
  VALUES (v_po_number, p_supplier_id, p_technician_id, p_project_id, COALESCE(p_issue_date, CURRENT_DATE), p_notes, p_internal_notes, p_expected_start_date, p_expected_end_date, v_user_id, v_final_site_id)
  RETURNING sales.purchase_orders.id INTO v_order_id;

  PERFORM internal.log_audit_event(v_user_id, 'purchase_order.created', 'PURCHASE_ORDER', v_order_id::TEXT,
    jsonb_build_object('po_number', v_po_number, 'site_id', v_final_site_id), 'info', 'FINANCIAL');
  RETURN v_order_id;
END;
$$;

-- 5. Recreate get_quote with site info
CREATE FUNCTION public.get_quote(p_quote_id UUID)
RETURNS TABLE(
  id UUID, quote_number TEXT, client_id UUID, client_name TEXT, project_id UUID, project_name TEXT,
  status TEXT, subtotal NUMERIC, tax_rate NUMERIC, tax_amount NUMERIC, total NUMERIC,
  notes TEXT, valid_until DATE, order_number TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  created_by UUID, created_by_name TEXT, site_id UUID, site_name TEXT, site_city TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal
AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.quote_number, q.client_id, c.company_name, q.project_id, q.project_name,
    q.status::TEXT, q.subtotal, q.tax_rate, q.tax_amount, q.total, q.notes, q.valid_until, q.order_number,
    q.created_at, q.updated_at, q.created_by, COALESCE(au.full_name, '')::TEXT,
    q.site_id, ps.site_name, ps.city
  FROM quotes.quotes q
  LEFT JOIN clients.clients c ON c.id = q.client_id
  LEFT JOIN internal.authorized_users au ON au.id = q.created_by
  LEFT JOIN projects.project_sites ps ON ps.id = q.site_id
  WHERE q.id = p_quote_id;
END;
$$;

-- 6. Recreate finance_get_invoice with site info
CREATE FUNCTION public.finance_get_invoice(p_invoice_id UUID)
RETURNS TABLE(
  id UUID, invoice_number TEXT, preliminary_number TEXT, client_id UUID, client_name TEXT,
  project_id UUID, project_name TEXT, project_number TEXT, source_quote_id UUID, source_quote_number TEXT,
  status TEXT, issue_date DATE, due_date DATE, subtotal NUMERIC, discount_amount NUMERIC,
  tax_amount NUMERIC, total NUMERIC, paid_amount NUMERIC, pending_amount NUMERIC,
  notes TEXT, internal_notes TEXT, payment_terms TEXT, is_locked BOOLEAN,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, created_by UUID, created_by_name TEXT,
  site_id UUID, site_name TEXT, site_city TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.invoice_number, i.preliminary_number, i.client_id, c.company_name,
    i.project_id, i.project_name, COALESCE(pp.project_number, '')::TEXT, i.source_quote_id,
    COALESCE(sq.quote_number, '')::TEXT, i.status::TEXT, i.issue_date, i.due_date,
    i.subtotal, i.discount_amount, i.tax_amount, i.total, i.paid_amount, i.pending_amount,
    i.notes, i.internal_notes, i.payment_terms, i.is_locked, i.created_at, i.updated_at,
    i.created_by, COALESCE(au.full_name, '')::TEXT,
    i.site_id, ps.site_name, ps.city
  FROM sales.invoices i
  LEFT JOIN clients.clients c ON c.id = i.client_id
  LEFT JOIN projects.projects pp ON pp.id = i.project_id
  LEFT JOIN quotes.quotes sq ON sq.id = i.source_quote_id
  LEFT JOIN internal.authorized_users au ON au.id = i.created_by
  LEFT JOIN projects.project_sites ps ON ps.id = i.site_id
  WHERE i.id = p_invoice_id;
END;
$$;

-- 7. Recreate get_purchase_invoice with site info
CREATE FUNCTION public.get_purchase_invoice(p_invoice_id UUID)
RETURNS TABLE(
  id UUID, invoice_number TEXT, internal_purchase_number TEXT, supplier_invoice_number TEXT,
  document_type TEXT, status TEXT, supplier_id UUID, supplier_name TEXT, supplier_number TEXT, supplier_tax_id TEXT,
  technician_id UUID, technician_name TEXT, technician_number TEXT, technician_tax_id TEXT,
  project_id UUID, project_name TEXT, project_number TEXT, client_id UUID,
  issue_date DATE, due_date DATE, tax_base NUMERIC, tax_amount NUMERIC, total NUMERIC,
  paid_amount NUMERIC, pending_amount NUMERIC, notes TEXT, internal_notes TEXT, expense_category TEXT,
  file_path TEXT, file_name TEXT, is_locked BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  created_by UUID, created_by_name TEXT, withholding_amount NUMERIC,
  site_id UUID, site_name TEXT, site_city TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal
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
  LEFT JOIN purchases.suppliers s ON s.id = pi.supplier_id
  LEFT JOIN workers.technicians t ON t.id = pi.technician_id
  LEFT JOIN projects.projects pp ON pp.id = pi.project_id
  LEFT JOIN internal.authorized_users au ON au.id = pi.created_by
  LEFT JOIN projects.project_sites ps ON ps.id = pi.site_id
  WHERE pi.id = p_invoice_id;
END;
$$;

-- 8. Recreate get_purchase_order with site info
CREATE FUNCTION public.get_purchase_order(p_order_id UUID)
RETURNS TABLE(
  id UUID, po_number TEXT, status TEXT, supplier_id UUID, supplier_name TEXT, supplier_tax_id TEXT,
  technician_id UUID, technician_name TEXT, project_id UUID, project_name TEXT, project_number TEXT,
  issue_date DATE, expected_start_date DATE, expected_end_date DATE, actual_start_date DATE, actual_end_date DATE,
  subtotal NUMERIC, tax_rate NUMERIC, tax_amount NUMERIC, withholding_rate NUMERIC, withholding_amount NUMERIC,
  total NUMERIC, notes TEXT, internal_notes TEXT, approved_at TIMESTAMPTZ, approved_by UUID, approved_by_name TEXT,
  linked_purchase_invoice_id UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  created_by UUID, created_by_name TEXT, site_id UUID, site_name TEXT, site_city TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, internal
AS $$
BEGIN
  RETURN QUERY
  SELECT po.id, po.po_number, po.status::TEXT, po.supplier_id,
    COALESCE(s.company_name, '')::TEXT, COALESCE(s.tax_id, '')::TEXT,
    po.technician_id, COALESCE(t.company_name, '')::TEXT,
    po.project_id, COALESCE(pp.project_name, '')::TEXT, COALESCE(pp.project_number, '')::TEXT,
    po.issue_date, po.expected_start_date, po.expected_end_date, po.actual_start_date, po.actual_end_date,
    po.subtotal, po.tax_rate, po.tax_amount, po.withholding_rate, po.withholding_amount, po.total,
    po.notes, po.internal_notes, po.approved_at, po.approved_by, COALESCE(ab.full_name, '')::TEXT,
    po.linked_purchase_invoice_id, po.created_at, po.updated_at,
    po.created_by, COALESCE(au.full_name, '')::TEXT,
    po.site_id, ps.site_name, ps.city
  FROM sales.purchase_orders po
  LEFT JOIN purchases.suppliers s ON s.id = po.supplier_id
  LEFT JOIN workers.technicians t ON t.id = po.technician_id
  LEFT JOIN projects.projects pp ON pp.id = po.project_id
  LEFT JOIN internal.authorized_users au ON au.id = po.created_by
  LEFT JOIN internal.authorized_users ab ON ab.id = po.approved_by
  LEFT JOIN projects.project_sites ps ON ps.id = po.site_id
  WHERE po.id = p_order_id;
END;
$$;
