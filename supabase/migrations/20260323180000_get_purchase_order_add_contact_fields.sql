-- Migration: get_purchase_order — añadir campos de contacto de proveedor/técnico y local_name del proyecto
-- Para mostrar info completa del receptor en el PDF del pedido de compra.

DROP FUNCTION IF EXISTS public.get_purchase_order(uuid);

CREATE OR REPLACE FUNCTION public.get_purchase_order(p_order_id uuid)
  RETURNS TABLE(
    id uuid, po_number text, status text,
    supplier_id uuid, supplier_name text, supplier_tax_id text,
    supplier_address text, supplier_city text, supplier_postal_code text,
    supplier_province text, supplier_country text,
    supplier_email text, supplier_phone text,
    technician_id uuid, technician_name text, technician_tax_id text,
    technician_address text, technician_city text, technician_postal_code text,
    technician_province text, technician_country text,
    technician_email text, technician_phone text, technician_contact_name text,
    project_id uuid, project_name text, project_number text, project_local_name text,
    issue_date date, expected_start_date date, expected_end_date date,
    actual_start_date date, actual_end_date date,
    subtotal numeric, tax_rate numeric, tax_amount numeric,
    withholding_rate numeric, withholding_amount numeric, total numeric,
    notes text, internal_notes text,
    approved_at timestamptz, approved_by uuid, approved_by_name text,
    linked_purchase_invoice_id uuid,
    created_at timestamptz, updated_at timestamptz,
    created_by uuid, created_by_name text,
    site_id uuid, site_name text, site_city text
  )
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    po.id, po.po_number, po.status::TEXT,
    po.supplier_id,
    COALESCE(s.company_name, '')::TEXT,
    COALESCE(s.tax_id, '')::TEXT,
    COALESCE(s.address, '')::TEXT,
    COALESCE(s.city, '')::TEXT,
    COALESCE(s.postal_code, '')::TEXT,
    COALESCE(s.province, '')::TEXT,
    COALESCE(s.country, '')::TEXT,
    COALESCE(s.contact_email, '')::TEXT,
    COALESCE(s.contact_phone, '')::TEXT,
    po.technician_id,
    COALESCE(t.company_name, '')::TEXT,
    COALESCE(t.tax_id, '')::TEXT,
    COALESCE(t.address, '')::TEXT,
    COALESCE(t.city, '')::TEXT,
    COALESCE(t.postal_code, '')::TEXT,
    COALESCE(t.province, '')::TEXT,
    COALESCE(t.country, '')::TEXT,
    COALESCE(t.contact_email, t.billing_email, '')::TEXT,
    COALESCE(t.contact_phone, '')::TEXT,
    COALESCE(t.contact_name, '')::TEXT,
    po.project_id,
    COALESCE(pp.project_name, '')::TEXT,
    COALESCE(pp.project_number, '')::TEXT,
    COALESCE(pp.local_name, '')::TEXT,
    po.issue_date, po.expected_start_date, po.expected_end_date,
    po.actual_start_date, po.actual_end_date,
    po.subtotal, po.tax_rate, po.tax_amount,
    po.withholding_rate, po.withholding_amount, po.total,
    po.notes, po.internal_notes,
    po.approved_at, po.approved_by, COALESCE(ab.full_name, '')::TEXT,
    po.linked_purchase_invoice_id,
    po.created_at, po.updated_at,
    po.created_by, COALESCE(au.full_name, '')::TEXT,
    po.site_id, ps.site_name, ps.city
  FROM sales.purchase_orders po
  LEFT JOIN internal.suppliers s ON s.id = po.supplier_id
  LEFT JOIN internal.technicians t ON t.id = po.technician_id
  LEFT JOIN projects.projects pp ON pp.id = po.project_id
  LEFT JOIN internal.authorized_users au ON au.id = po.created_by
  LEFT JOIN internal.authorized_users ab ON ab.id = po.approved_by
  LEFT JOIN projects.project_sites ps ON ps.id = po.site_id
  WHERE po.id = p_order_id;
END;
$$;

GRANT ALL ON FUNCTION public.get_purchase_order(uuid) TO anon, authenticated, service_role;
