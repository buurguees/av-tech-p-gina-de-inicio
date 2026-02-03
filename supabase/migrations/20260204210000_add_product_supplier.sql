-- ============================================
-- Catálogo: proveedor habitual por producto
-- ============================================
-- Permite anotar a qué proveedor se le compra el material (productos físicos).
-- ============================================

BEGIN;

ALTER TABLE catalog.products
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES internal.suppliers(id) ON DELETE SET NULL;

COMMENT ON COLUMN catalog.products.supplier_id IS 'Proveedor habitual del que se compra el material. Opcional.';

CREATE INDEX IF NOT EXISTS idx_products_supplier ON catalog.products(supplier_id) WHERE supplier_id IS NOT NULL;

COMMIT;
