# Contabilidad: Fase A–D y auditoría

## Resumen de migraciones aplicadas

| Fase | Migración | Contenido |
|------|-----------|-----------|
| A | `20260203180000_fix_accounting_reports_date_filter.sql` | PyG, Balance y saldos filtran por fecha con CTE (entries → lines). |
| B | `20260203180100_fix_corporate_tax_idempotent_and_trigger.sql` | IS idempotente; trigger excluye TAX_PROVISION y TAX_SETTLEMENT. |
| C | `20260203180200_fix_purchase_invoice_entry_on_approved.sql` | Asiento de compra al pasar a APPROVED (idempotente). |
| B+ | `20260203180300_accounting_is_period_columns_and_purchase_entry_date.sql` | **IS**: `period_start`/`period_end` en `journal_entries` (búsqueda determinística). **Compras**: fecha contable = `issue_date`, luego `updated_at::date` (aprobación), luego `CURRENT_DATE`. |
| D | `20260203180400_validate_month_consistency_rpc.sql` | RPC `accounting.validate_month_consistency(p_year, p_month)` + wrapper `public.validate_month_consistency`. |
| Auditoría | `20260203180500_accounting_audit_hardening.sql` | **UNIQUE** índice `uq_tax_provision_period` (evita 2 TAX_PROVISION mismo período). Helpers `raise_if_period_closed_for_date` / `_for_ym`. **Trigger** `trigger_check_journal_entry_period_closed`: bloquea INSERT/UPDATE de asientos con `entry_date` en periodo cerrado. |
| D+ | `20260203180600_validate_month_consistency_extra_checks.sql` | Validator ampliado: compras por `COALESCE(issue_date, updated_at::date)`; check **JE_HAS_LINES** (asientos sin líneas); check **CASH_BOOK_COUNTERPART** (572 + 430/400/410/465). |
| Cierres | `20260206110000_open_period_and_auto_close_on_tenth.sql` | **open_period(p_year, p_month)**: reabre un mes cerrado para seguir registrando. **auto_close_previous_month_if_tenth()**: regla de negocio — el mes anterior se cierra el día 10 del mes actual (margen para tickets/facturas colgadas). Invocar diariamente (pg_cron, Edge Function o cron externo). |

---

## Regla de cierre: mes anterior se cierra el día 10

- **Regla**: La contabilidad del mes anterior se cierra automáticamente el **día 10** del mes actual. Ejemplo: enero se cierra el 10 de febrero; así hay margen para subir tickets y facturas pendientes.
- **Reabrir un mes**: Si necesitas volver a abrir un mes ya cerrado (p. ej. para subir más tickets), usa la RPC **open_period(p_year, p_month)** desde la app (Contabilidad) o desde SQL. Luego puedes cerrar de nuevo con **close_period**.
- **Cierre automático el día 10**: La función **auto_close_previous_month_if_tenth()** cierra el mes anterior solo si hoy es día 10. Para que sea automático, hay que invocarla **cada día** (p. ej. pg_cron a las 00:05, Supabase Edge Function programada, o un cron externo que llame al RPC).

---

## Definición de “fecha contable” por flujo

| Flujo | Fecha contable | Nota |
|-------|----------------|------|
| **Ventas** | `issue_date` de la factura | Fija al emitir (ISSUED). |
| **Compras** | `COALESCE(issue_date, updated_at::date, CURRENT_DATE)` | Si no hay `issue_date`, se usa la fecha de aprobación (`updated_at`). |
| **Nóminas / retribuciones** | Fecha del asiento al postear (por defecto último día del mes del run o 1º del siguiente, según implementación) | Definida por `period_year`/`period_month` del run. |
| **Pagos / cobros** | `payment_date` (o equivalente en el RPC de registro). | Fecha del movimiento de caja. |

---

## Regla de “pertenencia al mes”

- **Factura de venta**: pertenece al mes en que está su **issue_date**.
- **Factura de compra**: pertenece al mes de su **fecha contable** = `COALESCE(issue_date, updated_at::date)` (mismo criterio que el asiento).
- **Validator**: las compras del mes se filtran por esa fecha; así el check “Compras APPROVED con asiento” y el periodo contable quedan alineados.

---

## Auditoría Fase A–C (qué está bien y qué se reforzó)

### Fase A — Reportes por fecha
- **Bien**: Patrón CTE entries → lines evita el bug del LEFT JOIN con fechas.
- **Nota**: `get_balance_sheet` solo ASSET/LIABILITY/EQUITY (balance de situación). `get_client_balances` fija cuenta `430000`; si en el futuro usas subcuentas 430xxx, conviene permitir prefijo `430%`.

### Fase B — Provisión IS
- **Bien**: Sin duplicados por recursión y trigger que excluye TAX_*.
- **Reforzado en 20260203180300**: Identificación del asiento existente por **period_start/period_end** en `journal_entries` (ya no por `description LIKE`). Fallback a descripción para asientos legacy. Índice parcial para TAX_PROVISION + corporate_tax.

### Fase C — Compras
- **Bien**: Contabilización en APPROVED e idempotencia.
- **Reforzado en 20260203180300**: Fecha contable = `COALESCE(issue_date, updated_at::date, CURRENT_DATE)` para que una factura aprobada en febrero con fecha de enero lleve el asiento a enero.

---

## Fase D — Validación de consistencia mensual

**RPC**: `accounting.validate_month_consistency(p_year, p_month, p_tolerance)`  
**Uso desde app**: `public.validate_month_consistency(p_year, p_month)` (wrapper).

**Devuelve** una fila por check: `check_code`, `check_name`, `passed`, `severity`, `detail`, `meta` (JSONB).

### Checks implementados

| check_code | Descripción | Severity |
|------------|-------------|----------|
| `JE_BALANCED` | Asientos del mes con Debe = Haber (tolerancia 0.01) | BLOCKER |
| `PURCHASE_APPROVED_HAS_ENTRY` | Compras APPROVED del mes (por issue_date/updated_at) con asiento INVOICE_PURCHASE | BLOCKER |
| `TAX_PROVISION_UNIQUE` | Máximo una provisión IS (TAX_PROVISION) en el año | BLOCKER |
| `JE_HAS_LINES` | Asientos del mes con al menos una línea (ninguno vacío) | BLOCKER |
| `PAYROLL_465_COHERENCE` | Coherencia cuenta 465 vs neto nóminas POSTED del mes (tolerancia 5€) | WARNING |
| `CASH_BOOK_COUNTERPART` | Cobros (PAYMENT_RECEIVED) con 572 y 430; pagos (PAYMENT_MADE) con 572 y 400/410/465 | BLOCKER |
| `SALES_ISSUED_HAS_ENTRY` | Ventas ISSUED del mes con asiento INVOICE_SALE | BLOCKER |

Ejecutar antes del cierre mensual; en la UI se puede mostrar por check si pasó o no y el detalle/meta.

---

## Cuenta de gasto en facturas de compra (opcional)

**Problema**: `create_invoice_purchase_entry` usa siempre **623000**.  
**Recomendación**: Mapear `expense_category` (en `sales.purchase_invoices`) a cuenta contable (600/62x/629) y usar esa cuenta en el asiento; si no hay mapeo, 623000 por defecto.

---

## Bloqueo real tras cierre (implementado)

En **20260203180500** se añade el trigger `trigger_check_journal_entry_period_closed` en `accounting.journal_entries`:
- **BEFORE INSERT OR UPDATE OF entry_date**: si la fecha del asiento pertenece a un periodo cerrado (`period_closures` con `is_locked = true`), se lanza excepción.
- Afecta a todos los asientos (venta, compra, nómina, pagos, manuales): no se puede crear ni cambiar `entry_date` a un mes ya cerrado.

Así el PyG oficial es inmutable tras cierre.

---

## Checklist “cierre contable mensual fiable”

- [x] Reportes (PyG, Balance, saldos) filtran por fecha (Fase A).
- [x] IS idempotente por period_start/period_end; **UNIQUE** por período; trigger sin recursión (Fase B + 20260203180300 + 20260203180500).
- [x] Compras contabilizadas al APPROVED; fecha contable issue_date/updated_at (Fase C + 20260203180300).
- [x] RPC de validación mensual con 7 checks, incluidos asientos con líneas y contrapartidas caja (Fase D + 20260203180600).
- [x] Bloqueo de asientos en meses cerrados (trigger en 20260203180500).
- [ ] Ejecutar `validate_month_consistency(p_year, p_month)` antes de dar el mes por cerrado.
- [ ] (Opcional) Cuenta de gasto por categoría en compras.
