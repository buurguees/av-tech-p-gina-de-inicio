# Regla: Mapa Técnicos - Filtro por Proyectos Asignados

## Pendiente de implementar

**Rol Técnico:** Los usuarios con rol `tecnico` o `tech` solo deben ver en el **Mapa Técnicos** los proyectos asignados a su usuario.

## Contexto

- El Mapa Técnicos muestra técnicos/proyectos en un mapa
- Actualmente todos los roles con acceso a proyectos ven el mapa completo
- **Requisito:** Los Técnicos solo deben ver los proyectos donde están asignados (`assigned_to` o `assigned_team` contiene su `authorized_user_id`)

## Ubicaciones a modificar (cuando se implemente)

- `src/pages/nexo_av/desktop/pages/` - Página del mapa técnicos (TechMapPage o similar)
- `src/pages/nexo_av/mobile/` - Versión móvil del mapa si existe
- Posiblemente RPCs en Supabase para filtrar proyectos por usuario asignado

## Referencia de roles

- `internal.is_tech()` - Verifica si el usuario tiene rol técnico
- `internal.get_authorized_user_id(auth.uid())` - Obtiene el ID del usuario autorizado
- Proyectos: `assigned_to`, `assigned_team` en `projects.projects`
