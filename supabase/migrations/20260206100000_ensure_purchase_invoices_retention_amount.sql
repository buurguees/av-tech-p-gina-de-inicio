--
-- Asegurar que sales.purchase_invoices tiene la columna retention_amount.
-- Las RPC list_purchase_invoices y otras usan pi.retention_amount; si la columna
-- no existe (p. ej. BD creada sin la migración 20260118200000 completa), fallan.
--
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales'
      AND table_name = 'purchase_invoices'
      AND column_name = 'retention_amount'
  ) THEN
    ALTER TABLE sales.purchase_invoices
    ADD COLUMN retention_amount NUMERIC(12,2) DEFAULT 0;
  END IF;
END $$;
