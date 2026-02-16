-- Fix get_quote: change clients.clients → crm.clients
CREATE OR REPLACE FUNCTION public.get_quote(p_quote_id UUID)
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
  LEFT JOIN crm.clients c ON c.id = q.client_id
  LEFT JOIN internal.authorized_users au ON au.id = q.created_by
  LEFT JOIN projects.project_sites ps ON ps.id = q.site_id
  WHERE q.id = p_quote_id;
END;
$$;

-- Fix finance_get_invoice: change clients.clients → crm.clients
CREATE OR REPLACE FUNCTION public.finance_get_invoice(p_invoice_id UUID)
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
  LEFT JOIN crm.clients c ON c.id = i.client_id
  LEFT JOIN projects.projects pp ON pp.id = i.project_id
  LEFT JOIN quotes.quotes sq ON sq.id = i.source_quote_id
  LEFT JOIN internal.authorized_users au ON au.id = i.created_by
  LEFT JOIN projects.project_sites ps ON ps.id = i.site_id
  WHERE i.id = p_invoice_id;
END;
$$;