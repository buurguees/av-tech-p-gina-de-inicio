
-- ============================================================
-- ROLE-BASED DASHBOARD RPCs
-- ============================================================

-- 1. ADMIN DASHBOARD
CREATE OR REPLACE FUNCTION public.dashboard_get_admin_overview(p_period text DEFAULT 'quarter')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start date;
  v_period_end date;
  v_result json;
BEGIN
  -- Calculate period
  IF p_period = 'year' THEN
    v_period_start := date_trunc('year', CURRENT_DATE)::date;
    v_period_end := (date_trunc('year', CURRENT_DATE) + interval '1 year' - interval '1 day')::date;
  ELSE
    v_period_start := date_trunc('quarter', CURRENT_DATE)::date;
    v_period_end := (date_trunc('quarter', CURRENT_DATE) + interval '3 months' - interval '1 day')::date;
  END IF;

  SELECT json_build_object(
    'period', json_build_object('start', v_period_start, 'end', v_period_end, 'type', p_period),

    -- Row 1: Financial KPIs
    'kpis', (
      SELECT json_build_object(
        'invoiced_amount', COALESCE(SUM(CASE WHEN i.status IN ('ISSUED') AND i.issue_date BETWEEN v_period_start AND v_period_end THEN i.total ELSE 0 END), 0),
        'invoiced_count', COALESCE(COUNT(CASE WHEN i.status IN ('ISSUED') AND i.issue_date BETWEEN v_period_start AND v_period_end THEN 1 END), 0),
        'pending_collection', COALESCE(SUM(CASE WHEN i.status = 'ISSUED' AND i.pending_amount > 0 THEN i.pending_amount ELSE 0 END), 0),
        'pending_collection_count', COALESCE(COUNT(CASE WHEN i.status = 'ISSUED' AND i.pending_amount > 0 THEN 1 END), 0),
        'pending_payments_suppliers', (
          SELECT COALESCE(SUM(pi.pending_amount), 0)
          FROM sales.purchase_invoices pi
          WHERE pi.status = 'APPROVED' AND pi.pending_amount > 0
        ),
        'pending_payroll', (
          SELECT COALESCE(SUM(pr.net_amount - COALESCE(pr.paid_amount, 0)), 0)
          FROM (
            SELECT net_amount, COALESCE((SELECT SUM(pp.amount) FROM accounting.payroll_payments pp WHERE pp.payroll_run_id = r.id), 0) as paid_amount
            FROM accounting.payroll_runs r WHERE r.status = 'POSTED'
          ) pr
          WHERE pr.net_amount > COALESCE(pr.paid_amount, 0)
        ),
        'pending_financing', (
          SELECT COALESCE(SUM(ci.amount), 0)
          FROM accounting.credit_installments ci
          WHERE ci.status = 'PENDING'
        ),
        'gross_margin', (
          SELECT json_build_object(
            'revenue', COALESCE(SUM(CASE WHEN i2.status = 'ISSUED' AND i2.issue_date BETWEEN v_period_start AND v_period_end THEN i2.total ELSE 0 END), 0),
            'expenses', COALESCE((
              SELECT SUM(pi2.total) FROM sales.purchase_invoices pi2
              WHERE pi2.status IN ('APPROVED') AND pi2.issue_date BETWEEN v_period_start AND v_period_end
            ), 0)
          )
          FROM sales.invoices i2
        )
      )
      FROM sales.invoices i
    ),

    -- Row 2: Collection risk
    'collection_risk', json_build_object(
      'overdue', (
        SELECT json_build_object(
          'count', COUNT(*),
          'amount', COALESCE(SUM(pending_amount), 0)
        )
        FROM sales.invoices
        WHERE status = 'ISSUED' AND pending_amount > 0 AND due_date < CURRENT_DATE
      ),
      'due_7_days', (
        SELECT json_build_object(
          'count', COUNT(*),
          'amount', COALESCE(SUM(pending_amount), 0)
        )
        FROM sales.invoices
        WHERE status = 'ISSUED' AND pending_amount > 0
          AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '7 days'
      ),
      'top_debtors', (
        SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json)
        FROM (
          SELECT
            c.id as client_id,
            c.company_name as client_name,
            SUM(i.pending_amount) as total_debt,
            COUNT(*) as invoice_count
          FROM sales.invoices i
          JOIN crm.clients c ON c.id = i.client_id
          WHERE i.status = 'ISSUED' AND i.pending_amount > 0
          GROUP BY c.id, c.company_name
          ORDER BY SUM(i.pending_amount) DESC
          LIMIT 5
        ) d
      )
    ),

    -- Row 3: Upcoming payments (7 days)
    'upcoming_payments', json_build_object(
      'purchase_invoices', (
        SELECT COALESCE(json_agg(row_to_json(pi)), '[]'::json)
        FROM (
          SELECT
            p.id,
            p.invoice_number,
            COALESCE(p.supplier_invoice_number, p.internal_purchase_number) as reference,
            COALESCE(s.company_name, t.company_name, p.manual_beneficiary_name, 'Sin proveedor') as supplier_name,
            p.pending_amount as amount,
            p.due_date
          FROM sales.purchase_invoices p
          LEFT JOIN internal.suppliers s ON s.id = p.supplier_id
          LEFT JOIN internal.technicians t ON t.id = p.technician_id
          WHERE p.status = 'APPROVED' AND p.pending_amount > 0
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
            ecp.name as provider_name
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
            e.full_name as employee_name,
            r.net_amount,
            r.period_month,
            r.period_year
          FROM accounting.payroll_runs r
          JOIN internal.employees e ON e.id = r.employee_id
          WHERE r.status = 'POSTED'
            AND NOT EXISTS (
              SELECT 1 FROM accounting.payroll_payments pp
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
            p.full_name as partner_name,
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

    -- Row 4: Operations summary
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
            c.company_name as client_name,
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

-- 2. MANAGER DASHBOARD
CREATE OR REPLACE FUNCTION public.dashboard_get_manager_overview(p_days_ahead int DEFAULT 7)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    -- Row 1: Operational KPIs
    'kpis', json_build_object(
      'sites_today', (
        SELECT COUNT(*)
        FROM projects.project_sites ps
        WHERE ps.is_active = true
          AND ps.planned_start_date <= CURRENT_DATE
          AND COALESCE(ps.planned_end_date, ps.planned_start_date) >= CURRENT_DATE
          AND ps.site_status IN ('SCHEDULED', 'IN_PROGRESS')
      ),
      'sites_next_days', (
        SELECT COUNT(*)
        FROM projects.project_sites ps
        WHERE ps.is_active = true
          AND ps.planned_start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (p_days_ahead || ' days')::interval
          AND ps.site_status IN ('PLANNED', 'SCHEDULED')
      ),
      'sites_in_progress', (
        SELECT COUNT(*)
        FROM projects.project_sites ps
        WHERE ps.is_active = true AND ps.site_status = 'IN_PROGRESS'
      ),
      'sites_ready_to_invoice', (
        SELECT COUNT(*)
        FROM projects.project_sites ps
        WHERE ps.is_active = true AND ps.site_status = 'READY_TO_INVOICE'
      )
    ),

    -- Row 2: Intervention agenda
    'agenda', (
      SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
      FROM (
        SELECT
          ps.id as site_id,
          ps.site_name,
          ps.address,
          ps.city,
          ps.contact_name,
          ps.contact_phone,
          ps.site_status,
          ps.planned_start_date,
          ps.planned_end_date,
          ps.planned_days,
          ps.actual_start_at,
          ps.actual_end_at,
          p.id as project_id,
          p.project_number,
          p.project_name,
          p.local_name,
          c.company_name as client_name,
          c.id as client_id,
          -- Technicians assigned
          (
            SELECT COALESCE(json_agg(json_build_object(
              'id', t.id,
              'name', t.company_name,
              'role', sta.role
            )), '[]'::json)
            FROM projects.site_technician_assignments sta
            JOIN internal.technicians t ON t.id = sta.technician_id
            WHERE sta.site_id = ps.id
          ) as technicians,
          -- Last visit
          (
            SELECT json_build_object(
              'visit_date', sv.visit_date,
              'check_in_at', sv.check_in_at,
              'check_out_at', sv.check_out_at,
              'technician_name', t.company_name
            )
            FROM projects.site_visits sv
            JOIN internal.technicians t ON t.id = sv.technician_id
            WHERE sv.site_id = ps.id
            ORDER BY sv.visit_date DESC, sv.check_in_at DESC NULLS LAST
            LIMIT 1
          ) as last_visit,
          -- Days open (from actual_start or planned_start)
          CASE
            WHEN ps.actual_start_at IS NOT NULL THEN
              EXTRACT(DAY FROM NOW() - ps.actual_start_at)::int
            WHEN ps.planned_start_date IS NOT NULL AND ps.planned_start_date <= CURRENT_DATE THEN
              (CURRENT_DATE - ps.planned_start_date)
            ELSE 0
          END as days_open,
          -- Linked quote
          (
            SELECT json_build_object(
              'id', q.id,
              'quote_number', q.quote_number,
              'total', q.total
            )
            FROM quotes.quotes q
            WHERE q.site_id = ps.id AND q.status NOT IN ('REJECTED', 'EXPIRED')
            ORDER BY q.created_at DESC
            LIMIT 1
          ) as linked_quote,
          -- Linked invoice
          (
            SELECT json_build_object(
              'id', i.id,
              'invoice_number', i.invoice_number,
              'total', i.total,
              'status', i.status
            )
            FROM sales.invoices i
            WHERE i.site_id = ps.id AND i.status != 'CANCELLED'
            ORDER BY i.created_at DESC
            LIMIT 1
          ) as linked_invoice
        FROM projects.project_sites ps
        JOIN projects.projects p ON p.id = ps.project_id
        JOIN crm.clients c ON c.id = p.client_id
        WHERE ps.is_active = true
          AND ps.site_status IN ('PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'READY_TO_INVOICE', 'INVOICED')
          AND p.deleted_at IS NULL
        ORDER BY
          CASE ps.site_status
            WHEN 'IN_PROGRESS' THEN 1
            WHEN 'READY_TO_INVOICE' THEN 2
            WHEN 'SCHEDULED' THEN 3
            WHEN 'PLANNED' THEN 4
            WHEN 'INVOICED' THEN 5
            ELSE 6
          END,
          ps.planned_start_date ASC NULLS LAST
        LIMIT 50
      ) s
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 3. COMMERCIAL DASHBOARD
CREATE OR REPLACE FUNCTION public.dashboard_get_commercial_overview(p_user_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_authorized_user_id uuid;
  v_period_start date := date_trunc('quarter', CURRENT_DATE)::date;
  v_period_end date := (date_trunc('quarter', CURRENT_DATE) + interval '3 months' - interval '1 day')::date;
BEGIN
  -- Resolve authorized_user_id
  IF p_user_id IS NOT NULL THEN
    SELECT au.id INTO v_authorized_user_id
    FROM internal.authorized_users au
    WHERE au.auth_user_id = p_user_id;
  END IF;

  SELECT json_build_object(
    'period', json_build_object('start', v_period_start, 'end', v_period_end),

    -- Row 1: Commercial KPIs
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
      'invoiced_amount', (
        SELECT COALESCE(SUM(i.total), 0)
        FROM sales.invoices i
        WHERE i.status = 'ISSUED'
          AND i.issue_date BETWEEN v_period_start AND v_period_end
          AND (v_authorized_user_id IS NULL OR i.created_by = v_authorized_user_id)
      )
    ),

    -- Row 2: Pipeline
    'pipeline', (
      SELECT COALESCE(json_agg(row_to_json(q)), '[]'::json)
      FROM (
        SELECT
          q.id,
          q.quote_number,
          q.status::text as status,
          c.company_name as client_name,
          c.id as client_id,
          q.total,
          q.created_at,
          q.updated_at,
          q.valid_until,
          EXTRACT(DAY FROM NOW() - q.updated_at)::int as days_since_update,
          q.project_name
        FROM quotes.quotes q
        JOIN crm.clients c ON c.id = q.client_id
        WHERE q.status IN ('DRAFT', 'SENT')
          AND (v_authorized_user_id IS NULL OR q.assigned_to = v_authorized_user_id OR q.created_by = v_authorized_user_id)
        ORDER BY q.updated_at ASC
        LIMIT 20
      ) q
    ),

    -- Row 3: Sites ready to invoice (commercial push)
    'sites_ready', (
      SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
      FROM (
        SELECT
          ps.id as site_id,
          ps.site_name,
          p.id as project_id,
          p.project_number,
          p.project_name,
          c.company_name as client_name,
          (
            SELECT json_build_object('id', q.id, 'quote_number', q.quote_number, 'total', q.total)
            FROM quotes.quotes q WHERE q.site_id = ps.id AND q.status NOT IN ('REJECTED','EXPIRED')
            ORDER BY q.created_at DESC LIMIT 1
          ) as linked_quote
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

-- 4. TECHNICIAN DASHBOARD
CREATE OR REPLACE FUNCTION public.dashboard_get_technician_overview(p_user_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_technician_id uuid;
BEGIN
  -- Resolve technician_id from auth user
  IF p_user_id IS NOT NULL THEN
    SELECT t.id INTO v_technician_id
    FROM internal.technicians t
    JOIN internal.authorized_users au ON au.id = t.user_account_id OR au.auth_user_id = p_user_id
    LIMIT 1;
  END IF;

  SELECT json_build_object(
    -- Row 1: KPIs
    'kpis', json_build_object(
      'sites_today', (
        SELECT COUNT(DISTINCT ps.id)
        FROM projects.project_sites ps
        JOIN projects.site_technician_assignments sta ON sta.site_id = ps.id
        WHERE ps.is_active = true
          AND ps.planned_start_date <= CURRENT_DATE
          AND COALESCE(ps.planned_end_date, ps.planned_start_date) >= CURRENT_DATE
          AND ps.site_status IN ('SCHEDULED', 'IN_PROGRESS')
          AND (v_technician_id IS NULL OR sta.technician_id = v_technician_id)
      ),
      'sites_next_7_days', (
        SELECT COUNT(DISTINCT ps.id)
        FROM projects.project_sites ps
        JOIN projects.site_technician_assignments sta ON sta.site_id = ps.id
        WHERE ps.is_active = true
          AND ps.planned_start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '7 days'
          AND ps.site_status IN ('PLANNED', 'SCHEDULED')
          AND (v_technician_id IS NULL OR sta.technician_id = v_technician_id)
      ),
      'sites_in_progress', (
        SELECT COUNT(DISTINCT ps.id)
        FROM projects.project_sites ps
        JOIN projects.site_technician_assignments sta ON sta.site_id = ps.id
        WHERE ps.is_active = true
          AND ps.site_status = 'IN_PROGRESS'
          AND (v_technician_id IS NULL OR sta.technician_id = v_technician_id)
      )
    ),

    -- Row 2: My agenda
    'agenda', (
      SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
      FROM (
        SELECT
          ps.id as site_id,
          ps.site_name,
          ps.address,
          ps.city,
          ps.contact_name,
          ps.contact_phone,
          ps.contact_email,
          ps.site_status,
          ps.planned_start_date,
          ps.planned_end_date,
          ps.planned_days,
          p.id as project_id,
          p.project_number,
          p.project_name,
          p.local_name,
          c.company_name as client_name
        FROM projects.project_sites ps
        JOIN projects.site_technician_assignments sta ON sta.site_id = ps.id
        JOIN projects.projects p ON p.id = ps.project_id
        JOIN crm.clients c ON c.id = p.client_id
        WHERE ps.is_active = true
          AND ps.site_status IN ('PLANNED', 'SCHEDULED', 'IN_PROGRESS')
          AND p.deleted_at IS NULL
          AND (v_technician_id IS NULL OR sta.technician_id = v_technician_id)
        ORDER BY
          CASE ps.site_status
            WHEN 'IN_PROGRESS' THEN 1
            WHEN 'SCHEDULED' THEN 2
            WHEN 'PLANNED' THEN 3
            ELSE 4
          END,
          ps.planned_start_date ASC NULLS LAST
        LIMIT 30
      ) s
    ),

    -- Row 3: Open visits
    'open_visits', (
      SELECT COALESCE(json_agg(row_to_json(v)), '[]'::json)
      FROM (
        SELECT
          sv.id as visit_id,
          sv.visit_date,
          sv.check_in_at,
          sv.notes,
          ps.site_name,
          ps.id as site_id,
          p.project_name,
          p.project_number
        FROM projects.site_visits sv
        JOIN projects.project_sites ps ON ps.id = sv.site_id
        JOIN projects.projects p ON p.id = ps.project_id
        WHERE sv.check_out_at IS NULL
          AND (v_technician_id IS NULL OR sv.technician_id = v_technician_id)
        ORDER BY sv.check_in_at DESC
        LIMIT 10
      ) v
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.dashboard_get_admin_overview(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_get_manager_overview(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_get_commercial_overview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_get_technician_overview(uuid) TO authenticated;
