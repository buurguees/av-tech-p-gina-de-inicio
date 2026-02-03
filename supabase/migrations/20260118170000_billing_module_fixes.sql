-- ============================================
-- BIG FIX: BILLING MODULE ERRORS
-- ============================================
-- Fecha: 2026-01-18
-- Descripción: Corrige errores de tipos, esquemas inconsistentes y lógica de validación.
-- ============================================

BEGIN;

-- 1. Unificar y Corregir finance_list_invoices
-- Nota: Necesitamos DROP porque cambiamos el tipo de retorno (añadimos columnas)
DROP FUNCTION IF EXISTS public.finance_list_invoices(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.finance_list_invoices(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  preliminary_number TEXT,
  source_quote_id UUID,
  source_quote_number TEXT,
  client_id UUID,
  client_name TEXT,
  project_id UUID,
  project_number TEXT,
  project_name TEXT,
  client_order_number TEXT,
  status TEXT,
  issue_date DATE,
  due_date DATE,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC,
  paid_amount NUMERIC,
  pending_amount NUMERIC,
  is_locked BOOLEAN,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, crm, projects, quotes, internal, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.invoice_number,
    i.preliminary_number,
    i.source_quote_id,
    q.quote_number AS source_quote_number,
    i.client_id,
    c.company_name AS client_name,
    i.project_id,
    p.project_number,
    i.project_name,
    i.client_order_number,
    i.status,
    i.issue_date,
    i.due_date,
    COALESCE(i.subtotal, 0) AS subtotal,
    COALESCE(i.tax_amount, 0) AS tax_amount,
    COALESCE(i.total, 0) AS total,
    COALESCE(i.paid_amount, 0) AS paid_amount,
    COALESCE(i.pending_amount, 0) AS pending_amount,
    COALESCE(i.is_locked, false) AS is_locked,
    i.created_by,
    au.full_name AS created_by_name,
    i.created_at
  FROM sales.invoices i
  LEFT JOIN crm.clients c ON c.id = i.client_id
  LEFT JOIN projects.projects p ON p.id = i.project_id
  LEFT JOIN quotes.quotes q ON q.id = i.source_quote_id
  LEFT JOIN internal.authorized_users au ON au.id = i.created_by
  WHERE 
    (p_status IS NULL OR i.status = p_status)
    AND (
      p_search IS NULL 
      OR i.invoice_number ILIKE '%' || p_search || '%'
      OR i.preliminary_number ILIKE '%' || p_search || '%'
      OR c.company_name ILIKE '%' || p_search || '%'
      OR i.project_name ILIKE '%' || p_search || '%'
      OR p.project_number ILIKE '%' || p_search || '%'
    )
  ORDER BY i.created_at DESC;
END;
$$;

-- 2. Corregir y Asegurar RPCs de Facturas y Líneas

-- Alias public.update_invoice -> public.finance_update_invoice
DROP FUNCTION IF EXISTS public.update_invoice(UUID, UUID, UUID, TEXT, DATE, DATE, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.update_invoice(
  p_invoice_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_issue_date DATE DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL,
  p_payment_terms TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.finance_update_invoice(
    p_invoice_id, p_client_id, p_project_id, p_project_name,
    p_due_date, p_notes, p_internal_notes, p_payment_terms, p_status
    -- Notamos que finance_update_invoice no recibe p_issue_date
  );
END;
$$;

-- RPC Create Invoice with Number (Versión Robusta)
DROP FUNCTION IF EXISTS public.create_invoice_with_number(UUID, UUID, TEXT, DATE, DATE, UUID);

CREATE OR REPLACE FUNCTION public.create_invoice_with_number(
  p_client_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_issue_date DATE DEFAULT CURRENT_DATE,
  p_due_date DATE DEFAULT NULL,
  p_source_quote_id UUID DEFAULT NULL
)
RETURNS TABLE (
  invoice_id UUID,
  invoice_number TEXT,
  preliminary_number TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, quotes, audit, internal, public
AS $$
DECLARE
  v_invoice_id UUID;
  v_preliminary_number TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  
  -- Generar número preliminar
  v_preliminary_number := 'PRE-' || to_char(now(), 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 4);

  INSERT INTO sales.invoices (
    client_id, project_id, project_name, issue_date, due_date, 
    source_quote_id, preliminary_number, status, created_by
  )
  VALUES (
    p_client_id, p_project_id, p_project_name, p_issue_date, 
    COALESCE(p_due_date, p_issue_date + interval '30 days'),
    p_source_quote_id, v_preliminary_number, 'DRAFT', v_user_id
  )
  RETURNING id INTO v_invoice_id;

  RETURN QUERY SELECT v_invoice_id, NULL::TEXT, v_preliminary_number;
END;
$$;

-- Líneas de Factura
DROP FUNCTION IF EXISTS public.add_invoice_line(UUID, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, UUID, UUID);

CREATE OR REPLACE FUNCTION public.add_invoice_line(
  p_invoice_id UUID,
  p_concept TEXT,
  p_description TEXT DEFAULT NULL,
  p_quantity NUMERIC DEFAULT 1,
  p_unit_price NUMERIC DEFAULT 0,
  p_discount_percent NUMERIC DEFAULT 0,
  p_tax_rate NUMERIC DEFAULT 21,
  p_tax_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_is_locked BOOLEAN;
  v_line_id UUID;
BEGIN
  SELECT is_locked INTO v_is_locked FROM sales.invoices WHERE id = p_invoice_id;
  IF COALESCE(v_is_locked, false) THEN
    RAISE EXCEPTION 'No se pueden añadir líneas a una factura bloqueada';
  END IF;

  INSERT INTO sales.invoice_lines (
    invoice_id, concept, description, quantity, unit_price, 
    discount_percent, tax_rate, tax_id, product_id
  )
  VALUES (
    p_invoice_id, p_concept, p_description, p_quantity, p_unit_price,
    p_discount_percent, p_tax_rate, p_tax_id, p_product_id
  )
  RETURNING id INTO v_line_id;

  RETURN v_line_id;
END;
$$;

DROP FUNCTION IF EXISTS public.finance_add_invoice_line(UUID, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, UUID, UUID);

CREATE OR REPLACE FUNCTION public.finance_add_invoice_line(
  p_invoice_id UUID,
  p_concept TEXT,
  p_description TEXT DEFAULT NULL,
  p_quantity NUMERIC DEFAULT 1,
  p_unit_price NUMERIC DEFAULT 0,
  p_discount_percent NUMERIC DEFAULT 0,
  p_tax_rate NUMERIC DEFAULT 21,
  p_tax_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
  SELECT public.add_invoice_line($1, $2, $3, $4, $5, $6, $7, $8, $9);
$$ LANGUAGE sql;

DROP FUNCTION IF EXISTS public.update_invoice_line(UUID, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION public.update_invoice_line(
  p_line_id UUID,
  p_concept TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_quantity NUMERIC DEFAULT NULL,
  p_unit_price NUMERIC DEFAULT NULL,
  p_discount_percent NUMERIC DEFAULT NULL,
  p_tax_rate NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_invoice_id UUID;
  v_is_locked BOOLEAN;
BEGIN
  SELECT invoice_id INTO v_invoice_id FROM sales.invoice_lines WHERE id = p_line_id;
  SELECT is_locked INTO v_is_locked FROM sales.invoices WHERE id = v_invoice_id;
  
  IF COALESCE(v_is_locked, false) THEN
    RAISE EXCEPTION 'No se pueden editar líneas de una factura bloqueada';
  END IF;

  UPDATE sales.invoice_lines
  SET
    concept = COALESCE(p_concept, concept),
    description = COALESCE(p_description, description),
    quantity = COALESCE(p_quantity, quantity),
    unit_price = COALESCE(p_unit_price, unit_price),
    discount_percent = COALESCE(p_discount_percent, discount_percent),
    tax_rate = COALESCE(p_tax_rate, tax_rate),
    updated_at = now()
  WHERE id = p_line_id;

  RETURN FOUND;
END;
$$;

DROP FUNCTION IF EXISTS public.finance_update_invoice_line(UUID, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION public.finance_update_invoice_line(
  p_line_id UUID,
  p_concept TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_quantity NUMERIC DEFAULT NULL,
  p_unit_price NUMERIC DEFAULT NULL,
  p_discount_percent NUMERIC DEFAULT NULL,
  p_tax_rate NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN AS $$
  SELECT public.update_invoice_line($1, $2, $3, $4, $5, $6, $7);
$$ LANGUAGE sql;

DROP FUNCTION IF EXISTS public.delete_invoice_line(UUID);

CREATE OR REPLACE FUNCTION public.delete_invoice_line(p_line_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_invoice_id UUID;
  v_is_locked BOOLEAN;
BEGIN
  SELECT invoice_id INTO v_invoice_id FROM sales.invoice_lines WHERE id = p_line_id;
  SELECT is_locked INTO v_is_locked FROM sales.invoices WHERE id = v_invoice_id;
  
  IF COALESCE(v_is_locked, false) THEN
    RAISE EXCEPTION 'No se pueden eliminar líneas de una factura bloqueada';
  END IF;

  DELETE FROM sales.invoice_lines WHERE id = p_line_id;
  RETURN FOUND;
END;
$$;

DROP FUNCTION IF EXISTS public.finance_delete_invoice_line(UUID);

CREATE OR REPLACE FUNCTION public.finance_delete_invoice_line(p_line_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.delete_invoice_line($1);
$$ LANGUAGE sql;

-- 3. Crear Aliases para Financial Portfolio y Stats en esquema public
DROP FUNCTION IF EXISTS public.get_projects_portfolio_summary();
DROP FUNCTION IF EXISTS public.get_project_financial_stats(UUID);

CREATE OR REPLACE FUNCTION public.get_projects_portfolio_summary()
RETURNS TABLE (
  total_active_projects BIGINT,
  total_pipeline_value NUMERIC,
  avg_project_ticket NUMERIC,
  max_project_value NUMERIC,
  min_project_value NUMERIC,
  total_invoiced_ytd NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM projects.get_projects_portfolio_summary();
$$;

CREATE OR REPLACE FUNCTION public.get_project_financial_stats(p_project_id UUID)
RETURNS TABLE (
  total_budget NUMERIC,
  total_invoiced NUMERIC,
  total_expenses NUMERIC,
  margin NUMERIC,
  margin_percentage NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM projects.get_project_financial_stats(p_project_id);
$$;

COMMIT;
