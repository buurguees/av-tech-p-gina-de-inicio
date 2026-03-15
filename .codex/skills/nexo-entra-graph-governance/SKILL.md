---
name: nexo-entra-graph-governance
description: Gobierna permisos, IDs, secretos y configuracion de Microsoft Entra y Graph usados por NEXO AV. Use when implementing or reviewing Graph app registrations, mailbox/calendar IDs, SharePoint drive/site IDs, environment variables, permission scope design or Microsoft 365 integration hardening.
---

# NEXO Entra Graph Governance

## Guia para agentes

| | |
|---|---|
| **Cuando cargar** | Alta o revision de permisos Graph, `calendarId`, `siteId`, `driveId`, variables de entorno, governance de app registrations o consentimiento en Microsoft. |
| **Cuando NO cargar** | Logica funcional del scanner, UX de planning, reglas fiscales puras. |
| **Integracion .codex** | Toda decision estable de permisos e identificadores debe quedar reflejada en `.codex/avances.md` o en docs del repo. |

## Objetivo

Reducir drift y dependencias fragiles en las integraciones Microsoft 365 de NEXO AV mediante configuracion explicita, privilegio minimo y trazabilidad de IDs.

## Fuente de verdad

- `docs/sharepoint/M365_CALENDARS_NEXO_AV.md`
- `supabase/functions/sharepoint-storage/index.ts`
- `references/permissions-and-config.md`

## Workflow recomendado

1. Leer el contrato de permisos e IDs en `references/permissions-and-config.md`.
2. Comprobar si la integracion puede resolverse con IDs persistidos ya validados.
3. Pedir solo los scopes Graph estrictamente necesarios.
4. Separar configuracion por dominio: calendarios, SharePoint documental, reporting, notificaciones.
5. Documentar cualquier nuevo ID estable o requisito de consentimiento.

## Guardrails

- No depender de `GET /users` o `GET /groups` para runtime si ya hay mailbox/IDs fijos.
- No mezclar secretos con documentacion funcional ni commitear valores sensibles.
- No sobredimensionar permisos cuando basta con `Sites.Selected`, `Calendars.ReadWrite` u otros scopes concretos.
- No dejar nombres de variables ambiguos o duplicados sin documentar fallback.

## Salida esperada del agente

- Matriz de permisos requerida.
- IDs y variables de entorno implicadas.
- Riesgos de seguridad o discovery.
- Pasos concretos de validacion y documentacion.
