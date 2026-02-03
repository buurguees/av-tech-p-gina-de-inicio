-- Migration: Purchase Invoice Lines
-- Description: Creates the purchasing.invoice_lines table and related RPCs

-- Table: purchasing.invoice_lines
CREATE TABLE IF NOT EXISTS purchasing.invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES purchasing.invoices(id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE purchasing.invoice_lines ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read access for authenticated users" ON purchasing.invoice_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON purchasing.invoice_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update access for authenticated users" ON purchasing.invoice_lines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete access for authenticated users" ON purchasing.invoice_lines FOR DELETE TO authenticated USING (true);

-- RPCs
CREATE OR REPLACE FUNCTION public.add_purchase_invoice_line(
    p_invoice_id UUID,
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
SET search_path = purchasing, public
AS $$
DECLARE
    v_line_id UUID;
    v_order INTEGER;
BEGIN
    SELECT COALESCE(MAX(line_order), 0) + 1 INTO v_order
    FROM purchasing.invoice_lines
    WHERE invoice_id = p_invoice_id;

    INSERT INTO purchasing.invoice_lines (
        invoice_id, line_order, concept, description,
        quantity, unit_price, tax_rate, discount_percent
    ) VALUES (
        p_invoice_id, v_order, p_concept, p_description,
        p_quantity, p_unit_price, p_tax_rate, p_discount_percent
    )
    RETURNING id INTO v_line_id;

    RETURN v_line_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_purchase_invoice_line(
    p_line_id UUID,
    p_concept TEXT,
    p_description TEXT DEFAULT NULL,
    p_quantity NUMERIC DEFAULT 1,
    p_unit_price NUMERIC DEFAULT 0,
    p_tax_rate NUMERIC DEFAULT 21,
    p_discount_percent NUMERIC DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = purchasing, public
AS $$
BEGIN
    UPDATE purchasing.invoice_lines
    SET
        concept = p_concept,
        description = p_description,
        quantity = p_quantity,
        unit_price = p_unit_price,
        tax_rate = p_tax_rate,
        discount_percent = p_discount_percent,
        updated_at = NOW()
    WHERE id = p_line_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_purchase_invoice_line(p_line_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = purchasing, public
AS $$
BEGIN
    DELETE FROM purchasing.invoice_lines
    WHERE id = p_line_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_purchase_invoice_lines(p_invoice_id UUID)
RETURNS TABLE (
    id UUID,
    invoice_id UUID,
    line_order INTEGER,
    concept TEXT,
    description TEXT,
    quantity NUMERIC,
    unit_price NUMERIC,
    tax_rate NUMERIC,
    discount_percent NUMERIC,
    subtotal NUMERIC,
    tax_amount NUMERIC,
    total NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = purchasing, public
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM purchasing.invoice_lines
    WHERE invoice_lines.invoice_id = p_invoice_id
    ORDER BY line_order;
END;
$$;
