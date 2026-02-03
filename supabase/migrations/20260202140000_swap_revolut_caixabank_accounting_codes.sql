--
-- Migración: Intercambiar códigos contables Revolut ↔ CaixaBank
-- Contexto: Revolut y CaixaBank tienen la información cruzada (id o código contable).
-- Esta migración intercambia los accounting_code entre ambos bancos.
--

DO $$
DECLARE
  v_revolut_id UUID;
  v_revolut_code TEXT;
  v_caixa_id UUID;
  v_caixa_code TEXT;
BEGIN
  -- Obtener Revolut (bank_name contiene 'revolut')
  SELECT id, accounting_code INTO v_revolut_id, v_revolut_code
  FROM internal.company_bank_accounts
  WHERE (bank_name ILIKE '%revolut%' OR COALESCE(notes, '') ILIKE '%revolut%')
    AND is_active = TRUE
  LIMIT 1;

  -- Obtener CaixaBank (bank_name contiene 'caixa')
  SELECT id, accounting_code INTO v_caixa_id, v_caixa_code
  FROM internal.company_bank_accounts
  WHERE (bank_name ILIKE '%caixa%' OR COALESCE(notes, '') ILIKE '%caixa%')
    AND is_active = TRUE
  LIMIT 1;

  -- Solo ejecutar si ambos existen y tienen códigos diferentes
  IF v_revolut_id IS NOT NULL AND v_caixa_id IS NOT NULL
     AND v_revolut_code IS NOT NULL AND v_caixa_code IS NOT NULL
     AND v_revolut_code != v_caixa_code THEN

    -- 1. Intercambiar en internal.company_bank_accounts (3 pasos por UNIQUE constraint)
    -- Crear código temporal en chart_of_accounts si no existe (por si hay FK)
    INSERT INTO accounting.chart_of_accounts (account_code, account_name, account_type, is_active)
    VALUES ('572999', 'Banco temporal swap', 'ASSET', true)
    ON CONFLICT (account_code) DO NOTHING;
    -- Paso 1: Revolut -> temp
    UPDATE internal.company_bank_accounts SET accounting_code = '572999' WHERE id = v_revolut_id;
    -- Paso 2: CaixaBank -> código de Revolut
    UPDATE internal.company_bank_accounts SET accounting_code = v_revolut_code WHERE id = v_caixa_id;
    -- Paso 3: Revolut (temp) -> código de CaixaBank
    UPDATE internal.company_bank_accounts SET accounting_code = v_caixa_code WHERE id = v_revolut_id;

    -- 2. Intercambiar en accounting.journal_entry_lines (asientos ya registrados)
    UPDATE accounting.journal_entry_lines
    SET account_code = CASE
      WHEN account_code = v_revolut_code THEN v_caixa_code
      WHEN account_code = v_caixa_code THEN v_revolut_code
    END
    WHERE account_code IN (v_revolut_code, v_caixa_code);

    RAISE NOTICE 'Intercambio aplicado: Revolut % ↔ CaixaBank %', v_revolut_code, v_caixa_code;
  ELSE
    RAISE NOTICE 'No se encontraron Revolut y CaixaBank con códigos diferentes, o faltan datos. Sin cambios.';
  END IF;
END $$;
