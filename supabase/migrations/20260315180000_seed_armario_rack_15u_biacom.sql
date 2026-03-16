-- Alta de producto ARMARIO RACK 15U BIACOM en PA-06
-- Coste: 335,95 € | PVP +60% margen: 537,52 € (sin IVA) | IVA 21%

BEGIN;

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
  track_stock,
  supplier_id
)
SELECT
  catalog.next_product_number(
    '270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid,
    'PRODUCT'
  ),
  'ARMARIO RACK MURAL EXTERIOR IP55 19" 15U BIACOM 540x400 MM',
  'Armario rack mural exterior IP55 de 19", 15U, BIACOM, 540x400 mm, montado sin accesorios, puerta metálica.',
  'PRODUCT',
  '270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid,
  'ud',
  335.95,
  537.52,
  0,
  '087c9828-3f47-4f56-8a79-55d36f30f943'::uuid,
  true,
  NULL;

COMMIT;
