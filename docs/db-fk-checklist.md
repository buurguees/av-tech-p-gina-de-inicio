# Checklist de Integridad Referencial Cross-Schema — NEXO AV

> Última actualización: 2026-03-26
> Mantenedor: equipo de desarrollo
> Contexto: 10 schemas de negocio + audit + security + backup | 107 tablas | 138 FKs totales | 63 cross-schema

---

## 1. Cuándo añadir FKs cross-schema

### Obligatorio (siempre añadir FK explícita)

| Caso | Ejemplo real | Razón |
|---|---|---|
| Columna `_id` que referencia tabla de otro schema | `sales.invoices.client_id → crm.clients` | Sin FK, se pueden insertar IDs inexistentes silenciosamente |
| Relación core del flujo de negocio | `projects.projects.client_id`, `projects.projects.quote_id` | Son el esqueleto del flujo lead→proyecto→factura |
| FK hacia tablas hub (`authorized_users`, `clients`, `projects`, `products`, `suppliers`) | Cualquier `created_by`, `assigned_to`, `supplier_id` | Las tablas hub son el punto de referencia de toda la BD |

### Opcional (evaluar caso a caso)

| Caso | Cuándo añadirla | Cuándo no |
|---|---|---|
| Relación con datos externos/legacy | Solo si los datos ya existen y son fiables | Si la fuente externa puede tener IDs inconsistentes |
| Tablas de log o auditoría | Si se necesita JOINs con integridad garantizada | Si el log puede referir registros ya eliminados (usar NO ACTION) |
| Columnas `nullable` hacia entidades opcionales | Siempre con `ON DELETE SET NULL` | — |

### Nunca (no añadir FK)

- Claves generadas externamente que pueden no existir en la BD local
- Tablas de staging o ETL temporal
- Columnas que almacenan IDs pero como referencia informativa (no JOIN estructural)

---

## 2. Guía de delete rules

### Referencia rápida

| Regla | Comportamiento | Cuándo usarla |
|---|---|---|
| `NO ACTION` | Error si hay hijos al borrar el padre (diferido) | Relaciones de negocio donde borrar el padre sería un error operativo |
| `RESTRICT` | Igual que NO ACTION pero inmediato | Misma lógica, validación más estricta. Usar para relaciones fiscales/legales |
| `SET NULL` | La FK del hijo queda NULL, el hijo sobrevive | Cuando el hijo puede existir sin el padre (relación opcional) |
| `CASCADE` | El hijo se borra automáticamente | Solo para hijos directos dentro del **mismo schema** |

### Ejemplos reales de esta BD

#### RESTRICT — usar cuando hay obligación legal o fiscal
```sql
-- La factura es un documento fiscal. No se puede borrar un cliente con facturas.
CONSTRAINT invoices_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES crm.clients(id)
  ON DELETE RESTRICT
```

#### SET NULL — usar cuando el hijo puede sobrevivir solo
```sql
-- El producto del catálogo puede eliminarse; la línea de factura conserva el histórico.
CONSTRAINT invoice_lines_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES catalog.products(id)
  ON DELETE SET NULL
```

#### NO ACTION — usar para trazabilidad sin protección activa
```sql
-- El asiento contable debe mantener la referencia al proyecto, pero no impide borrado.
CONSTRAINT journal_entries_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects.projects(id)
  ON DELETE NO ACTION
```

#### CASCADE — solo hijos directos del mismo schema
```sql
-- Las notas de una location son hijos directos. Si se borra la location, no tienen sentido.
-- CORRECTO porque es intra-schema (crm→crm).
CONSTRAINT location_notes_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES crm.location(id)
  ON DELETE CASCADE

-- INCORRECTO — CASCADE cross-schema (borrar usuario elimina sus locations de prospección).
-- Este bug existió y fue corregido el 2026-03-26.
-- CONSTRAINT location_created_by_fkey
--   FOREIGN KEY (created_by) REFERENCES internal.authorized_users(id)
--   ON DELETE CASCADE  ← NUNCA para cross-schema
```

### Regla de oro para cross-schema

> **Nunca usar `ON DELETE CASCADE` en FKs cross-schema.**
> El cascade cross-schema es casi siempre un bug: destruye datos en un schema
> como efecto secundario de una operación en otro schema diferente.
> Usar `SET NULL` si el registro hijo puede existir sin el padre,
> o `RESTRICT`/`NO ACTION` si no puede.

---

## 3. Obligación de documentar

Toda FK cross-schema nueva debe documentarse en **dos lugares**:

### 3.1 COMMENT ON CONSTRAINT (catálogo de PostgreSQL)

Ejecutar inmediatamente después de crear el constraint:

```sql
COMMENT ON CONSTRAINT <nombre_constraint> ON <schema>.<tabla> IS
  'FK cross-schema: <schema_origen>.<tabla>.<columna> -> <schema_destino>.<tabla>.id | '
  'ON DELETE <REGLA> | '
  'Propósito: <descripción funcional>';
```

Verificar que el comentario se guardó:
```sql
SELECT obj_description(con.oid, 'pg_constraint') AS comentario
FROM pg_constraint con
WHERE con.conname = '<nombre_constraint>';
```

### 3.2 DATABASE_RELATIONS.xlsx

Abrir `docs/architecture/DATABASE_RELATIONS.xlsx` y añadir la nueva fila en la hoja "Relaciones" con:
- Schema origen, Tabla origen, Columna FK
- Schema destino, Tabla destino
- Constraint name
- ON DELETE rule
- Descripción funcional

Regenerar el Excel si se usa `docs/architecture/generate_db_relations.py`:
```bash
python docs/architecture/generate_db_relations.py
```

---

## 4. Template de COMMENT ON CONSTRAINT

```sql
-- Template estándar para FKs cross-schema en NEXO AV
COMMENT ON CONSTRAINT <constraint_name>
  ON <schema_origen>.<tabla_origen> IS
  'FK cross-schema: <schema_origen>.<tabla_origen>.<columna_fk> -> <schema_destino>.<tabla_destino>.id | '
  'ON DELETE <NO ACTION|RESTRICT|SET NULL|CASCADE> | '
  'Propósito: <descripción funcional en términos de negocio>';
```

### Ejemplo completo

```sql
COMMENT ON CONSTRAINT invoices_client_id_fkey
  ON sales.invoices IS
  'FK cross-schema: sales.invoices.client_id -> crm.clients.id | '
  'ON DELETE RESTRICT | '
  'Propósito: factura emitida al cliente CRM; RESTRICT impide borrar un cliente que tenga facturas — protección obligatoria para integridad fiscal';
```

### Convenciones de redacción

- **Línea 1**: `FK cross-schema: <origen> -> <destino>` — identificación exacta
- **Línea 2**: `ON DELETE <REGLA>` — siempre explícito
- **Línea 3**: `Propósito: <texto>` — en términos de negocio, no técnicos
- Si el constraint fue corregido, añadir línea: `Corregido <fecha>: <motivo>`

---

## 5. Checklist de PR review para migraciones con FKs

Antes de aprobar cualquier PR que incluya `ADD CONSTRAINT ... FOREIGN KEY` cross-schema:

### Verificaciones obligatorias

- [ ] **Delete rule documentada**: ¿Está explicitada la regla (`ON DELETE ...`)? Sin ella, PostgreSQL usa `NO ACTION` por defecto — ¿es eso lo que se quiere?
- [ ] **No CASCADE cross-schema**: ¿El constraint usa `ON DELETE CASCADE` y las tablas están en schemas distintos? Si sí → rechazar y justificar el cambio
- [ ] **Nullable coherente**: Si la regla es `SET NULL`, ¿la columna FK es nullable (`ALTER COLUMN ... DROP NOT NULL` previo o `DEFAULT NULL`)?
- [ ] **Tabla hub protegida**: Si la tabla destino es hub (`authorized_users`, `clients`, `projects`, `products`, `suppliers`), ¿la delete rule es conservadora (NO ACTION o RESTRICT, no CASCADE)?
- [ ] **COMMENT añadido**: ¿La migración incluye `COMMENT ON CONSTRAINT` con el template estándar?
- [ ] **DATABASE_RELATIONS.xlsx actualizado**: ¿Se ha añadido la entrada al Excel?
- [ ] **Idempotente**: ¿La migración usa `IF NOT EXISTS` o `DROP CONSTRAINT IF EXISTS` antes de crear?

### Query de auditoría post-merge

Ejecutar en producción después de hacer merge, para confirmar que no se coló ningún CASCADE cross-schema:

```sql
SELECT
  n_from.nspname||'.'||c_from.relname AS tabla_origen,
  a.attname AS columna_fk,
  con.conname,
  n_to.nspname||'.'||c_to.relname AS tabla_destino,
  CASE con.confdeltype WHEN 'c' THEN '⚠️ CASCADE' ELSE 'OK' END AS alerta
FROM pg_constraint con
JOIN pg_class c_from ON con.conrelid = c_from.oid
JOIN pg_namespace n_from ON c_from.relnamespace = n_from.oid
JOIN pg_class c_to ON con.confrelid = c_to.oid
JOIN pg_namespace n_to ON c_to.relnamespace = n_to.oid
JOIN pg_attribute a ON a.attrelid = c_from.oid AND a.attnum = ANY(con.conkey)
WHERE con.contype = 'f'
  AND n_from.nspname != n_to.nspname
  AND con.confdeltype = 'c'  -- solo CASCADE
  AND n_from.nspname NOT IN ('pg_catalog','information_schema','public')
ORDER BY n_from.nspname, c_from.relname;
-- Resultado esperado: 0 filas (ningún CASCADE cross-schema en schemas de negocio)
```

---

## Registro de incidentes

| Fecha | Constraint | Problema | Solución | Migración |
|---|---|---|---|---|
| 2026-03-26 | `location_created_by_fkey` | `ON DELETE CASCADE` cross-schema: borrar usuario eliminaba todas sus locations de prospección | Cambiado a `ON DELETE SET NULL` + `created_by` made nullable | `20260326120000_fix_location_created_by_cascade` |

---

## Inventario rápido de FKs cross-schema (Bloque A — 19 críticas)

Ver detalles completos en `docs/architecture/orm_coverage_report.md` y `docs/architecture/document_cross_schema_fks.sql`.

| Schema Origen | Tabla | Columna | Schema Destino | Tabla Destino | ON DELETE |
|---|---|---|---|---|---|
| accounting | credit_installments | bank_account_id | internal | company_bank_accounts | NO ACTION |
| accounting | journal_entries | project_id | projects | projects | NO ACTION |
| accounting | partner_compensation_runs | partner_id | internal | partners | NO ACTION |
| accounting | payroll_payments | company_bank_account_id | internal | company_bank_accounts | NO ACTION |
| accounting | payroll_payments | partner_compensation_run_id | internal | partner_compensation_runs | NO ACTION |
| accounting | payroll_runs | employee_id | internal | employees | NO ACTION |
| catalog | products | supplier_id | internal | suppliers | SET NULL |
| internal | partner_compensation_runs | journal_entry_id | accounting | journal_entries | NO ACTION |
| projects | projects | client_id | crm | clients | NO ACTION |
| projects | projects | quote_id | quotes | quotes | SET NULL |
| quotes | quotes | project_id | projects | projects | SET NULL |
| sales | invoice_lines | product_id | catalog | products | SET NULL |
| sales | invoices | client_id | crm | clients | **RESTRICT** |
| sales | invoices | project_id | projects | projects | SET NULL |
| sales | invoices | source_quote_id | quotes | quotes | SET NULL |
| sales | purchase_invoices | project_id | projects | projects | NO ACTION |
| sales | purchase_invoices | supplier_id | internal | suppliers | NO ACTION |
| sales | purchase_orders | project_id | projects | projects | SET NULL |
| sales | purchase_orders | supplier_id | internal | suppliers | SET NULL |
