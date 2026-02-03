-- Create new migration to update update_quote function
-- Migration: Add p_project_id to update_quote

-- Drop the old signature to avoid ambiguity (although overloads are allowed, it's safer to be precise)
DROP FUNCTION IF EXISTS public.update_quote(UUID, UUID, TEXT, DATE, TEXT, TEXT);

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
BEGIN
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

GRANT EXECUTE ON FUNCTION public.update_quote TO authenticated;
