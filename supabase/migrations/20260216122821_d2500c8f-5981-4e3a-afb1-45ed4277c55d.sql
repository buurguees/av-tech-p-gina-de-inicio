
-- Add p_site_id parameter to update_quote function
CREATE OR REPLACE FUNCTION public.update_quote(
  p_quote_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_valid_until DATE DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status TEXT;
  v_new_number TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status FROM quotes.quotes WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;

  -- If transitioning from DRAFT to APPROVED, assign definitive number
  IF v_old_status = 'DRAFT' AND p_status = 'APPROVED' THEN
    -- Generate definitive number
    SELECT public.get_next_quote_number() INTO v_new_number;
    
    UPDATE quotes.quotes SET
      client_id = COALESCE(p_client_id, client_id),
      project_name = COALESCE(p_project_name, project_name),
      valid_until = COALESCE(p_valid_until, valid_until),
      status = p_status,
      quote_number = v_new_number,
      project_id = COALESCE(p_project_id, project_id),
      notes = COALESCE(p_notes, notes),
      site_id = COALESCE(p_site_id, site_id),
      updated_at = now()
    WHERE id = p_quote_id;
  ELSE
    UPDATE quotes.quotes SET
      client_id = COALESCE(p_client_id, client_id),
      project_name = COALESCE(p_project_name, project_name),
      valid_until = COALESCE(p_valid_until, valid_until),
      status = COALESCE(p_status, status),
      project_id = COALESCE(p_project_id, project_id),
      notes = COALESCE(p_notes, notes),
      site_id = COALESCE(p_site_id, site_id),
      updated_at = now()
    WHERE id = p_quote_id;
  END IF;
END;
$$;
