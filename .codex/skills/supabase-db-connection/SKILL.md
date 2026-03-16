---
name: supabase-db-connection
description: Conectar y validar acceso a Supabase para este proyecto AV TECH/NEXO AV usando `supabase/config.toml`, variables de entorno, SQL directo, Supabase CLI, API/PostgREST o MCP. Usar cuando el usuario pida conectar, comprobar credenciales, consultar esquema, ejecutar SQL, validar `project_id` o diagnosticar problemas de conexion con Supabase.
---

# Supabase DB Connection

## Guia para agentes

| | |
|---|---|
| **Cuando cargar** | Usuario pide "conectarse a Supabase"; ejecutar SQL; revisar tablas, RPCs o esquema; validar `project_id`; diagnosticar errores de conexion; comprobar si el repo esta enlazado al remoto correcto. |
| **Cuando NO cargar** | Tareas puramente de UI/frontend sin acceso a datos; refactors sin impacto en DB; consultas genericas que no requieren Supabase. |
| **Integracion .codex** | Si se corrige un problema de conexion recurrente, registrar en `.codex/errores-soluciones.md`; si se define una nueva forma estable de validar acceso, registrar en `.codex/avances.md`. |

---

## Objetivo

Confirmar a que proyecto Supabase apunta el repo, elegir la via de conexion mas segura y validar acceso real antes de ejecutar consultas o cambios.

## Revisar primero

- `supabase/config.toml`: fuente canonica de `project_id` (para este repo: `takvthfatlcjsqgssnta`).
- `src/integrations/supabase/client.ts`: evidencia del `url` y la publishable key usadas por frontend.
- `.env` y `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `SUPABASE_ACCESS_TOKEN`.
- MCP: `.codex/mcp.json` (config en repo) o `~/.cursor/mcp.json` (Cursor); debe incluir la URL con `project_ref=takvthfatlcjsqgssnta` para conectar a la BD de la plataforma.
- `scripts/nexo/export-remote-schema.ps1`: flujo reutilizable cuando hay `SUPABASE_DB_URL`.
- `docs/supabase/2026-03-03_historical_migration_drift_diagnosis.md`: contexto del drift historico del remoto antes de usar `db pull` o reparar migraciones.

---

## Notas operativas del proyecto

- Priorizar `npx supabase ...`; no asumir binario global.
- Leer `supabase/config.toml` antes de mencionar el `project_id`; no confiar en memoria.
- Tratar `src/integrations/supabase/client.ts` como evidencia de configuracion actual. No editarlo manualmente salvo que la tarea sea regenerarlo de forma controlada.
- Si la tarea toca migraciones, RPCs, RLS, Edge Functions o contratos de datos, cargar tambien la skill `nexo-supabase-safe-change`.
- Si la tarea toca higiene del historial o despliegue de migraciones, cargar tambien `supabase-migration-hygiene`.

---

## Flujo recomendado

1. Verificar variables de entorno necesarias.
2. Confirmar `project_id` en `supabase/config.toml`.
3. Elegir modo de conexion:
   - **SQL directo** si hay `SUPABASE_DB_URL` y `psql` o `pg_dump`.
   - **API/PostgREST** si no hay SQL directo pero si `VITE_SUPABASE_URL` y key publica.
   - **MCP** si el flujo requiere herramientas Supabase ya configuradas.
   - **Local CLI** solo para entorno local o simulacion controlada.
4. Hacer una validacion de lectura.
5. Solo despues ejecutar consultas de negocio o cambios.

---

## Checklist de deteccion rapida

1. `npx supabase --version`
2. Leer `supabase/config.toml`
3. Verificar si existe `SUPABASE_DB_URL`
4. Verificar si existe `VITE_SUPABASE_URL`
5. Verificar si existe `VITE_SUPABASE_PUBLISHABLE_KEY` o, en legado, `VITE_SUPABASE_ANON_KEY`
6. Elegir la via menos invasiva que permita validar conexion

---

## Conexion cloud por SQL directo

Usar esta via si existe `SUPABASE_DB_URL` y el cliente PostgreSQL esta disponible.

```bash
psql "$SUPABASE_DB_URL"
```

**Validación inicial:**

```sql
select now(), current_database(), current_user;
```

**Inspección básica:**

```sql
select table_schema, table_name
from information_schema.tables
where table_schema not in ('pg_catalog', 'information_schema')
order by table_schema, table_name;
```

---

## Conexion cloud por API/PostgREST

Usar esta via si no hay SQL directo o `psql` no esta disponible.

1. Confirmar `project_id` en `supabase/config.toml`.
2. Confirmar `url`/key en `src/integrations/supabase/client.ts` o `.env`.
3. Verificar endpoint Auth:

```powershell
Invoke-WebRequest "$env:VITE_SUPABASE_URL/auth/v1/settings" | Select-Object StatusCode
```

4. Hacer una lectura controlada con `supabase-js` o con un script existente del repo sobre una tabla/RPC de lectura permitida.

La conclusion esperada es: conectividad confirmada via API/PostgREST. Limite: no hay validacion SQL directa sin `SUPABASE_DB_URL`.

---

## Conexion local con Supabase CLI

```bash
npx supabase start
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
npx supabase stop
```

---

## Configuracion MCP para la plataforma AV TECH/NEXO AV

Este repo apunta al proyecto Supabase de la plataforma NEXO AV. Para que el MCP de Supabase conecte a la BD correcta:

| Parametro | Valor |
|-----------|-------|
| **project_ref** | `takvthfatlcjsqgssnta` (fuente: `supabase/config.toml`) |
| **URL MCP** | `https://mcp.supabase.com/mcp?project_ref=takvthfatlcjsqgssnta` |

### Configuracion en el repo (Codex)

Este proyecto incluye la configuracion MCP en `.codex/mcp.json`. Codex y otros agentes que lean MCP desde el repo deben usar esta ruta.

El archivo define el servidor Supabase apuntando a la BD de la plataforma (`project_ref=takvthfatlcjsqgssnta`).

### Cursor

Cursor usa por defecto `~/.cursor/mcp.json`. Para alinear con este repo, se puede copiar el contenido de `.codex/mcp.json` o enlazar la configuracion. El formato es el mismo.

### Entorno CI / sin navegador

Si el cliente MCP no soporta OAuth (p. ej. en CI), usar autenticacion por token. Añadir en la config del servidor:

```json
"headers": {
  "Authorization": "Bearer ${SUPABASE_ACCESS_TOKEN}"
}
```

Variables necesarias: `SUPABASE_ACCESS_TOKEN` (crear en [Supabase Dashboard > Account > Access Tokens](https://supabase.com/dashboard/account/tokens)).

### Primer uso y autenticacion

En el primer uso, el cliente MCP redirige a Supabase para OAuth. El usuario debe iniciar sesion y autorizar el acceso. Tras la autorizacion, el MCP queda vinculado al proyecto.

En Cursor: Settings > Cursor Settings > Tools & MCP para comprobar que el servidor esta conectado.

### Opciones adicionales de URL

| Parametro | Uso |
|-----------|-----|
| `read_only=true` | Ejecutar queries como usuario read-only (recomendado si solo se consulta). |
| `features=database,docs` | Limitar herramientas habilitadas (comma-separated). |

Ejemplo read-only: `https://mcp.supabase.com/mcp?project_ref=takvthfatlcjsqgssnta&read_only=true`

---

## Herramientas MCP disponibles (Database)

| Tool | Uso |
|------|-----|
| `execute_sql` | Ejecutar SQL (SELECT, etc.). Para DDL usar `apply_migration`. |
| `apply_migration` | Aplicar migracion DDL. Params: `name` (snake_case), `query` (SQL). |
| `list_migrations` | Listar migraciones aplicadas. |
| `list_tables` | Listar tablas del esquema. |
| `list_extensions` | Listar extensiones PostgreSQL. |

Identificador del servidor en Cursor: `user-supabase` (mapeado desde `supabase` en mcp.json).

---

## Uso con MCP

Cuando uses herramientas MCP para Supabase:

1. **Primero** revisar el descriptor/schema del tool (p. ej. `mcps/user-supabase/tools/*.json` en el proyecto Cursor).
2. Confirmar que el MCP esta configurado con el `project_ref` correcto (`takvthfatlcjsqgssnta`).
3. Solo despues invocar la herramienta MCP.
4. Si falla, revisar parametros obligatorios en el schema y reintentar.

**Servidores MCP esperados en este proyecto:** `user-supabase` (plataforma NEXO AV), `user-supabase-csm-avtech` (otro proyecto si esta configurado).

**Flujo recomendado con MCP:**

1. Revisar schema del tool a usar.
2. Ejecutar una **lectura previa** (`list_tables`, `execute_sql` con SELECT) para confirmar alcance.
3. Si hay cambios (`INSERT/UPDATE/DELETE` o DDL), mostrar impacto esperado.
4. Ejecutar cambio solo con confirmacion explicita del usuario cuando aplique.
5. Releer datos para verificar resultado.

---

## Advertencia de drift historico

En este repo existe un diagnostico documentado de drift historico entre remoto y `supabase/migrations` con fecha `2026-03-03`.

Antes de usar estos comandos en remoto:

- `npx supabase db pull`
- `npx supabase db push --linked`
- `npx supabase migration repair ...`

revisar primero `docs/supabase/2026-03-03_historical_migration_drift_diagnosis.md` y, si la tarea es de historial/despliegue, cargar `supabase-migration-hygiene`.

No usar `db pull` como simple prueba de conexion si ya hay indicios de drift.

---

## Validacion por rol y capacidad

| Rol o via | Comportamiento esperado |
|-----|-------------------------|
| `VITE_SUPABASE_PUBLISHABLE_KEY` o `VITE_SUPABASE_ANON_KEY` | Lectura limitada por RLS; `200` con `0` filas puede ser valido si no hay error. |
| `service role` o credenciales privilegiadas | Permite operaciones administrativas y bypass de RLS. Usar solo con extremo cuidado. |
| SQL directo (`SUPABASE_DB_URL`) | Validar `current_user` y permisos antes de cambios. |

---

## Seguridad

- Nunca imprimir ni exponer secretos completos (`publishable/anon key`, `service role`, passwords).
- Nunca commitear credenciales en el repositorio.
- Evitar ejecutar `DROP`, `TRUNCATE`, `DELETE` masivos sin confirmacion explicita del usuario.

---

## Politica para modificaciones en DB

Antes de modificar datos o estructura:

1. Describir exactamente que se va a cambiar.
2. Identificar tablas/registros afectados.
3. Proponer consulta previa de verificacion.
4. Pedir confirmacion explicita si el cambio es destructivo o masivo.

**Cambios que SIEMPRE requieren confirmacion:**

- `DELETE` sin filtro fuerte.
- `TRUNCATE`, `DROP`, `ALTER` estructural.
- Updates masivos sin `WHERE` selectivo.

---

## Troubleshooting

| Error | Causa probable |
|-------|-----------------|
| `password authentication failed` | Credenciales o URL incorrectas. |
| `connection refused` | Host, puerto o servicio incorrecto/no iniciado. |
| `role does not exist` | Usuario invalido en connection string. |
| `permission denied` | Rol sin permisos sobre schema o tabla. |
| `db pull` bloqueado | Historial de migraciones remoto y repo desalineados. |
| MCP tool error | Schema no revisado o argumentos incompletos. |
| MCP no conecta / 401 | Verificar que el cliente MCP esta configurado con la URL correcta y que el usuario ha autorizado OAuth en Supabase; en CI, usar `SUPABASE_ACCESS_TOKEN` en header. |
| No existe `SUPABASE_DB_URL` | Usar validación por API/PostgREST. |
| `psql` no esta en PATH | Usar validacion por API o `scripts/nexo/export-remote-schema.ps1` si aplica. |

---

## Formato de salida recomendado

```markdown
- Proyecto Supabase detectado: <project_ref>
- Fuente de proyecto: <supabase/config.toml>
- Cliente configurado contra <url> en <archivo:ruta>
- Variables detectadas: <lista sin exponer secretos>
- Validación endpoint Auth: <status_code>
- Validacion lectura API/SQL: <resultado>
- Modo usado: SQL directo | API/PostgREST | MCP | Local CLI
- Conclusión: <conectividad confirmada / bloqueada>
- Limite actual: <si aplica>

Siguiente paso sugerido:
1. <opción 1>
2. <opción 2>
3. <opción 3>
```
