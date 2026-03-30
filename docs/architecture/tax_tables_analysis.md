# Análisis de las tres tablas de impuestos — NEXO AV

> Generado: 2026-03-26
> Proyecto: NEXO AV — takvthfatlcjsqgssnta

---

## Las tres tablas

| Tabla | Filas | Ámbito |
|---|---|---|
| `internal.taxes` | 11 (con 3 duplicados) | Impuestos generales de empresa: IVA ventas/compras, IRPF retenciones, IS |
| `catalog.tax_rates` | 4 | Solo IVA para productos del catálogo |
| `accounting.tax_config` | 5 | Mapping impuesto → cuentas contables (debit/credit) |

---

## Contenido exacto

### internal.taxes (11 filas)

| id | name | rate | is_active |
|---|---|---|---|
| 99154bb0 | IRPF -19% | -19.00 | true |
| 296c9027 | IRPF -15% | -15.00 | true |
| 7471a1f1 | IRPF -7%  | -7.00  | true |
| 685ce94f | IVA 0%    | 0.00   | true |
| d8f18181 | IVA 0%    | 0.00   | true | ← **DUPLICADO**
| c7cb660d | IVA 10%   | 10.00  | true |
| c53d8fdb | IVA 10%   | 10.00  | true | ← **DUPLICADO**
| bf2f3b51 | IS 15%    | 15.00  | true |
| 41484b06 | IVA 21%   | 21.00  | true |
| 6df7e983 | IVA 21%   | 21.00  | true | ← **DUPLICADO**
| dcf33048 | IS 25%    | 25.00  | true |

### catalog.tax_rates (4 filas)

| id | name | rate | is_active |
|---|---|---|---|
| 9305e3cf | Exento IVA           | 0.00  | true |
| bb861c87 | IVA Superreducido 4% | 4.00  | true |
| ba98467c | IVA Reducido 10%     | 10.00 | true |
| 087c9828 | IVA General 21%      | 21.00 | true |

### accounting.tax_config (5 filas)

| id | tax_code | default_rate | is_active |
|---|---|---|---|
| 96b0db24 | IVA_4    | 4.00  | true |
| a42db7d8 | IVA_10   | 10.00 | true |
| 48cb39b4 | IRPF_15  | 15.00 | true |
| 9d32ae71 | IVA_21   | 21.00 | true |
| 26319cdb | IS_25    | 25.00 | true |

---

## ¿Son los mismos datos? Mapa de tasas cruzado

| Tasa | internal.taxes | catalog.tax_rates | accounting.tax_config |
|---|---|---|---|
| -19% | IRPF -19% | — | — |
| -15% | IRPF -15% | — | — |
| -7%  | IRPF -7%  | — | — |
| 0%   | IVA 0% (×2) | Exento IVA | — |
| 4%   | — | IVA Superreducido 4% | IVA_4 |
| 10%  | IVA 10% (×2) | IVA Reducido 10% | IVA_10 |
| 15%  | IS 15% | — | IRPF_15 (valor positivo) |
| 21%  | IVA 21% (×2) | IVA General 21% | IVA_21 |
| 25%  | IS 25% | — | IS_25 |

**Conclusión**: NO son los mismos datos. Son tres sistemas con propósitos distintos.

---

## Los tres sistemas son distintos

### internal.taxes — Sistema legacy de impuestos generales
- Cubre IVA (ventas y compras), IRPF (retenciones), IS (Impuesto de Sociedades)
- Usado por: módulo de contabilidad, facturas de compra, IRPF en presupuestos
- Contiene 3 pares de duplicados (IVA 0%, 10%, 21%) — deuda técnica interna
- **NO es redundante con catalog.tax_rates**: cubre tipos que catalog nunca cubrirá (IRPF, IS)

### catalog.tax_rates — IVA específico para productos del catálogo
- Solo IVA, solo para productos
- Incluye IVA 4% (superreducido) que internal.taxes NO tiene
- Fuente de verdad para `catalog.products.tax_rate_id`
- FK: `catalog.products → catalog.tax_rates` (id)

### accounting.tax_config — Configuración contable de impuestos
- Vincula tipo de impuesto con cuentas contables (debit/credit)
- IVA_4, IVA_10, IVA_21 solapan con catalog.tax_rates (misma tasa, diferente dominio)
- IRPF_15 e IS_25 son únicos de accounting
- **Candidata a linkarse con catalog.tax_rates para los tipos IVA** (ver tax_tables_consolidation.sql)

---

## Recomendaciones

### 1. No migrar internal.taxes → catalog.tax_rates

Son dominios distintos. internal.taxes cubre IRPF e IS que catalog no puede cubrir.
Mantener ambas tablas. La coexistencia es correcta y ya documentada (fix de Área 3).

### 2. Limpiar duplicados en internal.taxes

3 pares de duplicados (IVA 0%, 10%, 21%) — solo uno de cada par debería estar activo.
Ver `tax_tables_consolidation.sql` para el script de desactivación.

Los 75 productos legacy de internal usaban `id = 41484b06` (primer IVA 21%) — es el
"canónico". Los duplicados deben desactivarse, no borrarse (seguridad referencial).

### 3. Vincular accounting.tax_config con catalog.tax_rates (para tipos IVA)

Añadir `catalog_tax_rate_id` como referencia opcional. Solo los tipos IVA tendrán valor.
IRPF_15 e IS_25 quedarán con NULL — correcto, no tienen equivalente en catalog.
Ver `tax_tables_consolidation.sql` para el DDL y el UPDATE de población.

### 4. No hay acción necesaria en catalog.tax_rates

Está correctamente diseñada y sin duplicados. Ya es la fuente de verdad para productos.
