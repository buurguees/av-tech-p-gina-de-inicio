-- ============================================
-- CATALOG V2: Domain en categorías + discount_percent + margen efectivo
-- ============================================
-- Opción A: categorías con domain PRODUCT | SERVICE para separar ámbitos.
-- Margen calculado sobre precio efectivo (sale_price * (1 - discount_percent/100)).
-- ============================================

BEGIN;

-- 1. ENUM domain para categorías
DO $$ BEGIN
  CREATE TYPE catalog.category_domain AS ENUM ('PRODUCT', 'SERVICE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Añadir domain a catalog.categories (nullable primero para datos existentes)
ALTER TABLE catalog.categories
  ADD COLUMN IF NOT EXISTS domain catalog.category_domain;

-- Valores por defecto para categorías existentes (slug como hint)
UPDATE catalog.categories
SET domain = CASE
  WHEN slug IN ('instalacion', 'mantenimiento', 'contenido-digital') THEN 'SERVICE'::catalog.category_domain
  ELSE 'PRODUCT'::catalog.category_domain
END
WHERE domain IS NULL;

-- Obligatorio
ALTER TABLE catalog.categories
  ALTER COLUMN domain SET NOT NULL;

-- Índice por domain
CREATE INDEX IF NOT EXISTS idx_categories_domain ON catalog.categories(domain, is_active, sort_order);

COMMENT ON COLUMN catalog.categories.domain IS 'PRODUCT: categorías de productos físicos. SERVICE: categorías de servicios.';

-- 3. discount_percent en catalog.products
ALTER TABLE catalog.products
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE catalog.products
  DROP CONSTRAINT IF EXISTS check_discount_percent;
ALTER TABLE catalog.products
  ADD CONSTRAINT check_discount_percent CHECK (discount_percent >= 0 AND discount_percent <= 100);

COMMENT ON COLUMN catalog.products.discount_percent IS 'Descuento en % sobre sale_price. Precio efectivo = sale_price * (1 - discount_percent/100).';

-- 4. Reemplazar trigger de margen: margen sobre precio efectivo
DROP TRIGGER IF EXISTS trigger_calculate_margin ON catalog.products;

CREATE OR REPLACE FUNCTION catalog.calculate_margin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = catalog
AS $$
DECLARE
  v_sale_effective NUMERIC(12,2);
BEGIN
  NEW.updated_at := now();
  v_sale_effective := NEW.sale_price * (1 - COALESCE(NEW.discount_percent, 0) / 100);
  IF NEW.cost_price IS NOT NULL AND NEW.cost_price >= 0 AND v_sale_effective > 0 THEN
    NEW.margin_percentage := ((v_sale_effective - NEW.cost_price) / v_sale_effective) * 100;
  ELSE
    NEW.margin_percentage := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_margin
  BEFORE INSERT OR UPDATE ON catalog.products
  FOR EACH ROW
  EXECUTE FUNCTION catalog.calculate_margin();

-- 5. Regla de dominio: producto solo en categorías de su tipo
-- PRODUCT/SERVICE solo en categorías con mismo domain; BUNDLE puede estar en PRODUCT o SERVICE
CREATE OR REPLACE FUNCTION catalog.check_product_category_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = catalog
AS $$
DECLARE
  v_cat_domain catalog.category_domain;
BEGIN
  IF NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT domain INTO v_cat_domain FROM catalog.categories WHERE id = NEW.category_id;
  IF v_cat_domain IS NULL THEN
    RETURN NEW; -- categoría sin domain (legacy) permitido temporalmente
  END IF;
  IF NEW.product_type = 'PRODUCT' AND v_cat_domain != 'PRODUCT' THEN
    RAISE EXCEPTION 'Un producto (PRODUCT) solo puede asignarse a categorías de dominio PRODUCT';
  END IF;
  IF NEW.product_type = 'SERVICE' AND v_cat_domain != 'SERVICE' THEN
    RAISE EXCEPTION 'Un servicio (SERVICE) solo puede asignarse a categorías de dominio SERVICE';
  END IF;
  -- BUNDLE: permitido en PRODUCT o SERVICE
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_product_category_domain ON catalog.products;
CREATE TRIGGER trigger_check_product_category_domain
  BEFORE INSERT OR UPDATE ON catalog.products
  FOR EACH ROW
  EXECUTE FUNCTION catalog.check_product_category_domain();

COMMIT;
