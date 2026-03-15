# Notification matrix

## Prioridad de canal

- `ERP notification/task`: siempre primero
- `Outlook mail`: personas concretas, contexto largo o aprobaciones
- `Teams/Power Automate`: alertas cortas, operativa diaria, canales compartidos

## Casos recomendados

- Site reasignado o replanificado
- Tecnico asignado o visita abierta/cerrada
- Site `READY_TO_INVOICE`
- Error de archivado SharePoint o sync calendario
- Recordatorio de cierre o documentacion pendiente

## Payload minimo

- `entity_type`
- `entity_id`
- `title`
- `summary`
- `actor`
- `deep_link`
- `sent_at`

## No usar para

- Sustituir tareas del ERP
- Confirmar pagos, emision de factura o cierres contables sin traza interna
- Mantener estado solo en Teams, Planner o correo
