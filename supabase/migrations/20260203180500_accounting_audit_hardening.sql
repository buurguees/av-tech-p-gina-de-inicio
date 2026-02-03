-- =====================================================
-- Endurecimiento auditoría: UNIQUE IS, validator mejorado,
-- bloqueo por periodo cerrado.
-- =====================================================

-- 1. UNIQUE real para TAX_PROVISION por período (evita duplicados en BD).
--    Si falla por duplicados existentes, ejecutar antes cleanup (ej. 20260129100510_cleanup_duplicate_tax_provisions).
DROP INDEX IF EXISTS accounting.idx_journal_entries_period;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tax_provision_period
  ON accounting.journal_entries(period_start, period_end)
  WHERE entry_type = 'TAX_PROVISION' AND reference_type = 'corporate_tax';

-- 2. Helper: lanzar error si el periodo (año/mes) está cerrado
CREATE OR REPLACE FUNCTION accounting.raise_if_period_closed_for_date(p_date DATE)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting
AS $$
BEGIN
  IF accounting.is_period_closed(
    EXTRACT(YEAR FROM p_date)::INTEGER,
    EXTRACT(MONTH FROM p_date)::INTEGER
  ) THEN
    RAISE EXCEPTION 'Periodo cerrado: no se pueden registrar movimientos con fecha % (año % mes %)',
      p_date, EXTRACT(YEAR FROM p_date), EXTRACT(MONTH FROM p_date);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION accounting.raise_if_period_closed_for_ym(p_year INT, p_month INT)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = accounting
AS $$
BEGIN
  IF accounting.is_period_closed(p_year, p_month) THEN
    RAISE EXCEPTION 'Periodo cerrado: no se pueden registrar movimientos en %-%', p_year, p_month;
  END IF;
END;
$$;

COMMENT ON FUNCTION accounting.raise_if_period_closed_for_date IS 'Lanza excepcion si el periodo de p_date esta cerrado (period_closures).';
COMMENT ON FUNCTION accounting.raise_if_period_closed_for_ym IS 'Lanza excepcion si el periodo año/mes esta cerrado.';

-- 3. Trigger: impedir asientos en periodo cerrado (insert o update de entry_date)
CREATE OR REPLACE FUNCTION accounting.check_journal_entry_period_not_closed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting
AS $$
BEGIN
  IF NEW.entry_date IS NOT NULL
     AND accounting.is_period_closed(
           EXTRACT(YEAR FROM NEW.entry_date)::INTEGER,
           EXTRACT(MONTH FROM NEW.entry_date)::INTEGER
         ) THEN
    RAISE EXCEPTION 'Periodo cerrado: no se pueden crear ni modificar asientos con fecha % (año % mes %)',
      NEW.entry_date, EXTRACT(YEAR FROM NEW.entry_date), EXTRACT(MONTH FROM NEW.entry_date);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_journal_entry_period_closed ON accounting.journal_entries;
CREATE TRIGGER trigger_check_journal_entry_period_closed
  BEFORE INSERT OR UPDATE OF entry_date ON accounting.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION accounting.check_journal_entry_period_not_closed();

COMMENT ON FUNCTION accounting.check_journal_entry_period_not_closed IS 'Bloquea insert/update de asientos en periodo cerrado (period_closures).';
