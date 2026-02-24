-- Enforce legal issuing rules for sales quotes/invoices:
-- - Draft -> issued/sent uses current date as issue date
-- - Definitive numbers are generated at issuing time
-- - Invoice due date uses company preferences (invoice_payment_days)

-- 1) Ensure quotes have an explicit issue_date
ALTER TABLE quotes.quotes
ADD COLUMN IF NOT EXISTS issue_date DATE;

-- 2) Helper: invoice payment days from company preferences
CREATE OR REPLACE FUNCTION internal.get_company_invoice_payment_days()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
  v_days INTEGER;
BEGIN
  BEGIN
    SELECT p.invoice_payment_days
    INTO v_days
    FROM public.get_company_preferences() p
    LIMIT 1;
  EXCEPTION
    WHEN undefined_function THEN
      v_days := NULL;
  END;

  RETURN GREATEST(COALESCE(v_days, 30), 0);
END;
$$;

-- 3) Helper: quote validity days from company preferences
CREATE OR REPLACE FUNCTION internal.get_company_quote_validity_days()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
  v_days INTEGER;
BEGIN
  BEGIN
    SELECT p.quote_validity_days
    INTO v_days
    FROM public.get_company_preferences() p
    LIMIT 1;
  EXCEPTION
    WHEN undefined_function THEN
      v_days := NULL;
  END;

  RETURN GREATEST(COALESCE(v_days, 15), 0);
END;
$$;

-- 4) Prevent bypassing legal issue flow from generic invoice update RPC
CREATE OR REPLACE FUNCTION public.finance_update_invoice(
  p_invoice_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL,
  p_payment_terms TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, internal, public
AS $$
DECLARE
  v_invoice RECORD;
  v_user_id UUID;
  v_has_payments BOOLEAN;
BEGIN
  -- Validar usuario
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  -- Bloquear emisión por esta vía para garantizar numeración y fecha legales
  IF p_status IN ('ISSUED', 'SENT') THEN
    RAISE EXCEPTION 'Para emitir/enviar una factura usa la acción de emisión (finance_issue_invoice)';
  END IF;

  -- Obtener datos de la factura
  SELECT id, is_locked, status, client_id, project_id
  INTO v_invoice
  FROM sales.invoices
  WHERE id = p_invoice_id;

  IF v_invoice.id IS NULL THEN
    RETURN false;
  END IF;

  -- Validar que no esté bloqueada (excepto para cambiar status a CANCELLED)
  IF v_invoice.is_locked = true AND (p_status IS NULL OR p_status != 'CANCELLED') THEN
    RAISE EXCEPTION 'No se puede editar una factura bloqueada';
  END IF;

  -- Verificar si hay pagos registrados
  SELECT EXISTS(SELECT 1 FROM sales.invoice_payments WHERE invoice_id = p_invoice_id)
  INTO v_has_payments;

  -- No permitir cambiar cliente o proyecto si hay pagos
  IF v_has_payments THEN
    IF (p_client_id IS NOT NULL AND p_client_id != v_invoice.client_id) OR
       (p_project_id IS NOT NULL AND p_project_id != v_invoice.project_id) THEN
      RAISE EXCEPTION 'No se puede modificar el cliente o proyecto de una factura con pagos registrados';
    END IF;
  END IF;

  -- Actualizar factura
  UPDATE sales.invoices
  SET
    client_id = COALESCE(p_client_id, client_id),
    project_id = COALESCE(p_project_id, project_id),
    project_name = COALESCE(p_project_name, project_name),
    due_date = COALESCE(p_due_date, due_date),
    notes = COALESCE(p_notes, notes),
    internal_notes = COALESCE(p_internal_notes, internal_notes),
    payment_terms = COALESCE(p_payment_terms, payment_terms),
    status = COALESCE(p_status, status),
    updated_at = now()
  WHERE id = p_invoice_id;

  RETURN FOUND;
END;
$$;

-- 5) Issue invoice with definitive correlatives + current issue date + due from preferences
CREATE OR REPLACE FUNCTION public.finance_issue_invoice(p_invoice_id UUID)
RETURNS TABLE (
  invoice_number TEXT,
  issue_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, audit, internal, public
AS $$
DECLARE
  v_invoice RECORD;
  v_user_id UUID;
  v_year INTEGER;
  v_next_number INTEGER;
  v_invoice_number TEXT;
  v_current_invoice_number TEXT;
  v_due_days INTEGER;
BEGIN
  -- Validar usuario
  v_user_id := internal.get_authorized_user_id(auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  -- Validar periodo abierto para la fecha de emisión legal
  PERFORM internal.assert_period_not_closed(CURRENT_DATE);

  -- Obtener datos de la factura
  SELECT
    inv.id,
    inv.status,
    inv.invoice_number,
    inv.issue_date,
    inv.preliminary_number
  INTO v_invoice
  FROM sales.invoices inv
  WHERE inv.id = p_invoice_id;

  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;

  IF v_invoice.status != 'DRAFT' THEN
    RAISE EXCEPTION 'Solo se pueden emitir facturas en estado DRAFT';
  END IF;

  v_current_invoice_number := v_invoice.invoice_number;
  v_due_days := internal.get_company_invoice_payment_days();
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

  -- Siempre generar número definitivo correlativo al emitir
  INSERT INTO audit.sequence_counters (prefix, year, current_number, last_generated_at)
  VALUES ('INV', v_year, 1, now())
  ON CONFLICT (prefix, year) DO UPDATE
  SET current_number = audit.sequence_counters.current_number + 1,
      last_generated_at = now()
  RETURNING current_number INTO v_next_number;

  v_invoice_number := 'F-' || RIGHT(v_year::TEXT, 2) || '-' || LPAD(v_next_number::TEXT, 6, '0');

  -- Actualizar factura: emitir y bloquear
  UPDATE sales.invoices inv
  SET
    preliminary_number = CASE
      WHEN inv.preliminary_number IS NULL THEN v_current_invoice_number
      ELSE inv.preliminary_number
    END,
    invoice_number = v_invoice_number,
    issue_date = CURRENT_DATE,
    due_date = (CURRENT_DATE + make_interval(days => v_due_days))::DATE,
    status = 'ISSUED',
    is_locked = true,
    locked_at = now(),
    updated_at = now()
  WHERE inv.id = p_invoice_id;

  RETURN QUERY
  SELECT
    v_invoice_number,
    CURRENT_DATE;
END;
$$;

-- 6) Create invoice draft with due-date defaults from company preferences
CREATE OR REPLACE FUNCTION public.create_invoice_with_number(
  p_client_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_issue_date DATE DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_source_quote_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS TABLE(invoice_id UUID, invoice_number TEXT, preliminary_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
DECLARE
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_preliminary_number TEXT;
  v_user_id UUID;
  v_project_name TEXT;
  v_site_mode TEXT;
  v_default_site_id UUID;
  v_final_site_id UUID;
  v_issue DATE;
  v_due DATE;
  v_due_days INTEGER;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  v_issue := COALESCE(p_issue_date, CURRENT_DATE);
  v_due_days := internal.get_company_invoice_payment_days();
  v_due := COALESCE(p_due_date, (v_issue + make_interval(days => v_due_days))::DATE);
  PERFORM internal.assert_period_not_closed(v_issue);

  IF p_project_id IS NOT NULL AND p_project_name IS NULL THEN
    SELECT pp.project_name INTO v_project_name FROM projects.projects pp WHERE pp.id = p_project_id;
  ELSE
    v_project_name := p_project_name;
  END IF;

  v_final_site_id := p_site_id;
  IF p_project_id IS NOT NULL THEN
    SELECT pp.site_mode, pp.default_site_id INTO v_site_mode, v_default_site_id FROM projects.projects pp WHERE pp.id = p_project_id;
    IF v_site_mode = 'MULTI_SITE' AND v_final_site_id IS NULL THEN RAISE EXCEPTION 'site_id is required for MULTI_SITE projects'; END IF;
    IF v_site_mode = 'SINGLE_SITE' AND v_final_site_id IS NULL THEN v_final_site_id := v_default_site_id; END IF;
    IF v_final_site_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM projects.project_sites ps
      WHERE ps.id = v_final_site_id AND ps.project_id = p_project_id AND ps.is_active = true
    ) THEN
      RAISE EXCEPTION 'site_id does not belong to this project or is inactive';
    END IF;
  END IF;

  v_preliminary_number := internal.generate_preliminary_invoice_number();
  v_invoice_number := v_preliminary_number;
  INSERT INTO sales.invoices (
    client_id,
    project_id,
    project_name,
    invoice_number,
    preliminary_number,
    issue_date,
    due_date,
    source_quote_id,
    created_by,
    site_id
  )
  VALUES (
    p_client_id,
    p_project_id,
    v_project_name,
    v_invoice_number,
    v_preliminary_number,
    v_issue,
    v_due,
    p_source_quote_id,
    v_user_id,
    v_final_site_id
  )
  RETURNING sales.invoices.id INTO v_invoice_id;

  PERFORM internal.log_audit_event(
    v_user_id,
    'invoice.created',
    'INVOICE',
    v_invoice_id::TEXT,
    jsonb_build_object('invoice_number', v_invoice_number, 'client_id', p_client_id, 'site_id', v_final_site_id),
    'info',
    'FINANCIAL'
  );

  RETURN QUERY SELECT v_invoice_id, v_invoice_number, v_preliminary_number;
END;
$$;

-- 7) Update quote transition from DRAFT to SENT/APPROVED
--    - set issue_date = CURRENT_DATE
--    - assign definitive correlatives at send/approve time
--    - recompute valid_until from company preferences when not provided explicitly
CREATE OR REPLACE FUNCTION public.update_quote(
  p_quote_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_valid_until DATE DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status TEXT;
  v_current_number TEXT;
  v_new_number TEXT;
  v_quote_validity_days INTEGER;
BEGIN
  -- Get current status and number
  SELECT status::TEXT, quote_number
  INTO v_old_status, v_current_number
  FROM quotes.quotes
  WHERE id = p_quote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;

  IF v_old_status = 'DRAFT' AND p_status IN ('SENT', 'APPROVED') THEN
    v_new_number := quotes.get_next_quote_number();
    v_quote_validity_days := internal.get_company_quote_validity_days();

    UPDATE quotes.quotes
    SET
      client_id = COALESCE(p_client_id, client_id),
      project_name = COALESCE(p_project_name, project_name),
      valid_until = COALESCE(p_valid_until, (CURRENT_DATE + make_interval(days => v_quote_validity_days))::DATE),
      status = p_status::quotes.quote_status,
      quote_number = v_new_number,
      preliminary_number = COALESCE(preliminary_number, v_current_number),
      issue_date = CURRENT_DATE,
      project_id = COALESCE(p_project_id, project_id),
      notes = COALESCE(p_notes, notes),
      site_id = COALESCE(p_site_id, site_id),
      updated_at = now()
    WHERE id = p_quote_id;
  ELSE
    UPDATE quotes.quotes
    SET
      client_id = COALESCE(p_client_id, client_id),
      project_name = COALESCE(p_project_name, project_name),
      valid_until = COALESCE(p_valid_until, valid_until),
      status = COALESCE(p_status::quotes.quote_status, status),
      project_id = COALESCE(p_project_id, project_id),
      notes = COALESCE(p_notes, notes),
      site_id = COALESCE(p_site_id, site_id),
      updated_at = now()
    WHERE id = p_quote_id;
  END IF;
END;
$$;

-- 8) Expose quote issue_date in get_quote RPC
CREATE OR REPLACE FUNCTION public.get_quote(p_quote_id UUID)
RETURNS TABLE(
  id UUID,
  quote_number TEXT,
  client_id UUID,
  client_name TEXT,
  project_id UUID,
  project_name TEXT,
  status TEXT,
  subtotal NUMERIC,
  tax_rate NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC,
  notes TEXT,
  issue_date DATE,
  valid_until DATE,
  order_number TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  created_by_name TEXT,
  site_id UUID,
  site_name TEXT,
  site_city TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.quote_number,
    q.client_id,
    c.company_name,
    q.project_id,
    q.project_name,
    q.status::TEXT,
    q.subtotal,
    q.tax_rate,
    q.tax_amount,
    q.total,
    q.notes,
    q.issue_date,
    q.valid_until,
    q.order_number,
    q.created_at,
    q.updated_at,
    q.created_by,
    COALESCE(au.full_name, '')::TEXT,
    q.site_id,
    ps.site_name,
    ps.city
  FROM quotes.quotes q
  LEFT JOIN clients.clients c ON c.id = q.client_id
  LEFT JOIN internal.authorized_users au ON au.id = q.created_by
  LEFT JOIN projects.project_sites ps ON ps.id = q.site_id
  WHERE q.id = p_quote_id;
END;
$$;
