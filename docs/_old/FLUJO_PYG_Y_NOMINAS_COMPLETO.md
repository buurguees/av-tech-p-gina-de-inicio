# Flujo Completo: PyG Mensual y Sistema de Nóminas

**Documento de referencia operativa**  
**Proyecto:** NEXO AV - Plataforma de Gestión  
**Última actualización:** Enero 2026

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Flujo del PyG durante el mes](#2-flujo-del-pyg-durante-el-mes)
3. [Sistema de Nóminas](#3-sistema-de-nóminas)
4. [Inventario de botones y acciones](#4-inventario-de-botones-y-acciones)
5. [RPCs y base de datos](#5-rpcs-y-base-de-datos)
6. [Diagramas de flujo](#6-diagramas-de-flujo)
7. [Consideraciones y riesgos para cierre mensual e informes automáticos](#7-consideraciones-y-riesgos-para-cierre-mensual-e-informes-automáticos)

---

## 1. Resumen ejecutivo

### 1.1 Qué es el PyG (Cuenta de Pérdidas y Ganancias)

El PyG es el informe contable que muestra **ingresos**, **gastos** y **resultado** de un período. En NEXO AV se calcula a partir de los asientos contables (`journal_entries` + `journal_entry_lines`) filtrados por fechas.

**Fuente de verdad:** La RPC `get_profit_loss(p_period_start, p_period_end)` consulta el esquema `accounting` y devuelve líneas agrupadas por cuenta (7xx ingresos, 6xx gastos, 630xxx Impuesto de Sociedades).

### 1.2 Qué alimenta el PyG

| Tipo de movimiento | Cuándo se contabiliza | Cuentas afectadas |
|--------------------|------------------------|-------------------|
| Factura de venta emitida | Al pasar a ISSUED | 430 (clientes), 700 (ventas), 477 (IVA repercutido) |
| Factura de compra aprobada | Al aprobar (APPROVED) | 400/410 (proveedores), 6xx (gastos), 472 (IVA soportado) |
| Nómina empleado | Al aprobar (POSTED) | 640 (sueldos), 4751 (IRPF), 465 (remuneraciones pendientes) |
| Retribución socio | Al aprobar (POSTED) | 640 (retribución socios), 4751 (IRPF), 465 |
| Provisión IS | Automática o manual | 630 (Impuesto sobre beneficios) |
| Cobro de cliente | Al registrar pago | 572 (banco), 430 (clientes) |
| Pago a proveedor | Al registrar pago | 572 (banco), 400/410 (proveedores) |
| Pago de nómina | Al registrar pago | 572 (banco), 465 (remuneraciones) |

### 1.3 Estado del PyG: informativo vs oficial

- **PyG en curso:** El período seleccionado no está cerrado. Los datos pueden cambiar (nuevas facturas, nóminas, pagos). **Uso:** seguimiento operativo.
- **PyG cerrado:** El mes está en `accounting.period_closures` con `is_locked = true`. Los datos son definitivos. **Uso:** informes oficiales, bonus de socios.

---

## 2. Flujo del PyG durante el mes

### 2.1 Página principal: Contabilidad

**Ruta:** `/nexo-av/:userId/accounting`  
**Componente:** `AccountingPage.tsx`

#### 2.1.1 Configuración del período

El usuario selecciona el período mediante:

- **Filtro de tipo:** Año | Trimestre | Mes
- **Año:** Input numérico
- **Trimestre:** Q1, Q2, Q3, Q4 (si filtro = trimestre)
- **Mes:** Selector 1–12 (si filtro = mes)
- **Fecha balance:** Input `balanceDate` (para Balance de Situación y saldos a fecha)

**Cálculo de fechas:** La función `getPeriodDates()` devuelve `start` y `end` según el filtro:

- Año: 1 enero – 31 diciembre
- Trimestre: primer día – último día del trimestre
- Mes: primer día – último día del mes

Estas fechas se usan en:
- `get_profit_loss(p_period_start, p_period_end)`
- `list_journal_entries(p_start_date, p_end_date)`
- `list_cash_movements(p_start_date, p_end_date)`
- `get_vat_summary`, `get_irpf_summary`, `get_corporate_tax_summary`

#### 2.1.2 Botón "Actualizar"

**Ubicación:** Header de Contabilidad, junto a los filtros.

**Acción:** Llama a `loadAllData()` que ejecuta en paralelo:
- `fetchBalanceSheet()`
- `fetchProfitLoss()`
- `fetchClientBalances()`
- `fetchSupplierBalances()`
- `fetchVATSummary()`
- `fetchIRPFSummary()`
- `fetchCorporateTaxSummary()`
- `fetchJournalEntries()`
- `fetchChartOfAccounts()`
- `fetchCompanyBankAccounts()`
- `fetchBankAccountBalances()`

**Base de datos:** Solo **lectura**. No escribe nada.

#### 2.1.3 Botón "Exportar"

**Ubicación:** Header de Contabilidad.

**Estado actual:** Placeholder. No implementa exportación real.

---

### 2.2 Resumen (Dashboard)

**Tab:** `dashboard`

#### 2.2.1 KPIs mostrados

| KPI | Origen | Cálculo |
|-----|--------|---------|
| Facturas Emitidas | `journalEntries` | `filter(e => e.entry_type === 'INVOICE_SALE').length` |
| Facturas Recibidas | `journalEntries` | `filter(e => e.entry_type === 'INVOICE_PURCHASE').length` |
| Asientos Contables | `journalEntries` | `journalEntries.length` |
| Clientes Activos | `clientBalances` | `filter(c => Math.abs(c.net_balance) > 0).length` |
| Ingresos | `profitLoss` | Suma de `amount` donde `account_type === 'REVENUE'` |
| Gastos Operativos | `profitLoss` | Suma de `amount` donde `account_type === 'EXPENSE'` y `!account_code.startsWith('630')` |
| BAI | Cálculo frontend | `totalRevenue - operatingExpenses` |
| IS Provisionado | `corporateTaxSummary` | `corporateTaxSummary.tax_amount` |
| Resultado Neto | Cálculo frontend | `profitBeforeTax - corporateTax` |

**Importante:** Los gastos operativos **excluyen** la cuenta 630xxx (Impuesto sobre beneficios) para que el BAI sea correcto. La provisión IS se resta después.

#### 2.2.2 Cuentas Bancarias

**Origen:** `companyBankAccounts` (de `get_company_preferences`) + `bankAccountBalances` (de `list_bank_accounts_with_balances`).

**Saldo total bancos:** Suma de `net_balance` de todas las cuentas 572xxx en `balanceSheet`. Si hay `bankAccountBalances` por banco, se usa ese valor por cuenta.

**Botón "Nuevo movimiento":** Select con opciones:
- Asiento de apertura → abre `BankOpeningEntryDialog`
- Traspaso entre bancos → abre `BankTransferDialog`
- Pago de impuesto → abre `TaxPaymentDialog`
- Gasto sin factura → abre `ManualMovementDialog` (EXPENSE)
- Ingreso sin factura → abre `ManualMovementDialog` (INCOME)

---

### 2.3 Libro Diario

**Tab:** `journal`

**RPC:** `list_journal_entries(p_start_date, p_end_date, p_limit, p_offset)`

**Datos:** Lista de asientos con `entry_number`, `entry_date`, `entry_type`, `description`, `total_debit`, `total_credit`, `is_locked`, etc.

**Interacción:** Clic en una fila expande las líneas del asiento (RPC `get_journal_entry_lines(p_entry_id)`).

**Base de datos:** Solo lectura.

---

### 2.4 Libro de Caja

**Tab:** `cash`

**RPC:** `list_cash_movements(p_start_date, p_end_date, p_limit)`

**Filtro:** Solo movimientos que afectan cuentas bancarias (572xxx). Excluye facturas/cobros/tickets **sin pago registrado** (solo `PAYMENT_RECEIVED`, `PAYMENT`, `PAYMENT_MADE`, `BANK_TRANSFER`, `ADJUSTMENT`).

**Datos:** `movement_id`, `entry_id`, `entry_number`, `entry_date`, `entry_type`, `movement_type`, `amount`, `bank_account_code`, `third_party_name`, etc.

**Base de datos:** Solo lectura.

---

### 2.5 PyG (Cuenta de Resultados)

**Tab:** `profit-loss`

**RPC:** `get_profit_loss(p_period_start, p_period_end)`

**Retorno:** Array de `{ account_code, account_name, account_type, amount }` donde:
- `account_type = 'REVENUE'` → ingresos (7xx)
- `account_type = 'EXPENSE'` → gastos (6xx, incl. 630)

**Visualización:** Tabla con Cuenta, Nombre, Tipo, Importe. Totales calculados en frontend:
- Total Ingresos
- Total Gastos (operativos sin 630)
- BAI
- IS (de `get_corporate_tax_summary`)
- Resultado Neto

**Base de datos:** Solo lectura.

---

### 2.6 Balance de Situación

**Tab:** `balance`

**RPC:** `get_balance_sheet(p_as_of_date)`

**Retorno:** Saldos por cuenta a fecha `balanceDate`.

**Base de datos:** Solo lectura.

---

### 2.7 Bancos – Traspaso entre cuentas

**Diálogo:** `BankTransferDialog`

**Botón que lo abre:** "Nuevo movimiento" → "Traspaso entre bancos"

**Campos:**
- Banco Origen (select)
- Banco Destino (select)
- Importe (€)
- Fecha del traspaso
- Notas

**RPC:** `create_bank_transfer(p_source_bank_id, p_source_bank_name, p_target_bank_id, p_target_bank_name, p_amount, p_transfer_date, p_notes)`

**Base de datos – qué escribe:**
- Inserta en `accounting.journal_entries` un asiento tipo `BANK_TRANSFER`
- Inserta en `accounting.journal_entry_lines`:
  - Línea HABER en cuenta 572 del banco origen
  - Línea DEBE en cuenta 572 del banco destino

**OnSuccess:** `fetchBalanceSheet`, `fetchJournalEntries`, `fetchBankAccountBalances`, `fetchProfitLoss`

---

### 2.8 Movimientos manuales (gasto/ingreso sin factura)

**Diálogo:** `ManualMovementDialog`

**Botón que lo abre:** "Nuevo movimiento" → "Gasto sin factura" o "Ingreso sin factura"

**RPC:** (según implementación interna) crea asiento manual con cuentas 6xx (gasto) o 7xx (ingreso) y 572 (banco).

**Base de datos:** Inserta `journal_entries` + `journal_entry_lines`.

---

## 3. Sistema de Nóminas

### 3.1 Tipos de nóminas

| Tipo | Tabla / Origen | Cuenta contable devengo |
|------|----------------|--------------------------|
| Nómina empleado | `accounting.payroll_runs` | 640 (Sueldos y salarios) |
| Retribución socio | `accounting.partner_compensation_runs` | 640 (Retribución socios) |

### 3.2 Estados de una nómina

| Estado | Significado | ¿Contabilizado? |
|--------|-------------|------------------|
| DRAFT | Borrador, editable | No |
| POSTED | Aprobada, asiento generado | Sí |
| PARTIAL | Parcialmente pagada | Sí |
| PAID | Totalmente pagada | Sí |

### 3.3 Flujo completo: Crear → Aprobar → Pagar

```
1. CREAR (DRAFT)
   ↓
2. APROBAR (POSTED) → genera asiento contable
   ↓
3. PAGAR (PARTIAL o PAID) → genera asiento de pago
```

---

### 3.4 Crear Nómina de Empleado

**Diálogo:** `CreatePayrollDialog`

**Botón que lo abre:** Contabilidad → Nóminas → Todas / Empleados → "Nómina Empleado"

**Campos:**
- Empleado (select, de `list_employees`)
- Año, Mes
- Bruto (€)
- IRPF (%)
- Notas

**Cálculo en frontend:** `neto = bruto - (bruto * irpf_rate / 100)`

**RPC:** `create_payroll_run(p_employee_id, p_period_year, p_period_month, p_gross_amount, p_irpf_rate, p_notes)`

**Base de datos – qué escribe:**
- Inserta en `accounting.payroll_runs` con `status = 'DRAFT'`
- No crea asiento contable aún

**OnSuccess:** `fetchPayrollRuns()`, cierra diálogo

---

### 3.5 Crear Retribución de Socio

**Diálogo:** `CreatePartnerCompensationDialog`

**Botón que lo abre:** Contabilidad → Nóminas → Todas / Retribuciones → "Retribución Socio"

**Campos:**
- Socio (select, de `list_partners`)
- Año, Mes
- Bruto (€)
- IRPF (%) – se precarga desde ficha del socio si está vinculado a worker
- Notas

**RPC:** `create_partner_compensation_run(p_partner_id, p_period_year, p_period_month, p_gross_amount, p_irpf_rate, p_notes)`

**Base de datos – qué escribe:**
- Inserta en `accounting.partner_compensation_runs` con `status = 'DRAFT'`
- No crea asiento contable aún

**OnSuccess:** `fetchPartnerCompensations()`, cierra diálogo

---

### 3.6 Aprobar Nómina (generar asiento de devengo)

**Botón "Aprobar":** Visible solo si `status === 'DRAFT'`

**Ubicaciones:**
1. Contabilidad → Nóminas → Todas / Empleados / Retribuciones (tabla)
2. RRHH → Socios → Ficha socio → pestaña Nóminas

**Para empleados – RPC:** `post_payroll_run(p_payroll_run_id)`

**Base de datos – qué hace:**
- Actualiza `payroll_runs.status` a `POSTED`
- Crea asiento en `journal_entries` (tipo `PAYROLL_EMPLOYEE`)
- Crea líneas en `journal_entry_lines`:
  - DEBE 640 (Sueldos y salarios) = bruto
  - HABER 4751 (HP IRPF) = irpf_amount
  - HABER 465 (Remuneraciones pendientes) = net_amount
- Vincula `payroll_runs.journal_entry_id` al asiento creado

**Para socios – RPC:** `post_partner_compensation_run(p_compensation_run_id)`

**Base de datos – qué hace:**
- Actualiza `partner_compensation_runs.status` a `POSTED`
- Crea asiento en `journal_entries` (tipo `PAYROLL_PARTNER`)
- Crea líneas en `journal_entry_lines`:
  - DEBE 640 (Retribución socios) = bruto
  - HABER 4751 (HP IRPF) = irpf_amount
  - HABER 465 (Remuneraciones pendientes) = net_amount
- Vincula `partner_compensation_runs.journal_entry_id` al asiento creado

**OnSuccess:** `fetchPayrollRuns()` / `fetchPartnerCompensations()`, toast "Nómina confirmada"

---

### 3.7 Pagar Nómina (registrar pago)

**Diálogo:** `CreatePayrollPaymentDialog`

**Botón que lo abre:** "Pagar" (visible si `status === 'POSTED'` o `PARTIAL`). El ID de la nómina/retribución se pasa vía `(window as any).__pendingPayrollId` o `__pendingCompensationId`.

**Campos:**
- Tipo: Nómina Empleado | Retribución Socio
- Cuenta Bancaria Origen (select)
- Nómina / Retribución (select)
- Fecha de pago
- Importe (se precarga con pendiente)
- Método de pago (Transferencia, Efectivo, Cheque)
- Referencia bancaria
- Notas

**Para empleados – RPC:** `create_payroll_payment(p_amount, p_payroll_run_id, p_partner_compensation_run_id, p_payment_date, p_payment_method, p_bank_reference, p_notes, p_company_bank_account_id)`

**Base de datos – qué hace:**
- Inserta en `accounting.payroll_payments`
- Crea asiento de pago (DEBE 465, HABER 572) usando la cuenta 572 del banco seleccionado
- Actualiza estado de la nómina a `PARTIAL` o `PAID` según corresponda

**Para socios – RPC:** `pay_partner_compensation_run(p_compensation_run_id, p_bank_account_id, p_bank_name, p_amount, p_payment_date, p_payment_method, p_notes)`

**Base de datos – qué hace:**
- Inserta en `accounting.payroll_payments`
- Crea asiento de pago con la cuenta 572 del banco indicado
- Actualiza estado de la retribución

**OnSuccess:** `fetchPayrollPayments()`, `fetchBalanceSheet()`, `fetchJournalEntries()`, `fetchBankAccountBalances()`, `fetchProfitLoss()`, cierra diálogo

---

### 3.8 Configuración de nóminas (por implementar)

Según `docs/NOMINAS_AUTOMATIZACION_DECISIONES.md`:
- **Tabla:** `internal.payroll_settings` (bonus_enabled, bonus_percent, bonus_cap_amount, etc.)
- **Tabla:** `internal.partner_payroll_profiles` (base_salary, irpf_rate por socio)
- **RPCs:** `get_payroll_settings`, `admin_update_payroll_settings`, `calculate_partner_productivity_bonus`, `create_partner_compensation_run_from_policy`

Actualmente el bruto se introduce manualmente en los diálogos de creación.

---

## 4. Inventario de botones y acciones

### 4.1 Contabilidad – Resumen (Dashboard)

| Botón / Control | Acción | RPC / Lógica | Escribe BD |
|-----------------|--------|--------------|------------|
| Año / Trimestre / Mes | Cambia filtro de período | `getPeriodDates()` | No |
| Fecha balance | Cambia `balanceDate` | - | No |
| Actualizar | Recarga todos los datos | `loadAllData()` → múltiples fetch | No |
| Exportar | (Placeholder) | - | No |
| Nuevo movimiento → Asiento de apertura | Abre `BankOpeningEntryDialog` | - | No (hasta enviar) |
| Nuevo movimiento → Traspaso entre bancos | Abre `BankTransferDialog` | - | No (hasta enviar) |
| Nuevo movimiento → Pago de impuesto | Abre `TaxPaymentDialog` | - | No (hasta enviar) |
| Nuevo movimiento → Gasto sin factura | Abre `ManualMovementDialog` (EXPENSE) | - | No (hasta enviar) |
| Nuevo movimiento → Ingreso sin factura | Abre `ManualMovementDialog` (INCOME) | - | No (hasta enviar) |

### 4.2 BankTransferDialog

| Botón | Acción | RPC | Escribe BD |
|-------|--------|-----|------------|
| Cancelar | Cierra diálogo | - | No |
| Registrar Traspaso | Envía formulario | `create_bank_transfer` | Sí: journal_entries, journal_entry_lines |

### 4.3 Nóminas – Todas / Empleados / Retribuciones

| Botón | Acción | RPC | Escribe BD |
|-------|--------|-----|------------|
| Nómina Empleado | Abre `CreatePayrollDialog` | - | No |
| Retribución Socio | Abre `CreatePartnerCompensationDialog` | - | No |
| Aprobar (por fila) | Aprueba nómina DRAFT | `post_payroll_run` o `post_partner_compensation_run` | Sí: payroll_runs/partner_compensation_runs, journal_entries, journal_entry_lines |
| Pagar (por fila) | Abre `CreatePayrollPaymentDialog` con ID | - | No (hasta enviar pago) |

### 4.4 CreatePayrollDialog / CreatePartnerCompensationDialog

| Botón | Acción | RPC | Escribe BD |
|-------|--------|-----|------------|
| Cancelar | Cierra diálogo | - | No |
| Crear Nómina / Crear Retribución | Envía formulario | `create_payroll_run` / `create_partner_compensation_run` | Sí: payroll_runs / partner_compensation_runs |

### 4.5 CreatePayrollPaymentDialog

| Botón | Acción | RPC | Escribe BD |
|-------|--------|-----|------------|
| Cancelar | Cierra diálogo | - | No |
| Registrar Pago | Envía formulario | `create_payroll_payment` (empleados) o `pay_partner_compensation_run` (socios) | Sí: payroll_payments, journal_entries, journal_entry_lines, actualiza estado nómina |

### 4.6 PartnerDetailPage (RRHH → Ficha socio)

| Botón | Acción | RPC | Escribe BD |
|-------|--------|-----|------------|
| Aprobar (nómina) | Aprueba retribución DRAFT | `post_partner_compensation_run` | Sí |
| Pagar (nómina) | Abre diálogo de pago | - | No |
| (Otros) | Editar, Eliminar, etc. | `delete_partner_compensation_run` si elimina | Sí (solo si DRAFT) |

---

## 5. RPCs y base de datos

### 5.1 RPCs de lectura (PyG y contabilidad)

| RPC | Parámetros | Retorno | Uso |
|-----|------------|---------|-----|
| `get_profit_loss` | p_period_start, p_period_end | [{ account_code, account_name, account_type, amount }] | PyG, Resumen |
| `get_balance_sheet` | p_as_of_date | [{ account_code, account_name, account_type, debit_balance, credit_balance, net_balance }] | Balance, Saldos bancos |
| `list_journal_entries` | p_start_date, p_end_date, p_limit, p_offset | [JournalEntry] | Libro Diario |
| `get_journal_entry_lines` | p_entry_id | [JournalEntryLine] | Detalle asiento |
| `list_cash_movements` | p_start_date, p_end_date, p_limit | [CashMovement] | Libro de Caja |
| `get_vat_summary` | p_period_start, p_period_end | { vat_received, vat_paid, vat_balance, vat_to_pay } | Impuestos |
| `get_irpf_summary` | p_period_start, p_period_end | number | Impuestos |
| `get_corporate_tax_summary` | p_period_start, p_period_end | { profit_before_tax, tax_rate, tax_amount, provision_entry_id, ... } | Impuestos, BAI, IS |
| `get_client_balances` | p_as_of_date | [ClientBalance] | Resumen |
| `get_supplier_technician_balances` | p_as_of_date | [SupplierTechnicianBalance] | Resumen |
| `list_chart_of_accounts` | p_only_active | [ChartOfAccount] | Plan Contable |
| `list_payroll_runs` | p_period_year, p_period_month?, p_employee_id?, p_status?, p_limit | [PayrollRun] | Nóminas empleados |
| `list_partner_compensation_runs` | p_period_year, p_period_month?, p_partner_id?, p_status?, p_limit | [PartnerCompensationRun] | Retribuciones socios |
| `list_payroll_payments` | p_start_date, p_end_date, p_limit (y opc. p_payroll_run_id, p_partner_compensation_run_id) | [PayrollPayment] | Pagos nóminas |
| `get_company_preferences` | - | { bank_accounts } | Cuentas bancarias |
| `list_bank_accounts_with_balances` | p_as_of_date? | [{ bank_account_id, bank_name, balance, ... }] | Saldos por banco |
| `get_bank_account_code` | p_bank_account_id | string | Código 572xxx por banco |
| `list_company_bank_accounts` | - | [BankAccount] | Traspasos, pagos |

### 5.2 RPCs de escritura (contabilidad y nóminas)

| RPC | Parámetros | Tablas afectadas |
|-----|------------|------------------|
| `create_bank_transfer` | p_source_bank_id, p_source_bank_name, p_target_bank_id, p_target_bank_name, p_amount, p_transfer_date, p_notes | journal_entries, journal_entry_lines |
| `create_payroll_run` | p_employee_id, p_period_year, p_period_month, p_gross_amount, p_irpf_rate?, p_notes? | payroll_runs |
| `create_partner_compensation_run` | p_partner_id, p_period_year, p_period_month, p_gross_amount, p_irpf_rate?, p_notes? | partner_compensation_runs |
| `post_payroll_run` | p_payroll_run_id | payroll_runs (status), journal_entries, journal_entry_lines |
| `post_partner_compensation_run` | p_compensation_run_id | partner_compensation_runs (status), journal_entries, journal_entry_lines |
| `create_payroll_payment` | p_amount, p_payroll_run_id?, p_partner_compensation_run_id?, p_payment_date?, p_payment_method?, p_bank_reference?, p_notes?, p_company_bank_account_id? | payroll_payments, journal_entries, journal_entry_lines, payroll_runs (status) |
| `pay_partner_compensation_run` | p_compensation_run_id, p_bank_account_id, p_bank_name, p_amount, p_payment_date?, p_payment_method?, p_notes? | payroll_payments, journal_entries, journal_entry_lines, partner_compensation_runs (status) |

### 5.3 Tablas principales

| Tabla | Esquema | Contenido |
|-------|---------|-----------|
| journal_entries | accounting | Cabecera de asientos |
| journal_entry_lines | accounting | Líneas de asientos (cuenta, debe, haber) |
| payroll_runs | accounting | Nóminas empleados |
| partner_compensation_runs | accounting | Retribuciones socios |
| payroll_payments | accounting | Pagos de nóminas/retribuciones |
| chart_of_accounts | accounting | Plan contable |
| period_closures | accounting | Meses cerrados (cuando exista) |

---

## 6. Diagramas de flujo

### 6.1 Flujo mensual del PyG (conceptual)

```
[Inicio del mes]
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ Durante el mes:                                         │
│ • Emitir facturas venta → asiento INVOICE_SALE          │
│ • Aprobar facturas compra → asiento INVOICE_PURCHASE     │
│ • Crear y aprobar nóminas → asiento PAYROLL_*           │
│ • Registrar cobros/pagos → asiento PAYMENT_*           │
│ • Provisión IS (automática o manual)                    │
│ • Traspasos, gastos/ingresos manuales                   │
└─────────────────────────────────────────────────────────┘
     │
     ▼
[Usuario selecciona período en Contabilidad]
     │
     ▼
[Pulsa Actualizar]
     │
     ▼
get_profit_loss(start, end) + get_corporate_tax_summary
     │
     ▼
[PyG mostrado: Ingresos, Gastos, BAI, IS, Resultado Neto]
     │
     ▼
[Opcional: Cerrar mes → period_closures]
     │
     ▼
[PyG oficial para informes / bonus]
```

### 6.2 Flujo de nómina (empleado o socio)

```
[Usuario] → "Nómina Empleado" / "Retribución Socio"
     │
     ▼
CreatePayrollDialog / CreatePartnerCompensationDialog
     │
     ├─ Campos: persona, año, mes, bruto, IRPF%, notas
     │
     ▼
[Crear Nómina / Crear Retribución]
     │
     ▼
create_payroll_run / create_partner_compensation_run
     │
     ▼
INSERT payroll_runs / partner_compensation_runs (status=DRAFT)
     │
     ▼
[Usuario] → "Aprobar" en tabla
     │
     ▼
post_payroll_run / post_partner_compensation_run
     │
     ▼
UPDATE status=POSTED
INSERT journal_entries (PAYROLL_EMPLOYEE / PAYROLL_PARTNER)
INSERT journal_entry_lines (640, 4751, 465)
     │
     ▼
[Asiento contabilizado → afecta PyG]
     │
     ▼
[Usuario] → "Pagar"
     │
     ▼
CreatePayrollPaymentDialog
     │
     ├─ Selecciona banco, fecha, importe
     │
     ▼
create_payroll_payment / pay_partner_compensation_run
     │
     ▼
INSERT payroll_payments
INSERT journal_entries (pago)
INSERT journal_entry_lines (465→572)
UPDATE status=PARTIAL/PAID
     │
     ▼
[Saldo banco actualizado, 465 reducido]
```

---

## 7. Consideraciones y riesgos para cierre mensual e informes automáticos

Este apartado recoge datos y riesgos a tener en cuenta para: **cierre mensual**, **bonus socios**, **generación automática de informes PDF + email**.

### 7.1 Punto crítico: PyG depende de asientos, pero el informe completo necesita líneas

**Situación actual:**
- `list_journal_entries(...)` devuelve solo cabeceras.
- Las líneas se obtienen por asiento con `get_journal_entry_lines(p_entry_id)`.

**Implicación para el PDF:** Si se quiere un PDF con "listado de asientos contables + líneas (debe/haber)", **no** se puede hacer `list_journal_entries` y luego una llamada por cada asiento a `get_journal_entry_lines` (serían decenas/centenas de llamadas → lento y costoso en Edge Function).

**Recomendación:** Añadir una RPC nueva:
- `list_journal_entry_lines_by_period(p_start_date, p_end_date)` — devuelve todas las líneas del período en una sola consulta (con `entry_number`, `entry_date`, `entry_type`, `description` + `account_code` + `debit`/`credit`).
- O una RPC "dataset builder": `get_monthly_closure_report_dataset(year, month)`.

Esto es **prioridad #1** para que el informe "completo" sea viable.

---

### 7.2 Balance: para cierre debe ser fijo, no variable

En AccountingPage el balance usa `balanceDate` (hoy / editable). Para un cierre mensual oficial:

**Regla dura:** `as_of_date` = último día del mes cerrado (ej. 2026-01-31), y ese valor debe quedar guardado en el informe (metadato). Si no, el balance puede cambiar con el tiempo aunque el PyG esté cerrado.

---

### 7.3 Caja vs Diario: separar claramente en el PDF

- **Diario:** Todo (facturas, devengos, provisiones, manuales, pagos, traspasos…).
- **Caja:** Solo movimientos bancarios (572xxx) con tipos `PAYMENT_RECEIVED`, `PAYMENT`, `PAYMENT_MADE`, `BANK_TRANSFER`, `ADJUSTMENT`.

**Implicación:** En el PDF separar claramente:
- Libro Diario (contable)
- Tesorería / Caja (banco/caja)

**Nota estándar a incluir:** *"Las facturas no aparecen en Caja hasta que se registra su cobro/pago."*

---

### 7.4 Nóminas: cuentas 640 vs 642

En la implementación actual, empleados y socios usan **640** (Sueldos y salarios / Retribución socios).

**Decisión a documentar:**
- **Opción A:** Mantener 640 para todo (empleados + socios) y separar por `entry_type` (PAYROLL_EMPLOYEE vs PAYROLL_PARTNER).
- **Opción B:** Usar 642 para empleados y 640 para socios.

**Implicación:** Afecta al desglose del PyG por cuentas y a reportes de RRHH. Si se mantiene 640 para todo, en el informe mensual incluir un apartado "Gastos de personal" subdividido por `entry_type`.

---

### 7.5 ManualMovementDialog: riesgo de "ingresos contados" incorrectamente

Los ajustes bancarios pueden contarse como ingresos si:
- Movimientos manuales de INCOME se imputan a 7xx cuando en realidad eran ajustes/regularizaciones.
- O ADJUSTMENT mal imputado.

**Recomendación:** Definir una cuenta específica de "Ajustes / Regularizaciones" (ej. 629/759 según naturaleza) o un `entry_type = ADJUSTMENT` que no alimente KPIs comerciales. En el PDF, sección "Movimientos manuales" con:
- Totales por tipo (INCOME / EXPENSE / ADJUSTMENT)
- Listado detallado
- Alerta si hay INCOME manuales > X€ (bandera de control)

---

### 7.6 Cierre: congelar fuentes oficiales, no filtros de usuario

El informe automático debe generarse **desde el cierre**, no desde un usuario que selecciona filtros.

**Regla:** El job de informe toma `period_closures(year, month)` y deriva:
- `period_start`
- `period_end`
- `as_of_date = period_end`

Así, si mañana cambia timezone o lógica de períodos, el cierre ya queda fijado.

---

### 7.7 Pagos de nóminas: dos RPCs, un solo origen para el informe

- Empleados: `create_payroll_payment(...)`
- Socios: `pay_partner_compensation_run(...)`

Ambas insertan en `payroll_payments` y crean asientos.

**Para el informe PDF:** El listado de pagos de nómina debe salir de `payroll_payments` por período, no de runs. Enlazar al asiento de pago (`entry_number`) + banco (572xxx). Esto evita duplicidad y refleja "lo que realmente salió de caja".

---

### 7.8 Checklist de cierre: verificar "pendientes" por estados

**"Cierre OK"** = no existen documentos del mes en estado no contabilizado:

| Tipo | Estados a verificar |
|------|---------------------|
| Ventas | No DRAFT con `issue_date` en el mes |
| Compras | No DRAFT/PENDING_VALIDATION/REGISTERED con `issue_date` en el mes |
| Nóminas | No DRAFT del mes |
| Provisión IS | Si la policy exige, debe existir (o warning) |

Esto es verificable y evita el "no sé si falta algo".

---

### 7.9 PDF completo: límites y anexos

Si el mes tiene muchos asientos, el diario puede ser enorme.

**Diseño práctico:**

| Sección | Contenido |
|---------|-----------|
| **Cuerpo del PDF** | Resumen ejecutivo, PyG (detalle por cuentas), Balance, Fiscal, Tesorería (resumen + top movimientos), Nóminas (resumen + detalle), Diario (resumen por entry_type + totales) |
| **Anexo** | Diario completo con líneas |

Si no se hace así, el PDF "principal" pierde usabilidad.

---

### 7.10 Resumen: prioridad para auto-informe al cerrar mes

Para que el informe mensual sea fiable y automático, lo más importante que falta (derivado de este doc) es:

**Añadir una RPC para obtener el libro diario con líneas en lote:**
- `list_journal_entry_lines_by_period(start, end)`, o
- `get_monthly_closure_report_dataset(year, month)`.

Con esto, la Edge Function evita N+1 queries y el informe es viable.

---

## Anexo: Notas técnicas

### Cálculo del Resultado Neto en frontend

```javascript
// AccountingPage.tsx
const totalRevenue = profitLoss
  .filter((item) => item.account_type === "REVENUE")
  .reduce((sum, item) => sum + item.amount, 0);

const operatingExpenses = profitLoss
  .filter((item) => item.account_type === "EXPENSE" && !item.account_code.startsWith("630"))
  .reduce((sum, item) => sum + item.amount, 0);

const profitBeforeTax = totalRevenue - operatingExpenses;
const corporateTax = corporateTaxSummary?.tax_amount || 0;
const netProfit = profitBeforeTax - corporateTax;
```

### Libro de Caja – tipos de entrada incluidos

Solo se muestran movimientos con `entry_type` en:
- `PAYMENT_RECEIVED` (cobros)
- `PAYMENT` (pagos genéricos)
- `PAYMENT_MADE` (pagos)
- `BANK_TRANSFER` (traspasos)
- `ADJUSTMENT` (ajustes)

Las facturas (INVOICE_SALE, INVOICE_PURCHASE) sin pago registrado **no** aparecen en el Libro de Caja.

---

*Documento generado para uso interno. Revisar con cambios en el código.*
