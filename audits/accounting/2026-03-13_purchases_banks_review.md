# Revision de compras, pagos aplazados y cuentas bancarias

Fecha: 2026-03-13

## Resumen ejecutivo

- Las compras no muestran un problema de tension inmediata de tesoreria: hay `2.826,33 EUR` pendientes de pago aprobados y `0 EUR` vencidos.
- No existe ninguna operacion formal en `credit_operations` ni cuotas en `credit_installments`, pero si existe al menos una factura con pago aplazado material (`C-26-000029`) por `1.841,85 EUR` pendiente hasta `2027-02-04`. El aplazamiento esta fuera del modulo formal de cuotas.
- Los saldos bancarios contables no son fiables todavia como conciliacion real:
  - Sabadell teorico: `8.801,20 EUR`; real reportado: `3.477,46 EUR`; delta: `+5.323,74 EUR`
  - CaixaBank teorico: `2.178,23 EUR`; real reportado: `2.121,39 EUR`; delta: `+56,84 EUR`
  - Revolut teorico: `-1.293,38 EUR`; real reportado: `215,74 EUR`; delta: `-1.509,12 EUR`
  - Total teorico: `9.686,05 EUR`; total real reportado: `5.814,59 EUR`; delta global: `+3.871,46 EUR`
- La nota operativa de Revolut ("faltan tickets de marzo por subir hasta el 19") no explica por si sola el descuadre, porque el saldo contable de Revolut ya es negativo antes de incorporar esos tickets.

## Hallazgos priorizados

### P0 - Los saldos bancarios contables no cuadran con la realidad operativa

- Evidencia:
  - `list_bank_accounts_with_balances('2026-03-13')` devuelve:
    - `572001 SABADELL NEGOCIOS = 8.801,20`
    - `572002 CAIXABANK EMPRESES = 2.178,23`
    - `572003 REVOLUT BUSINESS = -1.293,38`
  - Saldos reales facilitados por usuario:
    - Sabadell `3.477,46`
    - CaixaBank `2.121,39`
    - Revolut `215,74`
- Riesgo:
  - Alto. No se puede usar todavia el modulo bancario como fuente fiable de tesoreria real.
- Hipotesis probable:
  - Existen movimientos no conciliados o no registrados, especialmente transferencias internas y/o pagos imputados al banco incorrecto.
  - El balance arrastra una base historica previa a 2026 ya inconsistente.
- Indicadores concretos:
  - A `2025-12-31` el sistema ya arrancaba con saldos anommalos:
    - Sabadell `-1.591,64`
    - CaixaBank `-17,77`
    - Revolut `0,00`
  - CaixaBank esta casi cuadrado; el problema fuerte esta concentrado en Sabadell y Revolut.

### P1 - El aplazamiento de compra existe economicamente, pero no existe en el modulo formal de cuotas

- Evidencia:
  - `get_credit_operations()` devuelve `0` operaciones.
  - `get_credit_installments()` devuelve `0` cuotas.
  - `list_purchase_invoices` contiene la factura `C-26-000029 / C-BORR-26-000029`:
    - proveedor `INTECAT iSTORE S.L`
    - total `3.217,39 EUR`
    - pagado `1.375,54 EUR`
    - pendiente `1.841,85 EUR`
    - estado raw `PARTIAL`
    - vencimiento `2027-02-04`
  - `get_purchase_invoice_payments` para esa factura devuelve solo tres pagos sueltos:
    - `187,77 EUR` el `2026-03-03` por `DIRECT_DEBIT`
    - `187,77 EUR` el `2026-02-03` por `CARD`
    - `1.000,00 EUR` el `2025-12-31` por `OTHER` con referencia `Subvencion Kit Digital`
- Riesgo:
  - Alto. No hay calendario de cuotas, no hay importe por cuota pendiente y el seguimiento de pagos a plazo depende solo de `pending_amount` de la factura.
- Impacto:
  - El dashboard de pagos aplazados hoy puede dar una falsa sensacion de que no existen cuotas pendientes.

### P1 - Drift de estados legacy en compras

- Evidencia:
  - `list_purchase_invoices` devuelve estados raw: `PAID`, `PARTIAL`, `APPROVED`, `PENDING_VALIDATION`, `DRAFT`.
  - Distribucion real al 2026-03-13:
    - `PAID`: 50 docs, `10.557,27 EUR`
    - `PARTIAL`: 1 doc, `3.217,39 EUR`
    - `APPROVED`: 6 docs, `1.067,94 EUR`
    - `PENDING_VALIDATION`: 6 docs, `7,13 EUR`
    - `DRAFT`: 20 docs, `0,00 EUR`
  - En contrato funcional, compras deberian separar `doc_status` y `payment_status`.
- Riesgo:
  - Medio/alto. Los KPIs y listados pueden seguir mezclando documento aprobado con pagado parcial o total.

### P2 - Las compras pendientes aprobadas estan controladas y sin vencidos

- Evidencia:
  - Pasivo aprobado pendiente total: `2.826,33 EUR`
  - Facturas/tickets aprobados con saldo pendiente: `6`
  - Vencidos a `2026-03-13`: `0`
  - Principales pendientes:
    - `C-26-000052 FLOWIT VISUAL, S.L. = 648,08 EUR` vence `2026-03-24`
    - `C-26-000051 FLOWIT VISUAL, S.L. = 207,09 EUR` vence `2026-03-24`
    - `C-26-000053 TECNOSONIDO = 114,53 EUR` vence `2026-03-27`
    - `C-26-000029 INTECAT iSTORE S.L = 1.841,85 EUR` vence `2027-02-04`
- Riesgo:
  - Bajo en tension inmediata; medio en calidad de modelado por el caso aplazado.

## Movimientos bancarios relevantes

### Sabadell

- Movimientos YTD 2026:
  - ingresos registrados: `15.049,91 EUR`
  - salidas registradas: `10.089,92 EUR`
  - neto de movimientos visibles: `+4.959,99 EUR`
- Observaciones:
  - Recibe la mayor parte de los cobros.
  - Tambien soporta la mayoria de pagos de compra.
  - Tiene solo un traspaso registrado de `1.000,00 EUR`.

### CaixaBank

- Movimientos YTD 2026:
  - ingresos registrados: `1.294,59 EUR`
  - salidas registradas: `1.669,46 EUR`
  - neto: `-374,87 EUR`
- Observaciones:
  - Es la cuenta mejor conciliada contra saldo real.
  - El descuadre actual (`56,84 EUR`) es pequeño y compatible con redondeos, un movimiento reciente o un gasto/cobro todavia no revisado.

### Revolut

- Movimientos YTD 2026:
  - entradas registradas: `1.000,00 EUR`
  - salidas registradas: `4.993,38 EUR`
  - neto: `-3.993,38 EUR`
- Observaciones:
  - Se registran cuatro pagos de retribucion de socios por `4.862,34 EUR`.
  - Se registra una compra `Holafly` por `131,04 EUR`.
  - Solo existe un traspaso de entrada por `1.000,00 EUR` desde Sabadell.
  - Si el saldo real es positivo (`215,74 EUR`), faltan entradas a Revolut en contabilidad y/o sobran salidas imputadas.

## Conclusion operativa

- Compras corrientes: razonablemente bajo control en importe y vencimientos.
- Pagos a plazo: no estan modelados de forma fiable en el modulo de cuotas; el caso `C-26-000029` es el principal punto a regularizar.
- Bancos: el estado bancario no es conciliable todavia como dato final. CaixaBank esta casi correcto, pero Sabadell y Revolut requieren una conciliacion manual con extracto.

## Actualizacion operativa ejecutada

- El `2026-03-13` se ha aplicado en vivo la regularizacion versionada `20260313173000_align_bank_balances_to_real_20260313.sql`.
- La regularizacion se ha registrado como asiento `AS-2026-3577` (`f752a23e-f687-4da0-9c16-242dc7151bfd`) con fecha `2026-03-13` y descripcion:
  - `Regularizacion manual de saldos bancarios segun saldos reales facilitados por usuario el 2026-03-13. Revolut queda alineado provisionalmente pendiente de registrar tickets desde 2026-03-04.`
- Saldos verificados tras aplicar el ajuste:
  - Sabadell `3.477,46 EUR`
  - CaixaBank `2.121,39 EUR`
  - Revolut `215,74 EUR`
- La contrapartida se ha llevado a `129000` porque el ajuste es una correccion de saldos y no un flujo operativo ordinario.
- Importante: la RPC `create_bank_balance_adjustment` no era usable en el estado real del sistema porque depende de descripciones legacy `[ID:...]` que ya no existen en `accounting.chart_of_accounts`. Por eso la via segura fue una migracion versionada con asiento `ADJUSTMENT` directamente sobre `572001`, `572002`, `572003` y `129000`.

## Siguiente paso recomendado

1. Conciliar banco a banco desde extracto real:
   - Sabadell desde `2025-12-31`
   - Revolut desde `2026-01-01`
   - CaixaBank validacion rapida de movimientos de marzo
2. Decidir si `C-26-000029` debe convertirse a `credit_operation + credit_installments` o mantenerse como factura parcial sin calendario.
3. Normalizar compras igual que ventas:
   - `doc_status` canonico
   - `payment_status` derivado
   - KPIs separados de listados
