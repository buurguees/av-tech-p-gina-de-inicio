# M365 Calendars - NEXO AV

Fecha de validacion: 2026-03-13
Estado: operativo para lectura/escritura sobre calendarios conocidos del buzon fuente
Ambito: integracion Microsoft Graph calendario <-> NEXO AV

## Objetivo

Dejar fijados en repo los calendarios corporativos ya accesibles por Microsoft Graph para que NEXO AV no dependa de redescubrimiento por `users` o `groups`.

## App y permisos validados

- App Azure: `NEXO-Graph-Integration`
- Tipo de token: app-only (`client_credentials`)
- Roles confirmados en token:
  - `Sites.Selected`
  - `Sites.ReadWrite.All`
  - `Calendars.ReadWrite`

## Restriccion importante

Aunque la app ya puede leer calendarios reales, el tenant sigue devolviendo `403` en listados globales de:

- `GET /users`
- `GET /groups`

Por tanto, la integracion debe trabajar con:

1. un buzon fuente conocido
2. `calendarId` persistidos en repo/config

No se debe depender de autodiscovery de calendarios a nivel tenant.

## Buzon fuente validado

- Mailbox: `alex.burgues@avtechesdeveniments.com`

## Calendar IDs validados

### Instalaciones

- Nombre visible: `Instalaciones`
- `calendarId`: `AAMkADU1ZjI0YmM1LWU1NTQtNDRlOC1hMDk1LTA5MmRjZGM3MTk1OABGAAAAAAA4fU04RNXQR7YkGezRkbW3BwAtgZDuW4I8R4UJLPSWc75kAAAAAAEGAAAtgZDuW4I8R4UJLPSWc75kAABo98bZAAA=`

### Facturacion

- Nombre visible: `Facturación`
- `calendarId`: `AAMkADU1ZjI0YmM1LWU1NTQtNDRlOC1hMDk1LTA5MmRjZGM3MTk1OABGAAAAAAA4fU04RNXQR7YkGezRkbW3BwAtgZDuW4I8R4UJLPSWc75kAAAAAAEGAAAtgZDuW4I8R4UJLPSWc75kAABo98bYAAA=`

### Comercial

- Nombre visible: `Comercial`
- `calendarId`: `AAMkADU1ZjI0YmM1LWU1NTQtNDRlOC1hMDk1LTA5MmRjZGM3MTk1OABGAAAAAAA4fU04RNXQR7YkGezRkbW3BwAtgZDuW4I8R4UJLPSWc75kAAAAAAEGAAAtgZDuW4I8R4UJLPSWc75kAABqRMQrAAA=`

### Marketing

- Nombre visible: `Marketing`
- `calendarId`: `AAMkADU1ZjI0YmM1LWU1NTQtNDRlOC1hMDk1LTA5MmRjZGM3MTk1OABGAAAAAAA4fU04RNXQR7YkGezRkbW3BwAtgZDuW4I8R4UJLPSWc75kAAAAAAEGAAAtgZDuW4I8R4UJLPSWc75kAACk3VbXAAA=`

## Evidencia operativa validada

Se ha confirmado acceso real a:

- `GET /users/alex.burgues@avtechesdeveniments.com/calendars`
- `GET /users/alex.burgues@avtechesdeveniments.com/calendars/{calendarId}/calendarView`
- `GET /users/alex.burgues@avtechesdeveniments.com/calendars/{calendarId}/events`

Campos ya legibles en eventos:

- `id`
- `subject`
- `start`
- `end`
- `location`
- `organizer`
- `bodyPreview`
- `body`
- `attendees`
- `categories`
- `hasAttachments`
- `importance`
- `isAllDay`
- `isCancelled`
- `showAs`
- `sensitivity`
- `type`
- `webLink`
- `lastModifiedDateTime`

## Decision operativa actual

Para la primera fase de integracion con NEXO:

1. priorizar `Instalaciones` y `Facturación`
2. usar `alex.burgues@avtechesdeveniments.com` como buzon fuente inicial
3. persistir estos `calendarId` en configuracion o constantes backend
4. no modelar autodiscovery de calendarios hasta tener permisos de directorio

## Siguiente paso recomendado

Definir el contrato de sincronizacion entre evento M365 y entidad ERP:

- `Instalaciones` <-> instalaciones, sites, tecnicos, ubicacion, fechas
- `Facturación` <-> tareas de facturacion, vencimientos o hitos administrativos

