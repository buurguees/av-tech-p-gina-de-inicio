
-- Drop the OLD overload of create_quote_with_number (the one WITHOUT p_site_id)
DROP FUNCTION IF EXISTS public.create_quote_with_number(
  p_client_id uuid,
  p_project_id uuid,
  p_project_name text,
  p_valid_until date
);
