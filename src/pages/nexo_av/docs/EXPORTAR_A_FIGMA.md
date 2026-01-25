# Guía para Exportar Páginas a Figma

## 📋 Lista de Páginas (38 total)

### Páginas Principales
1. **Dashboard.tsx** - Página de inicio con widgets y KPIs
2. **ClientsPage.tsx** - Lista de clientes con filtros y búsqueda
3. **QuotesPage.tsx** - Lista de presupuestos
4. **CatalogPage.tsx** - Catálogo de productos, servicios y packs
5. **InvoicesPage.tsx** - Lista de facturas
6. **ProjectsPage.tsx** - Lista de proyectos
7. **LeadMapPage.tsx** - Mapa comercial de leads
8. **SettingsPage.tsx** - Configuración del sistema

### Páginas de Detalle
9. **ClientDetailPage.tsx** - Detalle de cliente
10. **QuoteDetailPage.tsx** - Detalle de presupuesto
11. **InvoiceDetailPage.tsx** - Detalle de factura
12. **ProjectDetailPage.tsx** - Detalle de proyecto
13. **ProductDetailPage.tsx** - Detalle de producto
14. **TechnicianDetailPage.tsx** - Detalle de técnico
15. **SupplierDetailPage.tsx** - Detalle de proveedor
16. **AuditEventDetailPage.tsx** - Detalle de evento de auditoría
17. **TaxDetailPage.tsx** - Detalle de impuesto

### Páginas de Edición/Creación
18. **NewQuotePage.tsx** - Crear nuevo presupuesto
19. **EditQuotePage.tsx** - Editar presupuesto
20. **NewInvoicePage.tsx** - Crear nueva factura
21. **EditInvoicePage.tsx** - Editar factura
22. **NewPurchaseInvoicePage.tsx** - Crear factura de compra
23. **PurchaseInvoiceDetailPage.tsx** - Detalle de factura de compra

### Páginas de Gestión
24. **UsersPage.tsx** - Gestión de usuarios
25. **TechniciansPage.tsx** - Gestión de técnicos
26. **SuppliersPage.tsx** - Gestión de proveedores
27. **PurchaseInvoicesPage.tsx** - Lista de facturas de compra
28. **ExpensesPage.tsx** - Gastos
29. **AccountingPage.tsx** - Contabilidad
30. **ReportsPage.tsx** - Informes
31. **AuditPage.tsx** - Auditoría
32. **CalculatorPage.tsx** - Calculadora

### Páginas de Mapas
33. **ClientMapPage.tsx** - Mapa de clientes
34. **ProjectMapPage.tsx** - Mapa de proyectos
35. **TechMapPage.tsx** - Mapa técnico

### Páginas de Sistema
36. **Login.tsx** - Página de inicio de sesión
37. **AccountSetup.tsx** - Configuración de cuenta
38. **NotFound.tsx** - Página 404

## 🛠️ Opciones para Exportar

### Opción 1: Script con API de Figma (Recomendado)

Usa el script `export-to-figma.js` que crea frames automáticamente en Figma.

**Requisitos:**
- Token de acceso de Figma (Personal Access Token)
- File Key del archivo de Figma donde quieres exportar

**Uso:**
```bash
node scripts/export-to-figma.js
```

### Opción 2: Exportación Manual

1. Abre cada página en el navegador
2. Toma screenshots de cada página
3. Importa los screenshots en Figma
4. Organiza en frames por categoría

### Opción 3: Plugin de Figma

Usa plugins como "HTML to Design" o "Screenshot" para convertir HTML a Figma.

## 📐 Estructura Sugerida en Figma

```
📁 NexoAV Pages
  📁 Principales
    - Dashboard
    - Clients
    - Quotes
    - Catalog
    - Invoices
    - Projects
  📁 Detalle
    - Client Detail
    - Quote Detail
    - Invoice Detail
    - Project Detail
  📁 Creación/Edición
    - New Quote
    - Edit Quote
    - New Invoice
  📁 Gestión
    - Users
    - Technicians
    - Suppliers
  📁 Mapas
    - Lead Map
    - Client Map
    - Project Map
  📁 Sistema
    - Login
    - Settings
    - NotFound
```

## 🎨 Componentes Comunes a Documentar

- **SearchBar** - Barra de búsqueda global
- **DataList** - Lista de datos con paginación
- **DetailNavigationBar** - Barra de navegación de detalle
- **PaginationControls** - Controles de paginación
- **DashboardWidget** - Widgets del dashboard
- **Tabs** - Pestañas (Productos/Servicios/Packs)
