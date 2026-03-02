# Checklist de Despliegue y Verificacion

## Objetivo

Esta checklist sirve para aplicar en entorno real las correcciones de seguridad ya implementadas en el repositorio de `nexo_av` y verificar que han quedado activas en Supabase y Firebase.

## Alcance

Incluye:

- migracion de base de datos
- despliegue de Edge Functions
- despliegue de hosting
- validaciones funcionales y de seguridad
- acciones posteriores obligatorias sobre secretos

## Pre-requisitos

- Tener acceso de administrador al proyecto Supabase `takvthfatlcjsqgssnta`.
- Tener acceso de despliegue a Firebase del proyecto web.
- Tener el repo actualizado con estos cambios.
- Tener disponibles las variables necesarias en el entorno local o CI:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_DB_URL`
- Tener autenticada la CLI que se vaya a usar:
  - `npx supabase`
  - `firebase`

## Orden de ejecucion

Aplicar siempre en este orden:

1. Base de datos
2. Edge Functions
3. Frontend y hosting
4. Validacion funcional
5. Rotacion de secretos

## 1. Base de datos

### Objetivo

Aplicar las restricciones nuevas de OTP, RPC y RLS.

### Cambio a aplicar

- `supabase/migrations/20260228120000_security_hardening_auth_rls.sql`

### Opcion A: CLI

```bash
npx supabase link --project-ref takvthfatlcjsqgssnta
npx supabase db push
```

### Opcion B: SQL Editor

Si `db push` falla por desfase de historial o entorno no linkeado:

1. Abrir Supabase Dashboard.
2. Ir a `SQL Editor`.
3. Ejecutar el contenido de `20260228120000_security_hardening_auth_rls.sql`.

### Verificaciones minimas

Confirmar que existen:

- columna `internal.authorized_users.last_otp_verified_at`
- funcion `public.mark_current_user_otp_verified()`
- funcion `internal.can_manage_project(UUID)`

Confirmar que ya no tienen `EXECUTE` para `anon/authenticated` las RPC administrativas protegidas.

## 2. Edge Functions

### Objetivo

Poner en produccion la separacion entre flujos publicos y administrativos y endurecer `rate-limit`.

### Funciones a desplegar

- `account-setup`
- `admin-users`
- `rate-limit`

### Comandos

```bash
npx supabase functions deploy account-setup
npx supabase functions deploy admin-users
npx supabase functions deploy rate-limit
```

### Verificacion de configuracion

Revisar en `supabase/config.toml`:

- `account-setup`: `verify_jwt = false`
- `admin-users`: `verify_jwt = true`
- `send-user-invitation`: `verify_jwt = true`

### Verificaciones minimas

- `account-setup` responde a `validate-invitation` y `setup-password`.
- `admin-users` rechaza peticiones sin `Authorization`.
- `rate-limit` rechaza `reset` si el usuario no es admin.

## 3. Frontend y hosting

### Objetivo

Publicar el flujo nuevo de login y las cabeceras de hardening.

### Build

```bash
npm run build
```

### Deploy

```bash
firebase deploy
```

El repo ya define este atajo en `package.json`:

```bash
npm run deploy
```

### Verificaciones minimas

- El login ya no depende de `localStorage` para saltar el OTP.
- El flujo de alta de cuenta usa `account-setup`.
- Hosting devuelve:
  - `Content-Security-Policy`
  - `Referrer-Policy`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Permissions-Policy`

## 4. Verificacion funcional

### Login y OTP

1. Intentar login con un usuario valido que no haya verificado OTP hoy.
2. Confirmar que:
   - pide OTP
   - no entra al dashboard sin OTP aunque ya exista sesion autenticada
   - tras OTP correcto entra y queda marcada la verificacion del dia
   - no vuelve a pedir la contrasena en el paso OTP
3. Cerrar sesion y volver a entrar el mismo dia.
4. Confirmar que no vuelve a pedir OTP si la politica diaria es la esperada.
5. Abrir devtools y confirmar que manipular `localStorage` no altera el resultado.

### Session enforcement

1. Con una sesion activa pero sin `otp_verified_for_today`, abrir directamente una URL interna.
2. Confirmar redireccion al login.

### Account setup

1. Abrir enlace de invitacion valido.
2. Confirmar que:
   - valida el token
   - permite fijar contrasena
   - deja completar perfil
   - entra al dashboard al final

### Rate limit

1. Forzar suficientes intentos fallidos para bloquear una cuenta.
2. Confirmar que un usuario no admin no puede ejecutar `reset`.
3. Confirmar que un admin si puede ejecutar `reset`.

### Autorizacion y RLS

1. Probar desde cliente autenticado no admin:
   - acceso a payroll
   - lectura de quote history ajena
   - escritura sobre `project_sites` de proyecto ajeno
2. Confirmar que las operaciones se rechazan.

## 5. Validacion tecnica recomendada

Si tienes acceso SQL:

```sql
select column_name
from information_schema.columns
where table_schema = 'internal'
  and table_name = 'authorized_users'
  and column_name = 'last_otp_verified_at';

select routine_schema, routine_name
from information_schema.routines
where routine_schema in ('public', 'internal')
  and routine_name in (
    'mark_current_user_otp_verified',
    'get_current_user_info',
    'update_own_user_info',
    'can_manage_project'
  );
```

Comprobacion de grants sobre funciones sensibles:

```sql
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'get_authorized_user_by_auth_id',
    'get_user_roles_by_user_id',
    'list_authorized_users',
    'create_authorized_user',
    'update_authorized_user',
    'delete_authorized_user',
    'toggle_user_status'
  )
order by routine_name, grantee;
```

Resultado esperado:

- `service_role` con permisos donde corresponda
- sin `EXECUTE` para `anon`
- sin `EXECUTE` para `authenticated` en funciones administrativas

## 6. Secretos y post-remediacion

Esta parte es obligatoria. El cambio de repo no la sustituye.

1. Identificar si `.env` historico ha contenido secretos reales.
2. Rotar inmediatamente:
   - claves de integracion expuestas
   - credenciales de base de datos si estuvieron en `.env`
   - cualquier token operativo compartido en el repo
3. Revisar si hace falta limpieza de historico Git.
4. Confirmar que solo queda `.env.example` como referencia.

## 7. Criterio de cierre

La remediacion puede darse por cerrada cuando se cumpla todo lo siguiente:

- migracion aplicada en la base real
- Edge Functions desplegadas
- frontend desplegado
- OTP controlado por servidor funcionando
- RPC administrativas cerradas en produccion
- RLS sensible verificada
- rate limit `reset` restringido a admin
- secretos rotados

## 8. Incidencias esperables

### `supabase db push` falla

Usar SQL Editor y aplicar manualmente la migracion.

### `account-setup` devuelve error CORS

Revisar la lista de `ALLOWED_ORIGINS` de la funcion y el dominio real del frontend.

### El login redirige al inicio aun con credenciales correctas

Comprobar que:

- la migracion esta aplicada
- `mark_current_user_otp_verified()` existe
- `get_current_user_info()` devuelve `otp_verified_for_today`

### El frontend rompe tras CSP

Revisar recursos externos reales y ampliar la politica solo con origenes estrictamente necesarios.
