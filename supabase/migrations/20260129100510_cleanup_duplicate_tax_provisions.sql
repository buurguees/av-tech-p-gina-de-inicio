-- =====================================================
-- Limpieza: Eliminar provisiones IS duplicadas (630000)
-- Elimina todas y crea UNA provisión correcta
-- =====================================================

-- Función auxiliar para recrear provisión (usa primer usuario autorizado en migraciones)
CREATE OR REPLACE FUNCTION accounting.recreate_corporate_tax_for_year(
  p_year INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = accounting, internal
AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_user_id UUID;
  v_pbt NUMERIC(12,2);
  v_tax NUMERIC(12,2);
  v_entry_id UUID;
  v_entry_number TEXT;
  v_count INT;
BEGIN
  v_start := make_date(p_year, 1, 1);
  v_end := (v_start + interval '1 year' - interval '1 day')::date;
  
  -- Usar primer usuario autorizado (para contexto de migración)
  SELECT id INTO v_user_id FROM internal.authorized_users ORDER BY created_at LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No hay usuarios autorizados para crear la provisión';
  END IF;
  
  -- Eliminar provisiones existentes del año
  DELETE FROM accounting.journal_entries
  WHERE entry_type = 'TAX_PROVISION'
    AND entry_date BETWEEN v_start AND v_end;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Calcular BAI e IS
  SELECT profit_before_tax INTO v_pbt
  FROM accounting.calculate_profit_before_tax(v_start, v_end)
  LIMIT 1;
  
  v_tax := CASE WHEN v_pbt > 0 THEN v_pbt * 0.25 ELSE 0 END;
  
  IF v_tax > 0 THEN
    v_entry_number := accounting.get_next_entry_number();
    
    INSERT INTO accounting.journal_entries (
      entry_number, entry_date, entry_type, description,
      reference_type, created_by
    ) VALUES (
      v_entry_number, v_end, 'TAX_PROVISION',
      'Provisión IS 25% - Período: ' || v_start || ' a ' || v_end || ' - BAI: ' || v_pbt || '€ - IS: ' || v_tax || '€',
      'corporate_tax', v_user_id
    ) RETURNING id INTO v_entry_id;
    
    INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_credit, amount, description, line_order)
    VALUES (v_entry_id, '630000', 'DEBIT', v_tax, 'Provisión IS 25% sobre BAI: ' || v_pbt || '€', 1);
    
    INSERT INTO accounting.journal_entry_lines (journal_entry_id, account_code, debit_credit, amount, description, line_order)
    VALUES (v_entry_id, '475200', 'CREDIT', v_tax, 'Provisión IS a pagar', 2);
  END IF;
  
  RAISE NOTICE 'Limpieza IS %: eliminadas % duplicadas, creada 1 provisión correcta (%.2f €)', p_year, v_count, v_tax;
END;
$$;

-- Ejecutar limpieza para 2026
SELECT accounting.recreate_corporate_tax_for_year(2026);
