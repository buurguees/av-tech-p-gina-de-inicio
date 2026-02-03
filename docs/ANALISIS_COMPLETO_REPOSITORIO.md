# Análisis completo del repositorio – AV TECH / Nexo AV

**Fecha:** 3 de febrero de 2026  
**Objetivo:** Documento técnico para equipos internos y externos: arquitectura, base de datos, conexiones, funcionalidades desktop/mobile y estructura del proyecto.

---

## Índice

1. [Visión general](#1-visión-general)  
2. [Estructura del directorio](#2-estructura-del-directorio)  
3. [Base de datos (Supabase / PostgreSQL)](#3-base-de-datos-supabase--postgresql)  
4. [Conexiones de la plataforma](#4-conexiones-de-la-plataforma)  
5. [Funcionalidades por plataforma](#5-funcionalidades-por-plataforma)  
6. [Migraciones y despliegue](#6-migraciones-y-despliegue)  
7. [Resumen para otros equipos](#7-resumen-para-otros-equipos)  
8. [Nodos de conexión y flujos de datos](#8-nodos-de-conexión-y-flujos-de-datos)  
9. [Datos de entrada por módulo](#9-datos-de-entrada-por-módulo)  
10. [Datos de salida y extracción por módulo](#10-datos-de-salida-y-extracción-por-módulo)  
11. [Automatizaciones y triggers](#11-automatizaciones-y-triggers)  
12. [Asientos diarios, PyG y validación de consistencia](#12-asientos-diarios-pyg-y-validación-de-consistencia)  
- [Anexo A. Listado completo de funciones RPC](#anexo-a-listado-completo-de-funciones-rpc-public)  
- [Anexo B. Tablas PostgREST y buckets Storage](#anexo-b-tablas-postgrest-y-buckets-storage)  
- [Anexo C. Invocación de Edge Functions desde el frontend](#anexo-c-invocación-de-edge-functions-desde-el-frontend)  
- [Anexo D. Uso de Supabase Auth en el frontend](#anexo-d-uso-de-supabase-auth-en-el-frontend)

---

## 1. Visión general

### 1.1 Descripción del proyecto

- **Nombre:** AV TECH – Página de inicio y plataforma Nexo AV  
- **Producto:**  
  - Web corporativa (landing, contacto, legal).  
  - **Nexo AV:** aplicación de gestión empresarial (CRM, proyectos, presupuestos, facturación, compras, contabilidad, RRHH, catálogo, mapas, escáner de documentos).  
- **Stack principal:**  
  - **Frontend:** React 18, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, shadcn/ui, Lucide.  
  - **Backend / BBDD:** Supabase (PostgreSQL, Auth, Storage, Edge Functions).  
  - **Otros:** Firebase (Analytics), Resend (email), Buffer polyfill para Excel/PDF en navegador.

### 1.2 URLs y despliegue

- **Producción web:** `https://avtechesdeveniments.com`  
- **Supabase:** `https://takvthfatlcjsqgssnta.supabase.co`  
- **Firebase:** proyecto `avtech-305e7` (analytics).  
- **Desarrollo local:** `http://localhost:5173` (Vite).

El cliente Supabase se instancia en `src/integrations/supabase/client.ts` con URL y clave anónima (pública); la sesión se persiste en `localStorage` con refresh automático de token.

---

## 2. Estructura del directorio

Estructura simplificada para que otros equipos entiendan la organización del código (se omiten `node_modules`, `build`, `.git`).

```
av-tech-p-gina-de-inicio/
├── public/                    # Assets estáticos
│   ├── favicon.png
│   ├── og-image.png
│   ├── placeholder.svg
│   ├── robots.txt
│   ├── sitemap.xml
│   └── images/
│       └── nexoav-logo.png
│
├── src/
│   ├── main.tsx               # Entrada: React root, Buffer polyfill, Firebase
│   ├── App.tsx                # Router, lazy loading, rutas Nexo AV (responsive)
│   ├── App.css
│   ├── index.css
│   ├── firebase.ts            # Firebase App + Analytics
│   ├── vite-env.d.ts
│   │
│   ├── components/            # Componentes globales (landing, UI compartida)
│   │   └── ui/                # shadcn/ui (button, card, dialog, input, etc.)
│   ├── constants/             # Constantes de dominio
│   │   ├── documentImmutabilityRules.ts
│   │   ├── financeStatuses.ts
│   │   ├── invoiceStatuses.ts
│   │   ├── projectStatuses.ts
│   │   ├── purchaseInvoiceStatuses.ts
│   │   ├── quoteStatuses.ts
│   │   ├── salesInvoiceStatuses.ts
│   │   ├── supplierConstants.ts
│   │   ├── technicianConstants.ts
│   │   └── ticketCategories.ts
│   ├── hooks/
│   │   ├── use-mobile.tsx     # useIsMobile (breakpoint 768px), useDeviceInfo, useIOS
│   │   ├── use-toast.ts
│   │   ├── useDebounce.ts
│   │   ├── useDeviceDetection.ts
│   │   ├── useInactivityLogout.ts
│   │   ├── usePagination.ts
│   │   └── usePasswordValidation.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts      # createClient(URL, ANON_KEY)
│   │       └── types.ts       # Database (tipos generados)
│   ├── lib/
│   │   └── utils.ts
│   ├── polyfills/
│   │   └── buffer.ts          # Buffer para exceljs / @react-pdf/renderer
│   ├── assets/                # Imágenes/vídeos landing y catálogo
│   │   ├── catalog/
│   │   ├── logos/
│   │   ├── projects/
│   │   └── ...
│   │
│   └── pages/
│       ├── Index.tsx          # Landing
│       ├── NotFound.tsx
│       ├── PrivacyPolicy.tsx
│       ├── TermsAndConditions.tsx
│       ├── presentations/
│       │   └── SharkEventsPresentation.tsx
│       │
│       └── nexo_av/           # Aplicación Nexo AV
│           ├── components/
│           │   ├── ResponsivePage.tsx   # createResponsivePage(desktop, mobile)
│           │   └── projects/
│           ├── layouts/
│           │   └── ResponsiveLayout.tsx  # Elige DesktopLayout o MobileLayout por useIsMobile()
│           ├── docs/                    # Docs internos nexo_av
│           │   ├── CONFLICTOS_CSS_INPUTS_DROPDOWNS.md
│           │   └── EXPORTAR_A_FIGMA.md
│           │
│           ├── desktop/
│           │   ├── layouts/
│           │   │   └── NexoAvLayout.tsx   # Sidebar + Outlet (rutas hijas)
│           │   ├── pages/                  # Páginas solo desktop o variante desktop
│           │   │   ├── Login.tsx
│           │   │   ├── AccountSetup.tsx
│           │   │   ├── Dashboard.tsx
│           │   │   ├── ClientsPage.tsx, ClientDetailPage.tsx
│           │   │   ├── ProjectsPage.tsx, ProjectDetailPage.tsx
│           │   │   ├── QuotesPage.tsx, QuoteDetailPage.tsx, NewQuotePage.tsx, EditQuotePage.tsx
│           │   │   ├── InvoicesPage.tsx, InvoiceDetailPage.tsx, NewInvoicePage.tsx, EditInvoicePage.tsx
│           │   │   ├── PurchaseInvoicesPage.tsx, PurchaseInvoiceDetailPage.tsx, NewPurchaseInvoicePage.tsx
│           │   │   ├── PurchaseOrdersPage.tsx, PurchaseOrderDetailPage.tsx, NewPurchaseOrderPage.tsx
│           │   │   ├── CatalogPage.tsx, ProductDetailPage.tsx
│           │   │   ├── LeadMapPage.tsx, ClientMapPage.tsx, ProjectMapPage.tsx, TechMapPage.tsx
│           │   │   ├── TechniciansPage.tsx, TechnicianDetailPage.tsx
│           │   │   ├── SuppliersPage.tsx, SupplierDetailPage.tsx
│           │   │   ├── AccountingPage.tsx
│           │   │   ├── ExpensesPage.tsx, ReportsPage.tsx
│           │   │   ├── PartnersPage.tsx, PartnerDetailPage.tsx
│           │   │   ├── WorkersPage.tsx, WorkerDetailPage.tsx
│           │   │   ├── UsersPage.tsx
│           │   │   ├── SettingsPage.tsx, TaxDetailPage.tsx
│           │   │   ├── AuditPage.tsx, AuditEventDetailPage.tsx
│           │   │   ├── CalculatorPage.tsx, DeveloperPage.tsx
│           │   │   ├── ScannerPage.tsx, ScannerDetailPage.tsx
│           │   │   └── NotFound.tsx
│           │   ├── components/             # Componentes por dominio
│           │   │   ├── accounting/
│           │   │   ├── catalog/
│           │   │   ├── clients/
│           │   │   ├── common/             # PaginationControls, ProductSearchInput, etc.
│           │   │   ├── dashboard/          # DashboardView, widgets (RevenueChart, CashFlowChart, etc.)
│           │   │   ├── detail/
│           │   │   ├── documents/
│           │   │   ├── invoices/
│           │   │   ├── layout/             # NexoHeader, Sidebar, ThemeToggle, UserAvatarDropdown
│           │   │   ├── leadmap/            # CanvassingMapSidebar, LeadMap, CanvassingDetailPanel, etc.
│           │   │   ├── navigation/
│           │   │   ├── projects/
│           │   │   ├── purchases/
│           │   │   ├── quotes/
│           │   │   ├── rrhh/
│           │   │   ├── settings/
│           │   │   ├── suppliers/
│           │   │   ├── technicians/
│           │   │   └── users/
│           │   ├── constants/
│           │   ├── hooks/
│           │   └── styles/
│           │       ├── global.css
│           │       ├── base/
│           │       └── components/          # cards, common, dashboard, detail, layout, tables, etc.
│           │
│           └── mobile/
│               ├── layouts/
│               │   └── NexoAvMobileLayout.tsx   # Navegación inferior + Outlet
│               ├── pages/
│               │   ├── MobileDashboard.tsx
│               │   ├── MobileClientsPage.tsx, MobileClientDetailPage.tsx
│               │   ├── MobileProjectsPage.tsx, MobileProjectDetailPage.tsx
│               │   ├── MobileQuotesPage.tsx, MobileQuoteDetailPage.tsx
│               │   ├── MobileInvoicesPage.tsx, MobileInvoiceDetailPage.tsx
│               │   ├── MobileNewClientPage.tsx, MobileNewProjectPage.tsx, MobileNewQuotePage.tsx
│               │   ├── MobileEditClientPage.tsx, MobileEditQuotePage.tsx
│               │   ├── MobileScannerPage.tsx, MobileScannerDetailPage.tsx
│               │   ├── MobileSettingsPage.tsx
│               │   └── MobileNotFound.tsx
│               ├── components/
│               └── styles/
│
├── supabase/
│   ├── config.toml            # project_id, verify_jwt por función
│   ├── functions/
│   │   ├── _shared/
│   │   │   └── cors.ts
│   │   ├── send-contact-form/
│   │   ├── send-otp/
│   │   ├── verify-otp/
│   │   ├── admin-users/
│   │   ├── send-user-invitation/
│   │   ├── rate-limit/
│   │   └── monthly-report-worker/
│   └── migrations/            # SQL aplicado (cientos de migraciones)
│
├── docs/                      # Documentación (este archivo y demás .md)
├── scripts/                    # export-to-figma.js, send-pyg-report-email.ts
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── postcss.config.js
├── eslint.config.js
├── components.json            # shadcn
├── .firebaserc
├── firebase.json
└── README.md
```

**Resumen de organización:**

- **Landing y estáticas:** `src/pages/` (Index, Privacy, Terms) y `src/components/` globales.
- **Nexo AV:** todo bajo `src/pages/nexo_av/`.  
  - **Responsive:** `ResponsiveLayout` + `createResponsivePage(desktop, mobile)` según `useIsMobile()` (breakpoint 768px).
  - **Desktop:** `desktop/layouts`, `desktop/pages`, `desktop/components` por módulo (accounting, catalog, clients, dashboard, invoices, leadmap, projects, purchases, quotes, settings, suppliers, technicians, users).
  - **Mobile:** `mobile/layouts`, `mobile/pages`, `mobile/components`; muchas pantallas reutilizan lógica o componentes de desktop vía importaciones desde `../../desktop/...`.
- **Datos y tipos:** `src/integrations/supabase/` y `src/constants/`.
- **Backend serverless:** `supabase/functions` y `supabase/migrations`.

---

## 3. Base de datos (Supabase / PostgreSQL)

La base de datos se consulta vía **Supabase (PostgREST + RPC)**. El proyecto usa **múltiples esquemas**; el cliente anónimo accede sobre todo a tablas/views expuestas y a **funciones RPC** (públicas o en esquemas expuestos). La información que sigue se ha obtenido del MCP de Supabase (listado de tablas por esquema).

### 3.1 Esquemas principales

| Esquema      | Uso principal |
|-------------|----------------|
| **public**  | `user_roles`, `scanned_documents` y posibles wrappers/views. |
| **crm**     | Clientes, contactos, mensajes de contacto (no expuesto directamente; se usa vía RPC, p. ej. `insert_contact_message`). |
| **internal**| Usuarios autorizados (`authorized_users`), técnicos, proveedores, empleados, socios, cuentas bancarias, invitaciones, etc. |
| **projects**| Proyectos, pedidos de cliente, proyectos AV, tareas, documentos de proyecto, gastos de proyecto. |
| **quotes**  | Presupuestos (cabecera y líneas). |
| **sales**   | Facturación venta (`invoices`, `invoice_lines`, `invoice_payments`), facturación compra (`purchase_invoices`, `purchase_invoice_lines`, `purchase_invoice_payments`), pedidos de compra (`purchase_orders`, `purchase_order_lines`), secuencias. |
| **catalog** | Categorías, tipos de impuesto, productos, packs, stock (movimientos, alertas), documentos de producto, fuentes externas (SharePoint/Excel). |
| **accounting**| Plan contable (`chart_of_accounts`), asientos (`journal_entries`, `journal_entry_lines`), configuración fiscal (`tax_config`), saldos (`account_balances`), nóminas (`payroll_runs`), retribución socios (`partner_compensation_runs`), pagos nómina (`payroll_payments`), cierre de período (`period_closures`), informes mensuales (`monthly_reports`). |

### 3.2 Tablas por dominio (resumen)

- **public:** `user_roles` (roles por usuario Auth), `scanned_documents` (documentos escaneados asignables).
- **projects:** `projects`, `customer_orders`, `av_projects`, `project_tasks`, `project_documents`, `expenses`.
- **sales:** `invoices`, `invoice_lines`, `invoice_payments`, `invoice_sequences`, `purchase_invoices`, `purchase_invoice_lines`, `purchase_invoice_payments`, `purchase_orders`, `purchase_order_lines`, `purchase_order_sequences`.
- **catalog:** `categories`, `tax_rates`, `products`, `product_bundles`, `stock_movements`, `stock_alerts`, `product_documents`, `external_catalog_sources`, `external_catalog_sync_runs`, tablas de migración `_mig_*`.
- **accounting:** `chart_of_accounts`, `journal_entries`, `journal_entry_lines`, `tax_config`, `account_balances`, `payroll_runs`, `partner_compensation_runs`, `payroll_payments`, `period_closures`, `monthly_reports`.

Las tablas de **internal** y **crm** no se listan aquí en detalle; se accede a ellas mediante **RPC** (por ejemplo `get_authorized_user_by_auth_id`, `list_authorized_users`, `insert_contact_message`, etc.).

### 3.3 RLS y acceso

- Muchas tablas tienen **RLS (Row Level Security)** activado.
- `sales.purchase_invoices` y `sales.purchase_orders` (y algunas otras) tienen RLS desactivado; el control de acceso se delega en RPC y lógica de negocio.
- El frontend usa la **clave anónima**; la identidad viene de **Supabase Auth**. Las operaciones sensibles pasan por **Edge Functions** con **service role** o por RPC que internamente usan `auth.uid()` / `internal.get_authorized_user_id()`.

### 3.4 Funciones RPC

El archivo `src/integrations/supabase/types.ts` genera tipos a partir de la base de datos e incluye **más de 230 funciones RPC** públicas. En el **[Anexo A](#anexo-a-listado-completo-de-funciones-rpc-public)** se listan todas por dominio (auth, clientes, proyectos, presupuestos, facturación, compras, catálogo, contabilidad, RRHH, mapas, empresa, auditoría). Entre ellas (solo indicativo):

- **Auth/usuarios:** `get_authorized_user_by_auth_id`, `get_authorized_user_id`, `list_authorized_users`, `create_authorized_user`, `update_own_user_info`, `assign_user_role`, `get_user_roles_by_user_id`, `validate_invitation_token`, `mark_invitation_token_used`, `get_user_auth_id_by_email`, `check_email_exists`, `create_invitation_token`, etc.
- **OTP:** `generate_otp`, `verify_otp`.
- **Rate limit:** `check_rate_limit`, `record_login_attempt`, `reset_rate_limit`.
- **CRM/contacto:** `insert_contact_message`, `log_action`.
- **Presupuestos:** `add_quote_line`, `auto_save_quote_line`, `auto_save_quote_notes`, y otras de actualización/consulta de presupuestos.
- **Facturación:** `add_invoice_line`, `finance_list_invoices`, y lógica de emisión/pago.
- **Compras:** `add_purchase_invoice_line`, `list_purchase_invoices`, `get_purchase_invoice`, `approve_purchase_invoice`, `recalculate_purchase_invoice`, etc.
- **Proyectos:** `list_projects`, `get_project_financial_stats`, `add_project_expense`, etc.
- **Contabilidad:** `get_profit_loss`, `list_cash_movements`, `get_balance_sheet`, `calculate_corporate_tax`, `close_period`, `get_monthly_closure_report_dataset`, `get_report_settings`, `admin_update_report_settings`, nóminas y retribución socios (crear, aprobar, pagar), etc.
- **Catálogo:** productos, categorías, stock, packs, documentos, sincronización externa.

Toda la lógica crítica (crear usuario, asignar rol, enviar invitación, validar token, OTP, rate limit, contacto, informes mensuales) está en **RPC + Edge Functions**, no en acceso directo a tablas desde el cliente.

---

## 4. Conexiones de la plataforma

### 4.1 Supabase

- **URL:** definida en `src/integrations/supabase/client.ts` (y en variables de entorno en build).
- **Clave:** anónima (pública) para el navegador; persistencia de sesión en `localStorage`, auto-refresh de token.
- **Uso:**  
  - Lectura/escritura vía **supabase.from('schema.table')** donde el esquema está expuesto.  
  - Lógica de negocio y seguridad vía **supabase.rpc('nombre_rpc', { ... })**.  
  - **Storage:** buckets usados en código: `purchase-documents` (facturas/gastos escaneados), `company-assets` (logo, etc.), `reports` (informes mensuales PDF desde Edge). La tabla `public.scanned_documents` es PostgREST, no un bucket.
- **Auth:** login por **email + OTP** (flujo: frontend llama Edge `send-otp` → usuario recibe código → frontend llama Edge `verify-otp`; la sesión la gestiona Supabase Auth). Invitaciones con token y `setup-password` vía Edge `admin-users`.

### 4.2 Edge Functions (Supabase)

Todas las funciones están en `supabase/functions/` y se despliegan en el proyecto `takvthfatlcjsqgssnta`. En `config.toml` las listadas tienen `verify_jwt = false` (la autorización se hace dentro de cada función cuando aplica).

| Función                  | Descripción breve |
|--------------------------|-------------------|
| **send-contact-form**    | Recibe el formulario de contacto de la web, valida, inserta en BBDD vía RPC `insert_contact_message`, registra en auditoría `log_action`, envía email al equipo con Resend. Orígenes CORS: producción, Firebase, localhost, Lovable. |
| **send-otp**             | Genera OTP con RPC `generate_otp` y envía email con el código (Resend). Usado para login sin contraseña. |
| **verify-otp**           | Verifica el código con RPC `verify_otp`; devuelve validez e intentos restantes. |
| **admin-users**          | CRUD y acciones de administración de usuarios. Públicas (sin JWT): `validate-invitation`, `setup-password`. Con JWT: obtiene usuario autorizado y, si es admin, permite `list`, `list-roles`, `create`, `update`, `delete`, `reset-password`, `toggle-status`, y cualquier usuario puede `update_own_info` (solo sus datos). Usa RPC de internal y Auth Admin API. |
| **send-user-invitation**  | Solo admin. Crea usuario Auth + authorized_user, asigna rol, genera token de invitación, envía email con enlace a `/nexo-av/setup-account?token=...&email=...`. Dominio de email: `@avtechesdeveniments.com`. |
| **rate-limit**           | Acciones `check`, `record`, `reset`. Comprueba/registra intentos de login por email e IP con RPC `check_rate_limit` y `record_login_attempt`; `reset` exige auth. |
| **monthly-report-worker**| Invocada por cron (Bearer `CRON_SECRET`). Procesa cola `accounting.monthly_reports` (PENDING/FAILED), genera PDF con jsPDF y datos de `get_monthly_closure_report_dataset`, sube a Storage `reports`, actualiza estado; si está configurado, envía email con Resend y enlace firmado. Reintentos con backoff. |
| **receive-invoice-email**| (Desplegada en Supabase; puede no estar en repo local.) Típicamente webhook para recibir facturas por email y asociarlas a documentos/compras. |

### 4.3 Firebase

- **Uso actual:** Analytics (`getAnalytics(app)` en `src/firebase.ts`), inicializado en `main.tsx`.
- **Config:** `projectId: avtech-305e7`, dominio `avtech-305e7.firebaseapp.com`. No se usa Auth ni Firestore en este repo para la lógica de Nexo AV (Auth es Supabase).

### 4.4 Resend

- Usado en Edge Functions para: contacto, OTP, invitaciones, informes mensuales.
- Variables de entorno en Supabase: `RESEND_API_KEY`, `RESEND_OTP_API_KEY` (si se diferencia para OTP).

### 4.5 Flujo de autenticación Nexo AV

1. Usuario entra en `/nexo-av` → **Login** (email).
2. Frontend llama **rate-limit** (check) y, si permitido, **send-otp** → email con código.
3. Usuario introduce código → frontend llama **verify-otp** → Supabase Auth establece sesión (magic link / token según implementación).
4. Redirección a `/nexo-av/:userId` con **ResponsiveLayout** (desktop o mobile según ancho).
5. Usuarios invitados: desde email de **send-user-invitation** van a `/nexo-av/setup-account?token=...&email=...`; **admin-users** `validate-invitation` y `setup-password` (Auth Admin actualiza contraseña y confirma email).

---

## 5. Funcionalidades por plataforma

### 5.1 Rutas (resumen)

- **Públicas:** `/`, `/privacidad`, `/terminos`, `/sharkevents`, `/nexo-av`, `/nexo-av/setup-account`.
- **Protegidas (layout `/nexo-av/:userId`):**  
  - **Responsive (desktop + mobile):** dashboard, projects, clients, quotes, invoices (lista y detalle), scanner, settings; y variantes de detalle/edición (cliente, proyecto, presupuesto, factura, escáner).  
  - **Solo desktop (por ahora):** users, catalog, lead-map, client-map, project-map, tech-map, technicians, suppliers, purchase-orders, purchase-invoices, expenses, reports, accounting, partners, workers, audit, calculator, developer, taxes, new/edit invoice, new purchase order/invoice.

Las rutas se definen en `App.tsx` con lazy loading y `createResponsivePage` donde hay versión móvil.

### 5.2 Desktop (Nexo AV)

- **Layout:** Sidebar fija + header (NexoHeader, UserAvatar, ThemeToggle) + área de contenido (`<Outlet />`).
- **Módulos principales:**  
  - **Dashboard:** KPIs, gráficos (ingresos, margen, flujo de caja), widgets (facturas pendientes, presupuestos, proyectos, resumen fiscal).  
  - **Clientes:** listado, detalle (pestañas: proyectos, presupuestos, facturas), crear/editar (diálogos o redirección).  
  - **Proyectos:** listado, detalle (pestañas: dashboard, presupuestos, facturas, gastos, compras, planificación, historial).  
  - **Presupuestos:** listado, detalle, nuevo, editar, PDF.  
  - **Facturación venta:** listado, detalle, nueva, editar, pagos, PDF.  
  - **Facturación compra:** facturas de compra y gastos (listado, detalle, nueva, aprobar, pagos); pedidos de compra (listado, detalle, nuevo).  
  - **Catálogo:** productos y packs (pestañas), importación, detalle de producto.  
  - **Contabilidad:** libro diario, libro de caja, balance, cuenta de resultados, plan de cuentas, nóminas, retribución socios, pagos, transferencias, ajustes, cierre de período.  
  - **RRHH:** socios, trabajadores, técnicos, proveedores (listados y detalle).  
  - **Mapas:** lead map (canvassing), clientes, proyectos, técnicos (Leaflet).  
  - **Escáner:** documentos escaneados, asignación a factura/gasto/proyecto.  
  - **Configuración:** datos empresa, impuestos, categorías de producto, plantillas, preferencias, nóminas.  
  - **Usuarios:** solo admin; listado, crear, editar, roles, invitación, reset password, activar/desactivar.  
  - **Auditoría:** eventos de seguridad/acciones.  
  - **Developer:** herramientas internas.  
  - **Calculadora:** utilidad de cálculos.

Los datos se cargan con **TanStack Query** y llamadas a `supabase.rpc()` o `.from()` según el módulo.

### 5.3 Mobile (Nexo AV)

- **Layout:** **NexoAvMobileLayout** con navegación inferior (dashboard, proyectos, clientes, presupuestos, etc.) y `<Outlet />`.
- **Páginas:** Dashboard, listas y detalle de clientes, proyectos, presupuestos, facturas (consulta); crear cliente/proyecto/presupuesto; editar cliente/presupuesto; escáner (lista y detalle); ajustes.
- **Detección:** `useIsMobile()` (max-width 767px) en `ResponsiveLayout` y en cada página responsive; misma ruta sirve componente desktop o mobile.
- **Reutilización:** Varias pantallas móviles importan componentes de desktop (p. ej. `PaginationControls`, `ProductSearchInput`, `LeadMap`, pestañas de catálogo, diálogos de clientes/presupuestos) desde `../../desktop/components/...`.

---

## 6. Migraciones y despliegue

- **Migraciones:** En `supabase/migrations/` hay más de 250 archivos SQL (numerados por fecha/hora). Crean esquemas, tablas, RLS, funciones, triggers, secuencias, buckets y políticas. No se listan aquí; para el estado actual de la BBDD se debe usar el MCP de Supabase o `supabase db diff`.
- **Build:** `npm run build` (o equivalente) genera salida en `build/` (Vite). Variables de entorno para URL/keys de Supabase y Firebase se inyectan en build.
- **Edge Functions:** Se despliegan con `supabase functions deploy <nombre>`; las variables (RESEND_*, CRON_SECRET, etc.) se configuran en el dashboard de Supabase.

---

## 7. Resumen para otros equipos

- **Frontend:** React + TypeScript + Vite en `src/`; Nexo AV bajo `src/pages/nexo_av/` con ramas desktop y mobile y layout responsive por ancho de pantalla.
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions). Lógica en RPC y en Edge Functions; no hay API REST propia.
- **Base de datos:** Múltiples esquemas (public, crm, internal, projects, quotes, sales, catalog, accounting); acceso vía PostgREST y RPC; RLS donde aplica.
- **Conexiones:** Supabase (cliente en `src/integrations/supabase/client.ts`), Firebase Analytics, Resend desde Edge.
- **Autenticación:** Supabase Auth con flujo OTP e invitaciones por token; rate limiting y administración de usuarios vía Edge.
- **Documentación adicional:** Resto de archivos en `docs/` (migraciones, contabilidad, catálogo, SEO, seguridad, etc.).

Si necesitas profundizar en un módulo concreto (por ejemplo contabilidad, catálogo o facturación), se puede ampliar en un anexo o documento aparte referenciando este análisis.

---

## 8. Nodos de conexión y flujos de datos

Esta sección describe **de dónde bebe la información** cada parte del sistema y **a dónde va**: tablas, RPCs, triggers y flujos entre módulos.

### 8.1 Flujo comercial: Cliente → Proyecto → Presupuesto → Factura → Cobro

| Nodo | Origen de los datos | Destino / qué alimenta |
|------|--------------------|-------------------------|
| **Cliente** | Entrada manual (create_client, update_client). Opcional: coordenadas (mapa). | `crm.clients`. Alimenta: proyectos, presupuestos, facturas, saldos (get_client_balances), mapas (list_clients_for_map). |
| **Proyecto** | create_project (cliente, nombre). Número auto: trigger `trigger_generate_project_number`. | `projects.projects`. Alimenta: presupuestos (quote.project_id), facturas (invoice.project_id), gastos (expenses), compras (purchase_orders), estadísticas (get_project_financial_stats). |
| **Presupuesto** | create_quote_with_number / add_quote_line. Número: trigger `generate_quote_number_trigger` (quotes) o `trigger_generate_quote_number` (sales). Totales: trigger `trigger_recalculate_quote_totals`. | `quotes.quotes`, `quotes.quote_lines`. Alimenta: factura (create_invoice_from_quote), estado proyecto (trigger_sync_quote_status). |
| **Factura venta** | finance_create_invoice / create_invoice_from_quote, finance_issue_invoice. Bloqueo: trigger `trigger_lock_invoice_on_issue`. Pagos: trigger `trigger_recalculate_paid_amount`. | `sales.invoices`, `sales.invoice_lines`, `sales.invoice_payments`. Al emitir (ISSUED) → **trigger** `trigger_auto_create_invoice_sale_entry` → **asiento** INVOICE_SALE (430, 700, 477). |
| **Cobro** | finance_register_payment. | `sales.invoice_payments`. Crea asiento PAYMENT_RECEIVED (572, 430). Libro de caja: list_cash_movements. |

**Resumen:** Cliente y proyecto son nodos de entrada. Presupuesto se crea desde cliente/proyecto y alimenta la factura. La factura emitida dispara automáticamente el asiento de venta; el cobro dispara el asiento de tesorería.

### 8.2 Flujo compras y gastos: Proveedor/Técnico → Factura compra → Pago

| Nodo | Origen de los datos | Destino / qué alimenta |
|------|--------------------|-------------------------|
| **Proveedor / Técnico** | create_supplier, create_technician (internal). | `internal.suppliers`, `internal.technicians`. Alimentan: facturas de compra (supplier_id, technician_id), saldos (get_supplier_technician_balances). |
| **Pedido de compra** | create_purchase_order, add_purchase_order_line. | `sales.purchase_orders`, `sales.purchase_order_lines`. Puede vincularse a factura (link_po_to_purchase_invoice). |
| **Factura de compra / ticket** | create_purchase_invoice (get_next_provisional_purchase_number / get_next_ticket_number), add_purchase_invoice_line. Aprobación: approve_purchase_invoice. | `sales.purchase_invoices`, `sales.purchase_invoice_lines`. Al aprobar (APPROVED) → **trigger** `trigger_auto_create_invoice_purchase_entry` → **asiento** INVOICE_PURCHASE (400/410, 6xx, 472, 4751). Pagos: trigger `tr_recalculate_purchase_paid` recalcula paid_amount. |
| **Pago a proveedor** | register_purchase_invoice, register_purchase_payment. | `sales.purchase_invoice_payments`. Genera asiento de pago (572, 400/410). |
| **Documentos** | Subida a Storage `purchase-documents`. Asignación desde escáner (scanned_documents → factura/gasto). | Bucket + posible vínculo en filas/tablas. |

### 8.3 Flujo contable: asientos automáticos y manuales

| Origen | Cuándo se dispara | Qué se escribe |
|--------|-------------------|----------------|
| **Factura venta ISSUED** | Trigger AFTER UPDATE status en `sales.invoices` | `accounting.journal_entries` (INVOICE_SALE) + `journal_entry_lines` (430 DEBE, 700 HABER, 477 HABER). |
| **Factura compra APPROVED** | Trigger AFTER UPDATE status en `sales.purchase_invoices` | `accounting.journal_entries` (INVOICE_PURCHASE) + líneas (400/410, 6xx, 472, 4751). |
| **Cobro cliente** | RPC finance_register_payment (interno) | Asiento PAYMENT_RECEIVED (572 DEBE, 430 HABER). |
| **Pago proveedor** | RPC register_purchase_payment (interno) | Asiento PAYMENT / PAYMENT_MADE (400/410 DEBE, 572 HABER). |
| **Nómina empleado POSTED** | RPC post_payroll_run | Asiento PAYROLL_EMPLOYEE (640 DEBE, 4751 HABER, 465 HABER). |
| **Retribución socio POSTED** | RPC post_partner_compensation_run | Asiento PAYROLL_PARTNER (640 DEBE, 4751 HABER, 465 HABER). |
| **Pago nómina/retribución** | RPC create_payroll_payment / pay_partner_compensation_run | Asiento de pago (465 DEBE, 572 HABER). |
| **Traspaso bancos** | RPC create_bank_transfer | Asiento BANK_TRANSFER (572 origen HABER, 572 destino DEBE). |
| **Ajuste / gasto-ingreso manual** | RPC create_bank_balance_adjustment o equivalente | Asiento ADJUSTMENT con cuentas indicadas. |
| **Liquidación IVA** | RPC create_vat_settlement_entry | Asiento TAX_SETTLEMENT (477, 472, 572). |
| **Liquidación IRPF** | RPC create_irpf_settlement_entry | Asiento TAX_SETTLEMENT (4751 DEBE, 572 HABER). |
| **Provisión IS** | calculate_corporate_tax (trigger en journal_entry_lines) | Asiento TAX_PROVISION (630, 4752). |

Toda la lectura para **PyG, Balance, Libro diario, Libro de caja** sale de `accounting.journal_entries` y `accounting.journal_entry_lines` vía RPCs: get_profit_loss, get_balance_sheet, list_journal_entries, get_journal_entry_lines, list_cash_movements.

### 8.4 Flujo catálogo y stock

| Nodo | Origen | Destino |
|------|--------|---------|
| **Productos / categorías** | list_catalog_*, create_catalog_product, update_catalog_product. Categorías con dominio (servicio/producto): trigger `trigger_check_product_category_domain`. Margen: trigger `trigger_calculate_margin`. | `catalog.products`, `catalog.categories`. Usados en presupuestos, líneas de factura, packs. |
| **Stock** | Movimientos insertados en `catalog.stock_movements`. | Trigger `trigger_apply_stock_movement` actualiza stock en producto; trigger `trigger_sync_stock_alert` sincroniza alertas. |
| **Factura venta con línea de producto** | Trigger `trigger_invoice_line_stock` (catalog) al insertar/actualizar/borrar línea. | Descargo de stock vía catalog (stock_movements). |
| **Factura compra con línea de producto** | Trigger `trigger_purchase_invoice_line_stock`. | Entrada de stock. |

### 8.5 Flujo RRHH: empleados, socios, nóminas

| Nodo | Origen | Destino |
|------|--------|---------|
| **Empleados / Socios** | internal (employees, partners). RPCs list_employees, list_partners. | Nóminas (payroll_runs, partner_compensation_runs). Perfiles nómina: list_partner_payroll_profiles, admin_upsert_partner_payroll_profile. |
| **Nómina DRAFT** | create_payroll_run / create_partner_compensation_run. | `accounting.payroll_runs` / `accounting.partner_compensation_runs`. No asiento hasta POSTED. |
| **Aprobar (POSTED)** | post_payroll_run / post_partner_compensation_run. | Actualiza status; crea asiento (create_payroll_entry / create_partner_compensation_entry). |
| **Pagar** | create_payroll_payment / pay_partner_compensation_run. | `accounting.payroll_payments` + asiento de pago. |

### 8.6 Flujo escáner y documentos

| Nodo | Origen | Destino |
|------|--------|---------|
| **Documento escaneado** | Frontend: insert en `public.scanned_documents`; archivo en Storage `purchase-documents`. | Asignación a factura de compra (update scanned_documents + vínculo con purchase_invoices) o a proyecto/gasto. |
| **Asignar a factura** | ScannerDetailPage: create_purchase_invoice o add_purchase_invoice_line + update scanned_documents. | Una factura de compra (ticket/factura) queda vinculada al documento; el PDF sigue en Storage. |

### 8.7 Flujo informe mensual (cierre)

| Nodo | Origen | Destino |
|------|--------|---------|
| **Cola informes** | Inserción en `accounting.monthly_reports` (estado PENDING). | Edge Function `monthly-report-worker` (cron). |
| **Datos del informe** | RPC get_monthly_closure_report_dataset (período). | Usado por la Edge para generar PDF. |
| **PDF** | Edge: jsPDF. | Storage bucket `reports` (ruta monthly/YYYY-MM/...). Opcional: email con Resend y enlace firmado. |

---

## 9. Datos de entrada por módulo

Qué información puede introducir el usuario (o el sistema) en cada apartado.

| Módulo | Datos que se pueden introducir | Dónde / cómo |
|--------|---------------------------------|--------------|
| **Clientes** | Nombre, CIF, dirección, contacto, teléfono, email, notas, estado, coordenadas (mapa), asignación comercial. | create_client, update_client, add_client_note, update_client_coordinates, reassign_client. |
| **Proyectos** | Nombre, cliente, fechas, estado, horas, tareas, gastos de proyecto. | create_project, update_project, add_project_expense. |
| **Presupuestos** | Cliente, proyecto, líneas (concepto, cantidad, precio, impuesto, descuento), validez, notas. | create_quote_with_number, add_quote_line, update_quote_line, update_quote, auto_save_quote_line, auto_save_quote_notes. |
| **Facturación venta** | Factura nueva (cliente, proyecto, líneas) o desde presupuesto; número; pagos (importe, fecha, método). | finance_create_invoice, create_invoice_from_quote, finance_add_invoice_line, finance_issue_invoice, finance_register_payment, finance_update_payment. |
| **Compras** | Pedido de compra (proveedor, líneas); factura de compra / ticket (proveedor o técnico, líneas, documento); aprobación; pagos. | create_purchase_order, add_purchase_order_line; create_purchase_invoice, add_purchase_invoice_line, approve_purchase_invoice, register_purchase_invoice, register_purchase_payment. |
| **Catálogo** | Categorías, tipos de impuesto, productos (nombre, ref, precio, coste, categoría, stock, dominio), packs, documentos de producto, importación Excel. | create_catalog_product, update_catalog_product, list_catalog_*; add_catalog_bundle_component; ProductImportDialog. |
| **Contabilidad** | Traspaso entre bancos, pago de impuesto, gasto/ingreso manual (ajuste), asiento de apertura; nómina empleado (empleado, período, bruto, IRPF); retribución socio (socio, período, bruto, IRPF); pago de nómina/retribución (banco, fecha, importe). | create_bank_transfer, create_tax_payment, create_bank_balance_adjustment; create_payroll_run, create_partner_compensation_run; post_payroll_run, post_partner_compensation_run; create_payroll_payment, pay_partner_compensation_run. |
| **RRHH** | Socios, trabajadores, técnicos, proveedores (datos de ficha); perfiles nómina socios (base, IRPF); configuración nóminas (bonus, etc.). | create_partner, update_worker; create_supplier, update_supplier; create_technician, update_technician_coordinates; admin_upsert_partner_payroll_profile, admin_update_payroll_settings. |
| **Mapas / Canvassing** | Ubicaciones de prospección, notas por ubicación, estado. | create_canvassing_location, update_canvassing_location, add_location_note. |
| **Escáner** | Subida de archivo (PDF); asignación a factura de compra, gasto o proyecto. | supabase.from('scanned_documents').insert; Storage upload; update para link a purchase_invoice_id / project_id. |
| **Configuración** | Datos empresa, contactos, preferencias (cuentas bancarias), impuestos, plantillas, tema (theme_preference). | upsert_company_settings, upsert_company_contacts, upsert_company_preferences; create_tax, update_tax; Settings. |
| **Usuarios (admin)** | Usuarios autorizados, roles, invitación por email, reset password, activar/desactivar. | Edge admin-users, send-user-invitation; RPC create_authorized_user, assign_user_role, etc. |

---

## 10. Datos de salida y extracción por módulo

Qué se puede consultar, listar o exportar desde cada apartado (RPCs de lectura e informes).

| Módulo | Datos que se pueden extraer | RPCs / Origen principal |
|--------|------------------------------|---------------------------|
| **Clientes** | Listado filtrado, detalle cliente, saldos a fecha, notas, proyectos/presupuestos/facturas del cliente, mapa. | list_clients, get_client, get_client_balances, list_client_notes, list_projects (por cliente), list_quotes, finance_list_invoices; list_clients_for_map. |
| **Proyectos** | Listado, detalle, estadísticas financieras (facturado, cobrado, gastos, compras), gastos, presupuestos, facturas, pedidos compra, técnicos, historial. | list_projects, get_project, get_project_financial_stats, list_project_expenses, list_project_quotes, list_project_purchase_orders, list_project_technicians, get_project_history. |
| **Presupuestos** | Listado, detalle, líneas, PDF. | list_quotes, get_quote, get_quote_lines. PDF en frontend. |
| **Facturación venta** | Listado facturas (filtros), detalle factura, líneas, pagos, resumen período, resumen impuestos, pagos por cliente/proyecto. | finance_list_invoices, finance_get_invoice, finance_get_invoice_lines, finance_get_invoice_payments, finance_get_period_summary, finance_get_tax_summary, finance_get_client_payments, finance_get_project_payments. |
| **Compras** | Listado facturas/pedidos, detalle factura compra (líneas, pagos), facturas por proveedor. | list_purchase_invoices, get_purchase_invoice, get_purchase_invoice_lines, get_purchase_invoice_payments; list_purchase_orders, get_purchase_order, get_purchase_order_lines; get_provider_purchase_invoices. |
| **Catálogo** | Categorías, tipos impuesto, productos (búsqueda, detalle), packs, componentes de pack, stock, alertas. | list_catalog_categories, list_catalog_tax_rates, list_catalog_products, list_catalog_products_search, get_catalog_product_detail; list_catalog_bundles, list_catalog_bundle_components. |
| **Contabilidad** | Libro diario (asientos), líneas por asiento, libro de caja, PyG (cuenta de resultados), balance de situación, plan de cuentas; resumen IVA, IRPF, IS; saldos clientes/proveedores; nóminas y retribuciones (listados), pagos nómina; saldos bancos; dataset informe cierre. | list_journal_entries, get_journal_entry_lines; list_cash_movements; get_profit_loss; get_balance_sheet; list_chart_of_accounts; get_vat_summary, get_irpf_summary, get_corporate_tax_summary; get_client_balances, get_supplier_technician_balances; list_payroll_runs, list_partner_compensation_runs, list_payroll_payments; list_bank_accounts_with_balances, list_bank_account_movements; get_monthly_closure_report_dataset. |
| **RRHH** | Listado socios, trabajadores, técnicos, proveedores; detalle; nóminas por socio; cuentas bancarias empresa. | list_partners, list_workers, list_employees, list_technicians, list_suppliers; get_worker_detail, get_supplier, get_technician; list_partner_compensation_runs (por socio); list_company_bank_accounts. |
| **Mapas** | Ubicaciones canvassing, notas, estadísticas leads; clientes/proyectos/técnicos para mapa. | list_user_canvassing_locations, get_canvassing_location, list_location_notes, get_lead_stats; list_clients_for_map, get_client_for_map; list_technicians_for_map. |
| **Escáner** | Listado documentos escaneados, detalle, archivo (Storage). | supabase.from('scanned_documents'); Storage getPublicUrl/descarga. |
| **Auditoría** | Eventos por tipo/fecha/usuario. | audit_list_events, audit_get_stats. |
| **Dashboard** | Métricas agregadas, ventas por categoría. | get_dashboard_metrics, get_sales_by_product_category. |

---

## 11. Automatizaciones y triggers

Listado de **triggers** que automatizan cálculos, numeración, asientos y validaciones. Orden por dominio.

### 11.1 Facturación y compras

| Trigger | Tabla | Evento | Función | Efecto |
|---------|-------|--------|---------|--------|
| trigger_recalculate_paid_amount | sales.invoice_payments | AFTER INSERT/UPDATE/DELETE | sales.trigger_recalculate_paid_amount | Recalcula paid_amount en sales.invoices y actualiza estado (PAGADA, etc.). |
| trigger_lock_invoice_on_issue | sales.invoices | AFTER UPDATE status | sales.lock_invoice_on_issue | Bloquea edición de factura cuando pasa a ISSUED. |
| trigger_update_invoice_payment_updated_at | sales.invoice_payments | BEFORE UPDATE | sales.update_invoice_payment_updated_at | Actualiza updated_at. |
| tr_recalculate_purchase_paid | sales.purchase_invoice_payments | AFTER INSERT/UPDATE/DELETE | sales.trigger_recalculate_purchase_paid_amount | Recalcula importe pagado en factura de compra. |

### 11.2 Contabilidad: asientos automáticos

| Trigger | Tabla | Evento | Función | Efecto |
|---------|-------|--------|---------|--------|
| trigger_auto_create_invoice_sale_entry | sales.invoices | AFTER UPDATE OF status | accounting.auto_create_invoice_sale_entry | Si status = ISSUED, crea asiento INVOICE_SALE (430, 700, 477). |
| trigger_auto_create_invoice_purchase_entry | sales.purchase_invoices | AFTER UPDATE OF status | accounting.auto_create_invoice_purchase_entry | Si status = APPROVED, crea asiento INVOICE_PURCHASE (400/410, 6xx, 472, 4751). |
| trigger_validate_balanced_entry | accounting.journal_entries | BEFORE UPDATE OF is_locked | accounting.validate_balanced_entry | Comprueba DEBE = HABER antes de bloquear asiento. |
| trigger_auto_recalculate_corporate_tax | accounting.journal_entry_lines | AFTER INSERT/UPDATE/DELETE | accounting.auto_recalculate_corporate_tax | Recalcula provisión IS cuando cambian líneas de cuentas de PyG. |
| trigger_check_journal_entry_period_closed | accounting.journal_entries | BEFORE INSERT/UPDATE | accounting.check_journal_entry_period_not_closed | Impide crear/modificar asientos en período cerrado. |
| trigger_validate_payroll_payment | accounting.payroll_payments | (validación) | accounting.validate_payroll_payment | Valida importe y coherencia del pago de nómina. |

### 11.3 Presupuestos

| Trigger | Tabla | Evento | Función | Efecto |
|---------|-------|--------|---------|--------|
| trigger_generate_quote_number | quotes.quotes (o sales) | BEFORE INSERT | sales.generate_quote_number / quotes.generate_quote_number | Asigna número de presupuesto (P-YY-XXXXXX). |
| trigger_recalculate_quote_totals | quotes.quote_lines | AFTER INSERT/UPDATE/DELETE | sales.recalculate_quote_totals | Recalcula subtotal, tax_amount, total del presupuesto. |
| trigger_lock_quote_version | quotes.quotes | (al aprobar) | sales.lock_quote_version | Bloquea versión del presupuesto. |
| trigger_sync_quote_status | quotes.quotes | AFTER UPDATE | sales.sync_quote_status | Sincroniza estado presupuesto con proyecto. |
| quote_change_logger | quotes.quotes | AFTER INSERT/UPDATE | quotes.log_quote_change | Registra historial de cambios. |

### 11.4 Proyectos y clientes

| Trigger | Tabla | Evento | Función | Efecto |
|---------|-------|--------|---------|--------|
| trigger_generate_project_number | projects.projects | BEFORE INSERT | projects.generate_project_number | Asigna número de proyecto. |
| trigger_update_project_hours | projects | (cuando aplica) | projects.update_project_hours | Actualiza horas de proyecto. |
| trigger_update_client_profile_score | crm.clients | AFTER UPDATE | crm.update_client_profile_score | Actualiza puntuación de perfil del cliente. |

### 11.5 Catálogo y stock

| Trigger | Tabla | Evento | Función | Efecto |
|---------|-------|--------|---------|--------|
| trigger_calculate_margin | catalog.products | BEFORE INSERT/UPDATE | catalog.calculate_margin | Calcula margen (precio - coste). |
| trigger_check_product_category_domain | catalog.products | BEFORE INSERT/UPDATE | catalog.check_product_category_domain | Valida dominio categoría (producto/servicio). |
| trigger_apply_stock_movement | catalog.stock_movements | AFTER INSERT | catalog.apply_stock_movement | Actualiza stock del producto según movimiento. |
| trigger_sync_stock_alert | catalog.products | AFTER INSERT/UPDATE | catalog.sync_stock_alert | Sincroniza stock_alerts (mínimo). |
| trigger_invoice_line_stock | sales.invoice_lines | AFTER INSERT/UPDATE/DELETE | catalog.on_invoice_line_stock | Descargo de stock al facturar venta. |
| trigger_purchase_invoice_line_stock | sales.purchase_invoice_lines | AFTER INSERT/UPDATE/DELETE | catalog.on_purchase_invoice_line_stock | Entrada de stock desde factura compra. |

### 11.6 Usuarios y auditoría

| Trigger | Tabla | Evento | Función | Efecto |
|---------|-------|--------|---------|--------|
| trigger_link_auth_user | internal.authorized_users | AFTER INSERT | internal.link_auth_user | Vincula usuario Auth. |
| trigger_update_last_login | internal.authorized_users | (login) | internal.update_last_login | Actualiza último login. |
| audit_authorized_users | internal.authorized_users | AFTER INSERT/UPDATE/DELETE | audit.trigger_authorized_users_audit | Registra en auditoría. |
| audit_user_roles | public.user_roles | AFTER INSERT/UPDATE/DELETE | audit.trigger_user_roles_audit | Registra en auditoría. |
| audit_clients | crm.clients | AFTER INSERT/UPDATE/DELETE | audit.trigger_clients_audit | Registra en auditoría. |

### 11.7 Canvassing y otros

| Trigger | Tabla | Evento | Función | Efecto |
|---------|-------|--------|---------|--------|
| update_location_status_history | crm (canvassing) | (cambio estado) | crm.update_location_status_history | Historial de estado ubicación. |
| update_*_updated_at | Varias tablas | BEFORE UPDATE | accounting/internal.update_updated_at_column | Mantiene updated_at. |

---

## 12. Asientos diarios, PyG y validación de consistencia

### 12.1 Tipos de asiento (entry_type) y cuentas afectadas

| entry_type | Origen | Cuentas típicas (DEBE / HABER) |
|------------|--------|---------------------------------|
| INVOICE_SALE | Factura venta ISSUED | 430 DEBE (clientes); 700 HABER (ventas); 477 HABER (IVA repercutido). |
| INVOICE_PURCHASE | Factura compra APPROVED | 400/410 DEBE (proveedores); 6xx HABER (gastos); 472 HABER (IVA soportado); 4751 HABER (IRPF si retención). |
| PAYMENT_RECEIVED | Cobro cliente | 572 DEBE (banco); 430 HABER (clientes). |
| PAYMENT / PAYMENT_MADE | Pago proveedor / nómina | 400/410 o 465 DEBE; 572 HABER. |
| PAYROLL_EMPLOYEE | Nómina empleado POSTED | 640 DEBE (sueldos); 4751 HABER (IRPF); 465 HABER (remuneraciones pendientes). |
| PAYROLL_PARTNER | Retribución socio POSTED | 640 DEBE (retribución socios); 4751 HABER; 465 HABER. |
| BANK_TRANSFER | Traspaso entre bancos | 572 origen HABER; 572 destino DEBE. |
| TAX_SETTLEMENT | Liquidación IVA/IRPF | 477/472/4751 y 572 según liquidación. |
| TAX_PROVISION | Provisión Impuesto Sociedades | 630 DEBE (gasto); 4752 HABER (provisión). |
| ADJUSTMENT | Ajuste manual / gasto o ingreso sin factura | 6xx/7xx y 572 según caso. |

### 12.2 Qué alimenta el PyG (cuenta de resultados)

- **Ingresos (7xx):** Asientos INVOICE_SALE (700), ajustes de ingreso manual.
- **Gastos (6xx):** Asientos INVOICE_PURCHASE (6xx), PAYROLL_* (640), TAX_PROVISION (630), ajustes de gasto manual.
- **Cálculo:** get_profit_loss(p_period_start, p_period_end) agrupa por cuenta desde journal_entry_lines en el período. En frontend se excluye 630 del “gasto operativo” para obtener BAI; la provisión IS se resta aparte.

### 12.3 Validación de consistencia mensual (cierre)

La RPC **validate_month_consistency(p_year, p_month, p_tolerance)** devuelve una fila por comprobación (check_code, check_name, passed, severity, detail, meta). Checks implementados:

| check_code | check_name | Qué comprueba | Severidad |
|------------|------------|----------------|-----------|
| JE_BALANCED | Asientos balanceados (Debe=Haber) | Que todos los asientos del mes tengan total DEBE = total HABER (con tolerancia). | BLOCKER |
| PURCHASE_APPROVED_HAS_ENTRY | Compras APPROVED con asiento contable | Que cada factura de compra APPROVED del mes tenga un asiento INVOICE_PURCHASE. | BLOCKER |
| TAX_PROVISION_UNIQUE | Provisión IS sin duplicados (anual) | Que en el año fiscal haya como máximo una provisión TAX_PROVISION (reference_type corporate_tax). | BLOCKER |
| PAYROLL_465_COHERENCE | Coherencia 465 vs nóminas POSTED del mes | Que el saldo acumulado de la cuenta 465 (remuneraciones pendientes) sea coherente con el neto pendiente de nóminas POSTED del mes (tolerancia 5€). | WARNING |
| SALES_ISSUED_HAS_ENTRY | Ventas ISSUED con asiento contable | Que cada factura de venta ISSUED del mes tenga un asiento INVOICE_SALE. | BLOCKER |

Uso típico: antes de **close_period** o antes de generar el informe de cierre, el frontend o la Edge llama a validate_month_consistency; si algún BLOCKER no pasa, no se debería cerrar el período.

### 12.4 Bloqueo de período

- **period_closures:** Tabla que registra los meses cerrados (is_locked).
- **trigger_check_journal_entry_period_closed:** Impide insertar o modificar asientos con fecha en un mes ya cerrado.
- **assert_period_not_closed / is_period_closed:** RPCs para comprobar si un período está cerrado antes de operaciones sensibles.

---

## Anexo A. Listado completo de funciones RPC (public)

Las siguientes funciones están definidas en `src/integrations/supabase/types.ts` (esquema público). El frontend y las Edge Functions las invocan con `supabase.rpc('nombre', { ... })`. Hay además RPC de catálogo (prefijo `list_catalog_*`, `get_catalog_*`, `create_catalog_product`, `update_catalog_product`, etc.) usadas en el código pero que pueden estar en otro esquema expuesto vía extensión o wrapper.

**Auth y usuarios:** add_client_note, add_location_note, assign_user_role, assign_worker_type, check_email_exists, clear_user_roles, create_authorized_user, create_invitation_token, delete_authorized_user, get_authorized_user_by_auth_id, get_user_auth_id, get_user_auth_id_by_email, get_user_id_by_email, get_user_roles_by_user_id, get_current_user_info, has_role, insert_contact_message, is_allowed_domain, is_email_authorized, list_assignable_users, list_authorized_users, list_roles, mark_invitation_token_used, update_authorized_user, update_own_user_info (vía Edge), validate_invitation_token.

**OTP y rate limit:** generate_otp, verify_otp, check_rate_limit, record_login_attempt, reset_rate_limit.

**Clientes:** create_client, delete_client, get_client, get_client_for_map, get_client_balances, list_client_notes, list_clients, list_clients_for_map, reassign_client, update_client, update_client_coordinates, update_client_status.

**Proyectos:** add_project_expense, create_project, get_project, get_project_financial_stats, get_project_history, get_projects_portfolio_summary, list_project_expenses, list_project_purchase_orders, list_project_quotes, list_project_technicians, list_projects, update_project.

**Presupuestos (quotes):** add_quote_line, auto_save_quote_line, auto_save_quote_notes, create_quote, create_quote_with_number, delete_quote_line, get_quote, get_quote_lines, list_quotes, reorder_quote_line, recalculate_quote_totals, update_quote, update_quote_line, update_quote_lines_order.

**Facturación venta (finance_*):** add_invoice_line, delete_invoice_line, finance_add_invoice_line, finance_cancel_invoice, finance_create_invoice, finance_delete_invoice_line, finance_delete_payment, finance_get_client_payments, finance_get_invoice, finance_get_invoice_lines, finance_get_invoice_payments, finance_get_period_summary, finance_get_project_payments, finance_get_tax_summary, finance_issue_invoice, finance_list_invoices, finance_register_payment, finance_update_invoice, finance_update_invoice_line, finance_update_payment, get_invoice, get_invoice_lines, get_next_invoice_number, create_invoice_from_quote, create_invoice_with_number, update_invoice, update_invoice_line.

**Compras (purchase_*):** add_purchase_invoice_line, add_purchase_order_line, approve_purchase_invoice, approve_purchase_order, confirm_purchase_invoice, create_purchase_invoice, create_purchase_order, delete_purchase_invoice, delete_purchase_invoice_line, delete_purchase_order, delete_purchase_order_line, delete_purchase_payment, generate_internal_purchase_number, get_next_provisional_purchase_number, get_next_ticket_number, get_next_factura_borr_number, get_purchase_invoice, get_purchase_invoice_lines, get_purchase_invoice_payments, get_purchase_order, get_purchase_order_lines, get_provider_purchase_invoices, link_po_to_purchase_invoice, list_purchase_invoices, list_purchase_orders, recalculate_purchase_invoice, register_purchase_invoice, register_purchase_payment, update_purchase_invoice, update_purchase_invoice_line, update_purchase_order, update_purchase_order_line, fix_purchase_payments_bank_to_caixabank.

**Catálogo (productos/packs – internal o catalog):** add_pack_item, create_product, create_product_category, create_product_pack, create_product_subcategory, delete_product, delete_product_category, delete_product_pack, delete_product_subcategory, get_pack_items, list_product_categories, list_product_packs, list_product_subcategories, list_products, remove_pack_item, update_pack_item, update_product_pack, update_product_subcategory. En código se usan además: list_catalog_categories, list_catalog_tax_rates, list_catalog_products, list_catalog_bundles, list_catalog_bundle_components, list_catalog_products_search, create_catalog_product, update_catalog_product, get_catalog_product_detail, add_catalog_bundle_component, remove_catalog_bundle_component, update_product_pack, delete_product_pack.

**Contabilidad:** admin_update_payroll_settings, admin_update_report_settings, assert_period_not_closed, calculate_corporate_tax, calculate_partner_productivity_bonus, check_month_closure_readiness, close_period, create_bank_balance_adjustment, create_bank_transfer, create_irpf_settlement_entry, create_partner_compensation_run, create_partner_compensation_run_from_policy, create_payroll_payment, create_tax_payment, create_vat_settlement_entry, delete_partner_compensation_run, generate_partner_compensations_for_month, get_balance_sheet, get_bank_account_code, get_corporate_tax_summary, get_irpf_by_period, get_irpf_by_person, get_irpf_model_111_summary, get_irpf_summary, get_journal_entry_lines, get_monthly_closure_report_dataset, get_next_pending_monthly_report, get_payroll_settings, get_period_profit_summary, get_profit_loss, get_report_settings, get_supplier_technician_balances, get_vat_summary, list_bank_account_movements, list_bank_accounts_with_balances, list_cash_movements, list_chart_of_accounts, list_journal_entries, list_partner_compensation_runs, list_partner_payroll_profiles, list_payroll_payments, list_payroll_runs, is_period_closed, pay_partner_compensation_run, post_partner_compensation_run, post_payroll_run, recalculate_partner_compensation_run, update_partner_compensation_run, admin_upsert_partner_payroll_profile, create_payroll_run.

**RRHH (socios, trabajadores, técnicos, proveedores):** create_partner, create_supplier, create_technician (varias firmas), delete_supplier, delete_technician, get_supplier, get_technician, get_technician_projects_count, get_worker_detail, list_company_bank_accounts, list_employees, list_partners, list_suppliers, list_technicians, list_technicians_for_map, list_workers, update_supplier, update_technician_coordinates, update_worker.

**Canvassing / mapas:** create_canvassing_location, get_canvassing_location, get_lead_stats, list_user_canvassing_locations, list_location_notes, update_canvassing_location.

**Empresa y configuración:** get_company_contacts, get_company_preferences, get_company_settings, upsert_company_contacts, upsert_company_preferences, upsert_company_settings. **Impuestos:** create_tax, delete_tax, list_taxes, update_tax.

**Auditoría:** audit_get_stats, audit_list_events.

**Otros:** get_dashboard_metrics, get_sales_by_product_category, toggle_user_status, update_authorized_user.

---

## Anexo B. Tablas PostgREST y buckets Storage

**Tablas accedidas con `supabase.from(...)` en el código:**

- `public.scanned_documents`: listado, insert, update, delete (escáner, asignación a factura/gasto).
- `sales.purchase_invoices` (o tabla expuesta como `purchase_invoices`): consulta directa en algún flujo (p. ej. ScannerDetailPage).

**Buckets Storage (`supabase.storage.from('...')`):**

- `purchase-documents`: subida y descarga de PDFs de facturas de compra / gastos; usado en ScannerPage, ScannerDetailPage, PurchaseInvoicesPage, PurchaseInvoiceDetailPage, ExpensesPage, ConvertPOToInvoiceDialog, MobileScannerPage, MobileScannerDetailPage.
- `company-assets`: subida de logo y recursos de empresa (CompanyDataTab); upload, getPublicUrl, remove.
- `reports`: usado solo en Edge Function `monthly-report-worker` para subir el PDF del informe de cierre (`monthly/YYYY-MM/closure-report_v1.pdf`).

---

## Anexo C. Invocación de Edge Functions desde el frontend

| Origen | Edge Function | Acción / body |
|--------|----------------|----------------|
| `ContactFormDialog.tsx`, `sections/Contacto.tsx` | `send-contact-form` | `body`: nombre, empresa, email, telefono, tipoSolicitud, tipoEspacio, mensaje. |
| `AccountSetup.tsx` | `admin-users` | `validate-invitation` (token, email); `setup-password` (email, token, newPassword); `update_own_info` (userId, full_name, phone, position, theme_preference). |
| `UserManagement.tsx` | `send-user-invitation` | `body`: email, role, invitedByName; opción `resend: true` para reenviar. |

**Login (`Login.tsx`):** Se usa **fetch** directo a `SUPABASE_URL/functions/v1/...` (no `supabase.functions.invoke`):
- **rate-limit:** POST con `action: 'check'` antes de enviar OTP; POST con `action: 'record'` y `success: true/false` tras intento de login.
- **send-otp:** POST con `{ email }` para recibir el código por correo.
- **verify-otp:** POST con `{ email, code }`; la respuesta indica validez y la sesión se gestiona después con Supabase Auth (signInWithPassword u otro método según implementación).

---

## Anexo D. Uso de Supabase Auth en el frontend

- **getSession / getUser:** NexoAvLayout, NexoAvMobileLayout, Login, AccountSetup, SettingsPage, UserAvatar, UserAvatarDropdown, UserManagement, ProductDetailPage, InvoiceDetailPage, PurchaseInvoiceDetailPage, etc., para comprobar sesión o usuario actual.
- **signInWithPassword:** Login, UserAvatar (cambio de contraseña tras login), AccountSetup (tras setup-password).
- **signOut:** NexoAvLayout, NexoAvMobileLayout, Login, NexoHeader, MobileSettingsPage, useInactivityLogout.
- **onAuthStateChange:** NexoAvLayout, NexoAvMobileLayout (redirección si se pierde sesión).
- **updateUser:** UserAvatar, UserAvatarDropdown (cambio de contraseña), AccountSetup (actualizar metadata pending_setup).
- **refreshSession:** UserManagement (renovar sesión antes de operaciones admin).
