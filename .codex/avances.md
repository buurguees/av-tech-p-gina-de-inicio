# Registro de avances y capacidades desbloqueadas

Este archivo se carga al iniciar cada chat para mantener memoria operativa de avances, capacidades nuevas y conocimiento consolidado del sistema.

## Plantilla de registro (usar en cada avance relevante)

### [AAAA-MM-DD] Titulo corto del avance

- Contexto:
- Capacidad desbloqueada:
- Impacto operativo:
- Archivos o componentes implicados:
- Validacion realizada:
- Como reutilizarlo en el futuro:

---

## Historial

### [2026-03-14] Navegacion mobile endurecida contra rutas inexistentes

- Contexto: revision de estabilidad de carga en mobile antes de publicar cambios a GitHub y desplegar.
- Capacidad desbloqueada: la navegacion inferior y la pantalla de ajustes mobile ya no dependen de rutas no implementadas para roles sin menu adicional ni para opciones aun pendientes de desarrollar.
- Impacto operativo: se evita que usuarios mobile caigan en `NotFound` desde accesos legitimos de la propia interfaz, especialmente en `Ajustes` y en el quinto item del bottom nav para comerciales y tecnicos.
- Archivos o componentes implicados: `src/pages/nexo_av/mobile/components/layout/BottomNavigation.tsx`, `src/pages/nexo_av/mobile/pages/MobileSettingsPage.tsx`, `.codex/errores-soluciones.md`.
- Validacion realizada: `rg` sin coincidencias para rutas mobile inexistentes corregidas; `npx tsc --noEmit` OK; `npm run -s build` OK el `2026-03-14`.
- Como reutilizarlo en el futuro: cualquier nueva accion mobile debe comprobar primero que exista la ruta en `src/app/routes/NexoRoutes.tsx`; si no existe, redirigir a una pantalla valida o mostrar feedback controlado hasta que la funcionalidad tenga pagina propia.

### [2026-03-13] Repair reutilizable del historial linked de Supabase hacia baseline canonica

- Contexto: el proyecto linked de Supabase seguia atado a una historia legacy remota incompatible con la baseline local, bloqueando `db pull` y cualquier reconciliacion limpia del estado real.
- Capacidad desbloqueada: existe un flujo reusable para reparar el historial linked por lotes a partir de evidencia versionada, aplicando solo la baseline canonica y dejando como pendientes las migraciones funcionales no desplegadas.
- Impacto operativo: el repo ya no depende de copiar cientos de comandos de `migration repair` a mano; el estado linked remoto quedo primero alineado con `20260303220000` y despues completamente sincronizado al desplegar `20260313110000` y `20260313143000`, dejando `db pull` bloqueado solo por la ausencia de Docker Desktop.
- Archivos o componentes implicados: `scripts/nexo/repair-linked-migration-history.ps1`, `docs/supabase/evidence/2026-03-13/migration-list-linked.txt`, `docs/supabase/evidence/2026-03-13/db-pull-output.txt`, `docs/supabase/evidence/2026-03-13/migration-list-linked-after-repair.txt`, `docs/supabase/2026-03-13_linked_history_repair.md`.
- Validacion realizada: `dry-run` del script mostrando `598` remote-only, `3` local-only y solo `20260303220000` como `apply`; ejecucion real del repair OK; despliegue posterior de `20260313110000` y `20260313143000`; `migration list --linked` final sincronizado para `20260303220000`, `20260313110000`, `20260313143000` y `20260313173000`; `db pull` posterior fallando solo por `dockerDesktopLinuxEngine` ausente.
- Como reutilizarlo en el futuro: volver a capturar `migration list --linked`, ejecutar el script en `dry-run`, revisar que solo se marca como `applied` lo realmente desplegado, aplicar repair por lotes solo sobre deuda historica y, si hay migraciones locales que deben intercalarse antes de otra ya remota, desplegarlas con `db push --include-all` y revalidacion inmediata.

### [2026-03-13] Conciliacion contable inicial de compras, aplazados y bancos con datos vivos

- Contexto: revision funcional para validar compras pendientes, pagos a plazo y saldos teoricos por cuenta bancaria frente a saldos reales reportados manualmente.
- Capacidad desbloqueada: existe una fotografia versionada de la tesoreria contable y del pasivo de compras a `2026-03-13`, incluyendo el descuadre banco a banco y la deteccion de un aplazamiento material fuera del modulo formal de `credit_operations`.
- Impacto operativo: ya se puede priorizar la conciliacion bancaria real sobre Sabadell y Revolut con cifras objetivas y sin mezclar compras corrientes con pagos a plazo no formalizados.
- Archivos o componentes implicados: `audits/accounting/2026-03-13_purchases_banks_review.md`, `audits/accounting/2026-03-13_purchases_banks_findings.md`, `supabase/migrations/20260303220000_baseline_remote_20260303.sql`.
- Validacion realizada: contraste read-only contra Supabase en vivo usando `list_purchase_invoices`, `get_purchase_invoice_payments`, `get_credit_operations`, `get_credit_installments`, `list_company_bank_accounts`, `list_bank_accounts_with_balances` y `list_cash_movements`, mas contraste manual con saldos reales facilitados por el usuario.
- Como reutilizarlo en el futuro: usar este corte como baseline antes de meter extractos o ajustar bancos; cualquier reconciliacion posterior debe explicar explicitamente la variacion frente a Sabadell `3.477,46`, CaixaBank `2.121,39` y Revolut `215,74` reportados el 2026-03-13.

### [2026-03-13] Flujo seguro para alinear bancos reales en Supabase pese a RPC bancaria rota

- Contexto: era necesario cuadrar los saldos de Sabadell, CaixaBank y Revolut en vivo, pero la RPC publica `create_bank_balance_adjustment` no resolvia las cuentas 572 reales del entorno.
- Capacidad desbloqueada: existe un patron reusable para regularizar bancos reales con una migracion de datos versionada que calcula deltas contra `list_bank_accounts_with_balances`, inserta un unico asiento `ADJUSTMENT` y se despliega desde un workdir temporal con solo `baseline + migracion objetivo`.
- Impacto operativo: ya se pueden ejecutar ajustes puntuales en live sin hotfix manual ni riesgo de desplegar por error otras migraciones pendientes; el asiento `AS-2026-3577` dejo NEXO alineado con Sabadell `3.477,46`, CaixaBank `2.121,39` y Revolut `215,74` a `2026-03-13`.
- Archivos o componentes implicados: `supabase/migrations/20260313173000_align_bank_balances_to_real_20260313.sql`, `audits/accounting/2026-03-13_purchases_banks_review.md`, `audits/accounting/2026-03-13_purchases_banks_findings.md`, `supabase/config.toml`, `supabase/.temp/`.
- Validacion realizada: `npx supabase migration list --linked` previo con solo baseline aplicada; `npx supabase db push --linked --dry-run --workdir .tmp/supabase-bank-alignment-20260313` mostrando una unica migracion; despliegue real OK; relectura posterior de `list_bank_accounts_with_balances('2026-03-13')` y `list_journal_entries(...)` confirmando el asiento generado.
- Como reutilizarlo en el futuro: cuando haya una regularizacion puntual de datos y existan otras migraciones locales pendientes, copiar solo `supabase/config.toml`, `supabase/.temp/`, la baseline aplicada y la nueva migracion a un workdir temporal, hacer `dry-run`, aplicar y verificar con RPCs read-only.

### [2026-03-13] Auditoria versionada de KPI en paginas principales del ERP

- Contexto: necesidad de validar si las paginas principales de Proyectos, Facturas y Presupuestos mostraban KPI utilizables para direccion.
- Capacidad desbloqueada: existe una fotografia trazable de que Proyectos tiene hoy el mayor drift funcional (estado `NEGOTIATION` mal mapeado y `Gastos = 0` por contrato roto con `list_purchase_invoices`), Facturas tiene el bloque trimestral superior caido por falta de `get_sales_invoice_kpi_summary` en live, y Presupuestos es razonablemente consistente como resumen operacional pero parcial.
- Impacto operativo: ya se puede priorizar correcciones con criterio objetivo: primero Proyectos, luego despliegue de la RPC canonica de Facturas, y despues refinamiento de Presupuestos.
- Archivos o componentes implicados: `audits/accounting/2026-03-13_main_pages_kpi_audit_report.md`, `audits/accounting/2026-03-13_main_pages_kpi_findings.md`, `src/pages/nexo_av/desktop/pages/ProjectsPage.tsx`, `src/pages/nexo_av/desktop/pages/InvoicesPage.tsx`, `src/pages/nexo_av/desktop/pages/QuotesPage.tsx`, `supabase/migrations/20260303220000_baseline_remote_20260303.sql`, `supabase/migrations/20260313110000_resolve_sales_kpi_conflicts.sql`.
- Validacion realizada: reproduccion de formulas de UI contra datos vivos del `2026-03-13`; `list_projects = 36` con `NEGOTIATION = 20`; `list_purchase_invoices` para proyectos devolviendo `24` docs pero sin campo `tax_base`; `finance_list_invoices = 32`; `get_sales_invoice_kpi_summary` devolviendo `PGRST202`; `list_quotes = 65` con estado operativo coherente.
- Como reutilizarlo en el futuro: antes de tocar cualquier dashboard o KPI ejecutivo, contrastar la formula real de la pagina con la RPC viva y con este corte base; si una card no tiene fuente canonica o mezcla semanticas, marcarla como no fiable antes de exponerla a direccion o Power BI.

### [2026-03-13] Skill de conexion Supabase alineada con el repo y validada contra el remoto real

- Contexto: la skill `supabase-db-connection` estaba desalineada respecto al flujo real del proyecto, que usa `supabase/config.toml`, cliente generado en `src/integrations/supabase/client.ts`, `npx supabase` y un remoto con drift historico documentado.
- Capacidad desbloqueada: existe una guia operativa actualizada y validada para comprobar conexion a Supabase sin exponer secretos, priorizando `project_id`, variables efectivas, Auth, PostgREST y limites del entorno cuando no hay `psql`.
- Impacto operativo: los agentes ya pueden distinguir rapidamente entre conectividad correcta y bloqueo por tooling o drift de migraciones, evitando usar `db pull` como falsa prueba de salud en este repo.
- Archivos o componentes implicados: `.codex/skills/supabase-db-connection/SKILL.md`, `.agents/skills/supabase-db-connection/SKILL.md`, `supabase/config.toml`, `src/integrations/supabase/client.ts`, `docs/supabase/2026-03-03_historical_migration_drift_diagnosis.md`.
- Validacion realizada: `quick_validate.py` OK sobre ambas skills; `npx supabase --version` OK (`2.78.1`); `project_id` detectado como `takvthfatlcjsqgssnta`; `.env` con `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_DB_URL`; `psql` ausente en el entorno actual; `GET /auth/v1/settings` y `GET /rest/v1/` respondiendo `200` con la key publica.
- Como reutilizarlo en el futuro: cargar `supabase-db-connection` para diagnostico de acceso y combinarla con `supabase-migration-hygiene` o `nexo-supabase-safe-change` si la tarea pasa de comprobacion a cambios reales de esquema, RPC o despliegue.

### [2026-03-13] Capa canonica de KPIs de ventas preparada y validada contra datos reales

- Contexto: tras la auditoria de discrepancias era necesario convertir el diagnostico en una solucion versionada que alineara dashboard, finanzas e invoices.
- Capacidad desbloqueada: existe una migracion lista para aplicar que unifica el contrato de ventas trimestrales en bruto, neto, IVA, cobrado y pendiente usando estados documentales y de cobro derivados en lugar de estados legacy raw.
- Impacto operativo: el equipo ya puede desplegar una unica fuente de verdad para facturacion trimestral sin recalcular a mano ni depender de widgets o listados ambiguos; el dato canonico para Q1 2026 queda fijado en repo como `20.389,09 EUR` bruto, `16.850,49 EUR` neto y `15.800,59 EUR` cobrado.
- Archivos o componentes implicados: `supabase/migrations/20260313110000_resolve_sales_kpi_conflicts.sql`, `src/pages/nexo_av/desktop/pages/InvoicesPage.tsx`, `src/pages/nexo_av/desktop/components/dashboard/roles/CommercialDashboard.tsx`, `src/pages/nexo_av/desktop/components/dashboard/widgets/RevenueChart.tsx`, `src/pages/nexo_av/desktop/components/dashboard/widgets/CashFlowChart.tsx`, `src/integrations/supabase/types.ts`, `src/constants/salesInvoiceStatuses.ts`.
- Validacion realizada: `npm run build` OK el 2026-03-13; contraste read-only contra Supabase en vivo confirmando que la logica canonica reproduce el dashboard bruto correcto y explica la desviacion de `finance_get_period_summary` por el borrador `F-BORR-0031`; comprobado tambien que la nueva RPC aun no esta desplegada en vivo (`404`), por lo que el repo contiene el fix pendiente de aplicacion.
- Como reutilizarlo en el futuro: usar `get_sales_invoice_kpi_summary` como unica fuente para KPIs de ventas y tratar `finance_list_invoices` solo como listado operacional; cualquier nuevo dashboard o reporte debe etiquetar explicitamente si muestra bruto, neto, IVA, cobrado o pendiente.

### [2026-03-13] Auditoria versionada de discrepancias KPI contables y de facturacion

- Contexto: revision completa del descuadre de facturacion trimestral entre dashboard, contabilidad, informes fiscales y listados de facturas.
- Capacidad desbloqueada: trazabilidad versionada de que Q1 2026 mezcla al menos cuatro metricas distintas en produccion: facturado bruto con IVA, ingreso neto contable sin IVA, cobrado y total listado con borradores.
- Impacto operativo: ya existe una base objetiva para corregir los KPI sin tocar datos a ciegas; el equipo puede decidir contrato de metricas antes de cambiar queries productivas.
- Archivos o componentes implicados: `audits/accounting/2026-03-13_accounting_audit_report.md`, `audits/accounting/2026-03-13_accounting_findings.md`, `supabase/migrations/20260303220000_baseline_remote_20260303.sql`, `src/pages/nexo_av/desktop/pages/AccountingPage.tsx`, `src/pages/nexo_av/desktop/components/dashboard/roles/AdminDashboard.tsx`, `src/pages/nexo_av/desktop/pages/InvoicesPage.tsx`, `src/pages/nexo_av/mobile/pages/MobileInvoicesPage.tsx`.
- Validacion realizada: consulta read-only contra Supabase en vivo el 2026-03-13 comparando `dashboard_get_admin_overview`, `finance_get_period_summary`, `get_period_profit_summary`, `get_fiscal_quarter_data` y `finance_list_invoices`.
- Como reutilizarlo en el futuro: usar este informe como checklist base antes de tocar cualquier KPI de ventas; si se crea una RPC canonica, validar contra estas cifras de Q1 2026 para evitar regresiones.

### [2026-03-13] Validacion real de acceso Graph para SharePoint y calendarios

- Contexto: revision del acceso de NEXO AV a calendarios corporativos desde Azure ID / Microsoft Graph para sincronizacion con SharePoint.
- Capacidad desbloqueada: verificacion operativa de que la app `NEXO-Graph-Integration` obtiene token app-only con permisos `Sites.Selected` y `Sites.ReadWrite.All`, puede leer el site `NEXO AV` y sus listas, pero no puede enumerar `users`, `groups` ni calendarios de Outlook.
- Impacto operativo: el backend actual puede trabajar con listas y bibliotecas de SharePoint del site `NEXOAV`, incluida la lista `Eventos`, pero no puede descubrir ni consumir calendarios de Microsoft 365 hasta ampliar permisos y consentimiento en Azure.
- Archivos o componentes implicados: `.env`, `supabase/functions/sharepoint-storage/index.ts`, `docs/sharepoint/SHAREPOINT_ERP_SITE_ESTRUCTURA_DOCUMENTAL.md`.
- Validacion realizada: token Graph decodificado; acceso OK a `sites/{siteId}` y `sites/{siteId}/lists`; lista `Eventos` detectada como template `events` con columnas de calendario; consulta `users` y `groups` devolviendo `403`; lista `Eventos` actualmente sin items.
- Como reutilizarlo en el futuro: antes de disenar sync calendario<->NEXO, distinguir si el origen sera una lista `events` de SharePoint o calendarios Outlook/M365; si es Outlook, solicitar permisos Graph de calendarios y de descubrimiento de identidades/grupos.

### [2026-03-13] Acceso operativo a calendarios M365 del buzon de Alex

- Contexto: segunda validacion tras ampliar permisos Azure para integrar calendarios `Instalaciones`, `Facturacion`, `Comercial` y `Marketing`.
- Capacidad desbloqueada: la app `NEXO-Graph-Integration` recibe ahora `Calendars.ReadWrite` y puede leer calendarios reales del buzon `alex.burgues@avtechesdeveniments.com`, incluyendo sus calendarios secundarios por nombre e items detallados.
- Impacto operativo: NEXO ya puede consumir eventos de `Instalaciones`, `Facturacion`, `Comercial` y `Marketing` si trabaja contra ese buzon concreto; no puede descubrir buzones o grupos por listado general porque `users` y `groups` siguen devolviendo `403`.
- Archivos o componentes implicados: `.env`, `supabase/functions/sharepoint-storage/index.ts`.
- Validacion realizada: token Graph con roles `Sites.Selected`, `Sites.ReadWrite.All`, `Calendars.ReadWrite`; `GET /users/alex.burgues@avtechesdeveniments.com/calendars` OK; aparecen `Instalaciones`, `Facturacion`, `Comercial`, `Marketing`; lectura de eventos OK con `calendarView` y `events`, incluyendo asunto, fechas, ubicacion, cuerpo, organizador y estado.
- Como reutilizarlo en el futuro: guardar en repo el buzon fuente y los `calendarId` estables por calendario para no depender de discovery por `users/groups`; si se quieren otros buzones o calendarios de grupo, pedir tambien permisos de directorio.

### [2026-03-13] Calendar IDs documentados en repo

- Contexto: necesidad de fijar en documentacion los identificadores estables de los calendarios M365 usados por NEXO AV.
- Capacidad desbloqueada: referencia operativa versionada con el buzon fuente `alex.burgues@avtechesdeveniments.com` y los `calendarId` de `Instalaciones`, `Facturacion`, `Comercial` y `Marketing`.
- Impacto operativo: futuras integraciones backend pueden consumir calendarios sin depender de autodiscovery de tenant ni de repetir validaciones manuales.
- Archivos o componentes implicados: `docs/sharepoint/M365_CALENDARS_NEXO_AV.md`, `docs/README.md`.
- Validacion realizada: IDs obtenidos por `GET /users/alex.burgues@avtechesdeveniments.com/calendars` y contrastados con lectura real de eventos.
- Como reutilizarlo en el futuro: usar este documento como fuente de verdad hasta que exista una capa de configuracion persistida en DB o secretos por entorno.

### [2026-03-13] Entrada desktop de Calendario en sidebar NEXO

- Contexto: necesidad de abrir el modulo de calendario en desktop antes de implementar la sincronizacion completa con Microsoft 365.
- Capacidad desbloqueada: nueva seccion `Calendario` visible en el sidebar desktop, ubicada debajo de `Mapa`, con ruta operativa `/nexo-av/:userId/calendario`.
- Impacto operativo: permite iterar la integracion de calendarios dentro de NEXO AV sin tocar de momento la navegacion mobile.
- Archivos o componentes implicados: `src/pages/nexo_av/desktop/layouts/NexoAvLayout.tsx`, `src/pages/nexo_av/desktop/components/layout/Sidebar.tsx`, `src/app/routes/NexoRoutes.tsx`, `src/pages/nexo_av/desktop/pages/CalendarPage.tsx`.
- Validacion realizada: alta de modulo, alta de item de sidebar en orden deseado, alta de ruta y pagina placeholder desktop.
- Como reutilizarlo en el futuro: usar `CalendarPage` como punto de entrada para listar calendarios M365, filtros por calendario y futura sincronizacion con instalaciones y facturacion.

### [2026-03-13] Skills Microsoft 365 y operativa para NEXO AV

- Contexto: necesidad de convertir el roadmap de integraciones Microsoft y automatizacion operativa en conocimiento reusable para agentes dentro del repo.
- Capacidad desbloqueada: nuevas skills especializadas para calendario M365, runtime de planning, notificaciones Outlook/Teams, OCR con Azure Document Intelligence, reporting Excel en SharePoint, governance Entra/Graph, contratos KPI para Power BI y aprobaciones por mail.
- Impacto operativo: los agentes ya pueden implementar integraciones Microsoft y automatizaciones de operaciones y contabilidad con contexto acotado, guardrails claros y referencias reales del repo sin reinventar criterios en cada sesion.
- Archivos o componentes implicados: `.codex/skills/nexo-m365-calendar-sync/`, `.codex/skills/nexo-ops-planning-runtime/`, `.codex/skills/nexo-m365-notifications/`, `.codex/skills/nexo-document-intelligence-ocr/`, `.codex/skills/nexo-m365-excel-reporting/`, `.codex/skills/nexo-entra-graph-governance/`, `.codex/skills/nexo-power-bi-kpi-contracts/`, `.codex/skills/nexo-mail-approvals/`, `.codex/skills/INDEX.md`.
- Validacion realizada: `quick_validate.py` ejecutado sobre `nexo-m365-calendar-sync`, `nexo-ops-planning-runtime`, `nexo-m365-notifications`, `nexo-document-intelligence-ocr`, `nexo-m365-excel-reporting`, `nexo-entra-graph-governance`, `nexo-power-bi-kpi-contracts` y `nexo-mail-approvals`; todas validas.
- Como reutilizarlo en el futuro: cargar solo la skill de dominio necesaria antes de tocar calendarios, SharePoint, reporting, OCR, notificaciones o dashboards ejecutivos.

### [2026-03-13] KPI principales de Proyectos, Facturas y Presupuestos validados como fuente operativa fiable

- Contexto: despues de la auditoria de drift era necesario convertir las paginas principales del ERP en una lectura fiable para direccion y operativa diaria.
- Capacidad desbloqueada: `ProjectsPage`, `InvoicesPage` y `QuotesPage` quedan alineadas con fuentes reales y con semantica explicita: proyectos usa estados normalizados y financieros por RPC, facturas separa trimestre canonico de listado operativo, y presupuestos mantiene los contadores fuera del filtro activo incluyendo `INVOICED` y `REJECTED`.
- Impacto operativo: ya se puede usar la cabecera principal de estas tres paginas para seguimiento sin reconciliar cifras a mano; el corte vivo del `2026-03-13` queda fijado en repo con `Proyectos = 36`, `Facturas Q1 2026 = 20.389,09 EUR` bruto y `Presupuestos = 65`.
- Archivos o componentes implicados: `src/constants/projectStatuses.ts`, `src/pages/nexo_av/desktop/pages/ProjectsPage.tsx`, `src/pages/nexo_av/mobile/pages/MobileProjectsPage.tsx`, `src/pages/nexo_av/desktop/pages/QuotesPage.tsx`, `src/pages/nexo_av/desktop/pages/InvoicesPage.tsx`, `audits/accounting/2026-03-13_main_pages_kpi_audit_report.md`, `audits/accounting/2026-03-13_main_pages_kpi_findings.md`.
- Validacion realizada: `npm run build` OK el `2026-03-13`; contraste autenticado contra Supabase vivo confirmando `Proyectos` con `12.000,05 EUR` ingresos y `6.487,83 EUR` costes, `Facturas` con `29` emitidas canonicas en Q1 2026 y `Presupuestos` con estado real `18/6/21/3/4/13`.
- Como reutilizarlo en el futuro: antes de revisar dashboards ejecutivos o Power BI, usar estas tres paginas como baseline visual y revalidar contra las mismas RPCs (`get_project_financial_stats`, `get_sales_invoice_kpi_summary`, `list_quotes`) en lugar de rehacer formulas desde listados raw.
