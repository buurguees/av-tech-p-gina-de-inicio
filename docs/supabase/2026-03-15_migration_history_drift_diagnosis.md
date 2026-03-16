# Diagnóstico: Error de historial de migraciones (15 marzo 2026)

**Proyecto:** `takvthfatlcjsqgssnta`  
**Fecha:** 2026-03-15

## Resumen ejecutivo

Al intentar aplicar migraciones pendientes con `npx supabase db push --linked`, se produjeron dos fallos encadenados:

1. **Remote migration versions not found in local migrations directory** — 4 versiones remotas sin archivo local.
2. Tras `migration repair --status reverted` de esas 4 versiones, **db push** falló con `function "create_catalog_category" already exists with same argument types`.

La causa raíz es que **`migration repair --status reverted` solo actualiza la tabla `schema_migrations`; no deshace los cambios reales en la base de datos**. Los objetos (funciones, tablas, etc.) creados por esas migraciones "revertidas" siguen existiendo. Al intentar aplicar migraciones locales que crean los mismos objetos, se produce conflicto.

---

## Secuencia de hechos

### 1. Estado inicial

```
migration list --linked:
  Local          | Remote
  ----------------|----------------
  20260315153640  | (pendiente)
  20260315165919  | (pendiente)
  ...
  20260315180500  | (pendiente)
                  | 20260315155943   <- remote-only
                  | 20260315171645   <- remote-only
                  | 20260315172211   <- remote-only
                  | 20260315173146   <- remote-only
```

### 2. Origen de las versiones remote-only

Las versiones `20260315155943`, `20260315171645`, `20260315172211`, `20260315173146` existen en `schema_migrations` del remoto pero **no hay archivos** con esos timestamps en `supabase/migrations/`.

Posibles causas:

- **MCP `apply_migration`**: Supabase MCP puede registrar migraciones directamente en el remoto sin archivo local.
- **Supabase Dashboard**: Ejecución de SQL desde el panel que registra versiones.
- **Otro entorno o rama**: Migraciones aplicadas desde otro repo/clon y luego los archivos no se sincronizaron.
- **Renombrado local**: Archivos renombrados o eliminados tras aplicar en remoto.

### 3. Repair ejecutado

```powershell
npx supabase migration repair --status reverted 20260315155943 20260315171645 20260315172211 20260315173146 --linked
```

Efecto: se eliminaron esas 4 filas de `schema_migrations`. **La base de datos no cambió**: las funciones, tablas y datos creados por esas migraciones siguen en el remoto.

### 4. Fallo en db push

```text
Applying migration 20260315153640_auto_assign_catalog_skus_by_category.sql...
ERROR: function "create_catalog_category" already exists with same argument types (SQLSTATE 42723)
```

La migración `20260315153640` intenta:

- `DROP FUNCTION IF EXISTS public.create_catalog_category(text, text, catalog.category_domain, text, uuid, integer);` — elimina la versión de 6 parámetros.
- `CREATE FUNCTION public.create_catalog_category(..., p_code text DEFAULT NULL)` — crea la versión de 7 parámetros.

Si una de las migraciones remote-only ya creó la versión de 7 parámetros, el `DROP` no la toca (firma distinta) y el `CREATE` falla porque la función ya existe.

---

## Causa raíz

| Factor | Descripción |
|--------|-------------|
| **Múltiples fuentes de verdad** | Migraciones aplicadas fuera del flujo repo (MCP, Dashboard, otro entorno) sin archivos locales correspondientes. |
| **Repair no revierte cambios** | `migration repair --status reverted` solo modifica `schema_migrations`; no ejecuta `DROP` ni rollback de datos. |
| **Migraciones no idempotentes** | `CREATE FUNCTION` sin `OR REPLACE` falla si el objeto ya existe. |
| **Orden temporal** | Migraciones locales con timestamps anteriores a las remote-only intentan crear objetos que ya existen. |

---

## Medidas preventivas

### 1. Regla de una sola fuente (obligatoria)

- **Todas las migraciones de esquema** (DDL, funciones, RLS) deben:
  1. Crearse con `npx supabase migration new <nombre>`
  2. Versionarse en `supabase/migrations/`
  3. Aplicarse con `npx supabase db push --linked`

- **No usar** `apply_migration` del MCP para cambios de esquema. Reservar MCP para:
  - Seeds de datos (INSERT) cuando `db push` esté bloqueado.
  - Consultas de lectura (SELECT).

### 2. Antes de `migration repair`

1. Capturar evidencia: `npx supabase migration list --linked > docs/supabase/evidence/YYYY-MM-DD/migration-list.txt`
2. Identificar el origen de las versiones remote-only (MCP, Dashboard, otro repo).
3. Si no hay archivos locales y los cambios ya están en el DB:
   - **No hacer repair ciego** de esas versiones si luego se van a aplicar migraciones locales que crean los mismos objetos.
   - Alternativa: marcar esas versiones como `applied` (no `reverted`) para que el historial refleje el estado real, y ajustar las migraciones locales para que sean idempotentes o para que no dupliquen objetos.

### 3. Migraciones idempotentes (recomendado)

Para funciones:

```sql
CREATE OR REPLACE FUNCTION public.mi_funcion(...)
RETURNS ...
AS $$
...
$$;
```

Para columnas:

```sql
ALTER TABLE mi_tabla ADD COLUMN IF NOT EXISTS mi_columna text;
```

Para índices:

```sql
CREATE INDEX IF NOT EXISTS idx_nombre ON tabla(columna);
```

### 4. Checklist pre-push

- [ ] `migration list --linked` revisado; sin remote-only inexplicables.
- [ ] Si hay remote-only, documentar origen antes de repair.
- [ ] Migraciones nuevas con `CREATE OR REPLACE` o `IF NOT EXISTS` donde sea posible.
- [ ] Seeds de datos con `WHERE NOT EXISTS` o `ON CONFLICT DO NOTHING`.

### 5. Workflow recomendado para seeds cuando push falla

Si `db push` está bloqueado por conflictos de historial y se necesitan solo datos (INSERT):

1. Ejecutar el SQL de seeds vía MCP `apply_migration` o `psql` con `SUPABASE_DB_URL`.
2. Mantener el archivo de migración en `supabase/migrations/` para trazabilidad y futuros entornos.
3. Registrar en `schema_migrations` manualmente solo si es estrictamente necesario y con criterio documentado.

---

## Referencias

- `docs/supabase/2026-03-13_linked_history_repair.md` — repair previo de historial.
- `docs/supabase/2026-03-03_historical_migration_drift_diagnosis.md` — diagnóstico histórico.
- `.codex/skills/supabase-migration-hygiene/SKILL.md` — protocolo de higiene.
- `.codex/errores-soluciones.md` — registro de este incidente.
