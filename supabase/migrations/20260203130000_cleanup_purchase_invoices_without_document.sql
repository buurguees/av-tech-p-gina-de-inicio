--
-- Eliminar tickets y facturas de compra que no tienen documento o el documento no existe en storage.
-- NO se eliminan las que están aprobadas y pagadas (status APPROVED/PAID y pending_amount <= 0).
-- Las líneas y pagos se borran en cascada.
--

-- 1) Sin documento (file_path nulo o vacío) y no aprobadas+pagadas
DELETE FROM sales.purchase_invoices
WHERE (file_path IS NULL OR trim(coalesce(file_path, '')) = '')
  AND NOT (
    status IN ('APPROVED', 'PAID')
    AND coalesce(pending_amount, 0) <= 0
  );

-- 2) Con file_path pero el objeto no existe en storage (documento no encontrado), y no aprobadas+pagadas
-- En Supabase, storage.objects tiene bucket_id y name (ruta del archivo).
DELETE FROM sales.purchase_invoices pi
WHERE pi.file_path IS NOT NULL
  AND trim(pi.file_path) != ''
  AND NOT EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'purchase-documents'
      AND o.name = trim(pi.file_path)
  )
  AND NOT (
    pi.status IN ('APPROVED', 'PAID')
    AND coalesce(pi.pending_amount, 0) <= 0
  );
