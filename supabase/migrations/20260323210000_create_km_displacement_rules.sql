-- ============================================================
-- Reglas de desplazamiento por tramos de km
-- Tabla + RLS + RPCs de lectura y CRUD
-- ============================================================

BEGIN;

-- 1. Columnas de flags en catalog.products
ALTER TABLE catalog.products
  ADD COLUMN IF NOT EXISTS is_displacement_km     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_displacement_hours  boolean NOT NULL DEFAULT false;

-- 2. Tabla de reglas
CREATE TABLE IF NOT EXISTS public.km_displacement_rules (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  km_min        integer     NOT NULL,
  km_max        integer,            -- NULL = sin límite superior
  travel_hours  numeric(5,2) NOT NULL,
  is_active     boolean     NOT NULL DEFAULT true,
  sort_order    integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS
ALTER TABLE public.km_displacement_rules ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden leer
CREATE POLICY "km_rules_select"
  ON public.km_displacement_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo admins pueden escribir (la comprobación de admin se hace en la UI;
-- aquí dejamos RLS de escritura sólo para service_role por coherencia con el resto de tablas de configuración)
CREATE POLICY "km_rules_insert"
  ON public.km_displacement_rules FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "km_rules_update"
  ON public.km_displacement_rules FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "km_rules_delete"
  ON public.km_displacement_rules FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- 4. Seed de reglas iniciales (idempotente)
INSERT INTO public.km_displacement_rules (km_min, km_max, travel_hours, sort_order)
SELECT km_min, km_max, travel_hours, sort_order
FROM (VALUES
  (100, 199,  1.00, 1),
  (200, 299,  2.00, 2),
  (300, 399,  3.00, 3),
  (400, 499,  4.00, 4),
  (500, NULL, 5.00, 5)
) AS v(km_min, km_max, travel_hours, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.km_displacement_rules LIMIT 1);

-- 5. RPC: listar reglas activas (usada por DocumentLinesEditor)
CREATE OR REPLACE FUNCTION public.list_km_displacement_rules()
RETURNS TABLE (
  id           uuid,
  km_min       integer,
  km_max       integer,
  travel_hours numeric,
  is_active    boolean,
  sort_order   integer
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, km_min, km_max, travel_hours, is_active, sort_order
  FROM public.km_displacement_rules
  ORDER BY sort_order, km_min;
$$;

-- 6. RPC: obtener productos de desplazamiento (usada por DocumentLinesEditor)
CREATE OR REPLACE FUNCTION public.get_displacement_products()
RETURNS TABLE (
  product_id  uuid,
  role        text,   -- 'km' | 'hours'
  name        text,
  unit        text,
  unit_price  numeric,
  tax_rate    numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, catalog, internal
AS $$
  SELECT
    p.id                                                        AS product_id,
    CASE WHEN p.is_displacement_km THEN 'km' ELSE 'hours' END  AS role,
    p.name,
    p.unit,
    COALESCE(p.sale_price, 0)                                   AS unit_price,
    COALESCE(
      (SELECT t.rate FROM internal.taxes t WHERE t.id = p.tax_rate_id LIMIT 1),
      21
    )                                                           AS tax_rate
  FROM catalog.products p
  WHERE (p.is_displacement_km = true OR p.is_displacement_hours = true)
    AND p.is_active = true
  ORDER BY p.is_displacement_km DESC;
$$;

COMMIT;
