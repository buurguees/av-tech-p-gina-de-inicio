-- =============================================
-- PRODUCT CATEGORIES AND SUBCATEGORIES
-- =============================================

-- Product Categories table
CREATE TABLE internal.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Product Subcategories table
CREATE TABLE internal.product_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES internal.product_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, code)
);

-- Products table
CREATE TABLE internal.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_number TEXT NOT NULL UNIQUE,
  category_id UUID NOT NULL REFERENCES internal.product_categories(id),
  subcategory_id UUID REFERENCES internal.product_subcategories(id),
  name TEXT NOT NULL,
  description TEXT,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sequence for product numbering per category
CREATE TABLE internal.product_sequences (
  category_code TEXT NOT NULL PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- Create indexes
CREATE INDEX idx_product_subcategories_category ON internal.product_subcategories(category_id);
CREATE INDEX idx_products_category ON internal.products(category_id);
CREATE INDEX idx_products_subcategory ON internal.products(subcategory_id);
CREATE INDEX idx_products_number ON internal.products(product_number);

-- Trigger to update timestamps
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON internal.product_categories
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

CREATE TRIGGER update_product_subcategories_updated_at
  BEFORE UPDATE ON internal.product_subcategories
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON internal.products
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

-- =============================================
-- RPC FUNCTIONS FOR CATEGORIES
-- =============================================

-- List all categories
CREATE OR REPLACE FUNCTION public.list_product_categories()
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  description TEXT,
  display_order INTEGER,
  is_active BOOLEAN,
  subcategory_count BIGINT,
  product_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.code,
    c.description,
    c.display_order,
    c.is_active,
    COALESCE((SELECT COUNT(*) FROM internal.product_subcategories s WHERE s.category_id = c.id), 0) as subcategory_count,
    COALESCE((SELECT COUNT(*) FROM internal.products p WHERE p.category_id = c.id), 0) as product_count,
    c.created_at,
    c.updated_at
  FROM internal.product_categories c
  ORDER BY c.display_order, c.name;
END;
$$;

-- Create category
CREATE OR REPLACE FUNCTION public.create_product_category(
  p_name TEXT,
  p_code TEXT,
  p_description TEXT DEFAULT NULL,
  p_display_order INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
DECLARE
  v_category_id UUID;
BEGIN
  -- Verify user is admin
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create categories';
  END IF;

  INSERT INTO internal.product_categories (name, code, description, display_order)
  VALUES (UPPER(p_name), UPPER(p_code), p_description, p_display_order)
  RETURNING id INTO v_category_id;

  -- Initialize sequence for this category
  INSERT INTO internal.product_sequences (category_code, last_number)
  VALUES (UPPER(p_code), 0)
  ON CONFLICT (category_code) DO NOTHING;

  RETURN v_category_id;
END;
$$;

-- Update category
CREATE OR REPLACE FUNCTION public.update_product_category(
  p_category_id UUID,
  p_name TEXT DEFAULT NULL,
  p_code TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_display_order INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
BEGIN
  -- Verify user is admin
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can update categories';
  END IF;

  UPDATE internal.product_categories
  SET 
    name = COALESCE(UPPER(p_name), name),
    code = COALESCE(UPPER(p_code), code),
    description = COALESCE(p_description, description),
    display_order = COALESCE(p_display_order, display_order),
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_category_id;

  RETURN FOUND;
END;
$$;

-- Delete category
CREATE OR REPLACE FUNCTION public.delete_product_category(p_category_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
DECLARE
  v_product_count INTEGER;
BEGIN
  -- Verify user is admin
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete categories';
  END IF;

  -- Check if category has products
  SELECT COUNT(*) INTO v_product_count FROM internal.products WHERE category_id = p_category_id;
  IF v_product_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete category with products. Remove products first.';
  END IF;

  DELETE FROM internal.product_categories WHERE id = p_category_id;
  RETURN FOUND;
END;
$$;

-- =============================================
-- RPC FUNCTIONS FOR SUBCATEGORIES
-- =============================================

-- List subcategories for a category
CREATE OR REPLACE FUNCTION public.list_product_subcategories(p_category_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  category_id UUID,
  category_name TEXT,
  category_code TEXT,
  name TEXT,
  code TEXT,
  description TEXT,
  display_order INTEGER,
  is_active BOOLEAN,
  product_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.category_id,
    c.name as category_name,
    c.code as category_code,
    s.name,
    s.code,
    s.description,
    s.display_order,
    s.is_active,
    COALESCE((SELECT COUNT(*) FROM internal.products p WHERE p.subcategory_id = s.id), 0) as product_count,
    s.created_at,
    s.updated_at
  FROM internal.product_subcategories s
  JOIN internal.product_categories c ON c.id = s.category_id
  WHERE (p_category_id IS NULL OR s.category_id = p_category_id)
  ORDER BY c.display_order, c.name, s.display_order, s.name;
END;
$$;

-- Create subcategory
CREATE OR REPLACE FUNCTION public.create_product_subcategory(
  p_category_id UUID,
  p_name TEXT,
  p_code TEXT,
  p_description TEXT DEFAULT NULL,
  p_display_order INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
DECLARE
  v_subcategory_id UUID;
BEGIN
  -- Verify user is admin
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create subcategories';
  END IF;

  INSERT INTO internal.product_subcategories (category_id, name, code, description, display_order)
  VALUES (p_category_id, UPPER(p_name), UPPER(p_code), p_description, p_display_order)
  RETURNING id INTO v_subcategory_id;

  RETURN v_subcategory_id;
END;
$$;

-- Update subcategory
CREATE OR REPLACE FUNCTION public.update_product_subcategory(
  p_subcategory_id UUID,
  p_name TEXT DEFAULT NULL,
  p_code TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_display_order INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
BEGIN
  -- Verify user is admin
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can update subcategories';
  END IF;

  UPDATE internal.product_subcategories
  SET 
    name = COALESCE(UPPER(p_name), name),
    code = COALESCE(UPPER(p_code), code),
    description = COALESCE(p_description, description),
    display_order = COALESCE(p_display_order, display_order),
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_subcategory_id;

  RETURN FOUND;
END;
$$;

-- Delete subcategory
CREATE OR REPLACE FUNCTION public.delete_product_subcategory(p_subcategory_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
DECLARE
  v_product_count INTEGER;
BEGIN
  -- Verify user is admin
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete subcategories';
  END IF;

  -- Check if subcategory has products
  SELECT COUNT(*) INTO v_product_count FROM internal.products WHERE subcategory_id = p_subcategory_id;
  IF v_product_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete subcategory with products. Remove products first.';
  END IF;

  DELETE FROM internal.product_subcategories WHERE id = p_subcategory_id;
  RETURN FOUND;
END;
$$;