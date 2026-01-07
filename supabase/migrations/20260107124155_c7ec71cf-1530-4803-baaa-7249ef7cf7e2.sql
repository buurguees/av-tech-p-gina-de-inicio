-- Create quote_lines table for storing quote line items
CREATE TABLE quotes.quote_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES quotes.quotes(id) ON DELETE CASCADE,
  line_order INTEGER NOT NULL DEFAULT 1,
  concept TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  subtotal NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - COALESCE(discount_percent, 0) / 100)) STORED,
  tax_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - COALESCE(discount_percent, 0) / 100) * tax_rate / 100) STORED,
  total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - COALESCE(discount_percent, 0) / 100) * (1 + tax_rate / 100)) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_quote_lines_quote_id ON quotes.quote_lines(quote_id);

-- Enable RLS
ALTER TABLE quotes.quote_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for quote_lines
CREATE POLICY "Users can view quote lines"
ON quotes.quote_lines
FOR SELECT
USING (internal.is_admin() OR internal.is_manager() OR internal.is_sales());

CREATE POLICY "Users can manage quote lines"
ON quotes.quote_lines
FOR ALL
USING (internal.is_admin() OR internal.is_manager() OR internal.is_sales())
WITH CHECK (internal.is_admin() OR internal.is_manager() OR internal.is_sales());

-- Create function to get next unique quote number with locking to prevent duplicates
CREATE OR REPLACE FUNCTION quotes.get_next_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, public
AS $$
DECLARE
  v_year TEXT;
  v_max_seq INTEGER;
  v_new_number TEXT;
BEGIN
  -- Get current year (2 digits)
  v_year := TO_CHAR(NOW(), 'YY');
  
  -- Lock the quotes table to prevent concurrent inserts from getting the same number
  LOCK TABLE quotes.quotes IN SHARE ROW EXCLUSIVE MODE;
  
  -- Get the max sequence number for the current year
  SELECT COALESCE(MAX(
    CASE 
      WHEN quote_number ~ ('^P-' || v_year || '-[0-9]{6}$')
      THEN CAST(SUBSTRING(quote_number FROM 6 FOR 6) AS INTEGER)
      ELSE 0
    END
  ), 0)
  INTO v_max_seq
  FROM quotes.quotes
  WHERE quote_number LIKE 'P-' || v_year || '-%';
  
  -- Generate the new quote number
  v_new_number := 'P-' || v_year || '-' || LPAD((v_max_seq + 1)::TEXT, 6, '0');
  
  RETURN v_new_number;
END;
$$;

-- Create function to create a new quote with auto-generated number
CREATE OR REPLACE FUNCTION public.create_quote_with_number(
  p_client_id UUID,
  p_project_name TEXT DEFAULT NULL,
  p_valid_until DATE DEFAULT NULL
)
RETURNS TABLE(quote_id UUID, quote_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, internal, public
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
    project_name,
    valid_until,
    created_by,
    status
  )
  VALUES (
    v_quote_number,
    p_client_id,
    p_project_name,
    COALESCE(p_valid_until, CURRENT_DATE + INTERVAL '30 days'),
    v_user_id,
    'DRAFT'
  )
  RETURNING id INTO v_quote_id;
  
  RETURN QUERY SELECT v_quote_id, v_quote_number;
END;
$$;

-- Create function to add a line to a quote
CREATE OR REPLACE FUNCTION public.add_quote_line(
  p_quote_id UUID,
  p_concept TEXT,
  p_description TEXT DEFAULT NULL,
  p_quantity NUMERIC DEFAULT 1,
  p_unit_price NUMERIC DEFAULT 0,
  p_tax_rate NUMERIC DEFAULT 21,
  p_discount_percent NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, internal, public
AS $$
DECLARE
  v_line_id UUID;
  v_line_order INTEGER;
BEGIN
  -- Check user authorization
  IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  -- Get next line_order
  SELECT COALESCE(MAX(line_order), 0) + 1 INTO v_line_order
  FROM quotes.quote_lines
  WHERE quote_id = p_quote_id;
  
  -- Insert the line
  INSERT INTO quotes.quote_lines (
    quote_id,
    line_order,
    concept,
    description,
    quantity,
    unit_price,
    tax_rate,
    discount_percent
  )
  VALUES (
    p_quote_id,
    v_line_order,
    p_concept,
    p_description,
    p_quantity,
    p_unit_price,
    p_tax_rate,
    p_discount_percent
  )
  RETURNING id INTO v_line_id;
  
  -- Update quote totals
  PERFORM quotes.update_quote_totals(p_quote_id);
  
  RETURN v_line_id;
END;
$$;

-- Create function to update a quote line
CREATE OR REPLACE FUNCTION public.update_quote_line(
  p_line_id UUID,
  p_concept TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_quantity NUMERIC DEFAULT NULL,
  p_unit_price NUMERIC DEFAULT NULL,
  p_tax_rate NUMERIC DEFAULT NULL,
  p_discount_percent NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, internal, public
AS $$
DECLARE
  v_quote_id UUID;
BEGIN
  -- Check user authorization
  IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  -- Get quote_id for the line
  SELECT quote_id INTO v_quote_id FROM quotes.quote_lines WHERE id = p_line_id;
  
  IF v_quote_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update the line
  UPDATE quotes.quote_lines
  SET
    concept = COALESCE(p_concept, concept),
    description = COALESCE(p_description, description),
    quantity = COALESCE(p_quantity, quantity),
    unit_price = COALESCE(p_unit_price, unit_price),
    tax_rate = COALESCE(p_tax_rate, tax_rate),
    discount_percent = COALESCE(p_discount_percent, discount_percent),
    updated_at = NOW()
  WHERE id = p_line_id;
  
  -- Update quote totals
  PERFORM quotes.update_quote_totals(v_quote_id);
  
  RETURN TRUE;
END;
$$;

-- Create function to delete a quote line
CREATE OR REPLACE FUNCTION public.delete_quote_line(p_line_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, internal, public
AS $$
DECLARE
  v_quote_id UUID;
BEGIN
  -- Check user authorization
  IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  -- Get quote_id for the line
  SELECT quote_id INTO v_quote_id FROM quotes.quote_lines WHERE id = p_line_id;
  
  IF v_quote_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Delete the line
  DELETE FROM quotes.quote_lines WHERE id = p_line_id;
  
  -- Reorder line_order values
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY line_order) as new_order
    FROM quotes.quote_lines
    WHERE quote_id = v_quote_id
  )
  UPDATE quotes.quote_lines ql
  SET line_order = n.new_order
  FROM numbered n
  WHERE ql.id = n.id;
  
  -- Update quote totals
  PERFORM quotes.update_quote_totals(v_quote_id);
  
  RETURN TRUE;
END;
$$;

-- Create function to update quote totals
CREATE OR REPLACE FUNCTION quotes.update_quote_totals(p_quote_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, public
AS $$
DECLARE
  v_subtotal NUMERIC;
  v_tax_amount NUMERIC;
  v_total NUMERIC;
BEGIN
  SELECT 
    COALESCE(SUM(subtotal), 0),
    COALESCE(SUM(tax_amount), 0),
    COALESCE(SUM(total), 0)
  INTO v_subtotal, v_tax_amount, v_total
  FROM quotes.quote_lines
  WHERE quote_id = p_quote_id;
  
  UPDATE quotes.quotes
  SET 
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total = v_total,
    updated_at = NOW()
  WHERE id = p_quote_id;
END;
$$;

-- Create function to get quote lines
CREATE OR REPLACE FUNCTION public.get_quote_lines(p_quote_id UUID)
RETURNS TABLE(
  id UUID,
  line_order INTEGER,
  concept TEXT,
  description TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  tax_rate NUMERIC,
  discount_percent NUMERIC,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, internal, public
AS $$
BEGIN
  -- Check user authorization
  IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  RETURN QUERY
  SELECT 
    ql.id,
    ql.line_order,
    ql.concept,
    ql.description,
    ql.quantity,
    ql.unit_price,
    ql.tax_rate,
    ql.discount_percent,
    ql.subtotal,
    ql.tax_amount,
    ql.total
  FROM quotes.quote_lines ql
  WHERE ql.quote_id = p_quote_id
  ORDER BY ql.line_order;
END;
$$;

-- Create function to update quote basic info
CREATE OR REPLACE FUNCTION public.update_quote(
  p_quote_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_valid_until DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = quotes, internal, public
AS $$
BEGIN
  -- Check user authorization
  IF internal.get_authorized_user_id(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;
  
  UPDATE quotes.quotes
  SET 
    client_id = COALESCE(p_client_id, client_id),
    project_name = COALESCE(p_project_name, project_name),
    valid_until = COALESCE(p_valid_until, valid_until),
    notes = COALESCE(p_notes, notes),
    status = COALESCE(p_status, status),
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  RETURN FOUND;
END;
$$;