
-- Fix: Allow all authenticated users to read company settings
-- Company settings (legal name, tax ID, address) are needed by ALL roles
-- to generate quotes, invoices, and other documents.
CREATE OR REPLACE FUNCTION public.get_company_settings()
 RETURNS TABLE(id uuid, legal_name text, tax_id text, commercial_name text, company_type text, vat_number text, fiscal_address text, fiscal_postal_code text, fiscal_city text, fiscal_province text, country text, billing_email text, billing_phone text, website text, logo_url text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'internal'
AS $function$
BEGIN
  -- All authenticated users can read company settings (needed for documents)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied: authentication required';
  END IF;

  RETURN QUERY
  SELECT 
    cs.id,
    cs.legal_name,
    cs.tax_id,
    cs.commercial_name,
    cs.company_type,
    cs.vat_number,
    cs.fiscal_address,
    cs.fiscal_postal_code,
    cs.fiscal_city,
    cs.fiscal_province,
    cs.country,
    cs.billing_email,
    cs.billing_phone,
    cs.website,
    cs.logo_url,
    cs.created_at,
    cs.updated_at
  FROM internal.company_settings cs
  LIMIT 1;
END;
$function$;
