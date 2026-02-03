-- =====================================================
-- FIX: Provisión IS idempotente + trigger sin recursión
-- 1) calculate_corporate_tax: con force_recalculate,
--    reutilizar asiento existente del mismo período (UPDATE
--    líneas) en lugar de crear otro → evita duplicados.
-- 2) Trigger: no disparar en asientos TAX_PROVISION ni
--    TAX_SETTLEMENT para evitar recursión y recálculos falsos.
-- =====================================================

-- 1. calculate_corporate_tax: idempotente por período
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
  SELECT auth.uid() INTO v_user_id;

  SELECT profit_before_tax INTO v_profit_before_tax
  FROM accounting.calculate_profit_before_tax(p_period_start, p_period_end);

  IF v_profit_before_tax > 0 THEN
    v_tax_amount := v_profit_before_tax * (p_tax_rate / 100);
  ELSE
    v_tax_amount := 0;
  END IF;

  IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL THEN
    v_period_description := 'Período: ' || p_period_start::TEXT || ' a ' || p_period_end::TEXT;
  ELSE
    v_period_description := 'Acumulado hasta ' || CURRENT_DATE::TEXT;
  END IF;

  -- Siempre buscar asiento existente para este período (idempotencia).
  -- Si existe y no está bloqueado, reutilizamos y actualizamos importes.
  SELECT je.id INTO v_existing_entry_id
  FROM accounting.journal_entries je
  WHERE je.entry_type = 'TAX_PROVISION'
    AND je.reference_type = 'corporate_tax'
    AND je.is_locked = false
    AND je.description LIKE '%' || v_period_description || '%'
  ORDER BY je.created_at DESC
  LIMIT 1;

  IF v_existing_entry_id IS NOT NULL THEN
    -- Reutilizar asiento: borrar líneas y actualizar descripción
    DELETE FROM accounting.journal_entry_lines
    WHERE journal_entry_id = v_existing_entry_id;

    UPDATE accounting.journal_entries
    SET description = 'Provisión IS ' || p_tax_rate || '% - ' || v_period_description || ' - BAI: ' || v_profit_before_tax || '€ - IS: ' || v_tax_amount || '€',
        updated_at = now()
    WHERE id = v_existing_entry_id;

    v_entry_id := v_existing_entry_id;
  ELSE
    -- Crear nuevo asiento solo si no existe uno para este período
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

  IF v_tax_amount > 0 THEN
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

-- 2. Trigger: no recalcular cuando las líneas son de TAX_PROVISION o TAX_SETTLEMENT
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
  SELECT je.entry_date, je.entry_type INTO v_entry_date, v_entry_type
  FROM accounting.journal_entries je
  WHERE je.id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);

  IF v_entry_date IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- No recalcular cuando el asiento es provisión IS o liquidación de impuestos
  IF v_entry_type IN ('TAX_PROVISION', 'TAX_SETTLEMENT') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_year_start := DATE_TRUNC('year', v_entry_date)::DATE;
  v_year_end := (DATE_TRUNC('year', v_entry_date) + INTERVAL '1 year' - INTERVAL '1 day')::DATE;

  PERFORM accounting.calculate_corporate_tax(
    p_period_start := v_year_start,
    p_period_end := v_year_end,
    p_force_recalculate := true
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION accounting.calculate_corporate_tax IS 'Calcula/actualiza provisión IS. Idempotente: reutiliza asiento del mismo período si existe.';
COMMENT ON FUNCTION accounting.auto_recalculate_corporate_tax IS 'Recalcula IS al cambiar ingresos/gastos. Excluye TAX_PROVISION y TAX_SETTLEMENT para evitar recursión.';
