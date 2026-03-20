# Registro de errores y soluciones

Este archivo se carga al iniciar cada chat para mantener memoria operativa de errores resueltos.

## Plantilla de registro (usar en cada error)

### [AAAA-MM-DD] Título corto del error

- Contexto:
- Causa raíz:
- Solución aplicada:
- Validación realizada:
- Medidas para evitar recurrencia:

---

## Historial

### [2026-03-16] Ruta de catalogo mobile cargaba la pagina desktop y sin acceso tactil real

- Contexto: la ruta `/nexo-av/:userId/catalog` existia en el ERP, pero en mobile seguia renderizando `CatalogPage` desktop; ademas el acceso desde navegacion mobile no era consistente segun rol.
- Causa raiz: `NexoRoutes` no usaba `createResponsivePage` para catalogo y el layout mobile no exponia un acceso claro a esa ruta.
- Solucion aplicada: se creo `MobileCatalogPage` como vista mobile de consulta con tabs `Productos/Servicios/Packs`, busqueda, KPIs, tarjetas tactiles y drawer de detalle; se cambio la ruta `catalog` a responsive, se anadio acceso desde `BottomNavigation` para admin/manager y un acceso desde `MobileSettingsPage` para el resto.
- Validacion realizada: `npx tsc --noEmit` OK y `npm run -s build` OK el `2026-03-16`.
- Medidas para evitar recurrencia: cualquier modulo disponible en desktop debe revisarse explicitamente en `NexoRoutes` para asegurar paridad responsive y debe tener una entrada navegable en mobile antes de considerarse operativo.

### [2026-03-16] Crash en PacksTab por `totalBase` no definido

- Contexto: la ficha individual de packs fallaba al abrirse tras añadir el bloque de pricing manual, con `ReferenceError: totalBase is not defined`.
- Causa raíz: el JSX del diálogo usaba `totalBase` para mostrar la base de componentes, pero el cálculo `packItems.reduce(...)` no estaba declarado en el scope del componente después del refactor.
- Solución aplicada: se restauró la constante `totalBase` antes del `return` de `PacksTab.tsx`, manteniendo el bloque de pricing manual sin tocar la lógica de cálculo.
- Validación realizada: `npx tsc --noEmit` OK y `npm run -s build` OK el `2026-03-16`.
- Medidas para evitar recurrencia: revisar cualquier nuevo resumen derivado en diálogos o listados para asegurar que sus agregados quedan declarados en scope estable y cubiertos por build antes de probar en navegador.

### [2026-03-15] db push falla tras repair: "create_catalog_category already exists"

- Contexto: tras `migration repair --status reverted` de 4 versiones remote-only (20260315155943, 20260315171645, 20260315172211, 20260315173146), `db push --include-all` fallo con `function "create_catalog_category" already exists with same argument types`.
- Causa raiz: `migration repair --status reverted` solo actualiza `schema_migrations`; no deshace los cambios reales en la BD. Los objetos (funciones, tablas) creados por esas migraciones remote-only siguen existiendo. Al aplicar migraciones locales que crean los mismos objetos, se produce conflicto. Ademas, MCP `apply_migration` y otras fuentes pueden registrar versiones en remoto sin archivo local.
- Solucion aplicada: para los seeds de monitores y proveedor, se ejecuto el INSERT directamente via MCP `apply_migration` al no poder ejecutar `db push`; los archivos de migracion siguen en repo para trazabilidad. Diagnostico completo en `docs/supabase/2026-03-15_migration_history_drift_diagnosis.md`.
- Validacion realizada: 13 monitores visibles en catalogo PA-02; proveedor Visiotech confirmado; documento de diagnostico creado.
- Medidas para evitar recurrencia: (1) no usar MCP `apply_migration` para DDL; usar solo para seeds de datos cuando push este bloqueado; (2) antes de `migration repair`, capturar evidencia y evaluar si las migraciones remote-only ya crearon objetos que las locales intentaran crear; (3) preferir CREATE OR REPLACE e IF NOT EXISTS en migraciones para idempotencia; (4) documentar origen de versiones remote-only antes de repair.

### [2026-03-15] Migraciones racks duplicadas y drift local/remoto

- Contexto: tras crear la subcategoria PA-06 RACKS Y ACCESORIOS, habia dos archivos locales (20260315165919 y 20260315170000) para el mismo cambio, mientras el remoto figuraba como 20260315165956; ademas sort_order no se normalizaba y el INSERT no era idempotente.
- Causa raiz: el comando `npx supabase migration new` creo 20260315165919 (vacio), se creo manualmente 20260315170000, y el MCP apply_migration registro 20260315165956 en remoto; la migracion original no contemplaba sort_order ni idempotencia.
- Solucion aplicada: se elimino 20260315170000, se creo la canonica 20260315165956 con INSERT idempotente (WHERE NOT EXISTS), se creo la correctiva 20260315170501 para fijar sort_order 1..8 y renombrar PA-04 a "CONTROL, PROCESADO Y CONECTIVIDAD AV"; el archivo 20260315165919 quedo bloqueado por otro proceso y debe eliminarse manualmente antes de db push.
- Validacion realizada: `migration list --linked` mostrando 20260315165956 y 20260315170501 alineados; consulta de categorias PA confirmando 01..08 con sort_order coherente y PA-04 renombrado.
- Medidas para evitar recurrencia: usar un unico timestamp al crear migraciones; no duplicar archivos; hacer INSERT de datos maestros idempotentes (WHERE NOT EXISTS); incluir sort_order cuando se crean categorias; eliminar archivos vacios o duplicados antes de push.

### [2026-03-14] Enlaces mobile de ajustes y bottom nav llevaban a rutas inexistentes

- Contexto: al revisar la version mobile para preparar push y deploy, parte de la navegacion interna seguia enviando al usuario a pantallas no definidas en `NexoRoutes`, lo que acababa en `MobileNotFound` o en un destino sin utilidad real.
- Causa raiz: `MobileSettingsPage` apuntaba a `/settings/profile` y `/settings/notifications` sin rutas registradas, y `BottomNavigation` mantenia el item `Mas` con `path: '#'` cuando el rol no tenia `moreMenuItems`.
- Solucion aplicada: se sustituyeron las navegaciones rotas de `MobileSettingsPage` por feedback controlado mediante `toast`, y en `BottomNavigation` se convirtio el quinto item en acceso real a `Ajustes` cuando no existe menu adicional para el rol.
- Validacion realizada: busqueda estatica sin coincidencias para `settings/profile`, `settings/notifications` ni `path: '#'`; `npx tsc --noEmit` OK; `npm run -s build` OK el `2026-03-14`.
- Medidas para evitar recurrencia: no enlazar nuevas entradas mobile a subrutas no declaradas en `NexoRoutes`; cuando una opcion aun no tenga pantalla propia, usar estado deshabilitado o feedback explicito en lugar de navegar; mantener una salida valida en todos los items de bottom navigation segun rol.

### [2026-03-13] Historial linked de Supabase bloqueando `db pull` por drift remoto masivo

- Contexto: el proyecto linked `takvthfatlcjsqgssnta` seguia arrastrando cientos de versiones remotas historicas que no existian ya en `supabase/migrations/`, por lo que `npx supabase db pull` quedaba bloqueado y la CLI proponia un repair masivo ciego.
- Causa raiz: el repo habia consolidado una baseline canonica (`20260303220000`) pero el remoto seguia conservando la historia legacy previa en `schema_migrations`, creando `598` versiones remote-only frente a solo `3` local-only.
- Solucion aplicada: se capturo evidencia en `docs/supabase/evidence/2026-03-13/`, se creo el script `scripts/nexo/repair-linked-migration-history.ps1` para parsear `migration list --linked` y aplicar repair por lotes, se marcaron `598` versiones remotas legacy como `reverted` y solo `20260303220000` como `applied`. Despues se desplegaron de forma real `20260313110000` y `20260313143000` con `npx supabase db push --include-all`, porque debian insertarse antes de `20260313173000`, que ya existia en remoto.
- Validacion realizada: `dry-run` del script validando el plan correcto; ejecucion real OK en `12` batches; `npx supabase migration list --linked` finalmente alineado para `20260303220000`, `20260313110000`, `20260313143000` y `20260313173000`; `npx supabase db pull` ya no falla por drift de migraciones y solo queda bloqueado por falta de Docker Desktop para crear la shadow database.
- Medidas para evitar recurrencia: no recrear timelines historicos dentro de `supabase/migrations/`; usar una baseline canonica como fuente de verdad; capturar siempre `migration list --linked` antes de reparar; no marcar una migracion como `applied` si la SQL no existe realmente en remoto; cuando haya migraciones intermedias respecto a una ya aplicada en remoto, usar `db push --include-all` de forma consciente y con validacion posterior.

### [2026-03-13] KPI de facturacion trimestral inconsistentes entre dashboard, finanzas e invoices

- Contexto: el dashboard, los KPIs financieros y la pagina de facturas mostraban importes trimestrales distintos para Q1 2026 y no habia una fuente unica fiable.
- Causa raiz: se mezclaban metricas distintas bajo la misma etiqueta (`bruto con IVA`, `neto sin IVA`, `cobrado`, `listado filtrado`) y varias consultas seguian dependiendo de estados legacy y de filtros raw como `status = 'ISSUED'`.
- Solucion aplicada: se creo la migracion `supabase/migrations/20260313110000_resolve_sales_kpi_conflicts.sql` con una capa canonica para ventas (`normalize_sales_invoice_doc_status`, `derive_sales_invoice_payment_status`, `is_sales_invoice_overdue`, `get_sales_invoice_kpi_summary`) y se alinearon `dashboard_get_admin_overview`, `dashboard_get_commercial_overview`, `finance_get_period_summary`, `get_fiscal_quarter_data` y `finance_list_invoices`. En UI se separo el KPI trimestral canonico de los totales del listado en `InvoicesPage`, se corrigio el dashboard comercial y se normalizaron `RevenueChart` y `CashFlowChart`.
- Validacion realizada: `npm run build` OK el 2026-03-13. Contraste read-only con Supabase en vivo: Q1 2026 canonico esperado `20.389,09 EUR` bruto, `16.850,49 EUR` neto, `3.538,60 EUR` IVA, `15.800,59 EUR` cobrado, `4.588,50 EUR` pendiente, `29` emitidas canonicas frente a solo `12` devueltas por el filtro raw actual `finance_list_invoices(p_status='ISSUED')`. La RPC nueva aun no existe en vivo (`404`), por lo que la correccion queda versionada y pendiente de aplicar.
- Medidas para evitar recurrencia: mantener una unica RPC canonica para KPIs de ventas, no reutilizar `finance_list_invoices` como fuente de KPIs agregados y separar siempre `doc_status`, `payment_status` derivado y totales de listado en la UI.

### [2026-03-13] `create_bank_balance_adjustment` no funciona contra el plan contable bancario vivo

- Contexto: al intentar alinear Sabadell, CaixaBank y Revolut con los saldos reales del `2026-03-13`, la RPC publica `create_bank_balance_adjustment` fallaba con `No se encontró cuenta contable para este banco. Registre primero un asiento de apertura.`
- Causa raiz: la implementacion vigente busca la cuenta bancaria por `accounting.chart_of_accounts.description LIKE '%[ID:<bank_id>]%'`, pero las cuentas reales `572001`, `572002` y `572003` ya no guardan ese marcador legacy `[ID:...]`. La via `create_bank_opening_entry` tampoco servia porque habria creado nuevas cuentas 572 en vez de ajustar las existentes.
- Solucion aplicada: se creo y desplego de forma controlada la migracion `supabase/migrations/20260313173000_align_bank_balances_to_real_20260313.sql`, que calcula el delta contra los saldos teoricos del `2026-03-13` y registra un unico asiento `ADJUSTMENT` sobre `572001`, `572002`, `572003` y `129000`. Se aplico aislando la migracion en un workdir temporal y ejecutando `npx supabase db push --linked` para evitar arrastrar otras migraciones pendientes.
- Validacion realizada: `db push --dry-run` confirmando que solo se aplicaba `20260313173000`; despliegue real OK con asiento `AS-2026-3577` (`f752a23e-f687-4da0-9c16-242dc7151bfd`); `list_bank_accounts_with_balances('2026-03-13')` posterior cuadrando exactamente Sabadell `3.477,46 EUR`, CaixaBank `2.121,39 EUR` y Revolut `215,74 EUR`.
- Medidas para evitar recurrencia: corregir la RPC publica para que resuelva bancos con `accounting.resolve_bank_accounting_code` en lugar de depender de descripciones legacy; usar una cuenta puente de regularizacion versionada cuando falten extractos o tickets; no registrar asientos de apertura sobre bancos ya existentes sin comprobar antes si la cuenta 572 real quedara afectada.

### [2026-03-13] KPI de paginas principales deformados por estados legacy, formulas rotas y contadores dependientes del filtro activo

- Contexto: las paginas principales de Proyectos, Facturas y Presupuestos no eran fiables para direccion porque mezclaban estados legacy, formulas no soportadas por las RPC reales y cards que se recalculaban sobre datasets ya filtrados.
- Causa raiz: `ProjectsPage` seguia contando `PLANNED` en lugar de `NEGOTIATION`, calculaba costes con `tax_base` aunque `list_purchase_invoices` no lo devuelve y mezclaba presupuestos no aprobados; `QuotesPage` contaba sobre la lista ya filtrada y ocultaba `INVOICED` y `REJECTED`; la fiabilidad de `InvoicesPage` dependia de que `get_sales_invoice_kpi_summary` estuviera realmente desplegada en remoto.
- Solucion aplicada: se normalizo estado de proyectos en `src/constants/projectStatuses.ts`, se reescribio la cabecera y los KPIs financieros de `src/pages/nexo_av/desktop/pages/ProjectsPage.tsx` para leer `get_project_financial_stats`, se alineo `src/pages/nexo_av/mobile/pages/MobileProjectsPage.tsx`, y se corrigio `src/pages/nexo_av/desktop/pages/QuotesPage.tsx` para separar dataset del listado y dataset de contadores, filtrar `SENT` de verdad y mostrar tambien `INVOICED` y `REJECTED`. Ademas se verifico que la migracion `20260313110000_resolve_sales_kpi_conflicts.sql` ya esta aplicada en vivo y da servicio a `InvoicesPage`.
- Validacion realizada: `npm run build` OK el `2026-03-13`; contraste con Supabase autenticado como `alex.burgues@avtechesdeveniments.com` confirmando `Proyectos = 36` con cabecera canonica `21/7/1/2/4/1`, `12.000,05 EUR` ingresos netos y `6.487,83 EUR` costes; `Facturas Q1 2026 = 20.389,09 EUR` bruto, `16.850,49 EUR` neto, `15.800,59 EUR` cobrado, `4.588,50 EUR` pendiente; `Presupuestos = 65` con `SENT 18`, `APPROVED 6`, `EXPIRED 21`, `DRAFT 3`, `INVOICED 4`, `REJECTED 13`.
- Medidas para evitar recurrencia: no calcular KPIs ejecutivos desde listados operativos si existe una RPC canonica; no reutilizar contadores sobre datasets ya filtrados para cards resumen; normalizar siempre estados documentales legacy antes de agregarlos en UI; revisar la base viva antes de concluir que una migracion sigue pendiente.

### [2026-03-15] Alta de catalogo sin numeracion canonica por categoria/subcategoria en `catalog`

- Contexto: el alta manual de productos y servicios en Catalogo permitia escribir el SKU libremente o lo inventaba con `PRD/SRV-${Date.now()}`, mientras importaciones y packs usaban otras estrategias distintas.
- Causa raiz: la logica historica `CATEGORY-SUBCATEGORY-NNNN` seguia existiendo solo en `internal.generate_product_number`, pero el catalogo activo V2 ya trabaja sobre `catalog.products` y `public.create_catalog_product`, que solo insertaba el `p_sku` recibido sin generarlo.
- Solucion aplicada: se creo la migracion `supabase/migrations/20260315153640_auto_assign_catalog_skus_by_category.sql` para anadir `catalog.categories.code`, secuencias por prefijo y funciones canonicas de preview/generacion de numero; se actualizaron `create_catalog_product`, `list_catalog_categories`, `list_catalog_products` y `get_catalog_product_detail`, y en UI `ProductsTab`, `ProductImportDialog` y `PacksTab` para usar categoria + subcategoria y delegar la numeracion a la BD.
- Validacion realizada: `npx supabase migration list --linked` mostrando la nueva migracion solo en local; `npx supabase db push --linked --dry-run` detectando unicamente `20260315153640_auto_assign_catalog_skus_by_category.sql`; `npx tsc --noEmit` OK; `npm run -s build` OK el `2026-03-15`.
- Medidas para evitar recurrencia: no volver a generar SKU en frontend con timestamps o contadores locales; usar siempre la RPC canonica y mantener la constraint unica de `catalog.products.sku` como ultimo guardarrail; cualquier evolucion de packs debe reutilizar la misma capa de numeracion y taxonomia en `catalog`.

### [2026-03-15] Ajustes de categorias seguia editando taxonomia legacy `internal.*`

- Contexto: tras mover el catalogo V2 a numeracion y categorias `catalog.*`, la pestana `Ajustes > Categorias` seguia creando, editando e importando datos maestros en RPCs legacy `list/create/update/delete_product_category` y `*_subcategory`.
- Causa raiz: la pantalla de mantenimiento de taxonomia no habia sido migrada al nuevo modelo jerarquico `catalog.categories`, por lo que catalogo e importaciones consumian una fuente de verdad distinta a la que editaba administracion.
- Solucion aplicada: se reescribieron `ProductCategoriesTab` y `CategoryImportDialog` para trabajar solo con `list/create/update/delete_catalog_category`, cargar categorias raiz por dominio (`PRODUCT`/`SERVICE`), gestionar subcategorias via `parent_id`, importar Excel contra el mismo contrato y dejar de depender del modelo legacy.
- Validacion realizada: busqueda estatica sin referencias restantes a `create/list/update/delete_product_category` ni `*_subcategory` en `src/pages/nexo_av/desktop/components/settings`; `npx tsc --noEmit` OK; `npm run -s build` OK el `2026-03-15`.
- Medidas para evitar recurrencia: cualquier mantenimiento de taxonomia debe pasar por `catalog.categories` y sus RPCs canonicas; si se anaden nuevos flujos de importacion o administracion, deben reutilizar `code`, `parent_id` y `domain` del catalogo activo en vez de reabrir integraciones con `internal.*`.

### [2026-03-15] Altas e importaciones del catalogo seguian permitiendo productos sin subcategoria

- Contexto: tras acordar que el SKU y la clasificacion deben depender siempre de categoria + subcategoria, el alta manual y algunos flujos de importacion todavia podian crear productos cayendo a la categoria raiz.
- Causa raiz: `ProductsTab` seguia aceptando subcategoria vacia y usaba `formData.subcategoryId || formData.categoryId`; la importacion del tab y el importador avanzado tambien tenian fallback a `category.id` cuando no habia subcategoria valida.
- Solucion aplicada: se hizo obligatoria la subcategoria en el guardado manual y en las importaciones de catalogo, se elimino el uso efectivo de la categoria raiz para crear productos y se fuerza siempre `p_category_id = subcategoryId` cuando se llama a `create_catalog_product`.
- Validacion realizada: `rg` confirmando mensajes y guardrails nuevos en `ProductsTab.tsx` y `ProductImportDialog.tsx`; `npx tsc --noEmit` OK; `npm run -s build` OK el `2026-03-15`.
- Medidas para evitar recurrencia: cualquier nuevo flujo de alta o importacion de catalogo debe validar primero una subcategoria real del arbol `catalog.categories`; no volver a usar fallback a categoria raiz para productos/servicios numerados.

### [2026-03-16] Drift de migraciones catalogo/packs y SQL incorrecta en `16101500`

- Contexto: al preparar el release gate del catalogo, `migration list --linked` mostraba drift local/remoto: migraciones locales ya vivas en BD pero sin historial, duplicados locales supersedidos por versiones remotas del `2026-03-16`, y dos RPC funcionales (`list_catalog_bundles` y `update_product_pack`) aun sin desplegar.
- Causa raiz: parte del trabajo de catalogo y seeds se habia aplicado fuera del timeline local canonico; ademas la migracion `20260316101500_list_catalog_bundles_with_real_base_price.sql` asumio erróneamente que `catalog.products` tenia columnas fisicas `sale_price_effective` y `tax_rate`, cuando son valores derivados.
- Solucion aplicada: se eliminaron del repo el duplicado `20260315165919` y las migraciones locales `20260315180500` a `20260315181200` reemplazadas por sus equivalentes remotas; se reparo el historial linked marcando como `applied` `20260315153640`, `20260315180000` y `20260315180200`; se desplegaron de forma real `20260315180100`, `20260315180300`, `20260315180400`, `20260316101500` y `20260316113000`; y se corrigio `20260316101500` para calcular `sale_price_effective`, `base_price_real`, `visible_discount_percent` y `tax_rate` mediante expresiones/lookup reales.
- Validacion realizada: `npx supabase migration list --linked` alineado hasta `20260316113000`; `npx supabase gen types typescript --linked --schema public,catalog` confirmando en remoto `base_price_real`, `visible_discount_percent` y `p_sale_price`; `npm run build` OK; `npx tsc --noEmit` OK; `eslint` de los archivos tocados sin errores.
- Medidas para evitar recurrencia: no dejar en repo migraciones locales supersedidas por versiones remotas canonicas; antes de marcar una migracion como pendiente, verificar el contrato remoto con `supabase gen types`; y en migraciones SQL sobre `catalog.products`, no referenciar como columnas los campos derivados que solo existen en RPCs/listados.

### [2026-03-16] Flujos mobile de proyecto/cliente/facturacion no respetaban contexto ni paridad con desktop

- Contexto: la revision completa de mobile detecto que varios CTAs operativos llevaban al usuario a la pantalla equivocada o a una ruta desktop-only, especialmente en detalle de proyecto, planning y detalle de cliente.
- Causa raiz: `MobileProjectDetailPage` y `MobileClientDetailPage` no leian `?tab=` y siempre abrían la pestaña por defecto; `invoices/new` montaba solo desktop; `MobilePlanningTab` lanzaba la creacion de factura solo con `projectId/siteId`; y el header mobile no resolvia titulos de facturas, compras ni gastos.
- Solucion aplicada: se convirtio `invoices/new` en ruta responsive con `MobileNewInvoicePage`; se añadió soporte de deep-link y sincronizacion de pestañas en `MobileProjectDetailPage` y `MobileClientDetailPage`; se corrigieron los CTAs de nueva factura para enviar `returnTo` al contexto correcto; `MobileNewInvoicePage` ahora puede resolver `clientId` a partir de `projectId` y vuelve al origen operativo; y `MobileHeader` reconoce rutas de facturas, compras y gastos.
- Validacion realizada: `npx tsc --noEmit` OK; `npm run -s build` OK el `2026-03-16`; `npx eslint` acotado confirma que no quedan errores nuevos en `MobileNewInvoicePage`, aunque persiste deuda previa de `no-explicit-any` y hooks en `MobileProjectDetailPage` y `MobilePlanningTab`.
- Medidas para evitar recurrencia: cualquier CTA mobile hacia formularios de negocio debe pasar contexto de retorno (`returnTo`) cuando exista boton atras propio; si una pantalla mobile usa pestañas navegables, debe soportar `?tab=` para deep-links y retorno desde flujos secundarios; y ninguna ruta operativa nueva debe quedar desktop-only cuando ya exista entry point mobile.

### [2026-03-19] Módulo de gastos: listado fijo, líneas, contabilidad y SharePoint

- Contexto: el módulo de gastos presentaba 4 problemas: (1) el listado desktop solo mostraba ~3 tickets sin poder hacer scroll; (2) los gastos nuevos no permitían editar líneas sin pulsar «Editar» primero; (3) la función contable `create_invoice_purchase_entry` usaba siempre cuenta 627000 en lugar de 629.x según categoría; (4) la aprobación falla si el período contable está cerrado.
- Causa raíz:
  - Listado fijo: el `motion.div` en `ExpensesPage.tsx` no tenía `flex-1 min-h-0 flex flex-col`, por lo que el contenedor de la tabla con `overflow-auto` no tenía contexto flex para expandirse y el `overflow-hidden` del padre cortaba el contenido.
  - Líneas: los gastos nuevos (DRAFT, sin concepto ni categoría) no auto-entraban en modo edición; el usuario debía descubrir el botón «Editar».
  - Contabilidad: `accounting.create_invoice_purchase_entry` hardcodeaba `627000` para todos los tickets, ignorando `expense_category` que mapea a `629.1`–`629.9`.
  - Aprobación/período: `check_journal_entry_period_not_closed` bloquea el asiento si la fecha del ticket cae en mes cerrado. Error ya manejado en UI con mensaje explícito; el usuario debe cambiar la fecha del ticket o reabrir el período.
- Solución aplicada:
  - `ExpensesPage.tsx`: añadido `className="flex-1 min-h-0 flex flex-col"` al `motion.div` y `shrink-0` al grid de KPIs y al div de cabecera/filtros.
  - `ExpenseDetailPage.tsx`: auto-entrada en modo edición cuando `status=DRAFT`, sin `internal_purchase_number` y sin `manual_beneficiary_name`/`expense_category`.
  - Migración `20260319100000_fix_expense_ticket_account_by_category.sql`: `CREATE OR REPLACE FUNCTION accounting.create_invoice_purchase_entry` usando CASE de `expense_category` para determinar la cuenta 629.x; fallback `627000` si sin categoría.
- Validación realizada: `npx tsc --noEmit` OK; migración aplicada en live con `apply_migration` OK.
- Medidas para evitar recurrencia: (1) cualquier contenedor principal de listado con scroll debe tener su padre con `flex flex-col` explícito; (2) formularios nuevos en DRAFT deben auto-entrar en edición si no tienen datos; (3) las funciones de asiento contable de compras deben leer `expense_category` al mapear cuentas del grupo 629; (4) al aprobar un ticket con fecha en mes pasado, advertir al usuario antes de intentarlo.
