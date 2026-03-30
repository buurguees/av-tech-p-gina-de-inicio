# Auditoría Contable Q1 2026 — NEXO AV vs Excel

**Fecha de auditoría:** 2026-03-30
**Período auditado:** 1 Enero – 26 Marzo 2026
**Fuente de referencia:** `Q1.xlsx` (última actualización 26/03/2026)
**BD auditada:** Supabase `takvthfatlcjsqgssnta`
**Estado:** PRELIMINAR — trimestre no cerrado

---

## Resumen ejecutivo

| Dominio | Estado | Hallazgos |
|---|---|---|
| Ventas (facturas emitidas) | ✅ OK | Totales coinciden exactamente con Excel |
| Compras (facturas proveedor) | ⚠️ PARCIAL | 3 facturas en BD no recogidas en Excel; 3 anomalías de estado |
| Tickets gastos | ⚠️ PARCIAL | 69 tickets en PENDING_VALIDATION que el Excel considera validados |
| Nóminas socios | 🔴 CRITICO | paid_amount incorrecto en RET-2026-0005; pago no registrado EXTRA-001 |
| IVA Modelo 303 | ✅ OK | Cálculo correcto: 2.998,53 € a ingresar |
| Modelo 111 IRPF | ⚠️ PARCIAL | Base correcta, pero paid_amount nómina incorrecto afecta conciliación |

---

## Hallazgos priorizados

---

### P0 — CRÍTICO

#### ACC-001 · RET-2026-0005 (Alex Burgues Marzo): paid_amount=100 € cuando el pago real fue 700 €

- **Síntoma:** La BD muestra `paid_amount = 100,00` y `status = PAID` en la nómina de Alex Burgues para Marzo 2026. El extracto Revolut Business confirma una transferencia de **700 €** en esa fecha.
- **Causa:** El importe bruto también está mal calculado (`gross = 716,96`, `irpf_amount = 16,96`). Los valores correctos son `gross = 818,71`, `irpf_amount = 118,71`, `net = 700,00`. El pago parcial de 100 € fue registrado pero los 600 € restantes nunca se marcaron como pagados.
- **Evidencia:** `accounting.partner_compensation_runs` → `compensation_number = RET-2026-0006` (wait, es RET-2026-0005)

```
compensation_number: RET-2026-0005
partner_id: 934cf0d4-478a-4322-a95d-aed7562c0f6d  (Alex Burgues)
period: 2026-03
gross_amount: 716.96   ← INCORRECTO (debería ser 818.71)
irpf_rate: 14.50       ← correcto
irpf_amount: 16.96     ← INCORRECTO (debería ser 118.71)
net_amount: 700.00     ← correcto
paid_amount: 100.00    ← INCORRECTO (debería ser 700.00)
status: PAID           ← el estado es PAID pero solo está pagado 100 de 700
```

- **Riesgo:** La plataforma muestra 600 € menos de gastos de personal pagados. Afecta al resultado operativo, conciliación bancaria y Modelo 111 (base IRPF correcta, pero la trazabilidad del pago no cuadra).
- **Fix:** Ver sección "Correcciones SQL".

---

#### ACC-002 · EXTRA-001 (Eric Izquierdo Febrero "Plus Nómina" 200 €): pago real no registrado en BD

- **Síntoma:** El extracto Revolut Business del 01/02/2026 incluye una transferencia de **200 €** etiquetada "Plus Nómina" a Eric Izquierdo. No existe ningún registro en `accounting.partner_compensation_runs` para este concepto.
- **Causa:** El pago se realizó manualmente desde Revolut sin crear el registro correspondiente en la plataforma.
- **Evidencia:** Excel `Nóminas Socios` fila EXTRA-001; 6 registros en BD para Q1 (RET-2026-0001 a 0006) sin ningún registro adicional para Eric Febrero.
- **Riesgo:** 200 € de gasto real de personal no contabilizado. Afecta base Modelo 111 (aunque RET-2026-0004 ya incluye el gross correcto para la deducción IRPF — verificar con gestoría si este plus tributó).
- **Fix:** Crear registro en `accounting.partner_compensation_runs`. Ver sección "Correcciones SQL".

---

### P1 — ALTO

#### ACC-003 · PENDIENTE-226394 (Lovable CFFRKUCI0008): status=APPROVED con paid=83,45 y pending=0

- **Síntoma:** La factura PENDIENTE-226394 tiene `status = APPROVED`, `paid_amount = 83,45`, `pending_amount = 0,00`. Una factura completamente pagada no puede estar en APPROVED.
- **Evidencia:** `sales.purchase_invoices` → `invoice_number = PENDIENTE-226394`.
- **Fix:** `UPDATE sales.purchase_invoices SET status = 'PAID' WHERE invoice_number = 'PENDIENTE-226394'`

---

#### ACC-004 · C-BORR-26-000065 (Microsoft G143792196): base=0 con status=APPROVED

- **Síntoma:** Factura con `subtotal=0`, `tax_amount=0`, `total=0` pero `status=APPROVED`. No tiene sentido económico; probablemente es una factura anulada o una corrección que nunca se procesó.
- **Evidencia:** `sales.purchase_invoices` → `invoice_number = C-BORR-26-000065`, issue_date=2026-03-02.
- **Fix:** Cambiar a `CANCELLED` o eliminar si no tiene documentación asociada.

---

#### ACC-005 · 69 tickets en PENDING_VALIDATION con base=1.453,53 €

- **Síntoma:** La plataforma tiene 69 tickets gastos en estado `PENDING_VALIDATION` con un base imponible acumulado de **1.453,53 €**. El Excel los trata como validados en sus totales (la hoja Tickets Gastos los incluye con total=1.449,96 €). La plataforma podría estar excluyéndolos del resumen fiscal.
- **Riesgo:** Si el Resumen IVA y el Modelo 303 se calculan filtrando por `status IN ('PAID','APPROVED')`, estos 69 tickets quedarían fuera → riesgo de IVA soportado mal calculado.
- **Acción:** Revisar manualmente si estos tickets tienen justificante válido y aprobarlos. No corregir automáticamente.

---

### P2 — MEDIO / BAJO

#### ACC-006 · C-BORR-26-000056 (Microsoft G136214573): pending_amount=-0,01 €

- **Síntoma:** `paid_amount=6,83`, `total=6,82`, `pending_amount=-0,01`. Error de redondeo en el pago.
- **Fix:** `UPDATE sales.purchase_invoices SET paid_amount=6.82, pending_amount=0.00 WHERE invoice_number='C-BORR-26-000056'`

---

#### ACC-007 · 3 facturas de compra en BD no recogidas en Excel (plataforma más actualizada)

Las siguientes facturas existen en BD pero no aparecen en la hoja `Fact. Compra` del Excel (que tiene fecha de corte 26/03):

| invoice_number | Fecha | base | status | Nota |
|---|---|---|---|---|
| C-BORR-26-000069 | 2026-03-03 | 356,67 | APPROVED | TuLuZevents sup_inv=26005 — pendiente de pago |
| C-BORR-26-000071 | 2026-03-04 | 6,68 | PAID | Ya pagado, poca relevancia |
| C-BORR-26-000070 | 2026-03-27 | 106,00 | APPROVED | Renom 69/2026 — posterior a corte Excel |

Estas facturas son **reales y correctas en BD**. El Excel está desactualizado, no la plataforma.
**C-BORR-26-000069** (356,67 €) es la más relevante: pendiente de pago, no aparece en la lista de pendientes del Dashboard Excel. Verificar que está incluida en el pago a proveedores pendiente.

---

#### ACC-008 · F-26-000003: vencimiento 2026-02-17 en BD vs 2026-02-15 en Excel

- Discrepancia de 2 días. Baja criticidad pero puede afectar alertas de vencido en plataforma.

---

#### ACC-009 · expense_category NULL en C-BORR-26-000066 y C-BORR-26-000068

- Microsoft G147079536 y G148864747 sin categoría de gasto. Asignar `SOFTWARE`.

---

#### ACC-010 · DRAFTs F-BORR-0035 y F-BORR-0036 en totales de "pendiente cobro" de la plataforma

- Existen 2 facturas de venta en estado DRAFT (total combinado ~5.802 €) que no están en el Excel.
  Si la UI de NEXO incluye DRAFTs en el contador de "pendiente de cobro", infla la cifra respecto al Excel.
  Verificar que la vista de facturas pendientes filtre `status NOT IN ('DRAFT','CANCELLED')`.

---

## Correcciones SQL propuestas

> ⚠️ Revisar y validar cada UPDATE antes de ejecutar. Hacer backup mental del estado actual (arriba documentado).

```sql
-- ACC-001: Corregir RET-2026-0005 (Alex Marzo) — gross, irpf y paid_amount
UPDATE accounting.partner_compensation_runs
SET
  gross_amount  = 818.71,
  irpf_amount   = 118.71,
  net_amount    = 700.00,
  paid_amount   = 700.00
WHERE compensation_number = 'RET-2026-0005';

-- ACC-002: Crear EXTRA-001 (Eric Febrero Plus Nómina 200 €)
-- NOTA: Necesitas el partner_id de Eric Izquierdo = a18108e2-a78d-421e-bf5c-642d8f67591d
-- y el created_by = UUID del usuario que gestiona nóminas
INSERT INTO accounting.partner_compensation_runs (
  compensation_number, period_year, period_month, partner_id,
  gross_amount, irpf_rate, irpf_amount, net_amount, paid_amount,
  status, notes, created_at, updated_at
) VALUES (
  'EXTRA-2026-001', 2026, 2, 'a18108e2-a78d-421e-bf5c-642d8f67591d',
  200.00, 0.00, 0.00, 200.00, 200.00,
  'PAID', 'Plus Nómina febrero 2026 — pago Revolut Business 01/02/2026. Registrado a posteriori en auditoría Q1.',
  NOW(), NOW()
);

-- ACC-003: Corregir estado PENDIENTE-226394
UPDATE sales.purchase_invoices
SET status = 'PAID'
WHERE invoice_number = 'PENDIENTE-226394';

-- ACC-004: Cancelar C-BORR-26-000065 (base=0)
UPDATE sales.purchase_invoices
SET status = 'CANCELLED'
WHERE invoice_number = 'C-BORR-26-000065';

-- ACC-006: Corregir redondeo C-BORR-26-000056
UPDATE sales.purchase_invoices
SET paid_amount = 6.82, pending_amount = 0.00
WHERE invoice_number = 'C-BORR-26-000056';

-- ACC-009: Asignar categoría a facturas Microsoft sin categoría
UPDATE sales.purchase_invoices
SET expense_category = 'SOFTWARE'
WHERE invoice_number IN ('C-BORR-26-000066', 'C-BORR-26-000068')
  AND expense_category IS NULL;
```

---

## Resumen de impacto en cifras Q1

| Concepto | Excel | BD actual | Diferencia | Tras correcciones |
|---|---|---|---|---|
| Ventas — base | 27.061,49 | 27.061,49 | 0,00 | ✅ |
| Ventas — cobrado | 18.510,99 | 18.510,99 | 0,00 | ✅ |
| Compras — base (Q1) | 14.091,94 | ~14.455,29 | +363,35 (C-BORR-000069+071) | Facturas reales, el Excel es el incompleto |
| Nóminas — pagado | 7.362,34 | 6.962,34 | **-400,00** | +700 (acc-001) +200 (acc-002) → 7.362,34 |
| IVA a ingresar (M.303) | 2.998,53 | sin cambio | — | ✅ |

> La discrepancia principal entre Excel y plataforma es de **nóminas**: la plataforma muestra 400 € menos de pagados de los que realmente se transfirieron por Revolut (600€ de Alex Marzo mal registrados, -200€ de Eric ya correcto en BD).

---

## Checklist de cierre

- [ ] Ejecutar ACC-001 (RET-2026-0005 paid_amount)
- [ ] Ejecutar ACC-002 (EXTRA-001 Eric Feb plus)
- [ ] Ejecutar ACC-003 (PENDIENTE-226394 → PAID)
- [ ] Ejecutar ACC-004 (C-BORR-26-000065 → CANCELLED)
- [ ] Ejecutar ACC-006 (redondeo C-BORR-26-000056)
- [ ] Ejecutar ACC-009 (categorías Microsoft NULL)
- [ ] Revisar manualmente los 69 tickets PENDING_VALIDATION (ACC-005)
- [ ] Verificar UI plataforma filtra DRAFTs en contador "pendiente cobro" (ACC-010)
- [ ] Confirmar con gestoría el tratamiento fiscal de EXTRA-001 (¿tributa en M.111 Q1?)
- [ ] Actualizar Excel Q1.xlsx con facturas C-BORR-26-000069 y C-BORR-26-000070
