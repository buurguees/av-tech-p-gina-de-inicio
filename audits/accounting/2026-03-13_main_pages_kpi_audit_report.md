# Auditoria KPI - Paginas principales (Proyectos, Facturas, Presupuestos)

Fecha: 2026-03-13

## Resumen ejecutivo

- **Proyectos**: los KPI principales **no son fiables**. Hoy mezclan estados legacy/canonicos y el bloque financiero muestra `Gastos = 0 EUR` por un bug de contrato con `list_purchase_invoices`, lo que infla el margen a `100,0%`.
- **Facturas**: los KPI superiores de trimestre **no funcionan en vivo** porque la pagina llama a `get_sales_invoice_kpi_summary` y esa RPC todavia no existe en el remoto. Los contadores del listado si son reales como fotografia del listado cargado, pero no como KPI canonico trimestral.
- **Presupuestos**: los contadores de estado son **bastante fiables** como resumen operacional del listado, pero el primer card no filtra `SENT` aunque visualmente lo parezca y el bloque no cubre todos los estados (`REJECTED`, `INVOICED`).

## Hallazgos priorizados

### P0 - Proyectos: el KPI de estados no representa la cartera real

- Evidencia funcional:
  - La pagina calcula `byStatus` con `PROJECT_STATUSES`, que usa `NEGOTIATION`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `INVOICED`, `CLOSED`, `CANCELLED`.
  - Pero las cards renderizadas usan `PLANNED`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `CANCELLED`.
  - Referencias:
    - [ProjectsPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/ProjectsPage.tsx#L96)
    - [ProjectsPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/ProjectsPage.tsx#L410)
    - [projectStatuses.ts](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/constants/projectStatuses.ts#L1)
    - [estados-nexo.md](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/docs/important/estados-nexo.md#L15)
- Datos vivos:
  - `list_projects()` devuelve `36` proyectos:
    - `NEGOTIATION = 20`
    - `IN_PROGRESS = 7`
    - `INVOICED = 2`
    - `CLOSED = 4`
    - `COMPLETED = 1`
    - `CANCELLED = 1`
    - `PLANNED = 1`
  - La fila KPI desktop hoy mostraria:
    - `Plan. = 1`
    - `En curso = 7`
    - `Pausa = 0`
    - `Fin = 1`
    - `Cancel = 1`
- Impacto:
  - `26` proyectos reales (`NEGOTIATION + INVOICED + CLOSED`) quedan fuera o mal clasificados en la cabecera principal.

### P0 - Proyectos: el KPI `Gastos` esta roto y fuerza un margen artificial de `100,0%`

- Evidencia funcional:
  - La pagina suma costes con `inv.tax_base || 0`.
  - La RPC `list_purchase_invoices` **no devuelve** `tax_base`.
  - Referencias:
    - [ProjectsPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/ProjectsPage.tsx#L166)
    - [20260303220000_baseline_remote_20260303.sql](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260303220000_baseline_remote_20260303.sql#L18766)
- Datos vivos:
  - Hay `24` compras con `project_id` y estado `APPROVED/PAID`.
  - Con la formula actual de UI, `totalCosts = 0`.
  - Si se usa al menos `subtotal` como base minima visible del RPC, esos mismos documentos suman `6.487,83 EUR`.
  - La pagina hoy queda en:
    - `Facturas = 12.000,05 EUR`
    - `Gastos = 0,00 EUR`
    - `Margen = 100,0%`
  - Con el fallback minimo visible del listado, el margen caeria a aprox. `45,93%`.
- Impacto:
  - La pagina principal de proyectos hoy sobrestima gravemente la rentabilidad.

### P1 - Proyectos: `Presup.` no significa presupuesto aprobado, sino mezcla de documentos abiertos

- Evidencia funcional:
  - El KPI `Presup.` suma todos los quotes con `project_id` salvo `REJECTED` y `EXPIRED`.
  - Eso incluye `DRAFT`, `SENT`, `APPROVED` e `INVOICED`.
  - Referencia: [ProjectsPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/ProjectsPage.tsx#L114)
- Datos vivos:
  - El KPI hoy suma `57.004,37 EUR`.
  - Ese numero no es "presupuesto aprobado" ni "pipeline puro"; es una mezcla semantica.
- Impacto:
  - La etiqueta induce a interpretar como cartera firme algo que incluye borradores y enviados no aprobados.

### P0 - Facturas: los cuatro KPI superiores trimestrales no estan operativos en vivo

- Evidencia funcional:
  - La pagina carga los KPI superiores desde `get_sales_invoice_kpi_summary`.
  - Si falla la RPC, deja `quarterKpis = null` y muestra toast de error.
  - Referencias:
    - [InvoicesPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/InvoicesPage.tsx#L207)
    - [InvoicesPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/InvoicesPage.tsx#L317)
    - [20260313110000_resolve_sales_kpi_conflicts.sql](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260313110000_resolve_sales_kpi_conflicts.sql#L60)
- Datos vivos:
  - El remoto responde `PGRST202`: no existe `public.get_sales_invoice_kpi_summary(...)`.
- Impacto:
  - Las tarjetas `Facturado bruto`, `Base neta`, `Cobrado` y `Pendiente de cobro` no pueden considerarse reales en produccion hoy.

### P1 - Facturas: el bloque inferior del listado es real como fotografia del listado, pero no como KPI canonico

- Evidencia funcional:
  - El listado usa `finance_list_invoices`.
  - Los filtros de cobro derivan sobre el array cargado en cliente.
  - Referencias:
    - [InvoicesPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/InvoicesPage.tsx#L170)
    - [InvoicesPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/InvoicesPage.tsx#L307)
    - [20260303220000_baseline_remote_20260303.sql](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260303220000_baseline_remote_20260303.sql#L14380)
- Datos vivos del listado actual:
  - `32` facturas
  - `12` con saldo pendiente
  - `1` vencida
  - `subtotal listado = 17.678,85 EUR`
  - `total listado = 21.391,41 EUR`
  - `cobrado listado = 16.346,30 EUR`
  - `pendiente listado = 5.045,11 EUR`
- Impacto:
  - Sirve como fotografia operativa del listado cargado.
  - No debe leerse como facturacion trimestral canonica mientras no viva la RPC nueva.

### P2 - Presupuestos: los contadores son coherentes, pero son parciales y el primer card no filtra lo que promete

- Evidencia funcional:
  - Los cards salen del mismo `quotes` cargado por `list_quotes`.
  - El primer card muestra `SENT`, pero al hacer click resetea `statusFilter` a `null` en lugar de filtrar `SENT`.
  - Referencias:
    - [QuotesPage.tsx](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/src/pages/nexo_av/desktop/pages/QuotesPage.tsx#L243)
    - [20260303220000_baseline_remote_20260303.sql](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260303220000_baseline_remote_20260303.sql#L18974)
- Datos vivos:
  - `65` presupuestos
  - `SENT = 18`
  - `APPROVED = 7`
  - `EXPIRED = 21`
  - `DRAFT = 3`
  - Ademas existen `REJECTED = 13` e `INVOICED = 3` que no aparecen en las cards.
- Impacto:
  - Los numeros que si aparecen son reales como status counters del listado.
  - El bloque no es una vista completa del funnel y el card de `Enviados` induce a pensar que filtra `SENT` cuando no lo hace.

## Estado de fiabilidad por pagina

- **Proyectos**: no fiable para decisiones.
- **Facturas**:
  - KPI superiores trimestrales: no fiables.
  - KPIs de listado actual: fiables como fotografia operativa del listado.
- **Presupuestos**: razonablemente fiables como contadores de estado del listado, pero parciales.

## Recomendacion operativa

1. Corregir primero **Proyectos**, porque hoy es la pagina con KPI mas engañosos.
2. Desplegar despues la migracion de ventas [20260313110000_resolve_sales_kpi_conflicts.sql](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260313110000_resolve_sales_kpi_conflicts.sql#L60) para reactivar y canonizar Facturas.

## Resolucion aplicada el 2026-03-13

- Se corrigio `Proyectos` en repo para:
  - normalizar `PLANNED -> NEGOTIATION`,
  - exponer tambien `INVOICED` y `CLOSED` en la cabecera,
  - calcular ingresos, costes y margen desde `get_project_financial_stats`,
  - redefinir `Presup.` como total de presupuestos `APPROVED` ligados a proyecto.
- Se corrigio `Presupuestos` en repo para:
  - hacer que el card `Enviados` filtre realmente `SENT`,
  - calcular los contadores sobre el dataset sin filtro de estado activo,
  - exponer tambien `INVOICED` y `REJECTED` en la cabecera.
- `Facturas` queda reactivada en vivo porque la migracion [20260313110000_resolve_sales_kpi_conflicts.sql](C:/Users/AlexBurgues/AV%20TECH%20ESDEVENIMENTS%20SL/Marketing%20-%20Documentos/V2_WEB/av-tech-p-gina-de-inicio/supabase/migrations/20260313110000_resolve_sales_kpi_conflicts.sql#L60) ya figura aplicada en remoto y `get_sales_invoice_kpi_summary` responde correctamente.

## Validacion posterior en vivo

- **Proyectos**:
  - `list_projects() = 36`
  - cabecera canonica: `NEGOTIATION = 21`, `IN_PROGRESS = 7`, `COMPLETED = 1`, `INVOICED = 2`, `CLOSED = 4`, `CANCELLED = 1`
  - totales financieros: `12.000,05 EUR` ingresos netos, `6.487,83 EUR` costes, `5.512,22 EUR` margen, `45,93%` margen
  - presupuestos aprobados ligados a proyecto: `13.021,88 EUR`
- **Facturas**:
  - `get_sales_invoice_kpi_summary('2026-01-01','2026-03-31')` devuelve:
    - `29` emitidas
    - `2` borradores
    - `20.389,09 EUR` facturado bruto
    - `16.850,49 EUR` base neta
    - `3.538,60 EUR` IVA
    - `15.800,59 EUR` cobrado
    - `4.588,50 EUR` pendiente
    - `1` vencida
  - `finance_list_invoices(p_status='ISSUED') = 31`, por lo que el filtro documental canonico ya funciona en vivo.
- **Presupuestos**:
  - `list_quotes() = 65`
  - estados reales visibles en cabecera: `SENT = 18`, `APPROVED = 6`, `EXPIRED = 21`, `DRAFT = 3`, `INVOICED = 4`, `REJECTED = 13`

## Estado actual de fiabilidad

- **Proyectos**: fiable para lectura ejecutiva de cartera y margen en la pagina principal.
- **Facturas**: fiable tanto en KPI trimestral canonico superior como en fotografia operativa del listado.
- **Presupuestos**: fiable como cabecera de estados del funnel visible en pagina principal.
