-- =====================================================
-- FIX: Evitar recursión en trigger auto_recalculate_corporate_tax
-- El trigger se disparaba al insertar líneas de provisión IS,
-- creando provisiones duplicadas (70k+ en cuenta 630000)
-- =====================================================

CREATE OR REPLACE FUNCTION accounting.auto_recalculate_corporate_tax()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting
AS $$
DECLARE
  v_entry_date DATE;
  v_entry_type accounting.journal_entry_type;
  v_year_start DATE;
  v_year_end DATE;
BEGIN
  -- Obtener fecha y tipo del asiento que disparó el trigger
  SELECT je.entry_date, je.entry_type INTO v_entry_date, v_entry_type
  FROM accounting.journal_entries je
  WHERE je.id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
  
  IF v_entry_date IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- CRÍTICO: No recalcular cuando las líneas pertenecen a un asiento TAX_PROVISION.
  -- Si no, al insertar las líneas de la provisión (630000, 475200) se dispara
  -- el trigger de nuevo → recursión → provisiones duplicadas.
  IF v_entry_type = 'TAX_PROVISION' THEN
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

COMMENT ON FUNCTION accounting.auto_recalculate_corporate_tax IS 'Recalcula IS cuando cambian ingresos/gastos. Excluye TAX_PROVISION para evitar recursión.';
