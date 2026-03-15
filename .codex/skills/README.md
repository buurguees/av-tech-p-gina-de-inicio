# Skills de .codex

## Qué son las skills

Las skills son guías especializadas que los agentes cargan **bajo demanda** según el tipo de tarea. Cada skill contiene:

- **Guía para agentes**: cuándo cargarla, cuándo NO cargarla, integración con `.codex/errores-soluciones.md` y `.codex/avances.md`
- **Contenido operativo**: reglas, checklists, flujos y formatos de salida
- **Referencias**: rutas de archivos, fuentes de verdad, documentación canónica

## Cómo usar las skills

1. **Al iniciar chat**, leer `.codex/errores-soluciones.md`, `.codex/avances.md` y `.codex/skills/INDEX.md`.
2. **Identificar la tarea** y elegir el skill más específico del INDEX.
3. **Cargar solo ese SKILL.md** (no todos). Ejemplo: `.codex/skills/supabase-migration-hygiene/SKILL.md`.
4. **Si la tarea mezcla dominios** (p.ej. Supabase + SharePoint), cargar los skills mínimos de cada dominio.
5. **Al cerrar**, registrar errores corregidos en `errores-soluciones.md` y avances en `avances.md` según indique la skill.

## Estructura de cada skill

```
.codex/skills/<skill-name>/
└── SKILL.md
```

Cada `SKILL.md` incluye al inicio una tabla **Guía para agentes** con:

| Campo | Descripción |
|-------|-------------|
| Cuándo cargar | Situaciones en las que esta skill es relevante |
| Cuándo NO cargar | Situaciones en las que no aporta valor |
| Integración .codex | Cómo registrar errores/avances al usar esta skill |

## Skills disponibles

Ver `.codex/skills/INDEX.md` para el mapa completo de selección por dominio (Supabase, frontend, SharePoint, contabilidad, seguridad, etc.).

## Relación con .agents y .cursor

- **`.codex/skills/`** = ruta canónica. Skills migradas desde `.agents/` con estructura mejorada.
- **`.cursor/skills/`** = skills de frontend/feature/workflow que se mantienen; el INDEX las referencia.
- **`.agents/skills/`** = legacy; no usar como fuente activa cuando exista equivalente en `.codex/skills/`.
