# Estados del Sistema — Proyectos y Clientes

> Documento de referencia para los estados utilizados en la aplicación.  
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

## Referencia técnica

- **Constantes de proyecto**: `src/constants/projectStatuses.ts`
- **Constantes de cliente**: `src/pages/nexo_av/desktop/constants/leadStages.ts`
- **Enum DB proyecto**: `projects.project_status`
- **Enum DB cliente**: `crm.lead_stage`
