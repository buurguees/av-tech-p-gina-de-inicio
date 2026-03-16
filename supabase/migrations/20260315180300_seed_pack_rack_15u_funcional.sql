-- Pack RACK 15U EXTERIOR IP55 FUNCIONAL
-- Configuración mínima vendible: armario + regleta + bandeja + guía + 2× panel 1U + ventilador + termostato
-- Precio = suma componentes (sin descuento pack)
-- Idempotente: no inserta si ya existe pack con este nombre

BEGIN;

-- 1. Crear producto BUNDLE (solo si no existe)
INSERT INTO catalog.products (
  sku,
  name,
  description,
  product_type,
  category_id,
  unit,
  cost_price,
  sale_price,
  discount_percent,
  tax_rate_id,
  track_stock
)
SELECT
  catalog.next_product_number(NULL::uuid, 'BUNDLE'),
  'RACK 15U EXTERIOR IP55 FUNCIONAL',
  'Pack armario rack mural exterior IP55 15U BIACOM con configuración mínima: regleta, bandeja, guía 1U, 2× panel ciego 1U, ventilador y termostato.',
  'BUNDLE',
  NULL,
  'ud',
  NULL,
  (
    SELECT COALESCE(SUM(p.sale_price * pb.qty), 0)
    FROM (VALUES
      ('PA-06-0001', 1),
      ('PA-06-0002', 1),
      ('PA-06-0003', 1),
      ('PA-06-0004', 1),
      ('PA-06-0005', 2),
      ('PA-06-0007', 1),
      ('PA-06-0008', 1)
    ) AS pb(sku, qty)
    JOIN catalog.products p ON p.sku = pb.sku
  ),
  0,
  '087c9828-3f47-4f56-8a79-55d36f30f943'::uuid,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM catalog.products
  WHERE name = 'RACK 15U EXTERIOR IP55 FUNCIONAL' AND product_type = 'BUNDLE'
);

-- 2. Añadir componentes al bundle (solo si el pack no tiene componentes aún)
INSERT INTO catalog.product_bundles (bundle_product_id, component_product_id, quantity)
SELECT
  b.id,
  p.id,
  pb.qty
FROM catalog.products b
CROSS JOIN (VALUES
  ('PA-06-0001', 1),
  ('PA-06-0002', 1),
  ('PA-06-0003', 1),
  ('PA-06-0004', 1),
  ('PA-06-0005', 2),
  ('PA-06-0007', 1),
  ('PA-06-0008', 1)
) AS pb(sku, qty)
JOIN catalog.products p ON p.sku = pb.sku
WHERE b.sku = (
  SELECT sku FROM catalog.products
  WHERE product_type = 'BUNDLE' AND name = 'RACK 15U EXTERIOR IP55 FUNCIONAL'
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM catalog.product_bundles pb2
  WHERE pb2.bundle_product_id = b.id
);

COMMIT;
