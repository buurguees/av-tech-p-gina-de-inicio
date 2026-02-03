--
-- Módulo de Compras - Fase 2: RPCs de Proveedores y Técnicos
--

-- 1. RPC: Listado de Proveedores
CREATE OR REPLACE FUNCTION public.list_suppliers(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  supplier_number TEXT,
  company_name TEXT,
  legal_name TEXT,
  tax_id TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  province TEXT,
  payment_terms TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  RETURN QUERY
  WITH filtered_suppliers AS (
    SELECT s.*
    FROM internal.suppliers s
    WHERE
      (p_search IS NULL OR
       s.company_name ILIKE '%' || p_search || '%' OR
       s.tax_id ILIKE '%' || p_search || '%' OR
       s.supplier_number ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR s.status = p_status)
  )
  SELECT
    s.id,
    s.supplier_number,
    s.company_name,
    s.legal_name,
    s.tax_id,
    s.contact_name,
    s.contact_phone as phone,
    s.contact_email as email,
    s.city,
    s.province,
    s.payment_terms,
    s.status,
    s.created_at,
    (SELECT COUNT(*) FROM filtered_suppliers) as total_count
  FROM filtered_suppliers s
  ORDER BY s.company_name ASC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

-- 2. RPC: CRUD Proveedores
CREATE OR REPLACE FUNCTION public.create_supplier(
    p_company_name TEXT,
    p_tax_id TEXT,
    p_legal_name TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_province TEXT DEFAULT NULL,
    p_postal_code TEXT DEFAULT NULL,
    p_payment_terms TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
DECLARE
    v_supplier_id UUID;
    v_supplier_number TEXT;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    v_supplier_number := 'SUP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random()*10000)::text, 4, '0');

    INSERT INTO internal.suppliers (
        supplier_number, company_name, legal_name, tax_id, 
        contact_email, contact_phone, address, city, province, 
        postal_code, payment_terms, notes, created_by
    ) VALUES (
        v_supplier_number, p_company_name, p_legal_name, p_tax_id, 
        p_email, p_phone, p_address, p_city, p_province, 
        p_postal_code, p_payment_terms, p_notes, v_user_id
    )
    RETURNING id INTO v_supplier_id;

    RETURN jsonb_build_object('id', v_supplier_id, 'supplier_number', v_supplier_number);
END;
$$;

-- 3. RPC: Listado de Técnicos (Actualizado para internal)
CREATE OR REPLACE FUNCTION public.list_technicians(
  p_search TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  technician_number TEXT,
  company_name TEXT,
  legal_name TEXT,
  tax_id TEXT,
  type TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  status TEXT,
  specialties TEXT[],
  daily_rate NUMERIC,
  hourly_rate NUMERIC,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  RETURN QUERY
  WITH filtered_techs AS (
    SELECT t.*
    FROM internal.technicians t
    WHERE
      (p_search IS NULL OR
       t.company_name ILIKE '%' || p_search || '%' OR
       t.tax_id ILIKE '%' || p_search || '%' OR
       t.technician_number ILIKE '%' || p_search || '%')
      AND (p_type IS NULL OR t.type = p_type)
      AND (p_status IS NULL OR t.status = p_status)
  )
  SELECT
    t.id,
    t.technician_number,
    t.company_name,
    t.legal_name,
    t.tax_id,
    t.type,
    t.contact_email as email,
    t.contact_phone as phone,
    t.city,
    t.status,
    t.specialties,
    t.daily_rate,
    t.hourly_rate,
    t.created_at,
    (SELECT COUNT(*) FROM filtered_techs) as total_count
  FROM filtered_techs t
  ORDER BY t.company_name ASC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;
