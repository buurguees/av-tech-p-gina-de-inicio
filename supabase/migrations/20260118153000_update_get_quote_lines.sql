-- Update get_quote_lines to return group_name
-- This is required so the frontend can display groups properly

DROP FUNCTION IF EXISTS public.get_quote_lines(UUID);

CREATE OR REPLACE FUNCTION public.get_quote_lines(p_quote_id UUID)
RETURNS TABLE(
  id UUID,
  line_order INTEGER,
  concept TEXT,
  description TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  tax_rate NUMERIC,
  discount_percent NUMERIC,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC,
  group_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, internal, public
AS $$
BEGIN
  -- Check user authorization
  IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  RETURN QUERY
  SELECT 
    ql.id,
    ql.line_order,
    ql.concept,
    ql.description,
    ql.quantity,
    ql.unit_price,
    ql.tax_rate,
    ql.discount_percent,
    ql.subtotal,
    ql.tax_amount,
    ql.total,
    ql.group_name
  FROM quotes.quote_lines ql
  WHERE ql.quote_id = p_quote_id
  ORDER BY ql.line_order ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_quote_lines TO authenticated;
