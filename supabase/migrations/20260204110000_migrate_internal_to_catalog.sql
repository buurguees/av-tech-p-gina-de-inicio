-- ============================================
-- Migración de datos: internal → catalog (sin pérdida)
-- ============================================
-- Categorías (con domain), subcategorías como hijos, productos, packs → BUNDLE + product_bundles.
-- Usa tablas de mapeo en schema catalog para old_id -> new_id (se pueden borrar después).
-- Solo ejecuta inserciones si existen tablas internal y tienen datos.
-- ============================================

BEGIN;

-- Tablas de mapeo (internal id -> catalog id)
CREATE TABLE IF NOT EXISTS catalog._mig_category_map (
  internal_id UUID PRIMARY KEY,
  catalog_id UUID NOT NULL REFERENCES catalog.categories(id)
);
CREATE TABLE IF NOT EXISTS catalog._mig_subcategory_map (
  internal_id UUID PRIMARY KEY,
  catalog_id UUID NOT NULL REFERENCES catalog.categories(id)
);
CREATE TABLE IF NOT EXISTS catalog._mig_product_map (
  internal_id UUID PRIMARY KEY,
  catalog_id UUID NOT NULL REFERENCES catalog.products(id)
);
CREATE TABLE IF NOT EXISTS catalog._mig_pack_map (
  internal_pack_id UUID PRIMARY KEY,
  catalog_product_id UUID NOT NULL REFERENCES catalog.products(id)
);

DO $$
DECLARE
  v_cat RECORD;
  v_sub RECORD;
  v_prod RECORD;
  v_pack RECORD;
  v_item RECORD;
  v_slug TEXT;
  v_tax_id UUID;
  v_cat_catalog_id UUID;
  v_sub_catalog_id UUID;
  v_prod_catalog_id UUID;
  v_bundle_catalog_id UUID;
  v_domain catalog.category_domain;
  v_has_type_col BOOLEAN;
BEGIN
  -- Comprobar que internal.product_categories existe y tiene filas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'internal' AND table_name = 'product_categories'
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM internal.product_categories LIMIT 1) THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'internal' AND table_name = 'product_categories' AND column_name = 'type'
  ) INTO v_has_type_col;

  -- 1) Migrar categorías (internal.product_categories -> catalog.categories)
  -- Si existe columna type, usarla para domain (service→SERVICE); si no, PRODUCT por defecto
  IF v_has_type_col THEN
    FOR v_cat IN
      SELECT id, name, code, description, display_order, is_active,
             lower(trim(type::text)) AS typ
      FROM internal.product_categories
    LOOP
      v_slug := 'mig-' || lower(regexp_replace(trim(v_cat.code), '\s+', '-', 'g'));
      v_domain := CASE WHEN v_cat.typ = 'service' THEN 'SERVICE'::catalog.category_domain ELSE 'PRODUCT'::catalog.category_domain END;
      INSERT INTO catalog.categories (name, slug, description, sort_order, is_active, domain)
      VALUES (v_cat.name, v_slug, v_cat.description, v_cat.display_order, v_cat.is_active, v_domain)
      ON CONFLICT (slug) DO NOTHING;
      SELECT c.id INTO v_cat_catalog_id FROM catalog.categories c WHERE c.slug = v_slug LIMIT 1;
      INSERT INTO catalog._mig_category_map (internal_id, catalog_id) VALUES (v_cat.id, v_cat_catalog_id)
      ON CONFLICT (internal_id) DO UPDATE SET catalog_id = v_cat_catalog_id;
    END LOOP;
  ELSE
    FOR v_cat IN
      SELECT id, name, code, description, display_order, is_active
      FROM internal.product_categories
    LOOP
      v_slug := 'mig-' || lower(regexp_replace(trim(v_cat.code), '\s+', '-', 'g'));
      v_domain := 'PRODUCT'::catalog.category_domain;
      INSERT INTO catalog.categories (name, slug, description, sort_order, is_active, domain)
      VALUES (v_cat.name, v_slug, v_cat.description, v_cat.display_order, v_cat.is_active, v_domain)
      ON CONFLICT (slug) DO NOTHING;
      SELECT c.id INTO v_cat_catalog_id FROM catalog.categories c WHERE c.slug = v_slug LIMIT 1;
      INSERT INTO catalog._mig_category_map (internal_id, catalog_id) VALUES (v_cat.id, v_cat_catalog_id)
      ON CONFLICT (internal_id) DO UPDATE SET catalog_id = v_cat_catalog_id;
    END LOOP;
  END IF;

  -- 2) Migrar subcategorías (como categorías con parent_id)
  FOR v_sub IN
    SELECT s.id, s.category_id, s.name, s.code, s.description, s.display_order, s.is_active
    FROM internal.product_subcategories s
  LOOP
    SELECT catalog_id INTO v_cat_catalog_id FROM catalog._mig_category_map WHERE internal_id = v_sub.category_id LIMIT 1;
    IF v_cat_catalog_id IS NULL THEN CONTINUE; END IF;
    v_slug := 'mig-' || lower(regexp_replace(trim(v_sub.code), '\s+', '-', 'g')) || '-' || replace(v_sub.id::text, '-', '');
    INSERT INTO catalog.categories (name, slug, description, parent_id, sort_order, is_active, domain)
    SELECT v_sub.name, v_slug, v_sub.description, v_cat_catalog_id, v_sub.display_order, v_sub.is_active, c.domain
    FROM catalog.categories c WHERE c.id = v_cat_catalog_id
    ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO v_sub_catalog_id FROM catalog.categories WHERE slug = v_slug LIMIT 1;
    INSERT INTO catalog._mig_subcategory_map (internal_id, catalog_id) VALUES (v_sub.id, v_sub_catalog_id)
    ON CONFLICT (internal_id) DO UPDATE SET catalog_id = v_sub_catalog_id;
  END LOOP;

  -- 3) Migrar productos (internal.products -> catalog.products)
  FOR v_prod IN
    SELECT p.id, p.product_number, p.category_id, p.subcategory_id, p.name, p.description,
           p.cost_price, p.base_price, p.tax_rate, p.is_active, p.type, p.stock
    FROM internal.products p
  LOOP
    -- category_id en catalog: subcategoría si existe, sino categoría
    v_cat_catalog_id := NULL;
    v_sub_catalog_id := NULL;
    IF v_prod.subcategory_id IS NOT NULL THEN
      SELECT catalog_id INTO v_sub_catalog_id FROM catalog._mig_subcategory_map WHERE internal_id = v_prod.subcategory_id LIMIT 1;
    END IF;
    IF v_sub_catalog_id IS NOT NULL THEN
      v_cat_catalog_id := v_sub_catalog_id;
    ELSE
      SELECT catalog_id INTO v_cat_catalog_id FROM catalog._mig_category_map WHERE internal_id = v_prod.category_id LIMIT 1;
    END IF;
    SELECT id INTO v_tax_id FROM catalog.tax_rates WHERE rate = v_prod.tax_rate AND is_active = true LIMIT 1;
    IF v_tax_id IS NULL THEN
      SELECT id INTO v_tax_id FROM catalog.tax_rates WHERE is_default = true LIMIT 1;
    END IF;
    INSERT INTO catalog.products (
      sku, name, description, product_type, category_id, unit,
      cost_price, sale_price, tax_rate_id, track_stock, stock_quantity, is_active, discount_percent
    )
    VALUES (
      v_prod.product_number,
      v_prod.name,
      v_prod.description,
      CASE WHEN lower(v_prod.type::text) = 'service' THEN 'SERVICE'::catalog.product_type ELSE 'PRODUCT'::catalog.product_type END,
      v_cat_catalog_id,
      CASE WHEN lower(v_prod.type::text) = 'service' THEN 'hora'::catalog.unit_type ELSE 'ud'::catalog.unit_type END,
      v_prod.cost_price,
      v_prod.base_price,
      v_tax_id,
      lower(v_prod.type::text) = 'product',
      COALESCE(v_prod.stock, 0),
      v_prod.is_active,
      0
    )
    ON CONFLICT (sku) DO NOTHING;
    SELECT id INTO v_prod_catalog_id FROM catalog.products WHERE sku = v_prod.product_number LIMIT 1;
    INSERT INTO catalog._mig_product_map (internal_id, catalog_id) VALUES (v_prod.id, v_prod_catalog_id)
    ON CONFLICT (internal_id) DO UPDATE SET catalog_id = v_prod_catalog_id;
  END LOOP;

  -- 4) Packs como productos BUNDLE
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'internal' AND table_name = 'product_packs') THEN
    FOR v_pack IN
      SELECT id, pack_number, name, description, base_price, discount_percent, final_price, tax_rate, is_active
      FROM internal.product_packs
    LOOP
      SELECT id INTO v_tax_id FROM catalog.tax_rates WHERE rate = v_pack.tax_rate AND is_active = true LIMIT 1;
      IF v_tax_id IS NULL THEN SELECT id INTO v_tax_id FROM catalog.tax_rates WHERE is_default = true LIMIT 1; END IF;
      INSERT INTO catalog.products (sku, name, description, product_type, unit, sale_price, tax_rate_id, is_active, discount_percent, track_stock)
      VALUES (
        v_pack.pack_number,
        v_pack.name,
        v_pack.description,
        'BUNDLE'::catalog.product_type,
        'ud'::catalog.unit_type,
        COALESCE(v_pack.final_price, v_pack.base_price),
        v_tax_id,
        v_pack.is_active,
        COALESCE(v_pack.discount_percent, 0),
        false
      )
      ON CONFLICT (sku) DO NOTHING;
      SELECT id INTO v_bundle_catalog_id FROM catalog.products WHERE sku = v_pack.pack_number LIMIT 1;
      INSERT INTO catalog._mig_pack_map (internal_pack_id, catalog_product_id) VALUES (v_pack.id, v_bundle_catalog_id)
      ON CONFLICT (internal_pack_id) DO UPDATE SET catalog_product_id = v_bundle_catalog_id;
    END LOOP;

    -- 5) product_pack_items -> product_bundles
    FOR v_item IN
      SELECT ppi.pack_id, ppi.product_id, ppi.quantity
      FROM internal.product_pack_items ppi
    LOOP
      SELECT catalog_product_id INTO v_bundle_catalog_id FROM catalog._mig_pack_map WHERE internal_pack_id = v_item.pack_id LIMIT 1;
      SELECT catalog_id INTO v_prod_catalog_id FROM catalog._mig_product_map WHERE internal_id = v_item.product_id LIMIT 1;
      IF v_bundle_catalog_id IS NOT NULL AND v_prod_catalog_id IS NOT NULL THEN
        INSERT INTO catalog.product_bundles (bundle_product_id, component_product_id, quantity)
        VALUES (v_bundle_catalog_id, v_prod_catalog_id, v_item.quantity)
        ON CONFLICT (bundle_product_id, component_product_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMIT;
