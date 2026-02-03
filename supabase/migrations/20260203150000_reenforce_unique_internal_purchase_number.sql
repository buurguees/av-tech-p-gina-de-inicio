--
-- Reforzar unicidad de internal_purchase_number (por si 20260203140000 falló por LIMIT en UPDATE).
-- 1) Corregir de nuevo cualquier duplicado (idempotente).
-- 2) Asegurar índice UNIQUE.
--

DO $$
DECLARE
  r RECORD;
  dup RECORD;
  v_new_num TEXT;
  v_keep_id UUID;
BEGIN
  FOR r IN
    SELECT trim(internal_purchase_number) AS num, COUNT(*) AS cnt
    FROM sales.purchase_invoices
    WHERE internal_purchase_number IS NOT NULL AND trim(internal_purchase_number) != ''
    GROUP BY trim(internal_purchase_number)
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO v_keep_id FROM sales.purchase_invoices
      WHERE trim(internal_purchase_number) = r.num ORDER BY id ASC LIMIT 1;
    FOR dup IN
      SELECT id
      FROM sales.purchase_invoices
      WHERE trim(internal_purchase_number) = r.num AND id != v_keep_id
    LOOP
      IF r.num LIKE 'TICKET-%' THEN
        LOOP
          v_new_num := 'TICKET-' || to_char(CURRENT_DATE, 'YY') || '-' || lpad(nextval('sales.purchase_invoice_ticket_seq')::TEXT, 6, '0');
          EXIT WHEN NOT EXISTS (SELECT 1 FROM sales.purchase_invoices WHERE internal_purchase_number = v_new_num);
        END LOOP;
      ELSE
        LOOP
          v_new_num := 'C-' || to_char(CURRENT_DATE, 'YY') || '-' || lpad(nextval('sales.purchase_invoice_definitive_seq')::TEXT, 6, '0');
          EXIT WHEN NOT EXISTS (SELECT 1 FROM sales.purchase_invoices WHERE internal_purchase_number = v_new_num);
        END LOOP;
      END IF;
      UPDATE sales.purchase_invoices
      SET internal_purchase_number = v_new_num, updated_at = now()
      WHERE id = dup.id;
    END LOOP;
  END LOOP;
END $$;

-- Índice único (si ya existe por 20260203140000, no falla)
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_invoices_internal_number_unique
  ON sales.purchase_invoices (internal_purchase_number)
  WHERE internal_purchase_number IS NOT NULL AND trim(internal_purchase_number) != '';
