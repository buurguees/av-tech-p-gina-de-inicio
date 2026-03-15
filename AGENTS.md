# Reglas Operativas para Codex y Agents

Este repositorio es la fuente de verdad de la web corporativa AV TECH y del ERP NEXO AV.

## Principios obligatorios

1. **Repo-first**: cualquier cambio se hace primero en archivos del repositorio.
2. **Prohibido hotfix directo** en producción sin reflejarlo en repo.
3. **Sin secretos en git**: usar `.env.example` y variables reales solo en entorno o gestor de secretos.
4. **Antes de aplicar cambios sensibles**, validar impacto en desktop, mobile y reglas de negocio.
5. **Priorizar dry-run o simulación** cuando exista flujo de despliegue o migraciones.

## Flujo de trabajo

1. Modificar o crear archivos en repo.
2. Revisar impacto en `src/App.tsx`, páginas desktop/mobile y constantes de negocio.
3. Validar y revisar cambios localmente (lint, build).
4. Si hay migraciones Supabase, seguir `.codex/skills/` o `supabase-migration-hygiene`.
5. Verificar que no se rompan flujos de facturación, compras, pagos ni inmutabilidad documental.

## Reglas de negocio NEXO AV

- Separar siempre: `doc_status` (estado documental), `payment_status` (estado económico calculado), categorías contables.
- `payment_status` no es editable manualmente; es derivado.
- No permitir cambios que rompan inmutabilidad de documentos emitidos/aprobados.
- No permitir cambios que ignoren periodos cerrados.
- Fuente de verdad: `docs/important/estados-nexo.md`, `src/constants/`.

## Regla anti-drift

Si se detecta que el estado real (BD, SharePoint, Firebase) difiere del repo:

1. Traer la diferencia al repositorio.
2. Revisar/aprobar el cambio.
3. Documentar en `.codex/errores-soluciones.md` si fue un incidente.

### Regla específica Supabase / sistemas vivos

Antes de ejecutar cambios en datos o esquema:

1. Revisar migraciones existentes y RPCs afectadas.
2. Contrastar con documentación en `docs/important/`.
3. No asumir que el repo local refleja el estado actual de producción sin validar.

## Registro obligatorio de errores y soluciones

Cada vez que se resuelva un error, registrar obligatoriamente en `.codex/errores-soluciones.md`:

1. Fecha.
2. Contexto del error.
3. Causa raíz.
4. Solución aplicada.
5. Validación realizada.
6. Medidas para evitar recurrencia.

Este archivo se carga obligatoriamente al abrir cada chat.

## Registro obligatorio de avances

Cada vez que se desbloquee una capacidad relevante, una nueva función reutilizable o conocimiento operativo estable, registrar en `.codex/avances.md`:

1. Fecha.
2. Contexto.
3. Capacidad desbloqueada.
4. Impacto operativo.
5. Archivos o componentes implicados.
6. Validación realizada.
7. Cómo reutilizarlo en el futuro.

Este archivo se carga obligatoriamente al abrir cada chat.

## Skills de agentes (ruta canónica)

La ubicación canónica de skills es `.codex/skills/`. Cada skill tiene su `SKILL.md` en `.codex/skills/<skill>/SKILL.md`.

Reglas obligatorias:

1. Al iniciar chat, cargar siempre `.codex/skills/INDEX.md` para resolver qué skill aplicar.
2. Cargar después solo el `SKILL.md` estrictamente necesario para la tarea (carga contextual, no masiva).
3. Si una tarea mezcla dominios (por ejemplo Supabase + SharePoint), cargar los skills mínimos de cada dominio.
4. Cada skill incluye una "Guía para agentes" con cuándo usarla y cómo integrar con `errores-soluciones.md` y `avances.md`.

## Documentos operativos recomendados

- Reglas de negocio: `docs/important/estados-nexo.md`
- Arquitectura: `docs/important/ARQUITECTURA_PROYECTO_NEXO_AV.md`
- Reglas Cursor: `.cursor/rules/` (00-repo-context, 10-business-invariants, 20-execution-guardrails, 40-cross-version-review)
- SharePoint: `docs/sharepoint/` y skill `nexo-sharepoint-documental`
