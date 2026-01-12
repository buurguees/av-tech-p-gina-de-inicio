-- Function to update quote with automatic number change from DRAFT to SENT
-- When a quote changes from DRAFT (BORR-XX-XXXXXX) to SENT status,
-- it automatically generates a final quote number (P-XX-XXXXXX)

CREATE OR REPLACE FUNCTION public.update_quote(
  p_quote_id UUID,
  p_status TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_valid_until DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_current_number TEXT;
  v_new_number TEXT;
  v_client_id UUID;
BEGIN
  -- Get current quote status and number
  SELECT status, quote_number, client_id 
  INTO v_current_status, v_current_number, v_client_id
  FROM internal.quotes 
  WHERE id = p_quote_id;

  -- If changing from DRAFT to SENT, generate final quote number
  IF v_current_status = 'DRAFT' AND p_status = 'SENT' THEN
    -- Generate new quote number with P- prefix (P-YY-NNNNNN format)
    -- Example: P-26-000001 for first quote of 2026
    SELECT 'P-' || 
           TO_CHAR(CURRENT_DATE, 'YY') || '-' || 
           LPAD((
             COALESCE(
               (SELECT MAX(CAST(SUBSTRING(quote_number FROM '\d+$') AS INTEGER))
                FROM internal.quotes 
                WHERE quote_number ~ '^P-\d{2}-\d+$'
                  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
               ), 0
             ) + 1
           )::TEXT, 6, '0')
    INTO v_new_number;
    
    -- Update quote with new number and status
    UPDATE internal.quotes
    SET 
      quote_number = v_new_number,
      status = p_status,
      notes = COALESCE(p_notes, notes),
      valid_until = COALESCE(p_valid_until, valid_until),
      updated_at = NOW()
    WHERE id = p_quote_id;
    
  ELSE
    -- Normal update without changing number
    UPDATE internal.quotes
    SET 
      status = COALESCE(p_status, status),
      notes = COALESCE(p_notes, notes),
      valid_until = COALESCE(p_valid_until, valid_until),
      updated_at = NOW()
    WHERE id = p_quote_id;
  END IF;
  
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_quote TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.update_quote IS 'Updates quote status and automatically assigns final number when changing from DRAFT to SENT';
