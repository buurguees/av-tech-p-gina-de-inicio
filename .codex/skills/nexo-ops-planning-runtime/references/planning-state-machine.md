# Planning state machine

## Estados observados en UI

- `PLANNED`
- `SCHEDULED`
- `IN_PROGRESS`
- `READY_TO_INVOICE`
- `INVOICED`
- `CLOSED`

## RPCs y acciones visibles en `ProjectPlanningTab`

- `list_project_sites`
- `update_site_planning`
- `list_site_assignments`
- `upsert_site_assignment`
- `delete_site_assignment`
- `list_site_visits`
- `register_site_visit`
- `close_site_visit`
- `set_site_actual_dates`
- `get_site_financials`

## Reglas operativas

- La planificacion no equivale a ejecucion real.
- `actual_start_at` y `actual_end_at` deben quedar trazados.
- `READY_TO_INVOICE` significa listo para crear factura, no factura creada.
- `INVOICED` y `CLOSED` bloquean edicion operativa.

## Integracion con calendario

- El calendario puede proponer fechas o cambios.
- El runtime operativo decide el impacto ERP final.
- Si el matching evento->site es dudoso, crear tarea o incidencia, no aplicar cambios silenciosos.
