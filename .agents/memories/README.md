# NEXO AV Agent Memories

Este directorio guarda memoria operativa para agentes sobre:
- cambios recientes del repo,
- estado tecnico conocido (riesgos, drift, decisiones),
- handovers para evitar re-analisis repetitivo.

## Uso recomendado
1. Leer `CURRENT_STATE.md` al iniciar tareas.
2. Revisar la memoria diaria mas reciente (`YYYY-MM-DD_*.md`).
3. Validar si hay cambios nuevos con `git status` y `git log`.
4. Si se realizan cambios relevantes, actualizar memoria diaria e indice.

## Archivos clave
- `CURRENT_STATE.md`: estado resumido vigente.
- `2026-03-03_changes_handover_yesterday_today.md`: detalle de cambios de ayer/hoy.

## Regla
Si una decision no esta reflejada en memoria o en skill, se considera no institucionalizada.
