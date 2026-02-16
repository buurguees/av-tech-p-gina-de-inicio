

# Plan: Incluir tablas del schema `ai` en el sistema de backup

## Contexto

El sistema de backup existente (`backup.run_daily_backup()`) tiene un array hardcoded de tablas criticas que se respaldan diariamente como JSONB en `backup.daily_snapshots`. Actualmente cubre 22 tablas de los schemas `crm`, `projects`, `quotes`, `sales`, `purchases`, `internal`, `payroll` y `accounting`.

## Cambio necesario

Dentro de la migracion SQL principal del modulo AI (la misma que crea el schema `ai`, tablas, enums, RPCs, etc.), incluir un `CREATE OR REPLACE FUNCTION backup.run_daily_backup()` que anada las 4 tablas nuevas del schema `ai` al array de backup:

```text
-- AI (anadir al array v_tables existente)
ARRAY['ai', 'conversations'],
ARRAY['ai', 'conversation_members'],
ARRAY['ai', 'messages'],
ARRAY['ai', 'chat_requests']
```

## Detalle tecnico

Se redefine la funcion `backup.run_daily_backup()` con `CREATE OR REPLACE` incluyendo las 4 tablas nuevas al final del array. El resto de la funcion (logica de snapshot, manejo de errores, formato de retorno) no cambia.

No se necesitan archivos nuevos ni modificaciones frontend. Es solo una linea mas en la migracion SQL que ya estaba prevista.

## Impacto

- Las tablas `ai.*` quedaran incluidas en el backup diario automatico
- Se podran recuperar con `backup.get_snapshot('ai', 'messages', '2026-02-16')` etc.
- Se limpian automaticamente tras 30 dias con `backup.cleanup_old_snapshots()`
- Sin cambio alguno en el frontend ni en la Edge Function

## Archivos afectados

Ninguno adicional. Se integra en la migracion SQL ya planificada del modulo AI.

