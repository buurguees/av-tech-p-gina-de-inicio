# Contexto del Repo AV TECH / NEXO AV para Agentes

Fecha de referencia: 2026-03-16
Ambito: contexto operativo para Claude, Codex u otros agentes que trabajen sobre `src/pages/nexo_av/` y el repo completo

## 1. Que es esta plataforma

Este repositorio no contiene solo una web publica. Contiene dos productos en la misma base de codigo:

1. `AV TECH` como web corporativa publica.
2. `NEXO AV` como ERP interno de operaciones, ventas, compras, proyectos, contabilidad, catalogo y documental.

El dominio funcional de NEXO AV vive sobre todo en:

- `src/pages/nexo_av/`
- `src/app/routes/NexoRoutes.tsx`
- `src/integrations/supabase/`
- `docs/important/`
- `supabase/`

NEXO AV sirve para centralizar la operativa real de la empresa:

- clientes y proyectos
- presupuestos y facturas
- compras, tickets y gastos
- contabilidad y cierres
- catalogo de productos, servicios y packs
- archivo documental en SharePoint
- integraciones M365 para calendarios y automatizaciones

## 2. Contexto Git y forma de trabajo

### Repo y rama principal

- Remote principal: `origin = https://github.com/buurguees/av-tech-p-gina-de-inicio.git`
- Rama observada: `main`

### Regla de trabajo

Este repo es la fuente de verdad. La forma correcta de trabajar es:

1. cambiar archivos en el repositorio
2. validar impacto funcional
3. validar `build` y, si aplica, `lint` o `tsc`
4. solo despues desplegar o sincronizar sistemas vivos

Guardrails ya fijados en `AGENTS.md`:

- no hacer hotfix manual en produccion sin reflejarlo en repo
- no versionar secretos
- si hay drift con Supabase, SharePoint o Firebase, primero traerlo al repo o documentarlo
- si se toca ERP, revisar paridad desktop/mobile cuando aplique

### Documentos de referencia rapida

- Reglas operativas: `AGENTS.md`
- Memoria operativa: `.codex/AGENTS.md`, `.codex/errores-soluciones.md`, `.codex/avances.md`
- Arquitectura detallada: `docs/important/ARQUITECTURA_PROYECTO_NEXO_AV.md`
- Reglas de negocio: `docs/important/estados-nexo.md`
- Organizacion del repo: `docs/architecture/REPO_ORGANIZATION.md`

## 3. Como se trabaja la base de datos

### Backend real

La base de datos y backend principal estan en Supabase.

- `project_id`: `takvthfatlcjsqgssnta`
- Config del proyecto: `supabase/config.toml`
- Conexion MCP para agentes: `.codex/mcp.json`

### Patron de acceso desde frontend

El frontend no trabaja principalmente contra tablas directas. La mayor parte de NEXO AV consume RPCs de Supabase.

Puntos clave:

- cliente tipado: `src/integrations/supabase/client.ts`
- tipos generados: `src/integrations/supabase/types.ts`
- las reglas de negocio viven repartidas entre SQL, RPCs, `src/constants/` y documentacion funcional

Implicacion operativa:

- no asumir que leer una tabla `public` refleja todo el modelo real
- no asumir que el estado correcto de negocio se deduce de un campo legacy sin revisar documentacion
- antes de tocar ventas, compras, pagos o contabilidad, revisar contratos funcionales y RPCs existentes

### Fuente de verdad para cambios de BD

La capa canonica de cambios es:

- `supabase/migrations/`
- `supabase/functions/`
- documentacion de soporte en `docs/supabase/` y `docs/important/`

Las Edge Functions ya presentes incluyen, entre otras:

- `send-contact-form`
- `admin-users`
- `send-otp`
- `send-user-invitation`
- `rate-limit`
- `sharepoint-storage`
- `monthly-report-worker`

### Regla critica para migraciones

Este repo ya ha tenido drift real entre historial local y remoto de Supabase. Por eso:

1. no asumir que local y remoto estan alineados sin validar
2. revisar `migration list --linked` antes de empujar cambios sensibles
3. priorizar migraciones idempotentes cuando sea posible
4. documentar cualquier drift o repair en `docs/supabase/` y `.codex/errores-soluciones.md`

### Regla critica de negocio

Nunca mezclar conceptos que el proyecto ya separa de forma explicita:

- `doc_status`
- `payment_status`
- estados contables o fiscales

`payment_status` es derivado y no debe tratarse como editable manualmente.

## 4. Infraestructura real

### Frontend

- Stack: React 18 + TypeScript + Vite
- UI: Tailwind + shadcn/ui + CSS propio
- Build de despliegue: `build/`

### Hosting y capa publica

- Hosting principal del frontend: Firebase Hosting
- Configuracion de hosting: `firebase.json`
- Script de despliegue: `npm run deploy`

Firebase en este proyecto no es el backend de negocio. Se usa sobre todo para:

- hosting
- analytics

### Backend y datos

- Supabase como PostgreSQL, Auth, Storage, RPCs y Edge Functions
- `supabase/functions/` para procesos backend server-side
- `supabase/migrations/` para esquema, RPCs y seeds versionados

### Capa documental y Microsoft 365

La infraestructura documental no termina en Supabase. El repo ya contempla:

- SharePoint como archivo documental oficial del ERP
- Microsoft Graph para calendarios y automatizaciones M365
- scripts operativos en `scripts/sharepoint/`
- documentacion canonicamente en `docs/sharepoint/`

Documentos clave:

- `docs/sharepoint/SHAREPOINT_ERP_SITE_ESTRUCTURA_DOCUMENTAL.md`
- `docs/sharepoint/M365_CALENDARS_NEXO_AV.md`

Principio operativo:

- el ERP es la fuente de verdad transaccional
- SharePoint es el archivo documental oficial
- un documento emitido no debe regenerarse como comportamiento normal si ya existe PDF archivado

### Otras piezas de infraestructura

- PWA activa con `vite-plugin-pwa`
- Firebase Analytics inicializado en `src/firebase.ts`
- scripts operativos clasificados por dominio en `scripts/`

## 5. Donde mirar segun la tarea

Si la tarea cae en `src/pages/nexo_av/`, usar este mapa corto:

- rutas y responsive: `src/app/routes/NexoRoutes.tsx`
- ERP desktop: `src/pages/nexo_av/desktop/`
- ERP mobile: `src/pages/nexo_av/mobile/`
- componentes compartidos ERP: `src/pages/nexo_av/components/`
- integracion Supabase: `src/integrations/supabase/`
- reglas de negocio: `src/constants/` y `docs/important/estados-nexo.md`
- documental SharePoint: `docs/sharepoint/`
- auditorias e incidentes previos: `audits/`, `.codex/errores-soluciones.md`

## 6. Guardrails para Claude y Codex

Antes de proponer cambios en este repo:

1. recordar que `src/pages/nexo_av/` vive dentro de un repo mixto, no aislado
2. revisar si el cambio afecta desktop, mobile o ambos
3. no tocar estados de negocio sin revisar contrato funcional
4. no tratar Supabase como un esquema simple si la app ya usa RPCs
5. no documentar ni copiar secretos en nuevos archivos
6. si el cambio consolida una forma de trabajo estable, registrarla en `.codex/avances.md`
7. si se corrige una incidencia real, registrarla en `.codex/errores-soluciones.md`

## 7. Resumen ejecutivo para agentes

Si solo hubiera que retener una idea, es esta:

`src/pages/nexo_av/` es el frontend de un ERP real que depende de Supabase para logica de negocio y de SharePoint/M365 para su capa documental y operativa. Cualquier cambio serio debe pensarse como cambio de plataforma, no como simple ajuste visual de una pagina React.
