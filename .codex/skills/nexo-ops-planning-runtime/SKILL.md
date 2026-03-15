---
name: nexo-ops-planning-runtime
description: Define y protege el runtime operativo de planificacion de NEXO AV para sitios, asignaciones, visitas y paso a facturacion. Use when implementing or reviewing `ProjectPlanningTab`, site status transitions, assignments, visits, locks after invoicing, or the bridge between planning and billing.
---

# NEXO Ops Planning Runtime

## Guia para agentes

| | |
|---|---|
| **Cuando cargar** | Cambios en planificacion de sites, asignacion de tecnicos, visitas, estados operativos, bloqueo por facturacion o runtime que reciba datos desde calendario. |
| **Cuando NO cargar** | Integracion documental SharePoint, OCR de compras, reporting ejecutivo. |
| **Integracion .codex** | Si se toca la maquina de estados operativa, registrar el avance o correccion correspondiente. |

## Objetivo

Mantener un runtime operativo consistente desde `PLANNED` hasta `INVOICED/CLOSED`, sin atajos que rompan la trazabilidad del site.

## Fuente de verdad

- `src/pages/nexo_av/desktop/components/projects/ProjectPlanningTab.tsx`
- `src/pages/nexo_av/desktop/pages/CalendarPage.tsx`
- `references/planning-state-machine.md`

## Workflow recomendado

1. Leer `references/planning-state-machine.md`.
2. Mantener la transicion: `PLANNED -> SCHEDULED -> IN_PROGRESS -> READY_TO_INVOICE -> INVOICED/CLOSED`.
3. Centralizar cambios criticos en backend/RPC y reflejarlos en UI.
4. Si llega automatizacion desde M365, integrarla sobre este runtime y no al reves.

## Guardrails

- `INVOICED` y `CLOSED` son estados bloqueados.
- No saltar directamente de planning a facturacion emitida.
- No registrar visitas o asignaciones fuera del site correcto.
- No mezclar tarea pendiente con hecho operativo confirmado.

## Salida esperada del agente

- Estado actual y transicion valida.
- RPC/UI afectadas.
- Riesgo de bloqueo o inconsistencia.
- Plan de prueba funcional.
