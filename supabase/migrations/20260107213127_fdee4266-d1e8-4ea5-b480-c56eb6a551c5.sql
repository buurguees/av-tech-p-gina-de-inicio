-- Create enum for product type (if not exists)
DO $$ BEGIN
  CREATE TYPE public.product_type AS ENUM ('product', 'service');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add type column to products table if not exists
DO $$ BEGIN
  ALTER TABLE internal.products ADD COLUMN type public.product_type NOT NULL DEFAULT 'product';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Add stock column for products if not exists
DO $$ BEGIN
  ALTER TABLE internal.products ADD COLUMN stock integer DEFAULT NULL;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Add comments
COMMENT ON COLUMN internal.products.type IS 'product = has fixed cost and can have stock; service = variable cost, no stock';
COMMENT ON COLUMN internal.products.stock IS 'Current stock quantity. Only applicable for type=product, should be NULL for services';

-- Drop existing functions that need signature changes
DROP FUNCTION IF EXISTS public.list_products(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.create_product(uuid, uuid, text, text, numeric, numeric, numeric);
DROP FUNCTION IF EXISTS public.create_product(uuid, uuid, text, text, numeric, numeric, numeric, public.product_type, integer);

-- Recreate list_products function
CREATE OR REPLACE FUNCTION public.list_products(
  p_category_id uuid DEFAULT NULL,
  p_subcategory_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  product_number text,
  category_id uuid,
  category_name text,
  category_code text,
  subcategory_id uuid,
  subcategory_name text,
  subcategory_code text,
  name text,
  description text,
  cost_price numeric,
  base_price numeric,
  price_with_tax numeric,
  tax_rate numeric,
  is_active boolean,
  type public.product_type,
  stock integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
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
    p.type,
    p.stock,
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
  ORDER BY c.display_order, c.code, s.display_order, s.code, p.product_number;
END;
$$;

-- Recreate create_product function
CREATE OR REPLACE FUNCTION public.create_product(
  p_category_id uuid,
  p_subcategory_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_cost_price numeric DEFAULT 0,
  p_base_price numeric DEFAULT 0,
  p_tax_rate numeric DEFAULT 21,
  p_type public.product_type DEFAULT 'product',
  p_stock integer DEFAULT NULL
)
RETURNS TABLE (product_id uuid, product_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
DECLARE
  v_product_id uuid;
  v_product_number text;
  v_category_code text;
  v_subcategory_code text;
  v_next_seq integer;
BEGIN
  SELECT code INTO v_category_code 
  FROM internal.product_categories WHERE id = p_category_id;
  
  IF v_category_code IS NULL THEN
    RAISE EXCEPTION 'Category not found';
  END IF;
  
  IF p_subcategory_id IS NOT NULL THEN
    SELECT code INTO v_subcategory_code 
    FROM internal.product_subcategories WHERE id = p_subcategory_id;
  END IF;
  
  SELECT COALESCE(MAX(
    CAST(REGEXP_REPLACE(product_number, '^[A-Z]+-', '') AS integer)
  ), 0) + 1 INTO v_next_seq
  FROM internal.products
  WHERE category_id = p_category_id;
  
  v_product_number := v_category_code || 
    COALESCE('-' || v_subcategory_code, '') || 
    '-' || LPAD(v_next_seq::text, 4, '0');
  
  INSERT INTO internal.products (
    category_id, subcategory_id, product_number, name, description,
    cost_price, base_price, tax_rate, type, stock
  ) VALUES (
    p_category_id, p_subcategory_id, v_product_number, 
    COALESCE(p_name, 'Nuevo Producto'), p_description,
    p_cost_price, p_base_price, p_tax_rate, p_type,
    CASE WHEN p_type = 'product' THEN COALESCE(p_stock, 0) ELSE NULL END
  )
  RETURNING id INTO v_product_id;
  
  RETURN QUERY SELECT v_product_id, v_product_number;
END;
$$;

-- Update update_product function
CREATE OR REPLACE FUNCTION public.update_product(
  p_product_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_cost_price numeric DEFAULT NULL,
  p_base_price numeric DEFAULT NULL,
  p_tax_rate numeric DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_type public.product_type DEFAULT NULL,
  p_stock integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
BEGIN
  UPDATE internal.products
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    cost_price = COALESCE(p_cost_price, cost_price),
    base_price = COALESCE(p_base_price, base_price),
    tax_rate = COALESCE(p_tax_rate, tax_rate),
    is_active = COALESCE(p_is_active, is_active),
    type = COALESCE(p_type, type),
    stock = CASE 
      WHEN COALESCE(p_type, type) = 'service' THEN NULL
      ELSE COALESCE(p_stock, stock)
    END,
    updated_at = now()
  WHERE id = p_product_id;
  
  RETURN FOUND;
END;
$$;