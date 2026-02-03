-- Add preliminary_number to quotes
ALTER TABLE quotes.quotes ADD COLUMN IF NOT EXISTS preliminary_number TEXT;

-- Function to get next draft quote number (BORR-P-YY-XXXXXX)
CREATE OR REPLACE FUNCTION quotes.get_next_draft_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, public
AS $$
DECLARE
  v_year TEXT;
  v_max_seq INTEGER;
  v_new_number TEXT;
BEGIN
  -- Get current year (2 digits)
  v_year := TO_CHAR(NOW(), 'YY');
  
  -- Lock the quotes table
  LOCK TABLE quotes.quotes IN SHARE ROW EXCLUSIVE MODE;
  
  -- Get the max sequence number for draft quotes for the current year
  SELECT COALESCE(MAX(
    CASE 
      WHEN quote_number ~ ('^BORR-P-' || v_year || '-[0-9]{6}$')
      THEN CAST(SUBSTRING(quote_number FROM 11 FOR 6) AS INTEGER)
      ELSE 0
    END
  ), 0)
  INTO v_max_seq
  FROM quotes.quotes
  WHERE quote_number LIKE 'BORR-P-' || v_year || '-%';
  
  -- Generate the new draft quote number
  v_new_number := 'BORR-P-' || v_year || '-' || LPAD((v_max_seq + 1)::TEXT, 6, '0');
  
  RETURN v_new_number;
END;
$$;

-- Update create_quote_with_number to use draft generator
CREATE OR REPLACE FUNCTION public.create_quote_with_number(
  p_client_id UUID,
  p_project_name TEXT DEFAULT NULL,
  p_valid_until DATE DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE(quote_id UUID, quote_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, quotes, internal
AS $$
DECLARE
  v_quote_id UUID;
  v_quote_number TEXT;
  v_user_id UUID;
BEGIN
  -- Get the authorized user ID
  v_user_id := internal.get_authorized_user_id(auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  -- Generate unique DRAFT quote number
  v_quote_number := quotes.get_next_draft_number();
  
  -- Insert the new quote
  INSERT INTO quotes.quotes (
    quote_number,
    client_id,
    project_id,
    project_name,
    valid_until,
    created_by,
    status
  )
  VALUES (
    v_quote_number,
    p_client_id,
    p_project_id,
    p_project_name,
    COALESCE(p_valid_until, CURRENT_DATE + INTERVAL '30 days'),
    v_user_id,
    'DRAFT'
  )
  RETURNING id INTO v_quote_id;
  
  RETURN QUERY SELECT v_quote_id, v_quote_number;
END;
$$;

-- Update update_quote to handle numbering transition
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
SET search_path = quotes, public, internal
AS $$
DECLARE
  v_current_status TEXT;
  v_current_number TEXT;
  v_new_number TEXT;
BEGIN
  -- Get current status and number
  SELECT status::TEXT, quote_number 
  INTO v_current_status, v_current_number
  FROM quotes.quotes
  WHERE id = p_quote_id;

  -- Logic for numbering transition
  IF v_current_status = 'DRAFT' AND p_status = 'SENT' AND v_current_number LIKE 'BORR-%' THEN
    -- Generate definitive number
    v_new_number := quotes.get_next_quote_number();
    
    UPDATE quotes.quotes SET
      preliminary_number = v_current_number,
      quote_number = v_new_number,
      status = 'SENT'::quotes.quote_status,
      client_id = COALESCE(p_client_id, client_id),
      project_name = COALESCE(p_project_name, project_name),
      valid_until = COALESCE(p_valid_until, valid_until),
      notes = COALESCE(p_notes, notes),
      project_id = COALESCE(p_project_id, project_id),
      updated_at = NOW()
    WHERE id = p_quote_id;
  ELSE
    -- Standard update
    UPDATE quotes.quotes SET
      client_id = COALESCE(p_client_id, client_id),
      project_name = COALESCE(p_project_name, project_name),
      valid_until = COALESCE(p_valid_until, valid_until),
      status = COALESCE(p_status::quotes.quote_status, status),
      notes = COALESCE(p_notes, notes),
      project_id = COALESCE(p_project_id, project_id),
      updated_at = NOW()
    WHERE id = p_quote_id;
  END IF;
  
  -- Recalculate totals
  PERFORM public.recalculate_quote_totals(p_quote_id);
END;
$$;
