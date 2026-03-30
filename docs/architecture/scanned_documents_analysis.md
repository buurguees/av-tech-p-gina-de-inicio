# Análisis de public.scanned_documents — Relación polimórfica

> Generado: 2026-03-26
> Proyecto: NEXO AV — takvthfatlcjsqgssnta

---

## Estructura

| Columna | Tipo | Nullable | Propósito |
|---|---|---|---|
| `id` | uuid | NO | PK |
| `file_path` | text | NO | Ruta del archivo escaneado |
| `file_name` | text | NO | Nombre del archivo |
| `file_size` | integer | NO | Tamaño en bytes |
| `file_type` | text | NO | MIME type o extensión |
| `status` | text | NO | Estado de procesamiento |
| `assigned_to_type` | text | YES | Tipo de entidad destino (polimórfico) |
| `assigned_to_id` | uuid | YES | ID de la entidad destino (polimórfico) |
| `notes` | text | YES | Notas del usuario |
| `created_at` | timestamptz | NO | Fecha de creación |
| `created_by` | uuid | YES | Usuario que escaneó |
| `updated_at` | timestamptz | NO | Última actualización |

## Datos actuales — distribución por tipo

| `assigned_to_type` | Documentos | Con `assigned_to_id` | Sin ID |
|---|---|---|---|
| `NULL` (sin asignar) | 68 | 0 | 68 |
| `PURCHASE_INVOICE` | 49 | 49 | 0 |
| `EXPENSE` | 44 | 44 | 0 |
| **Total** | **161** | **93** | **68** |

## Análisis del patrón polimórfico

### Tipos fijos y reducidos
Solo 2 tipos activos (`PURCHASE_INVOICE`, `EXPENSE`) + NULL para documentos pendientes de clasificar. Es un conjunto **muy pequeño y estable**.

### ¿A qué tablas apuntan los IDs?

| `assigned_to_type` | Tabla destino probable |
|---|---|
| `PURCHASE_INVOICE` | `sales.purchase_invoices.id` |
| `EXPENSE` | `accounting.expenses.id` o similar |

### No hay FK formal
El campo `assigned_to_id` es un UUID genérico sin constraint. Esto permite insertar IDs inexistentes sin error.

## Recomendaciones

### Opción A: CHECK CONSTRAINT en `assigned_to_type` (recomendada)

Dado que solo hay 2 tipos activos y el conjunto es estable:

```sql
ALTER TABLE public.scanned_documents
  ADD CONSTRAINT chk_assigned_to_type
  CHECK (assigned_to_type IS NULL OR assigned_to_type IN ('PURCHASE_INVOICE', 'EXPENSE'));
```

**Ventajas**: Impide tipos inventados. Compatible con el patrón actual. No requiere reestructurar la tabla.

**Desventaja**: No valida que `assigned_to_id` exista en la tabla destino (pero eso requeriría FKs separadas).

### Opción B: Separar en columnas FK (no recomendada ahora)

```sql
ALTER TABLE public.scanned_documents
  ADD COLUMN purchase_invoice_id uuid REFERENCES sales.purchase_invoices(id) ON DELETE SET NULL,
  ADD COLUMN expense_id uuid REFERENCES accounting.expenses(id) ON DELETE SET NULL;
```

**Ventajas**: Integridad referencial real. JOINs sin CASE.

**Desventajas**: Requiere migrar 93 filas + cambiar código frontend. Solo vale la pena si se van a añadir más tipos.

### Recomendación final

**Opción A** — añadir CHECK CONSTRAINT. Es la solución de mínimo impacto que previene datos basura. Si en el futuro se añaden más tipos (ej: `INVOICE`, `QUOTE`), se amplía el CHECK.

El CHECK debería validar también la coherencia `assigned_to_type`/`assigned_to_id`:

```sql
ALTER TABLE public.scanned_documents
  ADD CONSTRAINT chk_assigned_to_coherence
  CHECK (
    (assigned_to_type IS NULL AND assigned_to_id IS NULL) OR
    (assigned_to_type IS NOT NULL AND assigned_to_id IS NOT NULL)
  );
```

**Nota**: 68 filas actuales tienen `assigned_to_type = NULL AND assigned_to_id = NULL` (documentos sin asignar), lo cual es coherente con este CHECK.
