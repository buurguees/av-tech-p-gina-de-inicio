-- Drop existing functions first to change return types
DROP FUNCTION IF EXISTS public.list_product_categories();

-- Recreate list_product_categories with type column
CREATE OR REPLACE FUNCTION public.list_product_categories()
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  description TEXT,
  display_order INTEGER,
  is_active BOOLEAN,
  type TEXT,
  subcategory_count BIGINT,
  product_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    c.type,
    COALESCE((SELECT COUNT(*) FROM internal.product_subcategories s WHERE s.category_id = c.id), 0) as subcategory_count,
    COALESCE((SELECT COUNT(*) FROM internal.products p WHERE p.category_id = c.id), 0) as product_count,
    c.created_at,
    c.updated_at
  FROM internal.product_categories c
  ORDER BY c.display_order, c.name;
END;
$$;

-- Update create_product_category to include type
CREATE OR REPLACE FUNCTION public.create_product_category(
  p_name TEXT,
  p_code TEXT,
  p_description TEXT DEFAULT NULL,
  p_display_order INTEGER DEFAULT 0,
  p_type TEXT DEFAULT 'product'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create categories';
  END IF;

  IF EXISTS (SELECT 1 FROM internal.product_categories WHERE code = p_code) THEN
    RAISE EXCEPTION 'Category code already exists';
  END IF;

  INSERT INTO internal.product_categories (name, code, description, display_order, type)
  VALUES (UPPER(p_name), UPPER(p_code), p_description, p_display_order, p_type)
  RETURNING id INTO v_category_id;

  RETURN v_category_id;
END;
$$;

-- Update update_product_category to include type
CREATE OR REPLACE FUNCTION public.update_product_category(
  p_category_id UUID,
  p_name TEXT DEFAULT NULL,
  p_code TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_display_order INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_type TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can update categories';
  END IF;

  UPDATE internal.product_categories
  SET
    name = COALESCE(UPPER(p_name), name),
    code = COALESCE(UPPER(p_code), code),
    description = COALESCE(p_description, description),
    display_order = COALESCE(p_display_order, display_order),
    is_active = COALESCE(p_is_active, is_active),
    type = COALESCE(p_type, type),
    updated_at = now()
  WHERE id = p_category_id;

  RETURN FOUND;
END;
$$;

-- Create function to list taxes
CREATE OR REPLACE FUNCTION public.list_taxes(
  p_tax_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  rate DECIMAL(5,2),
  tax_type TEXT,
  description TEXT,
  is_default BOOLEAN,
  is_active BOOLEAN,
  display_order INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.code,
    t.rate,
    t.tax_type,
    t.description,
    t.is_default,
    t.is_active,
    t.display_order,
    t.created_at,
    t.updated_at
  FROM internal.taxes t
  WHERE (p_tax_type IS NULL OR t.tax_type = p_tax_type)
  ORDER BY t.tax_type, t.display_order, t.name;
END;
$$;

-- Create function to create tax
CREATE OR REPLACE FUNCTION public.create_tax(
  p_name TEXT,
  p_code TEXT,
  p_rate DECIMAL(5,2),
  p_tax_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tax_id UUID;
  v_display_order INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create taxes';
  END IF;

  IF p_tax_type NOT IN ('sales', 'purchase') THEN
    RAISE EXCEPTION 'Invalid tax type. Must be sales or purchase';
  END IF;

  IF EXISTS (SELECT 1 FROM internal.taxes WHERE code = p_code) THEN
    RAISE EXCEPTION 'Tax code already exists';
  END IF;

  SELECT COALESCE(MAX(display_order), -1) + 1 INTO v_display_order
  FROM internal.taxes WHERE tax_type = p_tax_type;

  IF p_is_default THEN
    UPDATE internal.taxes SET is_default = false WHERE tax_type = p_tax_type;
  END IF;

  INSERT INTO internal.taxes (name, code, rate, tax_type, description, is_default, display_order)
  VALUES (p_name, UPPER(p_code), p_rate, p_tax_type, p_description, p_is_default, v_display_order)
  RETURNING id INTO v_tax_id;

  RETURN v_tax_id;
END;
$$;

-- Create function to update tax
CREATE OR REPLACE FUNCTION public.update_tax(
  p_tax_id UUID,
  p_name TEXT DEFAULT NULL,
  p_code TEXT DEFAULT NULL,
  p_rate DECIMAL(5,2) DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_display_order INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tax_type TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can update taxes';
  END IF;

  SELECT tax_type INTO v_tax_type FROM internal.taxes WHERE id = p_tax_id;

  IF p_is_default = true THEN
    UPDATE internal.taxes SET is_default = false WHERE tax_type = v_tax_type AND id != p_tax_id;
  END IF;

  UPDATE internal.taxes
  SET
    name = COALESCE(p_name, name),
    code = COALESCE(UPPER(p_code), code),
    rate = COALESCE(p_rate, rate),
    description = COALESCE(p_description, description),
    is_default = COALESCE(p_is_default, is_default),
    is_active = COALESCE(p_is_active, is_active),
    display_order = COALESCE(p_display_order, display_order),
    updated_at = now()
  WHERE id = p_tax_id;

  RETURN FOUND;
END;
$$;

-- Create function to delete tax
CREATE OR REPLACE FUNCTION public.delete_tax(
  p_tax_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete taxes';
  END IF;

  DELETE FROM internal.taxes WHERE id = p_tax_id;

  RETURN FOUND;
END;
$$;