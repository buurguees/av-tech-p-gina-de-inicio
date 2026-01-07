-- Add missing columns to existing projects table
ALTER TABLE projects.projects 
ADD COLUMN IF NOT EXISTS project_city TEXT,
ADD COLUMN IF NOT EXISTS client_order_number TEXT,
ADD COLUMN IF NOT EXISTS local_name TEXT,
ADD COLUMN IF NOT EXISTS project_name TEXT;

-- Update project_name from title for existing records
UPDATE projects.projects SET project_name = title WHERE project_name IS NULL;

-- Function to get next project number with locking
CREATE OR REPLACE FUNCTION projects.get_next_project_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = projects
AS $$
DECLARE
  v_number INTEGER;
  v_project_number TEXT;
BEGIN
  -- Lock to prevent concurrent access
  LOCK TABLE projects.projects IN EXCLUSIVE MODE;
  
  -- Get next value from sequence
  SELECT COALESCE(MAX(CAST(NULLIF(project_number, '') AS INTEGER)), 0) + 1 
  INTO v_number
  FROM projects.projects
  WHERE project_number ~ '^\d+$';
  
  -- Format as 6-digit number with leading zeros
  v_project_number := LPAD(v_number::TEXT, 6, '0');
  
  RETURN v_project_number;
END;
$$;

-- Function to create a new project
CREATE OR REPLACE FUNCTION public.create_project(
  p_client_id UUID,
  p_status TEXT DEFAULT 'QUOTE',
  p_project_address TEXT DEFAULT NULL,
  p_project_city TEXT DEFAULT NULL,
  p_client_order_number TEXT DEFAULT NULL,
  p_local_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(project_id UUID, project_number TEXT, project_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = projects, crm, internal, public
AS $$
DECLARE
  v_project_id UUID;
  v_project_number TEXT;
  v_project_name TEXT;
  v_client_name TEXT;
  v_user_id UUID;
BEGIN
  -- Get the authorized user ID
  v_user_id := internal.get_authorized_user_id(auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  -- Get client name
  SELECT company_name INTO v_client_name
  FROM crm.clients
  WHERE id = p_client_id AND deleted_at IS NULL;
  
  IF v_client_name IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
  
  -- Generate unique project number
  v_project_number := projects.get_next_project_number();
  
  -- Generate project name: project_num - client_name - order_num - city - local_name
  v_project_name := v_project_number || ' - ' || v_client_name;
  
  IF p_client_order_number IS NOT NULL AND p_client_order_number != '' THEN
    v_project_name := v_project_name || ' - ' || p_client_order_number;
  END IF;
  
  IF p_project_city IS NOT NULL AND p_project_city != '' THEN
    v_project_name := v_project_name || ' - ' || p_project_city;
  END IF;
  
  IF p_local_name IS NOT NULL AND p_local_name != '' THEN
    v_project_name := v_project_name || ' - ' || p_local_name;
  END IF;
  
  -- Insert the new project
  INSERT INTO projects.projects (
    project_number,
    client_id,
    status,
    description,
    project_city,
    client_order_number,
    local_name,
    project_name,
    title,
    project_type,
    created_by
  )
  VALUES (
    v_project_number,
    p_client_id,
    p_status::projects.project_status,
    p_project_address,
    p_project_city,
    p_client_order_number,
    p_local_name,
    v_project_name,
    v_project_name,
    'INSTALLATION'::projects.project_type,
    v_user_id
  )
  RETURNING id INTO v_project_id;
  
  RETURN QUERY SELECT v_project_id, v_project_number, v_project_name;
END;
$$;

-- Function to list projects
CREATE OR REPLACE FUNCTION public.list_projects(
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  project_number TEXT,
  client_id UUID,
  client_name TEXT,
  status TEXT,
  project_address TEXT,
  project_city TEXT,
  client_order_number TEXT,
  local_name TEXT,
  project_name TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = projects, crm, internal
AS $$
  SELECT 
    p.id,
    p.project_number,
    p.client_id,
    c.company_name as client_name,
    p.status::text,
    p.description as project_address,
    p.project_city,
    p.client_order_number,
    p.local_name,
    COALESCE(p.project_name, p.title) as project_name,
    p.created_by,
    au.full_name as created_by_name,
    p.created_at
  FROM projects.projects p
  LEFT JOIN crm.clients c ON c.id = p.client_id
  LEFT JOIN internal.authorized_users au ON au.id = p.created_by
  WHERE p.deleted_at IS NULL
    AND (p_status IS NULL OR p.status::text = p_status)
    AND (p_search IS NULL OR 
         p.project_number ILIKE '%' || p_search || '%' OR
         COALESCE(p.project_name, p.title) ILIKE '%' || p_search || '%' OR
         c.company_name ILIKE '%' || p_search || '%' OR
         p.local_name ILIKE '%' || p_search || '%')
  ORDER BY p.project_number DESC;
$$;

-- Function to get a single project
CREATE OR REPLACE FUNCTION public.get_project(p_project_id UUID)
RETURNS TABLE(
  id UUID,
  project_number TEXT,
  client_id UUID,
  client_name TEXT,
  status TEXT,
  project_address TEXT,
  project_city TEXT,
  client_order_number TEXT,
  local_name TEXT,
  project_name TEXT,
  quote_id UUID,
  notes TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = projects, crm, internal
AS $$
  SELECT 
    p.id,
    p.project_number,
    p.client_id,
    c.company_name as client_name,
    p.status::text,
    p.description as project_address,
    p.project_city,
    p.client_order_number,
    p.local_name,
    COALESCE(p.project_name, p.title) as project_name,
    p.quote_id,
    p.internal_notes as notes,
    p.created_by,
    au.full_name as created_by_name,
    p.created_at,
    p.updated_at
  FROM projects.projects p
  LEFT JOIN crm.clients c ON c.id = p.client_id
  LEFT JOIN internal.authorized_users au ON au.id = p.created_by
  WHERE p.id = p_project_id AND p.deleted_at IS NULL;
$$;

-- Function to update a project
CREATE OR REPLACE FUNCTION public.update_project(
  p_project_id UUID,
  p_status TEXT DEFAULT NULL,
  p_project_address TEXT DEFAULT NULL,
  p_project_city TEXT DEFAULT NULL,
  p_client_order_number TEXT DEFAULT NULL,
  p_local_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = projects, crm, internal, public
AS $$
DECLARE
  v_client_id UUID;
  v_client_name TEXT;
  v_project_number TEXT;
  v_new_project_name TEXT;
  v_final_city TEXT;
  v_final_order TEXT;
  v_final_local TEXT;
BEGIN
  -- Check user authorization
  IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  -- Get current project data
  SELECT p.client_id, p.project_number, p.project_city, p.client_order_number, p.local_name
  INTO v_client_id, v_project_number, v_final_city, v_final_order, v_final_local
  FROM projects.projects p
  WHERE p.id = p_project_id AND p.deleted_at IS NULL;
  
  IF v_client_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get client name
  SELECT company_name INTO v_client_name
  FROM crm.clients
  WHERE id = v_client_id;
  
  -- Use new values if provided
  v_final_city := COALESCE(p_project_city, v_final_city);
  v_final_order := COALESCE(p_client_order_number, v_final_order);
  v_final_local := COALESCE(p_local_name, v_final_local);
  
  -- Regenerate project name
  v_new_project_name := v_project_number || ' - ' || v_client_name;
  
  IF v_final_order IS NOT NULL AND v_final_order != '' THEN
    v_new_project_name := v_new_project_name || ' - ' || v_final_order;
  END IF;
  
  IF v_final_city IS NOT NULL AND v_final_city != '' THEN
    v_new_project_name := v_new_project_name || ' - ' || v_final_city;
  END IF;
  
  IF v_final_local IS NOT NULL AND v_final_local != '' THEN
    v_new_project_name := v_new_project_name || ' - ' || v_final_local;
  END IF;
  
  -- Update the project
  UPDATE projects.projects
  SET 
    status = COALESCE(p_status::projects.project_status, status),
    description = COALESCE(p_project_address, description),
    project_city = v_final_city,
    client_order_number = v_final_order,
    local_name = v_final_local,
    project_name = v_new_project_name,
    title = v_new_project_name,
    internal_notes = COALESCE(p_notes, internal_notes),
    updated_at = NOW()
  WHERE id = p_project_id;
  
  RETURN FOUND;
END;
$$;