---
name: supabase-migration-hygiene
description: Estandariza la creacion, validacion y despliegue de migraciones Supabase en NEXO AV, evitando drift, timestamps duplicados y errores de ejecucion.
---

# Supabase Migration Hygiene

## Objetivo
Mantener un historial de migraciones limpio, trazable y desplegable en Supabase (local y remoto), con foco en seguridad operativa y cero drift no controlado.

## Cuando usar esta skill
- Al crear nuevas migraciones SQL.
- Antes de ejecutar `db push` o `migration up`.
- Cuando `supabase db push --linked` falle por drift.
- Cuando existan archivos `temp_*` o nombres no validos.

## Cuando NO usar esta skill
- Consultas SQL ad hoc sin tocar historial de migraciones.
- Cambios de frontend que no alteren esquema/funciones/RLS.

## Reglas base (obligatorias)
- En este repo, ejecutar CLI con `npx supabase` (no asumir CLI global).
- En PowerShell, evitar `&&`; usar comandos separados o `;`.
- Nombre de migracion obligatorio: `<timestamp>_descripcion.sql`.
- No usar archivos temporales dentro de `supabase/migrations/`.
- No usar timestamps duplicados.
- No ejecutar `migration repair` sin evidencias y plan de rollback.

## Flujo estandar
1. Validar entorno:
   - `npx supabase --version`
   - `npx supabase migration list --linked`
2. Higiene de carpeta `supabase/migrations/`:
   - Detectar nombres invalidos.
   - Detectar timestamps duplicados.
3. Crear migracion nueva:
   - `npx supabase migration new <descripcion_kebab_case>`
4. Editar SQL y validar localmente.
5. Revisar drift remoto/local antes de push.
6. Ejecutar deploy de migracion de forma controlada.
7. Verificar estado final y registrar evidencia.

## Checklist de validacion previa
- [ ] `npx supabase` operativo.
- [ ] Sin archivos no validos en `supabase/migrations/`.
- [ ] Sin timestamps repetidos.
- [ ] `migration list --linked` revisado.
- [ ] Cambio descrito y acotado (tablas/RPC/policies afectadas).
- [ ] Plan de rollback definido para cambios de alto impacto.

## Protocolo de drift
Si aparece `Remote migration versions not found in local migrations directory`:
1. No forzar deploy inmediato.
2. Guardar evidencia (`migration list --linked`).
3. Elegir estrategia:
   - **Alineacion por pull**: `npx supabase db pull` (recomendado para recuperar base real).
   - **Repair controlado**: `npx supabase migration repair ...` solo con lista validada.
4. Revalidar listado local/remoto.
5. Ejecutar push solo cuando el historial este consistente.

## Anti-patrones prohibidos
- Subir `temp_*.sql` al historial oficial.
- Resolver errores renombrando aleatoriamente muchas migraciones sin trazabilidad.
- Reparar cientos de versiones sin documentar criterio.
- Mezclar cambios de schema masivos con cambios de datos sin plan.

## Formato de salida recomendado
```markdown
- Estado CLI: <ok/fallo>
- Estado migraciones: <limpio/con incidencias>
- Incidencias detectadas:
  1. <tipo> - <archivo/version>
- Riesgo: <bajo/medio/alto>
- Accion recomendada:
  1. <paso 1>
  2. <paso 2>
- Comando seguro siguiente: <comando>
```

## Definition of Done
- [ ] Historial local con nombres validos y sin duplicados.
- [ ] Sin drift bloqueante no resuelto.
- [ ] Migracion nueva creada con timestamp unico.
- [ ] Evidencia de validacion antes/despues.
