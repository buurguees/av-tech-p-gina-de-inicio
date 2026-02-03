-- Create purchasing schema
CREATE SCHEMA IF NOT EXISTS purchasing;

--
-- Table: purchasing.suppliers
--
CREATE TABLE IF NOT EXISTS purchasing.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_number TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    legal_name TEXT,
    tax_id TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'España',
    payment_terms TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

--
-- Table: purchasing.technicians
--
CREATE TABLE IF NOT EXISTS purchasing.technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_number TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('FREELANCE', 'COMPANY', 'EMPLOYEE')),
    company_name TEXT NOT NULL, -- Used as main display name even for individuals
    legal_name TEXT,
    tax_id TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_phone_secondary TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'España',
    iban TEXT,
    swift TEXT,
    payment_terms TEXT,
    daily_rate NUMERIC(10, 2),
    hourly_rate NUMERIC(10, 2),
    specialties TEXT[], -- Business logic can handle array of strings
    notes TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

--
-- Table: purchasing.invoices
--
CREATE TABLE IF NOT EXISTS purchasing.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL,
    supplier_id UUID REFERENCES purchasing.suppliers(id),
    technician_id UUID REFERENCES purchasing.technicians(id),
    date DATE NOT NULL,
    due_date DATE,
    tax_base NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    retention_percentage NUMERIC(5, 2) DEFAULT 0,
    retention_amount NUMERIC(10, 2) DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'REJECTED')),
    payment_method TEXT,
    notes TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT check_supplier_or_technician CHECK (
        (supplier_id IS NOT NULL AND technician_id IS NULL) OR
        (supplier_id IS NULL AND technician_id IS NOT NULL)
    ),
    UNIQUE(invoice_number, supplier_id, technician_id) -- Avoid dups per provider
);

--
-- Enable RLS
--
ALTER TABLE purchasing.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchasing.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchasing.invoices ENABLE ROW LEVEL SECURITY;

--
-- Policies (Simplified for now - accessible to authenticated users)
--
CREATE POLICY "Allow read access for authenticated users" ON purchasing.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON purchasing.suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update access for authenticated users" ON purchasing.suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete access for authenticated users" ON purchasing.suppliers FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated users" ON purchasing.technicians FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON purchasing.technicians FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update access for authenticated users" ON purchasing.technicians FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete access for authenticated users" ON purchasing.technicians FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated users" ON purchasing.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON purchasing.invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update access for authenticated users" ON purchasing.invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete access for authenticated users" ON purchasing.invoices FOR DELETE TO authenticated USING (true);


-- -----------------------------------------------------------------------------
-- RPCs for Suppliers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_suppliers(
  p_search TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  supplier_number TEXT,
  company_name TEXT,
  legal_name TEXT,
  tax_id TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  payment_terms TEXT,
  city TEXT,
  province TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = purchasing, public
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  RETURN QUERY
  WITH filtered_suppliers AS (
    SELECT s.*
    FROM purchasing.suppliers s
    WHERE
      p_search IS NULL OR
      s.company_name ILIKE '%' || p_search || '%' OR
      s.tax_id ILIKE '%' || p_search || '%' OR
      s.email ILIKE '%' || p_search || '%'
  )
  SELECT
    s.id,
    s.supplier_number,
    s.company_name,
    s.legal_name,
    s.tax_id,
    -- Assuming no separate contacts table for simplicty in this iteration, map fields directly if needed or add placeholders
    NULL::TEXT as contact_name, 
    s.email,
    s.phone,
    s.payment_terms,
    s.city,
    s.province,
    s.created_at,
    (SELECT COUNT(*) FROM filtered_suppliers) as total_count
  FROM filtered_suppliers s
  ORDER BY s.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;


CREATE OR REPLACE FUNCTION public.create_supplier(
    p_company_name TEXT,
    p_tax_id TEXT,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_province TEXT DEFAULT NULL,
    p_postal_code TEXT DEFAULT NULL,
    p_country TEXT DEFAULT 'España',
    p_payment_terms TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = purchasing, public
AS $$
DECLARE
    v_supplier_id UUID;
    v_supplier_number TEXT;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Generate simple supplier number (sequence usage would be better in prod)
    -- Using timestamp for unicity in this simplified version
    v_supplier_number := 'SUP-' || to_char(now(), 'YYYYMMDDHH24MISS');

    INSERT INTO purchasing.suppliers (
        supplier_number, company_name, tax_id, email, phone,
        address, city, province, postal_code, country,
        payment_terms, notes, created_by
    ) VALUES (
        v_supplier_number, p_company_name, p_tax_id, p_email, p_phone,
        p_address, p_city, p_province, p_postal_code, p_country,
        p_payment_terms, p_notes, v_user_id
    )
    RETURNING id INTO v_supplier_id;

    RETURN jsonb_build_object('id', v_supplier_id, 'supplier_number', v_supplier_number);
END;
$$;


-- -----------------------------------------------------------------------------
-- RPCs for Technicians
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_technicians(
  p_search TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_specialty TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  technician_number TEXT,
  company_name TEXT,
  type TEXT,
  legal_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
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
SET search_path = purchasing, public
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  RETURN QUERY
  WITH filtered_technicians AS (
    SELECT t.*
    FROM purchasing.technicians t
    WHERE
      (p_search IS NULL OR
       t.company_name ILIKE '%' || p_search || '%' OR
       t.technician_number ILIKE '%' || p_search || '%')
      AND (p_type IS NULL OR t.type = p_type)
      AND (p_status IS NULL OR t.status = p_status)
      AND (p_specialty IS NULL OR p_specialty = ANY(t.specialties))
  )
  SELECT
    t.id,
    t.technician_number,
    t.company_name,
    t.type,
    t.legal_name,
    t.contact_email,
    t.contact_phone,
    t.city,
    t.status,
    t.specialties,
    t.daily_rate,
    t.hourly_rate,
    t.created_at,
    (SELECT COUNT(*) FROM filtered_technicians) as total_count
  FROM filtered_technicians t
  ORDER BY t.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_technician(
    p_type TEXT,
    p_company_name TEXT,
    p_tax_id TEXT,
    p_contact_email TEXT DEFAULT NULL,
    p_contact_phone TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_province TEXT DEFAULT NULL,
    p_postal_code TEXT DEFAULT NULL,
    p_country TEXT DEFAULT 'España',
    p_specialties TEXT[] DEFAULT NULL,
    p_daily_rate NUMERIC DEFAULT NULL,
    p_hourly_rate NUMERIC DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = purchasing, public
AS $$
DECLARE
    v_tech_id UUID;
    v_tech_number TEXT;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Generate number
    v_tech_number := 'TECH-' || to_char(now(), 'YYYYMMDDHH24MISS');

    INSERT INTO purchasing.technicians (
        technician_number, type, company_name, tax_id,
        contact_email, contact_phone,
        address, city, province, postal_code, country,
        specialties, daily_rate, hourly_rate,
        notes, created_by
    ) VALUES (
        v_tech_number, p_type, p_company_name, p_tax_id,
        p_contact_email, p_contact_phone,
        p_address, p_city, p_province, p_postal_code, p_country,
        p_specialties, p_daily_rate, p_hourly_rate,
        p_notes, v_user_id
    )
    RETURNING id INTO v_tech_id;

    RETURN jsonb_build_object('id', v_tech_id, 'technician_number', v_tech_number);
END;
$$;
