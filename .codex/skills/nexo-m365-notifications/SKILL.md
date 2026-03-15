---
name: nexo-m365-notifications
description: Orquesta notificaciones de NEXO AV hacia Microsoft 365 manteniendo trazabilidad en el ERP. Use when implementing or reviewing Outlook, Teams or Power Automate notifications for planning, assignments, visits, ready-to-invoice states, incidents or approval requests that must stay linked to ERP tasks and notifications.
---

# NEXO M365 Notifications

## Guia para agentes

| | |
|---|---|
| **Cuando cargar** | Alertas operativas por correo/Teams, integracion con `notifications_*`, deep links a NEXO, fan-out de eventos ERP a M365. |
| **Cuando NO cargar** | Sync de calendario, OCR, archivado documental puro. |
| **Integracion .codex** | Registrar decisiones de canal, payload o gobernanza cuando se estabilicen. |

## Objetivo

Usar Microsoft 365 como transporte de notificaciones, no como fuente de verdad del estado operativo.

## Fuente de verdad

- `src/pages/nexo_av/desktop/pages/TasksPage.tsx`
- `src/pages/nexo_av/desktop/components/dashboard/widgets/NotificationsWidget.tsx`
- `references/notification-matrix.md`

## Workflow recomendado

1. Crear primero la notificacion o tarea en ERP.
2. Construir deep link estable a NEXO.
3. Enviar por Outlook, Teams o Power Automate segun criticidad y audiencia.
4. Registrar resultado de envio y reintento fuera del frontend.

## Guardrails

- No usar Teams, Planner o mail como unica pista de auditoria.
- No enviar cambios criticos sin `document_id`, `task_id` o `notification_id`.
- No depender de un mensaje externo para cambiar estado en ERP.

## Salida esperada del agente

- Trigger de negocio.
- Canal recomendado.
- Payload minimo y deep link.
- Estrategia de reintento y auditoria.
