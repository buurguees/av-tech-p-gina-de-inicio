-- ============================================
-- CÁLCULO AUTOMÁTICO DE IMPUESTO DE SOCIEDADES (IS)
-- ============================================

-- 1. FUNCIÓN: Calcular resultado antes de impuestos (BAI)
CREATE OR REPLACE FUNCTION accounting.calculate_profit_before_tax(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  total_revenue NUMERIC(12,2),
  total_expenses NUMERIC(12,2),
  profit_before_tax NUMERIC(12,2)
)
LANGUAGE plpgsql
STABLE
SET search_path = accounting
AS $$
DECLARE
  v_period_filter TEXT;
  v_revenue NUMERIC(12,2) := 0;
  v_expenses NUMERIC(12,2) := 0;
BEGIN
  -- Construir filtro de período
  IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL THEN
    v_period_filter := ' AND je.entry_date BETWEEN ''' || p_period_start || ''' AND ''' || p_period_end || '''';
  ELSE
    v_period_filter := '';
  END IF;
  
  -- Calcular ingresos (cuentas 7xxxx - REVENUE)
  EXECUTE format('
    SELECT COALESCE(SUM(
      CASE WHEN jel.debit_credit = ''CREDIT'' THEN jel.amount ELSE -jel.amount END
    ), 0)
    FROM accounting.journal_entry_lines jel
    JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
    JOIN accounting.chart_of_accounts coa ON jel.account_code = coa.account_code
    WHERE coa.account_type = ''REVENUE''
      %s
  ', v_period_filter) INTO v_revenue;
  
  -- Calcular gastos (cuentas 6xxxx - EXPENSE, excluyendo 630000 IS)
  EXECUTE format('
    SELECT COALESCE(SUM(
      CASE WHEN jel.debit_credit = ''DEBIT'' THEN jel.amount ELSE -jel.amount END
    ), 0)
    FROM accounting.journal_entry_lines jel
    JOIN accounting.journal_entries je ON jel.journal_entry_id = je.id
    JOIN accounting.chart_of_accounts coa ON jel.account_code = coa.account_code
    WHERE coa.account_type = ''EXPENSE''
      AND coa.account_code != ''630000''
      %s
  ', v_period_filter) INTO v_expenses;
  
  RETURN QUERY SELECT 
    v_revenue,
    v_expenses,
    v_revenue - v_expenses;
END;
$$;

-- 2. FUNCIÓN: Calcular y crear/actualizar asiento de provisión de IS
CREATE OR REPLACE FUNCTION accounting.calculate_corporate_tax(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL,
  p_tax_rate NUMERIC(5,2) DEFAULT 25.00,
  p_force_recalculate BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_profit_before_tax NUMERIC(12,2);
  v_tax_amount NUMERIC(12,2);
  v_existing_entry_id UUID;
  v_user_id UUID;
  v_period_description TEXT;
BEGIN
  -- Obtener usuario actual
  SELECT auth.uid() INTO v_user_id;
  
  -- Calcular BAI
  SELECT profit_before_tax INTO v_profit_before_tax
  FROM accounting.calculate_profit_before_tax(p_period_start, p_period_end);
  
  -- Calcular IS (solo si hay beneficio)
  IF v_profit_before_tax > 0 THEN
    v_tax_amount := v_profit_before_tax * (p_tax_rate / 100);
  ELSE
    v_tax_amount := 0;
  END IF;
  
  -- Construir descripción del período
  IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL THEN
    v_period_description := 'Período: ' || p_period_start::TEXT || ' a ' || p_period_end::TEXT;
  ELSE
    v_period_description := 'Acumulado hasta ' || CURRENT_DATE::TEXT;
  END IF;
  
  -- Buscar asiento existente de provisión de IS para este período
  IF NOT p_force_recalculate THEN
    SELECT je.id INTO v_existing_entry_id
    FROM accounting.journal_entries je
    WHERE je.entry_type = 'TAX_PROVISION'
      AND je.description LIKE '%' || v_period_description || '%'
      AND je.is_locked = false
    ORDER BY je.created_at DESC
    LIMIT 1;
  END IF;
  
  -- Si existe y no forzamos recálculo, actualizar
  IF v_existing_entry_id IS NOT NULL AND NOT p_force_recalculate THEN
    -- Eliminar líneas existentes
    DELETE FROM accounting.journal_entry_lines
    WHERE journal_entry_id = v_existing_entry_id;
    
    -- Actualizar descripción
    UPDATE accounting.journal_entries
    SET description = 'Provisión IS ' || p_tax_rate || '% - ' || v_period_description || ' - BAI: ' || v_profit_before_tax || '€ - IS: ' || v_tax_amount || '€',
        updated_at = now()
    WHERE id = v_existing_entry_id;
    
    v_entry_id := v_existing_entry_id;
  ELSE
    -- Crear nuevo asiento
    v_entry_number := accounting.get_next_entry_number();
    
    INSERT INTO accounting.journal_entries (
      entry_number,
      entry_date,
      entry_type,
      description,
      reference_type,
      created_by
    ) VALUES (
      v_entry_number,
      COALESCE(p_period_end, CURRENT_DATE),
      'TAX_PROVISION',
      'Provisión IS ' || p_tax_rate || '% - ' || v_period_description || ' - BAI: ' || v_profit_before_tax || '€ - IS: ' || v_tax_amount || '€',
      'corporate_tax',
      v_user_id
    ) RETURNING id INTO v_entry_id;
  END IF;
  
  -- Solo crear líneas si hay IS a provisionar
  IF v_tax_amount > 0 THEN
    -- DEBE: Impuesto sobre beneficios (630000)
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id,
      account_code,
      debit_credit,
      amount,
      description,
      line_order
    ) VALUES (
      v_entry_id,
      '630000',
      'DEBIT',
      v_tax_amount,
      'Provisión IS ' || p_tax_rate || '% sobre BAI: ' || v_profit_before_tax || '€',
      1
    );
    
    -- HABER: HP acreedora por IS (475200)
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id,
      account_code,
      debit_credit,
      amount,
      description,
      line_order
    ) VALUES (
      v_entry_id,
      '475200',
      'CREDIT',
      v_tax_amount,
      'Provisión IS a pagar',
      2
    );
  END IF;
  
  RETURN v_entry_id;
END;
$$;

-- 3. FUNCIÓN: Recalcular IS automáticamente cuando se registra un ingreso o gasto
CREATE OR REPLACE FUNCTION accounting.auto_recalculate_corporate_tax()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting
AS $$
DECLARE
  v_entry_date DATE;
  v_year_start DATE;
  v_year_end DATE;
BEGIN
  -- Obtener fecha del asiento que disparó el trigger
  SELECT entry_date INTO v_entry_date
  FROM accounting.journal_entries
  WHERE id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
  
  IF v_entry_date IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Calcular inicio y fin del año fiscal
  v_year_start := DATE_TRUNC('year', v_entry_date)::DATE;
  v_year_end := (DATE_TRUNC('year', v_entry_date) + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
  
  -- Recalcular IS para el año fiscal
  PERFORM accounting.calculate_corporate_tax(
    p_period_start := v_year_start,
    p_period_end := v_year_end,
    p_force_recalculate := true
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. TRIGGER: Recalcular IS cuando se crea/modifica/elimina una línea de asiento
CREATE TRIGGER trigger_auto_recalculate_corporate_tax
  AFTER INSERT OR UPDATE OR DELETE ON accounting.journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION accounting.auto_recalculate_corporate_tax();

-- 5. FUNCIÓN: Obtener resumen de IS
CREATE OR REPLACE FUNCTION accounting.get_corporate_tax_summary(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  profit_before_tax NUMERIC(12,2),
  tax_rate NUMERIC(5,2),
  tax_amount NUMERIC(12,2),
  provision_entry_id UUID,
  provision_entry_number TEXT,
  provision_date DATE
)
LANGUAGE plpgsql
STABLE
SET search_path = accounting
AS $$
DECLARE
  v_tax_rate NUMERIC(5,2);
BEGIN
  -- Obtener tasa de IS configurada
  SELECT default_rate INTO v_tax_rate
  FROM accounting.tax_config
  WHERE tax_code = 'IS_25'
  LIMIT 1;
  
  IF v_tax_rate IS NULL THEN
    v_tax_rate := 25.00;
  END IF;
  
  -- Calcular BAI
  RETURN QUERY
  SELECT 
    pbt.profit_before_tax,
    v_tax_rate,
    CASE 
      WHEN pbt.profit_before_tax > 0 THEN pbt.profit_before_tax * (v_tax_rate / 100)
      ELSE 0
    END,
    je.id,
    je.entry_number,
    je.entry_date
  FROM accounting.calculate_profit_before_tax(p_period_start, p_period_end) pbt
  LEFT JOIN accounting.journal_entries je ON je.entry_type = 'TAX_PROVISION'
    AND (
      (p_period_start IS NULL AND p_period_end IS NULL) OR
      (je.entry_date BETWEEN p_period_start AND p_period_end)
    )
  ORDER BY je.created_at DESC
  LIMIT 1;
END;
$$;

-- Comentarios
COMMENT ON FUNCTION accounting.calculate_profit_before_tax IS 'Calcula el resultado antes de impuestos (BAI) basado en ingresos y gastos contabilizados';
COMMENT ON FUNCTION accounting.calculate_corporate_tax IS 'Calcula y crea/actualiza el asiento de provisión de Impuesto de Sociedades';
COMMENT ON FUNCTION accounting.auto_recalculate_corporate_tax IS 'Trigger function que recalcula automáticamente el IS cuando se registran ingresos o gastos';
COMMENT ON FUNCTION accounting.get_corporate_tax_summary IS 'Obtiene un resumen del cálculo de IS con la provisión actual';
