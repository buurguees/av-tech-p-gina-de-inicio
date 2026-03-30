# Codebase Migration Impact — internal.* → catalog.*

> Generado: 2026-03-26
> Alcance: Archivos del codebase que referencian tablas o RPCs legacy del schema `internal`

---

## Resumen de impacto

| Categoría | Archivos | Acción |
|---|---|---|
| Bug activo (RPC incorrecta) | 1 | **Fix inmediato** |
| Uso correcto de RPCs legacy | 11 archivos | Mantener (taxes generales) |
| Acceso directo a tabla (sin RPC) | 2 archivos | Revisar |
| RPCs legacy sin uso en frontend | 0 archivos | DROP de RPC (sin tocar frontend) |

---

## 1. Bug activo — `delete_product_pack`

### `src/pages/nexo_av/desktop/components/catalog/PacksTab.tsx:239`

```typescript
const { data, error } = await supabase.rpc('delete_product_pack', {
  p_pack_id: packId
});
```

**Problema**: La RPC `delete_product_pack` hace `DELETE FROM internal.product_packs` (0 filas), mientras que los BUNDLEs viven en `catalog.products`. La operación siempre devuelve `false` sin error visible.

**Acción**: Fix de la RPC (migración `fix_delete_product_pack`). **No cambia el frontend** — la signatura de la RPC es la misma.

---

## 2. RPCs legacy correctas (mantener)

Estas RPCs apuntan a `internal.taxes`, lo cual es correcto porque taxes generales (IVA, IRPF, IS) son un sistema distinto de `catalog.tax_rates` (solo IVA de producto).

| Archivo | Línea | RPC | Tabla target | Acción |
|---|---|---|---|---|
| `desktop/components/settings/TaxesTab.tsx` | 79, 110, 132, 147 | `list_taxes`, `create_tax`, `update_tax` | `internal.taxes` | **MANTENER** |
| `desktop/pages/TaxDetailPage.tsx` | 78, 120, 149 | `list_taxes`, `update_tax`, `delete_tax` | `internal.taxes` | **MANTENER** |
| `desktop/components/documents/PurchaseInvoiceLinesEditor.tsx` | 72 | `list_taxes` | `internal.taxes` | **MANTENER** |
| `desktop/components/documents/TicketLinesEditor.tsx` | 78 | `list_taxes` | `internal.taxes` | **MANTENER** |
| `desktop/pages/EditInvoicePage.tsx` | 121 | `list_taxes` | `internal.taxes` | **MANTENER** |
| `desktop/pages/EditQuotePage.tsx` | 375 | `list_taxes` | `internal.taxes` | **MANTENER** |
| `desktop/pages/NewInvoicePage.tsx` | 284 | `list_taxes` | `internal.taxes` | **MANTENER** |
| `desktop/pages/NewQuotePage.tsx` | 277 | `list_taxes` | `internal.taxes` | **MANTENER** |
| `mobile/pages/MobileEditQuotePage.tsx` | 385 | `list_taxes` | `internal.taxes` | **MANTENER** |
| `mobile/pages/MobileNewInvoicePage.tsx` | 240 | `list_taxes` | `internal.taxes` | **MANTENER** |
| `mobile/pages/MobileNewQuotePage.tsx` | 313 | `list_taxes` | `internal.taxes` | **MANTENER** |

---

## 3. RPC híbrida (ya migrada, no cambiar frontend)

### `src/pages/nexo_av/desktop/components/catalog/PacksTab.tsx`

| Línea | RPC | Estado |
|---|---|---|
| 163 | `list_catalog_products` | OK — catalog |
| 143, 473, 571 | `list_catalog_bundles` | OK — catalog |
| 182 | `list_catalog_bundle_components` | OK — catalog |
| 210 | `create_catalog_product` | OK — catalog |
| 274, 323 | `add_catalog_bundle_component` | OK — catalog |
| 300 | `remove_catalog_bundle_component` | OK — catalog |
| 384, 410, 466, 564 | `update_product_pack` | OK — ya actualizada a catalog |
| 239 | `delete_product_pack` | **BUG** — fix de RPC pendiente |

---

## 4. Acceso directo a tabla (sin RPC)

### `src/pages/nexo_av/desktop/components/settings/CompanionRulesTab.tsx:90`

```typescript
const { data } = await supabase.from('products').select('id, sku, name');
```

**Análisis**: Esta query usa `.from('products')` sin especificar schema. PostgREST expone `catalog.products` como `products` si está en el search_path de la API. Dado que el frontend también llama `list_catalog_products` correctamente, este acceso probablemente resuelve a `catalog.products`.

**Riesgo**: Bajo. Verificar en Supabase API settings que `catalog` está en el search_path expuesto.

**Acciones directas en `product_companion_rules`** (líneas 150, 161, 187, 203): tabla `public.product_companion_rules` — correcta.

### `src/pages/nexo_av/desktop/pages/RateCardDetailPage.tsx:311-313`

```typescript
const { data } = await (supabase as any)
  .schema("catalog")
  .from("products")
  .select("id, sku, name, product_type, sale_price")
```

**Análisis**: Fallback explícito a `catalog.products` cuando `list_catalog_products` falla. Correcto. Sin cambios necesarios.

---

## 5. Migraciones con referencias a internal.taxes (bug silencioso)

### `supabase/migrations/20260323230000_create_product_companion_rules.sql`

La RPC `list_product_companion_rules` hace:
```sql
(SELECT t.rate FROM internal.taxes t WHERE t.id = cp.tax_rate_id LIMIT 1)
```

donde `cp` es `catalog.products` y `cp.tax_rate_id` referencia `catalog.tax_rates`.

**Bug**: Los UUIDs de `catalog.tax_rates` no existen en `internal.taxes` → siempre devuelve NULL → usa default 21%. Funciona por casualidad para IVA 21%, pero falla para IVA 10% o 0%.

### `supabase/migrations/20260323210000_create_km_displacement_rules.sql`

La RPC `get_displacement_products` tiene el mismo bug.

**Fix**: Cambiar `FROM internal.taxes t` por `FROM catalog.tax_rates t`. Ver `docs/architecture/taxes_analysis.sql`.

---

## 6. Matriz de acción completa

| Archivo | RPC/tabla | Acción | Prioridad |
|---|---|---|---|
| `PacksTab.tsx:239` | `delete_product_pack` | Fix RPC (no frontend) | ALTA — bug activo |
| `CompanionRulesTab.tsx:90` | `.from('products')` | Verificar PostgREST | MEDIA |
| `RateCardDetailPage.tsx:312` | `.schema("catalog")` | OK, sin cambios | — |
| 11 archivos con `list_taxes` | `list_taxes` → `internal.taxes` | Mantener | — |
| RPCs `list_product_companion_rules`, `get_displacement_products` | `internal.taxes` (bug) | Fix RPCs taxes | MEDIA |
