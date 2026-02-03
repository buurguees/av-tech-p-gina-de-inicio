-- Update update_quote function to support notes parameter
-- Migration: Add notes parameter to update_quote function

-- Find and update the existing update_quote function to include notes
-- This assumes the function exists from previous migrations

DROP FUNCTION IF EXISTS public.update_quote(UUID, UUID, TEXT, DATE, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.update_quote(
  p_quote_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_valid_until DATE DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'quotes', 'public'
AS $$
BEGIN
  UPDATE quotes.quotes SET
    client_id = COALESCE(p_client_id, client_id),
    project_name = COALESCE(p_project_name, project_name),
    valid_until = COALESCE(p_valid_until, valid_until),
    status = COALESCE(p_status::quotes.quote_status, status),
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Recalculate totals in case anything changed
  PERFORM public.recalculate_quote_totals(p_quote_id);
END;
$$;

-- Add separate function specifically for updating notes with auto-save
CREATE OR REPLACE FUNCTION public.auto_save_quote_notes(
  p_quote_id UUID,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'quotes', 'public'
AS $$
BEGIN
  UPDATE quotes.quotes SET
    notes = p_notes,
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'quote_id', p_quote_id,
    'notes', p_notes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_save_quote_notes TO authenticated;

COMMENT ON FUNCTION public.auto_save_quote_notes IS 'Auto-saves quote notes field for real-time editing without explicit save button.';
