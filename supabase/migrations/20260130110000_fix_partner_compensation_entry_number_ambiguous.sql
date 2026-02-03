-- =====================================================
-- Fix: Error "entry_number" ambiguous al aprobar retribuciones de socios
-- La migración 20260129163500 corrigió list_payroll_runs pero no list_partner_compensation_runs.
-- 1. Calificar explícitamente je.entry_number en list_partner_compensation_runs
-- 2. Calificar explícitamente en get_next_entry_number (usado por create_partner_compensation_entry)
-- =====================================================

-- 1. Asegurar que get_next_entry_number use columnas calificadas (evita ambigüedad con search_path)
CREATE OR REPLACE FUNCTION accounting.get_next_entry_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'accounting'
AS $$
DECLARE
  v_year INTEGER;
  v_number INTEGER;
  v_entry_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(je.entry_number FROM 8 FOR 4) AS INTEGER)), 0) + 1
  INTO v_number
  FROM accounting.journal_entries je
  WHERE je.entry_number LIKE 'AS-' || v_year || '%';
  
  v_entry_number := 'AS-' || v_year || '-' || LPAD(v_number::TEXT, 4, '0');
  
  RETURN v_entry_number;
END;
$$;

-- 2. list_partner_compensation_runs: calificar explícitamente je.entry_number
CREATE OR REPLACE FUNCTION accounting.list_partner_compensation_runs(
  p_period_year integer DEFAULT NULL,
  p_period_month integer DEFAULT NULL,
  p_partner_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  compensation_number text,
  period_year integer,
  period_month integer,
  partner_id uuid,
  partner_number text,
  partner_name text,
  gross_amount numeric(12,2),
  irpf_rate numeric(5,2),
  irpf_amount numeric(12,2),
  net_amount numeric(12,2),
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
    pcr.id,
    pcr.compensation_number,
    pcr.period_year,
    pcr.period_month,
    pcr.partner_id,
    p.partner_number,
    p.full_name,
    pcr.gross_amount,
    pcr.irpf_rate,
    pcr.irpf_amount,
    pcr.net_amount,
    pcr.status,
    pcr.journal_entry_id,
    je.entry_number,
    pcr.created_at
  FROM accounting.partner_compensation_runs pcr
  JOIN internal.partners p ON pcr.partner_id = p.id
  LEFT JOIN accounting.journal_entries je ON pcr.journal_entry_id = je.id
  WHERE 
    (p_period_year IS NULL OR pcr.period_year = p_period_year)
    AND (p_period_month IS NULL OR pcr.period_month = p_period_month)
    AND (p_partner_id IS NULL OR pcr.partner_id = p_partner_id)
    AND (p_status IS NULL OR pcr.status = p_status)
  ORDER BY pcr.period_year DESC, pcr.period_month DESC, pcr.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
