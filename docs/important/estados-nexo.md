# Estados del Sistema — Nexo AV

> Documento de referencia para todos los estados utilizados en la aplicación.  
> Última actualización: 2026-02-13

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

### Notas

- **En Negociación** es el estado por defecto al crear un nuevo cliente.
- Los clientes con estado `LOST` no aparecen en los selectores de creación de proyectos ni presupuestos.
- Los clientes `RECURRING` son los de mayor valor: generan proyectos de forma recurrente.

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

## 4. Estados de Factura de Venta

Sistema de estado único que combina el estado documental y de cobro.

| Valor DB | Etiqueta | Clase CSS | Descripción |
|---|---|---|---|
| `DRAFT` | Borrador | `status-neutral` | Número preliminar, editable. Proforma o previsión. |
| `ISSUED` | Emitida | `status-info` | Número definitivo asignado. Documento bloqueado y enviado al cliente. |
| `PARTIAL` | Cobro Parcial | `status-warning` | Se han recibido pagos parciales. |
| `PAID` | Cobrada | `status-success` | 100% del importe cobrado. |
| `OVERDUE` | Vencida | `status-error` | Fecha de vencimiento superada sin cobro completo. |
| `CANCELLED` | Cancelada | `status-error` | Factura anulada. Se conserva para auditoría. |

### Flujo típico

```
DRAFT → ISSUED → PARTIAL → PAID
                    ↓
                 OVERDUE (automático por fecha)
                    ↓
                CANCELLED (en cualquier punto antes de PAID)
```

### Notas

- Solo las facturas en estado `DRAFT` son editables.
- A partir de `ISSUED`, todos los campos financieros quedan **permanentemente inmutables**.
- El estado `OVERDUE` se calcula automáticamente comparando la fecha de vencimiento.

---

## 5. Estados de Factura de Compra

Sistema dual: estado documental (administrativo) + estado de pago (financiero).

### 5.1 Estado Documental

| Valor DB | Etiqueta | Clase CSS | Descripción |
|---|---|---|---|
| `SCANNED` | Escaneado | `purchase-doc-scanned` | PDF subido pero no asignado a factura aún. |
| `DRAFT` | Borrador | `purchase-doc-draft` | Previsión o pedido de compra manual. Puede no tener PDF. |
| `PENDING_VALIDATION` | Pendiente | `purchase-doc-pending` | Tiene proveedor, líneas y PDF pero no está aprobada. |
| `APPROVED` | Aprobada | `purchase-doc-approved` | Validada y lista para procesamiento de pagos. |
| `BLOCKED` | Bloqueada | `purchase-doc-blocked` | Error o disputa. No se procesa. |

### 5.2 Estado de Pago (solo cuando documento = `APPROVED`)

| Valor DB | Etiqueta | Clase CSS | Descripción |
|---|---|---|---|
| `PENDING` | Pendiente | `purchase-pay-pending` | 0 € pagado, dentro de plazo. |
| `OVERDUE` | Vencido | `purchase-pay-overdue` | 0 € pagado, fuera de plazo de vencimiento. |
| `PARTIAL` | Parcial | `purchase-pay-partial` | Pago incompleto. Se ha abonado parte del importe (pagos fraccionados, créditos, etc.). |
| `PAID` | Pagado | `purchase-pay-paid` | 100% del importe pagado. |

### Flujo típico

```
Documental:  SCANNED → DRAFT → PENDING_VALIDATION → APPROVED
                                                        ↓
                                                     BLOCKED (error)

Pago (solo si APPROVED):  PENDING → PARTIAL → PAID
                             ↓
                          OVERDUE (automático por fecha)
```

### Notas

- **Regla fundamental**: Estado de documento ≠ Estado de pago. Una factura puede ser `APPROVED + PENDING`, `APPROVED + PARTIAL`, `APPROVED + PAID`.
- Solo las facturas con estado documental `SCANNED`, `DRAFT` o `PENDING_VALIDATION` son editables.
- A partir de `APPROVED`, todos los campos financieros quedan **permanentemente inmutables**.
- El estado `PARTIAL` contempla pagos fraccionados y operaciones de crédito externo.

---

## Referencia técnica

- **Constantes de proyecto**: `src/constants/projectStatuses.ts`
- **Constantes de cliente**: `src/pages/nexo_av/desktop/constants/leadStages.ts`
- **Constantes de presupuesto**: `src/constants/quoteStatuses.ts`
- **Constantes factura venta**: `src/constants/financeStatuses.ts` / `src/constants/salesInvoiceStatuses.ts`
- **Constantes factura compra**: `src/constants/purchaseInvoiceStatuses.ts`
- **Reglas de inmutabilidad**: `src/constants/documentImmutabilityRules.ts`
- **Enum DB proyecto**: `projects.project_status`
- **Enum DB cliente**: `crm.lead_stage`
- **Enum DB presupuesto**: `quotes.quote_status`
