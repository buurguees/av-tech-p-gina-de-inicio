-- Add project_id column to quotes table
ALTER TABLE quotes.quotes 
ADD COLUMN project_id UUID REFERENCES projects.projects(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_quotes_project_id ON quotes.quotes(project_id);

-- Update the create_quote_with_number function to accept project_id
CREATE OR REPLACE FUNCTION public.create_quote_with_number(
  p_client_id UUID,
  p_project_name TEXT DEFAULT NULL,
  p_valid_until DATE DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE(quote_id UUID, quote_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote_id UUID;
  v_quote_number TEXT;
  v_user_id UUID;
BEGIN
  -- Get the authorized user ID
  v_user_id := internal.get_authorized_user_id(auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  -- Generate unique quote number
  v_quote_number := quotes.get_next_quote_number();
  
  -- Insert the new quote
  INSERT INTO quotes.quotes (
    quote_number,
    client_id,
    project_id,
    project_name,
    valid_until,
    created_by,
    status
  )
  VALUES (
    v_quote_number,
    p_client_id,
    p_project_id,
    p_project_name,
    COALESCE(p_valid_until, CURRENT_DATE + INTERVAL '30 days'),
    v_user_id,
    'DRAFT'
  )
  RETURNING id INTO v_quote_id;
  
  RETURN QUERY SELECT v_quote_id, v_quote_number;
END;
$$;

-- Update list_quotes to include project info
CREATE OR REPLACE FUNCTION public.list_quotes(p_search TEXT DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  quote_number TEXT,
  client_id UUID,
  client_name TEXT,
  project_id UUID,
  project_name TEXT,
  project_number TEXT,
  order_number TEXT,
  status TEXT,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC,
  valid_until DATE,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;

  RETURN QUERY
  SELECT 
    q.id,
    q.quote_number,
    q.client_id,
    c.company_name AS client_name,
    q.project_id,
    COALESCE(p.project_name, q.project_name) AS project_name,
    p.project_number,
    q.order_number,
    q.status::TEXT,
    q.subtotal,
    q.tax_amount,
    q.total,
    q.valid_until,
    q.created_by,
    u.full_name AS created_by_name,
    q.created_at
  FROM quotes.quotes q
  LEFT JOIN crm.clients c ON q.client_id = c.id
  LEFT JOIN projects.projects p ON q.project_id = p.id
  LEFT JOIN internal.users u ON q.created_by = u.id
  WHERE q.deleted_at IS NULL
    AND (
      p_search IS NULL 
      OR q.quote_number ILIKE '%' || p_search || '%'
      OR c.company_name ILIKE '%' || p_search || '%'
      OR q.project_name ILIKE '%' || p_search || '%'
      OR p.project_name ILIKE '%' || p_search || '%'
    )
  ORDER BY q.created_at DESC;
END;
$$;