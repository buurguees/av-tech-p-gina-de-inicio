-- =====================================================
-- Fix: Error "entry_number" ambiguous al aprobar nóminas
-- 1. Eliminar overload duplicado de list_payroll_runs
-- 2. Corregir orden de parámetros en wrapper public
-- 3. Calificar explícitamente je.entry_number
-- 4. Usar get_next_entry_number() explícitamente (sin params)
-- =====================================================

DROP FUNCTION IF EXISTS public.list_payroll_runs(integer, integer, uuid, text, integer, integer);
DROP FUNCTION IF EXISTS public.list_payroll_runs(integer, integer, text, uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.list_payroll_runs(
  p_period_year integer DEFAULT NULL,
  p_period_month integer DEFAULT NULL,
  p_employee_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  payroll_number text,
  period_year integer,
  period_month integer,
  employee_id uuid,
  employee_number text,
  employee_name text,
  gross_amount numeric,
  irpf_rate numeric,
  irpf_amount numeric,
  net_amount numeric,
  status text,
  journal_entry_id uuid,
  journal_entry_number text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'accounting', 'internal'
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM accounting.list_payroll_runs(
    p_period_year, p_period_month, p_employee_id, p_status, p_limit, p_offset
  );
END;
$$;

CREATE OR REPLACE FUNCTION accounting.list_payroll_runs(
  p_period_year integer DEFAULT NULL,
  p_period_month integer DEFAULT NULL,
  p_employee_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  payroll_number text,
  period_year integer,
  period_month integer,
  employee_id uuid,
  employee_number text,
  employee_name text,
  gross_amount numeric,
  irpf_rate numeric,
  irpf_amount numeric,
  net_amount numeric,
  status text,
  journal_entry_id uuid,
  journal_entry_number text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'accounting', 'internal'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id, pr.payroll_number, pr.period_year, pr.period_month, pr.employee_id,
    e.employee_number, e.full_name, pr.gross_amount, pr.irpf_rate, pr.irpf_amount,
    pr.net_amount, pr.status, pr.journal_entry_id, je.entry_number, pr.created_at
  FROM accounting.payroll_runs pr
  JOIN internal.employees e ON pr.employee_id = e.id
  LEFT JOIN accounting.journal_entries je ON pr.journal_entry_id = je.id
  WHERE 
    (p_period_year IS NULL OR pr.period_year = p_period_year)
    AND (p_period_month IS NULL OR pr.period_month = p_period_month)
    AND (p_employee_id IS NULL OR pr.employee_id = p_employee_id)
    AND (p_status IS NULL OR pr.status = p_status)
  ORDER BY pr.period_year DESC, pr.period_month DESC, pr.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION accounting.create_payroll_entry(
  p_payroll_run_id uuid,
  p_entry_date date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'accounting', 'internal'
AS $$
DECLARE
  v_entry_id uuid;
  v_entry_number text;
  v_payroll record;
  v_employee record;
  v_account_salary text := '640000';
  v_account_pending text := '465000';
  v_account_irpf text := '475100';
  v_gross_amount numeric(12,2);
  v_irpf_amount numeric(12,2);
  v_net_amount numeric(12,2);
  v_user_id uuid;
BEGIN
  SELECT pr.id, pr.payroll_number, pr.employee_id, pr.gross_amount, pr.irpf_amount, pr.net_amount, pr.created_by
  INTO v_payroll FROM accounting.payroll_runs pr WHERE pr.id = p_payroll_run_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nómina no encontrada: %', p_payroll_run_id; END IF;
  
  SELECT e.id, e.employee_number, e.full_name INTO v_employee
  FROM internal.employees e WHERE e.id = v_payroll.employee_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empleado no encontrado: %', v_payroll.employee_id; END IF;
  
  v_gross_amount := v_payroll.gross_amount;
  v_irpf_amount := v_payroll.irpf_amount;
  v_net_amount := v_payroll.net_amount;
  v_user_id := v_payroll.created_by;
  
  v_entry_number := (SELECT accounting.get_next_entry_number());
  
  INSERT INTO accounting.journal_entries (entry_number, entry_date, entry_type, description, reference_id, reference_type, created_by)
  VALUES (v_entry_number, p_entry_date, 'PAYROLL_EMPLOYEE'::accounting.journal_entry_type,
    'Nómina: ' || v_payroll.payroll_number || ' - ' || v_employee.full_name, v_payroll.id, 'payroll', v_user_id)
  RETURNING id INTO v_entry_id;
  
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_credit, amount, description, line_order)
  VALUES (v_entry_id, v_account_salary, 'DEBIT', v_gross_amount, 'Nómina ' || v_payroll.payroll_number || ' - ' || v_employee.full_name, 1);
  INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_credit, amount, description, line_order)
  VALUES (v_entry_id, v_account_pending, 'CREDIT', v_net_amount, 'Neto a pagar nómina ' || v_payroll.payroll_number, 2);
  IF v_irpf_amount > 0 THEN
    INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_credit, amount, description, line_order)
    VALUES (v_entry_id, v_account_irpf, 'CREDIT', v_irpf_amount, 'Retención IRPF nómina ' || v_payroll.payroll_number, 3);
  END IF;
  
  UPDATE accounting.payroll_runs SET journal_entry_id = v_entry_id, status = 'POSTED', updated_at = now() WHERE id = p_payroll_run_id;
  RETURN v_entry_id;
END;
$$;
