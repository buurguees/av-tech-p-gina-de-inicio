
-- Table for product packs
CREATE TABLE internal.product_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  final_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 21,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for pack items (products in a pack)
CREATE TABLE internal.product_pack_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES internal.product_packs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES internal.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pack_id, product_id)
);

-- Function to generate next product number for a category/subcategory
CREATE OR REPLACE FUNCTION internal.generate_product_number(
  p_category_id UUID,
  p_subcategory_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_category_code TEXT;
  v_subcategory_code TEXT;
  v_next_number INTEGER;
  v_prefix TEXT;
BEGIN
  -- Get category code
  SELECT code INTO v_category_code
  FROM internal.product_categories
  WHERE id = p_category_id;
  
  IF v_category_code IS NULL THEN
    RAISE EXCEPTION 'Category not found';
  END IF;
  
  -- Get subcategory code if provided
  IF p_subcategory_id IS NOT NULL THEN
    SELECT code INTO v_subcategory_code
    FROM internal.product_subcategories
    WHERE id = p_subcategory_id AND category_id = p_category_id;
    
    IF v_subcategory_code IS NULL THEN
      RAISE EXCEPTION 'Subcategory not found or does not belong to category';
    END IF;
    
    v_prefix := v_category_code || '-' || v_subcategory_code || '-';
  ELSE
    v_prefix := v_category_code || '-00-';
  END IF;
  
  -- Get next number for this prefix
  SELECT COALESCE(MAX(
    CAST(NULLIF(REGEXP_REPLACE(product_number, '^' || v_prefix, ''), '') AS INTEGER)
  ), 0) + 1
  INTO v_next_number
  FROM internal.products
  WHERE product_number LIKE v_prefix || '%';
  
  RETURN v_prefix || LPAD(v_next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = internal, public;

-- RPC: List products with category/subcategory info
CREATE OR REPLACE FUNCTION public.list_products(
  p_category_id UUID DEFAULT NULL,
  p_subcategory_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  product_number TEXT,
  category_id UUID,
  category_name TEXT,
  category_code TEXT,
  subcategory_id UUID,
  subcategory_name TEXT,
  subcategory_code TEXT,
  name TEXT,
  description TEXT,
  cost_price NUMERIC,
  base_price NUMERIC,
  price_with_tax NUMERIC,
  tax_rate NUMERIC,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.product_number,
    p.category_id,
    c.name AS category_name,
    c.code AS category_code,
    p.subcategory_id,
    s.name AS subcategory_name,
    s.code AS subcategory_code,
    p.name,
    p.description,
    p.cost_price,
    p.base_price,
    ROUND(p.base_price * (1 + p.tax_rate / 100), 2) AS price_with_tax,
    p.tax_rate,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM internal.products p
  JOIN internal.product_categories c ON p.category_id = c.id
  LEFT JOIN internal.product_subcategories s ON p.subcategory_id = s.id
  WHERE 
    (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_subcategory_id IS NULL OR p.subcategory_id = p_subcategory_id)
    AND (p_search IS NULL OR p_search = '' OR 
         p.name ILIKE '%' || p_search || '%' OR 
         p.product_number ILIKE '%' || p_search || '%' OR
         p.description ILIKE '%' || p_search || '%')
  ORDER BY p.product_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = internal, public;

-- RPC: Create product with auto-generated number
CREATE OR REPLACE FUNCTION public.create_product(
  p_category_id UUID,
  p_subcategory_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT 'Nuevo producto',
  p_description TEXT DEFAULT NULL,
  p_cost_price NUMERIC DEFAULT 0,
  p_base_price NUMERIC DEFAULT 0,
  p_tax_rate NUMERIC DEFAULT 21
)
RETURNS TABLE (
  product_id UUID,
  product_number TEXT
) AS $$
DECLARE
  v_product_number TEXT;
  v_product_id UUID;
BEGIN
  -- Generate product number
  v_product_number := internal.generate_product_number(p_category_id, p_subcategory_id);
  
  -- Insert product
  INSERT INTO internal.products (
    product_number, category_id, subcategory_id, name, description,
    cost_price, base_price, tax_rate
  ) VALUES (
    v_product_number, p_category_id, p_subcategory_id, UPPER(p_name), p_description,
    p_cost_price, p_base_price, p_tax_rate
  )
  RETURNING id INTO v_product_id;
  
  RETURN QUERY SELECT v_product_id, v_product_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = internal, public;

-- RPC: Update product
CREATE OR REPLACE FUNCTION public.update_product(
  p_product_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_cost_price NUMERIC DEFAULT NULL,
  p_base_price NUMERIC DEFAULT NULL,
  p_tax_rate NUMERIC DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE internal.products
  SET
    name = COALESCE(UPPER(p_name), name),
    description = COALESCE(p_description, description),
    cost_price = COALESCE(p_cost_price, cost_price),
    base_price = COALESCE(p_base_price, base_price),
    tax_rate = COALESCE(p_tax_rate, tax_rate),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_product_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = internal, public;

-- RPC: Delete product
CREATE OR REPLACE FUNCTION public.delete_product(p_product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM internal.products WHERE id = p_product_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = internal, public;

-- RPC: List packs
CREATE OR REPLACE FUNCTION public.list_product_packs(p_search TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  pack_number TEXT,
  name TEXT,
  description TEXT,
  base_price NUMERIC,
  discount_percent NUMERIC,
  final_price NUMERIC,
  price_with_tax NUMERIC,
  tax_rate NUMERIC,
  product_count BIGINT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id,
    pp.pack_number,
    pp.name,
    pp.description,
    pp.base_price,
    pp.discount_percent,
    pp.final_price,
    ROUND(pp.final_price * (1 + pp.tax_rate / 100), 2) AS price_with_tax,
    pp.tax_rate,
    COUNT(ppi.id) AS product_count,
    pp.is_active,
    pp.created_at,
    pp.updated_at
  FROM internal.product_packs pp
  LEFT JOIN internal.product_pack_items ppi ON pp.id = ppi.pack_id
  WHERE p_search IS NULL OR p_search = '' OR 
        pp.name ILIKE '%' || p_search || '%' OR 
        pp.pack_number ILIKE '%' || p_search || '%'
  GROUP BY pp.id
  ORDER BY pp.pack_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = internal, public;

-- RPC: Create pack with auto-generated number
CREATE OR REPLACE FUNCTION public.create_product_pack(
  p_name TEXT DEFAULT 'Nuevo pack',
  p_description TEXT DEFAULT NULL,
  p_discount_percent NUMERIC DEFAULT 0,
  p_tax_rate NUMERIC DEFAULT 21
)
RETURNS TABLE (
  pack_id UUID,
  pack_number TEXT
) AS $$
DECLARE
  v_pack_number TEXT;
  v_pack_id UUID;
  v_next_number INTEGER;
BEGIN
  -- Generate pack number
  SELECT COALESCE(MAX(
    CAST(NULLIF(REGEXP_REPLACE(product_packs.pack_number, '^PACK-', ''), '') AS INTEGER)
  ), 0) + 1
  INTO v_next_number
  FROM internal.product_packs;
  
  v_pack_number := 'PACK-' || LPAD(v_next_number::TEXT, 4, '0');
  
  -- Insert pack
  INSERT INTO internal.product_packs (pack_number, name, description, discount_percent, tax_rate)
  VALUES (v_pack_number, UPPER(p_name), p_description, p_discount_percent, p_tax_rate)
  RETURNING id INTO v_pack_id;
  
  RETURN QUERY SELECT v_pack_id, v_pack_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = internal, public;

-- RPC: Update pack
CREATE OR REPLACE FUNCTION public.update_product_pack(
  p_pack_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_discount_percent NUMERIC DEFAULT NULL,
  p_tax_rate NUMERIC DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_base_price NUMERIC;
  v_final_price NUMERIC;
  v_discount NUMERIC;
BEGIN
  -- Calculate base price from products
  SELECT COALESCE(SUM(p.base_price * ppi.quantity), 0)
  INTO v_base_price
  FROM internal.product_pack_items ppi
  JOIN internal.products p ON ppi.product_id = p.id
  WHERE ppi.pack_id = p_pack_id;
  
  -- Get discount to use
  SELECT COALESCE(p_discount_percent, pp.discount_percent)
  INTO v_discount
  FROM internal.product_packs pp
  WHERE pp.id = p_pack_id;
  
  v_final_price := ROUND(v_base_price * (1 - v_discount / 100), 2);
  
  UPDATE internal.product_packs
  SET
    name = COALESCE(UPPER(p_name), name),
    description = COALESCE(p_description, description),
    discount_percent = COALESCE(p_discount_percent, discount_percent),
    tax_rate = COALESCE(p_tax_rate, tax_rate),
    is_active = COALESCE(p_is_active, is_active),
    base_price = v_base_price,
    final_price = v_final_price,
    updated_at = now()
  WHERE id = p_pack_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = internal, public;

-- RPC: Delete pack
CREATE OR REPLACE FUNCTION public.delete_product_pack(p_pack_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM internal.product_packs WHERE id = p_pack_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = internal, public;

-- RPC: Get pack items
CREATE OR REPLACE FUNCTION public.get_pack_items(p_pack_id UUID)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  product_number TEXT,
  product_name TEXT,
  quantity INTEGER,
  unit_price NUMERIC,
  subtotal NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ppi.id,
    ppi.product_id,
    p.product_number,
    p.name AS product_name,
    ppi.quantity,
    p.base_price AS unit_price,
    p.base_price * ppi.quantity AS subtotal
  FROM internal.product_pack_items ppi
  JOIN internal.products p ON ppi.product_id = p.id
  WHERE ppi.pack_id = p_pack_id
  ORDER BY p.product_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = internal, public;

-- RPC: Add product to pack
CREATE OR REPLACE FUNCTION public.add_pack_item(
  p_pack_id UUID,
  p_product_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
  v_item_id UUID;
BEGIN
  INSERT INTO internal.product_pack_items (pack_id, product_id, quantity)
  VALUES (p_pack_id, p_product_id, p_quantity)
  ON CONFLICT (pack_id, product_id) DO UPDATE SET quantity = product_pack_items.quantity + p_quantity
  RETURNING id INTO v_item_id;
  
  -- Recalculate pack prices
  PERFORM public.update_product_pack(p_pack_id);
  
  RETURN v_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = internal, public;

-- RPC: Update pack item quantity
CREATE OR REPLACE FUNCTION public.update_pack_item(
  p_item_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_pack_id UUID;
BEGIN
  SELECT pack_id INTO v_pack_id FROM internal.product_pack_items WHERE id = p_item_id;
  
  UPDATE internal.product_pack_items
  SET quantity = p_quantity
  WHERE id = p_item_id;
  
  -- Recalculate pack prices
  IF v_pack_id IS NOT NULL THEN
    PERFORM public.update_product_pack(v_pack_id);
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = internal, public;

-- RPC: Remove product from pack
CREATE OR REPLACE FUNCTION public.remove_pack_item(p_item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_pack_id UUID;
BEGIN
  SELECT pack_id INTO v_pack_id FROM internal.product_pack_items WHERE id = p_item_id;
  
  DELETE FROM internal.product_pack_items WHERE id = p_item_id;
  
  -- Recalculate pack prices
  IF v_pack_id IS NOT NULL THEN
    PERFORM public.update_product_pack(v_pack_id);
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = internal, public;

-- Trigger to update timestamps
CREATE TRIGGER update_product_packs_updated_at
  BEFORE UPDATE ON internal.product_packs
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();
