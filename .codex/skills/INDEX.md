# Skills index (carga contextual)

Este indice define que skill cargar segun la intencion de la tarea. Ruta canonica: `.codex/skills/<skill>/SKILL.md`

## Como usar este indice

1. Leer al iniciar chat junto con `.codex/errores-soluciones.md` y `.codex/avances.md`.
2. Elegir el skill mas especifico para la tarea.
3. Cargar solo el `SKILL.md` de ese skill.
4. Si hay tareas mixtas, cargar solo los skills minimos por dominio.

Cada skill incluye una guia para agentes con cuando cargarla, cuando no y como integrarla con la memoria operativa del repo.

---

## Mapa de seleccion

### Supabase y datos

| Skill | Cuando cargar | Ruta |
|-------|---------------|------|
| **nexo-supabase-safe-change** | Cambios en RPCs, migraciones, RLS, Edge Functions o contratos de datos | `.cursor/skills/nexo-supabase-safe-change/SKILL.md` |
| **supabase-db-connection** | Conectar, consultar esquema, ejecutar SQL o diagnosticar conexion a Supabase | `.codex/skills/supabase-db-connection/SKILL.md` |
| **supabase-migration-hygiene** | Crear, validar o desplegar migraciones Supabase con estandares del proyecto | `.codex/skills/supabase-migration-hygiene/SKILL.md` |

### Frontend y UI

| Skill | Cuando cargar | Ruta |
|-------|---------------|------|
| **nexo-feature-workflow** | Features o cambios funcionales, rutas, componentes o estados desktop/mobile | `.cursor/skills/nexo-feature-workflow/SKILL.md` |
| **nexo-frontend-desktop** | UI desktop del ERP | `.cursor/skills/nexo-frontend-desktop/SKILL.md` |
| **nexo-frontend-mobile** | UI mobile del ERP | `.cursor/skills/nexo-frontend-mobile/SKILL.md` |
| **nexo-responsive-integration** | Rutas, layouts o componentes compartidos entre desktop y mobile | `.cursor/skills/nexo-responsive-integration/SKILL.md` |
| **nexo-design-system-ui** | Coherencia visual, tokens, tipografia, layouts o componentes | `.cursor/skills/nexo-design-system-ui/SKILL.md` |
| **nexo-mobile-ui-standards** | Estandares UI/UX mobile, tactilidad, legibilidad y paridad | `.codex/skills/nexo-mobile-ui-standards/SKILL.md` |

### SharePoint y documental

| Skill | Cuando cargar | Ruta |
|-------|---------------|------|
| **nexo-sharepoint-documental** | SharePoint como archivo documental del ERP, estructura, metadatos y permisos | `.codex/skills/nexo-sharepoint-documental/SKILL.md` |
| **nexo-sharepoint-sync-rules** | Reglas de sincronizacion ERP a SharePoint, rutas, metadatos, naming y archivado | `.codex/skills/nexo-sharepoint-sync-rules/SKILL.md` |

### Microsoft 365 y operativa

| Skill | Cuando cargar | Ruta |
|-------|---------------|------|
| **nexo-m365-calendar-sync** | Sync de calendarios M365 con `CalendarPage`, planning, instalaciones o hitos de facturacion | `.codex/skills/nexo-m365-calendar-sync/SKILL.md` |
| **nexo-ops-planning-runtime** | Reglas del runtime operativo de sites, assignments, visits y paso a facturacion | `.codex/skills/nexo-ops-planning-runtime/SKILL.md` |
| **nexo-m365-notifications** | Notificaciones por Outlook/Teams ligadas a tareas, alertas ERP o eventos operativos | `.codex/skills/nexo-m365-notifications/SKILL.md` |
| **nexo-document-intelligence-ocr** | OCR y extraccion con Azure Document Intelligence para scanner, compras y tickets | `.codex/skills/nexo-document-intelligence-ocr/SKILL.md` |
| **nexo-m365-excel-reporting** | Publicacion de Excel y reportes contables/fiscales en SharePoint/M365 | `.codex/skills/nexo-m365-excel-reporting/SKILL.md` |
| **nexo-entra-graph-governance** | Permisos Graph, Entra, IDs estables y configuracion de integraciones Microsoft | `.codex/skills/nexo-entra-graph-governance/SKILL.md` |
| **nexo-power-bi-kpi-contracts** | Contratos canonicos de KPI antes de modelar dashboards o Power BI | `.codex/skills/nexo-power-bi-kpi-contracts/SKILL.md` |
| **nexo-mail-approvals** | Patrones de aprobacion por mail o Teams con trazabilidad dentro del ERP | `.codex/skills/nexo-mail-approvals/SKILL.md` |

### Contabilidad y auditoria

| Skill | Cuando cargar | Ruta |
|-------|---------------|------|
| **contable-auditoria-nexo** | Auditar modulo contable, DB, RPC, RLS o UI y detectar drift PGC/estados | `.codex/skills/contable-auditoria-nexo/SKILL.md` |
| **nexo-audit-and-drift** | Detectar drift entre documentacion, frontend y backend | `.cursor/skills/nexo-audit-and-drift/SKILL.md` |

### Calidad, seguridad y release

| Skill | Cuando cargar | Ruta |
|-------|---------------|------|
| **nexo-release-gate** | Gate de calidad previo a merge o deploy | `.codex/skills/nexo-release-gate/SKILL.md` |
| **security-checks** | Comprobaciones de seguridad, secretos, dependencias, auth y hardening | `.codex/skills/security-checks/SKILL.md` |

### Contexto y marca

| Skill | Cuando cargar | Ruta |
|-------|---------------|------|
| **repo-context-avtech-nexo** | Resumen rapido del contexto del repositorio | `.cursor/skills/repo-context-avtech-nexo/SKILL.md` |
| **nexo-brand-guidelines** | Identidad de marca en documentos, UI o propuestas | `.codex/skills/nexo-brand-guidelines/SKILL.md` |
| **codex-project-system-prompt** | Inicializar agente con System Prompt base del proyecto | `.codex/skills/codex-project-system-prompt/SKILL.md` |

---

## Skills migradas a .codex

Las siguientes skills viven en `.codex/skills/`:

- `codex-project-system-prompt`
- `contable-auditoria-nexo`
- `nexo-brand-guidelines`
- `nexo-document-intelligence-ocr`
- `nexo-entra-graph-governance`
- `nexo-mail-approvals`
- `nexo-m365-calendar-sync`
- `nexo-m365-excel-reporting`
- `nexo-m365-notifications`
- `nexo-mobile-ui-standards`
- `nexo-ops-planning-runtime`
- `nexo-power-bi-kpi-contracts`
- `nexo-release-gate`
- `nexo-sharepoint-documental`
- `nexo-sharepoint-sync-rules`
- `security-checks`
- `supabase-db-connection`
- `supabase-migration-hygiene`

Las skills en `.cursor/skills/` se mantienen por compatibilidad; las de `.agents/skills/` se consideran legacy y la fuente canonica es `.codex/skills/` cuando exista equivalente.
