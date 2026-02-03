--
-- list_purchase_invoices: devolver internal_purchase_number (nº definitivo) y filtrar por p_project_id.
-- Así, al aprobar un ticket/factura, la lista muestra el número definitivo.
-- Hay que DROP antes porque cambia el tipo de retorno (nueva columna); existen overloads de 7 y 8 params.
--
DROP FUNCTION IF EXISTS public.list_purchase_invoices(text, text, uuid, uuid, text, integer, integer);
DROP FUNCTION IF EXISTS public.list_purchase_invoices(text, text, uuid, uuid, text, uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.list_purchase_invoices(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_technician_id UUID DEFAULT NULL,
  p_document_type TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  internal_purchase_number TEXT,
  document_type TEXT,
  issue_date DATE,
  due_date DATE,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  retention_amount NUMERIC,
  total NUMERIC,
  paid_amount NUMERIC,
  pending_amount NUMERIC,
  status TEXT,
  provider_id UUID,
  provider_name TEXT,
  provider_type TEXT,
  provider_tax_id TEXT,
  file_path TEXT,
  project_id UUID,
  project_name TEXT,
  is_locked BOOLEAN,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, internal, projects, public
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  RETURN QUERY
  WITH filtered_invoices AS (
    SELECT
      pi.*,
      COALESCE(s.company_name, t.company_name, NULLIF(trim(pi.manual_beneficiary_name), '')) AS provider_name,
      CASE
        WHEN pi.supplier_id IS NOT NULL THEN 'SUPPLIER'
        WHEN pi.technician_id IS NOT NULL THEN 'TECHNICIAN'
        ELSE 'OTHER'
      END AS provider_type,
      COALESCE(s.tax_id, t.tax_id) AS provider_tax_id,
      p.name AS proj_name
    FROM sales.purchase_invoices pi
    LEFT JOIN internal.suppliers s ON pi.supplier_id = s.id
    LEFT JOIN internal.technicians t ON pi.technician_id = t.id
    LEFT JOIN projects.projects p ON pi.project_id = p.id
    WHERE
      (p_search IS NULL OR
       pi.invoice_number ILIKE '%' || p_search || '%' OR
       pi.internal_purchase_number ILIKE '%' || p_search || '%' OR
       s.company_name ILIKE '%' || p_search || '%' OR
       t.company_name ILIKE '%' || p_search || '%' OR
       pi.manual_beneficiary_name ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR pi.status = p_status)
      AND (p_supplier_id IS NULL OR pi.supplier_id = p_supplier_id)
      AND (p_technician_id IS NULL OR pi.technician_id = p_technician_id)
      AND (p_project_id IS NULL OR pi.project_id = p_project_id)
      AND (
        p_document_type IS NULL
        OR pi.document_type = p_document_type
        OR (p_document_type = 'EXPENSE' AND pi.document_type IN ('TICKET', 'EXPENSE'))
      )
  )
  SELECT
    fi.id,
    fi.invoice_number,
    fi.internal_purchase_number,
    CASE WHEN fi.document_type = 'TICKET' THEN 'EXPENSE'::TEXT ELSE fi.document_type END,
    fi.issue_date,
    fi.due_date,
    fi.subtotal,
    fi.tax_amount,
    fi.retention_amount,
    fi.total,
    fi.paid_amount,
    fi.pending_amount,
    fi.status,
    COALESCE(fi.supplier_id, fi.technician_id) AS provider_id,
    fi.provider_name,
    fi.provider_type,
    fi.provider_tax_id,
    fi.file_path,
    fi.project_id,
    fi.proj_name AS project_name,
    fi.is_locked,
    fi.created_at,
    (SELECT COUNT(*)::BIGINT FROM filtered_invoices) AS total_count
  FROM filtered_invoices fi
  ORDER BY fi.issue_date DESC NULLS LAST, fi.created_at DESC NULLS LAST
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION public.list_purchase_invoices IS 'Lista facturas de compra/gastos; devuelve internal_purchase_number (nº definitivo asignado al aprobar).';
