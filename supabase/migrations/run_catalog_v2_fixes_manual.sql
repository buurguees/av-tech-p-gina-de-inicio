-- ============================================
-- CATALOG V2: Aplicar fixes manualmente (cuando db push no puede por historial)
-- ============================================
-- Ejecutar en Supabase Dashboard > SQL Editor, en este orden.
-- Si las migraciones 20260204100000..150000 ya están aplicadas en el remoto,
-- este script aplica solo los cambios P0/P1 (índice, triggers bundles, RPCs NUMERIC, created_by).
-- ============================================

-- PARTE 1: Fix created_by en stock_movements (si la tabla se creó con FK)
DO $$
BEGIN
  ALTER TABLE catalog.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_created_by_fkey;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
COMMENT ON COLUMN catalog.stock_movements.created_by IS 'Usuario que registró el movimiento. Sin FK; la app puede rellenar con internal.get_authorized_user_id(auth.uid()).';

-- PARTE 2: Corregir domain de categorías migradas (si internal.product_categories tiene columna type)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'internal' AND table_name = 'product_categories' AND column_name = 'type'
  ) AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'catalog' AND table_name = '_mig_category_map') THEN
    UPDATE catalog.categories c
    SET domain = CASE WHEN lower(trim(pc.type::text)) = 'service' THEN 'SERVICE'::catalog.category_domain ELSE 'PRODUCT'::catalog.category_domain END
    FROM catalog._mig_category_map m
    JOIN internal.product_categories pc ON pc.id = m.internal_id
    WHERE c.id = m.catalog_id;
  END IF;
END $$;
