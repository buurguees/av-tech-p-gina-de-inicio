-- Migration: add_product_id_to_invoice_lines
-- Añade trazabilidad de productos del catálogo en líneas de factura de venta.
-- Cierra el gap entre invoice_lines (ventas) y el sistema de stock existente.

-- 1. Añadir columna product_id a sales.invoice_lines
ALTER TABLE sales.invoice_lines
  ADD COLUMN IF NOT EXISTS product_id UUID
  REFERENCES catalog.products(id) ON DELETE SET NULL;

-- 2. Actualizar add_invoice_line: incluir product_id en el INSERT
CREATE OR REPLACE FUNCTION public.add_invoice_line(
  p_invoice_id       UUID,
  p_concept          TEXT,
  p_description      TEXT    DEFAULT NULL,
  p_quantity         NUMERIC DEFAULT 1,
  p_unit_price       NUMERIC DEFAULT 0,
  p_discount_percent NUMERIC DEFAULT 0,
  p_tax_rate         NUMERIC DEFAULT 21,
  p_tax_id           UUID    DEFAULT NULL,
  p_product_id       UUID    DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_locked BOOLEAN;
  v_line_id   UUID;
  v_max_order INTEGER;
BEGIN
  SELECT is_locked INTO v_is_locked FROM sales.invoices WHERE id = p_invoice_id;
  IF COALESCE(v_is_locked, false) THEN
    RAISE EXCEPTION 'No se pueden añadir líneas a una factura bloqueada';
  END IF;

  SELECT COALESCE(MAX(line_order), 0) INTO v_max_order
  FROM sales.invoice_lines
  WHERE invoice_id = p_invoice_id;

  INSERT INTO sales.invoice_lines (
    invoice_id,
    concept,
    description,
    quantity,
    unit_price,
    discount_percent,
    tax_rate,
    line_order,
    product_id
  ) VALUES (
    p_invoice_id,
    p_concept,
    p_description,
    p_quantity,
    p_unit_price,
    p_discount_percent,
    p_tax_rate,
    v_max_order + 1,
    p_product_id
  )
  RETURNING id INTO v_line_id;

  RETURN v_line_id;
END;
$$;

-- 3. Actualizar update_invoice_line: añadir p_product_id
-- Hay que DROP + CREATE porque cambia la firma (añadimos un parámetro)
DROP FUNCTION IF EXISTS public.update_invoice_line(uuid, text, text, numeric, numeric, numeric, numeric);

CREATE FUNCTION public.update_invoice_line(
  p_line_id          UUID,
  p_concept          TEXT    DEFAULT NULL,
  p_description      TEXT    DEFAULT NULL,
  p_quantity         NUMERIC DEFAULT NULL,
  p_unit_price       NUMERIC DEFAULT NULL,
  p_discount_percent NUMERIC DEFAULT NULL,
  p_tax_rate         NUMERIC DEFAULT NULL,
  p_product_id       UUID    DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_id UUID;
  v_is_locked  BOOLEAN;
BEGIN
  SELECT invoice_id INTO v_invoice_id FROM sales.invoice_lines WHERE id = p_line_id;
  SELECT is_locked  INTO v_is_locked  FROM sales.invoices WHERE id = v_invoice_id;

  IF COALESCE(v_is_locked, false) THEN
    RAISE EXCEPTION 'No se pueden editar líneas de una factura bloqueada';
  END IF;

  UPDATE sales.invoice_lines
  SET
    concept          = COALESCE(p_concept,          concept),
    description      = COALESCE(p_description,      description),
    quantity         = COALESCE(p_quantity,          quantity),
    unit_price       = COALESCE(p_unit_price,        unit_price),
    discount_percent = COALESCE(p_discount_percent,  discount_percent),
    tax_rate         = COALESCE(p_tax_rate,          tax_rate),
    product_id       = COALESCE(p_product_id,        product_id),
    updated_at       = now()
  WHERE id = p_line_id;

  RETURN FOUND;
END;
$$;

-- Re-grant permisos para la nueva firma
GRANT ALL ON FUNCTION public.update_invoice_line(uuid, text, text, numeric, numeric, numeric, numeric, uuid)
  TO anon, authenticated, service_role;

-- 4. Actualizar finance_update_invoice_line: pasar p_product_id al wrapper
DROP FUNCTION IF EXISTS public.finance_update_invoice_line(uuid, text, text, numeric, numeric, numeric, numeric);

CREATE FUNCTION public.finance_update_invoice_line(
  p_line_id          UUID,
  p_concept          TEXT    DEFAULT NULL,
  p_description      TEXT    DEFAULT NULL,
  p_quantity         NUMERIC DEFAULT NULL,
  p_unit_price       NUMERIC DEFAULT NULL,
  p_discount_percent NUMERIC DEFAULT NULL,
  p_tax_rate         NUMERIC DEFAULT NULL,
  p_product_id       UUID    DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.update_invoice_line($1, $2, $3, $4, $5, $6, $7, $8);
$$;

GRANT ALL ON FUNCTION public.finance_update_invoice_line(uuid, text, text, numeric, numeric, numeric, numeric, uuid)
  TO anon, authenticated, service_role;

-- 5. Actualizar finance_get_invoice_lines: devolver product_id real (no NULL hardcodeado)
CREATE OR REPLACE FUNCTION public.finance_get_invoice_lines(p_invoice_id UUID)
RETURNS TABLE (
  id               UUID,
  line_order       INTEGER,
  product_id       UUID,
  concept          TEXT,
  description      TEXT,
  quantity         NUMERIC,
  unit             TEXT,
  unit_price       NUMERIC,
  discount_percent NUMERIC,
  tax_rate         NUMERIC,
  subtotal         NUMERIC,
  tax_amount       NUMERIC,
  total            NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id        UUID;
  v_is_service_role BOOLEAN;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  v_is_service_role := COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role';

  IF v_user_id IS NULL AND NOT v_is_service_role THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;

  RETURN QUERY
  SELECT
    il.id,
    il.line_order,
    il.product_id,
    il.concept,
    il.description,
    il.quantity,
    'ud'::TEXT AS unit,
    il.unit_price,
    COALESCE(il.discount_percent, 0) AS discount_percent,
    COALESCE(il.tax_rate, 0) AS tax_rate,
    il.quantity * il.unit_price * (1 - COALESCE(il.discount_percent, 0) / 100) AS subtotal,
    il.quantity * il.unit_price * (1 - COALESCE(il.discount_percent, 0) / 100) * (COALESCE(il.tax_rate, 0) / 100) AS tax_amount,
    il.quantity * il.unit_price * (1 - COALESCE(il.discount_percent, 0) / 100) * (1 + COALESCE(il.tax_rate, 0) / 100) AS total
  FROM sales.invoice_lines il
  WHERE il.invoice_id = p_invoice_id
  ORDER BY il.line_order;
END;
$$;

-- 6. Montar trigger de stock sobre sales.invoice_lines
-- (La función catalog.on_invoice_line_stock() ya existe y gestiona NULL product_id, BUNDLES, idempotencia)
DROP TRIGGER IF EXISTS trigger_invoice_line_stock ON sales.invoice_lines;

CREATE TRIGGER trigger_invoice_line_stock
  AFTER INSERT OR DELETE OR UPDATE OF quantity, product_id
  ON sales.invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION catalog.on_invoice_line_stock();
