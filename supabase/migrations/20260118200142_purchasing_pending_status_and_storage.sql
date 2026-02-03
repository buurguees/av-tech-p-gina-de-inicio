-- Añadir estado 'PENDING' a la tabla de facturas de compra
-- Como el campo 'status' en sales.purchase_invoices es TEXT, solo añadimos el índice y aseguramos storage.

-- Asegurar que existe el bucket para documentos de compra
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-documents', 'purchase-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de RLS para el bucket purchase-documents
-- Permitir lectura a usuarios autenticados
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'authenticated_read_purchase_documents'
    ) THEN
        CREATE POLICY "authenticated_read_purchase_documents"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'purchase-documents');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'authenticated_insert_purchase_documents'
    ) THEN
        CREATE POLICY "authenticated_insert_purchase_documents"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'purchase-documents');
    END IF;
END $$;

-- Crear un índice para búsquedas rápidas por estado
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON sales.purchase_invoices(status);
