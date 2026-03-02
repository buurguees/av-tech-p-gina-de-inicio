BEGIN;

-- 1) Harden SECURITY DEFINER RPCs with explicit access checks.
CREATE OR REPLACE FUNCTION public.get_quote(p_quote_id UUID)
RETURNS TABLE(
  id UUID,
  quote_number TEXT,
  client_id UUID,
  client_name TEXT,
  project_id UUID,
  project_name TEXT,
  status TEXT,
  subtotal NUMERIC,
  tax_rate NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC,
  notes TEXT,
  issue_date DATE,
  valid_until DATE,
  order_number TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  created_by_name TEXT,
  site_id UUID,
  site_name TEXT,
  site_city TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, quotes, crm, internal, projects, sales
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT sales.can_access_quote(p_quote_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    q.id,
    q.quote_number,
    q.client_id,
    c.company_name,
    q.project_id,
    q.project_name,
    q.status::TEXT,
    q.subtotal,
    q.tax_rate,
    q.tax_amount,
    q.total,
    q.notes,
    q.issue_date,
    q.valid_until,
    q.order_number,
    q.created_at,
    q.updated_at,
    q.created_by,
    COALESCE(au.full_name, '')::TEXT,
    q.site_id,
    ps.site_name,
    ps.city
  FROM quotes.quotes q
  LEFT JOIN crm.clients c ON c.id = q.client_id
  LEFT JOIN internal.authorized_users au ON au.id = q.created_by
  LEFT JOIN projects.project_sites ps ON ps.id = q.site_id
  WHERE q.id = p_quote_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_get_invoice(p_invoice_id UUID)
RETURNS TABLE(
  id UUID,
  invoice_number TEXT,
  preliminary_number TEXT,
  client_id UUID,
  client_name TEXT,
  project_id UUID,
  project_name TEXT,
  project_number TEXT,
  source_quote_id UUID,
  source_quote_number TEXT,
  status TEXT,
  issue_date DATE,
  due_date DATE,
  subtotal NUMERIC,
  discount_amount NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC,
  paid_amount NUMERIC,
  pending_amount NUMERIC,
  notes TEXT,
  internal_notes TEXT,
  payment_terms TEXT,
  is_locked BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  created_by_name TEXT,
  site_id UUID,
  site_name TEXT,
  site_city TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sales, crm, internal, projects, quotes
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT sales.can_access_invoice_archive(p_invoice_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.invoice_number,
    i.preliminary_number,
    i.client_id,
    c.company_name,
    i.project_id,
    i.project_name,
    COALESCE(pp.project_number, '')::TEXT,
    i.source_quote_id,
    COALESCE(sq.quote_number, '')::TEXT,
    i.status::TEXT,
    i.issue_date,
    i.due_date,
    i.subtotal,
    i.discount_amount,
    i.tax_amount,
    i.total,
    i.paid_amount,
    i.pending_amount,
    i.notes,
    i.internal_notes,
    i.payment_terms,
    i.is_locked,
    i.created_at,
    i.updated_at,
    i.created_by,
    COALESCE(au.full_name, '')::TEXT,
    i.site_id,
    ps.site_name,
    ps.city
  FROM sales.invoices i
  LEFT JOIN crm.clients c ON c.id = i.client_id
  LEFT JOIN projects.projects pp ON pp.id = i.project_id
  LEFT JOIN quotes.quotes sq ON sq.id = i.source_quote_id
  LEFT JOIN internal.authorized_users au ON au.id = i.created_by
  LEFT JOIN projects.project_sites ps ON ps.id = i.site_id
  WHERE i.id = p_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_quote(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finance_get_invoice(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quote(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finance_get_invoice(UUID) TO authenticated, service_role;

-- 2) Replace open quote visibility policy in quotes.quotes.
DO $$
BEGIN
  IF to_regclass('quotes.quotes') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated users can view quotes" ON quotes.quotes;

    CREATE POLICY "Users can view accessible quotes"
      ON quotes.quotes
      FOR SELECT
      USING (
        auth.uid() IS NOT NULL
        AND (
          internal.is_admin()
          OR internal.is_manager()
          OR internal.is_readonly()
          OR (internal.is_sales() AND created_by = internal.get_authorized_user_id(auth.uid()))
          OR (project_id IS NOT NULL AND projects.can_access_project(project_id))
        )
      );
  END IF;
END;
$$;

-- 3) Remove legacy permissive policies on public.quotes and public.invoices.
DO $$
BEGIN
  IF to_regclass('public.quotes') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated users can read quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Authenticated users can create quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Authenticated users can update quotes" ON public.quotes;
  END IF;

  IF to_regclass('public.invoices') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated users can read invoices" ON public.invoices;
    DROP POLICY IF EXISTS "Authenticated users can create invoices" ON public.invoices;
    DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;
  END IF;
END;
$$;

-- 4) Replace open RLS policies on sales.invoice_payments.
DO $$
BEGIN
  IF to_regclass('sales.invoice_payments') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated users can view invoice payments" ON sales.invoice_payments;
    DROP POLICY IF EXISTS "Authenticated users can create invoice payments" ON sales.invoice_payments;
    DROP POLICY IF EXISTS "Authenticated users can update invoice payments" ON sales.invoice_payments;
    DROP POLICY IF EXISTS "Authenticated users can delete invoice payments" ON sales.invoice_payments;

    CREATE POLICY "Authenticated users can view invoice payments"
      ON sales.invoice_payments
      FOR SELECT
      USING (sales.can_access_invoice_archive(invoice_id));

    CREATE POLICY "Authenticated users can create invoice payments"
      ON sales.invoice_payments
      FOR INSERT
      WITH CHECK (
        sales.can_access_invoice_archive(invoice_id)
        AND (internal.is_admin() OR internal.is_manager() OR internal.is_sales())
      );

    CREATE POLICY "Authenticated users can update invoice payments"
      ON sales.invoice_payments
      FOR UPDATE
      USING (
        sales.can_access_invoice_archive(invoice_id)
        AND (internal.is_admin() OR internal.is_manager() OR internal.is_sales())
      )
      WITH CHECK (
        sales.can_access_invoice_archive(invoice_id)
        AND (internal.is_admin() OR internal.is_manager() OR internal.is_sales())
      );

    CREATE POLICY "Authenticated users can delete invoice payments"
      ON sales.invoice_payments
      FOR DELETE
      USING (
        sales.can_access_invoice_archive(invoice_id)
        AND (internal.is_admin() OR internal.is_manager())
      );
  END IF;
END;
$$;

COMMIT;
