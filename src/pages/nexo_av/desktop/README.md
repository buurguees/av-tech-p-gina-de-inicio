# NEXO AV - Desktop Version

Estructura organizada de la versión desktop de la plataforma NEXO AV.

## 📁 Estructura de Carpetas

### `components/`
Componentes organizados por módulo funcional:

#### **accounting/** - Contabilidad
- `CreatePartnerCompensationDialog.tsx` - Diálogo para crear compensaciones de socios
- `CreatePayrollDialog.tsx` - Diálogo para crear nóminas
- `CreatePayrollPaymentDialog.tsx` - Diálogo para registrar pagos de nóminas

#### **catalog/** - Catálogo de productos
- `PacksTab.tsx` - Pestaña de packs de productos
- `ProductImportDialog.tsx` - Diálogo para importar productos
- `ProductsTab.tsx` - Pestaña de productos

#### **clients/** - Gestión de clientes
- `ClientDashboardTab.tsx` - Dashboard del cliente
- `ClientInvoicesTab.tsx` - Pestaña de facturas del cliente
- `ClientProjectsTab.tsx` - Pestaña de proyectos del cliente
- `ClientQuotesTab.tsx` - Pestaña de presupuestos del cliente
- `CreateClientDialog.tsx` - Diálogo para crear clientes
- `EditClientDialog.tsx` - Diálogo para editar clientes

#### **common/** - Componentes comunes reutilizables
- `DocumentScanner.tsx` - Escáner de documentos
- `PaginationControls.tsx` - Controles de paginación
- `ProductSearchInput.tsx` - Buscador de productos

#### **dashboard/** - Dashboard principal
- `DashboardView.tsx` - Vista principal del dashboard
- `DashboardWidget.tsx` - Widget base para el dashboard
- `widgets/` - Widgets específicos del dashboard
  - `CashFlowChart.tsx` - Gráfico de flujo de caja
  - `DashboardListsWidget.tsx` - Widget de listas
  - `InvoicesPayableWidget.tsx` - Widget de facturas por pagar
  - `InvoicesReceivableWidget.tsx` - Widget de facturas por cobrar
  - `ProfitMarginWidget.tsx` - Widget de márgenes de beneficio
  - `ProjectFinancialsWidget.tsx` - Widget financiero de proyectos
  - `ProjectsWidget.tsx` - Widget de proyectos
  - `QuotesWidget.tsx` - Widget de presupuestos
  - `RevenueChart.tsx` - Gráfico de ingresos
  - `TaxSummaryWidget.tsx` - Resumen de impuestos

#### **invoices/** - Gestión de facturas
- `InvoicePaymentsSection.tsx` - Sección de pagos de facturas
- `InvoicePDFViewer.tsx` - Visor PDF de facturas
- `PendingReviewSection.tsx` - Sección de revisión pendiente
- `RegisterPaymentDialog.tsx` - Diálogo para registrar pagos

#### **layout/** - Componentes de layout
- `NexoHeader.tsx` - Header de la aplicación (con logo)
- `NexoLoadingScreen.tsx` - Pantalla de carga
- `Sidebar.tsx` - Sidebar de navegación
- `ThemeToggle.tsx` - Toggle de tema claro/oscuro
- `UserAvatarDropdown.tsx` - Dropdown del avatar de usuario

#### **leadmap/** - Mapa comercial y leads
- `CanvassingDetailPanel.tsx` - Panel de detalles de prospección
- `CanvassingLocationDialog.tsx` - Diálogo de ubicación de prospección
- `CanvassingMapSidebar.tsx` - Sidebar del mapa de prospección
- `CanvassingTool.tsx` - Herramienta de prospección
- `CreateLeadDialog.tsx` - Diálogo para crear leads
- `LeadDetailMobileSheet.tsx` - Sheet móvil de detalles de lead
- `LeadDetailPanel.tsx` - Panel de detalles de lead
- `LeadMap.tsx` - Componente principal del mapa de leads
- `LeadMapFilters.tsx` - Filtros del mapa de leads
- `LeadMapSidebar.tsx` - Sidebar del mapa de leads
- `LocationNotesSection.tsx` - Sección de notas de ubicación
- `SimpleMap.tsx` - Mapa simple

#### **projects/** - Gestión de proyectos
- `CreateProjectDialog.tsx` - Diálogo para crear proyectos
- `CreateProjectExpenseDialog.tsx` - Diálogo para crear gastos de proyecto
- `ProjectDashboardTab.tsx` - Dashboard del proyecto
- `ProjectExpensesTab.tsx` - Pestaña de gastos del proyecto
- `ProjectInvoicesTab.tsx` - Pestaña de facturas del proyecto
- `ProjectPlanningTab.tsx` - Pestaña de planificación del proyecto
- `ProjectQuotesTab.tsx` - Pestaña de presupuestos del proyecto
- `ProjectTechniciansTab.tsx` - Pestaña de técnicos del proyecto
- `ProjectsListSidebar.tsx` - Sidebar de lista de proyectos
- `ProjectSearchInput.tsx` - Buscador de proyectos

#### **purchases/** - Gestión de compras
- `CreatePurchaseInvoiceDialog.tsx` - Diálogo para crear facturas de compra
- `PurchaseInvoiceLinesEditor.tsx` - Editor de líneas de factura de compra
- `PurchaseInvoicePaymentsSection.tsx` - Sección de pagos de facturas de compra
- `RegisterPurchasePaymentDialog.tsx` - Diálogo para registrar pagos de compra

#### **quotes/** - Gestión de presupuestos
- `QuickQuoteDialog.tsx` - Diálogo de presupuesto rápido
- `QuotePDFViewer.tsx` - Visor PDF de presupuestos

#### **settings/** - Configuración
- `CategoryImportDialog.tsx` - Diálogo para importar categorías
- `CompanyDataTab.tsx` - Pestaña de datos de la empresa
- `PreferencesTab.tsx` - Pestaña de preferencias
- `ProductCategoriesTab.tsx` - Pestaña de categorías de productos
- `TaxesTab.tsx` - Pestaña de impuestos
- `TemplatesTab.tsx` - Pestaña de plantillas

#### **suppliers/** - Gestión de proveedores
- `CreateSupplierDialog.tsx` - Diálogo para crear proveedores
- `SupplierSearchInput.tsx` - Buscador de proveedores

#### **technicians/** - Gestión de técnicos
- `CreateTechnicianDialog.tsx` - Diálogo para crear técnicos
- `EditTechnicianDialog.tsx` - Diálogo para editar técnicos

#### **users/** - Gestión de usuarios
- `PasswordStrengthIndicator.tsx` - Indicador de fuerza de contraseña
- `UserManagement.tsx` - Gestión de usuarios

---

### `layouts/`
Layouts principales de la aplicación:
- `NexoAvLayout.tsx` - Layout principal con Header fijo (superior) y Sidebar fijo (izquierda)

---

### `pages/`
Páginas de la aplicación organizadas por funcionalidad:

#### Autenticación
- `Login.tsx` - Página de inicio de sesión

#### Dashboard y Principal
- `Dashboard.tsx` - Dashboard principal
- `NotFound.tsx` - Página 404

#### Clientes
- `ClientsPage.tsx` - Lista de clientes
- `ClientDetailPage.tsx` - Detalle de cliente
- `ClientMapPage.tsx` - Mapa de clientes

#### Proyectos
- `ProjectsPage.tsx` - Lista de proyectos
- `ProjectDetailPage.tsx` - Detalle de proyecto
- `ProjectMapPage.tsx` - Mapa de proyectos

#### Facturas (Invoices)
- `InvoicesPage.tsx` - Lista de facturas
- `InvoiceDetailPage.tsx` - Detalle de factura
- `NewInvoicePage.tsx` - Nueva factura
- `EditInvoicePage.tsx` - Editar factura

#### Presupuestos (Quotes)
- `QuotesPage.tsx` - Lista de presupuestos
- `QuoteDetailPage.tsx` - Detalle de presupuesto
- `NewQuotePage.tsx` - Nuevo presupuesto
- `EditQuotePage.tsx` - Editar presupuesto

#### Compras (Purchases)
- `PurchaseInvoicesPage.tsx` - Lista de facturas de compra
- `PurchaseInvoiceDetailPage.tsx` - Detalle de factura de compra
- `NewPurchaseInvoicePage.tsx` - Nueva factura de compra

#### Catálogo
- `CatalogPage.tsx` - Catálogo de productos
- `ProductDetailPage.tsx` - Detalle de producto

#### Proveedores
- `SuppliersPage.tsx` - Lista de proveedores
- `SupplierDetailPage.tsx` - Detalle de proveedor

#### Técnicos
- `TechniciansPage.tsx` - Lista de técnicos
- `TechnicianDetailPage.tsx` - Detalle de técnico
- `TechMapPage.tsx` - Mapa de técnicos

#### Contabilidad
- `AccountingPage.tsx` - Página principal de contabilidad
- `AccountSetup.tsx` - Configuración de cuenta
- `ExpensesPage.tsx` - Gastos
- `TaxDetailPage.tsx` - Detalle de impuestos

#### Administración
- `UsersPage.tsx` - Gestión de usuarios
- `SettingsPage.tsx` - Configuración general
- `AuditPage.tsx` - Auditoría
- `AuditEventDetailPage.tsx` - Detalle de evento de auditoría
- `ReportsPage.tsx` - Informes

#### Mapas y Leads
- `LeadMapPage.tsx` - Mapa comercial de leads

#### Calculadora
- `CalculatorPage.tsx` - Calculadora de presupuestos

---

### `styles/`
Estilos globales y específicos:
- `global.css` - Estilos globales de la versión desktop con tema NEXO AV
- `components/` - Estilos específicos de componentes

---

## 🎨 Características del Layout

### Header (Fijo Superior)
- **Posición**: `fixed top-0`
- **Altura**: `3.25rem`
- **z-index**: 50
- **Contenido**: Logo NEXO AV, título, información de usuario y menú de avatar

### Sidebar (Fijo Izquierda)
- **Posición**: `fixed left-0`
- **Ancho**: `14rem (56 en Tailwind)`
- **z-index**: 40
- **Contenido**: Navegación principal con carpetas colapsables

### Contenido Principal
- **Margen izquierdo**: `14rem` (espacio para sidebar)
- **Margen superior**: `3.25rem` (espacio para header)
- **Comportamiento**: Scrollable verticalmente

---

## 🚀 Convenciones de Código

### Imports
Los imports siguen la estructura de carpetas:
```typescript
// Componentes de layout
import { Sidebar } from "../components/layout/Sidebar";
import { NexoHeader } from "../components/layout/NexoHeader";

// Componentes de clientes
import { CreateClientDialog } from "../components/clients/CreateClientDialog";

// Componentes comunes
import { PaginationControls } from "../components/common/PaginationControls";
```

### Nomenclatura
- **Componentes**: PascalCase (ej: `ClientDashboardTab.tsx`)
- **Carpetas**: lowercase (ej: `clients/`, `projects/`)
- **Archivos**: Mismo nombre que el componente exportado

---

## 📝 Notas Importantes

1. **Solo Desktop**: Esta carpeta contiene exclusivamente componentes y páginas para la versión de escritorio
2. **Mobile Separado**: Los componentes móviles están en `src/pages/nexo_av/mobile/`
3. **Tema**: El archivo `styles/global.css` contiene el tema profesional NEXO AV con soporte para modo claro y oscuro
4. **Timeout de Sesión**: 60 minutos con advertencia 5 minutos antes del cierre

---

## 🔧 Mantenimiento

Cuando agregues nuevos componentes:
1. Identifica la categoría funcional
2. Coloca el componente en la carpeta correspondiente
3. Actualiza los imports en los archivos que lo usen
4. Si es una nueva categoría, crea una nueva carpeta y documéntala aquí

---

**Última actualización**: Enero 2026
