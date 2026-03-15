# Calendar contract

## Configuracion base ya validada

- Mailbox fuente inicial: `alex.burgues@avtechesdeveniments.com`
- Calendarios prioritarios: `Instalaciones`, `Facturacion`
- Documento canonico: `docs/sharepoint/M365_CALENDARS_NEXO_AV.md`

## Puntos del ERP que toca

- `CalendarPage.tsx`: punto de entrada desktop del modulo
- `ProjectPlanningTab.tsx`: planning, assignments, visits, `READY_TO_INVOICE`
- `TasksPage.tsx` y `NotificationsWidget.tsx`: soporte para excepciones o acciones humanas

## Regla de arquitectura

- `ERP/Supabase` sigue siendo la fuente de verdad operativa.
- `Graph` aporta eventos y sincronizacion.
- El frontend no debe decidir mappings criticos.

## Contrato recomendado v1

1. Leer eventos Graph con mailbox y `calendarId` persistidos.
2. Normalizar payload a un shape interno estable.
3. Resolver proyecto/site mediante identificador explicito o matching controlado.
4. Escribir en ERP mediante RPCs o una funcion backend dedicada.
5. Registrar resultado de sync y conflictos.

## No hacer en v1

- Autodiscovery de buzones o calendarios.
- Sync mobile especifico.
- Creacion automatica de factura por presencia de evento.
- Uso de Planner o SharePoint Lists como verdad alternativa.
