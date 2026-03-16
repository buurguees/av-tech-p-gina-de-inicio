---
name: supabase-migration-hygiene
description: Estandariza la creación, validación y despliegue de migraciones Supabase en NEXO AV, evitando drift, timestamps duplicados y errores de ejecución.
---

# Supabase Migration Hygiene

## Guía para agentes

| | |
|---|---|
| **Cuándo cargar** | Crear nuevas migraciones SQL; antes de ejecutar `db push` o `migration up`; cuando `supabase db push --linked` falle por drift; cuando existan archivos `temp_*` o nombres no válidos. |
| **Cuándo NO cargar** | Consultas SQL ad hoc sin tocar historial de migraciones; cambios de frontend que no alteren esquema/funciones/RLS. |
| **Integración .codex** | Si se resuelve drift o se corrige problema de migraciones, registrar en `.codex/errores-soluciones.md`; si se define nueva práctica de higiene, en `.codex/avances.md`. |

---

## Objetivo

Mantener un historial de migraciones limpio, trazable y desplegable en Supabase (local y remoto), con foco en seguridad operativa y cero drift no controlado.

## Reglas base (obligatorias)

- En este repo, ejecutar CLI con `npx supabase` (no asumir CLI global).
- En PowerShell, evitar `&&`; usar comandos separados o `;`.
- Nombre de migración obligatorio: `<timestamp>_descripcion.sql`.
- No usar archivos temporales dentro de `supabase/migrations/`.
- No usar timestamps duplicados.
- No ejecutar `migration repair` sin evidencias y plan de rollback.

---

## Flujo estándar

1. **Validar entorno:**
   - `npx supabase --version`
   - `npx supabase migration list --linked`
2. **Higiene de carpeta** `supabase/migrations/`:
   - Detectar nombres inválidos.
   - Detectar timestamps duplicados.
3. **Crear migración nueva:**
   - `npx supabase migration new <descripcion_kebab_case>`
4. Editar SQL y validar localmente.
5. Revisar drift remoto/local antes de push.
6. Ejecutar deploy de migración de forma controlada.
7. Verificar estado final y registrar evidencia.

---

## Checklist de validación previa

- [ ] `npx supabase` operativo.
- [ ] Sin archivos no válidos en `supabase/migrations/`.
- [ ] Sin timestamps repetidos.
- [ ] `migration list --linked` revisado.
- [ ] Cambio descrito y acotado (tablas/RPC/policies afectadas).
- [ ] Plan de rollback definido para cambios de alto impacto.

---

## Protocolo de drift

Si aparece `Remote migration versions not found in local migrations directory`:

1. **No forzar** deploy inmediato.
2. Guardar evidencia (`migration list --linked`).
3. **Identificar origen** de las versiones remote-only (MCP apply_migration, Dashboard, otro repo).
4. Elegir estrategia:
   - **Alineación por pull**: `npx supabase db pull` (recomendado para recuperar base real).
   - **Repair controlado**: `npx supabase migration repair ...` solo con lista validada.
5. **Antes de repair**: `migration repair --status reverted` solo actualiza `schema_migrations`; no deshace cambios en la BD. Si las migraciones remote-only ya crearon objetos (funciones, tablas), las migraciones locales que crean los mismos objetos fallarán tras el repair. Ver `docs/supabase/2026-03-15_migration_history_drift_diagnosis.md`.
6. Revalidar listado local/remoto.
7. Ejecutar push solo cuando el historial esté consistente.

---

## Idempotencia recomendada

Para reducir fallos cuando el remoto ya tiene objetos creados por migraciones remote-only:

- Funciones: `CREATE OR REPLACE FUNCTION`
- Columnas: `ADD COLUMN IF NOT EXISTS`
- Índices: `CREATE INDEX IF NOT EXISTS`
- Seeds: `WHERE NOT EXISTS` o `ON CONFLICT DO NOTHING`

---

## Regla: una sola fuente para DDL

- **Migraciones de esquema** (DDL, funciones, RLS): crear con `migration new`, versionar en repo, aplicar con `db push`.
- **No usar** MCP `apply_migration` para DDL; reservar para seeds de datos (INSERT) cuando `db push` esté bloqueado.

---

## Anti-patrones prohibidos

- Subir `temp_*.sql` al historial oficial.
- Resolver errores renombrando aleatoriamente muchas migraciones sin trazabilidad.
- Reparar cientos de versiones sin documentar criterio.
- Mezclar cambios de schema masivos con cambios de datos sin plan.

---

## Formato de salida recomendado

```markdown
- Estado CLI: <ok/fallo>
- Estado migraciones: <limpio/con incidencias>
- Incidencias detectadas:
  1. <tipo> - <archivo/versión>
- Riesgo: <bajo/medio/alto>
- Acción recomendada:
  1. <paso 1>
  2. <paso 2>
- Comando seguro siguiente: <comando>
```

---

## Definition of Done

- [ ] Historial local con nombres válidos y sin duplicados.
- [ ] Sin drift bloqueante no resuelto.
- [ ] Migración nueva creada con timestamp único.
- [ ] Evidencia de validación antes/después.
