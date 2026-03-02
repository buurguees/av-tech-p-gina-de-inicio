---
name: security-checks
description: Ejecuta comprobaciones de seguridad en proyectos web (secretos, dependencias, configuración, auth y hardening básico) y entrega hallazgos priorizados con plan de remediación.
---

# Security Checks

## Objetivo
Detectar riesgos de seguridad comunes en el proyecto y reportarlos por severidad, con acciones concretas para corregirlos.

## Cuándo usar esta skill
- El usuario pide una revisión de seguridad.
- Hay cambios en auth, permisos, backend o variables sensibles.
- Antes de despliegue a producción.
- Después de añadir nuevas dependencias.

## Cuándo NO usar esta skill
- Tareas de UI puramente visual sin impacto técnico.
- Refactors de estilo/formato sin cambios de comportamiento.
- Consultas funcionales que no impliquen seguridad.

## Alcance
Esta skill cubre controles de seguridad prácticos en un proyecto web:
- Exposición de secretos.
- Riesgos en dependencias.
- Configuración insegura en frontend/backend.
- Controles básicos de autenticación/autorización.
- Hardening general y reporte final.

## Flujo recomendado
1. Revisar contexto y superficies de ataque del cambio.
2. Comprobar secretos y manejo de credenciales.
3. Auditar dependencias y vulnerabilidades conocidas.
4. Revisar configuración y controles de acceso.
5. Verificar hardening mínimo de ejecución.
6. Entregar hallazgos priorizados + plan de corrección.

## 1) Secretos y credenciales
Checklist:
- [ ] No hay claves privadas, tokens ni passwords en código/versionado.
- [ ] `.env` está ignorado y existe `.env.example` sin secretos reales.
- [ ] Logs/salidas no exponen credenciales completas.
- [ ] Tokens y secretos usan variables de entorno, nunca hardcode.

Patrones típicos a vigilar:
- API keys (`AIza`, `sk_`, `ghp_`, `xoxb-`, etc.).
- JWT secretos (`JWT_SECRET`, `ACCESS_TOKEN_SECRET`).
- URLs con credenciales embebidas.
- Credenciales cloud (AWS/GCP/Supabase service role).

## 2) Dependencias
Acciones recomendadas:
- Ejecutar auditoría de vulnerabilidades del lockfile/árbol de paquetes.
- Identificar severidad (`critical`, `high`, `moderate`, `low`) y rutas de dependencia.
- Priorizar upgrades seguros en `critical/high`.
- Confirmar que no se introdujeron paquetes obsoletos/sin mantenimiento.

Notas:
- No aplicar fixes masivos destructivos sin validar impacto.
- Si hay conflicto, proponer alternativa concreta (pin, reemplazo, patch selectivo).

## 3) Configuración y superficie pública
Checklist:
- [ ] Variables de cliente (prefijo público) no contienen secretos.
- [ ] Endpoints sensibles requieren autenticación.
- [ ] No hay modo debug en producción.
- [ ] CORS está restringido (no wildcard abierto en producción).
- [ ] Se validan entradas del usuario (server-side siempre).

## 4) Autenticación y autorización
Verificaciones mínimas:
- [ ] Validación de sesión/token en cada endpoint protegido.
- [ ] Control de roles/permisos en backend, no solo frontend.
- [ ] Operaciones críticas protegidas frente a elevación de privilegios.
- [ ] Mensajes de error no filtran información sensible.

## 5) Hardening básico
Checklist:
- [ ] Cabeceras de seguridad adecuadas (CSP, X-Frame-Options o equivalentes).
- [ ] Cookies sensibles con `HttpOnly`, `Secure`, `SameSite` (si aplica).
- [ ] Protección CSRF para operaciones con sesión/cookies.
- [ ] Límites de rate limit o mitigación de abuso en endpoints críticos.

## Clasificación de hallazgos
Usar esta severidad:
- **Crítica**: compromiso directo de datos/cuentas/sistema.
- **Alta**: explotación plausible con alto impacto.
- **Media**: riesgo real con mitigación parcial.
- **Baja**: mejora recomendada sin riesgo inmediato.

## Formato de salida recomendado
Al reportar resultados, usar este formato:

```markdown
## Hallazgos
1. [Severidad: Crítica|Alta|Media|Baja] <título corto>
   - Evidencia: <archivo/componente/config>
   - Impacto: <qué podría pasar>
   - Recomendación: <acción concreta>

## Riesgos residuales
- <lista breve de riesgos pendientes>

## Plan de remediación
1. <acción prioritaria>
2. <acción siguiente>
3. <verificación final>
```

## Buenas prácticas al ejecutar la skill
- Priorizar hallazgos explotables sobre recomendaciones cosméticas.
- Ser explícito con impacto y camino de explotación.
- Evitar falsos positivos: si falta evidencia, marcar como “pendiente de validar”.
- No exponer secretos completos en reportes.
