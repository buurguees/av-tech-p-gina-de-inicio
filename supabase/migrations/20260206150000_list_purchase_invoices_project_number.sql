-- Migration: Add project_number to list_purchase_invoices RPC
-- The UI was showing "—" because project_number was not returned by the RPC

DROP FUNCTION IF EXISTS public.list_purchase_invoices(text, text, uuid, uuid, text, uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.list_purchase_invoices(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_technician_id uuid DEFAULT NULL,
  p_document_type text DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  invoice_number text,
  internal_purchase_number text,
  document_type text,
  issue_date date,
  due_date date,
  subtotal numeric,
  tax_amount numeric,
  retention_amount numeric,
  total numeric,
  paid_amount numeric,
  pending_amount numeric,
  status text,
  provider_id uuid,
  provider_name text,
  provider_type text,
  provider_tax_id text,
  file_path text,
  project_id uuid,
  project_name text,
  project_number text,
  is_locked boolean,
  created_at timestamp with time zone,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'sales', 'internal', 'projects', 'public'
AS $function$
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
      COALESCE(p.project_name, p.title) AS proj_name,
      p.project_number AS proj_number
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
    fi.proj_number AS project_number,
    fi.is_locked,
    fi.created_at,
    (SELECT COUNT(*)::BIGINT FROM filtered_invoices) AS total_count
  FROM filtered_invoices fi
  ORDER BY fi.issue_date DESC NULLS LAST, fi.created_at DESC NULLS LAST
  LIMIT p_page_size
  OFFSET v_offset;
END;
$function$;
