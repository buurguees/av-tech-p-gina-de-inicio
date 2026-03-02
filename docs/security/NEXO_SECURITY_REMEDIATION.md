# Seguridad NEXO AV

## Objetivo

Este documento resume los fallos de seguridad detectados en `nexo_av`, las correcciones aplicadas en el repositorio y las acciones manuales que siguen siendo necesarias para cerrar completamente la remediacion.

## Estado actual

- La logica de autenticacion y autorizacion ha sido endurecida en frontend, Edge Functions y base de datos.
- Se ha eliminado la dependencia de `localStorage` como mecanismo de confianza para saltar el OTP.
- Se han cerrado RPC administrativas expuestas y se han restringido politicas RLS demasiado abiertas.
- Se ha separado el flujo publico de activacion de cuenta de las operaciones administrativas.
- Se han añadido cabeceras de hardening en `firebase.json`.
- El archivo `.env` se ha retirado del control de versiones, pero la rotacion de secretos y la limpieza del historico siguen siendo obligatorias.

## Fallos detectados y correcciones

### 1. Bypass del OTP desde cliente

**Problema**

El login permitia omitir el segundo factor usando un valor en `localStorage` (`nexo_av_last_login`). Ese dato era manipulable por cualquier usuario del navegador y no podia considerarse prueba de verificacion real.

**Impacto**

Un atacante con credenciales validas podia entrar sin OTP simplemente forzando el estado local esperado por la UI.

**Correccion aplicada**

- Se ha eliminado la logica de confianza basada en `localStorage`.
- La funcion `public.get_current_user_info()` devuelve ahora:
  - `last_otp_verified_at`
  - `otp_verified_for_today`
- Se ha creado `public.mark_current_user_otp_verified()` para registrar en servidor la verificacion OTP del usuario autenticado.
- El flujo de login ahora:
  - valida credenciales
  - consulta si el OTP ya fue verificado hoy desde servidor
  - si no lo fue, envia OTP y mantiene la sesion autenticada en estado pendiente de verificacion
  - tras validar el OTP marca la verificacion en base de datos sin pedir la contrasena de nuevo
- Los layouts desktop y mobile rechazan sesiones sin `otp_verified_for_today`.

**Archivos implicados**

- `supabase/migrations/20260228120000_security_hardening_auth_rls.sql`
- `src/pages/nexo_av/desktop/pages/Login.tsx`
- `src/pages/nexo_av/desktop/layouts/NexoAvLayout.tsx`
- `src/pages/nexo_av/mobile/layouts/NexoAvMobileLayout.tsx`
- `src/pages/nexo_av/desktop/pages/AccountSetup.tsx`

### 2. RPC administrativas expuestas en `public`

**Problema**

Existian funciones `SECURITY DEFINER` administrativas publicadas en `public` sin revocacion explicita de `EXECUTE` para roles no privilegiados.

**Impacto**

Si `anon` o `authenticated` mantenian permiso de ejecucion, un usuario podia invocar directamente operaciones internas de administracion y saltarse controles de las Edge Functions.

**Correccion aplicada**

- Se ha revocado `EXECUTE` a `PUBLIC`, `anon` y `authenticated` sobre las RPC administrativas sensibles.
- Se ha otorgado acceso solo a `service_role` en las funciones administrativas que realmente lo necesitan.
- Las funciones RPC de autoservicio se mantienen disponibles solo para `authenticated` y validan `auth.uid()` internamente.

**RPC protegidas**

- `get_authorized_user_by_auth_id`
- `get_user_roles_by_user_id`
- `list_authorized_users`
- `list_roles`
- `create_authorized_user`
- `check_email_exists`
- `update_authorized_user`
- `get_user_auth_id`
- `delete_authorized_user`
- `toggle_user_status`
- `assign_user_role`
- `clear_user_roles`

**Archivos implicados**

- `supabase/migrations/20260228120000_security_hardening_auth_rls.sql`

### 3. Funcion de autoservicio sin validacion fuerte

**Problema**

`update_own_user_info` permitia actualizar informacion propia sin verificar de forma robusta que el `p_user_id` correspondiera al usuario autenticado del token.

**Impacto**

Abría la puerta a modificaciones sobre perfiles ajenos si se invocaba de forma incorrecta o desde una capa intermedia demasiado permisiva.

**Correccion aplicada**

- `public.update_own_user_info(...)` valida ahora:
  - que exista `auth.uid()`
  - que el usuario autenticado este autorizado
  - que `p_user_id` coincida con el usuario autenticado
  - que el usuario objetivo siga activo
- `admin-users` ha dejado de usar `service_role` para `update_own_info` y ejecuta la RPC con el contexto autenticado del usuario.
- `AccountSetup` ya no depende de `admin-users` para completar el perfil; usa la RPC autenticada directamente.

**Archivos implicados**

- `supabase/migrations/20260228120000_security_hardening_auth_rls.sql`
- `supabase/functions/admin-users/index.ts`
- `src/pages/nexo_av/desktop/pages/AccountSetup.tsx`

### 4. Mezcla de flujos publicos y administrativos en `admin-users`

**Problema**

La misma Edge Function contenia acciones publicas (`validate-invitation`, `setup-password`) y acciones administrativas protegidas.

**Impacto**

Eso aumentaba la superficie de error y hacia mas facil introducir una regresion que expusiera operaciones privilegiadas.

**Correccion aplicada**

- Se ha creado la Edge Function publica `account-setup`.
- `admin-users` queda reservada para operaciones autenticadas y administrativas.
- `supabase/config.toml` se ha ajustado para:
  - `account-setup`: `verify_jwt = false`
  - `admin-users`: `verify_jwt = true`
  - `send-user-invitation`: `verify_jwt = true`
- `AccountSetup.tsx` consume ahora `account-setup`.

**Archivos implicados**

- `supabase/functions/account-setup/index.ts`
- `supabase/functions/admin-users/index.ts`
- `supabase/config.toml`
- `src/pages/nexo_av/desktop/pages/AccountSetup.tsx`

### 5. Reset del rate limit accesible para cualquier usuario autenticado

**Problema**

La accion `reset` de la Edge Function `rate-limit` solo comprobaba que hubiera un usuario autenticado, pero no que fuera administrador.

**Impacto**

Cualquier empleado podia desbloquear intentos de login de terceros, debilitando el control anti fuerza bruta.

**Correccion aplicada**

- `rate-limit` valida ahora JWT del usuario autenticado.
- Obtiene el usuario autorizado y sus roles.
- Solo permite `reset` a usuarios con rol `admin`.

**Archivos implicados**

- `supabase/functions/rate-limit/index.ts`

### 6. Politicas RLS demasiado abiertas

**Problema**

Varias tablas sensibles permitian acceso con condiciones demasiado laxas como `auth.uid() IS NOT NULL`.

**Impacto**

Cualquier usuario autenticado podia leer informacion interna sensible y, en algunos casos, modificar datos operativos sin pertenecer al recurso.

**Correccion aplicada**

- `internal.payroll_settings`
- `internal.payroll_settings_audit`
- `internal.partner_payroll_profiles`

Ahora solo permiten lectura a `internal.is_admin()` o `internal.is_manager()`.

- `quotes.quote_history`

La lectura queda ligada a `sales.can_access_quote(quote_id)` y se elimina la politica de insercion abierta.

- `projects.project_sites`

Se reemplazan las politicas abiertas por:

- lectura: `projects.can_access_project(project_id)`
- insercion: `internal.can_manage_project(project_id)`
- actualizacion: `internal.can_manage_project(project_id)`

Ademas se ha creado `internal.can_manage_project(p_project_id UUID)` para centralizar la logica de administracion de proyectos.

**Archivos implicados**

- `supabase/migrations/20260228120000_security_hardening_auth_rls.sql`

### 7. RPC de proyectos y notas sin validacion de autorizacion suficiente

**Problema**

Funciones de lectura y escritura sobre proyectos, sedes y notas podian depender en exceso de la exposicion RPC sin una comprobacion fuerte de acceso por recurso.

**Impacto**

Un usuario autenticado podia intentar operar sobre recursos ajenos si encontraba una via de llamada directa.

**Correccion aplicada**

Se han reforzado estas funciones con comprobaciones explicitas de autenticacion y autorizacion:

- `list_project_sites`
- `create_project_site`
- `update_project_site`
- `set_default_project_site`
- `archive_project_site`
- `get_project`
- `create_project`
- `update_project`
- `get_quote_notes`
- `create_quote_note`

**Archivos implicados**

- `supabase/migrations/20260228120000_security_hardening_auth_rls.sql`

### 8. Falta de cabeceras de seguridad en hosting

**Problema**

El hosting no definia cabeceras de hardening basicas.

**Impacto**

La plataforma tenia menos defensa en profundidad ante clickjacking, sniffing de tipos y abusos de capacidades del navegador.

**Correccion aplicada**

Se han añadido cabeceras globales en `firebase.json`:

- `Content-Security-Policy`
- `Referrer-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Permissions-Policy`

**Archivos implicados**

- `firebase.json`

### 9. Archivo `.env` versionado

**Problema**

El repositorio contenia `.env` versionado a pesar de que `.gitignore` ya lo ignoraba.

**Impacto**

Los secretos pueden haber quedado expuestos en clones previos, forks o historico de Git.

**Correccion aplicada**

- `.env` se ha retirado del indice de Git manteniendo el archivo local.
- `.env.example` ahora documenta las variables esperadas sin incluir secretos reales.

**Archivos implicados**

- `.env.example`
- `.gitignore`

## Validaciones realizadas

- Revision estatica del codigo y migraciones.
- Confirmacion de que ya no quedan referencias a `nexo_av_last_login`, `pendingSession` ni `setPendingSession` en `src/pages/nexo_av`.
- Validacion local de entorno Supabase mediante la skill `supabase-db-connection`:
  - proyecto detectado por configuracion local
  - variables esperadas presentes en `.env`
  - `SUPABASE_DB_URL` presente
  - `psql` no disponible en el entorno actual
  - `supabase` CLI no disponible en el entorno actual

## Pendientes manuales obligatorios

Estas tareas no quedan cerradas solo con cambios de repositorio:

1. Aplicar en la base de datos la migracion `20260228120000_security_hardening_auth_rls.sql`.
2. Desplegar las Edge Functions:
   - `account-setup`
   - `admin-users`
   - `rate-limit`
3. Desplegar la configuracion actualizada de `firebase.json`.
4. Rotar cualquier secreto contenido historicamente en `.env`.
5. Limpiar el historico del repositorio si se confirma que `.env` ha contenido secretos reales.
6. Probar manualmente:
   - login correcto con OTP obligatorio en primer acceso del dia
   - login correcto sin OTP solo tras verificacion previa del mismo dia
   - rechazo de acceso al dashboard si no existe verificacion OTP del dia
   - reset de rate limit solo para administradores
   - account setup completo con creacion de contrasena y acceso posterior
   - acceso denegado a tablas y RPC no autorizadas

## Riesgos residuales

- `send-otp` y `verify-otp` siguen siendo funciones publicas por diseno. Su seguridad depende de su propia implementacion y del canal de entrega.
- La politica CSP añadida es deliberadamente conservadora para evitar romper el despliegue existente. Puede endurecerse mas tras validar recursos externos realmente necesarios.
- La retirada de `.env` del indice no elimina los secretos del historico antiguo.

## Resumen ejecutivo

La plataforma ha pasado de un modelo donde varias decisiones de seguridad se apoyaban en cliente o en RPC expuestas, a un modelo centrado en verificacion de servidor, restricciones de permisos y validacion explicita por recurso.

El punto mas critico corregido es el bypass del OTP. El segundo gran bloque corregido es la autorizacion: RPC administrativas cerradas, RLS mas estricta y Edge Functions con separacion clara entre rutas publicas y administrativas.
