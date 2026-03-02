-- ============================================
-- Service-role persistence wrappers for archive metadata
-- ============================================
BEGIN;

CREATE OR REPLACE FUNCTION public.sync_set_invoice_archive_metadata(
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
SET search_path = public, sales
AS $$
DECLARE
  v_invoice sales.invoices%ROWTYPE;
BEGIN
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
      archived_pdf_generated_by = COALESCE(archived_pdf_generated_by, v_invoice.created_by),
      archived_pdf_last_synced_at = now(),
      updated_at = now()
  WHERE id = p_invoice_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_set_quote_archive_metadata(
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
SET search_path = public, quotes
AS $$
DECLARE
  v_quote quotes.quotes%ROWTYPE;
BEGIN
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
      archived_pdf_generated_by = COALESCE(archived_pdf_generated_by, v_quote.created_by),
      archived_pdf_last_synced_at = now(),
      updated_at = now()
  WHERE id = p_quote_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_set_invoice_archive_metadata(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_set_quote_archive_metadata(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sync_set_invoice_archive_metadata(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_set_quote_archive_metadata(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMIT;
