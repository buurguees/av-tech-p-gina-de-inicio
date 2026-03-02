BEGIN;

CREATE OR REPLACE FUNCTION sales.can_access_invoice_archive(p_invoice_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = sales, internal, projects
AS $$
DECLARE
  v_user_id UUID;
  v_invoice_project_id UUID;
  v_invoice_created_by UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());

  IF auth.uid() IS NULL OR v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF internal.is_admin() OR internal.is_manager() OR internal.is_readonly() THEN
    RETURN TRUE;
  END IF;

  SELECT i.project_id, i.created_by
  INTO v_invoice_project_id, v_invoice_created_by
  FROM sales.invoices i
  WHERE i.id = p_invoice_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF internal.is_sales() AND v_invoice_created_by = v_user_id THEN
    RETURN TRUE;
  END IF;

  IF v_invoice_project_id IS NOT NULL AND projects.can_access_project(v_invoice_project_id) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invoice_archive_metadata(p_invoice_id UUID)
RETURNS TABLE(
  archived_pdf_path TEXT,
  archived_pdf_file_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sales
AS $$
BEGIN
  IF NOT sales.can_access_invoice_archive(p_invoice_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    i.archived_pdf_path,
    i.archived_pdf_file_name
  FROM sales.invoices i
  WHERE i.id = p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_quote_archive_metadata(p_quote_id UUID)
RETURNS TABLE(
  archived_pdf_path TEXT,
  archived_pdf_file_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, quotes, sales
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT sales.can_access_quote(p_quote_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    q.archived_pdf_path,
    q.archived_pdf_file_name
  FROM quotes.quotes q
  WHERE q.id = p_quote_id;
END;
$$;

REVOKE ALL ON FUNCTION sales.can_access_invoice_archive(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION sales.can_access_invoice_archive(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_invoice_archive_metadata(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_quote_archive_metadata(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_invoice_archive_metadata(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_quote_archive_metadata(UUID) TO authenticated, service_role;

COMMIT;
