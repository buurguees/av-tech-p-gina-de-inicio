-- ============================================
-- Service-role wrappers for SharePoint sync
-- ============================================
BEGIN;

CREATE OR REPLACE FUNCTION public.sync_list_invoices_for_archive(
  p_limit INTEGER DEFAULT 50,
  p_invoice_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  status TEXT,
  invoice_number TEXT,
  preliminary_number TEXT,
  issue_date DATE,
  sharepoint_item_id TEXT,
  archived_pdf_provider TEXT,
  archived_pdf_path TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.status::TEXT,
    i.invoice_number,
    i.preliminary_number,
    i.issue_date,
    i.sharepoint_item_id,
    i.archived_pdf_provider,
    i.archived_pdf_path
  FROM sales.invoices i
  WHERE
    (
      p_invoice_id IS NOT NULL
      AND i.id = p_invoice_id
    )
    OR (
      p_invoice_id IS NULL
      AND i.status IN ('ISSUED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'RECTIFIED')
      AND i.sharepoint_item_id IS NULL
      AND COALESCE(i.archived_pdf_provider, '') = ''
      AND COALESCE(i.archived_pdf_path, '') = ''
    )
  ORDER BY i.issue_date ASC NULLS LAST
  LIMIT GREATEST(COALESCE(p_limit, 50), 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_list_quotes_for_archive(
  p_limit INTEGER DEFAULT 50,
  p_quote_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  status TEXT,
  quote_number TEXT,
  issue_date DATE,
  sharepoint_item_id TEXT,
  archived_pdf_provider TEXT,
  archived_pdf_path TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.status::TEXT,
    q.quote_number,
    q.issue_date,
    q.sharepoint_item_id,
    q.archived_pdf_provider,
    q.archived_pdf_path
  FROM quotes.quotes q
  WHERE
    (
      p_quote_id IS NOT NULL
      AND q.id = p_quote_id
    )
    OR (
      p_quote_id IS NULL
      AND q.status IN ('SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'INVOICED')
      AND q.sharepoint_item_id IS NULL
      AND COALESCE(q.archived_pdf_provider, '') = ''
      AND COALESCE(q.archived_pdf_path, '') = ''
    )
  ORDER BY q.issue_date ASC NULLS LAST, q.created_at ASC
  LIMIT GREATEST(COALESCE(p_limit, 50), 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_get_invoice_lines_for_archive(p_invoice_id UUID)
RETURNS TABLE(
  id UUID,
  line_order INTEGER,
  product_id UUID,
  concept TEXT,
  description TEXT,
  quantity NUMERIC,
  unit TEXT,
  unit_price NUMERIC,
  discount_percent NUMERIC,
  tax_rate NUMERIC,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    il.id,
    il.line_order,
    NULL::UUID AS product_id,
    il.concept,
    il.description,
    il.quantity,
    'ud'::TEXT AS unit,
    il.unit_price,
    COALESCE(il.discount_percent, 0) AS discount_percent,
    COALESCE(il.tax_rate, 0) AS tax_rate,
    il.quantity * il.unit_price * (1 - COALESCE(il.discount_percent, 0) / 100) AS subtotal,
    il.quantity * il.unit_price * (1 - COALESCE(il.discount_percent, 0) / 100) * (COALESCE(il.tax_rate, 0) / 100) AS tax_amount,
    il.quantity * il.unit_price * (1 - COALESCE(il.discount_percent, 0) / 100) * (1 + COALESCE(il.tax_rate, 0) / 100) AS total
  FROM sales.invoice_lines il
  WHERE il.invoice_id = p_invoice_id
  ORDER BY il.line_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_get_quote_lines_for_archive(p_quote_id UUID)
RETURNS TABLE(
  id UUID,
  line_order INTEGER,
  concept TEXT,
  description TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  tax_rate NUMERIC,
  discount_percent NUMERIC,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC,
  group_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ql.id,
    ql.line_order,
    ql.concept,
    ql.description,
    ql.quantity,
    ql.unit_price,
    ql.tax_rate,
    ql.discount_percent,
    ql.subtotal,
    ql.tax_amount,
    ql.total,
    ql.group_name
  FROM quotes.quote_lines ql
  WHERE ql.quote_id = p_quote_id
  ORDER BY ql.line_order ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_get_company_settings_for_archive()
RETURNS TABLE(
  id UUID,
  legal_name TEXT,
  tax_id TEXT,
  commercial_name TEXT,
  company_type TEXT,
  vat_number TEXT,
  fiscal_address TEXT,
  fiscal_postal_code TEXT,
  fiscal_city TEXT,
  fiscal_province TEXT,
  country TEXT,
  billing_email TEXT,
  billing_phone TEXT,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.legal_name,
    cs.tax_id,
    cs.commercial_name,
    cs.company_type,
    cs.vat_number,
    cs.fiscal_address,
    cs.fiscal_postal_code,
    cs.fiscal_city,
    cs.fiscal_province,
    cs.country,
    cs.billing_email,
    cs.billing_phone,
    cs.website,
    cs.logo_url,
    cs.created_at,
    cs.updated_at
  FROM internal.company_settings cs
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_get_project_for_archive(p_project_id UUID)
RETURNS TABLE(
  id UUID,
  client_id UUID,
  client_name TEXT,
  client_order_number TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  created_by_name TEXT,
  local_name TEXT,
  notes TEXT,
  project_address TEXT,
  project_city TEXT,
  project_name TEXT,
  project_number TEXT,
  quote_id UUID,
  status TEXT,
  updated_at TIMESTAMPTZ,
  site_mode TEXT,
  default_site_id UUID,
  default_site_name TEXT,
  default_site_address TEXT,
  default_site_city TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.client_id, c.company_name, p.client_order_number,
    p.created_at, p.created_by, COALESCE(au.full_name, ''),
    p.local_name, p.description, ''::TEXT, p.project_city,
    p.project_name, p.project_number, p.quote_id, p.status::TEXT,
    p.updated_at,
    p.site_mode::TEXT, p.default_site_id,
    ps.site_name, ps.address, ps.city
  FROM projects.projects p
  LEFT JOIN crm.clients c ON c.id = p.client_id
  LEFT JOIN internal.authorized_users au ON au.id = p.created_by
  LEFT JOIN projects.project_sites ps ON ps.id = p.default_site_id
  WHERE p.id = p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_list_invoices_for_archive(INTEGER, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_list_quotes_for_archive(INTEGER, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_get_invoice_lines_for_archive(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_get_quote_lines_for_archive(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_get_company_settings_for_archive() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_get_project_for_archive(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sync_list_invoices_for_archive(INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_list_quotes_for_archive(INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_get_invoice_lines_for_archive(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_get_quote_lines_for_archive(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_get_company_settings_for_archive() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_get_project_for_archive(UUID) TO service_role;

COMMIT;
