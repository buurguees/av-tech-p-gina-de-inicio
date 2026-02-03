--
-- Módulo de Compras - Fase 3: RPCs de Facturas de Compra (Lógica y Listados)
--

-- 1. RPC: Listado unificado de Facturas de Compra
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
      COALESCE(s.company_name, t.company_name) as provider_name,
      CASE 
        WHEN pi.supplier_id IS NOT NULL THEN 'SUPPLIER'
        WHEN pi.technician_id IS NOT NULL THEN 'TECHNICIAN'
        ELSE 'OTHER'
      END as provider_type,
      COALESCE(s.tax_id, t.tax_id) as provider_tax_id,
      p.name as proj_name
    FROM sales.purchase_invoices pi
    LEFT JOIN internal.suppliers s ON pi.supplier_id = s.id
    LEFT JOIN internal.technicians t ON pi.technician_id = t.id
    LEFT JOIN projects.projects p ON pi.project_id = p.id
    WHERE
      (p_search IS NULL OR
       pi.invoice_number ILIKE '%' || p_search || '%' OR
       s.company_name ILIKE '%' || p_search || '%' OR
       t.company_name ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR pi.status = p_status)
      AND (p_supplier_id IS NULL OR pi.supplier_id = p_supplier_id)
      AND (p_technician_id IS NULL OR pi.technician_id = p_technician_id)
      AND (p_document_type IS NULL OR pi.document_type = p_document_type)
  )
  SELECT
    fi.id,
    fi.invoice_number,
    fi.document_type,
    fi.issue_date,
    fi.due_date,
    fi.subtotal,
    fi.tax_amount,
    fi.retention_amount,
    fi.total,
    fi.paid_amount,
    fi.pending_amount,
    fi.status,
    COALESCE(fi.supplier_id, fi.technician_id) as provider_id,
    fi.provider_name,
    fi.provider_type,
    fi.provider_tax_id,
    fi.file_path,
    fi.project_id,
    fi.proj_name as project_name,
    fi.is_locked,
    fi.created_at,
    (SELECT COUNT(*) FROM filtered_invoices) as total_count
  FROM filtered_invoices fi
  ORDER BY fi.issue_date DESC, fi.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

-- 2. RPC: Recalcular totales de Factura de Compra
CREATE OR REPLACE FUNCTION public.recalculate_purchase_invoice(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
    v_subtotal NUMERIC(12,2);
    v_tax_amount NUMERIC(12,2);
    v_retention_percentage NUMERIC(5,2);
    v_retention_amount NUMERIC(12,2);
    v_total NUMERIC(12,2);
BEGIN
    -- Obtener retenciones de la cabecera
    SELECT retention_percentage INTO v_retention_percentage 
    FROM sales.purchase_invoices WHERE id = p_invoice_id;

    -- Calcular desde líneas
    SELECT 
      COALESCE(SUM(quantity * unit_price), 0),
      COALESCE(SUM(tax_amount), 0)
    INTO v_subtotal, v_tax_amount
    FROM sales.purchase_invoice_lines
    WHERE purchase_invoice_id = p_invoice_id;

    -- Calcular retención si aplica
    v_retention_amount := (v_subtotal * v_retention_percentage / 100);
    v_total := v_subtotal + v_tax_amount - v_retention_amount;

    -- Actualizar cabecera
    UPDATE sales.purchase_invoices
    SET 
      subtotal = v_subtotal,
      tax_amount = v_tax_amount,
      retention_amount = v_retention_amount,
      total = v_total,
      updated_at = now()
    WHERE id = p_invoice_id;
END;
$$;

-- 3. RPC: Crear Factura de Compra con líneas opcionales
CREATE OR REPLACE FUNCTION public.create_purchase_invoice(
    p_invoice_number TEXT,
    p_supplier_id UUID DEFAULT NULL,
    p_technician_id UUID DEFAULT NULL,
    p_issue_date DATE DEFAULT CURRENT_DATE,
    p_due_date DATE DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_retention_percentage NUMERIC DEFAULT 0,
    p_document_type TEXT DEFAULT 'INVOICE',
    p_expense_category TEXT DEFAULT NULL,
    p_file_path TEXT DEFAULT NULL,
    p_file_name TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, internal, public
AS $$
DECLARE
    v_invoice_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    INSERT INTO sales.purchase_invoices (
        invoice_number, supplier_id, technician_id, issue_date, due_date,
        project_id, retention_percentage, document_type, expense_category,
        file_path, file_name, notes, created_by
    ) VALUES (
        p_invoice_number, p_supplier_id, p_technician_id, p_issue_date, p_due_date,
        p_project_id, p_retention_percentage, p_document_type, p_expense_category,
        p_file_path, p_file_name, p_notes, v_user_id
    )
    RETURNING id INTO v_invoice_id;

    RETURN v_invoice_id;
END;
$$;
