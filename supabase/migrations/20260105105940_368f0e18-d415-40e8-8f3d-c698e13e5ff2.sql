
-- Corregir search_path en función que falta
CREATE OR REPLACE FUNCTION internal.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = internal
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
