# CURRENT_STATE - NEXO AV

Ultima actualizacion: 2026-03-03

## Estado operativo actual
- Se consolidaron skills de arquitectura, seguridad, contabilidad, SharePoint, release gate y mobile UI.
- Hay cambios sin commit en rutas NEXO, gastos/tickets y funciones SharePoint.
- Se detecto riesgo de drift en migraciones Supabase (historico remoto/local).

## Prioridades inmediatas
1. Saneamiento de migraciones antes de nuevo push (`supabase-migration-hygiene`).
2. Cerrar batch actual de cambios de gastos/tickets con verificacion funcional.
3. Aplicar `nexo-release-gate` antes de merge/deploy.

## Referencias de memoria
- `2026-03-03_changes_handover_yesterday_today.md`

## Skills a aplicar segun tipo de trabajo
- DB/migraciones: `supabase-migration-hygiene`, `supabase-db-connection`
- SharePoint documental: `nexo-sharepoint-documental`, `nexo-sharepoint-sync-rules`
- Calidad previa release: `nexo-release-gate`, `security-checks`
- UI mobile: `nexo-mobile-ui-standards`
- Auditoria contable: `contable-auditoria-nexo`
