-- 1. Crear subcategoría SP-05 LOGÍSTICA under SERVICIOS PROFESIONALES
-- 2. Alta de servicio LOGÍSTICA (precio mínimo 150 € sin IVA)

BEGIN;

-- Subcategoría SP-05 LOGÍSTICA (idempotente)
INSERT INTO catalog.categories (
  name, slug, code, description, parent_id, sort_order, domain
)
SELECT
  'LOGÍSTICA',
  'logistica',
  '05',
  NULL,
  '89d14e2e-935e-44b7-bbb9-56083f2920a1'::uuid,
  5,
  'SERVICE'
WHERE NOT EXISTS (
  SELECT 1 FROM catalog.categories c
  WHERE c.parent_id = '89d14e2e-935e-44b7-bbb9-56083f2920a1'::uuid AND c.code = '05'
);

-- Servicio LOGÍSTICA
INSERT INTO catalog.products (
  sku, name, description, product_type, category_id, unit,
  cost_price, sale_price, discount_percent, tax_rate_id, track_stock, supplier_id
)
SELECT
  catalog.next_product_number(
    (SELECT id FROM catalog.categories WHERE parent_id = '89d14e2e-935e-44b7-bbb9-56083f2920a1'::uuid AND code = '05' LIMIT 1),
    'SERVICE'
  ),
  'LOGÍSTICA',
  'Servicio de logística y coordinación operativa.',
  'SERVICE',
  (SELECT id FROM catalog.categories WHERE parent_id = '89d14e2e-935e-44b7-bbb9-56083f2920a1'::uuid AND code = '05' LIMIT 1),
  'ud',
  NULL,
  150,
  0,
  '087c9828-3f47-4f56-8a79-55d36f30f943'::uuid,
  false,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM catalog.products p
  WHERE p.name = 'LOGÍSTICA' AND p.product_type = 'SERVICE'
);

COMMIT;
