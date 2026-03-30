# Risks Remediation Report — Área 2: Riesgos Activos de Integridad

> Generado: 2026-03-26
> Proyecto: NEXO AV — takvthfatlcjsqgssnta
> Alcance: 3 riesgos identificados en el análisis de integridad referencial

---

## Resumen ejecutivo

| Riesgo | Severidad | Estado | Acción |
|---|---|---|---|
| 2.1 CASCADE destructivo en `crm.location` | CRÍTICA | **CORREGIDO** (Área 1, 2026-03-26) | Migración aplicada |
| 2.2 RESTRICT oculto en `sales.invoices` | MEDIA | **PENDIENTE confirmación** | Trigger anti-hard-delete listo |
| 2.3 Tabla duplicada `partner_compensation_runs` | ALTA | **PENDIENTE confirmación** | Plan SQL completo generado |

---

## Riesgo 2.1 — CASCADE destructivo

### Problema
`crm.location.created_by` → `internal.authorized_users.id` tenía `ON DELETE CASCADE`.
Borrar un usuario eliminaba en cascada todas las locations de prospección que había creado (86 columnas de datos comerciales).

### Estado: CORREGIDO
- Migración: `fix_location_created_by_cascade` aplicada en producción
- Nuevo comportamiento: `ON DELETE SET NULL` — la location sobrevive con `created_by = NULL`
- Columna `created_by` cambiada a nullable (no rompe INSERTs — `create_canvassing_location` siempre provee valor)
- Verificado post-fix: `confdeltype = 'n'` (SET NULL) confirmado

### Archivos
- `docs/architecture/fix_cascade_location.sql` — referencia documentada
- Migración remota aplicada vía MCP `apply_migration`

---

## Riesgo 2.2 — RESTRICT oculto en ventas → clientes

### Problema
`sales.invoices.client_id` → `crm.clients.id` tiene `ON DELETE RESTRICT` (correcto como regla de negocio), pero:
1. No estaba documentado → scripts de limpieza fallan con error críptico de FK
2. No hay trigger que impida DELETE físico con mensaje claro
3. `deleted_at` existe en `crm.clients` pero no se usa (0 clientes soft-deleted)

### Diagnóstico (2026-03-26)

| Métrica | Valor |
|---|---|
| Clientes activos | 12 |
| Clientes soft-deleted | 0 |
| RLS DELETE | Solo `internal.is_admin()` |
| Trigger anti-hard-delete | **NO EXISTE** |

Triggers existentes en `crm.clients`:
- `audit_clients` — auditoría
- `set_client_number` — genera número de cliente
- `trigger_update_client_profile_score` — perfil scoring

### Solución propuesta
1. Trigger `no_hard_delete_clients` que bloquea DELETE con mensaje claro indicando usar soft delete
2. Función `crm.prevent_client_hard_delete()` con `RAISE EXCEPTION` informativo
3. El trigger se puede desactivar temporalmente para migraciones

### Estado: PENDIENTE confirmación
El SQL está listo en `docs/architecture/fix_restrict_clients.sql`. Requiere confirmación antes de ejecutar.

### Impacto
- **Sin impacto en UI** — ningún flujo del frontend hace DELETE de clientes
- **Sin impacto en RPCs** — ninguna RPC borra clientes físicamente
- **Protección adicional** — si alguien ejecuta DELETE directo en psql, recibirá un mensaje claro

---

## Riesgo 2.3 — Tabla duplicada partner_compensation_runs

### Problema
Existen dos tablas casi idénticas:

| Aspecto | `accounting.partner_compensation_runs` | `internal.partner_compensation_runs` |
|---|---|---|
| Columnas | 29 | 25 |
| Filas (2026-03-26) | **0** | **6** (ene-mar 2026) |
| Columnas exclusivas | `is_locked`, `period_was_locked`, `pnl_reference_*` (3) | `ss_regime` |
| Columnas comunes | 24 | 24 |
| Referenciada por RPCs | SI (tabla canónica para código) | NO |
| FK entrantes (payroll_payments) | NO | **SI** (datos reales) |
| FK partner_id ON DELETE | NO ACTION | **RESTRICT** |

### Divergencia activa
- Las **RPCs** (`create_partner_compensation`, `list_partner_compensations`, `check_month_closure_readiness`) leen/escriben en `accounting` → 0 filas
- Los **payroll_payments** (4 pagos) apuntan vía FK a `internal` → 6 filas
- Las liquidaciones creadas por RPC van a `accounting`, pero los pagos existentes están vinculados a `internal`
- **Los dos mundos no se cruzan** — cada tabla opera en aislamiento

### Plan de consolidación

**Dirección**: `internal` → `accounting` (tabla canónica por dominio y por RPCs)

| Fase | Operación | Riesgo |
|---|---|---|
| 1. Preparación | Añadir `ss_regime` a `accounting` | Ninguno (ADD COLUMN) |
| 2. Migración | INSERT 6 filas de `internal` → `accounting` | Bajo (WHERE NOT EXISTS) |
| 3. FK redirect | Redirigir `payroll_payments` FK a `accounting` | Medio (ventana breve sin FK) |
| 4. Validación | Verificar integridad referencial | Ninguno (solo SELECT) |
| 5. Limpieza | Renombrar/DROP tabla `internal` | Bajo (después de validación) |

### Diferencias de constraint entre tablas

| Constraint | `accounting` | `internal` |
|---|---|---|
| `partner_id` FK ON DELETE | NO ACTION | **RESTRICT** |
| `paid_amount` nullable | NOT NULL (default 0) | YES |
| `created_at` nullable | YES | NOT NULL |
| `updated_at` nullable | YES | NOT NULL |

La migración debe respetar los NOT NULL de accounting (`paid_amount` → `COALESCE(i.paid_amount, 0)`).

### Estado: PENDIENTE confirmación
El SQL completo está en `docs/architecture/consolidate_partner_compensation_runs.sql`.
Fases 1-4 pueden ejecutarse en una transacción. Fase 5 (DROP) solo después de 1 semana de validación.

---

## Archivos generados

| Archivo | Riesgo | Estado |
|---|---|---|
| `docs/architecture/fix_cascade_location.sql` | 2.1 | Referencia (ya aplicado en Área 1) |
| `docs/architecture/fix_restrict_clients.sql` | 2.2 | Listo para ejecutar |
| `docs/architecture/consolidate_partner_compensation_runs.sql` | 2.3 | Listo para ejecutar |
| `docs/architecture/risks_remediation_report.md` | Todos | Este archivo |

---

## Próximos pasos

1. **Riesgo 2.2**: Confirmar y ejecutar trigger anti-hard-delete en `crm.clients`
2. **Riesgo 2.3**: Confirmar y ejecutar consolidación de `partner_compensation_runs`
   - Antes de la Fase 3 (FK redirect): verificar que no hay código frontend que referencie `internal.partner_compensation_runs` directamente
   - Después de Fase 4: validar que las RPCs funcionan correctamente con los datos migrados
3. **Riesgo 2.3 — Fase 5**: Esperar 1 semana, luego renombrar y eventualmente DROP
