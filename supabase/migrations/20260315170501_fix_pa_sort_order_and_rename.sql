-- Correctiva: orden visual coherente (sort_order 1..8) y renombre PA-04
-- PA subcategorías ordenadas por code: 01..08

BEGIN;

-- 1. Fijar sort_order de subcategorías PA según code (1..8)
UPDATE catalog.categories
SET sort_order = code::integer
WHERE parent_id = (SELECT id FROM catalog.categories WHERE parent_id IS NULL AND code = 'PA' LIMIT 1)
  AND code IN ('01','02','03','04','05','06','07','08');

-- 2. Renombrar PA-04 a nombre más preciso
UPDATE catalog.categories
SET name = 'CONTROL, PROCESADO Y CONECTIVIDAD AV'
WHERE parent_id = (SELECT id FROM catalog.categories WHERE parent_id IS NULL AND code = 'PA' LIMIT 1)
  AND code = '04';

COMMIT;;
