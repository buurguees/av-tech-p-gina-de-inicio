# Auditoria tickets de gastos 2026-03-03

## Resumen ejecutivo

Estado: `critico`

El sistema de tickets de gastos no tiene un contrato de estados coherente entre base de datos, RPC y frontend. La evidencia principal es doble:

- El frontend desktop de tickets sigue operando con estados legacy (`PENDING`, `REGISTERED`, `PARTIAL`, `CONFIRMED`) mientras el contrato actual y la base real usan mezcla de `DRAFT`, `PENDING_VALIDATION`, `APPROVED` y `PAID`.
- La base real contiene una bolsa grande de tickets vacios en `DRAFT`, que dominan la lista y refuerzan la sensacion de que "todo esta en borrador".

Consulta real de solo lectura ejecutada via RPC `list_purchase_invoices` el `2026-03-03`:

- Total tickets (`EXPENSE`): `34`
- `DRAFT`: `19`
- `PENDING_VALIDATION`: `7`
- `PAID`: `6`
- `APPROVED`: `2`

De esos `19` en `DRAFT`, la muestra revisada devuelve `total=0`, `pending_amount=0`, `provider_name=null`, `project_name=null`, `is_locked=false`, lo que apunta a borradores tecnicos/incompletos acumulados.

## Hallazgos

### ACC-301 - Desktop tickets muestra estados incorrectos y oculta estados reales

- Severidad: `P0`
- Dominio: `compras-ui`
- Sintoma:
  - El filtro de la pagina de tickets no ofrece `DRAFT` ni `PENDING_VALIDATION`.
  - La tabla etiqueta como `Parcial` cualquier estado que no sea `PENDING`, `REGISTERED` o `PAID`.
  - En la practica, `DRAFT`, `PENDING_VALIDATION` y `APPROVED` quedan mal representados.
- Evidencias:
  - `src/pages/nexo_av/desktop/pages/ExpensesPage.tsx:653`
  - `src/pages/nexo_av/desktop/pages/ExpensesPage.tsx:671`
  - `src/pages/nexo_av/desktop/pages/ExpensesPage.tsx:860`
  - `src/pages/nexo_av/desktop/pages/ExpensesPage.tsx:866`
  - La consulta real devuelve solo `DRAFT`, `PENDING_VALIDATION`, `APPROVED` y `PAID` como estados activos de tickets.
- Causa probable:
  - La migracion funcional a `PENDING_VALIDATION / APPROVED` no se terminó en la UI de tickets desktop.
- Impacto:
  - El usuario interpreta mal el estado administrativo del ticket.
  - La lista induce a pensar que casi todo esta "mal" o "sin sistema".
  - Las acciones visibles en lista no coinciden con el detalle.
- Fix propuesto:
  - Rehacer `ExpensesPage` para usar `getDocumentStatusInfo` y `calculatePaymentStatus` igual que mobile.
  - Separar visualmente `estado documento` de `estado pago`.
  - Sustituir filtros legacy por `all`, `DRAFT`, `PENDING_VALIDATION`, `APPROVED`, `PAID`, `CANCELLED`.

### ACC-302 - El alta de tickets nuevos sigue creando con estado legacy `PENDING`

- Severidad: `P1`
- Dominio: `compras-ui-rpc`
- Sintoma:
  - La subida de un ticket nuevo desde desktop llama a `create_purchase_invoice` con `p_status: 'PENDING'`.
  - El RPC actual ya define por defecto `PENDING_VALIDATION`.
- Evidencias:
  - `src/pages/nexo_av/desktop/pages/ExpensesPage.tsx:182`
  - `src/pages/nexo_av/desktop/pages/ExpensesPage.tsx:216`
  - `supabase/migrations/20260228120000_fix_purchase_tickets_alignment.sql:6`
  - `supabase/migrations/20260302153000_purchase_invoices_site_assignment_parity.sql:6`
- Causa probable:
  - El frontend conserva el flujo legacy de compras/tickets aunque el RPC ya fue alineado.
- Impacto:
  - Se siguen generando estados heredados innecesarios.
  - Se multiplica el drift entre documentos antiguos, nuevos y componentes compartidos.
- Fix propuesto:
  - Dejar de enviar `p_status` en creacion o enviar explicitamente `PENDING_VALIDATION`.
  - Aplicar el mismo cambio en `PurchaseInvoicesPage`.

### ACC-303 - La base real esta llena de borradores vacios que contaminan la operativa

- Severidad: `P1`
- Dominio: `compras-db-workflow`
- Sintoma:
  - Existen `19` tickets `DRAFT` de `34` totales.
  - La muestra revisada de `DRAFT` devuelve importes a cero, sin proveedor, sin proyecto y desbloqueados.
- Evidencias:
  - Consulta real de `list_purchase_invoices(p_document_type='EXPENSE', p_status='DRAFT')` ejecutada el `2026-03-03`.
  - Muestra:
    - `TICKET-BORR-26-000022`
    - `TICKET-BORR-26-000021`
    - `TICKET-BORR-26-000020`
  - Todos con `total=0`, `pending_amount=0`, `provider_name=null`, `project_name=null`, `is_locked=false`.
- Causa probable:
  - El flujo de escaneo/subida crea documentos preliminares demasiado pronto y no hay limpieza ni separacion entre borrador tecnico y ticket pendiente de revision contable.
- Impacto:
  - La lista principal queda dominada por ruido operativo.
  - KPIs y percepcion del modulo quedan distorsionados.
  - Aumenta el riesgo de cierres con tickets incompletos.
- Fix propuesto:
  - Introducir un estado tecnico separado o excluir `DRAFT` vacios de la vista principal por defecto.
  - Añadir job/regla de limpieza para borradores sin lineas, sin beneficiario y sin importes tras X dias.
  - No contar esos borradores en KPIs principales.

### ACC-304 - El comportamiento de pagos es inconsistente entre lista y detalle

- Severidad: `P1`
- Dominio: `compras-ui`
- Sintoma:
  - La lista desktop solo ofrece boton `Pagar` para `CONFIRMED`, `PARTIAL` o `PAID`.
  - El detalle permite abrir la seccion de pagos para mas estados y la logica compartida considera validos `APPROVED`, `REGISTERED`, `PENDING_VALIDATION`, `PENDING` y `DRAFT`, condicionando realmente por numero definitivo.
- Evidencias:
  - `src/pages/nexo_av/desktop/pages/ExpensesPage.tsx:866`
  - `src/pages/nexo_av/desktop/components/purchases/PurchaseInvoicePaymentsSection.tsx:176`
  - `src/pages/nexo_av/desktop/pages/ExpenseDetailPage.tsx:629`
- Causa probable:
  - Hay reglas duplicadas de disponibilidad de pagos en lista y detalle.
- Impacto:
  - Un ticket `APPROVED` puede parecer no pagable desde la lista aunque si lo sea desde el detalle.
  - La UX transmite arbitrariedad.
- Fix propuesto:
  - Centralizar `canRegisterPayment` en helper compartido basado en:
    - estado documental normalizado
    - `hasDefinitiveNumber`
    - `pending_amount`
    - `is_locked`

## Conclusiones

El problema no es solo visual. Hay dos fallos de fondo:

1. El contrato de estados de tickets sigue roto entre capas.
2. El flujo de borradores tecnicos invade la vista operativa principal.

La afirmacion "me aparecen todos como borrador" no es exacta a nivel DB, pero si es comprensible:

- porque `19/34` tickets reales estan en `DRAFT`
- y porque el frontend desktop representa mal `DRAFT`, `PENDING_VALIDATION` y `APPROVED`

## Plan de correccion recomendado

1. Corregir primero `ExpensesPage` para leer y pintar estados normalizados.
2. Corregir la creacion de tickets para no seguir insertando `PENDING`.
3. Definir que hacer con los `DRAFT` vacios ya existentes:
   - ocultarlos por defecto
   - limpiarlos
   - o moverlos a un estado tecnico/OCR
4. Unificar reglas de pagos entre lista y detalle.
5. Repetir la misma limpieza en `PurchaseInvoicesPage` y componentes compartidos, porque comparten el mismo drift.

## Verificacion propuesta

1. Crear un ticket nuevo desde `ExpensesPage` y verificar que nace en `PENDING_VALIDATION`, no en `PENDING`.
2. Confirmar que la lista muestra `Borrador`, `Pendiente de validacion`, `Aprobado` y `Pagado` con etiquetas correctas.
3. Verificar que un ticket `APPROVED` aparece como aprobada y permite flujo de pagos coherente.
4. Verificar que los tickets `DRAFT` vacios no contaminan KPIs ni la vista principal si se decide ocultarlos.

## Addendum de ejecucion (MCP) - 2026-03-03

### Alcance ejecutado

Se ejecuta cierre tecnico de la capa tickets/compras via MCP `user-supabase` (sin `supabase db push`) y ajuste de UX mobile para ocultar borradores tecnicos vacios por defecto.

- Frontend desktop:
  - `src/pages/nexo_av/desktop/pages/PurchaseInvoicesPage.tsx`: alta nueva en `DRAFT` y borrado con estados normalizados.
  - `src/pages/nexo_av/desktop/pages/ExpensesPage.tsx`: flujo alineado a estados normalizados y ocultacion de borradores tecnicos.
- Frontend mobile:
  - `src/pages/nexo_av/mobile/pages/MobileExpensesPage.tsx`: ocultacion por defecto de borradores tecnicos vacios + toggle de visualizacion.
- Base de datos:
  - SQL fuente local: `supabase/migrations/20260303153000_normalize_ticket_management_statuses.sql`.
  - Aplicacion remota realizada via MCP `apply_migration`.

### Evidencia de despliegue remoto (MCP)

- Herramienta: `apply_migration` (servidor MCP `user-supabase`).
- Resultado: `success: true`.
- Registro remoto en `supabase_migrations.schema_migrations`:
  - `version`: `20260303112949`
  - `name`: `normalize_ticket_management_statuses`

Nota: el timestamp de version remoto generado por MCP (`20260303112949`) no coincide con el filename local (`20260303153000_...`). El contenido funcional aplicado corresponde a la normalizacion descrita en esta auditoria.

### Medicion post-migracion (tickets/gastos)

Consulta remota ejecutada por MCP sobre `sales.purchase_invoices` con `document_type IN ('EXPENSE','TICKET')`:

- `APPROVED`: `2`
- `DRAFT`: `19`
- `PENDING_VALIDATION`: `6`
- `PAID`: `7`

Detalle `DRAFT` post-migracion:

- `draft_total`: `19`
- `draft_tecnicos_vacios`: `0`
- `draft_con_contenido`: `19`

### Estado de hallazgos tras cierre

- `ACC-302` (creacion en estado legacy `PENDING`): mitigado en la capa frontend y endurecido en RPC con normalizacion (`PENDING/SCANNED -> DRAFT`, `REGISTERED -> APPROVED`).
- `ACC-303` (bolsa de borradores vacios contaminando operativa): mitigado en UX (desktop + mobile) y normalizacion historica aplicada; no quedan `DRAFT` tecnicos vacios con el criterio auditado.
- `ACC-301` y `ACC-304`: requieren validacion funcional final de negocio en entorno de uso real (etiquetado final de estados y coherencia lista/detalle de pagos).
