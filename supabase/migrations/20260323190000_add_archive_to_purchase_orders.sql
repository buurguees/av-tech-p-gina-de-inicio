-- Migración: añadir campos de archivado documental a sales.purchase_orders
-- y RPC para persistir metadata de SharePoint al aprobar un pedido de compra.
-- Los pedidos de compra son documentos operativos (NO fiscales).
-- El archivado en SharePoint se realiza desde el frontend tras la aprobación.

-- 1. Añadir columnas de archivado a la tabla purchase_orders
ALTER TABLE sales.purchase_orders
  ADD COLUMN IF NOT EXISTS archived_pdf_path     TEXT,
  ADD COLUMN IF NOT EXISTS archived_pdf_file_name TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_item_id    TEXT,
  ADD COLUMN IF NOT EXISTS sharepoint_web_url    TEXT,
  ADD COLUMN IF NOT EXISTS archived_at           TIMESTAMPTZ;

-- 2. RPC para persistir metadata de SharePoint tras archivado
CREATE OR REPLACE FUNCTION public.update_purchase_order_archive_metadata(
  p_order_id         UUID,
  p_pdf_path         TEXT,
  p_pdf_file_name    TEXT,
  p_item_id          TEXT,
  p_web_url          TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sales
AS $$
BEGIN
  UPDATE sales.purchase_orders
  SET
    archived_pdf_path      = p_pdf_path,
    archived_pdf_file_name = p_pdf_file_name,
    sharepoint_item_id     = p_item_id,
    sharepoint_web_url     = p_web_url,
    archived_at            = NOW(),
    updated_at             = NOW()
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido de compra no encontrado: %', p_order_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.update_purchase_order_archive_metadata IS
  'Persiste la referencia al PDF archivado en SharePoint para un pedido de compra. '
  'Llamado desde el frontend tras aprobar el pedido y subir el PDF.';
