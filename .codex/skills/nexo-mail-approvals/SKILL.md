---
name: nexo-mail-approvals
description: Disena flujos de aprobacion por correo o Teams que siempre aterrizan en tareas y decisiones trazables dentro de NEXO AV. Use when implementing lightweight approval loops for planning exceptions, invoice-readiness, OCR review, notifications or Microsoft 365 decision workflows tied back to the ERP.
---

# NEXO Mail Approvals

## Guia para agentes

| | |
|---|---|
| **Cuando cargar** | Aprobaciones ligeras por Outlook/Teams, excepciones operativas, revisiones OCR o confirmaciones para pasar un flujo al siguiente estado. |
| **Cuando NO cargar** | Si la accion final exige asiento contable, pago, emision fiscal o cierre sin intervencion del ERP. |
| **Integracion .codex** | Registrar cualquier patron reusable de aprobacion y cualquier riesgo detectado de trazabilidad. |

## Objetivo

Usar canales Microsoft como interfaz de decision rapida, pero almacenar la decision efectiva dentro del ERP mediante tareas, notificaciones o entidades dedicadas.

## Fuente de verdad

- `src/pages/nexo_av/desktop/pages/TasksPage.tsx`
- `references/approval-patterns.md`

## Workflow recomendado

1. Crear o localizar la tarea/notificacion ERP asociada.
2. Generar mensaje Outlook o Teams con contexto corto y deep link a NEXO.
3. Recoger la respuesta del usuario o la accion del workflow.
4. Persistir la decision en ERP con actor, fecha y resultado.
5. Solo entonces avanzar el estado funcional permitido.

## Guardrails

- No aprobar pagos, facturas emitidas o cierres contables solo desde un reply de correo.
- No usar Outlook o Teams como unico log de auditoria.
- No cambiar estados irreversibles sin registro ERP y control de permisos.
- No sustituir `Tasks` o `Notifications` por Planner si el dato operativo ya vive en NEXO.

## Salida esperada del agente

- Caso de aprobacion soportado.
- Punto de persistencia ERP.
- Mensaje/canal recomendado.
- Riesgos o limites del flujo.
