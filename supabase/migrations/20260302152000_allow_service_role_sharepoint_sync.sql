-- ============================================
-- Allow service_role for SharePoint sync flows
-- ============================================
BEGIN;

CREATE OR REPLACE FUNCTION public.finance_get_invoice_lines(p_invoice_id UUID)
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
DECLARE
  v_user_id UUID;
  v_is_service_role BOOLEAN;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  v_is_service_role := COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role';

  IF v_user_id IS NULL AND NOT v_is_service_role THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;

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

CREATE OR REPLACE FUNCTION public.get_quote_lines(p_quote_id UUID)
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
DECLARE
  v_user_id UUID;
  v_is_service_role BOOLEAN;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  v_is_service_role := COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role';

  IF v_user_id IS NULL AND NOT v_is_service_role THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;

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

CREATE OR REPLACE FUNCTION public.set_invoice_archive_metadata(
  p_invoice_id UUID,
  p_sharepoint_site_id TEXT,
  p_sharepoint_drive_id TEXT,
  p_sharepoint_item_id TEXT,
  p_sharepoint_web_url TEXT DEFAULT NULL,
  p_sharepoint_etag TEXT DEFAULT NULL,
  p_archived_pdf_path TEXT DEFAULT NULL,
  p_archived_pdf_file_name TEXT DEFAULT NULL,
  p_archived_pdf_hash TEXT DEFAULT NULL,
  p_archived_record_hash TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sales, internal
AS $$
DECLARE
  v_user_id UUID;
  v_is_service_role BOOLEAN;
  v_invoice sales.invoices%ROWTYPE;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  v_is_service_role := COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role';
  IF v_user_id IS NULL AND NOT v_is_service_role THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  SELECT * INTO v_invoice
  FROM sales.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada: %', p_invoice_id;
  END IF;

  IF v_invoice.status NOT IN ('ISSUED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'RECTIFIED') THEN
    RAISE EXCEPTION 'Solo se puede archivar una factura emitida o cerrada. Estado actual: %', v_invoice.status;
  END IF;

  UPDATE sales.invoices
  SET archived_pdf_provider = 'SHAREPOINT',
      sharepoint_site_id = p_sharepoint_site_id,
      sharepoint_drive_id = p_sharepoint_drive_id,
      sharepoint_item_id = p_sharepoint_item_id,
      sharepoint_web_url = COALESCE(p_sharepoint_web_url, sharepoint_web_url),
      sharepoint_etag = COALESCE(p_sharepoint_etag, sharepoint_etag),
      archived_pdf_path = COALESCE(p_archived_pdf_path, archived_pdf_path),
      archived_pdf_file_name = COALESCE(p_archived_pdf_file_name, archived_pdf_file_name),
      archived_pdf_hash = COALESCE(p_archived_pdf_hash, archived_pdf_hash),
      archived_record_hash = COALESCE(p_archived_record_hash, archived_record_hash),
      archived_pdf_generated_at = COALESCE(archived_pdf_generated_at, now()),
      archived_pdf_generated_by = COALESCE(archived_pdf_generated_by, v_user_id, v_invoice.created_by),
      archived_pdf_last_synced_at = now(),
      updated_at = now()
  WHERE id = p_invoice_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_quote_archive_metadata(
  p_quote_id UUID,
  p_sharepoint_site_id TEXT,
  p_sharepoint_drive_id TEXT,
  p_sharepoint_item_id TEXT,
  p_sharepoint_web_url TEXT DEFAULT NULL,
  p_sharepoint_etag TEXT DEFAULT NULL,
  p_archived_pdf_path TEXT DEFAULT NULL,
  p_archived_pdf_file_name TEXT DEFAULT NULL,
  p_archived_pdf_hash TEXT DEFAULT NULL,
  p_archived_record_hash TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, quotes, internal
AS $$
DECLARE
  v_user_id UUID;
  v_is_service_role BOOLEAN;
  v_quote quotes.quotes%ROWTYPE;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  v_is_service_role := COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role';
  IF v_user_id IS NULL AND NOT v_is_service_role THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  SELECT * INTO v_quote
  FROM quotes.quotes
  WHERE id = p_quote_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Presupuesto no encontrado: %', p_quote_id;
  END IF;

  IF v_quote.status NOT IN ('SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'INVOICED') THEN
    RAISE EXCEPTION 'Solo se puede archivar un presupuesto emitido o cerrado. Estado actual: %', v_quote.status;
  END IF;

  UPDATE quotes.quotes
  SET archived_pdf_provider = 'SHAREPOINT',
      sharepoint_site_id = p_sharepoint_site_id,
      sharepoint_drive_id = p_sharepoint_drive_id,
      sharepoint_item_id = p_sharepoint_item_id,
      sharepoint_web_url = COALESCE(p_sharepoint_web_url, sharepoint_web_url),
      sharepoint_etag = COALESCE(p_sharepoint_etag, sharepoint_etag),
      archived_pdf_path = COALESCE(p_archived_pdf_path, archived_pdf_path),
      archived_pdf_file_name = COALESCE(p_archived_pdf_file_name, archived_pdf_file_name),
      archived_pdf_hash = COALESCE(p_archived_pdf_hash, archived_pdf_hash),
      archived_record_hash = COALESCE(p_archived_record_hash, archived_record_hash),
      archived_pdf_generated_at = COALESCE(archived_pdf_generated_at, now()),
      archived_pdf_generated_by = COALESCE(archived_pdf_generated_by, v_user_id, v_quote.created_by),
      archived_pdf_last_synced_at = now(),
      updated_at = now()
  WHERE id = p_quote_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_purchase_invoice_archive_metadata(
  p_invoice_id UUID,
  p_sharepoint_site_id TEXT,
  p_sharepoint_drive_id TEXT,
  p_sharepoint_item_id TEXT,
  p_sharepoint_web_url TEXT DEFAULT NULL,
  p_sharepoint_etag TEXT DEFAULT NULL,
  p_archived_pdf_path TEXT DEFAULT NULL,
  p_archived_pdf_file_name TEXT DEFAULT NULL,
  p_archived_pdf_hash TEXT DEFAULT NULL,
  p_archived_record_hash TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sales, internal
AS $$
DECLARE
  v_user_id UUID;
  v_is_service_role BOOLEAN;
  v_invoice sales.purchase_invoices%ROWTYPE;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  v_is_service_role := COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role';
  IF v_user_id IS NULL AND NOT v_is_service_role THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  SELECT * INTO v_invoice
  FROM sales.purchase_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura de compra no encontrada: %', p_invoice_id;
  END IF;

  IF v_invoice.status NOT IN ('APPROVED', 'PARTIAL', 'PAID', 'CANCELLED', 'BLOCKED') THEN
    RAISE EXCEPTION 'Solo se puede archivar una compra aprobada o cerrada. Estado actual: %', v_invoice.status;
  END IF;

  UPDATE sales.purchase_invoices
  SET archived_pdf_provider = 'SHAREPOINT',
      sharepoint_site_id = p_sharepoint_site_id,
      sharepoint_drive_id = p_sharepoint_drive_id,
      sharepoint_item_id = p_sharepoint_item_id,
      sharepoint_web_url = COALESCE(p_sharepoint_web_url, sharepoint_web_url),
      sharepoint_etag = COALESCE(p_sharepoint_etag, sharepoint_etag),
      archived_pdf_path = COALESCE(p_archived_pdf_path, archived_pdf_path),
      archived_pdf_file_name = COALESCE(p_archived_pdf_file_name, archived_pdf_file_name),
      archived_pdf_hash = COALESCE(p_archived_pdf_hash, archived_pdf_hash),
      archived_record_hash = COALESCE(p_archived_record_hash, archived_record_hash),
      archived_pdf_generated_at = COALESCE(archived_pdf_generated_at, now()),
      archived_pdf_generated_by = COALESCE(archived_pdf_generated_by, v_user_id, v_invoice.created_by),
      archived_pdf_last_synced_at = now(),
      updated_at = now()
  WHERE id = p_invoice_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finance_get_invoice_lines(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quote_lines(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_invoice_archive_metadata(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_quote_archive_metadata(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_purchase_invoice_archive_metadata(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;
