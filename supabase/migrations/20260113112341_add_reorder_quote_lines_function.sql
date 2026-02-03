-- Function to reorder quote lines
-- This allows moving lines up or down by swapping their line_order values
CREATE OR REPLACE FUNCTION public.reorder_quote_line(
  p_line_id UUID,
  p_direction TEXT -- 'up' or 'down'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, internal, public
AS $$
DECLARE
  v_quote_id UUID;
  v_current_order INTEGER;
  v_other_line_id UUID;
  v_other_order INTEGER;
BEGIN
  -- Check user authorization
  IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  -- Get quote_id and current line_order for the line
  SELECT quote_id, line_order INTO v_quote_id, v_current_order
  FROM quotes.quote_lines
  WHERE id = p_line_id;
  
  IF v_quote_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Find the adjacent line based on direction
  IF p_direction = 'up' THEN
    -- Move up: find line with next lower order
    SELECT id, line_order INTO v_other_line_id, v_other_order
    FROM quotes.quote_lines
    WHERE quote_id = v_quote_id
      AND line_order < v_current_order
    ORDER BY line_order DESC
    LIMIT 1;
  ELSIF p_direction = 'down' THEN
    -- Move down: find line with next higher order
    SELECT id, line_order INTO v_other_line_id, v_other_order
    FROM quotes.quote_lines
    WHERE quote_id = v_quote_id
      AND line_order > v_current_order
    ORDER BY line_order ASC
    LIMIT 1;
  ELSE
    RAISE EXCEPTION 'Invalid direction. Use ''up'' or ''down''';
  END IF;
  
  -- If no adjacent line found, nothing to do
  IF v_other_line_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Swap the line_order values
  UPDATE quotes.quote_lines
  SET line_order = v_other_order,
      updated_at = NOW()
  WHERE id = p_line_id;
  
  UPDATE quotes.quote_lines
  SET line_order = v_current_order,
      updated_at = NOW()
  WHERE id = v_other_line_id;
  
  RETURN TRUE;
END;
$$;

-- Function to update line_order for all lines in a quote
-- Takes an array of line IDs in the desired order
CREATE OR REPLACE FUNCTION public.update_quote_lines_order(
  p_quote_id UUID,
  p_line_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, internal, public
AS $$
DECLARE
  v_line_id UUID;
  v_order INTEGER;
BEGIN
  -- Check user authorization
  IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  -- Update line_order for each line based on its position in the array
  FOR v_order IN 1..array_length(p_line_ids, 1) LOOP
    v_line_id := p_line_ids[v_order];
    
    UPDATE quotes.quote_lines
    SET line_order = v_order,
        updated_at = NOW()
    WHERE id = v_line_id
      AND quote_id = p_quote_id;
  END LOOP;
  
  RETURN TRUE;
END;
$$;
