-- 1. Add RECURRING to lead_stage enum
ALTER TYPE crm.lead_stage ADD VALUE IF NOT EXISTS 'RECURRING';

-- 2. Drop existing update_client function to avoid ambiguity with overloads
DROP FUNCTION IF EXISTS public.update_client(
  uuid, text, text, text, text, text, text, text, text, text, 
  text, text, text, text, text, text, text, uuid, date, timestamp with time zone
);

-- Also drop the older version if it exists
DROP FUNCTION IF EXISTS public.update_client(
  uuid, text, text, text, text, text, text, text, text, text, 
  text, text, text, text, text, text, text, uuid, date
);

-- 3. Recreate update_client with social media handles
CREATE OR REPLACE FUNCTION public.update_client(
  p_client_id uuid,
  p_company_name text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL,
  p_contact_email text DEFAULT NULL,
  p_lead_stage text DEFAULT NULL,
  p_lead_source text DEFAULT NULL,
  p_industry_sector text DEFAULT NULL,
  p_urgency text DEFAULT NULL,
  p_tax_id text DEFAULT NULL,
  p_legal_name text DEFAULT NULL,
  p_billing_address text DEFAULT NULL,
  p_billing_city text DEFAULT NULL,
  p_billing_province text DEFAULT NULL,
  p_billing_postal_code text DEFAULT NULL,
  p_billing_country text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_next_follow_up_date date DEFAULT NULL,
  p_created_at timestamp with time zone DEFAULT NULL,
  p_instagram_handle text DEFAULT NULL,
  p_tiktok_handle text DEFAULT NULL,
  p_linkedin_url text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Check if user is admin
  v_is_admin := internal.is_admin();
  
  UPDATE crm.clients
  SET 
    company_name = COALESCE(p_company_name, company_name),
    contact_phone = COALESCE(p_contact_phone, contact_phone),
    contact_email = COALESCE(p_contact_email, contact_email),
    lead_stage = COALESCE(p_lead_stage::crm.lead_stage, lead_stage),
    lead_source = COALESCE(p_lead_source::crm.lead_source, lead_source),
    industry_sector = COALESCE(p_industry_sector::crm.industry_sector, industry_sector),
    urgency = COALESCE(p_urgency::crm.urgency_level, urgency),
    tax_id = COALESCE(p_tax_id, tax_id),
    legal_name = COALESCE(p_legal_name, legal_name),
    billing_address = COALESCE(p_billing_address, billing_address),
    billing_city = COALESCE(p_billing_city, billing_city),
    billing_province = COALESCE(p_billing_province, billing_province),
    billing_postal_code = COALESCE(p_billing_postal_code, billing_postal_code),
    billing_country = COALESCE(p_billing_country, billing_country),
    website = COALESCE(p_website, website),
    notes = COALESCE(p_notes, notes),
    assigned_to = COALESCE(p_assigned_to, assigned_to),
    next_follow_up_date = COALESCE(p_next_follow_up_date, next_follow_up_date),
    instagram_handle = COALESCE(p_instagram_handle, instagram_handle),
    tiktok_handle = COALESCE(p_tiktok_handle, tiktok_handle),
    linkedin_url = COALESCE(p_linkedin_url, linkedin_url),
    -- Only admins can change created_at
    created_at = CASE WHEN v_is_admin AND p_created_at IS NOT NULL THEN p_created_at ELSE created_at END,
    updated_at = now()
  WHERE id = p_client_id AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$;
