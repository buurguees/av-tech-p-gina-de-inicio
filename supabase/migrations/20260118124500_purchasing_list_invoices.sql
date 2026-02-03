-- Migration: List Purchase Invoices RPC
-- Description: Creates a function to list purchase invoices with supplier/technician names

CREATE OR REPLACE FUNCTION public.list_purchase_invoices(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  date DATE,
  due_date DATE,
  tax_base NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC,
  status TEXT,
  provider_name TEXT,
  provider_type TEXT,
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
  WITH filtered_invoices AS (
    SELECT 
        i.*,
        COALESCE(s.company_name, t.company_name) as provider_name,
        CASE 
            WHEN i.supplier_id IS NOT NULL THEN 'SUPPLIER'
            WHEN i.technician_id IS NOT NULL THEN 'TECHNICIAN'
            ELSE 'UNKNOWN'
        END as provider_type
    FROM purchasing.invoices i
    LEFT JOIN purchasing.suppliers s ON i.supplier_id = s.id
    LEFT JOIN purchasing.technicians t ON i.technician_id = t.id
    WHERE
      (p_search IS NULL OR
       i.invoice_number ILIKE '%' || p_search || '%' OR
       s.company_name ILIKE '%' || p_search || '%' OR
       t.company_name ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR i.status = p_status)
  )
  SELECT
    fi.id,
    fi.invoice_number,
    fi.date,
    fi.due_date,
    fi.tax_base,
    fi.tax_amount,
    fi.total,
    fi.status,
    fi.provider_name,
    fi.provider_type,
    fi.created_at,
    (SELECT COUNT(*) FROM filtered_invoices) as total_count
  FROM filtered_invoices fi
  ORDER BY fi.date DESC, fi.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

-- Also add a summary RPC for dashboard if needed, but for now we can use this.
