# Arquitectura Completa del Proyecto — NEXO AV + Web Pública AV TECH

> Documento generado el 18 de febrero de 2026  
> Última actualización: 18/02/2026  
> Objetivo: Documentar cada archivo de `src/`, su función, dependencias, comunicación y flujo de datos.

---

## Índice

1. [Visión General](#1--visión-general)
2. [Árbol de Directorios](#2--árbol-de-directorios)
3. [Núcleo de la Aplicación](#3--núcleo-de-la-aplicación)
4. [Integración con Supabase](#4--integración-con-supabase)
5. [Hooks Globales](#5--hooks-globales)
6. [Constantes del Negocio](#6--constantes-del-negocio)
7. [Componentes UI (shadcn/ui)](#7--componentes-ui-shadcnui)
8. [Web Pública (Landing AV TECH)](#8--web-pública-landing-av-tech)
9. [Sistema de Rutas](#9--sistema-de-rutas)
10. [ERP Desktop — Layout y Navegación](#10--erp-desktop--layout-y-navegación)
11. [ERP Desktop — Páginas](#11--erp-desktop--páginas)
12. [ERP Desktop — Componentes](#12--erp-desktop--componentes)
13. [ERP Móvil](#13--erp-móvil)
14. [Módulo AI](#14--módulo-ai)
15. [Recursos Compartidos](#15--recursos-compartidos)
16. [Sistema de Estilos CSS](#16--sistema-de-estilos-css)
17. [Flujos de Datos Principales](#17--flujos-de-datos-principales)
18. [Mapa de RPCs por Módulo](#18--mapa-de-rpcs-por-módulo)

---

## 1 — Visión General

El proyecto contiene **dos aplicaciones** en un mismo repositorio:

1. **Web Pública AV TECH** (`/`) — Landing page corporativa con secciones de productos, proyectos, globo 3D, contacto y presentaciones comerciales.
2. **ERP NEXO AV** (`/nexo-av/...`) — Plataforma interna de gestión empresarial con versión desktop y móvil responsive.

### Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Framework** | React 18 + TypeScript |
| **Build** | Vite 7 |
| **Routing** | react-router-dom v6 |
| **State** | React useState/useEffect (no Redux), @tanstack/react-query (provider presente, uso limitado) |
| **UI** | shadcn/ui (Radix UI + Tailwind CSS), CSS custom con variables |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions - Deno) |
| **PDF** | @react-pdf/renderer (dinámico), jsPDF (server-side) |
| **Excel** | ExcelJS, XLSX |
| **Mapas** | globe.gl (landing), Leaflet (ERP) |
| **Animaciones** | framer-motion |
| **Analytics** | Firebase (solo GA4) |
| **PWA** | vite-plugin-pwa + Workbox |
| **AI** | Ollama (qwen2.5:3b) via worker externo + Edge Functions |

---

## 2 — Árbol de Directorios

```
src/
├── main.tsx                          # Punto de entrada
├── App.tsx                           # Router + Providers
├── App.css                           # (legacy, no usado)
├── index.css                         # Estilos globales + Tailwind
├── firebase.ts                       # Firebase Analytics
├── vite-env.d.ts                     # Tipos Vite + PWA
│
├── assets/                           # Assets web pública
│   ├── catalog/                      # Imágenes catálogo
│   ├── logos/                        # Logos AV TECH
│   └── projects/                     # Imágenes proyectos
│
├── components/                       # Componentes web pública
│   ├── Header.tsx                    # Cabecera landing
│   ├── Hero.tsx                      # Hero con carrusel
│   ├── Footer.tsx                    # Pie de página
│   ├── ContactFormDialog.tsx         # Modal contacto
│   ├── CookieConsent.tsx             # Banner cookies
│   ├── LoadingScreen.tsx             # Pantalla de carga
│   ├── sections/                     # Secciones de la landing
│   │   ├── Alcance.tsx               # Globo 3D
│   │   ├── Contacto.tsx              # Formulario contacto
│   │   ├── Productos.tsx             # Catálogo/packs
│   │   ├── Proyectos.tsx             # Carrusel proyectos
│   │   └── SobreNosotros.tsx         # Sobre nosotros
│   └── ui/                           # ~50 componentes shadcn/ui
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── ...                       # (ver sección 7)
│       └── use-toast.ts
│
├── constants/                        # Constantes del negocio
│   ├── documentImmutabilityRules.ts  # Reglas de bloqueo fiscal
│   ├── easingCurves.ts               # Curvas de animación
│   ├── financeStatuses.ts            # Estados financieros
│   ├── invoiceStatuses.ts            # Estados factura (legacy)
│   ├── projectStatuses.ts            # Estados proyecto
│   ├── purchaseInvoiceCategories.ts  # Categorías compra + PGC
│   ├── purchaseInvoiceStatuses.ts    # Estados factura compra
│   ├── purchaseOrderStatuses.ts      # Estados pedido compra
│   ├── quoteStatuses.ts              # Estados presupuesto
│   ├── salesInvoiceStatuses.ts       # Estados factura venta
│   ├── supplierConstants.ts          # Categorías proveedor
│   ├── technicianConstants.ts        # Tipos/estados técnico
│   └── ticketCategories.ts           # Categorías gastos + PGC
│
├── hooks/                            # Hooks globales
│   ├── useDebounce.ts                # Debounce de valores
│   ├── useDeviceDetection.ts         # Detección dispositivo
│   ├── useInactivityLogout.ts        # Logout por inactividad
│   ├── use-mobile.tsx                # Hook móvil (breakpoint 768px)
│   ├── usePagination.ts              # Paginación client-side
│   ├── usePasswordValidation.ts      # Validación contraseña
│   └── use-toast.ts                  # Sistema de toasts
│
├── integrations/
│   └── supabase/
│       ├── client.ts                 # Cliente Supabase tipado
│       └── types.ts                  # Tipos auto-generados (266 RPCs)
│
├── lib/
│   └── utils.ts                      # cn() = clsx + twMerge
│
├── polyfills/
│   └── buffer.ts                     # Polyfill global para Node
│
└── pages/
    ├── Index.tsx                      # Landing page principal
    ├── NotFound.tsx                   # 404 global
    ├── PrivacyPolicy.tsx              # Política privacidad
    ├── TermsAndConditions.tsx         # Términos y condiciones
    ├── presentations/
    │   └── SharkEventsPresentation.tsx # Presentación comercial
    │
    └── nexo_av/                       # ══════ ERP NEXO AV ══════
        ├── layouts/
        │   └── ResponsiveLayout.tsx   # Elige desktop vs móvil
        ├── components/
        │   ├── ResponsivePage.tsx     # createResponsivePage()
        │   └── projects/
        │       └── EditProjectForm.tsx # Formulario compartido
        ├── assets/
        │   ├── components/
        │   │   └── ActivityTimeline.tsx # Timeline de actividad
        │   ├── logos/                  # Logos NEXO AV (SVG)
        │   └── plantillas/            # Plantillas PDF
        │       ├── index.ts           # Re-exporta PDFs
        │       ├── InvoicePDFDocument.tsx
        │       └── QuotePDFDocument.tsx
        ├── utils/
        │   ├── archiveDocument.ts     # Archivado PDF → MinIO
        │   └── parseDecimalInput.ts   # Parser numérico
        │
        ├── desktop/                   # ── ERP DESKTOP ──
        │   ├── layouts/
        │   │   └── NexoAvLayout.tsx   # Layout principal desktop
        │   ├── hooks/
        │   │   ├── useNexoAvTheme.ts
        │   │   └── useNexoAvThemeMode.ts
        │   ├── pages/                 # ~50 páginas
        │   │   ├── Dashboard.tsx
        │   │   ├── Login.tsx
        │   │   ├── InvoicesPage.tsx
        │   │   ├── InvoiceDetailPage.tsx
        │   │   ├── ...               # (ver sección 11)
        │   │   └── NotFound.tsx
        │   ├── components/            # ~100+ componentes
        │   │   ├── common/            # Reutilizables
        │   │   ├── accounting/        # Contabilidad
        │   │   ├── catalog/           # Catálogo
        │   │   ├── clients/           # Clientes
        │   │   ├── dashboard/         # Dashboard + widgets
        │   │   ├── detail/            # Info blocks
        │   │   ├── developer/         # Herramientas dev
        │   │   ├── documents/         # Editor de líneas
        │   │   ├── invoices/          # Facturas venta
        │   │   ├── layout/            # Sidebar, Header
        │   │   ├── leadmap/           # Mapa de leads
        │   │   ├── map/               # Mapa proyectos
        │   │   ├── navigation/        # TabNav, DetailBar
        │   │   ├── projects/          # Proyecto detail
        │   │   ├── purchases/         # Compras
        │   │   ├── quotes/            # Presupuestos
        │   │   ├── rrhh/              # RRHH/Socios
        │   │   ├── settings/          # Configuración
        │   │   ├── suppliers/         # Proveedores
        │   │   ├── technicians/       # Técnicos
        │   │   └── users/             # Gestión usuarios
        │   └── styles/                # CSS modular
        │       ├── base/              # Variables, tipografía
        │       ├── components/        # CSS por componente
        │       └── global.css         # Entry point CSS
        │
        ├── mobile/                    # ── ERP MÓVIL ──
        │   ├── layouts/
        │   │   └── NexoAvMobileLayout.tsx
        │   ├── hooks/
        │   │   └── useNexoAvTheme.ts
        │   ├── components/
        │   │   ├── common/
        │   │   ├── layout/
        │   │   ├── projects/
        │   │   └── MobileDocumentScanner.tsx
        │   ├── pages/                 # ~25 páginas móvil
        │   │   ├── MobileDashboard.tsx
        │   │   ├── MobileProjectsPage.tsx
        │   │   ├── ...               # (ver sección 13)
        │   │   └── MobileNotFound.tsx
        │   └── styles/
        │
        └── ai/                        # ── MÓDULO AI ──
            ├── desktop/
            │   ├── AIChatPage.tsx      # Página principal chat
            │   └── components/
            │       ├── ChatPanel.tsx
            │       ├── ConversationList.tsx
            │       ├── MessageBubble.tsx
            │       ├── ModeSelector.tsx
            │       ├── NewConversationDialog.tsx
            │       └── GroupAgentSettingsDialog.tsx
            ├── logic/
            │   ├── aiProxy.ts          # Cliente Edge Function AI
            │   ├── constants.ts        # Modos AI
            │   ├── types.ts            # Tipos AI
            │   └── hooks/
            │       ├── useConversations.ts
            │       ├── useMessages.ts
            │       ├── useSendMessage.ts
            │       ├── useRequestStatus.ts
            │       └── useGroupAgentSettings.ts
            └── docs/
                ├── api-reference.md
                └── architecture.md
```

---

## 3 — Núcleo de la Aplicación

### `src/main.tsx` — Punto de entrada

```
Buffer polyfill → Firebase init → createRoot → <App />
Importa: index.css, firebase.ts, polyfills/buffer.ts, App.tsx
Registra: Service Worker (PWA via virtual:pwa-register)
```

Establece `window.Buffer` para librerías Node (ExcelJS, @react-pdf/renderer), inicializa Firebase Analytics y monta la app React.

### `src/App.tsx` — Router y Providers

```
QueryClientProvider (@tanstack/react-query)
  └─ TooltipProvider (shadcn)
      └─ Toaster + Sonner (notificaciones)
          └─ BrowserRouter
              └─ Suspense (con PageLoader)
                  └─ Routes (ver sección 9)
```

- Todas las páginas se cargan con `lazy()` (code splitting por ruta).
- Las rutas responsive usan `createResponsivePage(desktopImport, mobileImport)` que elige componente según `useIsMobile()`.
- QueryClient configurado pero la mayoría de fetching se hace con `supabase.rpc()` directo en componentes (no useQuery).

### `src/index.css` — Design System

Define: fuentes (IBM Plex Mono, Roboto), Tailwind (base/components/utilities), variables CSS del tema (colores, radios, sombras, sidebar), utilidades móviles (safe-area, pb-mobile-nav), clases de tipografía y componentes (.nexo-card-mobile, etc.).

### `src/firebase.ts` — Analytics

Inicializa Firebase App y Google Analytics 4. Solo analytics — no usa Firebase Auth ni Firestore.

### `src/lib/utils.ts` — Utilidad CSS

Exporta `cn(...inputs)` = `clsx` + `tailwind-merge`. Usado en prácticamente todos los componentes para combinar clases condicionales.

### `src/polyfills/buffer.ts` — Polyfill Node

Define `window.global = globalThis` para compatibilidad con librerías Node que esperan `global` en el navegador.

---

## 4 — Integración con Supabase

### `src/integrations/supabase/client.ts`

Crea y exporta el cliente Supabase tipado:

```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
})
```

**Usado por:** Prácticamente todo el ERP — cada página y componente que necesita datos importa `supabase` de aquí.

### `src/integrations/supabase/types.ts`

Tipos auto-generados con `supabase gen types`:

- **Schema `public`:** 3 tablas (`minio_files`, `scanned_documents`, `user_roles`)
- **266 funciones RPC** tipadas (catálogo, clientes, proyectos, presupuestos, facturas, contabilidad, nóminas, AI, tareas, etc.)
- **Enums:** `app_role` (admin, comercial, tecnico, manager), `product_type` (product, service)
- **Helpers:** `Tables<T>`, `TablesInsert<T>`, `TablesUpdate<T>`

Los otros schemas (sales, accounting, internal, crm, projects, quotes, catalog, ai, audit) se acceden exclusivamente via RPCs.

---

## 5 — Hooks Globales

| Hook | Archivo | Propósito | Usado en |
|------|---------|-----------|----------|
| `useDebounce` | `hooks/useDebounce.ts` | Retrasa actualización de valor (default 500ms) | Inputs de búsqueda |
| `useDeviceDetection` | `hooks/useDeviceDetection.ts` | Detecta móvil (<550px), tablet, desktop | Layouts alternativos |
| `useIsMobile` | `hooks/use-mobile.tsx` | Detecta móvil (<768px) via matchMedia | **ResponsiveLayout**, **ResponsivePage**, **App.tsx** — central para responsive |
| `useIOS` | `hooks/use-mobile.tsx` | Detecta iOS para safe-area | Layouts móviles |
| `useInactivityLogout` | `hooks/useInactivityLogout.ts` | Cierra sesión tras inactividad (configurable) | **NexoAvLayout**, **NexoAvMobileLayout** |
| `usePagination` | `hooks/usePagination.ts` | Paginación client-side (page, slice, totals) | Listados (clientes, facturas, proyectos) |
| `validatePassword` | `hooks/usePasswordValidation.ts` | Validación OWASP (12+ chars, mayús, minús, num, especial) | AccountSetup, UserManagement |
| `useToast` / `toast` | `hooks/use-toast.ts` | Sistema de notificaciones toast | Toda la app |

**Flujo de comunicación:**
```
useIsMobile() ──→ ResponsiveLayout ──→ NexoAvLayout (desktop) | NexoAvMobileLayout (móvil)
useInactivityLogout() ──→ supabase.auth.signOut() ──→ navigate('/nexo-av')
useToast() ──→ Toaster (en App.tsx) ──→ UI de notificación
```

---

## 6 — Constantes del Negocio

Definen las reglas de negocio que se aplican en frontend, alineadas con triggers y constraints de la BD:

### Inmutabilidad de documentos (`documentImmutabilityRules.ts`)

```
LOCKED_SALES_INVOICE_STATUSES = ['ISSUED', 'PAID', 'PARTIAL', 'CANCELLED']
LOCKED_PURCHASE_INVOICE_STATUSES = ['APPROVED', 'PAID', 'PARTIAL', 'CANCELLED']
LOCKED_PAYROLL_STATUSES = ['POSTED', 'PAID', 'CANCELLED']
LOCKED_QUOTE_STATUSES = ['SENT', 'APPROVED', 'INVOICED']
```

Helpers: `isSalesInvoiceLocked()`, `isPurchaseInvoiceLocked()`, `isDocumentFinanciallyLocked()`.

### Estados de factura de venta (`salesInvoiceStatuses.ts`)

Sistema dual:
- **Doc status:** DRAFT → ISSUED → CANCELLED
- **Payment status:** PENDING → PARTIAL → PAID (calculado automáticamente)
- **Overdue:** calculado por `isOverdue(dueDate, paidAmount, total)`

Helpers: `calculatePaymentStatus()`, `isSalesDocumentEditable()`, `isCollectionEnabled()`.

### Estados de factura de compra (`purchaseInvoiceStatuses.ts`)

- **Doc status:** DRAFT → PENDING_VALIDATION → APPROVED → CANCELLED
- **Payment status:** PENDING → PARTIAL → PAID
- Helpers: `isDocumentEditable()`, `isPaymentsEnabled()`, `isPurchaseOverdue()`.

### Categorías contables

| Archivo | Propósito | Cuentas PGC |
|---------|-----------|-------------|
| `purchaseInvoiceCategories.ts` | Categorías de facturas de compra | 621xxx, 622xxx, 623xxx, 629xxx, etc. |
| `ticketCategories.ts` | Categorías de tickets/gastos | 629001-629008 |

### Estados de presupuesto (`quoteStatuses.ts`)

```
DRAFT → SENT → APPROVED → INVOICED
                   └──→ REJECTED
                   └──→ EXPIRED
```

### Estados de proyecto (`projectStatuses.ts`)

```
NEGOTIATION → PLANNED → IN_PROGRESS → COMPLETED → INVOICED → CLOSED
                                                              └──→ CANCELLED
```

Incluye `markerColorHex` para el mapa.

---

## 7 — Componentes UI (shadcn/ui)

~50 componentes primitivos en `src/components/ui/` basados en Radix UI + Tailwind:

accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip.

Son los building blocks que usan todos los componentes del ERP y la web pública.

---

## 8 — Web Pública (Landing AV TECH)

### Flujo de renderizado

```
Index.tsx
├── LoadingScreen (2.5s animación)
├── Header (navegación por scroll a secciones)
├── Hero (carrusel de imágenes con framer-motion)
├── Alcance (globo 3D con globe.gl)
├── Proyectos (carrusel Embla)
├── Productos (catálogo de packs + ContactFormDialog)
├── SobreNosotros (valores, video, historia)
├── Contacto (formulario + Edge Function send-contact-form)
├── Footer (enlaces, redes, legal)
└── CookieConsent (banner localStorage)
```

### Archivos y comunicación

| Archivo | Función | Dependencias |
|---------|---------|-------------|
| `pages/Index.tsx` | Ensambla todas las secciones | Todos los componentes de sections/ |
| `components/Header.tsx` | Navegación + scroll spy | Solo React + lucide |
| `components/Hero.tsx` | Hero con transición de fondo | framer-motion, assets |
| `components/sections/Alcance.tsx` | Globo 3D interactivo | globe.gl (import dinámico), framer-motion |
| `components/sections/Proyectos.tsx` | Carrusel de proyectos | embla-carousel, shadcn Carousel |
| `components/sections/Productos.tsx` | Catálogo de packs | ContactFormDialog, assets |
| `components/sections/SobreNosotros.tsx` | Historia y valores | framer-motion, assets |
| `components/sections/Contacto.tsx` | Formulario de contacto | supabase.functions.invoke('send-contact-form'), Zod |
| `components/ContactFormDialog.tsx` | Modal de contacto | supabase.functions.invoke('send-contact-form'), Zod |
| `components/Footer.tsx` | Pie de página | react-router-dom Link |
| `components/LoadingScreen.tsx` | Splash screen | framer-motion |
| `components/CookieConsent.tsx` | Banner RGPD | localStorage, framer-motion |
| `pages/PrivacyPolicy.tsx` | Política privacidad | Footer |
| `pages/TermsAndConditions.tsx` | Términos y condiciones | Footer |
| `pages/presentations/SharkEventsPresentation.tsx` | Presentación comercial | framer-motion, EASING_CURVES |

---

## 9 — Sistema de Rutas

### Rutas públicas

| Ruta | Componente | Tipo |
|------|-----------|------|
| `/` | Index | Landing |
| `/privacidad` | PrivacyPolicy | Legal |
| `/terminos` | TermsAndConditions | Legal |
| `/sharkevents` | SharkEventsPresentation | Comercial |
| `/nexo-av` | Login | Auth |
| `/nexo-av/setup-account` | AccountSetup | Auth |
| `*` | NotFound | 404 |

### Rutas ERP (`/nexo-av/:userId/...`)

Todas bajo `ResponsiveLayout` → elige `NexoAvLayout` (desktop) o `NexoAvMobileLayout` (móvil).

| Ruta | Desktop | Móvil | Módulo |
|------|---------|-------|--------|
| `dashboard` | Dashboard | MobileDashboard | Dashboard |
| `projects` | ProjectsPage | MobileProjectsPage | Proyectos |
| `projects/new` | — | MobileNewProjectPage | Proyectos |
| `projects/:projectId` | ProjectDetailPage | MobileProjectDetailPage | Proyectos |
| `clients` | ClientsPage | MobileClientsPage | CRM |
| `clients/new` | — | MobileNewClientPage | CRM |
| `clients/:clientId` | ClientDetailPage | MobileClientDetailPage | CRM |
| `clients/:clientId/edit` | EditClientRedirectPage | MobileEditClientPage | CRM |
| `quotes` | QuotesPage | MobileQuotesPage | Ventas |
| `quotes/new` | NewQuotePage | MobileNewQuotePage | Ventas |
| `quotes/:quoteId` | QuoteDetailPage | MobileQuoteDetailPage | Ventas |
| `quotes/:quoteId/edit` | EditQuotePage | MobileEditQuotePage | Ventas |
| `invoices` | InvoicesPage | MobileInvoicesPage | Ventas |
| `invoices/new` | NewInvoicePage | — | Ventas |
| `invoices/:invoiceId` | InvoiceDetailPage | MobileInvoiceDetailPage | Ventas |
| `invoices/:invoiceId/edit` | EditInvoicePage | — | Ventas |
| `purchase-invoices` | PurchaseInvoicesPage | MobilePurchaseInvoicesPage | Compras |
| `purchase-invoices/new` | NewPurchaseInvoicePage | — | Compras |
| `purchase-invoices/:invoiceId` | PurchaseInvoiceDetailPage | MobilePurchaseInvoiceDetailPage | Compras |
| `purchase-orders` | PurchaseOrdersPage | — | Compras |
| `purchase-orders/new` | NewPurchaseOrderPage | — | Compras |
| `purchase-orders/:orderId` | PurchaseOrderDetailPage | — | Compras |
| `expenses` | ExpensesPage | MobileExpensesPage | Gastos |
| `expenses/new` | NewPurchaseInvoicePage | — | Gastos |
| `expenses/:invoiceId` | ExpenseDetailPage | MobileExpenseDetailPage | Gastos |
| `technicians` | TechniciansPage | MobileTechniciansPage | RRHH |
| `technicians/:technicianId` | TechnicianDetailPage | MobileTechnicianDetailPage | RRHH |
| `suppliers` | SuppliersPage | MobileSuppliersPage | Compras |
| `suppliers/:supplierId` | SupplierDetailPage | MobileSupplierDetailPage | Compras |
| `scanner` | ScannerPage | MobileScannerPage | Docs |
| `scanner/:documentId` | ScannerDetailPage | MobileScannerDetailPage | Docs |
| `catalog` | CatalogPage | — | Catálogo |
| `catalog/:productId` | ProductDetailPage | — | Catálogo |
| `mapa` | MapPage | — | CRM |
| `accounting` | AccountingPage | — | Contabilidad |
| `reports` | ReportsPage | — | Informes |
| `settings` | SettingsPage | MobileSettingsPage | Config |
| `settings/taxes/:taxId` | TaxDetailPage | — | Config |
| `users` | UsersPage | — | Admin |
| `audit` | AuditPage | — | Auditoría |
| `audit/suggestions` | SuggestionsPage | — | Auditoría |
| `audit/:eventId` | AuditEventDetailPage | — | Auditoría |
| `partners` | PartnersPage | — | RRHH |
| `partners/:partnerId` | PartnerDetailPage | — | RRHH |
| `workers` | WorkersPage | — | RRHH |
| `workers/:workerId` | WorkerDetailPage | — | RRHH |
| `calculator` | CalculatorPage | — | Herramientas |
| `developer` | DeveloperPage | — | Dev |
| `reimbursements` | PendingReimbursementsPage | — | Contabilidad |
| `ai/chat` | AIChatPage | — | AI |

---

## 10 — ERP Desktop — Layout y Navegación

### `NexoAvLayout.tsx` — Layout principal

```
┌─────────────────────────────────────────────────┐
│ HEADER: PlatformBrand | RoleSimulator | UserInfo │
├──────────┬──────────────────────────────────────┤
│ SIDEBAR  │         <Outlet />                    │
│          │    (contenido de cada página)          │
│ Dashboard│                                       │
│ AI Chat  │                                       │
│ ──────── │                                       │
│ VENTAS   │                                       │
│  Presupu │                                       │
│  Facturas│                                       │
│ COMPRAS  │                                       │
│  F.Compra│                                       │
│  Pedidos │                                       │
│  Gastos  │                                       │
│ RRHH     │                                       │
│ ──────── │                                       │
│ Proyectos│                                       │
│ Clientes │                                       │
│ Mapa     │                                       │
│ Catálogo │                                       │
│ ...      │                                       │
└──────────┴──────────────────────────────────────┘
```

**Flujo de arranque:**
1. Verifica sesión Supabase (`supabase.auth.getSession()`)
2. Obtiene info usuario (`get_current_user_info` RPC)
3. Construye `modules[]` con rutas y permisos por rol
4. Aplica tema (`useNexoAvTheme`)
5. Activa logout por inactividad (`useInactivityLogout`)
6. Renderiza Header + Sidebar + Outlet

### `Sidebar.tsx` — Navegación lateral

Recibe `modules`, `userId` y `userRole` del layout. Agrupa módulos en carpetas (Ventas, Compras, RRHH, Auditoría) y módulos individuales. Muestra/oculta según `available` (permisos por rol). Usa `useNavigate()` y `useLocation()` para resaltar activo.

### `TabNav.tsx` — Pestañas reutilizables

Componente de pestañas con icono opcional. Usado en páginas con múltiples secciones:
- InvoiceDetailPage (Detalle | Pagos | PDF)
- ProjectDetailPage (Resumen | Presupuestos | Facturas | Compras | Sites | Planning)
- AccountingPage (Libro diario | Plan cuentas | Tesorería | Impuestos | Nóminas | Socios)
- SettingsPage (Empresa | Preferencias | Plantillas | Impuestos | Categorías | Nóminas)
- CatalogPage (Productos | Packs)

---

## 11 — ERP Desktop — Páginas

### Módulo de Ventas

| Página | RPCs principales | Componentes clave |
|--------|-----------------|-------------------|
| **InvoicesPage** | `finance_list_invoices` | DataList, SearchBar, PaginationControls |
| **InvoiceDetailPage** | `finance_get_invoice`, `finance_get_invoice_lines`, `get_client`, `finance_issue_invoice`, `finance_cancel_invoice` | TabNav, DetailInfoBlock, StatusSelector, DocumentPDFViewer, ArchivedPDFViewer, PaymentsTab, LockedIndicator |
| **EditInvoicePage** | `finance_get_invoice`, `finance_get_invoice_lines`, `update_invoice`, `add_invoice_line`, `delete_invoice_line` | DocumentLinesEditor, ClientProjectSelector |
| **NewInvoicePage** | `create_invoice_with_number`, `add_invoice_line`, `list_project_sites` | DetailNavigationBar, formulario |
| **QuotesPage** | `list_quotes` | DataList, SearchBar |
| **QuoteDetailPage** | `get_quote`, `get_quote_lines`, `update_quote`, `create_invoice_from_quote` | TabNav, StatusSelector, DocumentPDFViewer, ArchivedPDFViewer, ActivityTimeline |
| **EditQuotePage** | `get_quote`, `get_quote_lines`, `auto_save_quote_line`, `update_quote_lines_order` | ProductSearchInput, tabla de líneas |
| **NewQuotePage** | `create_quote_with_number`, `add_quote_line` | ProductSearchInput, ClientProjectSelector |

### Módulo de Compras

| Página | RPCs principales | Componentes clave |
|--------|-----------------|-------------------|
| **PurchaseInvoicesPage** | `list_purchase_invoices`, `create_purchase_invoice`, `delete_purchase_invoice` | DataList, DocumentScanner |
| **PurchaseInvoiceDetailPage** | `get_purchase_invoice`, `get_purchase_invoice_lines`, `approve_purchase_invoice` | SupplierSearchInput, ArchivedPDFViewer, PurchaseInvoicePaymentsSection |
| **NewPurchaseInvoicePage** | `create_purchase_invoice`, `add_purchase_invoice_line` | PurchaseInvoiceLinesEditor |
| **ExpensesPage** | `list_purchase_invoices` (filtered), `get_next_ticket_number` | DataList |
| **ExpenseDetailPage** | (misma lógica que PurchaseInvoiceDetail para tipo gasto) | — |
| **PurchaseOrdersPage** | `list_purchase_orders` | DataList |
| **PurchaseOrderDetailPage** | `get_purchase_order`, `approve_purchase_order` | PurchaseOrderLinesEditor |

### Módulo de Proyectos / CRM

| Página | RPCs principales | Componentes clave |
|--------|-----------------|-------------------|
| **ProjectsPage** | `list_projects`, `get_project_financial_stats` | DataList, grid |
| **ProjectDetailPage** | `get_project`, `list_quotes`, `finance_list_invoices`, `list_purchase_invoices`, `update_project` | TabNav, ProjectSitesTab, ProjectPlanningTab, ProjectTechniciansTab, ProjectHistoryTab, ActivityTimeline |
| **ClientsPage** | `list_clients`, `get_current_user_info` | DataList, CreateClientDialog |
| **ClientDetailPage** | `get_client`, `list_quotes`, `finance_list_invoices` | ClientDashboardTab, ClientProjectsTab, ClientQuotesTab, ClientInvoicesTab |
| **MapPage** | `list_projects`, `list_clients_for_map`, `list_technicians_for_map` | MapWithMarkers (Leaflet), LeadMap |

### Módulo de Contabilidad

| Página | RPCs principales | Componentes clave |
|--------|-----------------|-------------------|
| **AccountingPage** | `list_journal_entries`, `list_chart_of_accounts`, `get_balance_sheet`, `get_profit_loss`, `get_vat_summary`, `get_irpf_summary`, `get_corporate_tax_summary`, `list_bank_accounts_with_balances`, `open_period`, `close_period` | TabNav, ChartOfAccountsTab, JournalEntryRow, CashMovementsTable, BankDetailView, TaxPaymentDialog, CreatePayrollDialog, CreatePartnerCompensationDialog |
| **ReportsPage** | `get_fiscal_quarter_data` | Explorador por trimestre, export XLSX |

### Módulo de RRHH

| Página | RPCs principales |
|--------|-----------------|
| **TechniciansPage** | `list_technicians` |
| **TechnicianDetailPage** | (datos por RPC o props) |
| **SuppliersPage** | `list_suppliers` |
| **SupplierDetailPage** | `get_supplier`, `get_provider_purchase_invoices` |
| **PartnersPage** | `list_partners`, `list_partner_compensation_runs` |
| **PartnerDetailPage** | `post_partner_compensation_run` |
| **WorkersPage** | `list_workers` |
| **WorkerDetailPage** | `list_payroll_runs` |

### Módulo Admin / Config

| Página | RPCs principales |
|--------|-----------------|
| **SettingsPage** | `get_current_user_info`, `get_company_settings`, `get_company_preferences` |
| **UsersPage** | Edge Function `admin-users` |
| **AuditPage** | `audit_get_stats`, `audit_list_events` |
| **DeveloperPage** | Showcase de componentes, BatchArchiver |
| **CatalogPage** | ProductsTab, PacksTab (RPCs de catálogo) |

---

## 12 — ERP Desktop — Componentes

### Componentes reutilizables (`common/`)

| Componente | Propósito | Comunicación |
|-----------|-----------|-------------|
| **DataList** | Tabla genérica con columnas, sort, acciones, footer | Recibe `data`, `columns`, `onItemClick`, `onSort` |
| **SearchBar** | Búsqueda local con dropdown de resultados | Recibe `items`, `getSearchText`, `onSelectResult` |
| **PaginationControls** | Navegación de páginas | Recibe de `usePagination()` |
| **FormDialog** | Modal de formulario con campos configurables | Recibe `fields`/`sections`, `onSubmit` |
| **ConfirmActionDialog** | Diálogo de confirmación con presets | Recibe `actionType`, `onConfirm` |
| **StatusSelector** | Dropdown de cambio de estado | Recibe `statusOptions`, `onStatusChange` |
| **PaymentsTab** | Pestaña de pagos genérica | Recibe RPCs por props (`fetchPaymentsRpc`, `deletePaymentRpc`) |
| **DocumentPDFViewer** | Preview PDF dinámico (@react-pdf) | Recibe `document` (ReactElement) |
| **ArchivedPDFViewer** | Muestra PDF archivado desde MinIO | Recibe `storageKey`, llama Edge Function `minio-proxy` |
| **ProductSearchInput** | Búsqueda de catálogo con dropdown | RPC `list_catalog_products_search`, callback `onSelectItem` |
| **LockedIndicator** | Badge "Bloqueado" | Recibe `isLocked` |
| **UserAvatar** | Avatar con menú (perfil, tema, logout) | Llama `supabase.auth`, Edge Function `admin-users` |
| **PlatformBrand** | Logo NEXO AV clicable | Navega a dashboard |
| **RoleSimulator** | Selector de rol para testing | Callback `onRoleChange` |

### Componentes de navegación (`navigation/`)

| Componente | Propósito |
|-----------|-----------|
| **DetailNavigationBar** | Barra con botón atrás, título y acciones |
| **DetailActionButton** | Botón de acción (primary, secondary, destructive) |
| **TabNav** | Pestañas con iconos |

### Componentes de detalle (`detail/`)

| Componente | Propósito |
|-----------|-----------|
| **DetailInfoHeader** | Cabecera con título y estado |
| **DetailInfoBlock** | Bloque de información key-value |
| **DetailInfoSummary** | Resumen financiero |
| **MetricCard** | Tarjeta con KPI |

### Componentes de dashboard (`dashboard/`)

```
DashboardView
├── AdminDashboard (admin)
│   ├── RevenueChart, CashFlowChart, ProfitMarginWidget
│   ├── InvoicesReceivableWidget, InvoicesPayableWidget
│   ├── ProjectsWidget, QuotesWidget, TaxSummaryWidget
│   ├── NotificationsWidget, TasksWidget
│   └── DashboardListsWidget
├── ManagerDashboard (manager)
├── CommercialDashboard (comercial)
└── TechnicianDashboard (tecnico)
```

Cada dashboard llama RPCs específicas (dashboard KPIs, revenue, invoices, projects, tasks, notifications).

### Componentes especializados por módulo

| Directorio | Componentes principales | RPCs |
|-----------|------------------------|------|
| `accounting/` | ChartOfAccountsTab, BankDetailView, CashMovementsTable, JournalEntryRow, TaxPaymentDialog, BankTransferDialog, CreatePayrollDialog, CreatePartnerCompensationDialog | list_chart_of_accounts, list_journal_entries, list_bank_accounts_with_balances, create_tax_payment, create_bank_transfer, etc. |
| `catalog/` | ProductsTab, PacksTab, ProductImportDialog | list_catalog_products_search, update_catalog_product, delete_product_pack |
| `clients/` | CreateClientDialog, EditClientDialog, ClientDashboardTab, ClientProjectsTab, ClientQuotesTab, ClientInvoicesTab | create_client, update_client, list_projects, list_quotes |
| `documents/` | DocumentLinesEditor, ClientProjectSelector, DocumentTotals | list_clients, list_projects |
| `invoices/` | RegisterPaymentDialog, InvoicePaymentsSection, PendingReviewSection | finance_register_payment, finance_get_invoice_payments |
| `purchases/` | PurchaseInvoiceLinesEditor, PurchaseInvoicePaymentsSection, RegisterPurchasePaymentDialog, ConvertPOToInvoiceDialog | add/update/delete purchase lines, register_purchase_payment |
| `projects/` | ProjectSitesTab, ProjectPlanningTab, ProjectTechniciansTab, ProjectHistoryTab, ProjectQuotesList, ProjectInvoicesList, ProjectPurchasesList, CreateProjectDialog, EditProjectDialog, ProjectSearchInput | update_project, list_project_sites, create_project_site |
| `leadmap/` | LeadMap, CanvassingMapSidebar, CanvassingTool | RPCs de canvassing |
| `settings/` | CompanyDataTab, PreferencesTab, TaxesTab, ProductCategoriesTab, PayrollSettingsTab, ExternalCreditProvidersTab, TemplatesTab | get/update company settings/preferences |
| `rrhh/` | CreatePartnerPayrollDialog, RegisterPartnerPayrollPaymentDialog, PartnerCard | post_partner_compensation_run, create_payroll_payment |
| `developer/` | BatchArchiver | backfill_list_invoices_to_migrate, minio-proxy |

---

## 13 — ERP Móvil

### Layout (`NexoAvMobileLayout.tsx`)

```
┌────────────────────────────┐
│ MobileHeader               │
│ (logo, título, notif, user)│
├────────────────────────────┤
│                            │
│       <Outlet />           │
│  (contenido de la página)  │
│                            │
├────────────────────────────┤
│ BottomNavigation           │
│ Proyectos|Clientes|Scanner │
│   |Presupuestos|Más        │
└────────────────────────────┘
```

Mismo flujo de arranque que desktop: sesión → usuario → tema → inactivity logout.

### Páginas móvil

| Página | Equivalente desktop |
|--------|-------------------|
| MobileDashboard | Dashboard |
| MobileProjectsPage | ProjectsPage |
| MobileProjectDetailPage | ProjectDetailPage (incluye MobilePlanningTab, MobileSitesTab) |
| MobileClientsPage | ClientsPage |
| MobileClientDetailPage | ClientDetailPage |
| MobileQuotesPage | QuotesPage |
| MobileQuoteDetailPage | QuoteDetailPage |
| MobileEditQuotePage | EditQuotePage |
| MobileInvoicesPage | InvoicesPage |
| MobileInvoiceDetailPage | InvoiceDetailPage |
| MobilePurchaseInvoicesPage | PurchaseInvoicesPage |
| MobilePurchaseInvoiceDetailPage | PurchaseInvoiceDetailPage |
| MobileExpensesPage | ExpensesPage |
| MobileExpenseDetailPage | ExpenseDetailPage |
| MobileTechniciansPage | TechniciansPage |
| MobileSuppliersPage | SuppliersPage |
| MobileScannerPage/Detail | ScannerPage/Detail |
| MobileSettingsPage | SettingsPage |

### Componentes compartidos desktop ↔ móvil

- `EditProjectForm` — Usado en desktop (diálogo) y móvil (sheet)
- `ActivityTimeline` — Usado en ambas versiones de detalle
- `archiveDocument.ts` — Archivado a MinIO desde ambas versiones
- `parseDecimalInput.ts` — Parser numérico compartido
- Plantillas PDF (`InvoicePDFDocument`, `QuotePDFDocument`) — Compartidas

---

## 14 — Módulo AI

### Arquitectura

```
AIChatPage.tsx (orquestador)
├── ConversationList (lista conversaciones)
│   └── NewConversationDialog
├── ChatPanel (área de mensajes)
│   ├── ModeSelector (departamento)
│   └── MessageBubble[] (mensajes)
├── GroupAgentSettingsDialog (config admin)
│
├── Hooks (logic/hooks/)
│   ├── useConversations → RPCs: ai_list_conversations, ai_list_department_conversations
│   ├── useMessages → RPC: ai_list_messages (o similar)
│   ├── useSendMessage → RPCs: ai_add_user_message, ai_create_chat_request
│   ├── useRequestStatus → Polling de estado (queued/processing/done/error)
│   └── useGroupAgentSettings → aiProxy (Edge Function ai-settings-proxy)
│
└── aiProxy.ts → fetch a /functions/v1/ai-settings-proxy (JWT)
```

### Flujo de mensaje

1. Usuario escribe mensaje → `useSendMessage.send()`
2. `ai_add_user_message` RPC guarda en BD
3. `ai_create_chat_request` RPC crea request con processor `alb357`
4. Worker externo (Docker, Ollama qwen2.5:3b) procesa la cola
5. `useRequestStatus` hace polling hasta `done` o `error`
6. `useMessages` recarga para mostrar respuesta

### Modos de conversación

- `general` — Sin scope específico
- `administration`, `commercial`, `marketing`, `programming` — Por departamento

---

## 15 — Recursos Compartidos

### `archiveDocument.ts` — Archivado inmutable

```
ReactElement (PDF) → @react-pdf/renderer.pdf() → base64 → Edge Function minio-proxy
                                                            (action: archive_document)
                                                            → MinIO bucket → storage_key en DB
```

Usado cuando un documento se emite/envía para crear una copia inmutable del PDF.

### `parseDecimalInput.ts` — Parser numérico

Acepta "." y "," como separador decimal. Funciones: `parseDecimalInput()`, `normalizeDecimalString()`.

### Plantillas PDF

- **InvoicePDFDocument** — Factura con logo, datos empresa, cliente, líneas, IVA, totales, condiciones de pago.
- **QuotePDFDocument** — Presupuesto con estructura similar, validez y condiciones.

Ambas se usan con `@react-pdf/renderer` para vista previa (DocumentPDFViewer) y para archivado (archiveDocument).

### `ResponsivePage.tsx` y `ResponsiveLayout.tsx`

```
createResponsivePage(desktopImport, mobileImport) → lazy(() => {
  if (useIsMobile()) return mobileImport()
  else return desktopImport()
})

ResponsiveLayout → lazy(() => {
  if (useIsMobile()) return NexoAvMobileLayout
  else return NexoAvLayout
})
```

Patrón central para toda la estrategia responsive del ERP.

---

## 16 — Sistema de Estilos CSS

### Estructura

```
src/index.css                              # Tailwind + variables globales
src/pages/nexo_av/desktop/styles/
├── global.css                             # Entry point desktop (importa todo)
├── base/
│   ├── variables.css                      # Variables CSS del tema
│   └── typography.css                     # Tipografía
└── components/
    ├── index.css                          # Importa todos los componentes
    ├── common/                            # data-list, form-dialog, status-*, etc.
    ├── cards/card.css
    ├── dashboard/                         # detail-dashboard-*.css
    ├── detail/                            # detail-info-*.css, metric-card.css
    ├── documents/document-editor.css
    ├── KPIs/kpi-cards.css
    ├── layout/                            # header.css, sidebar.css
    ├── navigation/                        # tab-nav.css, detail-*-bar.css
    ├── pages/detail-pages.css
    ├── payments/payments-tab.css
    ├── projects/project-items-list.css
    ├── tables/table.css
    └── tabs.css

src/pages/nexo_av/mobile/styles/
├── global.css
├── base/
│   ├── variables.css
│   └── typography.css
└── components/
    ├── index.css
    └── layout/bottom-navigation.css
```

### Estrategia

- **Tailwind CSS** para utilidades rápidas
- **CSS custom con variables** para el design system NEXO AV (colores, radios, sombras, tipografía)
- **CSS modular por componente** (BEM-like) para componentes complejos del ERP
- **Tema claro/oscuro** via clases en `body` (`nexo-av-theme`, `nexo-av-theme-dark`)
- Variables heredadas del `index.css` global (`:root` y `.dark`)

---

## 17 — Flujos de Datos Principales

### Flujo: Presupuesto → Factura → Cobro → Archivo

```
NewQuotePage
  └── create_quote_with_number (RPC)
  └── add_quote_line (RPC) × N
      ↓
QuoteDetailPage
  └── update_quote (status: SENT) → trigger genera número definitivo
  └── archiveDocument() → MinIO (storage_key)
      ↓
  └── create_invoice_from_quote (RPC) → genera factura DRAFT
      ↓
InvoiceDetailPage
  └── finance_issue_invoice (RPC) → status: ISSUED
      → trigger: auto_create_invoice_sale_entry (asiento contable)
      → trigger: lock_invoice_on_issue (inmutabilidad)
      → archiveDocument() → MinIO
      ↓
  └── PaymentsTab → RegisterPaymentDialog
      → finance_register_payment (RPC)
      → trigger: recalculate_paid_amount
      → trigger: auto_create_payment_entry (asiento de cobro)
      → si paid_amount >= total → status: PAID
```

### Flujo: Factura de compra → Pago → Contabilidad

```
PurchaseInvoicesPage / ScannerDetailPage
  └── create_purchase_invoice (RPC) → DRAFT
  └── add_purchase_invoice_line (RPC) × N
      ↓
PurchaseInvoiceDetailPage
  └── approve_purchase_invoice (RPC) → APPROVED
      → trigger: auto_create_invoice_purchase_entry (asiento)
      → trigger: stock_movement (si tiene producto)
      ↓
  └── RegisterPurchasePaymentDialog
      → register_purchase_payment (RPC)
      → trigger: recalculate_purchase_paid
      → trigger: auto_create_purchase_payment_entry (asiento)
```

### Flujo: Login → Dashboard

```
Login.tsx
  └── supabase.auth.signInWithPassword()
  └── (opcionalmente) send-otp Edge Function → verify OTP
  └── navigate('/nexo-av/:userId/dashboard')
      ↓
ResponsiveLayout
  └── useIsMobile() → NexoAvLayout | NexoAvMobileLayout
      └── supabase.auth.getSession() → verificar sesión
      └── get_current_user_info (RPC) → rol, permisos
      └── useInactivityLogout(60min)
      └── Sidebar (desktop) | BottomNavigation (móvil)
      └── <Outlet /> → Dashboard
          └── DashboardView → por rol (Admin/Manager/Commercial/Technician)
              └── Widgets con RPCs (revenue, invoices, projects, tasks...)
```

### Flujo: Archivado fiscal (MinIO)

```
Documento emitido (factura, presupuesto, compra)
  └── archiveDocument(reactPdfElement, storageKey, sourceTable, sourceId)
      └── @react-pdf/renderer.pdf().toBlob() → base64
      └── supabase.functions.invoke('minio-proxy', {
            action: 'archive_document',
            key: 'fiscal/ventas/2026/T1/F-26-000001.pdf',
            content_base64: '...',
            source_table: 'sales.invoices',
            source_id: 'uuid'
          })
      └── Edge Function → MinIO PUT → minio_files INSERT → storage_key UPDATE
```

---

## 18 — Mapa de RPCs por Módulo

### Autenticación y Usuario
`get_current_user_info`

### Ventas (Presupuestos)
`list_quotes`, `get_quote`, `get_quote_lines`, `create_quote_with_number`, `update_quote`, `add_quote_line`, `update_quote_line`, `delete_quote_line`, `update_quote_lines_order`, `auto_save_quote_line`, `create_invoice_from_quote`

### Ventas (Facturas)
`finance_list_invoices`, `finance_get_invoice`, `finance_get_invoice_lines`, `create_invoice_with_number`, `update_invoice`, `finance_update_invoice`, `finance_issue_invoice`, `finance_cancel_invoice`, `add_invoice_line`, `update_invoice_line`, `finance_delete_invoice_line`, `finance_get_invoice_payments`, `finance_register_payment`, `finance_delete_payment`

### Compras (Facturas)
`list_purchase_invoices`, `get_purchase_invoice`, `get_purchase_invoice_lines`, `create_purchase_invoice`, `update_purchase_invoice`, `approve_purchase_invoice`, `delete_purchase_invoice`, `add_purchase_invoice_line`, `update_purchase_invoice_line`, `delete_purchase_invoice_line`, `get_next_provisional_purchase_number`, `get_next_ticket_number`, `get_next_factura_borr_number`, `register_purchase_payment`

### Compras (Pedidos)
`list_purchase_orders`, `get_purchase_order`, `create_purchase_order`, `update_purchase_order`, `approve_purchase_order`, `delete_purchase_order`

### Proyectos
`list_projects`, `get_project`, `create_project`, `update_project`, `get_project_financial_stats`, `list_project_sites`, `create_project_site`, `update_project_site`, `delete_project_site`

### CRM (Clientes)
`list_clients`, `get_client`, `create_client`, `update_client`, `list_clients_for_map`

### Catálogo
`list_catalog_products_search`, `update_catalog_product`, `list_catalog_tax_rates`, `delete_product_pack`, `update_product_pack`

### Contabilidad
`list_journal_entries`, `list_chart_of_accounts`, `get_balance_sheet`, `get_profit_loss`, `get_vat_summary`, `get_irpf_summary`, `get_corporate_tax_summary`, `get_irpf_by_period`, `get_irpf_by_person`, `get_irpf_model_111_summary`, `list_bank_accounts_with_balances`, `create_bank_transfer`, `create_tax_payment`, `open_period`, `close_period`, `list_periods_for_closure`, `get_client_balances`, `get_supplier_technician_balances`

### RRHH / Nóminas
`list_technicians`, `create_technician`, `update_technician`, `delete_technician`, `list_technicians_for_map`, `list_suppliers`, `get_supplier`, `create_supplier`, `update_supplier`, `list_partners`, `list_workers`, `list_payroll_runs`, `list_partner_compensation_runs`, `post_payroll_run`, `post_partner_compensation_run`, `create_payroll_payment`, `list_payroll_payments`, `get_payroll_settings`

### Tareas
`tasks_list_for_user`, `tasks_create`, `tasks_get`, `tasks_set_status`, `tasks_get_assignees`, `tasks_get_activity`, `tasks_add_comment`

### Notificaciones
`notifications_count_unread`, `notifications_list`, `notifications_mark_read`, `notifications_mark_all_read`

### Auditoría
`audit_get_stats`, `audit_list_events`

### AI
`ai_list_conversations`, `ai_list_department_conversations`, `ai_add_user_message`, `ai_create_chat_request`, `ai_delete_conversation`

### Empresa / Config
`get_company_settings`, `get_company_preferences`, `upsert_company_preferences`, `list_taxes`, `update_tax`, `delete_tax`

### Informes / Archivado
`get_fiscal_quarter_data`, `backfill_list_invoices_to_migrate`, `backfill_list_quotes_to_migrate`, `backfill_list_purchase_invoices_to_migrate`

### Reembolsos
`list_pending_reimbursements`, `reimburse_personal_purchase`

### Edge Functions (no RPC)
- `send-contact-form` — Formulario de contacto web pública
- `minio-proxy` — Archivado fiscal (archive_document, get_presigned_url_by_key)
- `admin-users` — Gestión de usuarios (crear, actualizar, roles)
- `send-otp` — Envío de código OTP
- `send-user-invitation` — Invitaciones
- `rate-limit` — Control de intentos de login
- `ai-settings-proxy` — Configuración AI
- `ai-chat-processor` — Procesador de chat (template v1)
- `monthly-report-worker` — Generación de informes mensuales
- `storage-health` — Health check de MinIO

---

> **Fin del documento de arquitectura**  
> Total de archivos documentados: ~300+  
> Generado el 18 de febrero de 2026
