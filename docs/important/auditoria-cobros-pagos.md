# Auditoría Técnica Completa: Sistema de Cobros y Pagos

> **Fecha:** 2026-02-13  
> **Versión:** 1.0  
> **Scope:** Frontend (React+TS), RPCs (Supabase), Funciones PostgreSQL, Triggers, Tablas financieras

---

## Índice

1. [Arquitectura General](#1-arquitectura-general)
2. [BLOQUE A: Cobros (Facturas de Venta)](#2-bloque-a-cobros-facturas-de-venta)
3. [BLOQUE B: Pagos (Facturas de Compra)](#3-bloque-b-pagos-facturas-de-compra)
4. [BLOQUE C: Nóminas y Retribuciones](#4-bloque-c-nóminas-y-retribuciones)
5. [BLOQUE D: Cuentas Bancarias](#5-bloque-d-cuentas-bancarias)
6. [BLOQUE E: Asientos Contables](#6-bloque-e-asientos-contables)
7. [Mapa de Flujo Financiero](#7-mapa-de-flujo-financiero)
8. [Análisis Crítico y Debilidades](#8-análisis-crítico-y-debilidades)
9. [Recomendaciones de Mejora](#9-recomendaciones-de-mejora)

---

## 1. Arquitectura General

### Esquemas de Base de Datos Involucrados

| Esquema | Responsabilidad |
|---------|----------------|
| `sales` | Facturas venta/compra, líneas, pagos, pedidos de compra |
| `accounting` | Asientos, plan contable, créditos, nóminas, cierres |
| `internal` | Partners, socios, proveedores, técnicos, bancos, configuración |
| `crm` | Clientes |

### Tablas Clave del Sistema de Pagos

| Tabla | Función |
|-------|---------|
| `sales.invoice_payments` | Cobros de facturas de venta |
| `sales.purchase_invoice_payments` | Pagos de facturas de compra (3 modos) |
| `accounting.payroll_payments` | Pagos de nóminas y retribuciones |
| `accounting.credit_operations` | Operaciones de financiación externa |
| `accounting.credit_installments` | Cuotas de financiación |
| `accounting.credit_settlements` | Liquidaciones de cuotas de crédito |
| `accounting.journal_entries` | Asientos contables |
| `accounting.journal_entry_lines` | Líneas de asiento (Debe/Haber) |
| `internal.company_bank_accounts` | Cuentas bancarias reales de la empresa |

---

## 2. BLOQUE A: Cobros (Facturas de Venta)

### 2.1 Componentes Frontend

| Componente | Ubicación | Función |
|-----------|-----------|---------|
| `RegisterPaymentDialog` | `src/.../invoices/RegisterPaymentDialog.tsx` | Registrar/editar cobro individual |
| `InvoicePaymentsSection` | `src/.../invoices/InvoicePaymentsSection.tsx` | Listado de cobros + totales + acciones |
| `PaymentsTab` | `src/.../common/PaymentsTab.tsx` | Componente genérico reutilizable para tabs de pagos |

### 2.2 RPCs Involucradas

| RPC | Acción |
|-----|--------|
| `finance_register_payment` | Inserta cobro + genera asiento contable |
| `finance_update_payment` | Actualiza datos de un cobro existente |
| `finance_delete_payment` | Elimina un cobro |
| `finance_get_invoice_payments` | Lista cobros de una factura |
| `finance_get_client_payments` | Lista cobros de un cliente |
| `finance_get_project_payments` | Lista cobros de un proyecto |

### 2.3 Tabla de Almacenamiento: `sales.invoice_payments`

```
┌─────────────────────────┬──────────┬──────────┬────────────────────────┐
│ Columna                 │ Tipo     │ Nullable │ Default                │
├─────────────────────────┼──────────┼──────────┼────────────────────────┤
│ id                      │ UUID     │ NO       │ gen_random_uuid()      │
│ invoice_id              │ UUID     │ NO       │ FK → sales.invoices    │
│ amount                  │ NUMERIC  │ NO       │ -                      │
│ payment_date            │ DATE     │ NO       │ -                      │
│ payment_method          │ TEXT     │ NO       │ -                      │
│ bank_reference          │ TEXT     │ YES      │ -                      │
│ notes                   │ TEXT     │ YES      │ -                      │
│ is_confirmed            │ BOOLEAN  │ YES      │ true                   │
│ registered_by           │ UUID     │ NO       │ -                      │
│ company_bank_account_id │ TEXT     │ YES      │ -                      │
│ created_at              │ TIMESTZ  │ YES      │ now()                  │
│ updated_at              │ TIMESTZ  │ YES      │ now()                  │
└─────────────────────────┴──────────┴──────────┴────────────────────────┘
```

> **Nota:** `company_bank_account_id` es de tipo `TEXT`, no `UUID`. Almacena el ID de la cuenta bancaria receptora del cobro.

### 2.4 Flujo de Generación de Asiento Contable

El asiento se genera **dentro de la función RPC** `finance_register_payment`, NO por trigger.

**Condición:** Solo se genera asiento si `issue_date >= 2026-01-01 AND payment_date >= 2026-01-01`.

**Función interna:** `accounting.create_invoice_payment_entry(payment_id, entry_date)`

**Asiento generado:**

```
┌──────────┬──────────────────────────────┬──────────┬──────────┐
│ Línea    │ Cuenta                       │ Debe     │ Haber    │
├──────────┼──────────────────────────────┼──────────┼──────────┤
│ 1        │ 572xxx (Banco específico)    │ Importe  │          │
│ 2        │ 430000 (Clientes)            │          │ Importe  │
└──────────┴──────────────────────────────┴──────────┴──────────┘
```

- La cuenta bancaria se resuelve buscando en `internal.company_preferences` → JSONB `bank_accounts` → match por nombre en `internal.company_bank_accounts` → `accounting_code`.
- Si no se encuentra banco, usa `572000` por defecto.
- `third_party_id` se asocia al `client_id` en la línea del Haber.

### 2.5 Gestión de Estados de Factura

**Trigger:** `trigger_recalculate_paid_amount` en `sales.invoice_payments` (INSERT/UPDATE/DELETE).

**Cadena de ejecución:**
1. `sales.recalculate_invoice_paid_amount(invoice_id)` → Suma `amount` WHERE `is_confirmed = true` → Actualiza `paid_amount`.
2. `sales.update_invoice_status_from_payments(invoice_id)` → Transición de estados:

```
ISSUED ──┬── paid_amount >= total ──→ PAID
         ├── paid_amount > 0 & < total ──→ PARTIAL
         └── due_date < hoy & paid < total ──→ OVERDUE
```

**Protecciones:**
- No cambia estados `PAID` o `CANCELLED`.
- El estado `OVERDUE` se evalúa solo si `due_date < CURRENT_DATE`.

### 2.6 Validación de Sobrepagos

**Sí existe.** En `finance_register_payment`:
```sql
IF (v_current_total_paid + p_amount) > (v_invoice.total + 0.01) THEN
  RAISE EXCEPTION 'El importe del pago excede el saldo pendiente';
END IF;
```
- Tolerancia de 0.01€ para redondeos.
- Solo cuenta pagos confirmados (`is_confirmed = true`).

---

## 3. BLOQUE B: Pagos (Facturas de Compra)

### 3.1 Componentes Frontend

| Componente | Ubicación | Función |
|-----------|-----------|---------|
| `RegisterPurchasePaymentDialog` | `src/.../purchases/RegisterPurchasePaymentDialog.tsx` | 3 modos: Standard, Personal, Financiación |
| `PurchaseInvoicePaymentsSection` | `src/.../purchases/PurchaseInvoicePaymentsSection.tsx` | Listado de pagos + totales |

### 3.2 Tabla de Almacenamiento: `sales.purchase_invoice_payments`

```
┌─────────────────────────────────┬──────────┬──────────┬────────────────────────┐
│ Columna                         │ Tipo     │ Nullable │ Default                │
├─────────────────────────────────┼──────────┼──────────┼────────────────────────┤
│ id                              │ UUID     │ NO       │ gen_random_uuid()      │
│ purchase_invoice_id             │ UUID     │ NO       │ FK → purchase_invoices │
│ amount                          │ NUMERIC  │ NO       │ -                      │
│ payment_date                    │ DATE     │ NO       │ -                      │
│ payment_method                  │ TEXT     │ NO       │ -                      │
│ bank_reference                  │ TEXT     │ YES      │ -                      │
│ notes                           │ TEXT     │ YES      │ -                      │
│ is_confirmed                    │ BOOLEAN  │ YES      │ true                   │
│ registered_by                   │ UUID     │ NO       │ -                      │
│ company_bank_account_id         │ TEXT     │ YES      │ -                      │
│ payer_type                      │ TEXT     │ NO       │ 'COMPANY'              │
│ payer_person_id                 │ UUID     │ YES      │ -                      │
│ reimbursement_status            │ TEXT     │ NO       │ 'NOT_REQUIRED'         │
│ reimbursement_date              │ DATE     │ YES      │ -                      │
│ reimbursement_journal_entry_id  │ UUID     │ YES      │ -                      │
└─────────────────────────────────┴──────────┴──────────┴────────────────────────┘
```

### 3.3 MODO STANDARD (Pago empresa)

**RPC:** `register_purchase_payment`

**Flujo:**
1. Inserta en `sales.purchase_invoice_payments` con `payer_type = 'COMPANY'`.
2. **Trigger `auto_create_purchase_payment_entry`** genera asiento automáticamente al INSERT.

**Asiento generado (vía TRIGGER, no RPC):**

```
┌──────────┬──────────────────────────────┬──────────┬──────────┐
│ Línea    │ Cuenta                       │ Debe     │ Haber    │
├──────────┼──────────────────────────────┼──────────┼──────────┤
│ 1        │ 400000 (Proveedores)         │ Importe  │          │
│ 2        │ 572xxx (Banco específico)    │          │ Importe  │
└──────────┴──────────────────────────────┴──────────┴──────────┘
```

- Si `amount < 0` (reembolso), el asiento se invierte: DEBE Banco / HABER Proveedor.
- Si `is_confirmed = false`, NO se genera asiento.
- Resuelve `accounting_code` directamente desde `internal.company_bank_accounts` por `company_bank_account_id`.

**Gestión de estados:** Trigger `recalculate_purchase_invoice_paid_amount` + `recalculate_purchase_paid_amount`:
```
APPROVED ──┬── paid >= total ──→ PAID (+ genera internal_purchase_number si no existe)
            ├── paid > 0 & < total ──→ PARTIAL
            └── paid = 0 ──→ sin cambio
```

**Pagos parciales:** ✅ Soportados correctamente.

### 3.4 MODO PERSONAL (Pago socio)

**RPC:** `register_personal_purchase_payment`

**Flujo:**
1. Inserta en `sales.purchase_invoice_payments` con:
   - `payer_type = 'PERSONAL'`
   - `payer_person_id = UUID del socio`
   - `reimbursement_status = 'PENDING'`
   - `payment_method = 'PERSONAL'`
2. **NO genera asiento contable de pago.** ¿Por qué? Porque la empresa NO ha movido dinero de sus cuentas.
3. El trigger de recálculo actualiza `paid_amount` y estado de la factura normalmente.

**¿Cómo se genera la deuda con el socio?**

La cuenta contable del socio (`465xxx` o `551000`) se asegura en `accounting.chart_of_accounts` dentro de la RPC:
```sql
INSERT INTO accounting.chart_of_accounts (account_code, account_name, ...)
VALUES (v_partner_account, 'Cuenta corriente con ' || partner_name, ...)
ON CONFLICT DO NOTHING;
```

> **⚠ HALLAZGO CRÍTICO:** La RPC `register_personal_purchase_payment` **NO genera asiento contable** para registrar la deuda con el socio. Solo inserta el pago con `reimbursement_status = 'PENDING'`. El asiento de deuda (Debe 6xx/Haber 465xxx) NO se crea en este punto.
>
> **Sin embargo**, el trigger `auto_create_purchase_payment_entry` se ejecuta igualmente al INSERT, y genera un asiento estándar (400/572) que es **incorrecto** para un pago personal — debería usar la cuenta del socio como contrapartida, no la bancaria.

**Impacto en PyG:** El gasto ya se registró al aprobar la factura (asiento APPROVED: Debe 6xx / Haber 400). El pago personal solo mueve la deuda del proveedor al socio.

**Vinculación con `PendingReimbursementsPage.tsx`:**
- RPC `list_pending_reimbursements`: Lista todos los pagos con `payer_type = 'PERSONAL'` y `reimbursement_status = 'PENDING'`.
- Muestra: socio pagador, factura, importe, selector de cuenta bancaria.

**Reembolso (`reimburse_personal_purchase`):**

```
┌──────────┬──────────────────────────────┬──────────┬──────────┐
│ Línea    │ Cuenta                       │ Debe     │ Haber    │
├──────────┼──────────────────────────────┼──────────┼──────────┤
│ 1        │ 465xxx/551xxx (Socio)        │ Importe  │          │
│ 2        │ 572xxx (Banco)               │          │ Importe  │
└──────────┴──────────────────────────────┴──────────┴──────────┘
```

- Actualiza `reimbursement_status = 'REIMBURSED'`, `reimbursement_date`, `reimbursement_journal_entry_id`.

### 3.5 MODO FINANCIACIÓN (EXTERNAL CREDIT / Aplazame)

**RPC:** `create_credit_operation`

**Tablas involucradas:**

| Tabla | Función |
|-------|---------|
| `accounting.external_credit_providers` | Proveedores de crédito (Aplazame, etc.) |
| `accounting.credit_operations` | Operación de financiación principal |
| `accounting.credit_installments` | Cuotas mensuales generadas |
| `accounting.credit_settlements` | Liquidaciones/pagos de cuotas |

#### Tabla `accounting.credit_operations`

```
┌──────────────────────────────┬──────────┬──────────┬────────────────────────┐
│ Columna                      │ Tipo     │ Nullable │ Default                │
├──────────────────────────────┼──────────┼──────────┼────────────────────────┤
│ id                           │ UUID     │ NO       │ gen_random_uuid()      │
│ direction                    │ TEXT     │ NO       │ 'PAY'                  │
│ provider_id                  │ UUID     │ NO       │ FK → credit_providers  │
│ purchase_invoice_id          │ UUID     │ NO       │ FK → purchase_invoices │
│ gross_amount                 │ NUMERIC  │ NO       │ -                      │
│ fee_amount                   │ NUMERIC  │ NO       │ 0                      │
│ net_amount                   │ NUMERIC  │ NO       │ gross - fee            │
│ num_installments             │ INTEGER  │ NO       │ 1                      │
│ status                       │ ENUM     │ NO       │ 'CONFIRMED'            │
│ journal_entry_id             │ UUID     │ YES      │ -                      │
│ settlement_bank_account_id   │ UUID     │ YES      │ -                      │
│ created_by                   │ UUID     │ YES      │ -                      │
└──────────────────────────────┴──────────┴──────────┴────────────────────────┘
```

#### Tabla `accounting.credit_installments`

```
┌─────────────────────┬──────────┬──────────┬────────────────────────┐
│ Columna             │ Tipo     │ Nullable │ Default                │
├─────────────────────┼──────────┼──────────┼────────────────────────┤
│ id                  │ UUID     │ NO       │ gen_random_uuid()      │
│ operation_id        │ UUID     │ NO       │ FK → credit_operations │
│ installment_number  │ INTEGER  │ NO       │ -                      │
│ due_date            │ DATE     │ NO       │ -                      │
│ amount              │ NUMERIC  │ NO       │ -                      │
│ status              │ ENUM     │ NO       │ 'PENDING'              │
│ created_at          │ TIMESTZ  │ NO       │ now()                  │
└─────────────────────┴──────────┴──────────┴────────────────────────┘
```

#### Tabla `accounting.credit_settlements`

```
┌─────────────────────┬──────────┬──────────┬────────────────────────┐
│ Columna             │ Tipo     │ Nullable │ Default                │
├─────────────────────┼──────────┼──────────┼────────────────────────┤
│ id                  │ UUID     │ NO       │ gen_random_uuid()      │
│ operation_id        │ UUID     │ NO       │ FK → credit_operations │
│ settlement_date     │ DATE     │ NO       │ CURRENT_DATE           │
│ gross_amount        │ NUMERIC  │ NO       │ -                      │
│ fee_amount          │ NUMERIC  │ NO       │ 0                      │
│ net_amount          │ NUMERIC  │ NO       │ -                      │
│ bank_account_id     │ UUID     │ NO       │ -                      │
│ journal_entry_id    │ UUID     │ YES      │ -                      │
│ created_by          │ UUID     │ YES      │ -                      │
└─────────────────────┴──────────┴──────────┴────────────────────────┘
```

#### Flujo de Creación

1. **Validación:** Factura debe estar en `APPROVED` o `PARTIAL`. No puede existir otra operación activa para la misma factura+proveedor.

2. **Asiento de reclasificación (generado en la RPC):**

```
┌──────────┬──────────────────────────────────────┬──────────┬──────────┐
│ Línea    │ Cuenta                               │ Debe     │ Haber    │
├──────────┼──────────────────────────────────────┼──────────┼──────────┤
│ 1        │ 400000 (Proveedor original)          │ Importe  │          │
│ 2        │ 520xxx (Acreedor financiero-Aplazame) │          │ Importe  │
└──────────┴──────────────────────────────────────┴──────────┴──────────┘
```

3. **Generación automática de cuotas:**
   - Se crean `num_installments` registros en `credit_installments`.
   - Primera cuota: `first_due_date` o `hoy + 30 días`.
   - Intervalo: 30 días entre cuotas.
   - Última cuota ajustada para cuadrar con `gross_amount` (evita errores de redondeo).

#### Análisis de Capacidades de Cuotas

| Capacidad | Estado |
|-----------|--------|
| Fecha de vencimiento por cuota | ✅ `due_date` en cada `credit_installments` |
| Fecha de pago real | ⚠️ Solo en `credit_settlements.settlement_date`, no directamente en la cuota |
| Asociar cuenta bancaria | ✅ `credit_settlements.bank_account_id` |
| Registrar pago mensual de cuota | ⚠️ **Existe tabla `credit_settlements` pero NO se encontró RPC pública para registrar el pago de una cuota individual** |
| Separar capital vs gastos financieros | ✅ `credit_settlements` tiene `gross_amount`, `fee_amount`, `net_amount` |
| Contabilización del fee como gasto financiero | ⚠️ **No se encontró función `settle_credit_installment` o similar en el código** |

> **⚠ HALLAZGO CRÍTICO:** La infraestructura de tablas para cuotas está completa (`credit_installments` + `credit_settlements`) pero **NO existe RPC pública ni frontend** para registrar el pago individual de cuotas. El sistema crea la operación y las cuotas pero no tiene flujo para gestionarlas después.

---

## 4. BLOQUE C: Nóminas y Retribuciones

### 4.1 Componentes Frontend

| Componente | Ubicación | Función |
|-----------|-----------|---------|
| `RegisterPartnerPayrollPaymentDialog` | `src/.../rrhh/RegisterPartnerPayrollPaymentDialog.tsx` | Pago individual de retribución de socio |
| `CreatePayrollPaymentDialog` | `src/.../accounting/CreatePayrollPaymentDialog.tsx` | Registro genérico de pago nómina/retribución |

### 4.2 Tablas

#### `internal.partner_compensation_runs` (Retribuciones de socios)

```
┌─────────────────────────────┬──────────┬──────────┬────────────────────────┐
│ Columna                     │ Tipo     │ Nullable │ Default                │
├─────────────────────────────┼──────────┼──────────┼────────────────────────┤
│ id                          │ UUID     │ NO       │ gen_random_uuid()      │
│ compensation_number         │ TEXT     │ NO       │ -                      │
│ period_year                 │ INTEGER  │ NO       │ -                      │
│ period_month                │ INTEGER  │ NO       │ -                      │
│ partner_id                  │ UUID     │ NO       │ FK → internal.partners │
│ gross_amount                │ NUMERIC  │ NO       │ -                      │
│ base_amount                 │ NUMERIC  │ YES      │ -                      │
│ productivity_bonus          │ NUMERIC  │ YES      │ 0                      │
│ irpf_rate                   │ NUMERIC  │ NO       │ 19.00                  │
│ irpf_amount                 │ NUMERIC  │ NO       │ -                      │
│ net_amount                  │ NUMERIC  │ NO       │ -                      │
│ status                      │ TEXT     │ NO       │ 'DRAFT'                │
│ paid_amount                 │ NUMERIC  │ NO       │ 0                      │
│ journal_entry_id            │ UUID     │ YES      │ -                      │
│ is_locked                   │ BOOLEAN  │ NO       │ false                  │
│ notes                       │ TEXT     │ YES      │ -                      │
│ bonus_reference_*           │ VARIOS   │ YES      │ - (campos de política) │
└─────────────────────────────┴──────────┴──────────┴────────────────────────┘
```

#### `accounting.payroll_runs` (Nóminas de empleados)

Similar estructura con campos para empleado en lugar de socio.

#### `accounting.payroll_payments` (Pagos de nómina)

```
┌─────────────────────────────────┬──────────┬──────────┬────────────────────────┐
│ Columna                         │ Tipo     │ Nullable │ Default                │
├─────────────────────────────────┼──────────┼──────────┼────────────────────────┤
│ id                              │ UUID     │ NO       │ gen_random_uuid()      │
│ payment_number                  │ TEXT     │ NO       │ PAG-NOM-YYYYMMDD-XXXX  │
│ payroll_run_id                  │ UUID     │ YES      │ -                      │
│ partner_compensation_run_id     │ UUID     │ YES      │ -                      │
│ payment_date                    │ DATE     │ NO       │ CURRENT_DATE           │
│ amount                          │ NUMERIC  │ NO       │ -                      │
│ payment_method                  │ TEXT     │ NO       │ 'TRANSFER'             │
│ bank_reference                  │ TEXT     │ YES      │ -                      │
│ journal_entry_id                │ UUID     │ YES      │ -                      │
│ company_bank_account_id         │ UUID     │ YES      │ -                      │
│ notes                           │ TEXT     │ YES      │ -                      │
│ created_by                      │ UUID     │ YES      │ -                      │
└─────────────────────────────────┴──────────┴──────────┴────────────────────────┘
```

### 4.3 Cálculos

| Concepto | Backend/Frontend | Detalles |
|----------|-----------------|----------|
| Bruto | Backend | `create_partner_compensation_run` / `calculate_partner_productivity_bonus` |
| IRPF | Backend | `irpf_amount = gross_amount * irpf_rate / 100` |
| Seguridad Social | ❌ No implementada | Solo se contempla para empleados RETA, no socios |
| Neto | Backend | `net_amount = gross_amount - irpf_amount` |
| Bonus productividad | Backend | `calculate_partner_productivity_bonus` basado en beneficio del mes de referencia |

### 4.4 Flujo de Pago: `pay_partner_compensation_run`

Esta RPC es la principal para pagar retribuciones de socios. Genera TODO en una transacción:

1. **Valida** que `status IN ('POSTED', 'PARTIAL')`.
2. **Resuelve cuenta bancaria:** `internal.company_bank_accounts.accounting_code`.
3. **Calcula cuenta del socio:** `465` + `LPAD(partner_number_digits, 3, '0')` → ej: SOC-0001 → `465001`.
4. **Genera asiento:**

```
┌──────────┬──────────────────────────────┬──────────┬──────────┐
│ Línea    │ Cuenta                       │ Debe     │ Haber    │
├──────────┼──────────────────────────────┼──────────┼──────────┤
│ 1        │ 465xxx (Socio)               │ Importe  │          │
│ 2        │ 572xxx (Banco)               │          │ Importe  │
└──────────┴──────────────────────────────┴──────────┴──────────┘
```

5. **Inserta `payroll_payments`** con número automático `PAG-NOM-YYYYMMDD-XXXX`.
6. **Actualiza estado:** `paid_amount += amount` → si `paid >= net_amount` → `PAID`, sino `PARTIAL`.

### 4.5 Flujo alternativo: `accounting.create_payroll_payment`

Se usa desde `CreatePayrollPaymentDialog` (contabilidad). Llama a `accounting.create_payroll_payment_entry`:

- Mismo asiento: DEBE 465000 / HABER 572xxx.
- Actualiza estado de `payroll_runs` o `partner_compensation_runs` a `PAID` si suma >= neto.

### 4.6 Análisis de Capacidades

| Capacidad | Estado |
|-----------|--------|
| Vinculación a persona (partner/employee) | ✅ via `partner_id` o `employee_id` |
| Cuenta bancaria pagadora | ✅ `company_bank_account_id` |
| Pago masivo | ⚠️ **No existe**. Solo pago individual por retribución. No hay `pay_all_pending_compensations` |
| Cálculo automático completo | ✅ Backend (`create_partner_compensation_run_from_policy`) |

---

## 5. BLOQUE D: Cuentas Bancarias

### 5.1 Tabla real: `internal.company_bank_accounts`

```
┌─────────────────┬──────────┬──────────┬────────────────────────┐
│ Columna         │ Tipo     │ Nullable │ Default                │
├─────────────────┼──────────┼──────────┼────────────────────────┤
│ id              │ UUID     │ NO       │ gen_random_uuid()      │
│ bank_name       │ TEXT     │ NO       │ -                      │
│ holder_name     │ TEXT     │ YES      │ -                      │
│ iban            │ TEXT     │ YES      │ -                      │
│ accounting_code │ TEXT     │ NO       │ -                      │
│ notes           │ TEXT     │ YES      │ -                      │
│ is_active       │ BOOLEAN  │ YES      │ true                   │
└─────────────────┴──────────┴──────────┴────────────────────────┘
```

### 5.2 Cuentas Bancarias Actuales

| Banco | Código Contable | IBAN | Uso |
|-------|-----------------|------|-----|
| SABADELL NEGOCIOS | 572001 | ES52...7679 | Cuenta principal: cobros, pagos autónomos |
| CAIXABANK EMPRESES | 572002 | ES16...2615 | Impuestos, tarjeta crédito |
| REVOLUT BUSINESS | 572003 | ES61...7468 | Nóminas (socios) |

### 5.3 Doble fuente de datos (Problema de arquitectura)

Existe **duplicidad** entre:
1. `internal.company_bank_accounts` → Tabla relacional con `accounting_code`.
2. `internal.company_preferences.bank_accounts` → JSONB con `{id, bank, iban}`.

**Impacto:**
- Los cobros de venta usan `company_preferences` JSONB → buscan por nombre → luego `company_bank_accounts`.
- Los pagos de compra usan `company_bank_accounts` directamente por ID.
- Las nóminas usan `company_bank_accounts` directamente por ID.

### 5.4 Análisis de Capacidades

| Capacidad | Estado |
|-----------|--------|
| Cada pago guarda bank_account_id | ✅ En todas las tablas de pagos |
| Tabla de movimientos bancarios | ❌ No existe tabla dedicada. Se reconstruye via asientos contables |
| Extracto bancario reconstruible | ✅ Via `accounting.list_cash_movements` (consulta asientos 572xxx) |
| Conciliación bancaria | ⚠️ Solo via "Ajustar Saldo" (ajuste contra 129000). No hay conciliación punteo |

---

## 6. BLOQUE E: Asientos Contables

### 6.1 Tablas

#### `accounting.journal_entries`

```
┌───────────────────┬──────────┬──────────┬────────────────────────┐
│ Columna           │ Tipo     │ Nullable │ Default                │
├───────────────────┼──────────┼──────────┼────────────────────────┤
│ id                │ UUID     │ NO       │ gen_random_uuid()      │
│ entry_number      │ TEXT     │ NO       │ Secuencial automático  │
│ entry_date        │ DATE     │ NO       │ CURRENT_DATE           │
│ entry_type        │ ENUM     │ NO       │ -                      │
│ description       │ TEXT     │ NO       │ -                      │
│ reference_id      │ UUID     │ YES      │ -                      │
│ reference_type    │ TEXT     │ YES      │ -                      │
│ project_id        │ UUID     │ YES      │ -                      │
│ is_locked         │ BOOLEAN  │ YES      │ false                  │
│ is_automatic      │ BOOLEAN  │ YES      │ false                  │
│ period_start      │ DATE     │ YES      │ -                      │
│ period_end        │ DATE     │ YES      │ -                      │
│ created_by        │ UUID     │ YES      │ -                      │
└───────────────────┴──────────┴──────────┴────────────────────────┘
```

#### `accounting.journal_entry_lines`

```
┌───────────────────┬──────────┬──────────┬────────────────────────┐
│ Columna           │ Tipo     │ Nullable │ Default                │
├───────────────────┼──────────┼──────────┼────────────────────────┤
│ id                │ UUID     │ NO       │ gen_random_uuid()      │
│ journal_entry_id  │ UUID     │ NO       │ FK → journal_entries   │
│ account_code      │ TEXT     │ NO       │ -                      │
│ debit_credit      │ TEXT     │ NO       │ 'DEBIT' / 'CREDIT'    │
│ amount            │ NUMERIC  │ NO       │ -                      │
│ third_party_id    │ UUID     │ YES      │ -                      │
│ third_party_type  │ ENUM     │ YES      │ -                      │
│ description       │ TEXT     │ YES      │ -                      │
│ line_order        │ INTEGER  │ YES      │ 0                      │
└───────────────────┴──────────┴──────────┴────────────────────────┘
```

### 6.2 Mapa de Asientos por Operación

| Operación | entry_type | Método | Debe | Haber |
|-----------|-----------|--------|------|-------|
| **Cobro cliente** | `PAYMENT_RECEIVED` | RPC `finance_register_payment` → `create_invoice_payment_entry` | 572xxx (Banco) | 430000 (Clientes) |
| **Pago proveedor estándar** | `PAYMENT` | TRIGGER `auto_create_purchase_payment_entry` | 400000 (Proveedores) | 572xxx (Banco) |
| **Pago personal socio** | `PAYMENT` | TRIGGER (⚠️ erróneo, ver §8) | 400000 (Proveedores) | 572xxx (Banco) |
| **Reembolso a socio** | `REIMBURSEMENT` | RPC `reimburse_personal_purchase` | 465xxx/551xxx (Socio) | 572xxx (Banco) |
| **Reclasificación financiación** | `CREDIT_RECLASSIFICATION` | RPC `create_credit_operation` | 400000 (Proveedor) | 520xxx (Acreedor financiero) |
| **Pago cuota crédito** | ❌ No existe | - | Debería: 520xxx | 572xxx |
| **Pago nómina socio** | `PAYMENT_MADE` | RPC `pay_partner_compensation_run` | 465xxx (Socio) | 572xxx (Banco) |
| **Pago nómina empleado** | `PAYMENT_MADE` | `accounting.create_payroll_payment_entry` | 465000 | 572xxx |
| **Traspaso bancario** | `BANK_TRANSFER` | RPC `create_bank_transfer` | 572xxx (destino) | 572xxx (origen) |
| **Ajuste saldo** | `ADJUSTMENT` | RPC `create_bank_balance_adjustment` | 572xxx / 129000 | 129000 / 572xxx |

### 6.3 Numeración Automática

- Función: `accounting.get_next_entry_number()` / `accounting.next_entry_number()`.
- Formato secuencial con retry para evitar duplicados (`unique_violation`).
- **Diario contable:** Existe como vista filtrada desde `journal_entries`.
- **Filtro por ejercicio fiscal:** ✅ Via `entry_date` y campo opcional `period_start`/`period_end`.

### 6.4 Equilibrio de Asientos

Todos los asientos generados automáticamente están equilibrados (2 líneas, mismo importe, una DEBE y otra HABER). No hay validación explícita tipo constraint `SUM(debit) = SUM(credit)` en la tabla, pero cada función/trigger los genera equilibrados por diseño.

---

## 7. Mapa de Flujo Financiero

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COBROS (VENTAS)                                  │
│                                                                             │
│  Factura Venta ──ISSUED──→ Registrar Cobro ──→ sales.invoice_payments      │
│                              │                                              │
│                              ├── Trigger: recalculate_paid_amount           │
│                              ├── Trigger: update_invoice_status             │
│                              └── RPC: create_invoice_payment_entry          │
│                                    └── Asiento: D.572 / H.430              │
├─────────────────────────────────────────────────────────────────────────────┤
│                         PAGOS (COMPRAS)                                     │
│                                                                             │
│  ┌── MODO STANDARD ─────────────────────────────────────────────┐          │
│  │  Factura Compra ──APPROVED──→ register_purchase_payment      │          │
│  │    └── INSERT purchase_invoice_payments (payer=COMPANY)      │          │
│  │    └── TRIGGER: auto_create_purchase_payment_entry            │          │
│  │         └── Asiento: D.400 / H.572                           │          │
│  │    └── TRIGGER: recalculate_purchase_paid_amount              │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
│  ┌── MODO PERSONAL ─────────────────────────────────────────────┐          │
│  │  register_personal_purchase_payment                          │          │
│  │    └── INSERT purchase_invoice_payments (payer=PERSONAL)     │          │
│  │    └── TRIGGER: auto_create (⚠️ genera 400/572 incorrecto)   │          │
│  │    └── Pendiente en PendingReimbursementsPage                │          │
│  │                                                               │          │
│  │  reimburse_personal_purchase                                 │          │
│  │    └── Asiento: D.465/551 / H.572                            │          │
│  │    └── UPDATE reimbursement_status = 'REIMBURSED'            │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
│  ┌── MODO FINANCIACIÓN ─────────────────────────────────────────┐          │
│  │  create_credit_operation                                     │          │
│  │    └── Asiento reclasificación: D.400 / H.520                │          │
│  │    └── Genera cuotas en credit_installments                  │          │
│  │    └── ⚠️ NO existe flujo para pagar cuotas individuales     │          │
│  └──────────────────────────────────────────────────────────────┘          │
├─────────────────────────────────────────────────────────────────────────────┤
│                           NÓMINAS                                           │
│                                                                             │
│  Retribución ──POSTED──→ pay_partner_compensation_run                      │
│    └── Asiento: D.465xxx / H.572xxx                                        │
│    └── INSERT payroll_payments (PAG-NOM-YYYYMMDD-XXXX)                     │
│    └── UPDATE status → PARTIAL / PAID                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Análisis Crítico y Debilidades

### 🔴 CRÍTICO

| # | Problema | Impacto |
|---|----------|---------|
| 1 | **Pago personal genera asiento incorrecto.** El trigger `auto_create_purchase_payment_entry` se ejecuta para TODOS los INSERT en `purchase_invoice_payments`, incluyendo pagos personales. Genera D.400/H.572 cuando debería generar D.400/H.465xxx o NO generar asiento de banco. | Asientos incorrectos: se registra salida de banco cuando la empresa no pagó. Descuadre en tesorería y saldos de proveedores. |
| 2 | **No existe flujo para pagar cuotas de financiación.** Las tablas `credit_installments` y `credit_settlements` existen pero no hay RPC ni UI para registrar pagos mensuales, separar capital/intereses, o marcar cuotas como pagadas. | Las financiaciones se crean pero no se pueden gestionar. Deuda financiera (520xxx) nunca se cancela contablemente. |
| 3 | **No hay constraint de equilibrio de asientos.** Los asientos dependen de que cada función los genere correctamente, pero no hay validación a nivel de tabla `SUM(debit) = SUM(credit)`. | Si alguna función tiene un bug, pueden existir asientos desequilibrados sin detección. |

### 🟡 IMPORTANTE

| # | Problema | Impacto |
|---|----------|---------|
| 4 | **Doble fuente de cuentas bancarias.** `company_preferences.bank_accounts` (JSONB) vs `company_bank_accounts` (tabla). Los cobros de venta usan una ruta indirecta (JSONB → nombre → tabla). | Fragilidad: si los nombres no coinciden, el cobro usa 572000 genérico. |
| 5 | **`company_bank_account_id` es TEXT en ventas, UUID en nóminas.** Tipos inconsistentes entre `sales.invoice_payments` (TEXT) y `accounting.payroll_payments` (UUID). | Imposibilita JOINs directos y genera casting innecesario. |
| 6 | **Cobros de venta: asiento solo si >= 2026.** Facturas anteriores a 2026 no generan asiento contable automático. | Datos históricos sin contabilizar automáticamente (correcto por diseño, pero puede generar confusión). |
| 7 | **No existe pago masivo de nóminas.** Solo se puede pagar una retribución a la vez. | Ineficiente para empresas con múltiples socios/empleados. |

### 🟢 MENOR

| # | Problema | Impacto |
|---|----------|---------|
| 8 | **No hay conciliación bancaria por punteo.** Solo ajuste global de saldo. | No se puede identificar qué movimientos específicos no cuadran. |
| 9 | **Libro de Caja excluye ajustes 129000.** | Los ajustes de saldo no aparecen en el extracto reconstruido, lo cual es correcto pero puede confundir. |

---

## 9. Recomendaciones de Mejora

### Prioridad 1: Correcciones Críticas

1. **Corregir trigger de pago personal:** El trigger `auto_create_purchase_payment_entry` debe verificar `NEW.payer_type`. Si es `'PERSONAL'`, debe generar asiento D.400 / H.465xxx (deuda con socio), NO D.400 / H.572.

2. **Implementar flujo de pago de cuotas de financiación:**
   - Crear RPC `settle_credit_installment(p_installment_id, p_bank_account_id, p_settlement_date)`.
   - Asiento: D.520xxx (capital) + D.669xxx (gastos financieros por fee) / H.572xxx.
   - Actualizar `credit_installments.status = 'PAID'`.
   - UI en el detalle de la operación de crédito.

3. **Añadir constraint de equilibrio de asientos:**
   ```sql
   CREATE OR REPLACE FUNCTION accounting.validate_entry_balance()
   RETURNS TRIGGER AS $$
   BEGIN
     IF (SELECT SUM(CASE WHEN debit_credit='DEBIT' THEN amount ELSE -amount END)
         FROM accounting.journal_entry_lines WHERE journal_entry_id = NEW.journal_entry_id) != 0
     THEN RAISE EXCEPTION 'Asiento desequilibrado'; END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```

### Prioridad 2: Mejoras de Arquitectura

4. **Unificar fuente de cuentas bancarias:** Eliminar `company_preferences.bank_accounts` JSONB y usar exclusivamente `internal.company_bank_accounts`. Actualizar `create_invoice_payment_entry` para buscar directamente por UUID.

5. **Normalizar tipo `company_bank_account_id`:** Migrar a UUID en `sales.invoice_payments`.

6. **Implementar pago masivo de nóminas:**
   - RPC `pay_all_pending_compensations(p_bank_account_id, p_payment_date)`.
   - Itera todas las retribuciones en estado `POSTED`.

### Prioridad 3: Funcionalidades Avanzadas

7. **Conciliación bancaria por punteo:** Tabla `accounting.bank_reconciliation_items` con match entre movimientos del extracto y asientos contables.

8. **Calendario de pagos de financiación:** Vista frontend que muestre todas las cuotas pendientes con sus fechas de vencimiento y permita registrar pagos individuales.

9. **Dashboard de tesorería:** Proyección de cash flow basada en cobros pendientes + cuotas de crédito + nóminas futuras.

---

> **Última actualización:** 2026-02-13  
> **Estado:** Auditoría completada. Pendientes correcciones críticas #1, #2, #3.
