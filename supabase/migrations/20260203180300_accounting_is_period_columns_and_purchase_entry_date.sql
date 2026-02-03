-- =====================================================
-- A) IS idempotente por período explícito (no LIKE description)
--    Añadir period_start/period_end a journal_entries y buscar
--    por ellos para TAX_PROVISION.
-- B) Fecha contable compras: usar updated_at cuando pasa a APPROVED
--    (aprobación real) en lugar de CURRENT_DATE.
-- =====================================================

-- 1. Añadir columnas de período a journal_entries (solo usadas por TAX_PROVISION)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'accounting' AND table_name = 'journal_entries' AND column_name = 'period_start'
  ) THEN
    ALTER TABLE accounting.journal_entries ADD COLUMN period_start DATE;
    ALTER TABLE accounting.journal_entries ADD COLUMN period_end DATE;
    COMMENT ON COLUMN accounting.journal_entries.period_start IS 'Inicio del período fiscal (ej. provisión IS).';
    COMMENT ON COLUMN accounting.journal_entries.period_end IS 'Fin del período fiscal (ej. provisión IS).';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_journal_entries_period
  ON accounting.journal_entries(period_start, period_end)
  WHERE entry_type = 'TAX_PROVISION' AND reference_type = 'corporate_tax';

-- 2. calculate_corporate_tax: buscar y rellenar por period_start/period_end
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

  -- Buscar asiento existente por período explícito (determinístico)
  IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL THEN
    SELECT je.id INTO v_existing_entry_id
    FROM accounting.journal_entries je
    WHERE je.entry_type = 'TAX_PROVISION'
      AND je.reference_type = 'corporate_tax'
      AND je.is_locked = false
      AND je.period_start = p_period_start
      AND je.period_end = p_period_end
    ORDER BY je.created_at DESC
    LIMIT 1;
  END IF;

  -- Fallback: búsqueda por descripción (asientos legacy sin period_start/period_end)
  IF v_existing_entry_id IS NULL THEN
    SELECT je.id INTO v_existing_entry_id
    FROM accounting.journal_entries je
    WHERE je.entry_type = 'TAX_PROVISION'
      AND je.reference_type = 'corporate_tax'
      AND je.is_locked = false
      AND je.description LIKE '%' || v_period_description || '%'
    ORDER BY je.created_at DESC
    LIMIT 1;
  END IF;

  IF v_existing_entry_id IS NOT NULL THEN
    DELETE FROM accounting.journal_entry_lines
    WHERE journal_entry_id = v_existing_entry_id;

    UPDATE accounting.journal_entries
    SET description = 'Provisión IS ' || p_tax_rate || '% - ' || v_period_description || ' - BAI: ' || v_profit_before_tax || '€ - IS: ' || v_tax_amount || '€',
        period_start = p_period_start,
        period_end = p_period_end,
        updated_at = now()
    WHERE id = v_existing_entry_id;

    v_entry_id := v_existing_entry_id;
  ELSE
    v_entry_number := accounting.get_next_entry_number();

    INSERT INTO accounting.journal_entries (
      entry_number,
      entry_date,
      entry_type,
      description,
      reference_type,
      period_start,
      period_end,
      created_by
    ) VALUES (
      v_entry_number,
      COALESCE(p_period_end, CURRENT_DATE),
      'TAX_PROVISION',
      'Provisión IS ' || p_tax_rate || '% - ' || v_period_description || ' - BAI: ' || v_profit_before_tax || '€ - IS: ' || v_tax_amount || '€',
      'corporate_tax',
      p_period_start,
      p_period_end,
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

-- 3. Fecha contable compras: issue_date, luego updated_at (fecha de aprobación), luego hoy
CREATE OR REPLACE FUNCTION accounting.auto_create_invoice_purchase_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, sales, internal
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_date DATE;
BEGIN
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    SELECT id INTO v_entry_id
    FROM accounting.journal_entries
    WHERE reference_id = NEW.id
      AND reference_type = 'purchase_invoice'
      AND entry_type = 'INVOICE_PURCHASE';

    IF v_entry_id IS NULL THEN
      -- Fecha contable: issue_date de factura, o fecha de aprobación (updated_at), o hoy
      v_entry_date := COALESCE(NEW.issue_date, NEW.updated_at::date, CURRENT_DATE);
      PERFORM accounting.create_invoice_purchase_entry(
        p_purchase_invoice_id := NEW.id,
        p_entry_date := v_entry_date
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION accounting.calculate_corporate_tax IS 'Provisión IS. Idempotente por period_start/period_end (o descripción legacy).';
COMMENT ON FUNCTION accounting.auto_create_invoice_purchase_entry IS 'Asiento al APPROVED. Fecha contable: issue_date, updated_at (aprobación) o CURRENT_DATE.';
