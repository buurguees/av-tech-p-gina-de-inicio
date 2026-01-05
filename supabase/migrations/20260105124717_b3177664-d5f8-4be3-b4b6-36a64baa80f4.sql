-- Function to list all clients (with optional filters)
CREATE OR REPLACE FUNCTION public.list_clients(
  p_lead_stage text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  company_name text,
  contact_phone text,
  contact_email text,
  tax_id text,
  legal_name text,
  industry_sector text,
  lead_stage text,
  lead_source text,
  urgency text,
  assigned_to uuid,
  assigned_to_name text,
  next_follow_up_date date,
  created_at timestamptz,
  notes text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = crm, internal
AS $$
  SELECT 
    c.id,
    c.company_name,
    c.contact_phone,
    c.contact_email,
    c.tax_id,
    c.legal_name,
    c.industry_sector::text,
    c.lead_stage::text,
    c.lead_source::text,
    c.urgency::text,
    c.assigned_to,
    au.full_name as assigned_to_name,
    c.next_follow_up_date,
    c.created_at,
    c.notes
  FROM crm.clients c
  LEFT JOIN internal.authorized_users au ON au.id = c.assigned_to
  WHERE c.deleted_at IS NULL
    AND (p_lead_stage IS NULL OR c.lead_stage::text = p_lead_stage)
    AND (p_search IS NULL OR 
         c.company_name ILIKE '%' || p_search || '%' OR 
         c.contact_email ILIKE '%' || p_search || '%' OR
         c.contact_phone ILIKE '%' || p_search || '%')
  ORDER BY c.created_at DESC;
$$;

-- Function to get a single client by ID
CREATE OR REPLACE FUNCTION public.get_client(p_client_id uuid)
RETURNS TABLE (
  id uuid,
  company_name text,
  contact_phone text,
  contact_email text,
  tax_id text,
  legal_name text,
  billing_address text,
  billing_city text,
  billing_province text,
  billing_postal_code text,
  billing_country text,
  website text,
  instagram_handle text,
  tiktok_handle text,
  linkedin_url text,
  number_of_locations integer,
  industry_sector text,
  approximate_budget numeric,
  urgency text,
  target_objectives text[],
  lead_stage text,
  lead_source text,
  assigned_to uuid,
  next_follow_up_date date,
  estimated_close_date date,
  lost_reason text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = crm
AS $$
  SELECT 
    c.id,
    c.company_name,
    c.contact_phone,
    c.contact_email,
    c.tax_id,
    c.legal_name,
    c.billing_address,
    c.billing_city,
    c.billing_province,
    c.billing_postal_code,
    c.billing_country,
    c.website,
    c.instagram_handle,
    c.tiktok_handle,
    c.linkedin_url,
    c.number_of_locations,
    c.industry_sector::text,
    c.approximate_budget,
    c.urgency::text,
    c.target_objectives,
    c.lead_stage::text,
    c.lead_source::text,
    c.assigned_to,
    c.next_follow_up_date,
    c.estimated_close_date,
    c.lost_reason,
    c.notes,
    c.created_at,
    c.updated_at
  FROM crm.clients c
  WHERE c.id = p_client_id AND c.deleted_at IS NULL;
$$;

-- Function to create a new client
CREATE OR REPLACE FUNCTION public.create_client(
  p_company_name text,
  p_contact_phone text,
  p_contact_email text,
  p_lead_stage text DEFAULT 'NEW',
  p_lead_source text DEFAULT NULL,
  p_industry_sector text DEFAULT NULL,
  p_tax_id text DEFAULT NULL,
  p_legal_name text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  INSERT INTO crm.clients (
    company_name, contact_phone, contact_email, lead_stage, lead_source,
    industry_sector, tax_id, legal_name, notes, assigned_to, created_by
  ) VALUES (
    p_company_name, p_contact_phone, p_contact_email, 
    p_lead_stage::crm.lead_stage, 
    p_lead_source::crm.lead_source,
    p_industry_sector::crm.industry_sector, 
    p_tax_id, p_legal_name, p_notes, p_assigned_to, p_created_by
  )
  RETURNING id INTO v_client_id;
  
  RETURN v_client_id;
END;
$$;

-- Function to update a client
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
  p_next_follow_up_date date DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm
AS $$
BEGIN
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
    updated_at = now()
  WHERE id = p_client_id AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Function to soft delete a client
CREATE OR REPLACE FUNCTION public.delete_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm
AS $$
BEGIN
  UPDATE crm.clients
  SET deleted_at = now(), updated_at = now()
  WHERE id = p_client_id AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Function to list authorized users (for assignment dropdowns)
CREATE OR REPLACE FUNCTION public.list_assignable_users()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  department text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = internal
AS $$
  SELECT 
    au.id,
    au.full_name,
    au.email,
    au.department::text
  FROM internal.authorized_users au
  WHERE au.is_active = true
  ORDER BY au.full_name;
$$;