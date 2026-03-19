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

### [2026-03-16] Documento canonico de contexto para agentes sobre AV TECH / NEXO AV

- Contexto: hacia falta un briefing estable para Claude, Codex y otros agentes que entran por `src/pages/nexo_av/` pero necesitan entender el repo completo, Git, Supabase, infraestructura y utilidad real de la plataforma.
- Capacidad desbloqueada: existe `docs/architecture/CONTEXTO_REPO_AVTECH_NEXO_PARA_AGENTES.md` como documento corto y reutilizable que resume naturaleza mixta del repo, flujo repo-first, forma correcta de trabajar la BD en Supabase, infraestructura Firebase/SharePoint/M365 y mapa de entrada por carpetas.
- Impacto operativo: los agentes ya no tienen que reconstruir desde cero el contexto base del proyecto antes de tocar NEXO AV; se reduce el riesgo de tratar el ERP como una pagina aislada o de ignorar el papel de Supabase y SharePoint en el sistema.
- Archivos o componentes implicados: `docs/architecture/CONTEXTO_REPO_AVTECH_NEXO_PARA_AGENTES.md`, `docs/README.md`.
- Validacion realizada: contraste manual contra `AGENTS.md`, `.codex/AGENTS.md`, `.codex/errores-soluciones.md`, `.codex/avances.md`, `docs/important/ARQUITECTURA_PROYECTO_NEXO_AV.md`, `package.json`, `firebase.json`, `supabase/config.toml` y `docs/sharepoint/`.
- Como reutilizarlo en el futuro: cargar este documento como primer contexto cuando la tarea entre por `src/pages/nexo_av/` o cuando un agente necesite una vista rapida de repo, BD e infraestructura antes de leer documentacion mas profunda.

### [2026-03-16] Catalogo mobile responsive con consulta rapida y detalle contextual

- Contexto: el modulo de catalogo seguia siendo solo desktop aunque la ruta existia dentro del layout mobile del ERP.
- Capacidad desbloqueada: existe `MobileCatalogPage` con paridad adaptada para consulta de `Productos`, `Servicios` y `Packs`, incluyendo busqueda, KPIs por pestaña, tarjetas tactiles y drawer de detalle sin depender de componentes desktop.
- Impacto operativo: comercial, operativa y direccion ya pueden consultar el catalogo desde movil sin cargar la interfaz desktop; admin y manager lo tienen accesible desde `Mas`, y el resto desde `Ajustes > Catalogo`.
- Archivos o componentes implicados: `src/pages/nexo_av/mobile/pages/MobileCatalogPage.tsx`, `src/app/routes/NexoRoutes.tsx`, `src/pages/nexo_av/mobile/layouts/NexoAvMobileLayout.tsx`, `src/pages/nexo_av/mobile/pages/MobileSettingsPage.tsx`, `.codex/errores-soluciones.md`.
- Validacion realizada: `npx tsc --noEmit` OK; `npm run -s build` OK el `2026-03-16`.
- Como reutilizarlo en el futuro: cualquier modulo desktop que pase a mobile puede seguir este patron: ruta responsive con `createResponsivePage`, acceso explicito desde navegacion mobile, vista de consulta optimizada para dedo y detalle embebido en drawer en lugar de forzar una ficha desktop.

### [2026-03-15] 13 monitores Visiotech en PA-02 CARTELERIA DIGITAL

- Contexto: Alta de 13 monitores SAFIRE/HISENSE de carteleria digital (alto brillo HB y digital signage DS) con costes y especificaciones de visiotechsecurity.com 16/03/2026.
- Capacidad desbloqueada: migracion `20260315180500_seed_monitores_visiotech_pa02.sql` crea productos PA-02-0036 a PA-02-0048; margen +60%; proveedor Visiotech (PRV-000017); especificaciones en JSON (ref_proveedor, marca, linea, resolucion, brillo_nits, vesa, peso_kg, etc.).
- Impacto operativo: monitores disponibles en catalogo NEXO bajo PA-02; 6 HB (43"-86"), 6 DS SAFIRE (43"-98"), 1 HISENSE 86"; aplicado via MCP `apply_migration` al no poder ejecutar `db push` por conflictos de historial.
- Archivos o componentes implicados: `supabase/migrations/20260315180500_seed_monitores_visiotech_pa02.sql`, `catalog.products`, `catalog.next_product_number`.
- Validacion realizada: 13 productos insertados con SKU PA-02-0036..0048; costes y precios de venta verificados; especificaciones en specifications.
- Como reutilizarlo en el futuro: para mas productos Visiotech, usar mismo proveedor_id; mantener ref_proveedor en specifications para trazabilidad; margen +60% como estandar salvo excepcion.

### [2026-03-15] Proveedor Visiotech (PRV-000017)

- Contexto: Alta de proveedor mayorista B2B Visiotech (razon social LONG XIANG EXPORTACION IMPORTACION SL) para monitores, soportes y digital signage.
- Capacidad desbloqueada: migracion `20260315180400_seed_proveedor_visiotech.sql` crea proveedor con NIF B80645518, direccion Madrid, email comercial@visiotechsecurity.com; idempotente por tax_id.
- Impacto operativo: proveedor disponible en listados y para vincular productos del catalogo; categoria MATERIAL (constraint DB: SOFTWARE, EXTERNAL_SERVICES, MATERIAL).
- Archivos o componentes implicados: `supabase/migrations/20260315180400_seed_proveedor_visiotech.sql`, `internal.suppliers`.
- Validacion realizada: proveedor PRV-000017 creado en BD; datos fiscales y contacto verificados.
- Como reutilizarlo en el futuro: usar categoria MATERIAL para proveedores de hardware; razon social en company_name para facturacion; nombre comercial se puede anadir en UI si se extiende el esquema.

### [2026-03-15] Pack RACK 15U EXTERIOR IP55 FUNCIONAL (PACK-0001)

- Contexto: Tras crear el armario PA-06-0001 y los accesorios PA-06-0002 a PA-06-0009, faltaba un pack vendible con la configuracion minima funcional (armario + regleta + bandeja + guia + 2x panel 1U + ventilador + termostato).
- Capacidad desbloqueada: migracion `20260315180300_seed_pack_rack_15u_funcional.sql` crea el BUNDLE PACK-0001 con precio suma de componentes (720,66 EUR sin IVA); idempotente para evitar duplicados en re-ejecucion.
- Impacto operativo: el pack aparece en la pestaña Packs del catalogo NEXO; se puede vender como unidad o desglosar en componentes; `list_catalog_bundles` y `list_catalog_bundle_components` lo exponen.
- Archivos o componentes implicados: `supabase/migrations/20260315180300_seed_pack_rack_15u_funcional.sql`, `catalog.products` (product_type=BUNDLE), `catalog.product_bundles`.
- Validacion realizada: pack creado en BD; 7 componentes vinculados (PA-06-0001, 0002, 0003, 0004, 0005x2, 0007, 0008); precio 720,66 EUR.
- Como reutilizarlo en el futuro: para nuevos packs, crear producto BUNDLE con `create_catalog_product` o INSERT directo; añadir componentes con `add_catalog_bundle_component` o INSERT en `product_bundles`; mantener migraciones idempotentes con `WHERE NOT EXISTS`.

### [2026-03-15] Subcategoria PA-06 RACKS Y ACCESORIOS y normalizacion de taxonomia PA

- Contexto: ARMARIO RACK y productos similares (racks, cabinas, patch, switch) necesitaban una subcategoria propia bajo PRODUCTOS AUDIOVISUALES; ademas las subcategorias PA mezclaban codigos numericos (01-05) y alfanumericos (LCD, ACCE).
- Capacidad desbloqueada: nueva subcategoria PA-06 RACKS Y ACCESORIOS para rack fisico y accesorios de rack; codigos PA estandarizados a 01..08; sort_order coherente (1..8); PA-04 renombrado a CONTROL, PROCESADO Y CONECTIVIDAD AV; migraciones canonicas 20260315165956 y 20260315170501 con INSERT idempotente.
- Impacto operativo: productos como ARMARIO RACK se clasifican en PA-06 con SKU PA-06-XXXX; el frontend carga categorias/subcategorias dinamicamente sin hardcodes; criterio de clasificacion documentado en `docs/important/catalog-classification-guide.md`.
- Archivos o componentes implicados: `supabase/migrations/20260315165956_add_racks_subcategory_and_standardize_codes.sql`, `supabase/migrations/20260315170501_fix_pa_sort_order_and_rename.sql`, `docs/nexo/catalog-classification-guide.md`.
- Validacion realizada: consulta BD confirmando 01..08 con sort_order 1..8; `migration list --linked` con 20260315165956 y 20260315170501 alineados; frontend sin dependencias de codigos fijos.
- Como reutilizarlo en el futuro: usar PA-06 para rack fisico y accesorios; PA-04 para control, procesado y conectividad AV; MI para material de instalacion y estructura de montaje; consultar la guia de clasificacion antes de crear categorias nuevas.

### [2026-03-15] Configuracion MCP en .codex/mcp.json para Codex

- Contexto: Codex necesita leer la config MCP desde el repo para conectar a Supabase sin depender de `~/.cursor/mcp.json`.
- Capacidad desbloqueada: existe `.codex/mcp.json` con el servidor Supabase (`project_ref=takvthfatlcjsqgssnta`) versionado en el repo; se añadio excepcion en `.gitignore` para que este archivo se trackee (solo contiene URL publica, sin tokens).
- Impacto operativo: Codex y otros agentes que lean MCP desde `.codex/` pueden conectar a la BD de la plataforma usando esta config; la skill `supabase-db-connection` referencia esta ruta como canonica.
- Archivos o componentes implicados: `.codex/mcp.json`, `.gitignore`, `.codex/skills/supabase-db-connection/SKILL.md`.
- Validacion realizada: archivo creado con formato JSON valido; excepcion gitignore verificada.
- Como reutilizarlo en el futuro: configurar Codex para cargar MCP desde `.codex/mcp.json`; si se añade otro proyecto (p. ej. supabase-csm-avtech), extender el objeto `mcpServers` en el mismo archivo.

### [2026-03-15] Skill supabase-db-connection actualizada con configuracion MCP para Codex y Cursor

- Contexto: era necesario que el MCP de Supabase conectara a la BD de la plataforma AV TECH/NEXO AV y que Codex pudiera usar esa conexion.
- Capacidad desbloqueada: la skill `.codex/skills/supabase-db-connection/SKILL.md` incluye ahora la configuracion MCP explicita: `project_ref=takvthfatlcjsqgssnta`, URL completa, referencia a `.codex/mcp.json` como config en repo, ejemplos para Cursor y para CI (con `SUPABASE_ACCESS_TOKEN`), lista de herramientas (`execute_sql`, `apply_migration`, `list_migrations`, `list_tables`, `list_extensions`) y troubleshooting de conexion MCP.
- Impacto operativo: cualquier agente (Cursor, Codex u otro cliente MCP) puede configurar el acceso a la BD de la plataforma siguiendo la skill; se evita confusion de project_ref y se documenta la autenticacion OAuth y por token.
- Archivos o componentes implicados: `.codex/skills/supabase-db-connection/SKILL.md`.
- Validacion realizada: revision manual de la skill; configuracion alineada con `supabase/config.toml` y con la documentacion oficial de Supabase MCP.
- Como reutilizarlo en el futuro: cargar `supabase-db-connection` cuando se pida conectar a Supabase, ejecutar SQL o aplicar migraciones; si Codex o un nuevo cliente MCP no conecta, seguir la seccion "Configuracion MCP" y el troubleshooting.

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
### [2026-03-15] Skill canonica de inventario, catalogo y operaciones de producto

- Contexto: hacia falta convertir la investigacion de stock, compras, ventas, trazabilidad y datos maestros en una skill reutilizable dentro del repo para futuras implementaciones de ERP y automatizaciones.
- Capacidad desbloqueada: existe una skill especializada que define datos maestros de producto, flujos `procure-to-pay` y `order-to-cash`, semantica de stock, conteos ciclicos, trazabilidad por lote/serie, KPIs y blueprint de implementacion.
- Impacto operativo: los agentes ya pueden disenar o auditar modulos de inventario con un contrato funcional estable, sin mezclar catalogo, movimientos fisicos, reservas, compras, ventas y reporting.
- Archivos o componentes implicados: `.codex/skills/nexo-inventory-product-ops/SKILL.md`, `.codex/skills/nexo-inventory-product-ops/references/product-master-data.md`, `.codex/skills/nexo-inventory-product-ops/references/process-flows.md`, `.codex/skills/nexo-inventory-product-ops/references/kpis-and-controls.md`, `.codex/skills/nexo-inventory-product-ops/references/implementation-blueprint.md`, `.codex/skills/nexo-inventory-product-ops/references/sources.md`, `.codex/skills/INDEX.md`.
- Validacion realizada: revision manual de consistencia con el patron de skills existente en `.codex/skills/`; estructura creada con `SKILL.md`, `references/` y `agents/openai.yaml`; contenido alineado con fuentes oficiales de GS1, Oracle/NetSuite, Odoo y Shopify.
- Como reutilizarlo en el futuro: cargar `nexo-inventory-product-ops` antes de modelar productos, stock, compras, ventas, almacenes, lotes, series, devoluciones o dashboards operativos de inventario; combinarla con skills de reporting o integraciones si la tarea cruza dominios.

### [2026-03-15] Numeracion canonica de catalogo V2 por categoria y subcategoria

- Contexto: el catalogo V2 necesitaba dejar atras los SKU manuales o por timestamp para poder crecer con subcategorias reales y packs sin drift entre UI y BD.
- Capacidad desbloqueada: productos y servicios del catalogo pueden numerarse desde la BD con prefijos de categoria/subcategoria, preview previo en UI, importaciones alineadas y base preparada para reutilizar la misma capa en packs.
- Impacto operativo: el alta manual ya no depende de que el usuario invente el numero; las importaciones simples y avanzadas pueden delegar la numeracion en la RPC; los packs dejan de requerir `PACK-${Date.now()}` y el modelo `catalog` gana una taxonomia reutilizable con `code` en categorias.
- Archivos o componentes implicados: `supabase/migrations/20260315153640_auto_assign_catalog_skus_by_category.sql`, `src/pages/nexo_av/desktop/components/catalog/ProductsTab.tsx`, `src/pages/nexo_av/desktop/components/catalog/ProductImportDialog.tsx`, `src/pages/nexo_av/desktop/components/catalog/PacksTab.tsx`, `src/integrations/supabase/types.ts`, `.codex/errores-soluciones.md`.
- Validacion realizada: `npx supabase migration list --linked` OK con la migracion nueva pendiente solo en local; `npx supabase db push --linked --dry-run` OK detectando solo esa migracion; `npx tsc --noEmit` OK; `npm run -s build` OK el `2026-03-15`.
- Como reutilizarlo en el futuro: cualquier nuevo flujo de alta, importacion, sincronizacion o packs debe llamar a `create_catalog_product` sin fabricar SKU en frontend; si se amplian categorias o subcategorias, mantener sus `code` estables y reutilizar `preview_catalog_product_sku` para mostrar el numero antes de confirmar.

### [2026-03-15] Ajustes del ERP alineados con la taxonomia canonica de `catalog`

- Contexto: para cerrar el ciclo de numeracion automatica y preparar packs, faltaba que la administracion de categorias/subcategorias dejara de editar el modelo legacy y operara sobre el mismo arbol consumido por catalogo e importaciones.
- Capacidad desbloqueada: la pestana de Ajustes ya mantiene categorias raiz y subcategorias reales de `catalog.categories`, separadas por dominio `PRODUCT`/`SERVICE`, con importacion Excel contra el mismo contrato canonico.
- Impacto operativo: administracion, alta manual, importaciones y packs quedan sobre una unica fuente de verdad; los codigos de categoria y subcategoria se pueden gobernar desde UI sin drift con el backend ni con la numeracion de productos.
- Archivos o componentes implicados: `src/pages/nexo_av/desktop/components/settings/ProductCategoriesTab.tsx`, `src/pages/nexo_av/desktop/components/settings/CategoryImportDialog.tsx`, `.codex/errores-soluciones.md`.
- Validacion realizada: busqueda estatica sin referencias legacy a `product_category` o `product_subcategory` en la UI de Ajustes; `npx tsc --noEmit` OK; `npm run -s build` OK el `2026-03-15`.
- Como reutilizarlo en el futuro: cualquier pantalla administrativa o importador nuevo que toque taxonomia debe trabajar con `catalog.categories` usando `code`, `domain` y `parent_id`; si se necesitan nuevas automatizaciones para packs o stock, partir de esta misma estructura en lugar de crear catalogos paralelos.

### [2026-03-15] Subcategoria obligatoria en el alta y la importacion del catalogo

- Contexto: la nueva numeracion canonica por categoria/subcategoria solo queda cerrada si ningun producto o servicio puede seguir creandose colgando directamente de la categoria raiz.
- Capacidad desbloqueada: el alta manual y las importaciones de catalogo exigen ya una subcategoria valida y crean siempre el producto contra esa hoja del arbol, de modo que el SKU, la clasificacion y la futura logica de packs parten del mismo nivel taxonomico.
- Impacto operativo: se elimina el caso ambiguo `CAT-00` en la operativa diaria de alta; cualquier referencia nueva queda clasificada en una subcategoria concreta antes de entrar en catalogo.
- Archivos o componentes implicados: `src/pages/nexo_av/desktop/components/catalog/ProductsTab.tsx`, `src/pages/nexo_av/desktop/components/catalog/ProductImportDialog.tsx`, `.codex/errores-soluciones.md`.
- Validacion realizada: `rg` confirmando la obligatoriedad de subcategoria en UI e importacion; `npx tsc --noEmit` OK; `npm run -s build` OK el `2026-03-15`.
- Como reutilizarlo en el futuro: si se abre un nuevo canal de alta masiva, API o sincronizacion, validar siempre `subcategoryId` antes de invocar `create_catalog_product`; si falta subcategoria, rechazar la operacion y no derivarla a la categoria padre.

### [2026-03-16] Listado de packs con base real y dto visible

- Contexto: la tabla de packs seguia dependiendo visualmente de la longitud de la descripcion y usaba `sale_price` como referencia de base, lo que no garantizaba reflejar la suma real de precios individuales de los componentes.
- Capacidad desbloqueada: `list_catalog_bundles` devuelve ahora `base_price_real` y `visible_discount_percent`, y `PacksTab` muestra columnas de ancho estable con truncado, precio base real, dto visible y exportacion alineada con esos mismos valores.
- Impacto operativo: el equipo ve en el listado de packs el precio base comercial correcto y el dto real sobre la suma de PVP individuales, sin tablas que se deformen por textos largos.
- Archivos o componentes implicados: `supabase/migrations/20260316101500_list_catalog_bundles_with_real_base_price.sql`, `src/pages/nexo_av/desktop/components/catalog/PacksTab.tsx`, `src/integrations/supabase/types.ts`.
- Validacion realizada: `npx tsc --noEmit` OK; `npm run -s build` OK el `2026-03-16`.
- Como reutilizarlo en el futuro: cualquier listado o exportacion de packs debe consumir `base_price_real` y `visible_discount_percent` como fuente de verdad visual del pack, en lugar de asumir que `sale_price` sigue la suma actual de componentes.

### [2026-03-16] Ficha de pack con pricing manual editable

- Contexto: la vista individual del pack solo mostraba resumen y componentes, pero no permitia fijar manualmente el `precio base pack` ni el `dto` comercial que luego debe usarse en presupuestos y facturas.
- Capacidad desbloqueada: la ficha del pack permite editar `precio base pack`, `dto. pack %` y `PVP final sin IVA`, con recalculo inmediato entre campos; ademas `update_product_pack` acepta ya `p_sale_price` para persistir ese pricing en `catalog.products`.
- Impacto operativo: comercial y administracion pueden ajustar el pricing de un pack desde su propia vista sin tocar migraciones ni recalcular descuentos a mano fuera del ERP.
- Archivos o componentes implicados: `supabase/migrations/20260316113000_update_product_pack_allow_manual_sale_price.sql`, `src/pages/nexo_av/desktop/components/catalog/PacksTab.tsx`, `src/integrations/supabase/types.ts`.
- Validacion realizada: `npx tsc --noEmit` OK; `npm run -s build` OK el `2026-03-16`.
- Como reutilizarlo en el futuro: cualquier nueva pantalla de packs debe tratar `sale_price` como base comercial editable y `discount_percent` como dto visible almacenado; el PVP final debe derivarse siempre de ambos.

### [2026-03-16] Historial Supabase de catalogo reconciliado y RPCs de packs desplegadas en vivo

- Contexto: el release gate detecto drift entre repo y BD en catalogo/packs: habia migraciones locales ya reflejadas en schema real pero no en `schema_migrations`, duplicados locales supersedidos por ficheros remotos del `2026-03-16` y dos RPCs clave de packs todavia pendientes en vivo.
- Capacidad desbloqueada: el proyecto linked vuelve a tener una historia canonica utilizable para `db push`, y el remoto expone ya `list_catalog_bundles` con `base_price_real`/`visible_discount_percent` y `update_product_pack` con `p_sale_price`.
- Impacto operativo: altas de catalogo, preview de SKU y pricing manual de packs dejan de depender de drift local; el equipo puede desplegar cambios de catalogo sobre una base Supabase alineada y sin reintentar seeds/productos ya existentes.
- Archivos o componentes implicados: `supabase/migrations/20260315153640_auto_assign_catalog_skus_by_category.sql`, `supabase/migrations/20260315180000_seed_armario_rack_15u_biacom.sql`, `supabase/migrations/20260315180100_seed_servicio_logistica.sql`, `supabase/migrations/20260315180200_seed_accesorios_rack_15u.sql`, `supabase/migrations/20260315180300_seed_pack_rack_15u_funcional.sql`, `supabase/migrations/20260315180400_seed_proveedor_visiotech.sql`, `supabase/migrations/20260316101500_list_catalog_bundles_with_real_base_price.sql`, `supabase/migrations/20260316113000_update_product_pack_allow_manual_sale_price.sql`, `.codex/errores-soluciones.md`.
- Validacion realizada: `npx supabase migration repair --linked --status applied 20260315153640 20260315180000 20260315180200 --yes` OK; `npx supabase db push --linked --include-all` OK para `15180100`, `15180300`, `15180400`, `16101500` y `16113000`; `npx supabase migration list --linked` alineado; `npx supabase gen types typescript --linked --schema public,catalog` confirmando los contratos remotos nuevos; `npm run build` OK; `npx tsc --noEmit` OK.
- Como reutilizarlo en el futuro: cuando el repo arrastre drift mixto de seeds y RPCs, separar siempre tres grupos: (1) migraciones ya vivas pero sin historial y no idempotentes, que se reparan como `applied`; (2) migraciones locales supersedidas por timestamps remotos, que se eliminan del repo; y (3) migraciones funcionales realmente pendientes, que se validan con `--dry-run`, se corrigen si fallan y se despliegan al final.

### [2026-03-16] Facturacion mobile con retorno contextual y deep-links de pestañas

- Contexto: para alinear mobile con desktop hacia falta que proyecto, planning y cliente pudieran abrir nueva factura sin perder el contexto operativo al volver.
- Capacidad desbloqueada: las pantallas mobile de detalle ya soportan `?tab=` como deep-link estable, `invoices/new` carga version responsive, y la creacion de facturas admite origen por cliente o por proyecto/site con `returnTo` para regresar a la pestaña correcta.
- Impacto operativo: desde dashboard, planning, detalle de proyecto o detalle de cliente el usuario puede entrar en facturacion mobile, guardar o volver atras sin caer en listados generales ni en pantallas desktop.
- Archivos o componentes implicados: `src/app/routes/NexoRoutes.tsx`, `src/pages/nexo_av/mobile/pages/MobileNewInvoicePage.tsx`, `src/pages/nexo_av/mobile/pages/MobileProjectDetailPage.tsx`, `src/pages/nexo_av/mobile/pages/MobileClientDetailPage.tsx`, `src/pages/nexo_av/mobile/components/projects/MobilePlanningTab.tsx`, `src/pages/nexo_av/mobile/components/layout/MobileHeader.tsx`, `src/pages/nexo_av/mobile/pages/index.ts`, `.codex/errores-soluciones.md`.
- Validacion realizada: `npx tsc --noEmit` OK; `npm run -s build` OK el `2026-03-16`.
- Como reutilizarlo en el futuro: cualquier formulario mobile con boton atras propio debe aceptar `returnTo`; si una vista mobile tiene tabs con acciones secundarias, sincronizar `activeTab` con `?tab=` para soportar enlaces directos y retorno contextual.

### [2026-03-16] Bloques visuales reutilizables para KPIs y listados mobile

- Contexto: la capa mobile tenia tarjetas KPI, secciones y listados repetidos con estilos ligeramente distintos entre detalle de proyecto y detalle de cliente, lo que daba una sensación visual inconsistente.
- Capacidad desbloqueada: existe ahora una base compartida `MobileUiBlocks` con `MobileSectionCard`, `MobileMetricCard`, `MobileListCard` y `MobileEmptyState`, ya aplicada en los detalles mobile de proyecto y cliente.
- Impacto operativo: los módulos mobile ganan una estética más coherente, jerarquía visual más clara y un punto único desde el que seguir puliendo KPIs, listados y estados vacíos sin reescribir estilos en cada pantalla.
- Archivos o componentes implicados: `src/pages/nexo_av/mobile/components/common/MobileUiBlocks.tsx`, `src/pages/nexo_av/mobile/pages/MobileProjectDetailPage.tsx`, `src/pages/nexo_av/mobile/pages/MobileClientDetailPage.tsx`.
- Validacion realizada: `npx tsc --noEmit` OK; `npm run -s build` OK el `2026-03-16`.
- Como reutilizarlo en el futuro: cualquier nueva pantalla mobile con KPIs o listados debe partir de `MobileUiBlocks`; si se quiere subir el nivel visual del resto de módulos, extender primero este archivo y luego sustituir implementaciones locales en cascada.
