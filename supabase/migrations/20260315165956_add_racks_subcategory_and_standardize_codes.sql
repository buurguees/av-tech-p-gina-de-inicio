-- Añade subcategoría RACKS Y ACCESORIOS bajo PA (PRODUCTOS AUDIOVISUALES)
-- y estandariza códigos de subcategorías a nomenclatura numérica 01, 02, 03...

BEGIN;

-- 1. Crear subcategoría RACKS Y ACCESORIOS bajo PA (code 06)
INSERT INTO catalog.categories (
  name,
  slug,
  code,
  description,
  parent_id,
  sort_order,
  domain
)
SELECT
  'RACKS Y ACCESORIOS',
  'racks-y-accesorios',
  '06',
  'Elementos de rack y accesorios de rack',
  id,
  6,
  'PRODUCT'
FROM catalog.categories
WHERE parent_id IS NULL AND code = 'PA'
LIMIT 1;

-- 2. Estandarizar códigos de subcategorías PA: LCD -> 07, ACCE -> 08
-- (mantener nomenclatura numérica uniforme 01-08)
UPDATE catalog.categories
SET code = '07'
WHERE parent_id = (SELECT id FROM catalog.categories WHERE parent_id IS NULL AND code = 'PA' LIMIT 1)
  AND code = 'LCD';

UPDATE catalog.categories
SET code = '08'
WHERE parent_id = (SELECT id FROM catalog.categories WHERE parent_id IS NULL AND code = 'PA' LIMIT 1)
  AND code = 'ACCE';

COMMIT;;
