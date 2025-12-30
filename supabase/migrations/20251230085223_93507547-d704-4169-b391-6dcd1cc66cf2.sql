-- Arreglar función is_allowed_domain con search_path
CREATE OR REPLACE FUNCTION public.is_allowed_domain(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _email LIKE '%@avtechesdeveniments.com'
$$;