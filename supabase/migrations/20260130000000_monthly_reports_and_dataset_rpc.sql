-- =====================================================
-- MIGRACIÓN: Sistema de Informes Mensuales Automáticos
-- Fecha: 2026-01-30
-- Descripción: Crea las tablas y RPCs necesarias para el
-- sistema de informes mensuales automáticos con PDF y email
-- =====================================================

-- =====================================================
-- 1. Tabla accounting.monthly_reports
-- Almacena los informes mensuales generados
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting.monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  period_closure_id UUID REFERENCES accounting.period_closures(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'GENERATING', 'READY', 'EMAIL_SENDING', 'SENT', 'FAILED')),
  storage_path TEXT,
  pdf_hash TEXT,
  dataset_version TEXT DEFAULT 'v1',
  template_version TEXT DEFAULT 'v1',
  generated_at TIMESTAMPTZ,
  generated_by UUID REFERENCES internal.authorized_users(id),
  sent_at TIMESTAMPTZ,
  sent_to TEXT[],
  sent_cc TEXT[],
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_status ON accounting.monthly_reports(status, run_after);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_period ON accounting.monthly_reports(year, month);

COMMENT ON TABLE accounting.monthly_reports IS 'Informes mensuales de cierre contable generados automáticamente';

-- =====================================================
-- 2. Tabla accounting.report_settings
-- Configuración de envío de informes
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting.report_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'company' UNIQUE,
  monthly_report_auto_send_enabled BOOLEAN NOT NULL DEFAULT true,
  recipients_to TEXT[] NOT NULL DEFAULT '{}',
  recipients_cc TEXT[],
  email_subject_template TEXT NOT NULL DEFAULT 'Informe cierre contable – {Mes} {Año}',
  from_email TEXT NOT NULL DEFAULT 'AV TECH <onboarding@resend.dev>',
  include_pdf_attachment BOOLEAN NOT NULL DEFAULT false,
  use_signed_link_instead_of_attachment BOOLEAN NOT NULL DEFAULT true,
  signed_link_expiry_days INTEGER NOT NULL DEFAULT 30,
  template_version TEXT NOT NULL DEFAULT 'v1',
  language TEXT NOT NULL DEFAULT 'ES' CHECK (language IN ('ES', 'CAT', 'EN')),
  auto_send_on_close BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES internal.authorized_users(id)
);

COMMENT ON TABLE accounting.report_settings IS 'Configuración para la generación y envío de informes mensuales';

-- Insertar configuración inicial
INSERT INTO accounting.report_settings (scope, recipients_to)
VALUES ('company', ARRAY['alex.burgues@avtechesdeveniments.com'])
ON CONFLICT (scope) DO NOTHING;

-- =====================================================
-- 3. RPC list_journal_entry_lines_by_period
-- Obtiene todas las líneas de asientos de un período en una sola consulta
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.list_journal_entry_lines_by_period(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  entry_id UUID,
  entry_number TEXT,
  entry_date DATE,
  entry_type TEXT,
  description TEXT,
  is_locked BOOLEAN,
  source_type TEXT,
  source_id UUID,
  line_id UUID,
  account_code TEXT,
  account_name TEXT,
  line_description TEXT,
  debit NUMERIC,
  credit NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'accounting'
AS $$
  SELECT
    je.id AS entry_id,
    je.entry_number,
    je.entry_date,
    je.entry_type::text,
    je.description,
    je.is_locked,
    je.source_type,
    je.source_id,
    jel.id AS line_id,
    jel.account_code,
    coa.account_name,
    jel.description AS line_description,
    jel.debit,
    jel.credit
  FROM accounting.journal_entries je
  JOIN accounting.journal_entry_lines jel ON jel.journal_entry_id = je.id
  LEFT JOIN accounting.chart_of_accounts coa ON coa.account_code = jel.account_code
  WHERE je.entry_date >= p_start_date AND je.entry_date <= p_end_date
  ORDER BY je.entry_date, je.entry_number, jel.id;
$$;

-- Wrapper público
CREATE OR REPLACE FUNCTION public.list_journal_entry_lines_by_period(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  entry_id UUID,
  entry_number TEXT,
  entry_date DATE,
  entry_type TEXT,
  description TEXT,
  is_locked BOOLEAN,
  source_type TEXT,
  source_id UUID,
  line_id UUID,
  account_code TEXT,
  account_name TEXT,
  line_description TEXT,
  debit NUMERIC,
  credit NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM accounting.list_journal_entry_lines_by_period(p_start_date, p_end_date);
$$;

-- =====================================================
-- 4. RPC get_monthly_closure_report_dataset
-- Dataset completo para generar el PDF del informe mensual
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.get_monthly_closure_report_dataset(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'accounting', 'internal', 'sales'
AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_result JSONB;
  v_company JSONB;
  v_period JSONB;
  v_profit_summary JSONB;
  v_profit_loss JSONB;
  v_balance_sheet JSONB;
  v_vat_summary JSONB;
  v_irpf_summary JSONB;
  v_corporate_tax JSONB;
  v_journal_lines JSONB;
  v_cash_movements JSONB;
  v_payroll_runs JSONB;
  v_partner_compensations JSONB;
  v_client_balances JSONB;
  v_supplier_balances JSONB;
  v_bank_balances JSONB;
BEGIN
  -- Calcular fechas del período
  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + interval '1 month' - interval '1 day')::date;

  -- 1. Información de la empresa
  SELECT jsonb_build_object(
    'legal_name', 'AV TECH ESDEVENIMENTS SL',
    'tax_id', 'B67543210',
    'address', 'Barcelona, España'
  ) INTO v_company;

  -- 2. Información del período
  SELECT jsonb_build_object(
    'year', p_year,
    'month', p_month,
    'period_start', v_start,
    'period_end', v_end,
    'is_closed', accounting.is_period_closed(p_year, p_month)
  ) INTO v_period;

  -- 3. Resumen de resultados (fuente única de verdad)
  SELECT jsonb_agg(row_to_json(t))
  FROM (
    SELECT * FROM accounting.get_period_profit_summary(v_start, v_end)
  ) t INTO v_profit_summary;

  -- 4. PyG detallado por cuentas
  SELECT jsonb_agg(row_to_json(t) ORDER BY t.account_code)
  FROM (
    SELECT * FROM accounting.get_profit_loss(v_start, v_end)
  ) t INTO v_profit_loss;

  -- 5. Balance de situación (a fin de mes)
  SELECT jsonb_agg(row_to_json(t) ORDER BY t.account_code)
  FROM (
    SELECT * FROM accounting.get_balance_sheet(v_end)
  ) t INTO v_balance_sheet;

  -- 6. Resumen IVA
  SELECT jsonb_agg(row_to_json(t))
  FROM (
    SELECT * FROM accounting.get_vat_summary(v_start, v_end)
  ) t INTO v_vat_summary;

  -- 7. Resumen IRPF
  SELECT jsonb_build_object('irpf_total', accounting.get_irpf_summary(v_start, v_end)) INTO v_irpf_summary;

  -- 8. Impuesto de Sociedades
  SELECT jsonb_agg(row_to_json(t))
  FROM (
    SELECT * FROM accounting.get_corporate_tax_summary(v_start, v_end)
  ) t INTO v_corporate_tax;

  -- 9. Libro diario con líneas (limitado a 500 para el PDF principal)
  SELECT jsonb_agg(row_to_json(t))
  FROM (
    SELECT * FROM accounting.list_journal_entry_lines_by_period(v_start, v_end)
    LIMIT 500
  ) t INTO v_journal_lines;

  -- 10. Movimientos de caja
  SELECT jsonb_agg(row_to_json(t))
  FROM (
    SELECT * FROM accounting.list_cash_movements(v_start, v_end, 200)
  ) t INTO v_cash_movements;

  -- 11. Nóminas de empleados del período
  SELECT jsonb_agg(row_to_json(t))
  FROM (
    SELECT 
      pr.id,
      e.first_name || ' ' || e.last_name AS employee_name,
      pr.period_year,
      pr.period_month,
      pr.gross_amount,
      pr.irpf_rate,
      pr.irpf_amount,
      pr.net_amount,
      pr.status,
      je.entry_number AS journal_entry_number
    FROM accounting.payroll_runs pr
    JOIN internal.employees e ON e.id = pr.employee_id
    LEFT JOIN accounting.journal_entries je ON je.id = pr.journal_entry_id
    WHERE pr.period_year = p_year AND pr.period_month = p_month
    ORDER BY e.last_name, e.first_name
  ) t INTO v_payroll_runs;

  -- 12. Retribuciones de socios del período
  SELECT jsonb_agg(row_to_json(t))
  FROM (
    SELECT 
      pcr.id,
      p.name AS partner_name,
      pcr.period_year,
      pcr.period_month,
      pcr.gross_amount,
      pcr.irpf_rate,
      pcr.irpf_amount,
      pcr.net_amount,
      pcr.status,
      je.entry_number AS journal_entry_number
    FROM accounting.partner_compensation_runs pcr
    JOIN internal.partners p ON p.id = pcr.partner_id
    LEFT JOIN accounting.journal_entries je ON je.id = pcr.journal_entry_id
    WHERE pcr.period_year = p_year AND pcr.period_month = p_month
    ORDER BY p.name
  ) t INTO v_partner_compensations;

  -- 13. Saldos de clientes a fin de mes
  SELECT jsonb_agg(row_to_json(t))
  FROM (
    SELECT * FROM accounting.get_client_balances(v_end)
    WHERE net_balance <> 0
    ORDER BY net_balance DESC
    LIMIT 50
  ) t INTO v_client_balances;

  -- 14. Saldos de proveedores/técnicos a fin de mes
  SELECT jsonb_agg(row_to_json(t))
  FROM (
    SELECT * FROM accounting.get_supplier_technician_balances(v_end)
    WHERE net_balance <> 0
    ORDER BY net_balance DESC
    LIMIT 50
  ) t INTO v_supplier_balances;

  -- 15. Saldos bancarios
  SELECT jsonb_agg(row_to_json(t))
  FROM (
    SELECT 
      bs.account_code,
      bs.account_name,
      bs.net_balance
    FROM accounting.get_balance_sheet(v_end) bs
    WHERE bs.account_code LIKE '572%'
    ORDER BY bs.account_code
  ) t INTO v_bank_balances;

  -- Construir resultado final
  v_result := jsonb_build_object(
    'company', v_company,
    'period', v_period,
    'profit_summary', COALESCE(v_profit_summary, '[]'::jsonb),
    'profit_loss', COALESCE(v_profit_loss, '[]'::jsonb),
    'balance_sheet', COALESCE(v_balance_sheet, '[]'::jsonb),
    'vat_summary', COALESCE(v_vat_summary, '[]'::jsonb),
    'irpf_summary', v_irpf_summary,
    'corporate_tax', COALESCE(v_corporate_tax, '[]'::jsonb),
    'journal_lines', COALESCE(v_journal_lines, '[]'::jsonb),
    'cash_movements', COALESCE(v_cash_movements, '[]'::jsonb),
    'payroll_runs', COALESCE(v_payroll_runs, '[]'::jsonb),
    'partner_compensations', COALESCE(v_partner_compensations, '[]'::jsonb),
    'client_balances', COALESCE(v_client_balances, '[]'::jsonb),
    'supplier_balances', COALESCE(v_supplier_balances, '[]'::jsonb),
    'bank_balances', COALESCE(v_bank_balances, '[]'::jsonb),
    'generated_at', now(),
    'dataset_version', 'v1'
  );

  RETURN v_result;
END;
$$;

-- Wrapper público
CREATE OR REPLACE FUNCTION public.get_monthly_closure_report_dataset(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT accounting.get_monthly_closure_report_dataset(p_year, p_month);
$$;

-- =====================================================
-- 5. RPC get_report_settings
-- Obtiene la configuración de informes
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.get_report_settings()
RETURNS TABLE(
  id UUID,
  monthly_report_auto_send_enabled BOOLEAN,
  recipients_to TEXT[],
  recipients_cc TEXT[],
  email_subject_template TEXT,
  from_email TEXT,
  include_pdf_attachment BOOLEAN,
  use_signed_link_instead_of_attachment BOOLEAN,
  signed_link_expiry_days INTEGER,
  template_version TEXT,
  language TEXT,
  auto_send_on_close BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'accounting'
AS $$
  SELECT 
    rs.id,
    rs.monthly_report_auto_send_enabled,
    rs.recipients_to,
    rs.recipients_cc,
    rs.email_subject_template,
    rs.from_email,
    rs.include_pdf_attachment,
    rs.use_signed_link_instead_of_attachment,
    rs.signed_link_expiry_days,
    rs.template_version,
    rs.language,
    rs.auto_send_on_close
  FROM accounting.report_settings rs
  WHERE rs.scope = 'company'
  LIMIT 1;
$$;

-- Wrapper público
CREATE OR REPLACE FUNCTION public.get_report_settings()
RETURNS TABLE(
  id UUID,
  monthly_report_auto_send_enabled BOOLEAN,
  recipients_to TEXT[],
  recipients_cc TEXT[],
  email_subject_template TEXT,
  from_email TEXT,
  include_pdf_attachment BOOLEAN,
  use_signed_link_instead_of_attachment BOOLEAN,
  signed_link_expiry_days INTEGER,
  template_version TEXT,
  language TEXT,
  auto_send_on_close BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM accounting.get_report_settings();
$$;

-- =====================================================
-- 6. RPC admin_update_report_settings
-- Actualiza la configuración de informes (solo admin)
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.admin_update_report_settings(
  p_monthly_report_auto_send_enabled BOOLEAN DEFAULT NULL,
  p_recipients_to TEXT[] DEFAULT NULL,
  p_recipients_cc TEXT[] DEFAULT NULL,
  p_email_subject_template TEXT DEFAULT NULL,
  p_from_email TEXT DEFAULT NULL,
  p_signed_link_expiry_days INTEGER DEFAULT NULL,
  p_auto_send_on_close BOOLEAN DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'accounting', 'internal'
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Solo admin puede modificar
  IF NOT internal.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden modificar la configuración de informes';
  END IF;

  v_user_id := internal.get_authorized_user_id(auth.uid());

  UPDATE accounting.report_settings SET
    monthly_report_auto_send_enabled = COALESCE(p_monthly_report_auto_send_enabled, monthly_report_auto_send_enabled),
    recipients_to = COALESCE(p_recipients_to, recipients_to),
    recipients_cc = COALESCE(p_recipients_cc, recipients_cc),
    email_subject_template = COALESCE(p_email_subject_template, email_subject_template),
    from_email = COALESCE(p_from_email, from_email),
    signed_link_expiry_days = COALESCE(p_signed_link_expiry_days, signed_link_expiry_days),
    auto_send_on_close = COALESCE(p_auto_send_on_close, auto_send_on_close),
    updated_at = now(),
    updated_by = v_user_id
  WHERE scope = 'company';
END;
$$;

-- Wrapper público
CREATE OR REPLACE FUNCTION public.admin_update_report_settings(
  p_monthly_report_auto_send_enabled BOOLEAN DEFAULT NULL,
  p_recipients_to TEXT[] DEFAULT NULL,
  p_recipients_cc TEXT[] DEFAULT NULL,
  p_email_subject_template TEXT DEFAULT NULL,
  p_from_email TEXT DEFAULT NULL,
  p_signed_link_expiry_days INTEGER DEFAULT NULL,
  p_auto_send_on_close BOOLEAN DEFAULT NULL
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT accounting.admin_update_report_settings(
    p_monthly_report_auto_send_enabled,
    p_recipients_to,
    p_recipients_cc,
    p_email_subject_template,
    p_from_email,
    p_signed_link_expiry_days,
    p_auto_send_on_close
  );
$$;

-- =====================================================
-- 7. Actualizar close_period para crear monthly_report PENDING
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.close_period(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'accounting', 'internal'
AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_user_id UUID;
  v_closure_id UUID;
  v_failed TEXT;
  v_auto_send BOOLEAN;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + interval '1 month' - interval '1 day')::date;

  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  -- Verificar checklist (solo checks críticos: ventas, compras, nóminas)
  SELECT c.detail INTO v_failed
  FROM accounting.check_month_closure_readiness(p_year, p_month) c
  WHERE c.check_name IN ('ventas_no_pendientes', 'compras_no_pendientes', 'nominas_no_draft')
    AND NOT c.passed
  LIMIT 1;

  IF v_failed IS NOT NULL THEN
    RAISE EXCEPTION 'No se puede cerrar: %', v_failed;
  END IF;

  IF accounting.is_period_closed(p_year, p_month) THEN
    RAISE EXCEPTION 'El período %/% ya está cerrado', p_year, p_month;
  END IF;

  -- Insertar cierre de período
  INSERT INTO accounting.period_closures (year, month, period_start, period_end, closed_by)
  VALUES (p_year, p_month, v_start, v_end, v_user_id)
  ON CONFLICT (year, month) DO NOTHING
  RETURNING id INTO v_closure_id;

  IF v_closure_id IS NULL THEN
    SELECT id INTO v_closure_id FROM accounting.period_closures WHERE year = p_year AND month = p_month;
  END IF;

  -- Verificar si auto_send_on_close está habilitado
  SELECT rs.auto_send_on_close INTO v_auto_send
  FROM accounting.report_settings rs
  WHERE rs.scope = 'company'
  LIMIT 1;

  -- Crear registro de informe mensual PENDING (si auto_send está habilitado)
  IF COALESCE(v_auto_send, true) THEN
    INSERT INTO accounting.monthly_reports (
      year, 
      month, 
      period_closure_id, 
      status, 
      generated_by,
      run_after
    )
    VALUES (
      p_year, 
      p_month, 
      v_closure_id, 
      'PENDING', 
      v_user_id,
      now()
    )
    ON CONFLICT (year, month) DO UPDATE SET
      status = 'PENDING',
      period_closure_id = EXCLUDED.period_closure_id,
      run_after = now(),
      retry_count = 0,
      error_message = NULL,
      updated_at = now();
  END IF;

  RETURN v_closure_id;
END;
$$;

-- =====================================================
-- 8. RPC para generar informe "en curso" (sin cerrar mes)
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.create_in_progress_report(
  p_year INTEGER,
  p_month INTEGER,
  p_end_day INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'accounting', 'internal'
AS $$
DECLARE
  v_user_id UUID;
  v_report_id UUID;
  v_actual_end_day INTEGER;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  -- Si no se especifica día, usar el día actual
  v_actual_end_day := COALESCE(p_end_day, EXTRACT(DAY FROM CURRENT_DATE)::INTEGER);

  -- Crear o actualizar registro de informe
  INSERT INTO accounting.monthly_reports (
    year, 
    month, 
    status, 
    generated_by,
    run_after,
    dataset_version
  )
  VALUES (
    p_year, 
    p_month, 
    'PENDING', 
    v_user_id,
    now(),
    'v1-inprogress-day' || v_actual_end_day
  )
  ON CONFLICT (year, month) DO UPDATE SET
    status = 'PENDING',
    run_after = now(),
    retry_count = 0,
    error_message = NULL,
    dataset_version = 'v1-inprogress-day' || v_actual_end_day,
    updated_at = now()
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

-- Wrapper público
CREATE OR REPLACE FUNCTION public.create_in_progress_report(
  p_year INTEGER,
  p_month INTEGER,
  p_end_day INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT accounting.create_in_progress_report(p_year, p_month, p_end_day);
$$;

-- =====================================================
-- 9. RPC para obtener lista de informes mensuales
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.list_monthly_reports(
  p_year INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 24
)
RETURNS TABLE(
  id UUID,
  year INTEGER,
  month INTEGER,
  status TEXT,
  storage_path TEXT,
  generated_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_to TEXT[],
  error_message TEXT,
  retry_count INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'accounting'
AS $$
  SELECT 
    mr.id,
    mr.year,
    mr.month,
    mr.status,
    mr.storage_path,
    mr.generated_at,
    mr.sent_at,
    mr.sent_to,
    mr.error_message,
    mr.retry_count,
    mr.created_at
  FROM accounting.monthly_reports mr
  WHERE (p_year IS NULL OR mr.year = p_year)
  ORDER BY mr.year DESC, mr.month DESC
  LIMIT p_limit;
$$;

-- Wrapper público
CREATE OR REPLACE FUNCTION public.list_monthly_reports(
  p_year INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 24
)
RETURNS TABLE(
  id UUID,
  year INTEGER,
  month INTEGER,
  status TEXT,
  storage_path TEXT,
  generated_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_to TEXT[],
  error_message TEXT,
  retry_count INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM accounting.list_monthly_reports(p_year, p_limit);
$$;

-- =====================================================
-- 10. RPC para reintentar envío de informe
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.retry_monthly_report(
  p_report_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'accounting', 'internal'
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  UPDATE accounting.monthly_reports SET
    status = CASE 
      WHEN storage_path IS NOT NULL THEN 'READY'
      ELSE 'PENDING'
    END,
    run_after = now(),
    error_message = NULL,
    updated_at = now()
  WHERE id = p_report_id;
END;
$$;

-- Wrapper público
CREATE OR REPLACE FUNCTION public.retry_monthly_report(
  p_report_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT accounting.retry_monthly_report(p_report_id);
$$;

-- =====================================================
-- RLS Policies para monthly_reports
-- =====================================================
ALTER TABLE accounting.monthly_reports ENABLE ROW LEVEL SECURITY;

-- Solo usuarios autenticados pueden ver informes
CREATE POLICY "Usuarios autenticados pueden ver informes"
  ON accounting.monthly_reports
  FOR SELECT
  TO authenticated
  USING (true);

-- Solo admin puede modificar informes (a través de RPCs SECURITY DEFINER)
CREATE POLICY "Solo service role puede modificar informes"
  ON accounting.monthly_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- RLS Policies para report_settings
-- =====================================================
ALTER TABLE accounting.report_settings ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer la configuración
CREATE POLICY "Usuarios autenticados pueden ver configuración"
  ON accounting.report_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Solo service role puede modificar (a través de RPCs SECURITY DEFINER)
CREATE POLICY "Solo service role puede modificar configuración"
  ON accounting.report_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
