-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create quotes schema
CREATE SCHEMA IF NOT EXISTS quotes;

-- Create quote status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'quotes')) THEN
    CREATE TYPE quotes.quote_status AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'INVOICED');
  END IF;
END $$;

-- Create sequence for quote numbers if not exists
CREATE SEQUENCE IF NOT EXISTS quotes.quote_number_seq START 1;

-- Create quotes table if not exists
CREATE TABLE IF NOT EXISTS quotes.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL,
  project_name TEXT,
  order_number TEXT,
  status quotes.quote_status NOT NULL DEFAULT 'DRAFT',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to generate quote number (P-YY-XXXXXX)
CREATE OR REPLACE FUNCTION quotes.generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  v_year := TO_CHAR(now(), 'YY');
  v_seq := nextval('quotes.quote_number_seq');
  NEW.quote_number := 'P-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating quote number (drop first if exists)
DROP TRIGGER IF EXISTS generate_quote_number_trigger ON quotes.quotes;
CREATE TRIGGER generate_quote_number_trigger
  BEFORE INSERT ON quotes.quotes
  FOR EACH ROW
  WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
  EXECUTE FUNCTION quotes.generate_quote_number();

-- Create trigger for updated_at (drop first if exists)
DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes.quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE quotes.quotes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view quotes" ON quotes.quotes;
DROP POLICY IF EXISTS "Admin and managers can manage quotes" ON quotes.quotes;
DROP POLICY IF EXISTS "Sales can create quotes" ON quotes.quotes;
DROP POLICY IF EXISTS "Sales can update own quotes" ON quotes.quotes;

-- RLS Policies
CREATE POLICY "Authenticated users can view quotes"
  ON quotes.quotes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin and managers can manage quotes"
  ON quotes.quotes FOR ALL
  USING (internal.is_admin() OR internal.is_manager());

CREATE POLICY "Sales can create quotes"
  ON quotes.quotes FOR INSERT
  WITH CHECK (internal.is_sales() AND created_by = internal.get_authorized_user_id(auth.uid()));

CREATE POLICY "Sales can update own quotes"
  ON quotes.quotes FOR UPDATE
  USING (internal.is_sales() AND created_by = internal.get_authorized_user_id(auth.uid()));

-- Create function to list quotes
CREATE OR REPLACE FUNCTION public.list_quotes(
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  quote_number TEXT,
  client_id UUID,
  client_name TEXT,
  project_name TEXT,
  order_number TEXT,
  status TEXT,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC,
  valid_until DATE,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'quotes', 'crm', 'internal'
AS $$
  SELECT 
    q.id,
    q.quote_number,
    q.client_id,
    c.company_name as client_name,
    q.project_name,
    q.order_number,
    q.status::text,
    q.subtotal,
    q.tax_amount,
    q.total,
    q.valid_until,
    q.created_by,
    au.full_name as created_by_name,
    q.created_at
  FROM quotes.quotes q
  LEFT JOIN crm.clients c ON c.id = q.client_id
  LEFT JOIN internal.authorized_users au ON au.id = q.created_by
  WHERE (p_status IS NULL OR q.status::text = p_status)
    AND (p_search IS NULL OR 
         q.quote_number ILIKE '%' || p_search || '%' OR
         c.company_name ILIKE '%' || p_search || '%' OR
         q.project_name ILIKE '%' || p_search || '%')
  ORDER BY q.quote_number DESC;
$$;

-- Create function to get a single quote
CREATE OR REPLACE FUNCTION public.get_quote(p_quote_id UUID)
RETURNS TABLE (
  id UUID,
  quote_number TEXT,
  client_id UUID,
  client_name TEXT,
  project_name TEXT,
  order_number TEXT,
  status TEXT,
  subtotal NUMERIC,
  tax_rate NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC,
  valid_until DATE,
  notes TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'quotes', 'crm', 'internal'
AS $$
  SELECT 
    q.id,
    q.quote_number,
    q.client_id,
    c.company_name as client_name,
    q.project_name,
    q.order_number,
    q.status::text,
    q.subtotal,
    q.tax_rate,
    q.tax_amount,
    q.total,
    q.valid_until,
    q.notes,
    q.created_by,
    au.full_name as created_by_name,
    q.created_at,
    q.updated_at
  FROM quotes.quotes q
  LEFT JOIN crm.clients c ON c.id = q.client_id
  LEFT JOIN internal.authorized_users au ON au.id = q.created_by
  WHERE q.id = p_quote_id;
$$;

-- Create function to create a quote
CREATE OR REPLACE FUNCTION public.create_quote(
  p_client_id UUID,
  p_project_name TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'quotes'
AS $$
DECLARE
  v_quote_id UUID;
BEGIN
  INSERT INTO quotes.quotes (client_id, project_name, created_by)
  VALUES (p_client_id, p_project_name, p_created_by)
  RETURNING id INTO v_quote_id;
  
  RETURN v_quote_id;
END;
$$;