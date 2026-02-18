# Productos y Servicios – Análisis del sistema

Documento de referencia de todo lo que existe en el proyecto relacionado con **productos** y **servicios**: base de datos, RPCs, UI y documentación.

---

## 1. Resumen ejecutivo

En el proyecto conviven **dos modelos de catálogo**:

| Ámbito | Uso principal | Tablas / Origen |
|--------|----------------|------------------|
| **internal** | Catálogo operativo en NexoAV (CRUD, presupuestos, facturación) | `internal.products`, categorías, subcategorías, packs |
| **catalog** | Modelo más avanzado (SKU, bundles, ERP, stock); referenciado por `sales.quote_lines` y documentación | `catalog.products`, `catalog.categories`, `catalog.product_bundles` |

La aplicación actual (páginas Catálogo, presupuestos, búsqueda de conceptos) trabaja con **internal**: `list_products`, `list_product_categories`, `list_product_packs`, etc. El esquema **catalog** está definido en migraciones y en `BASE DE DATOS.md`, con tipos PRODUCT/SERVICE/BUNDLE y relación con líneas de presupuesto en el esquema `sales`.

---

## 2. Base de datos

### 2.1 Esquema `internal` (catálogo operativo)

#### Tablas

- **`internal.product_categories`**
  - `id`, `name`, `code` (único), `description`, `display_order`, `is_active`, `type` ('product' | 'service'), timestamps.
  - RPCs: `list_product_categories`, `create_product_category`, `update_product_category`, `delete_product_category`.

- **`internal.product_subcategories`**
  - `id`, `category_id` (FK a product_categories), `name`, `code`, `description`, `display_order`, `is_active`, timestamps.
  - Restricción única: `(category_id, code)`.
  - RPCs: `list_product_subcategories`, `create_product_subcategory`, `update_product_subcategory`, `delete_product_subcategory`.

- **`internal.products`**
  - `id`, `product_number` (único, generado por categoría/subcategoría), `category_id`, `subcategory_id`, `name`, `description`, `cost_price`, `base_price`, `tax_rate`, `type` (enum `public.product_type`: 'product' | 'service'), `stock` (opcional; más relevante para tipo product), `is_active`, timestamps.
  - Diferencias conceptuales: **product** = coste fijo, puede tener stock; **service** = coste variable, sin stock.

- **`internal.product_sequences`**
  - `category_code` (PK), `last_number` – para numeración automática de productos por categoría.

- **`internal.product_packs`**
  - `id`, `pack_number` (único), `name`, `description`, `base_price`, `discount_percent`, `final_price`, `tax_rate`, `is_active`, timestamps.

- **`internal.product_pack_items`**
  - `id`, `pack_id` (FK a product_packs), `product_id` (FK a internal.products), `quantity`, único `(pack_id, product_id)`.

#### Funciones internas

- **`internal.generate_product_number(p_category_id, p_subcategory_id)`**  
  Genera el siguiente `product_number` según prefijo de categoría/subcategoría (ej. `SP-01-0001`).

#### RPCs públicas (productos)

- **`list_products(p_category_id, p_subcategory_id, p_search)`**  
  Devuelve productos con categoría, subcategoría, precios, `price_with_tax`, `type`, `stock`.
- **`create_product(p_category_id, p_subcategory_id?, p_name, p_description?, p_cost_price, p_base_price, p_tax_rate, p_type?, p_stock?)`**  
  Crea producto con número generado automáticamente.
- **`update_product(p_product_id, p_name?, p_description?, p_cost_price?, p_base_price?, p_tax_rate?, p_is_active?, p_stock?)`**
- **`delete_product(p_product_id)`**

#### RPCs públicas (packs)

- **`list_product_packs(p_search?)`**  
  Lista packs con `product_count`, `price_with_tax`, etc.
- **`create_product_pack(p_name?, p_description?, ...)`**  
  Genera `pack_number` automático.
- **`update_product_pack(p_pack_id, ...)`**
- **`delete_product_pack(p_pack_id)`**
- Funciones para **añadir/actualizar/eliminar items** de un pack (product_id + quantity).

---

### 2.2 Esquema `catalog` (modelo ampliado)

Definido en migraciones (Fase 5 Catálogo) y documentado en `docs/BASE DE DATOS.md`.

#### Enums

- **`catalog.product_type`**: `'PRODUCT' | 'SERVICE' | 'BUNDLE'`
- **`catalog.unit_type`**: `'ud' | 'm2' | 'ml' | 'hora' | 'jornada' | 'mes' | 'kg'`

#### Tablas

- **`catalog.categories`**  
  Categorías con `name`, `slug`, `description`, `parent_id`, `sort_order`, `is_active`.

- **`catalog.tax_rates`**  
  Tipos de IVA (nombre, tasa, `is_default`, país, etc.). Seed: IVA General 21%, Reducido 10%, Superreducido 4%, Exento.

- **`catalog.products`**  
  Productos con:
  - `sku` (único), `name`, `description`, `product_type`, `category_id`, `unit`
  - `cost_price`, `sale_price`, `tax_rate_id`, `margin_percentage` (calculado por trigger)
  - `track_stock`, `stock_quantity`, `min_stock_alert`
  - `erp_product_id`, `erp_synced_at`
  - `is_active`, `is_featured`, `specifications` (JSONB), `images` (JSONB)

- **`catalog.product_bundles`**  
  Composición de packs: `bundle_product_id`, `component_product_id`, `quantity` (único por par bundle-componente).

- **`catalog.erp_sync_log`**  
  Registro de sincronización con ERP (tipo, estado, contadores, errores).

#### Relaciones con otros esquemas

- **`sales.quote_lines`** (esquema sales): tiene `product_id` que referencia **`catalog.products(id)`** (FK con ON DELETE SET NULL).
- Las **líneas de presupuesto** que usa la app en día a día viven en **`quotes.quote_lines`** (sin FK a producto; llevan `concept`, `description`, precios, etc.). La relación conceptual con el catálogo es vía búsqueda al añadir líneas (ProductSearchInput), no vía FK en `quotes.quote_lines`.

---

### 2.3 Uso de productos en otros módulos

- **Presupuestos (quotes)**  
  Las líneas se guardan en `quotes.quote_lines` (concepto, descripción, cantidad, precio, IVA, descuento). Al elegir un producto o pack desde **ProductSearchInput**, se rellenan concepto/precio/IVA pero **no** se guarda un `product_id` en esa tabla.

- **Facturación (sales)**  
  **`sales.invoice_lines`** puede llevar `product_id` (según `add_invoice_line` / `finance_add_invoice_line` en migraciones de billing). Sirve para vincular la línea de factura a un producto del catálogo.

- **Compras (purchasing)**  
  **`sales.purchase_invoice_lines`** tiene un campo opcional **`product_id`** para vincular la línea a un producto del catálogo.

- **Tickets / gastos**  
  No hay tabla “productos” específica; se usan **categorías de ticket** definidas en `src/constants/ticketCategories.ts` (Dieta, Gasolina, Material, Peajes, etc.) con códigos contables (629.x). No son productos/servicios del catálogo.

---

## 3. Frontend (NexoAV)

### 3.1 Páginas

- **Catálogo**  
  - Ruta: `/nexo-av/:userId/catalog`  
  - Componente: `CatalogPage.tsx` (desktop).  
  - Pestañas: **Productos**, **Servicios**, **Packs** (las dos primeras usan `ProductsTab` con `filterType="product"` o `"service"`).

- **Detalle de producto/servicio**  
  - Ruta: `/nexo-av/:userId/catalog/:productId`  
  - Componente: `ProductDetailPage.tsx`.  
  - Muestra/edita un solo producto o servicio (datos de `list_products` / RPCs de internal), con pestañas Resumen y “Por asignar”.

### 3.2 Componentes de catálogo

- **`ProductsTab.tsx`**  
  Lista productos o servicios según `filterType` ('product' | 'service'). Usa `list_products`, `list_product_categories`, `list_product_subcategories`, `list_taxes` (sales). Admite filtros por categoría/subcategoría, búsqueda, creación/edición/eliminación (admin), importación (ProductImportDialog).

- **`PacksTab.tsx`**  
  Lista y gestiona packs: `list_product_packs` y RPCs de creación/actualización/eliminación e ítems del pack.

- **`ProductSearchInput.tsx`**  
  Input de búsqueda con soporte “@buscar”. Llama a:
  - `list_products({ p_search })` (productos y servicios),
  - `list_product_packs({ p_search })` (packs).  
  Unifica resultados en un tipo `CatalogItem` (`product` | `service` | `pack`) con `id`, `name`, `code`, `price`, `tax_rate`, `description`. Se usa al añadir líneas en presupuestos (EditQuotePage, NewQuotePage, móvil).

- **`ProductImportDialog.tsx`**  
  Diálogo de importación de productos (por archivo/hoja de cálculo).

### 3.3 Ajustes y configuración

- **`ProductCategoriesTab.tsx`** (dentro de Ajustes)  
  Gestión de categorías y subcategorías de productos (list/create/update/delete), con soporte de tipo categoría (product/service).

- **`CategoryImportDialog.tsx`**  
  Importación de categorías.

Las **tasas de IVA** para ventas se obtienen con `list_taxes({ p_tax_type: 'sales' })` (módulo de impuestos/facturación), no directamente de `catalog.tax_rates` en la UI actual.

### 3.4 Dashboard e informes

- **`DetailDashboardProducts.tsx`**  
  Muestra productos (o resumen de productos) en el dashboard de detalle.

---

## 4. Landing / web pública

- **`src/components/sections/Productos.tsx`**  
  Sección “Catálogo” de la landing: packs comerciales estáticos (Starter Pack, Starter Pack Plus, etc.) con nombres, descripciones, subpacks y características. **No** está conectada a la base de datos; los datos vienen de un array local `allPacksData`.  
  Documentación de copywriting: `docs/ANALISIS-COPYWRITING-CATALOGO.md`.

---

## 5. Documentación existente

- **`docs/BASE DE DATOS.md`**  
  Describe el esquema `catalog` (categories, tax_rates, products, product_bundles, erp_sync_log) y relaciones.

- **`docs/MEJORAS-CATALOGO.md`**  
  Mejoras de UI en la tabla de catálogo (columnas, badges, vista móvil, padding, legibilidad) aplicadas en `ProductsTab.tsx`.

- **`docs/ANALISIS-COPYWRITING-CATALOGO.md`**  
  Análisis y mejora del copy de la sección Catálogo en la landing (titular, descripción, CTA, SEO).

---

## 6. Constantes y tipos

- **`src/constants/ticketCategories.ts`**  
  Categorías de tickets de gastos (Dieta, Gasolina, Material, etc.) con códigos contables. **No** son productos/servicios del catálogo.

- **Tipos generados**  
  En `src/integrations/supabase/types.ts` aparecen las firmas de RPCs como `list_product_categories`, `list_product_packs`, `list_products`, etc., alineadas con el esquema internal.

---

## 7. Resumen de flujos

1. **Alta de productos/servicios**  
   Ajustes → Categorías de productos (y subcategorías) → Catálogo → Productos/Servicios. Creación vía `create_product` con categoría/subcategoría y tipo product/service.

2. **Packs**  
   Catálogo → Packs. Creación con `create_product_pack` y añadido de ítems (productos de internal) con las RPCs de pack items.

3. **Presupuestos**  
   En Nueva/Editar presupuesto, al añadir una línea se usa **ProductSearchInput** (productos, servicios, packs). Se rellenan concepto, precio, IVA; la línea se persiste en `quotes.quote_lines` sin FK a producto.

4. **Facturas**  
   Las líneas de factura pueden llevar `product_id` (add_invoice_line) para trazabilidad con el catálogo.

5. **Compras**  
   Las líneas de factura de compra pueden opcionalmente vincular `product_id` a producto del catálogo.

---

## 8. Nota sobre dualidad catalog vs internal

- **internal**: Es el catálogo que usa toda la aplicación NexoAV (listados, presupuestos, búsqueda, packs, categorías con tipo product/service).
- **catalog**: Modelo más rico (SKU, unidades, bundles, ERP, stock, margen). Está en BD y referenciado por `sales.quote_lines.product_id` y documentación; la UI actual no lo utiliza para CRUD. Una evolución podría ser unificar en un solo modelo (p. ej. migrar internal a catalog o exponer catalog en la misma UI).

---

*Documento generado a partir del análisis del repositorio. Última revisión: febrero 2026.*
