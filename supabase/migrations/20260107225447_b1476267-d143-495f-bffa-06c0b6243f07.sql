-- Drop and recreate list_product_categories function to fix 'type' column issue
DROP FUNCTION IF EXISTS public.list_product_categories();

CREATE OR REPLACE FUNCTION public.list_product_categories()
RETURNS TABLE (
  id uuid,
  name text,
  code text,
  description text,
  display_order integer,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  subcategory_count bigint,
  product_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.code,
    c.description,
    c.display_order,
    c.is_active,
    c.created_at,
    c.updated_at,
    (SELECT COUNT(*) FROM internal.product_subcategories s WHERE s.category_id = c.id) as subcategory_count,
    (SELECT COUNT(*) FROM internal.products p WHERE p.category_id = c.id) as product_count
  FROM internal.product_categories c
  ORDER BY c.display_order, c.name;
END;
$$;