-- ============================================
-- RPCs catálogo: incluir proveedor (supplier_id, supplier_name)
-- ============================================
-- list_catalog_products, get_catalog_product_detail devuelven supplier_id y supplier_name.
-- create_catalog_product y update_catalog_product aceptan p_supplier_id.
-- DROP antes de CREATE porque cambia el tipo de retorno (nuevas columnas).
-- ============================================

BEGIN;

DROP FUNCTION IF EXISTS public.list_catalog_products(catalog.category_domain,uuid,text,boolean);
DROP FUNCTION IF EXISTS public.get_catalog_product_detail(uuid);

-- list_catalog_products: añadir supplier_id, supplier_name
CREATE OR REPLACE FUNCTION public.list_catalog_products(
  p_domain catalog.category_domain DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_include_inactive BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  sku TEXT,
  name TEXT,
  description TEXT,
  product_type catalog.product_type,
  category_id UUID,
  category_name TEXT,
  supplier_id UUID,
  supplier_name TEXT,
  unit catalog.unit_type,
  cost_price NUMERIC,
  sale_price NUMERIC,
  discount_percent NUMERIC,
  sale_price_effective NUMERIC,
  tax_rate NUMERIC,
  margin_percentage NUMERIC,
  track_stock BOOLEAN,
  stock_quantity NUMERIC(12,3),
  min_stock_alert NUMERIC(12,3),
  is_active BOOLEAN,
  has_low_stock_alert BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  SELECT
    p.id,
    p.sku,
    p.name,
    p.description,
    p.product_type,
    p.category_id,
    c.name::TEXT AS category_name,
    p.supplier_id,
    s.company_name::TEXT AS supplier_name,
    p.unit,
    p.cost_price,
    p.sale_price,
    p.discount_percent,
    (p.sale_price * (1 - COALESCE(p.discount_percent, 0) / 100))::NUMERIC AS sale_price_effective,
    (SELECT tr.rate FROM catalog.tax_rates tr WHERE tr.id = p.tax_rate_id)::NUMERIC AS tax_rate,
    p.margin_percentage,
    p.track_stock,
    COALESCE(p.stock_quantity, 0)::NUMERIC(12,3),
    p.min_stock_alert::NUMERIC(12,3),
    p.is_active,
    EXISTS (SELECT 1 FROM catalog.stock_alerts sa WHERE sa.product_id = p.id AND sa.status = 'open') AS has_low_stock_alert
  FROM catalog.products p
  LEFT JOIN catalog.categories c ON c.id = p.category_id
  LEFT JOIN internal.suppliers s ON s.id = p.supplier_id
  WHERE (p_domain IS NULL OR c.domain = p_domain)
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%' OR p.sku ILIKE '%' || p_search || '%' OR p.description ILIKE '%' || p_search || '%')
    AND (p_include_inactive OR p.is_active)
    AND p.product_type != 'BUNDLE'
  ORDER BY p.sku;
END;
$$;

-- get_catalog_product_detail: añadir supplier_id, supplier_name
CREATE OR REPLACE FUNCTION public.get_catalog_product_detail(p_product_id UUID)
RETURNS TABLE (
  id UUID,
  sku TEXT,
  name TEXT,
  description TEXT,
  product_type catalog.product_type,
  category_id UUID,
  category_name TEXT,
  supplier_id UUID,
  supplier_name TEXT,
  unit catalog.unit_type,
  cost_price NUMERIC,
  sale_price NUMERIC,
  discount_percent NUMERIC,
  sale_price_effective NUMERIC,
  tax_rate_id UUID,
  tax_rate NUMERIC,
  margin_percentage NUMERIC,
  margin_amount NUMERIC,
  track_stock BOOLEAN,
  stock_quantity NUMERIC(12,3),
  min_stock_alert NUMERIC(12,3),
  is_active BOOLEAN,
  has_low_stock_alert BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  SELECT
    p.id,
    p.sku,
    p.name,
    p.description,
    p.product_type,
    p.category_id,
    c.name::TEXT AS category_name,
    p.supplier_id,
    s.company_name::TEXT AS supplier_name,
    p.unit,
    p.cost_price,
    p.sale_price,
    p.discount_percent,
    (p.sale_price * (1 - COALESCE(p.discount_percent, 0) / 100))::NUMERIC AS sale_price_effective,
    p.tax_rate_id,
    (SELECT tr.rate FROM catalog.tax_rates tr WHERE tr.id = p.tax_rate_id)::NUMERIC AS tax_rate,
    p.margin_percentage,
    (p.sale_price * (1 - COALESCE(p.discount_percent, 0) / 100) - COALESCE(p.cost_price, 0))::NUMERIC AS margin_amount,
    p.track_stock,
    COALESCE(p.stock_quantity, 0)::NUMERIC(12,3),
    p.min_stock_alert::NUMERIC(12,3),
    p.is_active,
    EXISTS (SELECT 1 FROM catalog.stock_alerts sa WHERE sa.product_id = p.id AND sa.status = 'open') AS has_low_stock_alert,
    p.created_at,
    p.updated_at
  FROM catalog.products p
  LEFT JOIN catalog.categories c ON c.id = p.category_id
  LEFT JOIN internal.suppliers s ON s.id = p.supplier_id
  WHERE p.id = p_product_id;
END;
$$;

-- create_catalog_product: añadir p_supplier_id
CREATE OR REPLACE FUNCTION public.create_catalog_product(
  p_sku TEXT,
  p_name TEXT,
  p_product_type catalog.product_type,
  p_category_id UUID DEFAULT NULL,
  p_unit catalog.unit_type DEFAULT 'ud',
  p_cost_price NUMERIC DEFAULT NULL,
  p_sale_price NUMERIC DEFAULT 0,
  p_discount_percent NUMERIC DEFAULT 0,
  p_tax_rate_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_track_stock BOOLEAN DEFAULT false,
  p_min_stock_alert NUMERIC(12,3) DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
DECLARE v_id UUID; v_tax UUID;
BEGIN
  IF NOT internal.is_admin() THEN RAISE EXCEPTION 'Only admins can create products'; END IF;
  v_tax := COALESCE(p_tax_rate_id, (SELECT id FROM catalog.tax_rates WHERE is_default = true LIMIT 1));
  INSERT INTO catalog.products (sku, name, description, product_type, category_id, unit, cost_price, sale_price, discount_percent, tax_rate_id, track_stock, min_stock_alert, supplier_id)
  VALUES (p_sku, p_name, p_description, p_product_type, p_category_id, p_unit, p_cost_price, p_sale_price, p_discount_percent, v_tax, p_track_stock, p_min_stock_alert, p_supplier_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- update_catalog_product: añadir p_supplier_id y p_clear_supplier
-- supplier_id solo se actualiza si p_supplier_id IS NOT NULL o si p_clear_supplier = true (para no borrarlo en updates que no envían el campo)
CREATE OR REPLACE FUNCTION public.update_catalog_product(
  p_id UUID,
  p_name TEXT DEFAULT NULL,
  p_sku TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_unit catalog.unit_type DEFAULT NULL,
  p_cost_price NUMERIC DEFAULT NULL,
  p_sale_price NUMERIC DEFAULT NULL,
  p_discount_percent NUMERIC DEFAULT NULL,
  p_tax_rate_id UUID DEFAULT NULL,
  p_track_stock BOOLEAN DEFAULT NULL,
  p_min_stock_alert NUMERIC(12,3) DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_clear_supplier BOOLEAN DEFAULT FALSE,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
BEGIN
  IF NOT internal.is_admin() THEN RAISE EXCEPTION 'Only admins can update products'; END IF;
  UPDATE catalog.products
  SET name = COALESCE(p_name, name),
      sku = COALESCE(p_sku, sku),
      description = COALESCE(p_description, description),
      category_id = COALESCE(p_category_id, category_id),
      unit = COALESCE(p_unit, unit),
      cost_price = COALESCE(p_cost_price, cost_price),
      sale_price = COALESCE(p_sale_price, sale_price),
      discount_percent = COALESCE(p_discount_percent, discount_percent),
      tax_rate_id = COALESCE(p_tax_rate_id, tax_rate_id),
      track_stock = COALESCE(p_track_stock, track_stock),
      min_stock_alert = COALESCE(p_min_stock_alert, min_stock_alert),
      supplier_id = CASE WHEN p_clear_supplier THEN NULL WHEN p_supplier_id IS NOT NULL THEN p_supplier_id ELSE supplier_id END,
      is_active = COALESCE(p_is_active, is_active),
      updated_at = now()
  WHERE id = p_id;
  RETURN FOUND;
END;
$$;

COMMIT;
