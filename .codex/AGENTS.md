# Reglas de Proyecto para Codex

## Idioma y comunicación

- Responder siempre en español.
- Priorizar respuestas concisas y accionables.

## Seguridad y cambios

- No incluir secretos, tokens ni credenciales en archivos versionados.
- Evitar acciones destructivas sin confirmación explícita.
- Proponer validaciones después de cambios relevantes.

## Flujo operativo

- Preferir cambios reproducibles en archivos antes que acciones manuales.
- Documentar brevemente decisiones técnicas cuando afecten mantenimiento.
- Para migraciones Supabase o despliegues, priorizar validación local antes de ejecución real.

## Carga obligatoria al iniciar chat

1. **Leer siempre** `.codex/errores-soluciones.md` al inicio de cada chat (obligatorio).
2. **Leer siempre** `.codex/avances.md` al inicio de cada chat (obligatorio).
3. **Después**, leer `.codex/skills/INDEX.md` para seleccionar skill.
4. **Luego**, cargar solo el `SKILL.md` necesario para la tarea actual.
5. Si hay conflicto entre una práctica nueva y errores históricos, priorizar evitar reincidencia según `.codex/errores-soluciones.md`.
6. Si existe una capacidad ya desbloqueada aplicable, reutilizarla o extenderla antes de reinventarla; usar `.codex/avances.md` como referencia.

## Regla anti-drift para Supabase y sistemas vivos

- Si la tarea implica trabajar con BD, migraciones o RPCs, revisar primero el estado actual en migraciones y documentación.
- Contrastar con `docs/important/` y `src/constants/` antes de proponer o ejecutar cambios.
- No asumir que el repo local refleja el estado actual de producción sin validar.
- Tras el contraste, documentar cualquier drift relevante y continuar con flujo normal.

## Regla de paridad desktop/mobile

- Si la tarea toca una página o componente del ERP, comprobar si existe contraparte en la otra versión.
- Revisar `src/App.tsx` para ver si la ruta usa `createResponsivePage()`.
- Mantener consistencia entre desktop y mobile cuando aplique.

## Documentos operativos por tipo de cambio

- Si la tarea toca **estados o reglas de negocio**: revisar `docs/important/estados-nexo.md` y `src/constants/`.
- Si la tarea toca **Supabase** (RPC, migraciones, RLS): usar skill `nexo-supabase-safe-change`.
- Si la tarea toca **SharePoint**: usar skill `nexo-sharepoint-documental` y documentación en `docs/sharepoint/`.
- Si la tarea toca **UI mobile**: revisar skill `nexo-mobile-ui-standards` y `nexo-frontend-mobile`.
- Si la tarea introduce mejora sensible: considerar añadir o actualizar casos en evals si existen.

## Skills (carga bajo demanda)

- **Ruta canónica:** `.codex/skills/`. Cada skill tiene su `SKILL.md` en `.codex/skills/<skill>/SKILL.md`.
- Cargar al inicio `.codex/skills/INDEX.md` para seleccionar skill.
- Cargar solo el `SKILL.md` necesario según la tarea actual.
- Evitar carga masiva de skills no relacionados con la solicitud del usuario.
- `.agents/skills/` se considera **legacy**; usar `.codex/skills/` cuando exista equivalente.
- Las skills en `.cursor/skills/` (nexo-feature-workflow, nexo-frontend-desktop, etc.) se mantienen; el INDEX indica la ruta correcta para cada una.

## Cierre obligatorio de sesión

- Si se corrigió un error: registrar en `.codex/errores-soluciones.md`.
- Si se consolidó una capacidad nueva: registrar en `.codex/avances.md`.
