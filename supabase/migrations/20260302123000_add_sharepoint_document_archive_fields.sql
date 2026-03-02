-- ============================================
-- SharePoint document archive persistence
-- ============================================
-- Objective:
-- - Persist immutable archived PDF metadata for issued sales invoices
-- - Persist immutable archived PDF metadata for emitted quotes
-- - Persist immutable archived PDF metadata for approved purchase invoices
-- - Provide secure RPCs to write archive metadata after upload to SharePoint
-- ============================================

BEGIN;

-- ============================================
-- 1. Shared archive columns
-- ============================================

ALTER TABLE sales.invoices
  ADD COLUMN IF NOT EXISTS archived_pdf_provider TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_site_id TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_drive_id TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_item_id TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_web_url TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_etag TEXT,
  ADD COLUMN IF NOT EXISTS archived_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS archived_pdf_file_name TEXT,
  ADD COLUMN IF NOT EXISTS archived_pdf_hash TEXT,
  ADD COLUMN IF NOT EXISTS archived_record_hash TEXT,
  ADD COLUMN IF NOT EXISTS archived_pdf_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_pdf_generated_by UUID REFERENCES internal.authorized_users(id),
  ADD COLUMN IF NOT EXISTS archived_pdf_last_synced_at TIMESTAMPTZ;

ALTER TABLE quotes.quotes
  ADD COLUMN IF NOT EXISTS archived_pdf_provider TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_site_id TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_drive_id TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_item_id TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_web_url TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_etag TEXT,
  ADD COLUMN IF NOT EXISTS archived_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS archived_pdf_file_name TEXT,
  ADD COLUMN IF NOT EXISTS archived_pdf_hash TEXT,
  ADD COLUMN IF NOT EXISTS archived_record_hash TEXT,
  ADD COLUMN IF NOT EXISTS archived_pdf_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_pdf_generated_by UUID REFERENCES internal.authorized_users(id),
  ADD COLUMN IF NOT EXISTS archived_pdf_last_synced_at TIMESTAMPTZ;

ALTER TABLE sales.purchase_invoices
  ADD COLUMN IF NOT EXISTS archived_pdf_provider TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_site_id TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_drive_id TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_item_id TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_web_url TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_etag TEXT,
  ADD COLUMN IF NOT EXISTS archived_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS archived_pdf_file_name TEXT,
  ADD COLUMN IF NOT EXISTS archived_pdf_hash TEXT,
  ADD COLUMN IF NOT EXISTS archived_record_hash TEXT,
  ADD COLUMN IF NOT EXISTS archived_pdf_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_pdf_generated_by UUID REFERENCES internal.authorized_users(id),
  ADD COLUMN IF NOT EXISTS archived_pdf_last_synced_at TIMESTAMPTZ;

-- Provider restrictions
ALTER TABLE sales.invoices
  DROP CONSTRAINT IF EXISTS invoices_archived_pdf_provider_check;
ALTER TABLE sales.invoices
  ADD CONSTRAINT invoices_archived_pdf_provider_check
  CHECK (
    archived_pdf_provider IS NULL
    OR archived_pdf_provider IN ('SHAREPOINT')
  );

ALTER TABLE quotes.quotes
  DROP CONSTRAINT IF EXISTS quotes_archived_pdf_provider_check;
ALTER TABLE quotes.quotes
  ADD CONSTRAINT quotes_archived_pdf_provider_check
  CHECK (
    archived_pdf_provider IS NULL
    OR archived_pdf_provider IN ('SHAREPOINT')
  );

ALTER TABLE sales.purchase_invoices
  DROP CONSTRAINT IF EXISTS purchase_invoices_archived_pdf_provider_check;
ALTER TABLE sales.purchase_invoices
  ADD CONSTRAINT purchase_invoices_archived_pdf_provider_check
  CHECK (
    archived_pdf_provider IS NULL
    OR archived_pdf_provider IN ('SHAREPOINT')
  );

-- One SharePoint item per ERP document
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_invoices_sharepoint_item_id
  ON sales.invoices(sharepoint_item_id)
  WHERE sharepoint_item_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_sharepoint_item_id
  ON quotes.quotes(sharepoint_item_id)
  WHERE sharepoint_item_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_invoices_sharepoint_item_id
  ON sales.purchase_invoices(sharepoint_item_id)
  WHERE sharepoint_item_id IS NOT NULL;

COMMENT ON COLUMN sales.invoices.archived_pdf_provider IS 'Provider of the immutable archived PDF. Initial value: SHAREPOINT.';
COMMENT ON COLUMN sales.invoices.archived_pdf_hash IS 'SHA-256 hash of the final archived PDF.';
COMMENT ON COLUMN sales.invoices.archived_record_hash IS 'Optional chainable record hash, separate from the PDF file hash.';
COMMENT ON COLUMN quotes.quotes.archived_pdf_provider IS 'Provider of the immutable archived quote PDF. Initial value: SHAREPOINT.';
COMMENT ON COLUMN sales.purchase_invoices.archived_pdf_provider IS 'Provider of the immutable archived purchase document PDF. Initial value: SHAREPOINT.';

-- ============================================
-- 2. Secure metadata persistence RPCs
-- ============================================

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
  v_is_service_role := auth.role() = 'service_role';
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF NOT v_is_service_role AND v_user_id IS NULL THEN
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
      archived_pdf_generated_by = COALESCE(archived_pdf_generated_by, v_user_id),
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
  v_is_service_role := auth.role() = 'service_role';
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF NOT v_is_service_role AND v_user_id IS NULL THEN
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
      archived_pdf_generated_by = COALESCE(archived_pdf_generated_by, v_user_id),
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
  v_is_service_role := auth.role() = 'service_role';
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF NOT v_is_service_role AND v_user_id IS NULL THEN
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
      archived_pdf_generated_by = COALESCE(archived_pdf_generated_by, v_user_id),
      archived_pdf_last_synced_at = now(),
      updated_at = now()
  WHERE id = p_invoice_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_invoice_archive_metadata(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_quote_archive_metadata(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_purchase_invoice_archive_metadata(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.set_invoice_archive_metadata IS 'Persiste metadata del PDF final archivado en SharePoint para facturas emitidas.';
COMMENT ON FUNCTION public.set_quote_archive_metadata IS 'Persiste metadata del PDF final archivado en SharePoint para presupuestos emitidos.';
COMMENT ON FUNCTION public.set_purchase_invoice_archive_metadata IS 'Persiste metadata del PDF final archivado en SharePoint para compras aprobadas.';

COMMIT;
