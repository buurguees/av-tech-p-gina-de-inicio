-- ============================================
-- FUNCIONES RPC PARA INFORMES DE IRPF
-- ============================================

-- 1. FUNCIÓN: IRPF retenido por período
CREATE OR REPLACE FUNCTION accounting.get_irpf_by_period(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  period_year INTEGER,
  period_month INTEGER,
  total_irpf NUMERIC(12,2),
  payroll_count INTEGER,
  compensation_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.period_year,
    pr.period_month,
    COALESCE(SUM(pr.irpf_amount), 0) + COALESCE(SUM(pcr.irpf_amount), 0) as total_irpf,
    COUNT(DISTINCT pr.id)::INTEGER as payroll_count,
    COUNT(DISTINCT pcr.id)::INTEGER as compensation_count
  FROM accounting.payroll_runs pr
  FULL OUTER JOIN accounting.partner_compensation_runs pcr
    ON pr.period_year = pcr.period_year
    AND pr.period_month = pcr.period_month
  WHERE 
    (p_period_start IS NULL OR 
     (pr.period_year * 100 + pr.period_month >= EXTRACT(YEAR FROM p_period_start) * 100 + EXTRACT(MONTH FROM p_period_start)))
    AND (p_period_end IS NULL OR 
         (COALESCE(pr.period_year, pcr.period_year) * 100 + COALESCE(pr.period_month, pcr.period_month) <= EXTRACT(YEAR FROM p_period_end) * 100 + EXTRACT(MONTH FROM p_period_end)))
    AND (pr.status IN ('POSTED', 'PAID') OR pcr.status IN ('POSTED', 'PAID'))
  GROUP BY pr.period_year, pr.period_month, pcr.period_year, pcr.period_month
  ORDER BY COALESCE(pr.period_year, pcr.period_year) DESC, COALESCE(pr.period_month, pcr.period_month) DESC;
END;
$$;

-- 2. FUNCIÓN: IRPF por persona (empleado/socio)
CREATE OR REPLACE FUNCTION accounting.get_irpf_by_person(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  person_type TEXT,
  person_id UUID,
  person_number TEXT,
  person_name TEXT,
  total_irpf NUMERIC(12,2),
  total_gross NUMERIC(12,2),
  total_net NUMERIC(12,2),
  document_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting, internal
AS $$
BEGIN
  RETURN QUERY
  -- Empleados
  SELECT 
    'EMPLOYEE'::TEXT,
    e.id,
    e.employee_number,
    e.full_name,
    COALESCE(SUM(pr.irpf_amount), 0) as total_irpf,
    COALESCE(SUM(pr.gross_amount), 0) as total_gross,
    COALESCE(SUM(pr.net_amount), 0) as total_net,
    COUNT(pr.id)::INTEGER as document_count
  FROM internal.employees e
  LEFT JOIN accounting.payroll_runs pr ON pr.employee_id = e.id
    AND pr.status IN ('POSTED', 'PAID')
    AND (
      (p_period_start IS NULL AND p_period_end IS NULL) OR
      (pr.period_year * 100 + pr.period_month >= EXTRACT(YEAR FROM p_period_start) * 100 + EXTRACT(MONTH FROM p_period_start)
       AND pr.period_year * 100 + pr.period_month <= EXTRACT(YEAR FROM p_period_end) * 100 + EXTRACT(MONTH FROM p_period_end))
    )
  WHERE e.status = 'ACTIVE'
  GROUP BY e.id, e.employee_number, e.full_name
  HAVING COALESCE(SUM(pr.irpf_amount), 0) > 0
  
  UNION ALL
  
  -- Socios
  SELECT 
    'PARTNER'::TEXT,
    p.id,
    p.partner_number,
    p.full_name,
    COALESCE(SUM(pcr.irpf_amount), 0) as total_irpf,
    COALESCE(SUM(pcr.gross_amount), 0) as total_gross,
    COALESCE(SUM(pcr.net_amount), 0) as total_net,
    COUNT(pcr.id)::INTEGER as document_count
  FROM internal.partners p
  LEFT JOIN accounting.partner_compensation_runs pcr ON pcr.partner_id = p.id
    AND pcr.status IN ('POSTED', 'PAID')
    AND (
      (p_period_start IS NULL AND p_period_end IS NULL) OR
      (pcr.period_year * 100 + pcr.period_month >= EXTRACT(YEAR FROM p_period_start) * 100 + EXTRACT(MONTH FROM p_period_start)
       AND pcr.period_year * 100 + pcr.period_month <= EXTRACT(YEAR FROM p_period_end) * 100 + EXTRACT(MONTH FROM p_period_end))
    )
  WHERE p.status = 'ACTIVE'
  GROUP BY p.id, p.partner_number, p.full_name
  HAVING COALESCE(SUM(pcr.irpf_amount), 0) > 0
  
  ORDER BY total_irpf DESC;
END;
$$;

-- 3. FUNCIÓN: Total acumulado IRPF para Modelo 111
CREATE OR REPLACE FUNCTION accounting.get_irpf_model_111_summary(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  total_irpf_accumulated NUMERIC(12,2),
  total_payroll_irpf NUMERIC(12,2),
  total_compensation_irpf NUMERIC(12,2),
  total_documents INTEGER,
  total_employees INTEGER,
  total_partners INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting
AS $$
DECLARE
  v_start_filter TEXT;
  v_end_filter TEXT;
BEGIN
  -- Construir filtros
  IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL THEN
    v_start_filter := ' AND (pr.period_year * 100 + pr.period_month >= ' || 
                      EXTRACT(YEAR FROM p_period_start) * 100 + EXTRACT(MONTH FROM p_period_start) || ')';
    v_end_filter := ' AND (COALESCE(pr.period_year, pcr.period_year) * 100 + COALESCE(pr.period_month, pcr.period_month) <= ' ||
                    EXTRACT(YEAR FROM p_period_end) * 100 + EXTRACT(MONTH FROM p_period_end) || ')';
  ELSE
    v_start_filter := '';
    v_end_filter := '';
  END IF;
  
  RETURN QUERY
  EXECUTE format('
    SELECT 
      COALESCE(SUM(pr.irpf_amount), 0) + COALESCE(SUM(pcr.irpf_amount), 0) as total_irpf_accumulated,
      COALESCE(SUM(pr.irpf_amount), 0) as total_payroll_irpf,
      COALESCE(SUM(pcr.irpf_amount), 0) as total_compensation_irpf,
      (COUNT(DISTINCT pr.id) + COUNT(DISTINCT pcr.id))::INTEGER as total_documents,
      COUNT(DISTINCT pr.employee_id)::INTEGER as total_employees,
      COUNT(DISTINCT pcr.partner_id)::INTEGER as total_partners
    FROM accounting.payroll_runs pr
    FULL OUTER JOIN accounting.partner_compensation_runs pcr
      ON pr.period_year = pcr.period_year
      AND pr.period_month = pcr.period_month
    WHERE (pr.status IN (''POSTED'', ''PAID'') OR pcr.status IN (''POSTED'', ''PAID''))
      %s %s
  ', v_start_filter, v_end_filter);
END;
$$;

-- Comentarios
COMMENT ON FUNCTION accounting.get_irpf_by_period IS 'Obtiene el IRPF retenido agrupado por período (año/mes)';
COMMENT ON FUNCTION accounting.get_irpf_by_person IS 'Obtiene el IRPF retenido agrupado por persona (empleado/socio)';
COMMENT ON FUNCTION accounting.get_irpf_model_111_summary IS 'Obtiene el resumen total de IRPF para el Modelo 111';
