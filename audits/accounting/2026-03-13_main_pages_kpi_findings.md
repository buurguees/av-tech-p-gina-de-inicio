# Findings - KPI paginas principales

## P0

- `KPI-PROJ-001`: la cabecera de Proyectos usa `PLANNED` en vez de `NEGOTIATION` y omite `INVOICED` y `CLOSED`, por lo que hoy no representa la cartera real (`36` proyectos, pero la fila visible solo refleja `10`).
- `KPI-PROJ-002`: el KPI `Gastos` de Proyectos suma `inv.tax_base || 0`, pero `list_purchase_invoices` no devuelve `tax_base`; hoy deja `0 EUR` y fuerza `Margen = 100,0%`.
- `KPI-INV-001`: los cuatro KPI trimestrales superiores de Facturas dependen de `get_sales_invoice_kpi_summary`, RPC que todavia no existe en vivo (`PGRST202`).

## P1

- `KPI-PROJ-003`: el KPI `Presup.` en Proyectos mezcla `DRAFT`, `SENT`, `APPROVED` e `INVOICED`; no equivale a presupuesto aprobado ni a pipeline puro.
- `KPI-INV-002`: los contadores inferiores de Facturas son coherentes con el listado actual, pero no deben leerse como KPI trimestral canonico.

## P2

- `KPI-QUOTE-001`: los KPI de Presupuestos son consistentes como contadores de estado del listado (`SENT=18`, `APPROVED=7`, `EXPIRED=21`, `DRAFT=3`), pero no cubren `REJECTED` ni `INVOICED`.
- `KPI-QUOTE-002`: el card `Enviados` en Presupuestos no filtra `SENT`; al hacer click resetea al listado completo.

## Estado tras correccion del 2026-03-13

- `KPI-PROJ-001`: resuelto en [ProjectsPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/ProjectsPage.tsx) y [projectStatuses.ts](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/constants/projectStatuses.ts).
- `KPI-PROJ-002`: resuelto en [ProjectsPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/ProjectsPage.tsx) usando `get_project_financial_stats` como fuente de ingresos y costes.
- `KPI-PROJ-003`: resuelto en [ProjectsPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/ProjectsPage.tsx) limitando el KPI a presupuestos `APPROVED`.
- `KPI-INV-001`: resuelto en vivo al constar aplicada la migracion [20260313110000_resolve_sales_kpi_conflicts.sql](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260313110000_resolve_sales_kpi_conflicts.sql#L60) y responder `get_sales_invoice_kpi_summary`.
- `KPI-INV-002`: resuelto de forma contractual en [InvoicesPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/InvoicesPage.tsx) separando KPI trimestral canonico y contadores del `Listado actual`.
- `KPI-QUOTE-001`: resuelto en [QuotesPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/QuotesPage.tsx) anadiendo `INVOICED` y `REJECTED` a la cabecera.
- `KPI-QUOTE-002`: resuelto en [QuotesPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/QuotesPage.tsx) haciendo que `Enviados` filtre `SENT` y manteniendo los contadores fuera del filtro activo.
