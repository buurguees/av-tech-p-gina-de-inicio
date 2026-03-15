DO $$
DECLARE
  v_created_by uuid;
  v_entry_id uuid;
  v_entry_number text;
  v_line_order integer := 1;
  v_total_delta numeric(12,2) := 0;
  v_note text := 'Regularizacion manual de saldos bancarios segun saldos reales facilitados por usuario el 2026-03-13. Revolut queda alineado provisionalmente pendiente de registrar tickets desde 2026-03-04.';
  v_existing_entry_id uuid;
  v_bank record;
BEGIN
  SELECT je.id
  INTO v_existing_entry_id
  FROM accounting.journal_entries je
  WHERE je.entry_date = DATE '2026-03-13'
    AND je.reference_type = 'BANK_BALANCE_REALIGNMENT'
    AND je.description = v_note
  LIMIT 1;

  IF v_existing_entry_id IS NOT NULL THEN
    RAISE NOTICE 'La regularizacion bancaria del 2026-03-13 ya existe: %', v_existing_entry_id;
    RETURN;
  END IF;

  SELECT au.id
  INTO v_created_by
  FROM internal.authorized_users au
  WHERE au.email = 'alex.burgues@avtechesdeveniments.com'
    AND au.is_active = true
  LIMIT 1;

  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'No se encontro usuario autorizado activo para alex.burgues@avtechesdeveniments.com';
  END IF;

  SELECT COALESCE(SUM(delta_amount), 0)
  INTO v_total_delta
  FROM (
    WITH targets AS (
      SELECT *
      FROM (
        VALUES
          ('572001', 'Banco Sabadell Negocios', 3477.46::numeric(12,2)),
          ('572002', 'Banco CaixaBank Empreses', 2121.39::numeric(12,2)),
          ('572003', 'Banco Revolut Business', 215.74::numeric(12,2))
      ) AS t(account_code, bank_name, target_balance)
    ),
    current_balances AS (
      SELECT
        bank.account_code,
        COALESCE(bank.balance, 0)::numeric(12,2) AS current_balance
      FROM public.list_bank_accounts_with_balances(DATE '2026-03-13') bank
    )
    SELECT
      t.account_code,
      t.bank_name,
      t.target_balance,
      COALESCE(cb.current_balance, 0)::numeric(12,2) AS current_balance,
      ROUND(t.target_balance - COALESCE(cb.current_balance, 0), 2) AS delta_amount
    FROM targets t
    LEFT JOIN current_balances cb ON cb.account_code = t.account_code
  ) deltas
  WHERE ABS(delta_amount) >= 0.01;

  IF ABS(v_total_delta) < 0.01
    AND NOT EXISTS (
      WITH targets AS (
        SELECT *
        FROM (
          VALUES
            ('572001', 3477.46::numeric(12,2)),
            ('572002', 2121.39::numeric(12,2)),
            ('572003', 215.74::numeric(12,2))
        ) AS t(account_code, target_balance)
      ),
      current_balances AS (
        SELECT
          bank.account_code,
          COALESCE(bank.balance, 0)::numeric(12,2) AS current_balance
        FROM public.list_bank_accounts_with_balances(DATE '2026-03-13') bank
      )
      SELECT 1
      FROM targets t
      LEFT JOIN current_balances cb ON cb.account_code = t.account_code
      WHERE ABS(ROUND(t.target_balance - COALESCE(cb.current_balance, 0), 2)) >= 0.01
    ) THEN
    RAISE NOTICE 'Los saldos bancarios del 2026-03-13 ya estaban alineados. No se crea asiento.';
    RETURN;
  END IF;

  v_entry_number := accounting.get_next_entry_number();

  INSERT INTO accounting.journal_entries (
    entry_number,
    entry_date,
    entry_type,
    description,
    reference_type,
    is_automatic,
    is_locked,
    created_by
  ) VALUES (
    v_entry_number,
    DATE '2026-03-13',
    'ADJUSTMENT',
    v_note,
    'BANK_BALANCE_REALIGNMENT',
    false,
    false,
    v_created_by
  )
  RETURNING id INTO v_entry_id;

  FOR v_bank IN
    WITH targets AS (
      SELECT *
      FROM (
        VALUES
          ('572001', 'Banco Sabadell Negocios', 3477.46::numeric(12,2)),
          ('572002', 'Banco CaixaBank Empreses', 2121.39::numeric(12,2)),
          ('572003', 'Banco Revolut Business', 215.74::numeric(12,2))
      ) AS t(account_code, bank_name, target_balance)
    ),
    current_balances AS (
      SELECT
        bank.account_code,
        COALESCE(bank.balance, 0)::numeric(12,2) AS current_balance
      FROM public.list_bank_accounts_with_balances(DATE '2026-03-13') bank
    )
    SELECT
      t.account_code,
      t.bank_name,
      ROUND(t.target_balance - COALESCE(cb.current_balance, 0), 2) AS delta_amount
    FROM targets t
    LEFT JOIN current_balances cb ON cb.account_code = t.account_code
    WHERE ABS(ROUND(t.target_balance - COALESCE(cb.current_balance, 0), 2)) >= 0.01
    ORDER BY t.account_code
  LOOP
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id,
      line_order,
      account_code,
      description,
      amount,
      debit_credit
    ) VALUES (
      v_entry_id,
      v_line_order,
      v_bank.account_code,
      'Regularizacion saldo real ' || v_bank.bank_name,
      ABS(v_bank.delta_amount),
      CASE WHEN v_bank.delta_amount > 0 THEN 'DEBIT' ELSE 'CREDIT' END
    );

    v_line_order := v_line_order + 1;
  END LOOP;

  IF ABS(v_total_delta) >= 0.01 THEN
    INSERT INTO accounting.journal_entry_lines (
      journal_entry_id,
      line_order,
      account_code,
      description,
      amount,
      debit_credit
    ) VALUES (
      v_entry_id,
      v_line_order,
      '129000',
      'Contrapartida regularizacion saldos bancarios 2026-03-13',
      ABS(v_total_delta),
      CASE WHEN v_total_delta > 0 THEN 'CREDIT' ELSE 'DEBIT' END
    );
  END IF;

  RAISE NOTICE 'Regularizacion bancaria creada: % (%)', v_entry_id, v_entry_number;
END;
$$;
