-- ============================================
-- P1.1: Corregir domain en categorías migradas usando internal.product_categories.type
-- ============================================
-- Si internal.product_categories tiene columna type ('product'|'service'),
-- actualizar catalog.categories.domain para las categorías ya migradas vía _mig_category_map.
-- ============================================

BEGIN;

DO $$
DECLARE
  v_has_type BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'internal' AND table_name = 'product_categories' AND column_name = 'type'
  ) INTO v_has_type;

  IF NOT v_has_type THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'catalog' AND tablename = '_mig_category_map') THEN
    RETURN;
  END IF;

  UPDATE catalog.categories c
  SET domain = CASE WHEN lower(trim(pc.type::text)) = 'service' THEN 'SERVICE'::catalog.category_domain ELSE 'PRODUCT'::catalog.category_domain END
  FROM catalog._mig_category_map m
  JOIN internal.product_categories pc ON pc.id = m.internal_id
  WHERE c.id = m.catalog_id;
END;
$$;

COMMIT;
