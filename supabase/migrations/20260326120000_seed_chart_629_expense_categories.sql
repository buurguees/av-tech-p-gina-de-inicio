-- Migración: crear cuentas del grupo 629 que usa create_invoice_purchase_entry
-- Causa del error: la migración 20260319100000 introdujo account_codes 629.x
-- pero nunca los insertó en accounting.chart_of_accounts (FK constraint violation).
-- Sin estas cuentas, cualquier ticket con expense_category (TRANSPORT, FUEL, etc.)
-- fallaba al aprobar y revertía toda la transacción.
-- Impacto real: 84 tickets bloqueados en PENDING_VALIDATION sin datos corruptos.
-- Esta migración es el único fix necesario.

INSERT INTO accounting.chart_of_accounts (account_code, account_name, account_type, parent_account_code, is_active)
VALUES
  ('629.1', 'Dietas y manutención',      'EXPENSE', NULL, true),
  ('629.2', 'Combustible',               'EXPENSE', NULL, true),
  ('629.3', 'Material fungible',         'EXPENSE', NULL, true),
  ('629.5', 'Aparcamiento',              'EXPENSE', NULL, true),
  ('629.6', 'Transportes',               'EXPENSE', NULL, true),
  ('629.7', 'Alojamiento',               'EXPENSE', NULL, true),
  ('629.8', 'Multas y sanciones',        'EXPENSE', NULL, true),
  ('629.9', 'Otros gastos diversos',     'EXPENSE', NULL, true)
ON CONFLICT (account_code) DO NOTHING;
