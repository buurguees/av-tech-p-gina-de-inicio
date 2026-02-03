-- ============================================
-- Actualizar generación automática del nombre del proyecto
-- Formato: project_number - client_name - client_order_number - local_name
-- ============================================

-- Actualizar función create_project para generar el nombre en el formato correcto
CREATE OR REPLACE FUNCTION public.create_project(
  p_client_id UUID,
  p_status TEXT DEFAULT 'PLANNED',
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
  
  -- Generate project name: project_number - client_name - client_order_number - local_name
  v_project_name := v_project_number || ' - ' || v_client_name;
  
  IF p_client_order_number IS NOT NULL AND p_client_order_number != '' THEN
    v_project_name := v_project_name || ' - ' || p_client_order_number;
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
