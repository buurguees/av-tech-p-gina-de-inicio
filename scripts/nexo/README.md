# NEXO Scripts

Scripts de soporte operativo o tecnico de NEXO AV:

- utilidades de datos
- soporte de modulos
- tareas de mantenimiento del ERP

## Export de schema remoto Supabase

Script:

- `scripts/nexo/export-remote-schema.ps1`

Uso base (si `pg_dump` esta en PATH y `SUPABASE_DB_URL` ya existe en entorno):

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/nexo/export-remote-schema.ps1"
```

Usando `.env` del repo y ruta explicita a `pg_dump.exe`:

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/nexo/export-remote-schema.ps1" -EnvFile ".env" -PgDumpPath "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
```

Ruta de salida personalizada:

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/nexo/export-remote-schema.ps1" -OutputPath "ops/backups/supabase/2026-03-03/remote_schema.sql" -Force
```
