---
name: nexo-m365-calendar-sync
description: Sincroniza calendarios de Microsoft 365 con NEXO AV para operaciones e hitos administrativos. Use when implementing or reviewing Microsoft Graph calendar sync, wiring `CalendarPage`, mapping Outlook events to project sites, assignments, visits or billing milestones, or diagnosing calendar-based workflows for `Instalaciones` and `Facturacion`.
---

# NEXO M365 Calendar Sync

## Guia para agentes

| | |
|---|---|
| **Cuando cargar** | Integracion Graph calendario <-> ERP, sync de `Instalaciones` o `Facturacion`, implementacion backend del modulo `Calendario`, mapeo de eventos a entidades operativas de NEXO. |
| **Cuando NO cargar** | Archivado documental SharePoint puro, notificaciones sin calendario, cambios de UI sin implicacion de sync. |
| **Integracion .codex** | Si se corrige drift de calendario o permisos Graph, registrar en `.codex/errores-soluciones.md`; si se fija un contrato de sync reusable, en `.codex/avances.md`. |

## Objetivo

Implementar la capa de sincronizacion entre calendarios M365 y NEXO AV sin mover la fuente de verdad fuera del ERP.

## Fuente de verdad

- `docs/sharepoint/M365_CALENDARS_NEXO_AV.md`
- `src/pages/nexo_av/desktop/pages/CalendarPage.tsx`
- `src/pages/nexo_av/desktop/components/projects/ProjectPlanningTab.tsx`
- `references/calendar-contract.md`

## Workflow recomendado

1. Leer `references/calendar-contract.md`.
2. Usar siempre mailbox y `calendarId` persistidos; no depender de discovery tenant-wide.
3. Implementar backend-first: Graph -> normalizacion -> resolucion ERP -> escritura por RPC/funcion -> log.
4. Hacer que `CalendarPage` lea el estado ya normalizado del ERP o de un backend dedicado, no Graph directo desde frontend.
5. Limitar v1 a `Instalaciones` y `Facturacion`.

## Guardrails

- No usar `GET /users` o `GET /groups` como dependencia funcional.
- No usar SharePoint lists como sustituto del calendario Outlook si el origen real es M365 Calendar.
- No escribir en Graph desde el cliente web.
- No generar facturas automaticamente desde un evento; como maximo crear tarea o dejar el site `READY_TO_INVOICE`.

## Salida esperada del agente

- Contrato de sync o propuesta de implementacion.
- Riesgos de permisos/config.
- Entidades ERP afectadas.
- Checklist de validacion manual.
