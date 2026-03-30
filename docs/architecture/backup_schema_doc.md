# Documentación de backup.daily_snapshots

> Generado: 2026-03-26
> Proyecto: NEXO AV — takvthfatlcjsqgssnta

---

## Estructura

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `table_schema` | text | NO | — |
| `table_name` | text | NO | — |
| `snapshot_date` | date | NO | `CURRENT_DATE` |
| `row_count` | integer | NO | `0` |
| `data` | jsonb | NO | — |
| `created_at` | timestamptz | NO | `now()` |

## Datos actuales (6 filas)

Todos los registros son del **2026-02-16** — snapshot único, no recurrente.

| Schema | Tabla | Filas en snapshot | Hora |
|---|---|---|---|
| projects | site_technician_assignments | 0 | 15:30:10 |
| projects | site_visits | 0 | 15:30:10 |
| projects | projects | 24 | 15:30:35 |
| projects | project_sites | 31 | 15:30:35 |
| quotes | quotes | 43 | 15:30:35 |
| sales | invoices | 23 | 15:30:35 |

## Análisis

### Propósito inferido
Backup manual puntual de tablas de negocio críticas antes de una migración o cambio mayor. El campo `data` (JSONB) contiene una copia completa de todas las filas de cada tabla en el momento del snapshot.

### Frecuencia
**No hay automatización**. pg_cron no está instalado. No hay funciones ni triggers que escriban automáticamente en esta tabla. Fue un snapshot manual ejecutado una única vez.

### Retención
No hay política de retención configurada. Los 6 registros ocupan espacio significativo (el campo `data` contiene 24 proyectos + 31 sites + 43 quotes + 23 facturas como JSONB completo).

### Recomendaciones

1. **Mantener temporalmente** — los datos son de hace 5 semanas y podrían ser útiles como referencia histórica
2. **No automatizar** — Supabase tiene backups automáticos a nivel de proyecto (Point-in-Time Recovery). Un sistema de snapshots por tabla duplica funcionalidad sin el beneficio de consistencia transaccional
3. **Limpiar a medio plazo** — Cuando ya no se necesite la referencia del 2026-02-16, borrar las filas o la tabla
4. **Si se quiere mantener el sistema** — Instalar pg_cron y crear un job, o usar una Edge Function con un cron externo

### Estado

| Aspecto | Valor |
|---|---|
| Filas | 6 |
| Fecha único snapshot | 2026-02-16 |
| Automatización | Ninguna |
| Índices | Solo PK (`id`) |
| Comentarios SQL | Ninguno |
| Documentado en DATABASE_RELATIONS | No |
