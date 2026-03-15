# Permissions and config

## Capacidades ya validadas en el repo

- SharePoint documental operativo con permisos sobre el site y drives.
- Acceso a calendarios del mailbox `alex.burgues@avtechesdeveniments.com`.
- Dependencia conocida: no hay discovery general de `users` o `groups`.

## Permisos Graph relevantes

- `Sites.Selected`
- `Sites.ReadWrite.All`
- `Calendars.ReadWrite`

## Variables de entorno vistas en `sharepoint-storage/index.ts`

- `MS_TENANT_ID`
- `MS_GRAPH_TOKEN_URL`
- `MS_GRAPH_CLIENT_ID`
- `MS_GRAPH_CLIENT_SECRET`
- `MS_GRAPH_SCOPE`
- `MS_SHAREPOINT_SITE_ID`
- `MS_SHAREPOINT_VENTAS_DRIVE_ID`
- `MS_SHAREPOINT_COMPRAS_DRIVE_ID`
- `MS_SHAREPOINT_PURCHASES_DRIVE_ID`

## Regla operativa

- Documentar IDs estables de mailbox, calendarios, site y drives en repo.
- Mantener secretos solo en entorno seguro.
- Evitar rutas de fallback no documentadas salvo compatibilidad controlada.
