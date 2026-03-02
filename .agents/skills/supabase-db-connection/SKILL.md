---
name: supabase-db-connection
description: Conecta y valida acceso a base de datos Supabase (cloud o local), usando variables de entorno, psql, Supabase CLI y MCP. Usar cuando el usuario pida conectar, consultar esquema, ejecutar SQL o diagnosticar conexión a Supabase.
---

# Supabase DB Connection

## Objetivo
Conectar de forma segura a la base de datos de Supabase y validar acceso antes de ejecutar consultas o cambios.

## Cuándo usar esta skill
- El usuario pide “conectarse a Supabase”.
- Hay que ejecutar SQL en la base de datos.
- Hay que revisar tablas, funciones RPC o esquema.
- Hay errores de conexión y se necesita troubleshooting.

## Cuándo NO usar esta skill
- Tareas puramente de UI/frontend sin acceso a datos.
- Refactors de código sin impacto en DB.
- Consultas genéricas del proyecto que no requieren Supabase.

## Prerrequisitos
- Proyecto con `.env` configurado.
- Variables típicas:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - Para acceso SQL directo: `SUPABASE_DB_URL` (o connection string equivalente).
- Si se usa local: Supabase CLI instalado.

## Flujo recomendado (rápido)
1. Verificar variables de entorno necesarias.
2. Elegir modo de conexión:
   - **SQL directo** (si hay `SUPABASE_DB_URL` y `psql`).
   - **API/PostgREST con supabase-js** (si NO hay SQL directo).
   - **Local** con Supabase CLI (`supabase start`) cuando aplique.
3. Validar conectividad real (SQL o API).
4. Solo después ejecutar consultas de negocio o cambios.

## Conexión Cloud (SQL directo)
Si existe `SUPABASE_DB_URL`, usar:

```bash
psql "$SUPABASE_DB_URL"
```

Validación inicial:

```sql
select now(), current_database(), current_user;
```

Inspección básica:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema not in ('pg_catalog', 'information_schema')
order by table_schema, table_name;
```

## Conexión Cloud (sin `SUPABASE_DB_URL` o sin `psql`)
Este escenario **NO es un fallo**. Validar por API con `supabase-js`:

1. Confirmar proyecto/URL:
   - `supabase/config.toml` (project ref).
   - `src/integrations/supabase/client.ts` (`createClient(...)`).
2. Verificar endpoint de Auth:
   - `GET <VITE_SUPABASE_URL>/auth/v1/settings` debe responder `200`.
3. Hacer una lectura controlada con `supabase-js`:
   - `select ... limit 1` sobre una tabla de lectura permitida.
   - Si responde `200` sin error (aunque devuelva 0 filas), hay conectividad real.

Conclusión esperada en este modo:
- Conectividad confirmada vía API/PostgREST.
- Limite: no hay validación SQL directa (`now()`, `current_database()`, `current_user`) sin `SUPABASE_DB_URL` + `psql`.

## Conexión Local (Supabase CLI)
Iniciar stack local:

```bash
supabase start
```

Conectar a la DB local (si tienes URL local):

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

Parar stack local:

```bash
supabase stop
```

## Uso con MCP (muy importante)
Cuando uses herramientas MCP para Supabase:
1. **Primero** revisar el descriptor/schema del tool (`mcps/<server>/tools/*.json`).
2. Solo después invocar la herramienta MCP.
3. Si falla, revisar parámetros obligatorios en el schema y reintentar.

Servidores MCP esperados en este proyecto:
- `user-supabase`
- `user-supabase-csm-avtech`

Flujo recomendado con MCP para consultar/modificar:
1. Revisar schema del tool a usar.
2. Ejecutar una **lectura previa** (`SELECT`/listado) para confirmar alcance.
3. Si hay cambios (`INSERT/UPDATE/DELETE`), mostrar impacto esperado.
4. Ejecutar cambio solo con confirmación explícita del usuario cuando aplique.
5. Releer datos para verificar resultado.

## Validación por rol y capacidad
- Con `anon key`:
  - Esperable: lectura limitada por RLS y endpoints públicos.
  - Puede devolver 200 con 0 filas (válido si no hay error).
- Con `service role`/credenciales privilegiadas:
  - Permite operaciones administrativas y bypass de RLS según configuración.
  - Usar solo cuando el usuario lo pida y con extremo cuidado.
- Con SQL directo (`SUPABASE_DB_URL`):
  - Validar `current_user` y permisos antes de cambios.

## Seguridad
- Nunca imprimir ni exponer secretos completos (`anon key`, `service role`, passwords).
- Nunca commitear credenciales en el repositorio.
- Evitar ejecutar `DROP`, `TRUNCATE`, `DELETE` masivos sin confirmación explícita del usuario.

## Política para modificaciones en DB
Antes de modificar datos o estructura:
1. Describir exactamente qué se va a cambiar.
2. Identificar tablas/registros afectados.
3. Proponer consulta previa de verificación.
4. Pedir confirmación explícita si el cambio es destructivo o masivo.

Cambios que SIEMPRE requieren confirmación:
- `DELETE` sin filtro fuerte.
- `TRUNCATE`, `DROP`, `ALTER` estructural.
- Updates masivos sin `WHERE` selectivo.

## Troubleshooting
- **`password authentication failed`**: credenciales/URL incorrectas.
- **`connection refused`**: host/puerto incorrecto o servicio no iniciado.
- **`role does not exist`**: usuario inválido en connection string.
- **`permission denied`**: rol sin permisos sobre schema/tabla.
- **MCP tool error**: schema no revisado o argumentos incompletos.
- **No existe `SUPABASE_DB_URL`**: usar validación por API/PostgREST.
- **`psql` no está en PATH**: usar validación por API o instalar cliente PostgreSQL.

## Checklist operativo
- [ ] Variables de entorno validadas.
- [ ] Modo de conexión elegido (cloud/local).
- [ ] Validación ejecutada:
  - SQL directo: `now()`, `current_database()`, `current_user`, o
  - API/PostgREST: auth settings 200 + lectura `supabase-js` sin error.
- [ ] Operación objetivo realizada.
- [ ] Sin exponer secretos en salida/logs.

## Formato de salida recomendado
Usar este formato al reportar estado:

```markdown
- Proyecto Supabase detectado: <project_ref>
- Cliente configurado contra <url> en <archivo:ruta>
- Validación endpoint Auth: <status_code>
- Validación lectura API: <status_code>, filas=<n>, error=<si/no>
- Modo usado: SQL directo | API/PostgREST | Local CLI
- Conclusión: <conectividad confirmada / bloqueada>
- Límite actual: <si aplica>

Siguiente paso sugerido:
1. <opción 1>
2. <opción 2>
3. <opción 3>
```
