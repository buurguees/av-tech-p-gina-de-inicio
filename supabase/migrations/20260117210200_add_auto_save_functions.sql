-- Create auto-save function for quote lines
-- Migration: Add auto-save functionality for quote lines

-- Function to auto-save (upsert) a single quote line
-- This optimized function handles both new lines and updates to existing lines
CREATE OR REPLACE FUNCTION public.auto_save_quote_line(
  p_quote_id UUID,
  p_concept TEXT,
  p_line_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_quantity NUMERIC DEFAULT 1,
  p_unit_price NUMERIC DEFAULT 0,
  p_tax_rate NUMERIC DEFAULT 21,
  p_discount_percent NUMERIC DEFAULT 0,
  p_group_name TEXT DEFAULT NULL,
  p_line_order INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'quotes', 'public'
AS $$
DECLARE
  v_line_id UUID;
  v_subtotal NUMERIC;
  v_tax_amount NUMERIC;
  v_total NUMERIC;
  v_next_order INTEGER;
BEGIN
  -- Calculate line totals
  v_subtotal := p_quantity * p_unit_price * (1 - p_discount_percent / 100);
  v_tax_amount := v_subtotal * (p_tax_rate / 100);
  v_total := v_subtotal + v_tax_amount;
  
  -- If no line_id provided, this is a new line
  IF p_line_id IS NULL THEN
    -- Get next line_order if not provided
    IF p_line_order IS NULL THEN
      SELECT COALESCE(MAX(line_order), 0) + 1
      INTO v_next_order
      FROM quotes.quote_lines
      WHERE quote_id = p_quote_id;
    ELSE
      v_next_order := p_line_order;
    END IF;
    
    -- Insert new line
    INSERT INTO quotes.quote_lines (
      quote_id, concept, description, quantity, unit_price,
      tax_rate, discount_percent, subtotal, tax_amount, total,
      group_name, line_order
    )
    VALUES (
      p_quote_id, p_concept, p_description, p_quantity, p_unit_price,
      p_tax_rate, p_discount_percent, v_subtotal, v_tax_amount, v_total,
      p_group_name, v_next_order
    )
    RETURNING id INTO v_line_id;
  ELSE
    -- Update existing line
    UPDATE quotes.quote_lines SET
      concept = p_concept,
      description = p_description,
      quantity = p_quantity,
      unit_price = p_unit_price,
      tax_rate = p_tax_rate,
      discount_percent = p_discount_percent,
      subtotal = v_subtotal,
      tax_amount = v_tax_amount,
      total = v_total,
      group_name = p_group_name,
      line_order = COALESCE(p_line_order, line_order),
      updated_at = NOW()
    WHERE id = p_line_id
    RETURNING id INTO v_line_id;
  END IF;
  
  -- Update quote totals
  PERFORM public.recalculate_quote_totals(p_quote_id);
  
  -- Return success with line ID
  RETURN jsonb_build_object(
    'success', true,
    'line_id', v_line_id,
    'subtotal', v_subtotal,
    'tax_amount', v_tax_amount,
    'total', v_total
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.auto_save_quote_line TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.auto_save_quote_line IS 'Auto-saves a quote line (insert or update) and recalculates quote totals. Used for real-time line editing without explicit save button.';

-- Helper function to recalculate quote totals (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.recalculate_quote_totals(p_quote_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'quotes', 'public'
AS $$
DECLARE
  v_subtotal NUMERIC;
  v_tax_amount NUMERIC;
  v_total NUMERIC;
BEGIN
  -- Calculate totals from all non-deleted lines
  SELECT 
    COALESCE(SUM(subtotal), 0),
    COALESCE(SUM(tax_amount), 0),
    COALESCE(SUM(total), 0)
  INTO v_subtotal, v_tax_amount, v_total
  FROM quotes.quote_lines
  WHERE quote_id = p_quote_id;
  
  -- Update quote totals
  UPDATE quotes.quotes SET
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total = v_total,
    updated_at = NOW()
  WHERE id = p_quote_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_quote_totals TO authenticated;
