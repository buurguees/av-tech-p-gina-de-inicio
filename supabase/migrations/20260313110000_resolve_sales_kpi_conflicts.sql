CREATE OR REPLACE FUNCTION public.normalize_sales_invoice_doc_status(p_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_status IN ('CANCELLED', 'RECTIFIED') THEN 'CANCELLED'
    WHEN p_status IN ('DRAFT', 'PENDING_ISSUE') THEN 'DRAFT'
    ELSE 'ISSUED'
  END;
$$;

COMMENT ON FUNCTION public.normalize_sales_invoice_doc_status(text)
IS 'Maps legacy sales invoice statuses to canonical document status: DRAFT, ISSUED, CANCELLED.';


CREATE OR REPLACE FUNCTION public.derive_sales_invoice_payment_status(
  p_status text,
  p_paid_amount numeric,
  p_total numeric
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN public.normalize_sales_invoice_doc_status(p_status) <> 'ISSUED' THEN NULL
    WHEN COALESCE(p_total, 0) > 0 AND COALESCE(p_paid_amount, 0) >= COALESCE(p_total, 0) THEN 'PAID'
    WHEN COALESCE(p_paid_amount, 0) > 0 THEN 'PARTIAL'
    ELSE 'PENDING'
  END;
$$;

COMMENT ON FUNCTION public.derive_sales_invoice_payment_status(text, numeric, numeric)
IS 'Derives canonical payment status for sales invoices from amounts instead of relying on legacy raw status.';


CREATE OR REPLACE FUNCTION public.is_sales_invoice_overdue(
  p_status text,
  p_paid_amount numeric,
  p_total numeric,
  p_due_date date,
  p_reference_date date DEFAULT CURRENT_DATE
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    public.normalize_sales_invoice_doc_status(p_status) = 'ISSUED'
    AND public.derive_sales_invoice_payment_status(p_status, p_paid_amount, p_total) <> 'PAID'
    AND p_due_date IS NOT NULL
    AND p_due_date < COALESCE(p_reference_date, CURRENT_DATE);
$$;

COMMENT ON FUNCTION public.is_sales_invoice_overdue(text, numeric, numeric, date, date)
IS 'Computes overdue condition for sales invoices from document state, amounts and due date.';


CREATE OR REPLACE FUNCTION public.get_sales_invoice_kpi_summary(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS TABLE(
  period_start date,
  period_end date,
  issued_invoice_count bigint,
  draft_invoice_count bigint,
  cancelled_invoice_count bigint,
  paid_invoice_count bigint,
  partial_invoice_count bigint,
  overdue_invoice_count bigint,
  pending_collection_count bigint,
  billed_gross_total numeric,
  billed_net_total numeric,
  billed_tax_total numeric,
  collected_total numeric,
  pending_total numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'sales'
AS $$
DECLARE
  v_start date := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::date);
  v_end date := COALESCE(
    p_end_date,
    (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date
  );
BEGIN
  RETURN QUERY
  WITH normalized AS (
    SELECT
      i.id,
      i.client_id,
      i.issue_date,
      i.due_date,
      COALESCE(i.subtotal, 0)::numeric(12,2) AS subtotal,
      COALESCE(i.tax_amount, 0)::numeric(12,2) AS tax_amount,
      COALESCE(i.total, 0)::numeric(12,2) AS total,
      COALESCE(i.paid_amount, 0)::numeric(12,2) AS paid_amount,
      GREATEST(COALESCE(i.total, 0) - COALESCE(i.paid_amount, 0), 0)::numeric(12,2) AS pending_amount,
      public.normalize_sales_invoice_doc_status(i.status) AS doc_status,
      public.derive_sales_invoice_payment_status(i.status, i.paid_amount, i.total) AS payment_status,
      public.is_sales_invoice_overdue(i.status, i.paid_amount, i.total, i.due_date, CURRENT_DATE) AS is_overdue
    FROM sales.invoices i
    WHERE i.issue_date BETWEEN v_start AND v_end
      AND (p_created_by IS NULL OR i.created_by = p_created_by)
  )
  SELECT
    v_start AS period_start,
    v_end AS period_end,
    COUNT(*) FILTER (WHERE doc_status = 'ISSUED') AS issued_invoice_count,
    COUNT(*) FILTER (WHERE doc_status = 'DRAFT') AS draft_invoice_count,
    COUNT(*) FILTER (WHERE doc_status = 'CANCELLED') AS cancelled_invoice_count,
    COUNT(*) FILTER (WHERE doc_status = 'ISSUED' AND payment_status = 'PAID') AS paid_invoice_count,
    COUNT(*) FILTER (WHERE doc_status = 'ISSUED' AND payment_status = 'PARTIAL') AS partial_invoice_count,
    COUNT(*) FILTER (WHERE doc_status = 'ISSUED' AND is_overdue) AS overdue_invoice_count,
    COUNT(*) FILTER (
      WHERE doc_status = 'ISSUED'
        AND pending_amount > 0
        AND payment_status <> 'PAID'
    ) AS pending_collection_count,
    COALESCE(SUM(total) FILTER (WHERE doc_status = 'ISSUED'), 0)::numeric(12,2) AS billed_gross_total,
    COALESCE(SUM(subtotal) FILTER (WHERE doc_status = 'ISSUED'), 0)::numeric(12,2) AS billed_net_total,
    COALESCE(SUM(tax_amount) FILTER (WHERE doc_status = 'ISSUED'), 0)::numeric(12,2) AS billed_tax_total,
    COALESCE(SUM(paid_amount) FILTER (WHERE doc_status = 'ISSUED'), 0)::numeric(12,2) AS collected_total,
    COALESCE(SUM(pending_amount) FILTER (WHERE doc_status = 'ISSUED'), 0)::numeric(12,2) AS pending_total
  FROM normalized;
END;
$$;

COMMENT ON FUNCTION public.get_sales_invoice_kpi_summary(date, date, uuid)
IS 'Canonical sales invoice KPI summary. Separates billed gross, billed net, VAT, collected and open receivables using normalized document and payment logic.';

GRANT ALL ON FUNCTION public.get_sales_invoice_kpi_summary(date, date, uuid) TO anon;
GRANT ALL ON FUNCTION public.get_sales_invoice_kpi_summary(date, date, uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_sales_invoice_kpi_summary(date, date, uuid) TO service_role;


CREATE OR REPLACE FUNCTION public.finance_list_invoices(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  invoice_number text,
  preliminary_number text,
  source_quote_id uuid,
  source_quote_number text,
  source_quote_order_number text,
  client_id uuid,
  client_name text,
  project_id uuid,
  project_number text,
  project_name text,
  client_order_number text,
  status text,
  issue_date date,
  due_date date,
  subtotal numeric,
  tax_amount numeric,
  total numeric,
  paid_amount numeric,
  pending_amount numeric,
  is_locked boolean,
  created_by uuid,
  created_by_name text,
  created_at timestamp with time zone,
  payment_bank_name text,
  payment_bank_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.invoice_number,
    i.preliminary_number,
    i.source_quote_id,
    q.quote_number AS source_quote_number,
    q.order_number AS source_quote_order_number,
    i.client_id,
    c.company_name AS client_name,
    i.project_id,
    p.project_number,
    COALESCE(p.project_name, i.project_name) AS project_name,
    COALESCE(p.client_order_number, i.order_number) AS client_order_number,
    i.status,
    i.issue_date,
    i.due_date,
    COALESCE(i.subtotal, 0) AS subtotal,
    COALESCE(i.tax_amount, 0) AS tax_amount,
    COALESCE(i.total, 0) AS total,
    COALESCE(i.paid_amount, 0) AS paid_amount,
    GREATEST(COALESCE(i.total, 0) - COALESCE(i.paid_amount, 0), 0) AS pending_amount,
    COALESCE(i.is_locked, false) AS is_locked,
    i.created_by,
    au.full_name AS created_by_name,
    i.created_at,
    (
      SELECT ba.bank_name
      FROM (
        SELECT
          ip.company_bank_account_id,
          ip.payment_date,
          (
            SELECT bank_acc->>'bank'
            FROM internal.company_preferences cp,
            jsonb_array_elements(cp.bank_accounts) AS bank_acc
            WHERE bank_acc->>'id' = ip.company_bank_account_id
            LIMIT 1
          ) AS bank_name
        FROM sales.invoice_payments ip
        WHERE ip.invoice_id = i.id
          AND ip.is_confirmed = true
          AND ip.company_bank_account_id IS NOT NULL
        ORDER BY ip.payment_date DESC, ip.created_at DESC
        LIMIT 1
      ) ba
    ) AS payment_bank_name,
    (
      SELECT ip.company_bank_account_id
      FROM sales.invoice_payments ip
      WHERE ip.invoice_id = i.id
        AND ip.is_confirmed = true
        AND ip.company_bank_account_id IS NOT NULL
      ORDER BY ip.payment_date DESC, ip.created_at DESC
      LIMIT 1
    ) AS payment_bank_id
  FROM sales.invoices i
  LEFT JOIN crm.clients c ON c.id = i.client_id
  LEFT JOIN projects.projects p ON p.id = i.project_id
  LEFT JOIN quotes.quotes q ON q.id = i.source_quote_id
  LEFT JOIN internal.authorized_users au ON au.id = i.created_by
  WHERE (
      p_status IS NULL
      OR i.status = p_status
      OR public.normalize_sales_invoice_doc_status(i.status) = p_status
    )
    AND (
      p_search IS NULL
      OR i.invoice_number ILIKE '%' || p_search || '%'
      OR i.preliminary_number ILIKE '%' || p_search || '%'
      OR c.company_name ILIKE '%' || p_search || '%'
      OR COALESCE(p.project_name, i.project_name) ILIKE '%' || p_search || '%'
      OR p.project_number ILIKE '%' || p_search || '%'
    )
  ORDER BY i.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.finance_list_invoices(text, text)
IS 'Lists sales invoices with canonical-compatible status filtering and derived pending amount.';


CREATE OR REPLACE FUNCTION public.dashboard_get_admin_overview(p_period text DEFAULT 'quarter'::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_period_start date;
  v_period_end date;
  v_result json;
  v_sales_kpis record;
  v_profit record;
BEGIN
  IF p_period = 'year' THEN
    v_period_start := date_trunc('year', CURRENT_DATE)::date;
    v_period_end := (date_trunc('year', CURRENT_DATE) + interval '1 year' - interval '1 day')::date;
  ELSE
    v_period_start := date_trunc('quarter', CURRENT_DATE)::date;
    v_period_end := (date_trunc('quarter', CURRENT_DATE) + interval '3 months' - interval '1 day')::date;
  END IF;

  SELECT * INTO v_sales_kpis
  FROM public.get_sales_invoice_kpi_summary(v_period_start, v_period_end, NULL)
  LIMIT 1;

  SELECT * INTO v_profit
  FROM public.get_period_profit_summary(v_period_start, v_period_end)
  LIMIT 1;

  SELECT json_build_object(
    'period', json_build_object('start', v_period_start, 'end', v_period_end, 'type', p_period),

    'kpis', json_build_object(
      'invoiced_amount', COALESCE(v_sales_kpis.billed_gross_total, 0),
      'invoiced_net_amount', COALESCE(v_sales_kpis.billed_net_total, 0),
      'invoiced_tax_amount', COALESCE(v_sales_kpis.billed_tax_total, 0),
      'invoiced_count', COALESCE(v_sales_kpis.issued_invoice_count, 0),
      'pending_collection', COALESCE(v_sales_kpis.pending_total, 0),
      'pending_collection_count', COALESCE(v_sales_kpis.pending_collection_count, 0),
      'pending_payments_suppliers', (
        SELECT COALESCE(SUM(pi.pending_amount), 0)
        FROM sales.purchase_invoices pi
        WHERE pi.status IN ('APPROVED', 'REGISTERED') AND pi.pending_amount > 0
      ),
      'pending_payroll', (
        SELECT COALESCE(SUM(pr.net_amount - COALESCE(pr.paid_amount, 0)), 0)
        FROM (
          SELECT
            net_amount,
            COALESCE((
              SELECT SUM(pp.amount)
              FROM accounting.payroll_payments pp
              WHERE pp.payroll_run_id = r.id
            ), 0) AS paid_amount
          FROM accounting.payroll_runs r
          WHERE r.status = 'POSTED'
        ) pr
        WHERE pr.net_amount > COALESCE(pr.paid_amount, 0)
      ),
      'pending_financing', (
        SELECT COALESCE(SUM(ci.amount), 0)
        FROM accounting.credit_installments ci
        WHERE ci.status = 'PENDING'
      ),
      'gross_margin', json_build_object(
        'revenue', COALESCE(v_profit.total_revenue, 0),
        'expenses', COALESCE(v_profit.operating_expenses, 0)
      )
    ),

    'collection_risk', json_build_object(
      'overdue', (
        SELECT json_build_object(
          'count', COUNT(*),
          'amount', COALESCE(SUM(GREATEST(COALESCE(i.total, 0) - COALESCE(i.paid_amount, 0), 0)), 0)
        )
        FROM sales.invoices i
        WHERE public.normalize_sales_invoice_doc_status(i.status) = 'ISSUED'
          AND GREATEST(COALESCE(i.total, 0) - COALESCE(i.paid_amount, 0), 0) > 0
          AND public.is_sales_invoice_overdue(i.status, i.paid_amount, i.total, i.due_date, CURRENT_DATE)
      ),
      'due_7_days', (
        SELECT json_build_object(
          'count', COUNT(*),
          'amount', COALESCE(SUM(GREATEST(COALESCE(i.total, 0) - COALESCE(i.paid_amount, 0), 0)), 0)
        )
        FROM sales.invoices i
        WHERE public.normalize_sales_invoice_doc_status(i.status) = 'ISSUED'
          AND GREATEST(COALESCE(i.total, 0) - COALESCE(i.paid_amount, 0), 0) > 0
          AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
      ),
      'top_debtors', (
        SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json)
        FROM (
          SELECT
            c.id AS client_id,
            c.company_name AS client_name,
            SUM(GREATEST(COALESCE(i.total, 0) - COALESCE(i.paid_amount, 0), 0)) AS total_debt,
            COUNT(*) AS invoice_count
          FROM sales.invoices i
          JOIN crm.clients c ON c.id = i.client_id
          WHERE public.normalize_sales_invoice_doc_status(i.status) = 'ISSUED'
            AND GREATEST(COALESCE(i.total, 0) - COALESCE(i.paid_amount, 0), 0) > 0
          GROUP BY c.id, c.company_name
          ORDER BY SUM(GREATEST(COALESCE(i.total, 0) - COALESCE(i.paid_amount, 0), 0)) DESC
          LIMIT 5
        ) d
      )
    ),

    'upcoming_payments', json_build_object(
      'purchase_invoices', (
        SELECT COALESCE(json_agg(row_to_json(pi)), '[]'::json)
        FROM (
          SELECT
            p.id,
            p.invoice_number,
            COALESCE(p.supplier_invoice_number, p.internal_purchase_number) AS reference,
            COALESCE(s.company_name, t.company_name, p.manual_beneficiary_name, 'Sin proveedor') AS supplier_name,
            p.pending_amount AS amount,
            p.due_date
          FROM sales.purchase_invoices p
          LEFT JOIN internal.suppliers s ON s.id = p.supplier_id
          LEFT JOIN internal.technicians t ON t.id = p.technician_id
          WHERE p.status IN ('APPROVED', 'REGISTERED') AND p.pending_amount > 0
            AND p.due_date <= CURRENT_DATE + interval '7 days'
          ORDER BY p.due_date ASC
          LIMIT 10
        ) pi
      ),
      'credit_installments', (
        SELECT COALESCE(json_agg(row_to_json(ci)), '[]'::json)
        FROM (
          SELECT
            ci.id,
            ci.installment_number,
            ci.amount,
            ci.due_date,
            ecp.name AS provider_name
          FROM accounting.credit_installments ci
          JOIN accounting.credit_operations co ON co.id = ci.operation_id
          JOIN accounting.external_credit_providers ecp ON ecp.id = co.provider_id
          WHERE ci.status = 'PENDING'
            AND ci.due_date <= CURRENT_DATE + interval '7 days'
          ORDER BY ci.due_date ASC
          LIMIT 10
        ) ci
      ),
      'payrolls', (
        SELECT COALESCE(json_agg(row_to_json(pr)), '[]'::json)
        FROM (
          SELECT
            r.id,
            r.payroll_number,
            e.full_name AS employee_name,
            r.net_amount,
            r.period_month,
            r.period_year
          FROM accounting.payroll_runs r
          JOIN internal.employees e ON e.id = r.employee_id
          WHERE r.status = 'POSTED'
            AND NOT EXISTS (
              SELECT 1
              FROM accounting.payroll_payments pp
              WHERE pp.payroll_run_id = r.id
            )
          ORDER BY r.period_year DESC, r.period_month DESC
          LIMIT 10
        ) pr
      ),
      'partner_compensations', (
        SELECT COALESCE(json_agg(row_to_json(pc)), '[]'::json)
        FROM (
          SELECT
            pcr.id,
            pcr.compensation_number,
            p.full_name AS partner_name,
            pcr.net_amount,
            pcr.period_month,
            pcr.period_year
          FROM accounting.partner_compensation_runs pcr
          JOIN internal.partners p ON p.id = pcr.partner_id
          WHERE pcr.status = 'POSTED'
            AND COALESCE(pcr.paid_amount, 0) < pcr.net_amount
          ORDER BY pcr.period_year DESC, pcr.period_month DESC
          LIMIT 10
        ) pc
      )
    ),

    'operations', json_build_object(
      'sites_ready_to_invoice', (
        SELECT COUNT(*)
        FROM projects.project_sites ps
        WHERE ps.site_status = 'READY_TO_INVOICE' AND ps.is_active = true
      ),
      'projects_in_progress', (
        SELECT COUNT(*)
        FROM projects.projects p
        WHERE p.status = 'IN_PROGRESS' AND p.deleted_at IS NULL
      ),
      'large_quotes_negotiation', (
        SELECT COALESCE(json_agg(row_to_json(q)), '[]'::json)
        FROM (
          SELECT
            q.id,
            q.quote_number,
            c.company_name AS client_name,
            q.total,
            q.created_at
          FROM quotes.quotes q
          JOIN crm.clients c ON c.id = q.client_id
          WHERE q.status IN ('DRAFT', 'SENT')
          ORDER BY q.total DESC NULLS LAST
          LIMIT 5
        ) q
      )
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;


CREATE OR REPLACE FUNCTION public.dashboard_get_commercial_overview(p_user_id uuid DEFAULT NULL::uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
  v_authorized_user_id uuid;
  v_period_start date := date_trunc('quarter', CURRENT_DATE)::date;
  v_period_end date := (date_trunc('quarter', CURRENT_DATE) + interval '3 months' - interval '1 day')::date;
  v_sales_kpis record;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT au.id INTO v_authorized_user_id
    FROM internal.authorized_users au
    WHERE au.auth_user_id = p_user_id;
  END IF;

  SELECT * INTO v_sales_kpis
  FROM public.get_sales_invoice_kpi_summary(v_period_start, v_period_end, v_authorized_user_id)
  LIMIT 1;

  SELECT json_build_object(
    'period', json_build_object('start', v_period_start, 'end', v_period_end),

    'kpis', json_build_object(
      'quoted_amount', (
        SELECT COALESCE(SUM(q.total), 0)
        FROM quotes.quotes q
        WHERE q.created_at::date BETWEEN v_period_start AND v_period_end
          AND (v_authorized_user_id IS NULL OR q.assigned_to = v_authorized_user_id OR q.created_by = v_authorized_user_id)
      ),
      'quotes_in_negotiation', (
        SELECT COUNT(*)
        FROM quotes.quotes q
        WHERE q.status IN ('DRAFT', 'SENT')
          AND (v_authorized_user_id IS NULL OR q.assigned_to = v_authorized_user_id OR q.created_by = v_authorized_user_id)
      ),
      'conversion_rate', (
        SELECT CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(
            (COUNT(CASE WHEN q.status IN ('APPROVED', 'INVOICED') THEN 1 END)::numeric /
             COUNT(*)::numeric) * 100, 1
          )
        END
        FROM quotes.quotes q
        WHERE q.created_at::date BETWEEN v_period_start AND v_period_end
          AND (v_authorized_user_id IS NULL OR q.assigned_to = v_authorized_user_id OR q.created_by = v_authorized_user_id)
      ),
      'invoiced_amount', COALESCE(v_sales_kpis.billed_gross_total, 0)
    ),

    'pipeline', (
      SELECT COALESCE(json_agg(row_to_json(q)), '[]'::json)
      FROM (
        SELECT
          q.id,
          q.quote_number,
          q.status::text AS status,
          c.company_name AS client_name,
          c.id AS client_id,
          q.total,
          q.created_at,
          q.updated_at,
          q.valid_until,
          EXTRACT(DAY FROM NOW() - q.updated_at)::int AS days_since_update,
          q.project_name
        FROM quotes.quotes q
        JOIN crm.clients c ON c.id = q.client_id
        WHERE q.status IN ('DRAFT', 'SENT')
          AND (v_authorized_user_id IS NULL OR q.assigned_to = v_authorized_user_id OR q.created_by = v_authorized_user_id)
        ORDER BY q.updated_at ASC
        LIMIT 20
      ) q
    ),

    'sites_ready', (
      SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
      FROM (
        SELECT
          ps.id AS site_id,
          ps.site_name,
          p.id AS project_id,
          p.project_number,
          p.project_name,
          c.company_name AS client_name,
          (
            SELECT json_build_object('id', q.id, 'quote_number', q.quote_number, 'total', q.total)
            FROM quotes.quotes q
            WHERE q.site_id = ps.id AND q.status NOT IN ('REJECTED', 'EXPIRED')
            ORDER BY q.created_at DESC
            LIMIT 1
          ) AS linked_quote
        FROM projects.project_sites ps
        JOIN projects.projects p ON p.id = ps.project_id
        JOIN crm.clients c ON c.id = p.client_id
        WHERE ps.site_status = 'READY_TO_INVOICE' AND ps.is_active = true AND p.deleted_at IS NULL
        ORDER BY ps.updated_at ASC
        LIMIT 20
      ) s
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;


CREATE OR REPLACE FUNCTION public.finance_get_period_summary(
  p_start_date date DEFAULT NULL::date,
  p_end_date date DEFAULT NULL::date
)
RETURNS TABLE(
  period_start date,
  period_end date,
  total_invoiced numeric,
  total_paid numeric,
  total_pending numeric,
  invoice_count bigint,
  paid_invoice_count bigint,
  partial_invoice_count bigint,
  overdue_invoice_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start date;
  v_end date;
BEGIN
  v_start := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::date);
  v_end := COALESCE(
    p_end_date,
    (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date
  );

  RETURN QUERY
  SELECT
    s.period_start,
    s.period_end,
    s.billed_gross_total AS total_invoiced,
    s.collected_total AS total_paid,
    s.pending_total AS total_pending,
    s.issued_invoice_count AS invoice_count,
    s.paid_invoice_count,
    s.partial_invoice_count,
    s.overdue_invoice_count
  FROM public.get_sales_invoice_kpi_summary(v_start, v_end, NULL) s;
END;
$$;


CREATE OR REPLACE FUNCTION public.get_fiscal_quarter_data(p_year integer, p_quarter integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'sales', 'crm'
AS $$
DECLARE
  result json;
  quarter_start date;
  quarter_end date;
BEGIN
  quarter_start := make_date(p_year, (p_quarter - 1) * 3 + 1, 1);
  quarter_end := (quarter_start + interval '3 months' - interval '1 day')::date;

  SELECT json_build_object(
    'quarter_start', quarter_start,
    'quarter_end', quarter_end,
    'ventas', COALESCE((
      SELECT json_agg(row_to_json(v))
      FROM (
        SELECT
          i.invoice_number,
          i.issue_date,
          i.status,
          COALESCE(c.company_name, 'Sin cliente') AS client_name,
          c.tax_id AS client_nif,
          i.subtotal::numeric(12,2),
          i.tax_amount::numeric(12,2),
          i.total::numeric(12,2),
          i.paid_amount::numeric(12,2),
          GREATEST(COALESCE(i.total, 0) - COALESCE(i.paid_amount, 0), 0)::numeric(12,2) AS pending_amount
        FROM sales.invoices i
        LEFT JOIN crm.clients c ON c.id = i.client_id
        WHERE i.issue_date BETWEEN quarter_start AND quarter_end
          AND public.normalize_sales_invoice_doc_status(i.status) = 'ISSUED'
        ORDER BY i.issue_date, i.invoice_number
      ) v
    ), '[]'::json),
    'compras', COALESCE((
      SELECT json_agg(row_to_json(cc))
      FROM (
        SELECT
          pi.invoice_number,
          pi.internal_purchase_number,
          pi.supplier_invoice_number,
          pi.issue_date,
          pi.status,
          pi.document_type,
          COALESCE(pi.supplier_name, 'Sin proveedor') AS supplier_name,
          pi.supplier_tax_id AS supplier_nif,
          pi.subtotal::numeric(12,2),
          pi.tax_amount::numeric(12,2),
          pi.withholding_amount::numeric(12,2),
          pi.retention_amount::numeric(12,2),
          pi.total::numeric(12,2),
          pi.paid_amount::numeric(12,2),
          pi.pending_amount::numeric(12,2),
          pi.expense_category
        FROM sales.purchase_invoices pi
        WHERE pi.issue_date BETWEEN quarter_start AND quarter_end
          AND pi.status IN ('APPROVED', 'CONFIRMED', 'PAID', 'PARTIALLY_PAID')
        ORDER BY pi.document_type, pi.issue_date, pi.invoice_number
      ) cc
    ), '[]'::json),
    'totales', (
      SELECT json_build_object(
        'ventas_subtotal', COALESCE(SUM(CASE WHEN src = 'venta' THEN subtotal END), 0)::numeric(12,2),
        'ventas_iva', COALESCE(SUM(CASE WHEN src = 'venta' THEN tax_amount END), 0)::numeric(12,2),
        'ventas_total', COALESCE(SUM(CASE WHEN src = 'venta' THEN total END), 0)::numeric(12,2),
        'compras_subtotal', COALESCE(SUM(CASE WHEN src = 'compra' AND dtype = 'INVOICE' THEN subtotal END), 0)::numeric(12,2),
        'compras_iva', COALESCE(SUM(CASE WHEN src = 'compra' AND dtype = 'INVOICE' THEN tax_amount END), 0)::numeric(12,2),
        'compras_retencion', COALESCE(SUM(CASE WHEN src = 'compra' AND dtype = 'INVOICE' THEN COALESCE(withholding_amount, 0) + COALESCE(retention_amount, 0) END), 0)::numeric(12,2),
        'compras_total', COALESCE(SUM(CASE WHEN src = 'compra' AND dtype = 'INVOICE' THEN total END), 0)::numeric(12,2),
        'tickets_subtotal', COALESCE(SUM(CASE WHEN src = 'compra' AND dtype = 'EXPENSE' THEN subtotal END), 0)::numeric(12,2),
        'tickets_iva', COALESCE(SUM(CASE WHEN src = 'compra' AND dtype = 'EXPENSE' THEN tax_amount END), 0)::numeric(12,2),
        'tickets_total', COALESCE(SUM(CASE WHEN src = 'compra' AND dtype = 'EXPENSE' THEN total END), 0)::numeric(12,2),
        'iva_repercutido', COALESCE(SUM(CASE WHEN src = 'venta' THEN tax_amount END), 0)::numeric(12,2),
        'iva_soportado', COALESCE(SUM(CASE WHEN src = 'compra' THEN tax_amount END), 0)::numeric(12,2),
        'iva_a_declarar', (
          COALESCE(SUM(CASE WHEN src = 'venta' THEN tax_amount END), 0)
          - COALESCE(SUM(CASE WHEN src = 'compra' THEN tax_amount END), 0)
        )::numeric(12,2)
      )
      FROM (
        SELECT
          'venta' AS src,
          NULL AS dtype,
          i.subtotal,
          i.tax_amount,
          i.total,
          0::numeric AS withholding_amount,
          0::numeric AS retention_amount
        FROM sales.invoices i
        WHERE i.issue_date BETWEEN quarter_start AND quarter_end
          AND public.normalize_sales_invoice_doc_status(i.status) = 'ISSUED'
        UNION ALL
        SELECT
          'compra',
          pi.document_type,
          pi.subtotal,
          pi.tax_amount,
          pi.total,
          pi.withholding_amount,
          pi.retention_amount
        FROM sales.purchase_invoices pi
        WHERE pi.issue_date BETWEEN quarter_start AND quarter_end
          AND pi.status IN ('APPROVED', 'CONFIRMED', 'PAID', 'PARTIALLY_PAID')
      ) agg
    )
  ) INTO result;

  RETURN result;
END;
$$;
