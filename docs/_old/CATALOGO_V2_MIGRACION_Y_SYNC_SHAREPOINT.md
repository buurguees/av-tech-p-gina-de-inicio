# Catálogo V2: Migración internal → catalog y preparación SharePoint

## Objetivo

- **Fuente de verdad:** el módulo de Catálogo de NexoAV usa exclusivamente el esquema `catalog` para productos, servicios, bundles, categorías, precios, impuestos, stock y documentación.
- **internal.*** queda deprecado para catálogo (se mantiene por compatibilidad si otros flujos lo referencian).
- Preparación para sincronización futura con SharePoint y Excel maestro (sin implementar la API de SharePoint).

## Migraciones aplicadas (orden)

1. **20260204100000_catalog_domain_and_discounts.sql**
   - Enum `catalog.category_domain` ('PRODUCT', 'SERVICE').
   - Columna `catalog.categories.domain` (obligatorio).
   - Columna `catalog.products.discount_percent` (0–100).
   - Trigger de margen sobre precio efectivo: `sale_price_effective = sale_price * (1 - discount_percent/100)`, `margin = (sale_price_effective - cost_price) / sale_price_effective * 100`.
   - Trigger de validación: productos/servicios solo en categorías del mismo domain; BUNDLE en PRODUCT o SERVICE.

2. **20260204110000_migrate_internal_to_catalog.sql**
   - Tablas de mapeo: `catalog._mig_category_map`, `_mig_subcategory_map`, `_mig_product_map`, `_mig_pack_map`.
   - Migración de datos:
     - **Categorías:** `internal.product_categories` → `catalog.categories` (slug `mig-` + code normalizado). **Domain:** si existe la columna `type` en `internal.product_categories`, se usa (`type = 'service'` → domain SERVICE; resto → PRODUCT); si no existe la columna, se asigna PRODUCT por defecto.
     - **Subcategorías:** `internal.product_subcategories` → `catalog.categories` con `parent_id` = categoría migrada.
     - **Productos:** `internal.products` → `catalog.products` (product_number → sku, type → product_type, base_price → sale_price, tax_rate → tax_rate_id por tasa, stock → stock_quantity, track_stock según type).
     - **Packs:** `internal.product_packs` → `catalog.products` con `product_type = 'BUNDLE'` (pack_number → sku, final_price/base_price → sale_price).
     - **Componentes de pack:** `internal.product_pack_items` → `catalog.product_bundles` (mapeo de IDs vía tablas de mapeo).
   - No se pierden códigos, precios, impuestos, stock ni estado activo/inactivo.

3. **20260204120000_catalog_stock_ledger.sql**
   - Tabla `catalog.stock_movements` (product_id, movement_type: IN, OUT, ADJUST, RETURN_IN, RETURN_OUT, quantity, reference_schema/table/id, notes, created_by).
   - Trigger: cada INSERT en `stock_movements` actualiza `catalog.products.stock_quantity` si `track_stock = true`.
   - Tabla `catalog.stock_alerts` (product_id, status: open/ack/resolved). Un solo registro abierto por producto (índice parcial único).
   - Trigger en `catalog.products`: al cambiar stock_quantity/min_stock_alert/track_stock, abre alerta si stock ≤ min_stock_alert y resuelve si no.

4. **20260204130000_catalog_documents_and_external_sources.sql**
   - **product_documents:** provider (sharepoint, upload, external), doc_type (datasheet, manual, certificate, image, other), sharepoint_*_id, file_url, file_name, is_primary. Permite registros solo con IDs de SharePoint (sin URL hasta sincronización).
   - **external_catalog_sources:** provider/sharepoint_site_id/drive_id/item_id, sheet_name, range_name, column_mapping, last_sync_at, sync_status, last_error (preparación Excel en SharePoint).
   - **external_catalog_sync_runs:** run_id, started_at, ended_at, status, stats, errors.

5. **20260204140000_catalog_rpcs.sql**
   - list_catalog_tax_rates, list_catalog_categories, create/update/delete_catalog_category.
   - list_catalog_products (domain, category_id, search, include_inactive), list_catalog_bundles, list_catalog_products_search (para @).
   - get_catalog_product_detail, create/update/delete_catalog_product.
   - list_catalog_product_documents, add/update/delete_catalog_product_document.
   - get_catalog_product_analytics, list_stock_movements, adjust_stock.
   - list_catalog_bundle_components, add/remove_catalog_bundle_component.

6. **20260204150000_catalog_stock_invoice_hooks.sql**
   - Trigger en `sales.invoice_lines`: INSERT → si producto simple con track_stock, un OUT; **si BUNDLE**, solo OUT por cada componente (track_stock) con cantidad = componente × línea (el bundle no lleva track_stock). UPDATE cantidad → ADJUST con delta (en bundles, ADJUST por cada componente). DELETE → ADJUST para revertir (en bundles, reversión por componente).
   - Trigger en `sales.purchase_invoice_lines`: INSERT → IN; UPDATE cantidad → ADJUST; DELETE → ADJUST para revertir.
   - **Idempotencia:** un solo movimiento IN/OUT por (reference_table, reference_id, **product_id**), para permitir varios OUT por la misma línea de factura (uno por componente de bundle). Índice único: `idx_stock_movements_ref_product_unique`.

7. **Correcciones auditoría (P0/P1) — aplicar después de 20260204150000**
   - **20260204160000_fix_catalog_stock_bundles_and_idempotency.sql** (P0): Asegura índice único por (reference_table, reference_id, product_id) y reemplaza `on_invoice_line_stock()` para que **BUNDLE se evalúe antes que track_stock** (INSERT → OUT por componentes; UPDATE/DELETE → ADJUST por componentes).
   - **20260204170000_fix_catalog_domain_from_internal_type.sql** (P1.1): Si `internal.product_categories` tiene columna `type`, actualiza `catalog.categories.domain` en categorías migradas (service → SERVICE, product → PRODUCT).
   - **20260204180000_fix_catalog_numeric_stock_and_rpcs.sql** (P1.2/P1.3): `catalog.products.stock_quantity` y `min_stock_alert` pasan a NUMERIC(12,3). RPCs devuelven/aceptan NUMERIC; `list_catalog_products` WHERE simplificado (sin lógica bundle redundante).

## Reglas de dominio (categorías)

- **PRODUCT:** solo categorías con `domain = 'PRODUCT'`. Productos físicos (ud, m2, etc.).
- **SERVICE:** solo categorías con `domain = 'SERVICE'`. Servicios (hora, jornada, mes, etc.).
- **BUNDLE:** puede asignarse a categoría PRODUCT o SERVICE según uso comercial (por defecto PRODUCT).

## Preparación SharePoint (sin implementar)

- **product_documents:** la UI puede crear filas con `provider = 'sharepoint'` y solo `sharepoint_item_id` / `sharepoint_drive_id` / `sharepoint_site_id`, mostrando texto tipo "Disponible tras sincronización" si no hay `file_url`.
- **external_catalog_sources / external_catalog_sync_runs:** pensadas para "subir Excel nuevo → recalcular catálogo", "detectar diferencias de stock" y "editar desde plataforma → reflejar en Excel en un sync futuro". La sincronización real no está implementada.

## Criterios de aceptación (resumen)

- Tras migración, el catálogo muestra los mismos productos/servicios/packs que antes; SKU preservados (product_number/pack_number → sku).
- Categorías separadas por domain (PRODUCT vs SERVICE).
- Buscador @ encuentra productos, servicios y bundles desde catalog.
- CRUD de producto/servicio/bundle y categorías sobre catalog.
- Stock: movimientos al facturar (OUT) y al registrar compra (IN); alertas LOW_STOCK cuando stock ≤ min_stock_alert.
- Detalle de producto con pestañas Resumen, Precios, Analítica, Documentación.
- Documentación: registros con provider sharepoint sin URL mostrados correctamente.
- Presupuestos y facturación existentes no se rompen.

## Entregables en repo

- Migraciones SQL listadas arriba.
- Documentación: este archivo y `CATALOGO_V2_STOCK_LEDGER_Y_ANALYTICS.md`.
- UI actualizada para usar RPCs de catalog (ProductSearchInput, ProductsTab, PacksTab, ProductDetailPage, ProductCategoriesTab).
