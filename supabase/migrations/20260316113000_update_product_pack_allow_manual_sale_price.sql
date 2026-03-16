-- Permitir editar manualmente el precio base de un pack en catalog.products

DROP FUNCTION IF EXISTS public.update_product_pack(uuid, text, text, numeric, numeric, boolean);

CREATE FUNCTION public.update_product_pack(
  p_pack_id uuid,
  p_name text DEFAULT NULL::text,
  p_description text DEFAULT NULL::text,
  p_sale_price numeric DEFAULT NULL::numeric,
  p_discount_percent numeric DEFAULT NULL::numeric,
  p_tax_rate numeric DEFAULT NULL::numeric,
  p_is_active boolean DEFAULT NULL::boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'catalog'
AS $function$
DECLARE
  v_tax_rate_id uuid;
BEGIN
  IF p_sale_price IS NOT NULL AND p_sale_price < 0 THEN
    RAISE EXCEPTION 'El precio base del pack no puede ser negativo';
  END IF;

  IF p_discount_percent IS NOT NULL AND (p_discount_percent < 0 OR p_discount_percent >= 100) THEN
    RAISE EXCEPTION 'El descuento del pack debe estar entre 0 y 99.9999';
  END IF;

  IF p_tax_rate IS NOT NULL THEN
    SELECT tr.id
    INTO v_tax_rate_id
    FROM catalog.tax_rates tr
    WHERE tr.rate = p_tax_rate
      AND tr.is_active = true
    ORDER BY tr.is_default DESC, tr.created_at ASC
    LIMIT 1;

    IF v_tax_rate_id IS NULL THEN
      RAISE EXCEPTION 'No existe un impuesto activo con tasa %', p_tax_rate;
    END IF;
  END IF;

  UPDATE catalog.products p
  SET
    name = COALESCE(UPPER(NULLIF(BTRIM(p_name), '')), p.name),
    description = CASE
      WHEN p_description IS NULL THEN p.description
      ELSE NULLIF(BTRIM(p_description), '')
    END,
    sale_price = COALESCE(p_sale_price, p.sale_price),
    discount_percent = COALESCE(p_discount_percent, p.discount_percent),
    tax_rate_id = COALESCE(v_tax_rate_id, p.tax_rate_id),
    is_active = COALESCE(p_is_active, p.is_active),
    updated_at = now()
  WHERE p.id = p_pack_id
    AND p.product_type = 'BUNDLE';

  RETURN FOUND;
END;
$function$;

GRANT ALL ON FUNCTION public.update_product_pack(uuid, text, text, numeric, numeric, numeric, boolean) TO anon;
GRANT ALL ON FUNCTION public.update_product_pack(uuid, text, text, numeric, numeric, numeric, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.update_product_pack(uuid, text, text, numeric, numeric, numeric, boolean) TO service_role;
