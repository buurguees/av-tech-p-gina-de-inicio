
DROP FUNCTION IF EXISTS public.list_project_quotes(uuid);

CREATE FUNCTION public.list_project_quotes(p_project_id uuid)
RETURNS TABLE(
  id uuid,
  quote_number text,
  client_id uuid,
  client_name text,
  project_id uuid,
  project_number text,
  project_name text,
  order_number text,
  status text,
  subtotal numeric,
  tax_amount numeric,
  total numeric,
  valid_until date,
  created_at timestamptz,
  created_by uuid,
  created_by_name text,
  site_id uuid,
  site_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
        RAISE EXCEPTION 'User not authorized';
    END IF;

    RETURN QUERY
    SELECT 
        q.id,
        q.quote_number,
        q.client_id,
        c.company_name AS client_name,
        q.project_id,
        p.project_number,
        COALESCE(p.project_name, q.project_name) AS project_name,
        q.order_number,
        q.status::TEXT,
        q.subtotal,
        q.tax_amount,
        q.total,
        q.valid_until,
        q.created_at,
        q.created_by,
        COALESCE(u.full_name, 'Sistema') AS created_by_name,
        q.site_id,
        ps.site_name
    FROM quotes.quotes q
    LEFT JOIN crm.clients c ON q.client_id = c.id
    LEFT JOIN projects.projects p ON q.project_id = p.id
    LEFT JOIN internal.authorized_users u ON q.created_by = u.id
    LEFT JOIN projects.project_sites ps ON q.site_id = ps.id
    WHERE q.project_id = p_project_id
    ORDER BY q.created_at DESC;
END;
$$;
