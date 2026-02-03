-- Update add_quote_line to support group_name and explicit line_order
CREATE OR REPLACE FUNCTION public.add_quote_line(
  p_quote_id UUID,
  p_concept TEXT,
  p_description TEXT DEFAULT NULL,
  p_quantity NUMERIC DEFAULT 1,
  p_unit_price NUMERIC DEFAULT 0,
  p_tax_rate NUMERIC DEFAULT 21,
  p_discount_percent NUMERIC DEFAULT 0,
  p_group_name TEXT DEFAULT NULL,
  p_line_order INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, internal, public
AS $$
DECLARE
  v_line_id UUID;
  v_line_order INTEGER;
  v_subtotal NUMERIC;
  v_tax_amount NUMERIC;
  v_total NUMERIC;
BEGIN
  -- Check user authorization
  IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  -- Get next line_order if not provided
  IF p_line_order IS NULL THEN
    SELECT COALESCE(MAX(line_order), 0) + 1 INTO v_line_order
    FROM quotes.quote_lines
    WHERE quote_id = p_quote_id;
  ELSE
    v_line_order := p_line_order;
  END IF;

  -- Calculate totals
  v_subtotal := p_quantity * p_unit_price * (1 - p_discount_percent / 100);
  v_tax_amount := v_subtotal * (p_tax_rate / 100);
  v_total := v_subtotal + v_tax_amount;
  
  -- Insert the line
  INSERT INTO quotes.quote_lines (
    quote_id,
    line_order,
    concept,
    description,
    quantity,
    unit_price,
    tax_rate,
    discount_percent,
    subtotal,
    tax_amount,
    total,
    group_name
  )
  VALUES (
    p_quote_id,
    v_line_order,
    p_concept,
    p_description,
    p_quantity,
    p_unit_price,
    p_tax_rate,
    p_discount_percent,
    v_subtotal,
    v_tax_amount,
    v_total,
    p_group_name
  )
  RETURNING id INTO v_line_id;
  
  -- Update quote totals
  PERFORM quotes.update_quote_totals(p_quote_id);
  
  RETURN v_line_id;
END;
$$;
