# Roadmap de Seguridad - NEXO

## Objetivo
Corregir de forma ordenada las fallas de seguridad detectadas en `nexo_av`, priorizando primero los vectores con impacto directo sobre cuentas, permisos y datos internos.

## Alcance
Este roadmap cubre:
- Autenticacion y segundo factor.
- Autorizacion en Edge Functions y RPC de Supabase.
- Politicas RLS de tablas internas y operativas.
- Gestion de secretos y configuracion sensible.
- Hardening de frontend y hosting.
- Validacion final y cierre.

## Principios de ejecucion
- No corregir solo la UI: todo control critico debe imponerse en servidor o base de datos.
- Cerrar primero escaladas de privilegios y bypass de login.
- Cada cambio debe incluir validacion tecnica y rollback claro.
- No dar por resuelto un punto sin prueba negativa y positiva.

## Fase 0 - Contencion inmediata
Prioridad: Critica
Objetivo: reducir riesgo mientras se implementan cambios de fondo.

### Acciones
1. Revisar si `.env` contiene secretos reales.
2. Rotar cualquier secreto comprometido o dudoso:
   - claves de Supabase
   - claves Resend
   - credenciales SMTP/API auxiliares
   - cualquier secreto incluido en `.env` o historico git
3. Inventariar Edge Functions publicas y privadas.
4. Identificar todas las funciones `SECURITY DEFINER` en esquema `public`.
5. Congelar despliegues funcionales no relacionados con seguridad hasta cerrar fases 1 y 2.

### Entregables
- Inventario de secretos rotados.
- Lista de funciones publicas expuestas.
- Lista de RPC sensibles.

### Criterio de cierre
- No quedan secretos dudosos sin rotar.
- Existe listado confirmado de superficie critica actual.

## Fase 1 - Corregir autenticacion y OTP
Prioridad: Critica
Objetivo: impedir que el segundo factor pueda saltarse desde cliente.

### Problema
El login permite omitir OTP usando estado manipulable en `localStorage`.

### Acciones
1. Eliminar la logica de confianza diaria basada en `localStorage`.
2. Mover al backend la decision de si un usuario debe pasar OTP.
3. Crear un estado de autenticacion en dos fases:
   - fase 1: credenciales validas pero sesion incompleta
   - fase 2: sesion final solo tras OTP valido
4. Evitar reusar o conservar password en memoria del cliente tras el primer paso.
5. Si se quiere mantener "recordar dispositivo":
   - hacerlo con token firmado por servidor
   - asociarlo a expiracion, dispositivo y revocacion
   - no confiar en almacenamiento local sin verificacion criptografica
6. Revisar mensajes de error para que no filtren informacion de cuentas.
7. Revalidar limite de intentos sobre login y OTP.

### Validaciones
1. Intentar marcar manualmente el estado de OTP en `localStorage` y comprobar que no sirve.
2. Verificar que con credenciales correctas no se obtiene sesion final sin OTP.
3. Confirmar que tras OTP valido se crea la sesion correcta.
4. Confirmar logout completo de estados intermedios.

### Criterio de cierre
- El OTP no puede omitirse manipulando el navegador.
- No se almacena la password para reautenticacion posterior.
- El login final solo ocurre tras validacion de servidor.

## Fase 2 - Cerrar RPC administrativas expuestas
Prioridad: Critica
Objetivo: impedir que usuarios autenticados invoquen funciones administrativas directas.

### Problema
Existen funciones `SECURITY DEFINER` en `public` sin proteccion interna suficiente, y no hay evidencia en repo de `REVOKE EXECUTE`.

### Acciones
1. Inventariar todas las funciones `SECURITY DEFINER` de `public`.
2. Clasificarlas:
   - lectura segura
   - operativa con control interno
   - administrativa critica
3. Aplicar `REVOKE EXECUTE` a `anon` y `authenticated` en funciones administrativas.
4. Mantener acceso solo para:
   - `service_role`
   - wrappers controlados
   - funciones con checks internos estrictos
5. Añadir validacion explicita dentro de cada funcion critica:
   - `auth.uid() IS NOT NULL`
   - comprobacion de rol o ownership
   - validacion de parametros
6. Revisar especialmente estas familias:
   - usuarios autorizados
   - roles
   - activacion/desactivacion de cuentas
   - asignacion y borrado de roles
   - cambio de password
   - lectura de usuarios internos
7. Documentar que la autorizacion no debe depender solo de Edge Functions.

### Validaciones
1. Intentar invocar cada RPC administrativa con cliente `authenticated`.
2. Confirmar denegacion para usuario no admin.
3. Confirmar que admin autorizado sigue pudiendo operar via capa prevista.
4. Revisar permisos efectivos en la base desplegada.

### Criterio de cierre
- Ninguna RPC administrativa sensible es invocable por `anon` o `authenticated` sin control de rol.
- Los permisos efectivos estan validados en entorno real.

## Fase 3 - Corregir RLS abiertas
Prioridad: Alta
Objetivo: limitar acceso a datos por rol, ownership o necesidad real.

### Problema
Hay politicas `auth.uid() IS NOT NULL` sobre tablas con datos internos o mutacion transversal.

### Tablas a revisar primero
1. `internal.payroll_settings`
2. `internal.payroll_settings_audit`
3. `internal.partner_payroll_profiles`
4. `quotes.quote_history`
5. `projects.project_sites`

### Acciones
1. Sustituir politicas abiertas por reglas basadas en:
   - `internal.is_admin()`
   - `internal.is_manager()`
   - propiedad del registro
   - pertenencia al proyecto o recurso
2. Separar permisos por operacion:
   - SELECT
   - INSERT
   - UPDATE
   - DELETE
3. Evitar politicas "FOR ALL" salvo casos muy justificados.
4. Para `project_sites`, ligar acceso al proyecto asociado.
5. Para tablas de nominas y salarios, restringir lectura a administracion y perfiles autorizados.
6. Para historial de presupuestos, usar la misma logica de acceso que el presupuesto origen.
7. Revisar tablas nuevas recientes en busca de mas patrones `auth.uid() IS NOT NULL`.

### Validaciones
1. Probar con usuario admin.
2. Probar con usuario manager.
3. Probar con usuario tecnico o comercial.
4. Confirmar que un usuario autenticado sin permiso no puede leer ni modificar datos ajenos.
5. Verificar que la app sigue funcionando con los permisos cerrados.

### Criterio de cierre
- Cada tabla sensible tiene politicas minimas y especificas.
- No quedan permisos globales de lectura o escritura sin justificacion documentada.

## Fase 4 - Endurecer Edge Functions
Prioridad: Alta
Objetivo: reducir superficie expuesta y exigir JWT en endpoints privados.

### Problema
Varias Edge Functions dependen de validacion manual porque `verify_jwt = false`.

### Acciones
1. Clasificar funciones:
   - publicas reales
   - privadas autenticadas
   - privadas administrativas
2. Activar `verify_jwt = true` en todas las privadas.
3. Dejar `verify_jwt = false` solo en las publicas estrictamente necesarias:
   - formulario de contacto
   - invitacion o setup solo si no hay alternativa segura mejor
   - OTP publico solo si esta bien blindado por diseño
4. Revisar CORS y eliminar respuestas con `*` en funciones sensibles.
5. Añadir validacion de rol explicita en acciones administrativas.
6. Corregir `rate-limit reset` para exigir admin real.
7. Revisar logs para que no expongan datos sensibles.

### Validaciones
1. Invocar endpoints privados sin JWT.
2. Invocar endpoints con JWT de usuario sin rol suficiente.
3. Invocar endpoints con admin autorizado.
4. Comprobar CORS desde origen no permitido.

### Criterio de cierre
- Todas las funciones privadas rechazan peticiones sin JWT valido.
- Las funciones administrativas exigen ademas rol valido.

## Fase 5 - Gestion de secretos y configuracion
Prioridad: Alta
Objetivo: asegurar que no hay secretos reales en repo ni dependencias innecesarias de configuracion local.

### Acciones
1. Revisar el contenido actual de `.env`.
2. Mover toda configuracion sensible a variables de entorno seguras.
3. Dejar `.env.example` sin valores reales.
4. Eliminar `.env` del historial git si estuvo comprometido.
5. Rotar secretos expuestos antes de limpiar historico.
6. Verificar que no existen claves privadas hardcodeadas en codigo o scripts.
7. Mantener solo claves publicas legitimas en frontend:
   - Supabase anon/publishable
   - Firebase web config publica

### Validaciones
1. Buscar patrones de secretos en repo.
2. Confirmar que el build funciona con variables inyectadas externamente.
3. Confirmar que no se ha roto entorno local con `.env.example`.

### Criterio de cierre
- No hay secretos privados reales en codigo versionado.
- Todos los secretos activos han sido rotados si hubo exposicion.

## Fase 6 - Hardening de frontend y hosting
Prioridad: Media
Objetivo: mejorar defensa en profundidad.

### Acciones
1. Añadir cabeceras de seguridad en hosting:
   - Content-Security-Policy
   - Referrer-Policy
   - X-Frame-Options o `frame-ancestors`
   - Permissions-Policy
   - Strict-Transport-Security si aplica en el edge
2. Revisar estrategia CSP para:
   - Supabase
   - Firebase
   - fuentes
   - blobs/PDF si aplica
3. Revisar cache de PWA para no almacenar datos sensibles de API mas tiempo del necesario.
4. Confirmar que no se cachean respuestas autenticadas de riesgo alto.
5. Revisar almacenamiento en `localStorage` y `sessionStorage`.
6. Minimizar datos sensibles persistidos en navegador.

### Validaciones
1. Inspeccionar cabeceras en despliegue.
2. Verificar que la app sigue cargando sin bloqueos CSP no previstos.
3. Confirmar que datos autenticados no quedan accesibles offline de forma indebida.

### Criterio de cierre
- Hosting sirve cabeceras de seguridad coherentes.
- No hay persistencia innecesaria de datos sensibles en cliente.

## Fase 7 - Auditoria de autorizacion transversal
Prioridad: Media
Objetivo: asegurar que no quedan controles solo en frontend.

### Acciones
1. Revisar operaciones criticas de negocio:
   - usuarios
   - presupuestos
   - facturas
   - compras
   - proyectos
   - RRHH
   - contabilidad
2. Confirmar que cada accion critica se protege en backend o base.
3. Buscar RPC con `SECURITY DEFINER` sin chequeos internos.
4. Revisar si hay accesos basados en rutas o componentes sin enforcement real.
5. Verificar que los dashboards y listados no exponen mas datos de los necesarios por rol.

### Validaciones
1. Matriz de permisos por rol.
2. Pruebas manuales por rol.
3. Pruebas de invocacion directa por consola o API.

### Criterio de cierre
- Existe una matriz de permisos validada.
- No quedan operaciones criticas protegidas solo por frontend.

## Fase 8 - Testing de seguridad y cierre
Prioridad: Alta
Objetivo: cerrar la remediacion con evidencia reproducible.

### Acciones
1. Crear checklist de pruebas de seguridad regresiva.
2. Añadir tests automatizados donde compense:
   - autorizacion de RPC
   - validacion de roles
   - login con OTP
3. Ejecutar pruebas manuales de abuso:
   - login bypass
   - acceso cruzado a datos
   - invocacion de RPC sensible
   - reseteo de rate limit
4. Revisar `npm audit` y repetir analisis de secretos.
5. Preparar informe final con estado:
   - corregido
   - mitigado
   - pendiente

### Criterio de cierre
- Los hallazgos criticos y altos estan corregidos o bloqueados.
- Hay evidencia de pruebas satisfactorias.
- El riesgo residual queda documentado.

## Orden recomendado de ejecucion
1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 4
6. Fase 5
7. Fase 6
8. Fase 7
9. Fase 8

## Lista resumida de correcciones prioritarias
1. Quitar bypass de OTP en cliente.
2. Revocar acceso a RPC administrativas.
3. Cerrar RLS abiertas sobre datos sensibles.
4. Exigir admin real en `rate-limit reset`.
5. Activar `verify_jwt` en funciones privadas.
6. Rotar y sanear secretos.
7. Añadir hardening en hosting.

## Definicion de terminado
Se considerara completado este roadmap cuando:
- no sea posible acceder sin OTP usando manipulacion del navegador,
- no existan RPC administrativas expuestas a usuarios no autorizados,
- las tablas sensibles tengan RLS minima por rol o ownership,
- las funciones privadas exijan JWT y rol cuando aplique,
- los secretos sensibles hayan sido rotados y saneados,
- exista validacion tecnica reproducible de los cambios.
