# NEXO AI — Informe de Depuracion 2026-02-16

> **Sesion de debug:** 16 de febrero de 2026  
> **Duracion:** ~3 horas  
> **Resultado:** 5 errores criticos identificados y resueltos  
> **Impacto:** Frontend (bandejas), Event Engine, Orchestrator, Base de datos

---

## 1. Contexto

El modulo NEXO AI presentaba fallos en la configuracion de las **Bandejas Operativas** (V3). El usuario no podia guardar la configuracion de agentes (auto_mode, modelo, nivel de intervencion, cooldown) y el backend del servidor ALB357 mostraba errores intermitentes.

La investigacion abarco tres capas:
- **Frontend** (React/Vite en localhost:8080)
- **Supabase** (PostgREST, Edge Functions, PostgreSQL)
- **Servidor ALB357** (Docker: nexo-event-engine, nexo-orchestrator, Ollama)

---

## 2. Errores Encontrados

### ERROR 1: PostgREST Schema Cache Estancado (CRITICO)

**Sintoma:**  
Las llamadas RPC desde el frontend devolvian `404 Not Found` para funciones que existian en la base de datos:
- `ai_get_group_settings`
- `ai_set_group_settings`
- `ai_join_department_conversation`
- `ai_complete_chat_request` (firma modificada)

**Causa raiz:**  
PostgREST mantiene un cache interno del schema de la base de datos. Cuando se crean o modifican funciones SQL, PostgREST debe recargar este cache. El mecanismo estandar (`NOTIFY pgrst, 'reload schema'`) no estaba funcionando. Todas las funciones creadas o modificadas DESPUES de que el cache se congelara eran invisibles para la API REST, mientras que las funciones preexistentes (como `ai_lock_next_chat_request`) seguian funcionando con normalidad.

**Intentos fallidos de solucion:**
1. `NOTIFY pgrst, 'reload schema'` y `NOTIFY pgrst, 'reload config'` — sin efecto
2. Recrear funciones con DROP + CREATE — sin efecto
3. Crear funciones con nombres nuevos (prefijo `v4_`) — tampoco visibles
4. `ALTER ROLE authenticator SET pgrst.db_extra_search_path` — sin efecto
5. `pg_terminate_backend()` de conexiones `authenticator` — sin efecto

**Solucion aplicada:**  
Se desplego la **Edge Function `ai-settings-proxy`** que conecta directamente a PostgreSQL usando el driver `postgres` de npm, bypasseando completamente PostgREST. Esta funcion:
- Valida JWT del usuario via `supabase.auth.getUser()`
- Establece `request.jwt.claims` en la sesion de Postgres para que `auth.uid()` funcione
- Ejecuta las funciones SQL originales dentro de transacciones
- Soporta acciones de servicio (service_role) para el event-engine y orchestrator

**Ficheros creados/modificados:**
- Edge Function `ai-settings-proxy` (v4) — Supabase Dashboard

**Leccion aprendida:**  
PostgREST puede quedar con el cache estancado en proyectos Supabase cloud. La unica solucion definitiva es reiniciar PostgREST desde el Dashboard de Supabase. Como workaround permanente, las Edge Functions con conexion directa a PostgreSQL son mas fiables para funciones que cambian frecuentemente.

---

### ERROR 2: Bug de JavaScript en Event Engine (CRITICO)

**Sintoma:**  
El contenedor `nexo-event-engine` reportaba siempre "Ninguna bandeja en auto_mode" aunque habia registros con `auto_mode = true` en la base de datos.

**Causa raiz:**  
Error de **Automatic Semicolon Insertion (ASI)** en JavaScript. El codigo original era:

```javascript
// INCORRECTO - ASI inserta ; despues de "await supabase"
const { data, error } = await supabase
  supabase.schema('ai').from('group_agent_settings')
  .select('...')
  .eq('auto_mode', true)
```

JavaScript interpretaba esto como:
```javascript
const { data, error } = await supabase;  // data = undefined, error = undefined
supabase.schema('ai').from('group_agent_settings')...  // resultado descartado
```

**Solucion aplicada:**  
Se reescribio completamente `index.js` para usar la Edge Function `ai-settings-proxy` en lugar de acceso directo al schema `ai` (que tampoco estaba expuesto en PostgREST):

```javascript
// CORRECTO - usa Edge Function como proxy
const res = await fetch(PROXY_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SERVICE_KEY },
  body: JSON.stringify({ action: 'get_auto_mode_bandejas' }),
});
const data = await res.json();
```

**Ficheros modificados:**
- `/opt/nexo-ai-v3/event-engine/src/index.js` (servidor ALB357)

**Leccion aprendida:**  
En JavaScript, NUNCA dejar un `await` al final de una linea seguido de una llamada encadenada en la siguiente linea. Siempre encadenar con `.` en la misma linea o usar parentesis:
```javascript
// Correcto opcion A: punto en la misma linea
const { data } = await supabase.schema('ai')
  .from('table').select('*')

// Correcto opcion B: parentesis
const { data } = await (
  supabase.schema('ai').from('table').select('*')
)
```

---

### ERROR 3: Enum `project_status` sin valor `ACTIVE` (MEDIO)

**Sintoma:**  
El orchestrator lanzaba el error:
```
invalid input value for enum project_status: "ACTIVE"
```
al intentar obtener contexto ERP para las respuestas de la IA.

**Causa raiz:**  
Las funciones `ai_get_context_*` (general, commercial, etc.) filtran proyectos por estado. El codigo referenciaba el valor `'ACTIVE'` pero el enum `projects.project_status` solo contenia: `PLANNED`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `CANCELLED`, `INVOICED`, `CLOSED`, `NEGOTIATION`.

**Solucion aplicada:**
```sql
ALTER TYPE projects.project_status ADD VALUE IF NOT EXISTS 'ACTIVE' AFTER 'NEGOTIATION';
```

**Ficheros modificados:**
- Migracion `add_active_to_project_status_enum` en Supabase

**Leccion aprendida:**  
Antes de referenciar valores de enum en funciones SQL, verificar que el valor existe con:
```sql
SELECT enumlabel FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'nombre_enum';
```

---

### ERROR 4: Frontend llamando a RPCs inexistentes en PostgREST (ALTO)

**Sintoma:**  
El dialogo de configuracion de bandejas se abria pero:
- Los campos aparecian con valores por defecto (no cargaba datos reales)
- El boton "Guardar" no tenia efecto visible (revertia silenciosamente)
- No habia errores visibles en la consola (el error 404 se tragaba en el catch)

**Causa raiz:**  
El frontend llamaba a `v4_get_group_settings` y `v4_set_group_settings` via `supabase.rpc()`, que pasaba por PostgREST. Como el cache de PostgREST estaba congelado (Error 1), estas funciones devolvian 404.

**Solucion aplicada:**  
Se creo un modulo proxy `aiProxy.ts` que llama a la Edge Function:

```typescript
// src/pages/nexo_av/ai/logic/aiProxy.ts
export async function aiProxy<T>(action: string, params: Record<string, unknown>) {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...params }),
  });
  return { data: await response.json(), error: null };
}
```

Y se actualizaron los hooks para usarlo:

**Ficheros modificados:**
- `src/pages/nexo_av/ai/logic/aiProxy.ts` (nuevo)
- `src/pages/nexo_av/ai/logic/hooks/useGroupAgentSettings.ts`
- `src/pages/nexo_av/ai/logic/hooks/useConversations.ts`
- `src/pages/nexo_av/ai/desktop/AIChatPage.tsx`

**Leccion aprendida:**  
Cuando un `supabase.rpc()` falla silenciosamente, verificar SIEMPRE los API logs en el Dashboard de Supabase. El error 404 en PostgREST indica que la funcion no esta en el schema cache, no que no exista.

---

### ERROR 5: Orchestrator no podia completar chat requests (ALTO)

**Sintoma:**  
Los logs del orchestrator mostraban:
```
Could not find the function public.ai_complete_chat_request(...)
Lock error: { code: 'PGRST002', message: 'Could not query the database for the schema cache. Retrying.' }
```

Ademas, errores intermitentes de Cloudflare 521 (Web Server Down) y 522 (Connection Timed Out).

**Causa raiz:**  
Combinacion de dos problemas:
1. `ai_complete_chat_request` fue modificada para aceptar un nuevo parametro `p_processed_by`. PostgREST tenia cacheada la firma antigua y no reconocia la nueva.
2. Errores intermitentes de conectividad Cloudflare entre el servidor ALB357 y Supabase.

**Solucion aplicada:**  
Se anadio la funcion `completeViaProxy()` al orchestrator que usa la Edge Function en lugar de PostgREST:

```javascript
async function completeViaProxy(requestId, lockOwner, latencyMs, modelUsed) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY },
    body: JSON.stringify({ action: 'complete_chat_request', ... }),
  });
  if (!res.ok) throw new Error('Proxy complete failed: ' + await res.text());
}
```

**Ficheros modificados:**
- `/opt/nexo-ai-worker/worker/index.js` (servidor ALB357)

**Leccion aprendida:**  
Cuando se modifica la firma de una funcion SQL (anadir/quitar parametros), PostgREST necesita recargar el cache. Si la recarga falla, los clientes que usan esa funcion quedaran rotos. Es mas seguro crear funciones con nombres nuevos y deprecar las antiguas.

---

## 3. Arquitectura resultante

```
┌─────────────────┐     ┌──────────────────────────────────────┐     ┌─────────────────────┐
│  ERP (Frontend)  │     │            Supabase                  │     │  ALB357 Server       │
│                  │     │                                      │     │                      │
│  aiProxy.ts ─────────▶│  Edge Function: ai-settings-proxy    │     │  nexo-event-engine   │
│  (get/set/join)  │     │  ├─ Conexion directa a PostgreSQL   │◀────│  (polling via EF)    │
│                  │     │  ├─ Valida JWT                       │     │                      │
│  supabase.rpc ───────▶│  ├─ Ejecuta funciones SQL            │     │  nexo-orchestrator   │
│  (otras RPCs)    │     │  └─ Bypassa PostgREST               │◀────│  (complete via EF)   │
│                  │     │                                      │     │  (lock via PostgREST)│
│                  │◀────│  PostgREST (funciones cacheadas OK)  │     │                      │
│                  │     │  ├─ ai_lock_next_chat_request  ✓     │     │  Ollama (local)      │
│                  │     │  ├─ ai_list_conversations      ✓     │     │  qwen2.5:3b          │
│                  │     │  └─ ai_get_message_content     ✓     │     │                      │
└─────────────────┘     └──────────────────────────────────────┘     └─────────────────────┘
```

### Edge Function `ai-settings-proxy` — Acciones soportadas

| Accion | Autenticacion | Descripcion |
|--------|---------------|-------------|
| `get_group_settings` | JWT usuario (admin/manager) | Lee configuracion de bandeja |
| `set_group_settings` | JWT usuario (admin) | Guarda configuracion de bandeja |
| `join_department_conversation` | JWT usuario | Unirse a grupo de departamento |
| `get_auto_mode_bandejas` | Publica (read-only) | Polling del event-engine |
| `complete_chat_request` | service_role JWT | Marca request como completada |

---

## 4. Protocolo de trabajo para evitar estos errores

### 4.1 Antes de modificar funciones SQL

```
1. Listar la firma actual:
   SELECT proname, pg_get_function_arguments(oid)
   FROM pg_proc WHERE proname = 'nombre_funcion';

2. Si cambias parametros → crear funcion NUEVA con nombre diferente
   NO modificar la firma de funciones existentes que esten en uso

3. Despues de CREATE/ALTER FUNCTION:
   SELECT pg_notify('pgrst', 'reload schema');

4. Verificar que PostgREST la reconoce:
   curl -s https://takvthfatlcjsqgssnta.supabase.co/rest/v1/rpc/nombre_funcion \
     -H "apikey: ANON_KEY" -X POST -d '{}' | head -1
   # Si devuelve 404 → el cache NO se recargo
```

### 4.2 Si PostgREST no recarga el cache

Escalar en este orden:
1. `NOTIFY pgrst, 'reload schema'` + `NOTIFY pgrst, 'reload config'`
2. `ALTER ROLE authenticator SET pgrst.db_schemas TO '...'` + NOTIFY
3. Si nada funciona → **ir al Dashboard de Supabase → Settings → Restart PostgREST**
4. Workaround permanente: usar Edge Function con conexion directa a PostgreSQL

### 4.3 Antes de desplegar cambios en el servidor ALB357

```
1. SSH al servidor:
   ssh -i $env:USERPROFILE\.ssh\cursor_mcp mcpbot@100.117.250.115

2. SIEMPRE verificar los logs ANTES de modificar:
   docker logs nexo-event-engine --tail 20
   docker logs nexo-orchestrator --tail 20

3. Si el contenedor usa volumen montado (como nexo-orchestrator):
   docker exec -i nexo-orchestrator sh -c 'cat > /app/index.js' < nuevo_archivo.js
   docker restart nexo-orchestrator

4. Si el contenedor usa imagen (como nexo-event-engine):
   # Modificar fuente → rebuild → restart
   docker build -t nexo-ai-v3-nexo-event-engine ./event-engine
   docker stop nexo-event-engine && docker rm nexo-event-engine
   docker run -d --name nexo-event-engine --restart unless-stopped \
     --env-file ./event-engine/.env nexo-ai-v3-nexo-event-engine

5. Verificar logs despues del despliegue:
   sleep 10 && docker logs nexo-event-engine --tail 10
```

### 4.4 Antes de modificar enums

```sql
-- Verificar valores actuales ANTES de usarlos en funciones
SELECT e.enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE t.typname = 'nombre_enum'
ORDER BY e.enumsortorder;

-- Anadir valores nuevos (no se pueden eliminar en PostgreSQL)
ALTER TYPE schema.nombre_enum ADD VALUE IF NOT EXISTS 'NUEVO_VALOR';
```

### 4.5 Reglas de JavaScript para evitar bugs de ASI

```javascript
// REGLA: Nunca terminar una linea con un valor que pueda ser una expresion completa
// seguido de un .metodo() en la siguiente linea

// MAL ❌
const { data } = await supabase
  supabase.from('table').select('*')

// BIEN ✓
const { data } = await supabase
  .from('table')
  .select('*')

// BIEN ✓
const { data } = await supabase.from('table').select('*')
```

### 4.6 Checklist pre-deploy

- [ ] Funciones SQL nuevas/modificadas visibles en PostgREST (`curl` test)
- [ ] Enums referenciados existen con los valores esperados
- [ ] Event-engine logs limpios (sin `[V3 ERROR]`)
- [ ] Orchestrator logs limpios (sin `Lock error`, sin `PGRST002`)
- [ ] Frontend: dialogo de configuracion abre, carga datos, guarda correctamente
- [ ] Edge Function logs sin 500s (`get_logs service=edge-function`)

---

## 5. Nota sobre PostgREST y Supabase

El problema del schema cache de PostgREST es un problema conocido en Supabase cloud. La razon por la que `NOTIFY pgrst` puede no funcionar incluye:

1. **Conexion LISTEN perdida**: PostgREST mantiene una conexion que escucha notificaciones. Si esa conexion se pierde (por timeout, restart interno, etc.), las notificaciones se pierden.
2. **Error PGRST002**: Indica que PostgREST no puede consultar la base de datos para reconstruir el cache. Esto puede ser transitorio (pico de conexiones) o persistente (configuracion corrupta).
3. **Cloudflare 521/522**: Los servidores de Supabase estan detras de Cloudflare. Errores de conectividad entre Cloudflare y el origin server pueden causar que PostgREST parezca caido.

**Recomendacion a largo plazo:**  
Para funciones criticas que cambian frecuentemente, usar **Edge Functions con conexion directa a PostgreSQL** como arquitectura por defecto. PostgREST es excelente para queries estandar de tablas, pero para funciones RPC que evolucionan, la Edge Function es mas fiable.

---

## 6. Resumen de ficheros modificados en esta sesion

### Frontend (repositorio local)
| Fichero | Cambio |
|---------|--------|
| `src/pages/nexo_av/ai/logic/aiProxy.ts` | **Nuevo** — Helper para llamar Edge Function |
| `src/pages/nexo_av/ai/logic/hooks/useGroupAgentSettings.ts` | Usa `aiProxy` en vez de `supabase.rpc` |
| `src/pages/nexo_av/ai/logic/hooks/useConversations.ts` | `joinDepartmentConversation` via `aiProxy` |
| `src/pages/nexo_av/ai/desktop/AIChatPage.tsx` | `loadModes` via `aiProxy` |

### Servidor ALB357
| Fichero | Cambio |
|---------|--------|
| `/opt/nexo-ai-v3/event-engine/src/index.js` | Reescrito — polling via Edge Function |
| `/opt/nexo-ai-worker/worker/index.js` | `completeViaProxy()` via Edge Function |

### Supabase
| Recurso | Cambio |
|---------|--------|
| Edge Function `ai-settings-proxy` (v4) | **Nuevo** — Proxy directo a PostgreSQL |
| Migracion `add_active_to_project_status_enum` | Anade `ACTIVE` a `projects.project_status` |
