# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto de empresa y producto

**AV TECH Esdeveniments SL** es una empresa de soluciones audiovisuales e integración tecnológica. Opera en el sector de instalaciones AV, cartelería digital, sistemas de control y eventos corporativos. La empresa gestiona proyectos técnicos, clientes directos y partners/técnicos externos que ejecutan instalaciones en campo.

**NEXO AV** no es un CRM ni un panel de administración. Es la **plataforma operativa central** de la empresa: el sistema desde el que se gestionan proyectos, presupuestos, facturas, compras, gastos, contabilidad, catálogo de productos/servicios/packs, archivo documental y la planificación de instalaciones. Está diseñado para ser usado a diario por todos los departamentos: dirección, comercial, operativa, contabilidad y técnicos en campo.

### Cómo trabaja la empresa dentro de NEXO AV

El flujo operativo típico es:

```
Captación (lead en mapa) → Presupuesto → Proyecto → Instalación (planning + técnicos)
→ Factura → Cobro → Cierre documental en SharePoint
```

Los actores principales son:
- **Admin / Dirección** — visión global, contabilidad, bancos, informes.
- **Comercial** — clientes, presupuestos, facturas, pipeline.
- **Operativa / Manager** — proyectos, planning, técnicos, compras.
- **Técnico** — instalaciones asignadas, partes de trabajo, scanner de tickets.
- **Partners** — técnicos externos con acceso limitado a sus propias instalaciones.

El catálogo de **Productos, Servicios y Packs** alimenta presupuestos y facturas directamente. Los productos tienen subcategorías con código canónico (`PA-01`..`PA-08`, `MI`, etc.) y SKU generado automáticamente por RPC.

La capa documental oficial vive en **SharePoint**: facturas emitidas, presupuestos, compras y tickets se archivan automáticamente en su ruta canónica. Un documento archivado no debe regenerarse si ya existe PDF en SharePoint.

### Hacia dónde va NEXO AV

El proyecto tiene una capa de IA en desarrollo activo: **NEXO AI**. Incluye un worker backend (ALB357/Ollama), contexto por rol de usuario, grupos departamentales y un sistema de sugerencias integrado en el ERP. La visión futura incluye bandejas de agentes, automatización de operaciones, control tower y procesado de documentos con OCR (Azure Document Intelligence). Cualquier trabajo en la capa de IA debe tener en cuenta esta dirección.

### Lo que un agente no debe asumir

- Que `src/pages/nexo_av/` es "una página React más". Es un ERP real en producción con datos reales de la empresa.
- Que partners y clientes son el mismo concepto. Son entidades separadas con flujos, accesos y permisos distintos.
- Que el estado de negocio se puede deducir de un campo sin revisar la documentación funcional. Los estados `doc_status`, `payment_status` y categorías contables están estrictamente separados y tienen reglas definidas.
- Que local y remoto de Supabase están sincronizados sin validar. El repo tiene historial de drift documentado.
- Que un cambio visual en desktop no afecta a mobile (o al revés). La paridad responsive es obligatoria.

---

## Qué es este repositorio

Este repositorio contiene **dos productos en la misma base de código**:

1. **AV TECH** — web corporativa pública (marketing).
2. **NEXO AV** — plataforma operativa interna (ERP) de ventas, proyectos, compras, contabilidad, catálogo, documental e IA.

`src/pages/nexo_av/` es el frontend de un ERP real que depende de Supabase para lógica de negocio y de SharePoint/M365 para su capa documental y operativa. Cualquier cambio en esa área debe pensarse como cambio de plataforma, no como ajuste visual de una página React.

## Comandos habituales

```bash
# Desarrollo local
npm run dev

# Build de producción (con aumento de heap por tamaño del bundle)
npm run build

# Verificar tipos sin compilar
npx tsc --noEmit

# Lint
npm run lint

# Desplegar a Firebase Hosting
npm run deploy

# Supabase — validar migraciones pendientes contra el remoto
npx supabase migration list --linked

# Supabase — dry-run antes de hacer push
npx supabase db push --linked --dry-run

# Supabase — aplicar migración concreta via MCP (preferido cuando hay drift)
# Usar mcp__claude_ai_Supabase__apply_migration

# Sync documental SharePoint
npm run sharepoint:sync:sales
npm run sharepoint:sync:purchases
```

**Validación mínima antes de commit:** `npx tsc --noEmit` + `npm run build`.

## Arquitectura del código

### Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RPCs, Edge Functions)
- **Hosting:** Firebase Hosting (`npm run deploy`)
- **Documental:** SharePoint + Microsoft Graph (M365)
- **PWA:** `vite-plugin-pwa` activo

### Estructura principal

```
src/
  App.tsx                         # Raíz: carga marketingRoutes + nexoRoutes
  app/routes/
    NexoRoutes.tsx                # Rutas del ERP (ver más abajo)
    MarketingRoutes.tsx           # Rutas web pública
  pages/
    nexo_av/
      desktop/                   # ERP versión escritorio
      mobile/                    # ERP versión móvil
      components/ResponsivePage  # createResponsivePage() — punto clave
      layouts/ResponsiveLayout   # Layout raíz del ERP
    marketing/                   # Web pública AV TECH
  integrations/supabase/
    client.ts                    # Cliente tipado de Supabase
    types.ts                     # Tipos generados (regenerar con supabase gen types)
  constants/                     # Reglas de negocio: estados, categorías, etc.
  components/ui/                 # Componentes shadcn/ui compartidos
supabase/
  migrations/                    # Única fuente de verdad para esquema y RPCs
  functions/                     # Edge Functions (sharepoint-storage, send-otp, etc.)
docs/
  important/                     # Documentación funcional crítica
  supabase/                      # Historial de drift y repairs
  sharepoint/                    # Integración documental M365
.claude/                         # Memoria operativa del proyecto (leer al iniciar)
```

### Patrón responsive desktop/mobile

Las rutas del ERP usan `createResponsivePage(desktopImport, mobileImport)` definido en `src/pages/nexo_av/components/ResponsivePage.tsx`. La selección entre desktop y mobile es automática.

**Regla:** si se toca una página del ERP, comprobar si existe contraparte en la otra versión y mantener consistencia. Revisar `NexoRoutes.tsx` para ver qué rutas son responsivas.

### Supabase — cómo trabaja el frontend

El frontend **no trabaja principalmente contra tablas directas**. La mayor parte de NEXO AV consume **RPCs de Supabase**. Puntos clave:

- No asumir que leer una tabla `public` refleja el modelo completo.
- `payment_status` es **siempre calculado**, nunca editable directamente.
- Los estados `doc_status`, `payment_status` y categorías contables están estrictamente separados.
- Antes de tocar ventas, compras, pagos o contabilidad: revisar `docs/important/estados-nexo.md` y `src/constants/`.

### Migraciones Supabase — guardrails críticos

Este repo ha tenido drift real entre historial local y remoto. Por eso:

1. Revisar `migration list --linked` antes de hacer push.
2. Priorizar migraciones idempotentes (`WHERE NOT EXISTS`).
3. Para aplicar una sola migración cuando hay otras pendientes: usar `--workdir` temporal o MCP `apply_migration`.
4. Documentar cualquier drift o repair en `docs/supabase/` y `.claude/errores-soluciones.md`.
5. **No asumir que local y remoto están alineados sin validar.**

## Memoria operativa del proyecto

Al iniciar trabajo relevante, leer en este orden:

1. `.claude/errores-soluciones.md` — incidentes reales y correcciones verificadas.
2. `.claude/avances.md` — capacidades reutilizables y conocimiento consolidado.
3. `.claude/skills/INDEX.md` — seleccionar skill específica si aplica.

Documentos de referencia por dominio:

| Dominio | Documento |
|---|---|
| Arquitectura general | `docs/architecture/CONTEXTO_REPO_AVTECH_NEXO_PARA_AGENTES.md` |
| Estados y reglas de negocio | `docs/important/estados-nexo.md` + `src/constants/` |
| Organización del repo | `docs/architecture/REPO_ORGANIZATION.md` |
| Catálogo — clasificación | `docs/nexo/catalog-classification-guide.md` |
| Supabase — drift histórico | `docs/supabase/` |
| SharePoint + M365 | `docs/sharepoint/` |
| Auditorías contables | `audits/accounting/` |

## Conexión Supabase (MCP)

- `project_id`: `takvthfatlcjsqgssnta`
- Config: `supabase/config.toml`
- Config MCP para agentes: `.claude/mcp.json`
- Skill de conexión: `.claude/skills/supabase-db-connection/SKILL.md`

## Catálogo — reglas de nomenclatura

- Los SKU se asignan automáticamente por RPC (`create_catalog_product`). No fabricar SKU en frontend.
- Los productos requieren siempre una **subcategoría** (no solo categoría raíz).
- Categorías canonicas con código numérico `PA-01`..`PA-08`, `MI`, etc. Consultar la guía antes de crear nuevas.
- Packs: tipo `BUNDLE`; usar `base_price_real` y `visible_discount_percent` como fuente visual, no `sale_price` directamente.

## Cierre de sesión — registro obligatorio

- Si se corrigió un error real: registrar en `.claude/errores-soluciones.md`.
- Si se consolidó una capacidad nueva: registrar en `.claude/avances.md`.
