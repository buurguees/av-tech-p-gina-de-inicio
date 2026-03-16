CREATE OR REPLACE FUNCTION public.sync_set_purchase_invoice_archive_metadata(
  p_invoice_id uuid,
  p_sharepoint_site_id text,
  p_sharepoint_drive_id text,
  p_sharepoint_item_id text,
  p_sharepoint_web_url text DEFAULT NULL,
  p_sharepoint_etag text DEFAULT NULL,
  p_archived_pdf_path text DEFAULT NULL,
  p_archived_pdf_file_name text DEFAULT NULL,
  p_archived_pdf_hash text DEFAULT NULL,
  p_archived_record_hash text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'sales'
AS $$
DECLARE
  v_invoice sales.purchase_invoices%ROWTYPE;
BEGIN
  SELECT *
  INTO v_invoice
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
      archived_pdf_generated_by = COALESCE(archived_pdf_generated_by, v_invoice.created_by),
      archived_pdf_last_synced_at = now(),
      updated_at = now()
  WHERE id = p_invoice_id;

  RETURN true;
END;
$$;
ALTER FUNCTION public.sync_set_purchase_invoice_archive_metadata(
  uuid, text, text, text, text, text, text, text, text, text
) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.sync_set_purchase_invoice_archive_metadata(
  uuid, text, text, text, text, text, text, text, text, text
) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_set_purchase_invoice_archive_metadata(
  uuid, text, text, text, text, text, text, text, text, text
) TO service_role;
