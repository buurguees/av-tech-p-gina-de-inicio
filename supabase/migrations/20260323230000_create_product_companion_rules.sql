-- ============================================================
-- Reglas de producto acompañante
-- Permite definir que producto X genera automáticamente
-- una sub-línea del producto Y con ratio configurable.
-- Ej: 1 JORNADA TÉCNICO → 1 MEDIA DIETA
-- ============================================================

BEGIN;

-- Flags en catalog.products
ALTER TABLE catalog.products
  ADD COLUMN IF NOT EXISTS is_companion_trigger  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_companion_product  boolean NOT NULL DEFAULT false;

-- Tabla de reglas
CREATE TABLE IF NOT EXISTS public.product_companion_rules (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_product_id   uuid          NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  companion_product_id uuid          NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  quantity_ratio       numeric(10,4) NOT NULL DEFAULT 1.0,
  is_active            boolean       NOT NULL DEFAULT true,
  created_at           timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (trigger_product_id, companion_product_id)
);

ALTER TABLE public.product_companion_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_companion_rules"
  ON public.product_companion_rules FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "admin_manage_companion_rules"
  ON public.product_companion_rules FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

-- RPC: listar reglas con datos de productos
CREATE OR REPLACE FUNCTION public.list_product_companion_rules()
RETURNS TABLE (
  id                   uuid,
  trigger_product_id   uuid,
  trigger_sku          text,
  trigger_name         text,
  companion_product_id uuid,
  companion_sku        text,
  companion_name       text,
  companion_sale_price numeric,
  companion_tax_rate   numeric,
  quantity_ratio       numeric,
  is_active            boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, catalog, internal
AS $$
  SELECT
    r.id,
    r.trigger_product_id,
    tp.sku::text          AS trigger_sku,
    tp.name               AS trigger_name,
    r.companion_product_id,
    cp.sku::text          AS companion_sku,
    cp.name               AS companion_name,
    cp.sale_price         AS companion_sale_price,
    COALESCE(
      (SELECT t.rate FROM internal.taxes t WHERE t.id = cp.tax_rate_id LIMIT 1),
      21
    )                     AS companion_tax_rate,
    r.quantity_ratio,
    r.is_active
  FROM public.product_companion_rules r
  JOIN catalog.products tp ON tp.id = r.trigger_product_id
  JOIN catalog.products cp ON cp.id = r.companion_product_id
  ORDER BY tp.name, cp.name;
$$;

-- Marcar productos
UPDATE catalog.products SET is_companion_trigger = true WHERE sku = 'SP-01-0001'; -- JORNADA TÉCNICO
UPDATE catalog.products SET is_companion_product = true WHERE sku = 'GR-03-0002'; -- MEDIA DIETA

-- Seed: JORNADA TÉCNICO → MEDIA DIETA (ratio 1:1)
INSERT INTO public.product_companion_rules (trigger_product_id, companion_product_id, quantity_ratio)
SELECT t.id, c.id, 1.0
FROM catalog.products t
JOIN catalog.products c ON c.sku = 'GR-03-0002'
WHERE t.sku = 'SP-01-0001'
ON CONFLICT (trigger_product_id, companion_product_id) DO NOTHING;

COMMIT;
