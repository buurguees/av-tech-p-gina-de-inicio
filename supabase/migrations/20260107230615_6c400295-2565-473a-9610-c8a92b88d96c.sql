
-- Arreglar función quotes.generate_quote_number para incluir search_path
CREATE OR REPLACE FUNCTION quotes.generate_quote_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = quotes, public
AS $function$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  v_year := TO_CHAR(now(), 'YY');
  v_seq := nextval('quotes.quote_number_seq');
  NEW.quote_number := 'P-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN NEW;
END;
$function$;
