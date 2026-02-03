-- Migration: Add quote lock validation to RPC functions
-- This migration adds checks to prevent editing quotes and their lines when the quote is in a locked state

-- Estados que bloquean la edición (deben coincidir con LOCKED_STATES en el frontend)
-- SENT, APPROVED, REJECTED, EXPIRED, INVOICED

-- Helper function to check if a quote is locked
CREATE OR REPLACE FUNCTION quotes.is_quote_locked(p_quote_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, public
AS $$
DECLARE
  v_status quotes.quote_status;
BEGIN
  SELECT status INTO v_status
  FROM quotes.quotes
  WHERE id = p_quote_id;
  
  -- Return true if quote is in a locked state
  RETURN v_status IN ('SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'INVOICED');
END;
$$;

-- Update add_quote_line to check if quote is locked
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
  
  -- Check if quote is locked
  IF quotes.is_quote_locked(p_quote_id) THEN
    RAISE EXCEPTION 'No se pueden agregar líneas a un presupuesto bloqueado';
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

-- Update update_quote_line to check if quote is locked
CREATE OR REPLACE FUNCTION public.update_quote_line(
  p_line_id UUID,
  p_concept TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_quantity NUMERIC DEFAULT NULL,
  p_unit_price NUMERIC DEFAULT NULL,
  p_tax_rate NUMERIC DEFAULT NULL,
  p_discount_percent NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, internal, public
AS $$
DECLARE
  v_quote_id UUID;
BEGIN
  -- Check user authorization
  IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  -- Get quote_id for the line
  SELECT quote_id INTO v_quote_id FROM quotes.quote_lines WHERE id = p_line_id;
  
  IF v_quote_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if quote is locked
  IF quotes.is_quote_locked(v_quote_id) THEN
    RAISE EXCEPTION 'No se pueden modificar líneas de un presupuesto bloqueado';
  END IF;
  
  -- Update the line
  UPDATE quotes.quote_lines
  SET
    concept = COALESCE(p_concept, concept),
    description = COALESCE(p_description, description),
    quantity = COALESCE(p_quantity, quantity),
    unit_price = COALESCE(p_unit_price, unit_price),
    tax_rate = COALESCE(p_tax_rate, tax_rate),
    discount_percent = COALESCE(p_discount_percent, discount_percent),
    updated_at = NOW()
  WHERE id = p_line_id;
  
  -- Update quote totals
  PERFORM quotes.update_quote_totals(v_quote_id);
  
  RETURN TRUE;
END;
$$;

-- Update delete_quote_line to check if quote is locked
CREATE OR REPLACE FUNCTION public.delete_quote_line(p_line_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, internal, public
AS $$
DECLARE
  v_quote_id UUID;
BEGIN
  -- Check user authorization
  IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  -- Get quote_id for the line
  SELECT quote_id INTO v_quote_id FROM quotes.quote_lines WHERE id = p_line_id;
  
  IF v_quote_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if quote is locked
  IF quotes.is_quote_locked(v_quote_id) THEN
    RAISE EXCEPTION 'No se pueden eliminar líneas de un presupuesto bloqueado';
  END IF;
  
  -- Delete the line
  DELETE FROM quotes.quote_lines WHERE id = p_line_id;
  
  -- Reorder line_order values
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY line_order) as new_order
    FROM quotes.quote_lines
    WHERE quote_id = v_quote_id
  )
  UPDATE quotes.quote_lines ql
  SET line_order = n.new_order
  FROM numbered n
  WHERE ql.id = n.id;
  
  -- Update quote totals
  PERFORM quotes.update_quote_totals(v_quote_id);
  
  RETURN TRUE;
END;
$$;

-- Update update_quote to prevent editing locked quotes (except status changes)
CREATE OR REPLACE FUNCTION public.update_quote(
  p_quote_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_valid_until DATE DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, public
AS $$
DECLARE
  v_current_status quotes.quote_status;
  v_is_locked BOOLEAN;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM quotes.quotes
  WHERE id = p_quote_id;
  
  -- Check if quote is currently locked
  v_is_locked := quotes.is_quote_locked(p_quote_id);
  
  -- If quote is locked, only allow status changes (for transitions like APPROVED <-> REJECTED)
  -- Block changes to other fields
  IF v_is_locked AND p_status IS NULL THEN
    RAISE EXCEPTION 'No se pueden modificar los datos de un presupuesto bloqueado. Solo se permite cambiar el estado.';
  END IF;
  
  -- If trying to change non-status fields on a locked quote, block it
  IF v_is_locked AND (p_client_id IS NOT NULL OR p_project_name IS NOT NULL OR 
                      p_valid_until IS NOT NULL OR p_notes IS NOT NULL OR p_project_id IS NOT NULL) THEN
    -- Only allow if status is also being changed (which might unlock it)
    IF p_status IS NULL OR p_status::quotes.quote_status = v_current_status THEN
      RAISE EXCEPTION 'No se pueden modificar los datos de un presupuesto bloqueado';
    END IF;
  END IF;
  
  UPDATE quotes.quotes SET
    client_id = COALESCE(p_client_id, client_id),
    project_name = COALESCE(p_project_name, project_name),
    valid_until = COALESCE(p_valid_until, valid_until),
    status = COALESCE(p_status::quotes.quote_status, status),
    notes = COALESCE(p_notes, notes),
    project_id = COALESCE(p_project_id, project_id),
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Recalculate totals
  PERFORM public.recalculate_quote_totals(p_quote_id);
END;
$$;

-- Update update_quote_lines_order to check if quote is locked
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
  v_order INTEGER := 1;
BEGIN
  -- Check user authorization
  IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  -- Check if quote is locked
  IF quotes.is_quote_locked(p_quote_id) THEN
    RAISE EXCEPTION 'No se puede reordenar las líneas de un presupuesto bloqueado';
  END IF;
  
  -- Update line_order for each line
  FOREACH v_line_id IN ARRAY p_line_ids
  LOOP
    UPDATE quotes.quote_lines
    SET line_order = v_order
    WHERE id = v_line_id AND quote_id = p_quote_id;
    
    v_order := v_order + 1;
  END LOOP;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION quotes.is_quote_locked TO authenticated;
