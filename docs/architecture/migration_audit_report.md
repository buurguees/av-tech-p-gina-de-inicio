# Migration Audit Report — Área 3: internal.* → catalog.*

> Generado: 2026-03-26
> Proyecto: NEXO AV — takvthfatlcjsqgssnta
> Alcance: Migración de productos, categorías, packs y taxes del schema `internal` (legacy) al schema `catalog` (nuevo)

---

## Resumen ejecutivo

| Aspecto | Estado |
|---|---|
| Migración de datos de productos | **COMPLETA** (100%) |
| Migración de datos de categorías | **COMPLETA** |
| Migración de packs | **COMPLETA** (recreados como BUNDLEs, no mapeados) |
| Migración de taxes | **NO APLICA** — son sistemas distintos |
| Bug activo en frontend | **delete_product_pack apunta a tabla vacía** |
| RPCs legacy activas en BD | 26 (mayoría no llamadas desde frontend) |

---

## 1. Estado de completitud — datos verificados en producción

### 1.1 Productos

| Métrica | Valor |
|---|---|
| Productos en `internal.products` | 75 |
| Productos mapeados en `_mig_product_map` | 75 |
| Productos en `catalog.products` | 123 (75 migrados + 48 nuevos) |
| % mapeado | **100.0%** |
| Productos en internal SIN mapping | **0** |

### 1.2 Líneas de factura

| Métrica | Valor |
|---|---|
| Total `sales.invoice_lines` | 132 |
| Con `product_id` asignado | 12 |
| Apuntando a `catalog.products` (válidos) | 12 |
| Huérfanos (product_id sin match en catalog) | **0** |

La FK `sales.invoice_lines.product_id → catalog.products.id` está limpia.

### 1.3 Tablas de mapping `_mig_*`

| Tabla | Filas | Estado |
|---|---|---|
| `catalog._mig_product_map` | 75 | Completo — todos los internal migrados |
| `catalog._mig_category_map` | 5 | Completo — 5 categorías raíz migradas |
| `catalog._mig_subcategory_map` | 24 | Completo — 24 subcategorías migradas |
| `catalog._mig_pack_map` | **0** | Los packs se recrearon directamente como BUNDLEs en catalog; no hay mapping ID |

### 1.4 Packs/Bundles

| Aspecto | Valor |
|---|---|
| Packs en `internal.product_packs` (legacy) | **0** |
| BUNDLEs en `catalog.products` | **14** |
| Items en `internal.product_pack_items` | 0 (CASCADE desde product_packs) |
| Componentes en `catalog.product_bundles` | Verificar con `list_catalog_bundle_components` |

Los packs originales de `internal.product_packs` no se migraron con mapping — se recrearon directamente como `catalog.products` de tipo `BUNDLE`. Por eso `_mig_pack_map` tiene 0 filas.

---

## 2. Estado de FKs

### 2.1 FKs externas apuntando a tablas legacy (fuera de `internal`)

| FK | Resultado |
|---|---|
| Tablas fuera de `internal` que referencian `internal.products` | **0** |
| Tablas fuera de `internal` que referencian `internal.product_categories` | **0** |
| Tablas fuera de `internal` que referencian `internal.product_packs` | **0** |

**Conclusión**: Las tablas legacy de productos pueden dropearse sin romper FKs externas.

### 2.2 FKs internas (dentro de `internal`)

| FK | ON DELETE |
|---|---|
| `internal.product_subcategories.category_id → internal.product_categories.id` | CASCADE |
| `internal.products.category_id → internal.product_categories.id` | NO ACTION |
| `internal.products.subcategory_id → internal.product_subcategories.id` | NO ACTION |
| `internal.products.default_tax_id → internal.taxes.id` | NO ACTION |
| `internal.product_pack_items.pack_id → internal.product_packs.id` | CASCADE |
| `internal.product_pack_items.product_id → internal.products.id` | CASCADE |

Estas FKs solo viven dentro de `internal`. El DROP debe respetar el orden de dependencia.

---

## 3. Bug activo: `delete_product_pack` apunta a tabla vacía

### Problema

| RPC | Target | Estado |
|---|---|---|
| `update_product_pack` | `catalog.products WHERE product_type = 'BUNDLE'` | **OK** (ya actualizada) |
| `delete_product_pack` | `DELETE FROM internal.product_packs` | **BUG** — apunta a tabla con 0 filas |

**Efecto en producción**:
- `PacksTab.tsx:239` llama `delete_product_pack(p_pack_id)` al intentar borrar un pack
- La función hace `DELETE FROM internal.product_packs WHERE id = p_pack_id`
- `internal.product_packs` tiene 0 filas — la operación siempre devuelve `false`
- Los 14 BUNDLEs en `catalog.products` son **inborrables desde el frontend**
- No hay error visible para el usuario — simplemente no ocurre nada

**Fix**: Ver `docs/architecture/migration_drop_legacy.sql` o la migración aplicada `fix_delete_product_pack`.

---

## 4. Análisis de taxes — por qué NO es una migración directa

### Comparación de tablas

| Aspecto | `internal.taxes` (11 filas) | `catalog.tax_rates` (4 filas) |
|---|---|---|
| Tipos cubiertos | IVA (ventas + compras), IRPF, IS | Solo IVA para productos |
| `tax_type` | `sales`, `purchase`, `profit` | Sin campo `tax_type` |
| Tasas | -19%, -15%, -7%, 0%, 10%, 15%, 21%, 25% | 0%, 4%, 10%, 21% |
| Propósito | Impuestos generales de la empresa | Tasas IVA del catálogo de productos |

### ¿Son duplicados los IVA duplicados?

**No.** `internal.taxes` tiene dos filas para IVA 0%, 10% y 21% porque separa el mismo tipo de IVA según la naturaleza de la transacción:
- `tax_type = 'sales'` → IVA para facturas de venta
- `tax_type = 'purchase'` → IVA deducible en facturas de compra

Son registros distintos con propósitos contables distintos.

### Bug silencioso en RPCs de companion/displacement

Las RPCs `get_displacement_products` y `list_product_companion_rules` hacen:
```sql
(SELECT t.rate FROM internal.taxes t WHERE t.id = cp.tax_rate_id LIMIT 1)
```
donde `cp.tax_rate_id` referencia `catalog.tax_rates.id`.

**Problema**: Los UUIDs de `catalog.tax_rates` no existen en `internal.taxes` → el subselect devuelve NULL → se usa el default 21%. Funciona **por casualidad** para productos con IVA 21%, pero fallará si se usa IVA 10% (devolverá 21% en vez de 10%).

Fix: sustituir por `FROM catalog.tax_rates tr WHERE tr.id = cp.tax_rate_id`. Ver `docs/architecture/taxes_analysis.sql`.

---

## 5. Inventario de RPCs

### RPCs new catalog (activas, target `catalog.*`)

| RPC | Target | Llamada desde frontend |
|---|---|---|
| `list_catalog_products` | `catalog.products` | Sí (5 archivos) |
| `list_catalog_products_search` | `catalog.products` | Sí (4 archivos) |
| `create_catalog_product` | `catalog.products` | Sí (3 archivos) |
| `update_catalog_product` | `catalog.products` | Sí (3 archivos) |
| `delete_catalog_product` | `catalog.products` | Verificar |
| `get_catalog_product_detail` | `catalog.products` | Sí (1 archivo) |
| `preview_catalog_product_sku` | `catalog.products` | Sí (1 archivo) |
| `list_catalog_categories` | `catalog.categories` | Sí (2 archivos) |
| `create_catalog_category` | `catalog.categories` | Sí (2 archivos) |
| `update_catalog_category` | `catalog.categories` | Sí (2 archivos) |
| `delete_catalog_category` | `catalog.categories` | Sí (2 archivos) |
| `list_catalog_tax_rates` | `catalog.tax_rates` | Sí (2 archivos) |
| `list_catalog_bundles` | `catalog.products` (BUNDLE) | Sí (2 archivos) |
| `list_catalog_bundle_components` | `catalog.product_bundles` | Sí (1 archivo) |
| `add_catalog_bundle_component` | `catalog.product_bundles` | Sí (1 archivo) |
| `remove_catalog_bundle_component` | `catalog.product_bundles` | Sí (1 archivo) |
| `get_catalog_sales_summary` | `catalog.*` | Sí (1 archivo) |
| `get_product_sales_history` | `catalog.*` | Sí (1 archivo) |
| `get_catalog_explorer_tree` | `catalog.*` | Verificar |

### RPCs legacy (target `internal.*`) — candidatas a DROP

| RPC | Target legacy | Llamada frontend | Acción |
|---|---|---|---|
| `create_product` | `internal.products` | No | DROP |
| `update_product` | `internal.products` | No | DROP |
| `delete_product` | `internal.products` | No | DROP |
| `list_products` | `internal.products` | No | DROP |
| `create_product_category` | `internal.product_categories` | No | DROP |
| `update_product_category` | `internal.product_categories` | No | DROP |
| `delete_product_category` | `internal.product_categories` | No | DROP |
| `list_product_categories` | `internal.product_categories` | No | DROP |
| `create_product_subcategory` | `internal.product_subcategories` | No | DROP |
| `update_product_subcategory` | `internal.product_subcategories` | No | DROP |
| `delete_product_subcategory` | `internal.product_subcategories` | No | DROP |
| `list_product_subcategories` | `internal.product_subcategories` | No | DROP |
| `create_product_pack` | `internal.product_packs` | No | DROP |
| `list_product_packs` | `internal.product_packs` | No | DROP |
| `get_pack_items` | `internal.product_pack_items` | No | DROP |
| `add_pack_item` | `internal.product_pack_items` | No | DROP |
| `remove_pack_item` | `internal.product_pack_items` | No | DROP |
| `update_pack_item` | `internal.product_pack_items` | No | DROP |
| `delete_product_pack` | `internal.product_packs` (BUG) | Sí (bug) | FIX primero, DROP después |
| `internal.generate_product_number` | `internal.products` | No (reemplazada) | DROP |

### RPCs legacy correctas (NO incluir en DROP)

| RPC | Target | Razón para mantener |
|---|---|---|
| `list_taxes` | `internal.taxes` | Correcto — taxes generales (IVA, IRPF, IS) |
| `create_tax` | `internal.taxes` | Correcto |
| `update_tax` | `internal.taxes` | Correcto |
| `delete_tax` | `internal.taxes` | Correcto |
| `update_product_pack` | `catalog.products` | Ya migrada, no es legacy |
| `get_sales_by_product_category` | `catalog.*` o legacy | **Llamada desde frontend** (ChartOfAccountsTab.tsx:186) — NO DROPEAR sin verificar su implementación |

---

## 6. Próximos pasos

1. **Inmediato**: Aplicar migración `fix_delete_product_pack` (bug activo)
2. **Corto plazo**: Aplicar fix de companion/displacement RPCs (bug silencioso en taxes)
3. **Medio plazo**: DROP RPCs legacy (después de 1 semana de validación)
4. **Largo plazo**: DROP tablas legacy `internal.product*` (después de DROP RPCs)
5. **Final**: DROP tablas `catalog._mig_*` (después de DROP tablas legacy)

Ver scripts completos en:
- `docs/architecture/legacy_rpcs_cleanup.sql` — DROP de RPCs
- `docs/architecture/migration_drop_legacy.sql` — DROP de tablas
- `docs/architecture/taxes_analysis.sql` — Fix de taxes en companion/displacement
