-- =====================================================
-- Asegurar numeración automática única de nóminas
-- SET search_path en get_next_payroll_number y get_next_compensation_number
-- para evitar ambigüedades (consistente con get_next_entry_number)
-- =====================================================

CREATE OR REPLACE FUNCTION accounting.get_next_payroll_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'accounting'
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_number INTEGER;
  v_payroll_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_month := EXTRACT(MONTH FROM CURRENT_DATE);
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(pr.payroll_number FROM 13 FOR 4) AS INTEGER)), 0) + 1
  INTO v_number
  FROM accounting.payroll_runs pr
  WHERE pr.payroll_number LIKE 'NOM-' || v_year || LPAD(v_month::TEXT, 2, '0') || '-%';
  
  v_payroll_number := 'NOM-' || v_year || LPAD(v_month::TEXT, 2, '0') || '-' || LPAD(v_number::TEXT, 4, '0');
  
  RETURN v_payroll_number;
END;
$$;

CREATE OR REPLACE FUNCTION accounting.get_next_compensation_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'accounting'
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_number INTEGER;
  v_compensation_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_month := EXTRACT(MONTH FROM CURRENT_DATE);
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(pcr.compensation_number FROM 13 FOR 4) AS INTEGER)), 0) + 1
  INTO v_number
  FROM accounting.partner_compensation_runs pcr
  WHERE pcr.compensation_number LIKE 'RET-' || v_year || LPAD(v_month::TEXT, 2, '0') || '-%';
  
  v_compensation_number := 'RET-' || v_year || LPAD(v_month::TEXT, 2, '0') || '-' || LPAD(v_number::TEXT, 4, '0');
  
  RETURN v_compensation_number;
END;
$$;
