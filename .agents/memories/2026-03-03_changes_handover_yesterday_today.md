# Handover cambios (ayer + hoy)

Fecha de consolidacion: 2026-03-03  
Alcance: commits recientes + working tree sin commit

## 1) Commits incluidos

### Commit A
- Hash: `0c50305a46c37ed17ae433c66f8682b0ed6764e5`
- Fecha: 2026-03-03 00:59:32 +0100
- Mensaje: `Organización y mejora del repositorio`
- Resumen:
  - Reorganizacion documental (`docs/`, `scripts/`, `src/shared/`).
  - Ajustes de routing y componentes marketing.
  - Ajustes extensos en mobile NEXO.
  - Auditorias contables nuevas en `audits/accounting/`.
  - Migracion: `supabase/migrations/20260302193000_fix_period_profit_summary_net_profit_consistency.sql`.

### Commit B
- Hash: `1fce1cd7e586c3d7aea8b4d041324fac0234f200`
- Fecha: 2026-03-02 22:07:24 +0100
- Mensaje: `chore: preparar release y despliegue de cambios acumulados`
- Resumen:
  - Alta masiva de skills en `.agents/skills/`.
  - Integracion SharePoint (docs, scripts, funciones edge, migraciones).
  - Seguridad y hardening en Supabase (auth/RLS).
  - Refactor de rutas (`src/app/routes/*`) y separación marketing/NEXO.
  - Ajustes fuertes en desktop/mobile NEXO y estilos.

## 2) Estado actual sin commit (working tree)

### Modificados
- `build/index.html`
- `src/app/routes/NexoRoutes.tsx`
- `src/constants/purchaseInvoiceStatuses.ts`
- `src/pages/nexo_av/desktop/components/common/DataList.tsx`
- `src/pages/nexo_av/desktop/components/common/DocumentPDFViewer.tsx`
- `src/pages/nexo_av/desktop/components/purchases/PurchaseInvoiceLinesEditor.tsx`
- `src/pages/nexo_av/desktop/components/purchases/TicketLinesEditor.tsx`
- `src/pages/nexo_av/desktop/pages/ExpenseDetailPage.tsx`
- `src/pages/nexo_av/desktop/pages/ExpensesPage.tsx`
- `src/pages/nexo_av/desktop/pages/InvoiceDetailPage.tsx`
- `src/pages/nexo_av/desktop/pages/PurchaseInvoicesPage.tsx`
- `src/pages/nexo_av/desktop/pages/QuoteDetailPage.tsx`
- `src/pages/nexo_av/desktop/styles/components/common/data-list.css`
- `src/pages/nexo_av/mobile/pages/MobileExpensesPage.tsx`
- `supabase/functions/sharepoint-storage/index.ts`

### Nuevos (sin commit)
- `audits/accounting/2026-03-03_ticket_expenses_audit_report.md`
- `audits/accounting/2026-03-03_ticket_expenses_findings.csv`
- `src/pages/nexo_av/desktop/pages/ExpensesPageDataList.tsx`
- `src/pages/nexo_av/shared/lib/` (directorio nuevo)
- `supabase/migrations/20260303120454_round_purchase_invoice_line_outputs_remote_compat.sql`
- `supabase/migrations/20260303121000_fix_purchase_payment_method_constraint_for_personal_and_external_credit.sql`
- `supabase/migrations/20260303153000_normalize_ticket_management_statuses.sql`
- `supabase/migrations/20260303190000_sales_archive_incidents_rpc.sql`

## 3) Estado tecnico relevante detectado

### Supabase/migraciones
- El entorno usa mejor `npx supabase` (CLI global no garantizada).
- Existe historial remoto/local con drift importante en migraciones.
- Hay antecedentes de archivos no validos en `supabase/migrations/` (ej. `temp_*.sql`) y timestamps duplicados en historico.
- Recomendacion: usar la skill `supabase-migration-hygiene` antes de cualquier push.

### SharePoint
- Documento canonico confirmado:
  - `docs/sharepoint/SHAREPOINT_ERP_SITE_ESTRUCTURA_DOCUMENTAL.md`
- SharePoint se maneja como archivo documental oficial, no como fuente transaccional.
- Recomendacion: usar skills `nexo-sharepoint-documental` y `nexo-sharepoint-sync-rules`.

### UI mobile
- Se definio skill de estandar visual y UX:
  - `.agents/skills/nexo-mobile-ui-standards/SKILL.md`
- Recomendacion: aplicar en pantallas prioritarias (dashboard/clientes/proyectos/gastos).

## 4) Skills disponibles tras esta ventana de trabajo
- `codex-project-system-prompt`
- `supabase-db-connection`
- `supabase-migration-hygiene`
- `nexo-sharepoint-documental`
- `nexo-sharepoint-sync-rules`
- `nexo-release-gate`
- `security-checks`
- `contable-auditoria-nexo`
- `nexo-brand-guidelines`
- `nexo-mobile-ui-standards`

## 5) Riesgos abiertos / pendientes
- Riesgo de bloqueo al desplegar migraciones si no se sanea drift.
- Riesgo de inconsistencia UI por cambios distribuidos en desktop/mobile sin gate unificado.
- Riesgo de perdida de trazabilidad si no se documenta cada batch en memoria tras cada jornada.

## 6) Protocolo rapido para proximas sesiones
1. Leer `CURRENT_STATE.md`.
2. Ejecutar chequeo rapido:
   - `git status --short`
   - `git log --since="2 days ago" --oneline`
3. Si hay DB: aplicar `supabase-migration-hygiene`.
4. Si hay SharePoint: aplicar `nexo-sharepoint-documental` + `nexo-sharepoint-sync-rules`.
5. Antes de cerrar jornada: actualizar memoria diaria e indice.
