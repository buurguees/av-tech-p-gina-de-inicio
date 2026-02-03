-- ============================================
-- CATALOG V2: RPCs públicas para categorías, productos, bundles, documentos, stock
-- ============================================

BEGIN;

-- ---------- Tipos impositivos (catálogo) ----------
CREATE OR REPLACE FUNCTION public.list_catalog_tax_rates()
RETURNS TABLE (id UUID, name TEXT, rate NUMERIC, is_default BOOLEAN, is_active BOOLEAN)
LANGUAGE sql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
  SELECT id, name, rate, is_default, is_active FROM catalog.tax_rates WHERE is_active = true ORDER BY is_default DESC, rate DESC;
$$;

-- ---------- Categorías ----------
CREATE OR REPLACE FUNCTION public.list_catalog_categories(
  p_domain catalog.category_domain DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  parent_id UUID,
  sort_order INT,
  is_active BOOLEAN,
  domain catalog.category_domain,
  product_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.slug,
    c.description,
    c.parent_id,
    c.sort_order,
    c.is_active,
    c.domain,
    (SELECT COUNT(*) FROM catalog.products p WHERE p.category_id = c.id)::BIGINT
  FROM catalog.categories c
  WHERE (p_domain IS NULL OR c.domain = p_domain)
    AND (p_parent_id IS NULL AND c.parent_id IS NULL OR c.parent_id = p_parent_id)
    AND (p_search IS NULL OR p_search = '' OR c.name ILIKE '%' || p_search || '%' OR c.slug ILIKE '%' || p_search || '%')
  ORDER BY c.sort_order, c.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_catalog_category(
  p_name TEXT,
  p_slug TEXT,
  p_domain catalog.category_domain,
  p_description TEXT DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL,
  p_sort_order INT DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT internal.is_admin() THEN RAISE EXCEPTION 'Only admins can create categories'; END IF;
  INSERT INTO catalog.categories (name, slug, description, parent_id, sort_order, domain)
  VALUES (p_name, lower(regexp_replace(trim(p_slug), '\s+', '-', 'g')), p_description, p_parent_id, p_sort_order, p_domain)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_catalog_category(
  p_id UUID,
  p_name TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL,
  p_sort_order INT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
BEGIN
  IF NOT internal.is_admin() THEN RAISE EXCEPTION 'Only admins can update categories'; END IF;
  UPDATE catalog.categories
  SET name = COALESCE(p_name, name),
      slug = COALESCE(lower(regexp_replace(trim(p_slug), '\s+', '-', 'g')), slug),
      description = COALESCE(p_description, description),
      parent_id = COALESCE(p_parent_id, parent_id),
      sort_order = COALESCE(p_sort_order, sort_order),
      is_active = COALESCE(p_is_active, is_active),
      updated_at = now()
  WHERE id = p_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_catalog_category(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
BEGIN
  IF NOT internal.is_admin() THEN RAISE EXCEPTION 'Only admins can delete categories'; END IF;
  IF EXISTS (SELECT 1 FROM catalog.products WHERE category_id = p_id) THEN
    RAISE EXCEPTION 'Cannot delete category with products';
  END IF;
  DELETE FROM catalog.categories WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- ---------- Productos (listado con filtro domain) ----------
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
  WHERE (p_domain IS NULL OR (c.domain = p_domain AND p.product_type != 'BUNDLE') OR (p.product_type = 'BUNDLE' AND (p_domain IS NULL OR c.domain = p_domain)))
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%' OR p.sku ILIKE '%' || p_search || '%' OR p.description ILIKE '%' || p_search || '%')
    AND (p_include_inactive OR p.is_active)
    AND p.product_type != 'BUNDLE'
  ORDER BY p.sku;
END;
$$;

-- ---------- Bundles (solo BUNDLE) ----------
CREATE OR REPLACE FUNCTION public.list_catalog_bundles(p_search TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  sku TEXT,
  name TEXT,
  description TEXT,
  category_id UUID,
  sale_price NUMERIC,
  discount_percent NUMERIC,
  sale_price_effective NUMERIC,
  tax_rate NUMERIC,
  is_active BOOLEAN,
  component_count BIGINT
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
    p.category_id,
    p.sale_price,
    p.discount_percent,
    (p.sale_price * (1 - COALESCE(p.discount_percent, 0) / 100))::NUMERIC,
    (SELECT tr.rate FROM catalog.tax_rates tr WHERE tr.id = p.tax_rate_id)::NUMERIC,
    p.is_active,
    (SELECT COUNT(*) FROM catalog.product_bundles pb WHERE pb.bundle_product_id = p.id)::BIGINT
  FROM catalog.products p
  WHERE p.product_type = 'BUNDLE'
    AND (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%' OR p.sku ILIKE '%' || p_search || '%')
  ORDER BY p.sku;
END;
$$;

-- ---------- Búsqueda unificada para @ (productos + servicios + bundles) ----------
CREATE OR REPLACE FUNCTION public.list_catalog_products_search(
  p_search TEXT DEFAULT NULL,
  p_domain catalog.category_domain DEFAULT NULL,
  p_include_inactive BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  sku TEXT,
  name TEXT,
  description TEXT,
  product_type catalog.product_type,
  category_name TEXT,
  unit catalog.unit_type,
  sale_price_effective NUMERIC,
  tax_rate NUMERIC,
  track_stock BOOLEAN,
  stock_quantity NUMERIC(12,3),
  is_low_stock BOOLEAN
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
    c.name::TEXT,
    p.unit,
    (p.sale_price * (1 - COALESCE(p.discount_percent, 0) / 100))::NUMERIC,
    (SELECT tr.rate FROM catalog.tax_rates tr WHERE tr.id = p.tax_rate_id)::NUMERIC,
    p.track_stock,
    COALESCE(p.stock_quantity, 0)::NUMERIC(12,3),
    (p.track_stock AND p.min_stock_alert IS NOT NULL AND COALESCE(p.stock_quantity, 0) <= p.min_stock_alert)
  FROM catalog.products p
  LEFT JOIN catalog.categories c ON c.id = p.category_id
  WHERE (p_search IS NULL OR p_search = '' OR p.name ILIKE '%' || p_search || '%' OR p.sku ILIKE '%' || p_search || '%' OR p.description ILIKE '%' || p_search || '%')
    AND (p_include_inactive OR p.is_active)
    AND (p_domain IS NULL OR c.domain = p_domain OR (p.product_type = 'BUNDLE'));
END;
$$;

-- ---------- Detalle producto ----------
CREATE OR REPLACE FUNCTION public.get_catalog_product_detail(p_product_id UUID)
RETURNS TABLE (
  id UUID,
  sku TEXT,
  name TEXT,
  description TEXT,
  product_type catalog.product_type,
  category_id UUID,
  category_name TEXT,
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
    c.name::TEXT,
    p.unit,
    p.cost_price,
    p.sale_price,
    p.discount_percent,
    (p.sale_price * (1 - COALESCE(p.discount_percent, 0) / 100))::NUMERIC,
    p.tax_rate_id,
    (SELECT tr.rate FROM catalog.tax_rates tr WHERE tr.id = p.tax_rate_id)::NUMERIC,
    p.margin_percentage,
    (p.sale_price * (1 - COALESCE(p.discount_percent, 0) / 100) - COALESCE(p.cost_price, 0))::NUMERIC,
    p.track_stock,
    COALESCE(p.stock_quantity, 0)::NUMERIC(12,3),
    p.min_stock_alert::NUMERIC(12,3),
    p.is_active,
    EXISTS (SELECT 1 FROM catalog.stock_alerts sa WHERE sa.product_id = p.id AND sa.status = 'open'),
    p.created_at,
    p.updated_at
  FROM catalog.products p
  LEFT JOIN catalog.categories c ON c.id = p.category_id
  WHERE p.id = p_product_id;
END;
$$;

-- ---------- Create/Update/Delete product ----------
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
  p_min_stock_alert NUMERIC(12,3) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
DECLARE v_id UUID; v_tax UUID;
BEGIN
  IF NOT internal.is_admin() THEN RAISE EXCEPTION 'Only admins can create products'; END IF;
  v_tax := COALESCE(p_tax_rate_id, (SELECT id FROM catalog.tax_rates WHERE is_default = true LIMIT 1));
  INSERT INTO catalog.products (sku, name, description, product_type, category_id, unit, cost_price, sale_price, discount_percent, tax_rate_id, track_stock, min_stock_alert)
  VALUES (p_sku, p_name, p_description, p_product_type, p_category_id, p_unit, p_cost_price, p_sale_price, p_discount_percent, v_tax, p_track_stock, p_min_stock_alert::INT)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

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
      min_stock_alert = (COALESCE(p_min_stock_alert, min_stock_alert))::INT,
      is_active = COALESCE(p_is_active, is_active),
      updated_at = now()
  WHERE id = p_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_catalog_product(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
BEGIN
  IF NOT internal.is_admin() THEN RAISE EXCEPTION 'Only admins can delete products'; END IF;
  DELETE FROM catalog.products WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- ---------- Documentos ----------
CREATE OR REPLACE FUNCTION public.list_catalog_product_documents(p_product_id UUID)
RETURNS TABLE (
  id UUID,
  provider catalog.document_provider,
  title TEXT,
  doc_type catalog.document_type,
  sharepoint_item_id TEXT,
  file_url TEXT,
  file_name TEXT,
  is_primary BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  SELECT pd.id, pd.provider, pd.title, pd.doc_type, pd.sharepoint_item_id, pd.file_url, pd.file_name, pd.is_primary, pd.created_at
  FROM catalog.product_documents pd
  WHERE pd.product_id = p_product_id
  ORDER BY pd.is_primary DESC, pd.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_catalog_product_document(
  p_product_id UUID,
  p_title TEXT,
  p_provider catalog.document_provider DEFAULT 'sharepoint',
  p_doc_type catalog.document_type DEFAULT 'other',
  p_sharepoint_item_id TEXT DEFAULT NULL,
  p_sharepoint_drive_id TEXT DEFAULT NULL,
  p_sharepoint_site_id TEXT DEFAULT NULL,
  p_file_url TEXT DEFAULT NULL,
  p_file_name TEXT DEFAULT NULL,
  p_is_primary BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT internal.is_admin() THEN RAISE EXCEPTION 'Only admins can add documents'; END IF;
  IF p_is_primary THEN
    UPDATE catalog.product_documents SET is_primary = false WHERE product_id = p_product_id;
  END IF;
  INSERT INTO catalog.product_documents (product_id, provider, title, doc_type, sharepoint_item_id, sharepoint_drive_id, sharepoint_site_id, file_url, file_name, is_primary)
  VALUES (p_product_id, p_provider, p_title, p_doc_type, p_sharepoint_item_id, p_sharepoint_drive_id, p_sharepoint_site_id, p_file_url, p_file_name, p_is_primary)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_catalog_product_document(
  p_id UUID,
  p_title TEXT DEFAULT NULL,
  p_is_primary BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
DECLARE v_product_id UUID;
BEGIN
  IF NOT internal.is_admin() THEN RAISE EXCEPTION 'Only admins can update documents'; END IF;
  IF p_is_primary = true THEN
    SELECT product_id INTO v_product_id FROM catalog.product_documents WHERE id = p_id;
    UPDATE catalog.product_documents SET is_primary = false WHERE product_id = v_product_id;
  END IF;
  UPDATE catalog.product_documents
  SET title = COALESCE(p_title, title), is_primary = COALESCE(p_is_primary, is_primary)
  WHERE id = p_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_catalog_product_document(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
BEGIN
  IF NOT internal.is_admin() THEN RAISE EXCEPTION 'Only admins can delete documents'; END IF;
  DELETE FROM catalog.product_documents WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- ---------- Analítica y movimientos ----------
CREATE OR REPLACE FUNCTION public.get_catalog_product_analytics(
  p_product_id UUID,
  p_from DATE DEFAULT NULL,
  p_to DATE DEFAULT NULL
)
RETURNS TABLE (
  units_sold NUMERIC,
  units_purchased NUMERIC,
  movement_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, sales, internal, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN sm.movement_type IN ('OUT', 'RETURN_OUT') THEN sm.quantity ELSE 0 END), 0)::NUMERIC,
    COALESCE(SUM(CASE WHEN sm.movement_type IN ('IN', 'RETURN_IN') THEN sm.quantity ELSE 0 END), 0)::NUMERIC,
    COUNT(sm.id)::BIGINT
  FROM catalog.stock_movements sm
  WHERE sm.product_id = p_product_id
    AND (p_from IS NULL OR sm.created_at::date >= p_from)
    AND (p_to IS NULL OR sm.created_at::date <= p_to);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_stock_movements(
  p_product_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  movement_type catalog.stock_movement_type,
  quantity NUMERIC,
  reference_table TEXT,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  SELECT sm.id, sm.movement_type, sm.quantity, sm.reference_table, sm.reference_id, sm.notes, sm.created_at
  FROM catalog.stock_movements sm
  WHERE sm.product_id = p_product_id
    AND (p_from IS NULL OR sm.created_at >= p_from)
    AND (p_to IS NULL OR sm.created_at <= p_to)
  ORDER BY sm.created_at DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_product_id UUID,
  p_quantity_delta NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
DECLARE v_movement_id UUID;
BEGIN
  IF NOT (internal.is_admin() OR internal.is_manager()) THEN RAISE EXCEPTION 'Only admin or manager can adjust stock'; END IF;
  IF p_quantity_delta = 0 THEN RAISE EXCEPTION 'Quantity delta must not be zero'; END IF;
  INSERT INTO catalog.stock_movements (product_id, movement_type, quantity, notes, created_by)
  VALUES (p_product_id, 'ADJUST', p_quantity_delta, p_notes, internal.get_authorized_user_id(auth.uid()))
  RETURNING id INTO v_movement_id;
  RETURN v_movement_id;
END;
$$;

-- ---------- Bundles: componentes y añadir componente ----------
CREATE OR REPLACE FUNCTION public.list_catalog_bundle_components(p_bundle_product_id UUID)
RETURNS TABLE (
  component_product_id UUID,
  sku TEXT,
  name TEXT,
  quantity NUMERIC,
  unit catalog.unit_type
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  SELECT p.id, p.sku, p.name, pb.quantity, p.unit
  FROM catalog.product_bundles pb
  JOIN catalog.products p ON p.id = pb.component_product_id
  WHERE pb.bundle_product_id = p_bundle_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_catalog_bundle_component(
  p_bundle_product_id UUID,
  p_component_product_id UUID,
  p_quantity NUMERIC DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
BEGIN
  IF NOT internal.is_admin() THEN RAISE EXCEPTION 'Only admins can manage bundles'; END IF;
  INSERT INTO catalog.product_bundles (bundle_product_id, component_product_id, quantity)
  VALUES (p_bundle_product_id, p_component_product_id, p_quantity)
  ON CONFLICT (bundle_product_id, component_product_id) DO UPDATE SET quantity = EXCLUDED.quantity;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_catalog_bundle_component(
  p_bundle_product_id UUID,
  p_component_product_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = catalog, internal, public
AS $$
BEGIN
  IF NOT internal.is_admin() THEN RAISE EXCEPTION 'Only admins can manage bundles'; END IF;
  DELETE FROM catalog.product_bundles WHERE bundle_product_id = p_bundle_product_id AND component_product_id = p_component_product_id;
  RETURN FOUND;
END;
$$;

COMMIT;
