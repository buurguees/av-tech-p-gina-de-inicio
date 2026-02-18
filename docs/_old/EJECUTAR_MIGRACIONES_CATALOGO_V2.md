# Cómo ejecutar las migraciones Catálogo V2 (modificadas)

Cuando `supabase db push` falla por desfase de historial entre local y remoto, puedes aplicar los cambios manualmente en **Supabase Dashboard → SQL Editor**.

## Orden de ejecución

Ejecuta **en este orden**, cada bloque en una ejecución (Run):

### 1. Fixes previos (created_by + domain categorías)

Abre y ejecuta el contenido de:

**`supabase/migrations/run_catalog_v2_fixes_manual.sql`**

- Quita la FK de `catalog.stock_movements.created_by` si existía.
- Opcional: actualiza `catalog.categories.domain` desde `internal.product_categories.type` si la columna existe y hay mapeo migrado.

### 2. RPCs (stock NUMERIC, create/update product)

Ejecuta **todo** el archivo:

**`supabase/migrations/20260204140000_catalog_rpcs.sql`**

- Reemplaza todas las RPCs públicas del catálogo (list/create/update/delete categorías, productos, bundles, documentos, stock).
- Incluye los cambios de tipo: `stock_quantity` y `min_stock_alert` como `NUMERIC(12,3)` en retornos y en `p_min_stock_alert`.

### 3. Hooks de stock (índice único + bundles)

Ejecuta **todo** el archivo:

**`supabase/migrations/20260204150000_catalog_stock_invoice_hooks.sql`**

- Elimina índices antiguos de idempotencia y crea `idx_stock_movements_ref_product_unique` sobre `(reference_table, reference_id, product_id)`.
- Reemplaza la función `catalog.on_invoice_line_stock()` para que los BUNDLE descuenten solo componentes (y UPDATE/DELETE ajusten/reviertan por componente).
- Vuelve a crear los triggers en `sales.invoice_lines` y `sales.purchase_invoice_lines`.

## Si las migraciones base aún no están aplicadas

Si en el remoto **no** se han ejecutado nunca las migraciones del catálogo V2, antes de los pasos anteriores debes ejecutar **en orden**:

1. `20260204100000_catalog_domain_and_discounts.sql`
2. `20260204110000_migrate_internal_to_catalog.sql`
3. `20260204120000_catalog_stock_ledger.sql`
4. `20260204130000_catalog_documents_and_external_sources.sql`
5. Luego los pasos 1, 2 y 3 de la sección anterior (fixes + 140000 + 150000).

## Comprobar tras ejecutar

- **Índice:**  
  `SELECT indexname FROM pg_indexes WHERE schemaname = 'catalog' AND tablename = 'stock_movements';`  
  Debe aparecer `idx_stock_movements_ref_product_unique` y no debe existir `idx_stock_movements_ref_unique` ni `idx_stock_movements_idempotent` (para IN/OUT).

- **Trigger ventas:**  
  `SELECT tgname FROM pg_trigger WHERE tgrelid = 'sales.invoice_lines'::regclass AND tgname = 'trigger_invoice_line_stock';`  
  Debe devolver una fila.

- **RPCs:**  
  Llamar por ejemplo a `list_catalog_products(p_domain := 'PRODUCT', p_include_inactive := true)` y comprobar que `stock_quantity` / `min_stock_alert` llegan como numéricos.
