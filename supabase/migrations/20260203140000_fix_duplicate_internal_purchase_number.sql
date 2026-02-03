--
-- Evitar y corregir números definitivos de factura de compra duplicados (C-YY-XXXXXX).
-- 0) Normalizar espacios en internal_purchase_number.
-- 1) Reasignar número definitivo a filas duplicadas (mantener el de id más antiguo, reasignar el resto).
-- 2) Añadir UNIQUE en internal_purchase_number para que no vuelva a haber duplicados.
--

-- 0. Normalizar espacios
UPDATE sales.purchase_invoices
SET internal_purchase_number = trim(internal_purchase_number), updated_at = now()
WHERE internal_purchase_number IS NOT NULL AND internal_purchase_number != trim(internal_purchase_number);

-- 1. Reasignar números a duplicados
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

-- 2. Índice único para evitar duplicados (solo donde hay valor)
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_invoices_internal_number_unique
  ON sales.purchase_invoices (internal_purchase_number)
  WHERE internal_purchase_number IS NOT NULL AND trim(internal_purchase_number) != '';
