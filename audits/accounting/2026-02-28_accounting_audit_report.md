# Auditoria Contable NEXO AV

Fecha: 2026-02-28
Periodo objetivo de negocio: 2026-01-01 a 2026-02-28
Estado actual: parcial con datos reales del periodo

## Resumen ejecutivo

La auditoria contable de implementacion detecta drift relevante entre el contrato funcional congelado y la implementacion real de ventas, compras y cierres. El problema principal es que el sistema sigue arrastrando un `status` hibrido en DB y UI para representar a la vez estado documental, estado de pago y condicion de vencimiento, mientras que el contrato vigente desde 2026-02-24 exige separacion estricta entre `doc_status`, `payment_status` e `is_overdue`.

Riesgo actual:
- Operativo: alto
- Fiscal/contable: alto
- UX/reporting: alto
- Seguridad/RLS: medio

Limitacion critica pendiente:
- La auditoria de datos reales ya se ha podido ejecutar por RPC usando una secret key del proyecto.
- Sigue pendiente acceso MCP/Management API o SQL directo para inspeccion estructural mas profunda de DB, RLS y definiciones fuera de los wrappers publicos.

## Resumen cuantitativo del periodo 2026-01-01 a 2026-02-28

### Ventas

- 25 facturas en periodo.
- Base imponible total: 16.074,34 EUR
- IVA repercutido total segun facturas: 3.375,61 EUR
- Total facturado: 19.449,95 EUR
- Cobrado: 7.027,98 EUR
- Pendiente de cobro: 12.421,97 EUR
- Facturas vencidas a 2026-03-01: 1
- Importe vencido: 2.962,56 EUR

Desglose mensual:
- Enero 2026: 10 facturas, 9 `PAID`, 1 `PARTIAL`, total 9.990,54 EUR, pendiente 2.962,56 EUR
- Febrero 2026: 15 facturas, 13 `ISSUED`, 2 `DRAFT`, total 9.459,41 EUR, pendiente 9.459,41 EUR

### Compras

- 61 documentos en periodo.
- Tipos: 32 `INVOICE`, 29 `EXPENSE`
- Base imponible total: 9.543,92 EUR
- IVA soportado total segun documentos: 1.950,50 EUR
- Total compras/gastos: 11.480,92 EUR
- Pagado: 4.239,25 EUR
- Pendiente: 7.241,67 EUR
- Documentos vencidos detectados: 0
- Documentos `PENDING_VALIDATION` con total 0: 4

Desglose mensual:
- Enero 2026: 20 documentos, total 2.931,75 EUR, 18 `PAID`, 2 `APPROVED`, pendiente 9,00 EUR
- Febrero 2026: 41 documentos, total 8.549,17 EUR, 19 `DRAFT`, 10 `APPROVED`, 6 `PENDING_VALIDATION`, 5 `PAID`, 1 `PARTIAL`, pendiente 7.232,67 EUR

### Diario y cierres

- 103 asientos listados en periodo.
- Asientos desbalanceados detectados: 0
- Enero 2026 figura cerrado con `closed_at = 2026-01-29T16:36:38.185507+00:00`
- Febrero 2026 figura abierto
- Asientos de enero no bloqueados: 52
- Asientos de enero creados despues del cierre de enero: 24

### Impuestos y resultado

- IVA repercutido: 3.201,73 EUR
- IVA soportado: 1.982,47 EUR
- IVA a pagar: 1.219,26 EUR
- IRPF del periodo: 505,32 EUR
- Beneficio antes de impuesto sobre sociedades: 2.316,50 EUR
- Cuota estimada de impuesto sobre sociedades al 25%: 579,125 EUR
- Asiento de provision de impuesto de sociedades: no existe (`provision_entry_id = null`)

## Hallazgos priorizados

### ACC-001
- Severidad: P0
- Dominio: ventas/docs/db/ui
- Sintoma: el contrato exige `doc_status` y `payment_status` separados, pero ventas sigue usando un `status` unico con valores de documento y pago mezclados.
- Evidencia:
  - [docs/important/estados-nexo.md](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/docs/important/estados-nexo.md): factura de venta definida con `doc_status = DRAFT|ISSUED|CANCELLED`; `payment_status = PENDING|PARTIAL|PAID`; `is_overdue` derivado.
  - [supabase/migrations/20260115141628_complete_invoices_payments_system.sql](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260115141628_complete_invoices_payments_system.sql):46 permite `status IN ('DRAFT','ISSUED','SENT','PARTIAL','PAID','OVERDUE','CANCELLED')`.
  - [supabase/migrations/20260115141628_complete_invoices_payments_system.sql](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260115141628_complete_invoices_payments_system.sql):141,149,160 muta `sales.invoices.status` a `PAID`, `PARTIAL`, `OVERDUE`.
  - [src/constants/financeStatuses.ts](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/constants/financeStatuses.ts):30,38,46 expone `PARTIAL`, `PAID`, `OVERDUE` como estados primarios de factura.
- Causa probable: migraciones iniciales de cobros evolucionaron antes del contrato frozen y luego se añadieron adaptadores frontend sin completar una migracion de dominio.
- Impacto:
  - Informes y filtros pueden mezclar fase administrativa con liquidacion economica.
  - Cualquier asiento, dashboard o KPI basado en `status` puede sobrecontar o clasificar mal.
  - Aumenta el riesgo de transiciones imposibles y de reglas contradictorias entre DB y UI.
- Fix propuesto:
  - Introducir formalmente `doc_status`, `payment_status` e `is_overdue` en `sales.invoices`.
  - Migrar `status` a columna legacy o vista compatibilidad.
  - Reescribir RPCs, triggers y vistas para que `payment_status` se derive de `paid_amount/pending_amount`.
  - Eliminar `OVERDUE` como estado persistido.
- Verificacion:
  - Tests SQL de emision, cobro parcial, cobro total y vencimiento.
  - Validar que `status` legacy siga devolviendo compatibilidad mientras UI migra.

### ACC-002
- Severidad: P0
- Dominio: compras/docs/db/ui
- Sintoma: compras mantiene estados legacy incompatibles con el contrato y la UI mezcla `REGISTERED`, `CONFIRMED`, `PENDING`, `PAID`, `PARTIAL`, `APPROVED`, `PENDING_VALIDATION`.
- Evidencia:
  - [docs/important/estados-nexo.md](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/docs/important/estados-nexo.md): compras define `doc_status = PENDING_VALIDATION|APPROVED|CANCELLED`; `payment_status = PENDING|PARTIAL|PAID`.
  - [supabase/migrations/20260118200000_purchasing_module.sql](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260118200000_purchasing_module.sql):75 permite `status IN ('DRAFT','ISSUED','REGISTERED','PAID','PARTIAL','CANCELLED')`.
  - [supabase/migrations/20260228120000_fix_purchase_tickets_alignment.sql](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260228120000_fix_purchase_tickets_alignment.sql):6 y :220 intenta alinear a `PENDING_VALIDATION` y `APPROVED`, pero sigue leyendo `PAID`.
  - [src/pages/nexo_av/desktop/pages/ExpensesPage.tsx](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/ExpensesPage.tsx):671,860,866 usa `REGISTERED`, `PARTIAL`, `PAID`, `CONFIRMED`.
  - [src/pages/nexo_av/desktop/pages/ExpenseDetailPage.tsx](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/ExpenseDetailPage.tsx):562,566,573-580 usa `PENDING`, `REGISTERED`, `PAID`, `DRAFT`.
  - [src/pages/nexo_av/mobile/pages/MobilePurchaseInvoicesPage.tsx](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/mobile/pages/MobilePurchaseInvoicesPage.tsx):64-66 calcula KPIs con `PENDING`, `CONFIRMED`, `PAID`.
- Causa probable: migracion de tickets/facturas de compra incompleta y compatibilidad legacy mantenida en demasiados puntos de UI.
- Impacto:
  - KPIs de pagos a proveedores pueden estar mal clasificados.
  - Riesgo alto de permitir acciones segun estados que ya no existen en contrato.
  - Inconsistencia entre desktop, mobile y detalle de gasto.
- Fix propuesto:
  - Congelar modelo de compra en `PENDING_VALIDATION|APPROVED|CANCELLED` + `payment_status`.
  - Centralizar el mapping legacy en una sola capa de compatibilidad.
  - Reescribir filtros y badges de compras para consumir solo helpers de `purchaseInvoiceStatuses.ts`.
- Verificacion:
  - Tests UI con dataset mixto legacy/actual.
  - RPC `list_purchase_invoices` debe devolver campos separados o derivados consistentes.

### ACC-003
- Severidad: P1
- Dominio: cierres/control interno
- Sintoma: el cierre mensual existe, pero su enforcement fue inicialmente solo advertencia y sigue siendo parcial segun el tipo de movimiento.
- Evidencia:
  - [supabase/migrations/20260129100000_period_closures_and_rpcs.sql](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260129100000_period_closures_and_rpcs.sql):271-292 documenta `assert_period_not_closed` como "fase 1: warn", sin bloqueo efectivo.
  - [supabase/migrations/20260203180500_accounting_audit_hardening.sql](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260203180500_accounting_audit_hardening.sql):49-73 endurece solo `accounting.journal_entries`.
  - [supabase/migrations/20260206110000_open_period_and_auto_close_on_tenth.sql](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260206110000_open_period_and_auto_close_on_tenth.sql):13-47 permite reabrir periodo con `is_locked = false`.
- Causa probable: despliegue por fases del cierre mensual, empezando por reporting y diario antes de cubrir documentos fuente.
- Impacto:
  - Posible alta/modificacion de documentos fuente en periodos reabiertos o cerrados sin control uniforme.
  - Riesgo de PyG e IVA desalineados si documentos y asientos no comparten el mismo enforcement temporal.
- Evidencia en datos reales:
  - Enero 2026 consta como cerrado.
  - Se detectan 52 asientos de enero con `is_locked = false`.
  - Se detectan 24 asientos con `entry_date` de enero y `created_at` posterior al cierre del 2026-01-29.
- Fix propuesto:
  - Aplicar `raise_if_period_closed_for_date` a ventas, compras, pagos, nominas y regularizaciones, no solo a diario.
  - Añadir matriz de enforcement por tabla/RPC.
  - Auditar reaperturas con motivo y usuario.
- Verificacion:
  - Intentos de insertar/editar ventas, compras y pagos en periodo cerrado deben fallar de forma consistente.

### ACC-004
- Severidad: P1
- Dominio: frontend/reporting
- Sintoma: desktop y mobile usan reglas distintas para clasificar facturas y compras, introduciendo KPI y acciones inconsistentes.
- Evidencia:
  - [src/pages/nexo_av/mobile/pages/MobileInvoicesPage.tsx](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/mobile/pages/MobileInvoicesPage.tsx):80-81 cuenta `SENT` como emitida, aunque el contrato de factura usa `ISSUED`.
  - [src/pages/nexo_av/desktop/components/invoices/InvoicePaymentsSection.tsx](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/components/invoices/InvoicePaymentsSection.tsx):166-167 permite pagos sobre `ISSUED`, `PARTIAL`, `OVERDUE`, reforzando estados mixtos.
  - [src/pages/nexo_av/desktop/pages/SuppliersPage.tsx](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/SuppliersPage.tsx):190,227 usa `CONFIRMED`, `REGISTERED`, `PARTIAL`.
  - [src/pages/nexo_av/desktop/pages/TechniciansPage.tsx](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/TechniciansPage.tsx):302 usa `APPROVED`, `PAID`, `REGISTERED`.
- Causa probable: cada pantalla ha resuelto compatibilidad legacy localmente en vez de depender de una API de dominio comun.
- Impacto:
  - Diferencias de KPI entre pantallas.
  - Acciones habilitadas o bloqueadas incorrectamente.
  - Coste alto de mantenimiento y regresiones.
- Fix propuesto:
  - Sustituir comparaciones directas de `status` por selectores/helper unificados.
  - Exponer desde RPC campos derivados oficiales: `doc_status`, `payment_status`, `is_overdue`, `can_register_payment`, `is_editable`.
- Verificacion:
  - Tests de snapshot y smoke sobre desktop/mobile para el mismo dataset.

### ACC-005
- Severidad: P2
- Dominio: seguridad/rpc
- Sintoma: existe gran volumen de funciones `SECURITY DEFINER`; solo una parte fija explícitamente `search_path`.
- Evidencia:
  - `rg` sobre `supabase/migrations` devuelve un volumen muy alto de `SECURITY DEFINER`.
  - Hay funciones endurecidas con `SET search_path`, por ejemplo en [supabase/migrations/20260107163015_0a45b8b3-9ec4-4cb5-a010-25e621356596.sql](/C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260107163015_0a45b8b3-9ec4-4cb5-a010-25e621356596.sql), pero muchas otras no muestran ese endurecimiento en la propia definicion.
- Causa probable: endurecimiento progresivo no homogeneo.
- Impacto:
  - Riesgo de seguridad y comportamiento ambiguo en resolucion de objetos.
  - Dificulta certificar la superficie RLS/RPC del modulo financiero.
- Fix propuesto:
  - Inventariar todas las funciones `SECURITY DEFINER` financieras y exigir `SET search_path` minimo y llamadas completamente calificadas.
  - Prioridad inicial: wrappers `public.*` de accounting, billing y purchasing.
- Verificacion:
  - Script de auditoria SQL que liste funciones `SECURITY DEFINER` sin `proconfig` de `search_path`.

### ACC-006
- Severidad: P1
- Dominio: fiscal/impuesto_sociedades
- Sintoma: el resumen fiscal calcula cuota de impuesto sobre sociedades para el periodo pero no existe asiento de provision asociado.
- Evidencia:
  - `get_corporate_tax_summary(2026-01-01, 2026-02-28)` devuelve:
    - `profit_before_tax = 2.316,50`
    - `tax_amount = 579,125`
    - `provision_entry_id = null`
    - `provision_entry_number = null`
- Causa probable: el calculo existe, pero la provision no se ha contabilizado automaticamente o no se ha ejecutado el flujo de provision.
- Impacto:
  - PyG y balance pueden no reflejar el impuesto devengado del periodo.
  - El resultado neto queda sobreestimado si se presenta sin provision.
- Fix propuesto:
  - Decidir si el periodo enero-febrero debe llevar provision mensual/acumulada.
  - Generar asiento de provision idempotente y trazarlo en `accounting.journal_entries`.
- Verificacion:
  - El resumen fiscal debe devolver `provision_entry_id` y el asiento debe cuadrar contra cuenta 630/4752 o equivalente definido por el plan de cuentas.

### ACC-007
- Severidad: P1
- Dominio: compras/calidad_dato
- Sintoma: existen documentos de compra/ticket en `PENDING_VALIDATION` con importe total cero y mismo fichero origen.
- Evidencia:
  - 4 documentos `PENDING_VALIDATION` con `total = 0` en 2026-02-25.
  - Muestran mismo `file_path`: `e17f86f2-bbba-4a54-a19d-b06a8298c78e/scanner/scan_1772003210702.pdf`.
- Causa probable: duplicacion del flujo OCR/escaneo o guardado repetido sin consolidacion.
- Impacto:
  - Ruido operativo.
  - Riesgo de duplicado posterior si se completan manualmente varias copias.
  - Distorsion de pendientes de validacion.
- Fix propuesto:
  - Añadir deduplicacion por `file_path` o hash del documento.
  - Impedir persistir tickets/facturas pendientes con total cero salvo estado explicitamente temporal de OCR.
- Verificacion:
  - El scanner no debe generar multiples borradores del mismo fichero.

### ACC-008
- Severidad: P1
- Dominio: circulante/cobros
- Sintoma: el saldo vivo de ventas a cierre de febrero es alto y ya existe al menos una factura vencida y parcialmente cobrada.
- Evidencia:
  - Pendiente total de cobro al 2026-02-28: 12.421,97 EUR
  - Factura vencida detectada a 2026-03-01:
    - `F-26-000002`
    - cliente `CANON BCN 22`
    - emitida 2026-01-08
    - vencimiento 2026-02-07
    - cobrado 2.962,56 EUR
    - pendiente 2.962,56 EUR
- Causa probable: gestion de cobro parcialmente completada sin cierre de saldo.
- Impacto:
  - Riesgo de tesoreria y seguimiento comercial.
  - La UI puede ocultar severidad real si depende solo de `status` mixto.
- Fix propuesto:
  - Dashboard de aging por vencimiento real.
  - Alertas de recobro y bloqueo de cierre comercial sin seguimiento.
- Verificacion:
  - Listado de aging debe cuadrar con `pending_amount` y `due_date`.

## Hallazgos adicionales

- El directorio `audits/accounting/` no existia y no habia evidencia previa de informe formal de auditoria en repo.
- La URL SQL de `.env` depende de conectividad IPv6 y no es operativa desde este entorno; bloquea auditoria de datos reales.
- Aunque enero esta cerrado, los datos reales muestran movimiento posterior sobre asientos fechados en enero. Esto requiere revisar si hubo reapertura formal o si el enforcement no cubrio todo el flujo.

## Plan de implementacion

1. Migracion de dominio para ventas:
   - anadir `doc_status`, `payment_status` e `is_overdue`
   - deprecar `status`
   - actualizar triggers y RPCs
2. Migracion de dominio para compras:
   - unificar `PENDING_VALIDATION|APPROVED|CANCELLED`
   - derivar `payment_status`
   - limpiar estados legacy en UI y reports
3. Endurecimiento de cierres:
   - enforcement en documentos fuente y pagos
   - logging de reaperturas de periodo
4. Hardening RPC:
   - inventario `SECURITY DEFINER`
   - fijar `search_path`
5. Capa de datos reales:
   - desbloquear MCP con `SUPABASE_ACCESS_TOKEN`
   - ejecutar consultas del periodo 2026-01-01 a 2026-02-28

## Verificacion pendiente para completar auditoria de empresa

Consultas pendientes sobre datos reales:
- desglose de lineas y categorias por cliente/proveedor y proyecto
- validacion de asientos huerfanos y lineas de asiento por documento
- conciliacion bancaria detallada por cuenta y movimiento
- trazabilidad de reaperturas de periodo y usuarios
- RLS efectiva sobre tablas financieras en ejecucion

## Checklist final

- [x] Contrato contable revisado
- [x] Drift docs vs DB detectado
- [x] Drift docs vs frontend detectado
- [x] Cierres de periodo revisados
- [x] Hallazgos priorizados con evidencia
- [x] Informe creado en `audits/accounting/`
- [x] Lista de findings creada
- [x] Datos reales auditados del periodo 2026-01-01 a 2026-02-28
- [ ] RLS y RPC validados en ejecucion con acceso real
