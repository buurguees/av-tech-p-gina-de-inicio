---
name: nexo-release-gate
description: Ejecuta un gate de calidad previo a merge/deploy en NEXO AV, validando codigo, migraciones, seguridad, reglas de negocio y documentacion.
---

# NEXO Release Gate

## Objetivo
Bloquear merges o despliegues que no cumplan criterios minimos de calidad, seguridad y consistencia funcional en NEXO AV.

## Cuando usar esta skill
- Antes de abrir PR final.
- Antes de merge a rama principal.
- Antes de despliegue a entorno productivo.
- En fixes sensibles (contabilidad, auth, RLS, migraciones, SharePoint sync).

## Niveles de gate
- `fast`: cambios pequenos sin impacto de datos.
- `standard`: cambios funcionales normales.
- `strict`: cambios de contabilidad, seguridad, auth/RLS o migraciones.

## Checklist tecnico minimo
- [ ] `npm run lint` sin errores nuevos.
- [ ] `npm run build` exitoso.
- [ ] No se introducen secrets en codigo ni commits.
- [ ] Cambios tipados y sin errores obvios de runtime.

## Checklist de base de datos (si aplica)
- [ ] Migraciones con naming valido y timestamp unico.
- [ ] Sin archivos temporales en `supabase/migrations/`.
- [ ] Drift remoto/local revisado (`npx supabase migration list --linked`).
- [ ] Cambios destructivos con plan de rollback.
- [ ] RPC/RLS revisados para minimo privilegio.

## Checklist de negocio (si aplica)
- [ ] Se respeta separacion `doc_status` vs `payment_status`.
- [ ] No se rompe inmutabilidad de documentos emitidos/aprobados.
- [ ] Periodos cerrados siguen protegidos.
- [ ] Totales/impuestos mantienen coherencia.

## Checklist SharePoint (si aplica)
- [ ] Rutas y naming alineados con documento canonico.
- [ ] Metadatos minimos presentes.
- [ ] No se archiva contenido sensible fuera de ruta autorizada.
- [ ] No hay drift entre ERP transaccional y archivo documental.

## Checklist documental
- [ ] Cambio relevante documentado en `docs/` cuando corresponde.
- [ ] Se explican riesgos y limites conocidos.
- [ ] Plan de verificacion incluido en PR o informe.

## Criterios de bloqueo automatico
Bloquear release si ocurre cualquiera:
- Lint/build fallan.
- RLS expone datos no autorizados.
- Migracion invalida o drift sin resolver.
- Regresion en reglas contables criticas.
- Secrets expuestos.

## Evidencia minima de salida
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
- Decision recomendada: <merge/deploy | corregir y revalidar>
```

## Persistencia de memoria (obligatoria)
Tras ejecutar el gate:
- Actualizar `.agents/memories/CURRENT_STATE.md` con estado final.
- Registrar handover de la sesion en `.agents/memories/YYYY-MM-DD_*.md` cuando haya cambios relevantes.
