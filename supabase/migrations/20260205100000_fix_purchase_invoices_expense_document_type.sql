--
-- Permitir document_type 'EXPENSE' en sales.purchase_invoices y que list_purchase_invoices
-- acepte p_document_type = 'EXPENSE' y devuelva gastos (TICKET/EXPENSE) de forma consistente.
-- El frontend usa 'EXPENSE' para la sección Gastos; la BD puede tener 'TICKET' o 'EXPENSE'.
--

-- 1. Sustituir el CHECK de document_type para incluir 'EXPENSE'
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  FOR v_conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'sales'
      AND t.relname = 'purchase_invoices'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%document_type%'
  LOOP
    EXECUTE format('ALTER TABLE sales.purchase_invoices DROP CONSTRAINT IF EXISTS %I', v_conname);
  END LOOP;
END $$;

ALTER TABLE sales.purchase_invoices
  ADD CONSTRAINT purchase_invoices_document_type_check
  CHECK (document_type IN ('INVOICE', 'TICKET', 'EXPENSE'));

-- 2. Datos existentes: filas sin proveedor ni técnico con document_type no TICKET/EXPENSE → TICKET (legacy)
UPDATE sales.purchase_invoices
SET document_type = 'TICKET'
WHERE supplier_id IS NULL AND technician_id IS NULL
  AND (document_type IS NULL OR document_type NOT IN ('TICKET', 'EXPENSE'));

-- 3. Actualizar check_provider_type_requirement para aceptar EXPENSE (tickets sin proveedor/técnico)
ALTER TABLE sales.purchase_invoices DROP CONSTRAINT IF EXISTS check_provider_type_requirement;

ALTER TABLE sales.purchase_invoices
  ADD CONSTRAINT check_provider_type_requirement
  CHECK (
    (supplier_id IS NOT NULL AND technician_id IS NULL) OR
    (supplier_id IS NULL AND technician_id IS NOT NULL) OR
    (supplier_id IS NULL AND technician_id IS NULL AND document_type IN ('TICKET', 'EXPENSE'))
  );

-- 4. list_purchase_invoices: aceptar p_document_type = 'EXPENSE' y devolver document_type normalizado (TICKET → EXPENSE)
CREATE OR REPLACE FUNCTION public.list_purchase_invoices(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_technician_id UUID DEFAULT NULL,
  p_document_type TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
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
       s.company_name ILIKE '%' || p_search || '%' OR
       t.company_name ILIKE '%' || p_search || '%' OR
       pi.manual_beneficiary_name ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR pi.status = p_status)
      AND (p_supplier_id IS NULL OR pi.supplier_id = p_supplier_id)
      AND (p_technician_id IS NULL OR pi.technician_id = p_technician_id)
      AND (
        p_document_type IS NULL
        OR pi.document_type = p_document_type
        OR (p_document_type = 'EXPENSE' AND pi.document_type IN ('TICKET', 'EXPENSE'))
      )
  )
  SELECT
    fi.id,
    fi.invoice_number,
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

COMMENT ON CONSTRAINT purchase_invoices_document_type_check ON sales.purchase_invoices IS 'INVOICE=factura proveedor, TICKET/EXPENSE=gastos/tickets (frontend usa EXPENSE).';
