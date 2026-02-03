-- Add client_number field to crm.clients table
ALTER TABLE crm.clients 
ADD COLUMN IF NOT EXISTS client_number TEXT UNIQUE;

-- Create index for client_number
CREATE INDEX IF NOT EXISTS idx_clients_client_number ON crm.clients(client_number) WHERE client_number IS NOT NULL;

-- Drop conflicting RLS policies if they exist from the security migration
DROP POLICY IF EXISTS "Authenticated users can read clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can create clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;

-- Update list_clients function to include client_number
CREATE OR REPLACE FUNCTION public.list_clients(
  p_lead_stage text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  client_number text,
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
    c.client_number,
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

-- Update get_client function to include client_number
CREATE OR REPLACE FUNCTION public.get_client(p_client_id uuid)
RETURNS TABLE (
  id uuid,
  client_number text,
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
    c.client_number,
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
