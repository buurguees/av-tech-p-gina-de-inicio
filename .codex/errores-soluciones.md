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
