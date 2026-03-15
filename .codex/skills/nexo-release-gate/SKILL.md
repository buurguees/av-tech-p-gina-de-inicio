---
name: nexo-release-gate
description: Ejecuta un gate de calidad previo a merge/deploy en NEXO AV, validando código, migraciones, seguridad, reglas de negocio y documentación.
---

# NEXO Release Gate

## Guía para agentes

| | |
|---|---|
| **Cuándo cargar** | Antes de abrir PR final; antes de merge a rama principal; antes de despliegue a producción; en fixes sensibles (contabilidad, auth, RLS, migraciones, SharePoint sync). |
| **Cuándo NO cargar** | Cambios triviales sin impacto; tareas de documentación pura sin deploy. |
| **Integración .codex** | Si el gate detecta bloqueos, registrar causa y solución en `.codex/errores-soluciones.md`; si se añade nuevo criterio de gate, en `.codex/avances.md`. |

---

## Objetivo

Bloquear merges o despliegues que no cumplan criterios mínimos de calidad, seguridad y consistencia funcional en NEXO AV.

## Niveles de gate

| Nivel | Cuándo usar |
|-------|-------------|
| `fast` | Cambios pequeños sin impacto de datos. |
| `standard` | Cambios funcionales normales. |
| `strict` | Cambios de contabilidad, seguridad, auth/RLS o migraciones. |

---

## Checklist técnico mínimo

- [ ] `npm run lint` sin errores nuevos.
- [ ] `npm run build` exitoso.
- [ ] No se introducen secrets en código ni commits.
- [ ] Cambios tipados y sin errores obvios de runtime.

---

## Checklist de base de datos (si aplica)

- [ ] Migraciones con naming válido y timestamp único.
- [ ] Sin archivos temporales en `supabase/migrations/`.
- [ ] Drift remoto/local revisado (`npx supabase migration list --linked`).
- [ ] Cambios destructivos con plan de rollback.
- [ ] RPC/RLS revisados para mínimo privilegio.

---

## Checklist de negocio (si aplica)

- [ ] Se respeta separación `doc_status` vs `payment_status`.
- [ ] No se rompe inmutabilidad de documentos emitidos/aprobados.
- [ ] Periodos cerrados siguen protegidos.
- [ ] Totales/impuestos mantienen coherencia.

---

## Checklist SharePoint (si aplica)

- [ ] Rutas y naming alineados con documento canónico.
- [ ] Metadatos mínimos presentes.
- [ ] No se archiva contenido sensible fuera de ruta autorizada.
- [ ] No hay drift entre ERP transaccional y archivo documental.

---

## Checklist documental

- [ ] Cambio relevante documentado en `docs/` cuando corresponde.
- [ ] Se explican riesgos y límites conocidos.
- [ ] Plan de verificación incluido en PR o informe.

---

## Criterios de bloqueo automático

Bloquear release si ocurre cualquiera:

- Lint/build fallan.
- RLS expone datos no autorizados.
- Migración inválida o drift sin resolver.
- Regresión en reglas contables críticas.
- Secrets expuestos.

---

## Evidencia mínima de salida

```markdown
## Release Gate Result
- Nivel: <fast|standard|strict>
- Estado final: <PASS|FAIL>
- Bloqueos:
  1. <si aplica>
- Verificaciones ejecutadas:
  - lint: <ok/fail>
  - build: <ok/fail>
  - db: <ok/fail/na>
  - negocio: <ok/fail/na>
  - sharepoint: <ok/fail/na>
- Riesgo residual: <bajo/medio/alto>
- Decisión recomendada: <merge/deploy | corregir y revalidar>
```

---

## Persistencia de memoria (obligatoria)

Tras ejecutar el gate:

- Registrar resultado en `.codex/avances.md` si el gate pasa y se desbloquea capacidad.
- Registrar bloqueos y soluciones en `.codex/errores-soluciones.md` cuando aplique.
