# Decisiones de Diseño: Automatización de Nóminas de Socios

Este documento recoge las decisiones de diseño adoptadas para la automatización de nóminas de socios y las garantías de consistencia.

---

## 1. Regla clave: M-1 cerrado

**Decisión**: Si `bonus_requires_closed_period = true` → **NO** crear nóminas automáticamente hasta que M-1 esté cerrado.

**Modo STRICT_CLOSED_REQUIRED** (recomendado): La generación automática solo corre cuando el período de referencia (M-1) está cerrado (si se requiere cierre). Evita el caso "se generó base sin bonus y luego alguien se olvida de recalcular".

---

## 2. Piezas implementadas

### 2.1 RPC `generate_partner_compensations_for_month(p_year, p_month, p_mode)`

- **p_mode**: `STRICT_CLOSED_REQUIRED` (recomendado) | `BASE_ONLY_IF_NOT_CLOSED`
- **Retorno**: `created_count`, `skipped_existing_count`, `skipped_inactive_count`, `created_ids`, `skips`
- **Ventaja**: Atómico y controlado. Mejor que llamar en bucle desde frontend (evita timeouts y parcialidad).

### 2.2 Idempotencia / anti-duplicados

- **Constraint**: `UNIQUE (partner_id, period_year, period_month)` en `internal.partner_compensation_runs`
- **Garantía**: Da igual cuántas veces se pulse el botón o corra el cron, no se duplican nóminas.

### 2.3 Traza de policy aplicada

Columnas en `partner_compensation_runs`:
- `base_amount`, `productivity_bonus`
- `bonus_reference_year`, `bonus_reference_month`, `bonus_reference_net_profit`
- `bonus_percent_applied`, `bonus_cap_applied`, `bonus_policy_version`

**Objetivo**: Responder "¿por qué cobró X este socio?" con datos cerrados.

### 2.4 RPC `recalculate_partner_compensation_run(p_run_id)`

- **Condición**: Solo si estado = DRAFT
- **Acción**: Vuelve a leer settings actuales, recalcula base+bonus, actualiza el run
- **Evita**: Borrar y recrear (más sucio) e inconsistencias en UI

---

## 3. Automatización: botón vs cron

### Opción A — Botón "Generar nóminas del mes" ✅ Implementado

- **Ubicación**: AccountingPage → pestaña Retribuciones
- **UX**: Seleccionas mes (filtro existente) → Botón "Generar DRAFT de socios (M/YYYY)"
- **Resultado**: Toast con "Creadas X, omitidas Y (ya existían)" o mensaje de error si M-1 no cerrado

### Opción B — Cron / Edge Function (pendiente)

- **Trigger recomendado**: No el día 1. Mejor: "cuando cierres M-1" → generar M automáticamente.
- **Coherencia**: Alineado con `bonus_requires_closed_period`.

---

## 4. Garantías de consistencia

| Garantía | Implementación |
|----------|----------------|
| **Anti-duplicados** | `UNIQUE (partner_id, period_year, period_month)` |
| **Generación bulk** | Una sola RPC `generate_partner_compensations_for_month` evita parcialidad |
| **Trazabilidad** | `policy_version` y `reference_year/month/net_profit` guardados |
| **Recalcular solo DRAFT** | `recalculate_partner_compensation_run` bloquea si no es DRAFT |
| **Inmutabilidad POSTED** | Trigger `trg_prevent_locked_compensation_modification` |

---

## 5. Flujo operativo

1. **Configuración**: Sueldo base y % de pluses en `payroll_settings` y `partner_payroll_profiles`
2. **Cierre M-1**: Cerrar mes anterior en ReportsPage (cuando esté implementado)
3. **Generar**: Botón "Generar DRAFT de socios" en AccountingPage → Retribuciones
4. **Revisar**: Revisar DRAFTs generados (opcional: Recalcular si cambió config)
5. **Postear**: Aprobar cada retribución → POSTED (inmutable)
6. **Pagar**: Registrar pago cuando corresponda
