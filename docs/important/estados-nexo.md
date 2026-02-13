# Estados del Sistema — Nexo AV

> Documento de referencia para todos los estados y categorías utilizados en la aplicación.  
> Última actualización: 2026-02-13

---

## Principios fundamentales

El sistema separa estrictamente tres conceptos independientes:

1. **Estado del documento** (`doc_status`) — Fase administrativa/contable del documento.
2. **Estado del pago** (`payment_status`) — Grado de liquidación económica. **Siempre calculado**, nunca editable manualmente.
3. **Categoría contable** (`expense_category`) — Naturaleza del gasto. Solo aplica a compras y tickets.

### Reglas de consistencia obligatorias

- `payment_status` se calcula automáticamente a partir de los pagos registrados.
- `is_overdue` se calcula automáticamente (no es un estado almacenado).
- No se permite cambiar categoría tras aprobación sin recalcular asiento.
- No se permite modificar documentos de periodos cerrados.
- El sistema debe evitar incoherencias entre importe total y estado de pago.

---

## 1. Estados de Proyecto

Los proyectos siguen un flujo lineal desde la negociación hasta el cierre o cancelación.

| Valor DB | Etiqueta | Clase CSS | Color Mapa | Descripción |
|---|---|---|---|---|
| `NEGOTIATION` | Negociación | `status-info` | `#2563eb` | El proyecto se está presupuestando y presentando documentos al cliente. Aún no hay aceptación. |
| `IN_PROGRESS` | En Progreso | `status-progress` | `#eab308` | El cliente ha aceptado y el proyecto está en ejecución. |
| `PAUSED` | Pausado | `status-warning` | `#eab308` | El proyecto se ha detenido temporalmente por decisión del cliente o interna. |
| `COMPLETED` | Completado | `status-special` | `#7c3aed` | El trabajo del proyecto ha finalizado. Pendiente de facturar. |
| `INVOICED` | Facturado | `status-invoiced` | `#16a34a` | Se ha emitido la factura asociada al proyecto. |
| `CLOSED` | Cerrado | `status-closed` | `#64748b` | El proyecto está totalmente cerrado (cobrado y sin acciones pendientes). |
| `CANCELLED` | Cancelado | `status-error` | `#dc2626` | El proyecto se ha cancelado y no se ejecutará. |

### Flujo típico

```
NEGOTIATION → IN_PROGRESS → COMPLETED → INVOICED → CLOSED
                 ↓                                     
               PAUSED (temporal)                      
                 ↓
            CANCELLED (en cualquier punto antes de CLOSED)
```

### Transiciones automáticas

- Cuando se emite un presupuesto aceptado → el proyecto puede pasar a `IN_PROGRESS`.
- Cuando se emite una factura vinculada → el proyecto pasa a `INVOICED`.
- Cuando la factura se cobra completamente → el proyecto pasa a `CLOSED`.

---

## 2. Estados de Cliente (Lead Stage)

Los clientes tienen 4 estados simples que reflejan su relación comercial.

| Valor DB | Etiqueta | Color | Descripción |
|---|---|---|---|
| `NEGOTIATION` | En Negociación | `bg-orange-500/20 text-orange-400` | Cliente potencial (lead) que ha solicitado presupuestos. Es la fase de captación y propuesta comercial. |
| `WON` | Ganado | `bg-green-500/20 text-green-400` | Cliente potencial que ha aceptado una propuesta. Se ha ganado el cliente. |
| `LOST` | Perdido | `bg-red-500/20 text-red-400` | Cliente potencial que no ha aceptado ninguna propuesta. Se ha perdido la oportunidad. |
| `RECURRING` | Recurrente | `bg-emerald-500/20 text-emerald-400` | Cliente habitual con el que se realizan múltiples proyectos de instalación de forma continuada. |

### Flujo típico

```
NEGOTIATION → WON → RECURRING (si repite proyectos)
     ↓
    LOST
```

---

## 3. Estados de Presupuesto

| Valor DB | Etiqueta | Clase CSS | Descripción |
|---|---|---|---|
| `DRAFT` | Borrador | `status-neutral` | Presupuesto en edición, no enviado al cliente. |
| `SENT` | Enviado | `status-info` | Enviado al cliente, pendiente de respuesta. |
| `APPROVED` | Aprobado | `status-success` | El cliente ha aceptado el presupuesto. |
| `REJECTED` | Rechazado | `status-error` | El cliente ha rechazado el presupuesto. |
| `EXPIRED` | Expirado | `status-warning` | Se ha superado la fecha de validez sin respuesta. |
| `INVOICED` | Facturado | `status-invoiced` | Se ha generado una factura a partir de este presupuesto. |

### Flujo típico

```
DRAFT → SENT → APPROVED → INVOICED
                  ↓
              REJECTED
                  ↓
              EXPIRED (automático por fecha)
```

### Notas

- Al aprobar un presupuesto, el proyecto asociado puede pasar a `IN_PROGRESS`.
- Al facturar un presupuesto, se genera una factura de venta con las mismas líneas.
- Los presupuestos `APPROVED` e `INVOICED` quedan bloqueados (inmutables).

---

## 4. Facturas de Venta

### 4.1 Estado del documento (`doc_status`)

| Valor DB | Etiqueta | Clase CSS | Descripción |
|---|---|---|---|
| `DRAFT` | Borrador | `status-neutral` | Número preliminar, editable. Proforma o previsión. |
| `ISSUED` | Emitida | `status-info` | Número definitivo asignado. Documento bloqueado y asiento contable generado. |
| `CANCELLED` | Anulada | `status-error` | Factura anulada. Se conserva para auditoría. |

⚠️ **"Cobrada" y "Vencida" NO son estados de documento.** Son condiciones calculadas.

### 4.2 Estado del pago (`payment_status`) — Solo si `ISSUED`

| Valor | Etiqueta | Clase CSS | Descripción |
|---|---|---|---|
| `PENDING` | Pendiente | `status-warning` | Sin cobros registrados. |
| `PARTIAL` | Parcial | `status-warning` | Cobro incompleto. |
| `PAID` | Cobrada | `status-success` | 100% cobrado. |

⚠️ Este estado se calcula automáticamente. **No es editable manualmente.**

### 4.3 Condición "Vencida" (`is_overdue`) — Campo derivado

Una factura está vencida cuando se cumplen **todas** estas condiciones:
- `doc_status = ISSUED`
- `payment_status ≠ PAID`
- `due_date < fecha actual`

**No se almacena como estado.** Se calcula en cada renderizado.

### Flujo típico

```
Documento:  DRAFT → ISSUED → (CANCELLED si error)
Pago:       PENDING → PARTIAL → PAID
Vencida:    is_overdue = true (automático por fecha)
```

### Notas

- Solo las facturas en estado `DRAFT` son editables.
- A partir de `ISSUED`, todos los campos financieros quedan **permanentemente inmutables**.
- Las facturas de venta **NO tienen categoría contable**.

---

## 5. Facturas de Compra

### 5.1 Estado del documento (`doc_status`)

| Valor DB | Etiqueta | Clase CSS | Descripción |
|---|---|---|---|
| `PENDING_VALIDATION` | Pendiente | `purchase-doc-pending` | Documento creado con líneas y escaneo, pendiente de aprobación. |
| `APPROVED` | Aprobada | `purchase-doc-approved` | Validada, contabilizada y bloqueada. |
| `CANCELLED` | Anulada | `status-error` | Factura anulada. |

⚠️ **"Pagada" y "Vencida" NO son estados de documento.**

### 5.2 Estado del pago (`payment_status`) — Solo si `APPROVED`

| Valor | Etiqueta | Clase CSS | Descripción |
|---|---|---|---|
| `PENDING` | Pendiente | `purchase-pay-pending` | Sin pagos registrados. |
| `PARTIAL` | Parcial | `purchase-pay-partial` | Pago incompleto (fraccionado, crédito externo, etc.). |
| `PAID` | Pagado | `purchase-pay-paid` | 100% pagado. |

⚠️ Este estado se calcula automáticamente.

### 5.3 Condición "Vencida" (`is_overdue`) — Campo derivado

Una factura de compra está vencida cuando:
- `doc_status = APPROVED`
- `payment_status ≠ PAID`
- `due_date < fecha actual`

### Flujo típico

```
Documento:  PENDING_VALIDATION → APPROVED → (CANCELLED si error)
Pago:       PENDING → PARTIAL → PAID
Vencida:    is_overdue = true (automático por fecha)
```

### Notas

- Solo las facturas con estado `PENDING_VALIDATION` son editables.
- A partir de `APPROVED`, todos los campos financieros quedan **permanentemente inmutables**.
- Las facturas de compra **requieren categoría contable obligatoria**.
- El estado `PARTIAL` contempla pagos fraccionados y operaciones de crédito externo (Aplazame).

---

## 6. Categorías Contables

Las categorías determinan la cuenta contable asociada al gasto. **Solo aplican a compras y tickets.**

### 6.1 Categorías de Facturas de Compra

| Valor | Etiqueta | Cuenta Contable | Descripción |
|---|---|---|---|
| `EXTERNAL_SERVICES` | Servicios Externos | `623000` | Gestoría, abogados, notaría, etc. |
| `LABOR` | Mano de Obra | `600` | Solo técnicos / subcontratación. |
| `MATERIAL` | Material | `629.3` | Material de instalación o consumo. |
| `SOFTWARE` | Software | `629` | Licencias y herramientas digitales. |
| `UTILITIES` | Suministros | `628` | Luz, agua, gas, internet. |
| `RENT` | Alquiler | `621` | Alquiler de local, vehículo, etc. |

Cuenta por defecto (sin mapeo): `623000`

### 6.2 Categorías de Tickets (Gastos Rápidos)

| Valor | Etiqueta | Icono | Cuenta Contable |
|---|---|---|---|
| `DIET` | Dietas | 🍽️ | `629.1` |
| `FUEL` | Gasolina | ⛽ | `629.2` |
| `MATERIAL` | Material | 🔧 | `629.3` |
| `PARKING` | Parking | 🅿️ | `629.5` |
| `TRANSPORT` | Transporte | 🚌 | `629.6` |
| `ACCOMMODATION` | Alojamiento | 🏨 | `629.7` |
| `FINE` | Multa | 📄 | `629.8` |
| `OTHER` | Otros | 📋 | `629.9` |

Cuenta por defecto: `629`

### 6.3 Reglas de categorías

- La categoría `MATERIAL` en facturas de compra y en tickets usa la **misma cuenta contable** (`629.3`).
- No se permite asignar cuentas manualmente si existe una categoría.
- El asiento contable de una factura de compra usa la cuenta asociada a su categoría.
- No se permite cambiar categoría tras aprobación sin recalcular asiento.

### 6.4 Objetivo del sistema de categorías

Las categorías permiten:
- Filtrar gastos por tipo.
- Obtener el total gastado por categoría.
- Calcular el porcentaje de gasto por sección.
- Generar informes mensuales y trimestrales.
- Analizar en qué se está gastando el dinero.
- Comparar periodos (ej. Material vs Software).
- Unificar analítica entre facturas de compra y tickets.

---

## 7. Estados de Proveedores

| Valor DB | Etiqueta | Descripción |
|---|---|---|
| `ACTIVE` | Activo | Proveedor operativo, puede recibir facturas y pedidos. |
| `INACTIVE` | Inactivo | Proveedor sin actividad, no aparece en selectores. |
| `BLOCKED` | Bloqueado | Proveedor con incidencias, no se puede operar. |

---

## Referencia técnica

- **Constantes de proyecto**: `src/constants/projectStatuses.ts`
- **Constantes de cliente**: `src/pages/nexo_av/desktop/constants/leadStages.ts`
- **Constantes de presupuesto**: `src/constants/quoteStatuses.ts`
- **Constantes factura venta**: `src/constants/financeStatuses.ts` / `src/constants/salesInvoiceStatuses.ts`
- **Constantes factura compra**: `src/constants/purchaseInvoiceStatuses.ts`
- **Categorías factura compra**: `src/constants/purchaseInvoiceCategories.ts`
- **Categorías tickets**: `src/constants/ticketCategories.ts`
- **Reglas de inmutabilidad**: `src/constants/documentImmutabilityRules.ts`
- **Enum DB proyecto**: `projects.project_status`
- **Enum DB cliente**: `crm.lead_stage`
- **Enum DB presupuesto**: `quotes.quote_status`
