# Análisis: Traspasos Bancarios y Aprobación de Nóminas

**Fecha:** Enero 2026  
**Contexto:** Tras pull de correcciones TypeScript del usuario, continuar implementación de traspasos y nóminas.

---

## 1. Cambios del usuario (pull recibido)

| Archivo | Corrección |
|---------|------------|
| `MetricCard.tsx` | Añadida prop `subtitle` con estilo CSS |
| `PurchaseOrder pages` | RPCs convertidas a `supabase.rpc("function_name" as any, ...)` para funciones no tipadas |
| `InvoicesPage.tsx` | Mapeados campos `payment_bank_name` y `payment_bank_id` |
| `NewPurchaseOrderPage.tsx` | Corregido tipo `Technician` para coincidir con RPC |
| `PurchaseInvoiceDetailPage` / `ScannerDetailPage` | Cast a `(supabase as any)` para tablas del schema `sales` |

---

## 2. Traspasos bancarios

### 2.1 Flujo actual

1. **Ubicación:** Contabilidad → Resumen → "Nuevo movimiento" → "Traspaso entre bancos"
2. **Componente:** `BankTransferDialog.tsx`
3. **RPC:** `create_bank_transfer(p_source_bank_id, p_source_bank_name, p_target_bank_id, p_target_bank_name, p_amount, p_transfer_date, p_notes)`

### 2.2 Problemas detectados

1. **`is_automatic` inexistente:** La migración `20260129100600` inserta en `journal_entries` la columna `is_automatic`, que **no existe** en el esquema original. Esto provoca fallo al ejecutar el traspaso.

2. **Enum `BANK_TRANSFER`:** El enum `accounting.journal_entry_type` original no incluye `BANK_TRANSFER`. La migración `list_cash_movements` lo usa, por lo que debe haberse añadido en algún momento; si no, el traspaso falla.

### 2.3 Migración de corrección

**Archivo:** `supabase/migrations/20260130100000_fix_bank_transfer_and_journal_lines.sql`

**Cambios:**
- Añade `BANK_TRANSFER` al enum si no existe: `ALTER TYPE accounting.journal_entry_type ADD VALUE IF NOT EXISTS 'BANK_TRANSFER'`
- Reescribe `create_bank_transfer` sin `is_automatic`: usa solo `reference_type`, `is_locked`, `created_by`
- Corrige `list_journal_entry_lines_by_period` para usar `debit_credit` y `amount` (no `debit`/`credit` inexistentes) y `reference_type`/`reference_id` (no `source_type`/`source_id`)

### 2.4 Cómo aplicar

Ejecutar la migración en Supabase Dashboard → SQL Editor:

```sql
-- Contenido de 20260130100000_fix_bank_transfer_and_journal_lines.sql
```

O con CLI (si está linkeado): `npx supabase db push`

---

## 3. Aprobación de nóminas

### 3.1 Flujo actual

1. **Crear nómina (DRAFT):** `CreatePayrollDialog` / `CreatePartnerCompensationDialog` → `create_payroll_run` / `create_partner_compensation_run`
2. **Aprobar (POSTED):** Botón "Aprobar" → `post_payroll_run` / `post_partner_compensation_run`
3. **Pagar:** `CreatePayrollPaymentDialog` → `create_payroll_payment` (empleados) / `pay_partner_compensation_run` (socios)

### 3.2 Correcciones ya implementadas (migración 20260129200000)

- `company_bank_account_id` en `payroll_payments`
- Bug de `net_amount` en `create_payroll_payment_entry`
- Uso de banco correcto (572xxx) según selección del usuario
- `post_payroll_run` y `post_partner_compensation_run` permiten usuarios autorizados (no solo admin)
- `create_partner_compensation_entry` usa `PAYROLL_PARTNER` y `get_next_entry_number()`
- `pay_partner_compensation_run` como wrapper de `create_payroll_payment`

### 3.3 Verificación del frontend

- `CreatePayrollPaymentDialog` pasa `p_company_bank_account_id` para empleados
- `pay_partner_compensation_run` recibe `p_bank_account_id` para socios
- Fecha de pago: `formData.payment_date` se envía correctamente

### 3.4 Requisito para que funcione

Las migraciones `20260129200000_fix_payroll_approval_and_payment.sql` y `20260130100000_fix_bank_transfer_and_journal_lines.sql` deben estar aplicadas en Supabase.

---

## 4. Resumen de migraciones pendientes de aplicar

| Migración | Descripción |
|-----------|-------------|
| `20260129200000_fix_payroll_approval_and_payment.sql` | Aprobación nóminas, pago con banco correcto |
| `20260130000000_monthly_reports_and_dataset_rpc.sql` | Informes mensuales, `monthly_reports`, `get_monthly_closure_report_dataset` |
| `20260130000001_fix_partner_compensation_schema_reference.sql` | `partner_compensation_runs` en `accounting` |
| `20260130100000_fix_bank_transfer_and_journal_lines.sql` | Traspasos bancarios, `list_journal_entry_lines_by_period` |

---

## 5. Próximos pasos

1. **Aplicar migraciones** en Supabase Dashboard (SQL Editor) en el orden indicado.
2. **Probar traspaso:** Contabilidad → Nuevo movimiento → Traspaso entre bancos.
3. **Probar nóminas:** Crear DRAFT → Aprobar → Pagar (con banco y fecha seleccionados).
4. Si el CLI está linkeado: `npx supabase link --project-ref takvthfatlcjsqgssnta` y luego `npx supabase db push`.
