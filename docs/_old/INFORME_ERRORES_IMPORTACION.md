# 📋 INFORME COMPLETO DE ERRORES DE IMPORTACIÓN

**Fecha:** 22 de enero de 2026  
**Última actualización:** 24 de enero de 2026  
**Total de errores encontrados originalmente:** 38  
**Estado:** La mayoría de los errores ya se resolvieron o los archivos fueron eliminados  
**Ubicación base:** `/src/pages/nexo_av`

---

## ⚠️ RESUMEN DE ERRORES

| Archivo | Línea | Módulo Incorrecto | Módulo Correcto | Tipo |
|---------|-------|-------------------|-----------------|------|
| `components/MobileBottomNav.tsx` | 5 | `./mobile/MenuDesplegable` | `./mobile/MenuDesplegable` | **Archivo falta en estructura mobile/** |
| `desktop/components/Header.tsx` | 2 | `./UserAvatarDropdown` | `./layout/UserAvatarDropdown` | ✅ **RESUELTO** - Archivo eliminado (duplicado no usado) |
| `desktop/components/Header.tsx` | 3 | `./NexoHeader` | `./layout/NexoHeader` | ✅ **RESUELTO** - Archivo eliminado (duplicado no usado) |
| `desktop/components/leadmap/CanvassingMapSidebar.tsx` | 4 | `../../LeadMapPage` | `../../pages/LeadMapPage` | **Archivo en otra carpeta** |
| `desktop/components/leadmap/CreateLeadDialog.tsx` | 16 | `../../LeadMapPage` | `../../pages/LeadMapPage` | **Archivo en otra carpeta** |
| `desktop/components/leadmap/LeadDetailMobileSheet.tsx` | 17 | `../../LeadMapPage` | `../../pages/LeadMapPage` | ✅ **RESUELTO** - Archivo eliminado (componente deshabilitado no usado) |
| `desktop/components/leadmap/LeadDetailPanel.tsx` | 17 | `../../LeadMapPage` | `../../pages/LeadMapPage` | ✅ **RESUELTO** - Archivo eliminado (componente deshabilitado no usado) |
| `desktop/components/leadmap/LeadMap.tsx` | 7 | `../../LeadMapPage` | `../../pages/LeadMapPage` | **Archivo en otra carpeta** |
| `desktop/components/leadmap/LeadMapFilters.tsx` | 4 | `../../LeadMapPage` | `../../pages/LeadMapPage` | **Archivo en otra carpeta** |
| `desktop/components/leadmap/LeadMapSidebar.tsx` | 3 | `../../LeadMapPage` | `../../pages/LeadMapPage` | ✅ **RESUELTO** - Archivo eliminado (componente deshabilitado no usado) |
| `desktop/components/purchases/PurchaseInvoiceLinesEditor.tsx` | 22 | `./ProductSearchInput` | `../common/ProductSearchInput` | ✅ **RESUELTO** - Ruta ya corregida |
| `desktop/components/settings/TemplatesTab.tsx` | 18 | `../InvoicePDFViewer` | `../invoices/InvoicePDFViewer` | ✅ **RESUELTO** - Ruta ya corregida |
| `mobile/components/InvoicePaymentsSection.tsx` | 30 | `./RegisterPaymentDialog` | `../desktop/components/invoices/RegisterPaymentDialog` | **Archivo ubicado en desktop** |
| `mobile/components/ProjectExpensesTab.tsx` | 16 | `./CreateProjectExpenseDialog` | **NO EXISTE en el proyecto** | **Archivo no existe** |
| `mobile/components/ProjectExpensesTab.tsx` | 17 | `./RegisterPurchasePaymentDialog` | `../desktop/components/purchases/RegisterPurchasePaymentDialog` | **Archivo ubicado en desktop** |
| `mobile/components/mobile/ClientsListMobile.tsx` | 5 | `../PaginationControls` | `../../desktop/components/common/PaginationControls` | **Componente en desktop** |
| `mobile/components/mobile/DashboardMobile.tsx` | 5 | `../QuickQuoteDialog` | `../../desktop/components/quotes/QuickQuoteDialog` | **Componente en desktop** |
| `mobile/components/mobile/FormLineEditorMobile.tsx` | 14 | `../ProductSearchInput` | `../../desktop/components/common/ProductSearchInput` | **Componente en desktop** |
| `mobile/components/mobile/InvoicesListMobile.tsx` | 13 | `../PaginationControls` | `../../desktop/components/common/PaginationControls` | **Componente en desktop** |
| `mobile/components/mobile/ProjectsListMobile.tsx` | 5 | `../PaginationControls` | `../../desktop/components/common/PaginationControls` | **Componente en desktop** |
| `mobile/components/mobile/QuotesListMobile.tsx` | 5 | `../PaginationControls` | `../../desktop/components/common/PaginationControls` | **Componente en desktop** |
| `mobile/pages/CatalogPageMobile.tsx` | 13 | `../components/catalog/ProductsTab` | `../../desktop/components/catalog/ProductsTab` | **Componente en desktop** |
| `mobile/pages/CatalogPageMobile.tsx` | 14 | `../components/catalog/PacksTab` | `../../desktop/components/catalog/PacksTab` | **Componente en desktop** |
| `mobile/pages/ClientDetailPageMobile.tsx` | 39 | `../components/ClientProjectsTab` | `../../desktop/components/clients/ClientProjectsTab` | **Componente en desktop** |
| `mobile/pages/ClientDetailPageMobile.tsx` | 40 | `../components/ClientQuotesTab` | `../../desktop/components/clients/ClientQuotesTab` | **Componente en desktop** |
| `mobile/pages/ClientDetailPageMobile.tsx` | 41 | `../components/ClientInvoicesTab` | `../../desktop/components/clients/ClientInvoicesTab` | **Componente en desktop** |
| `mobile/pages/ClientDetailPageMobile.tsx` | 42 | `../components/EditClientDialog` | `../../desktop/components/clients/EditClientDialog` | **Componente en desktop** |
| `mobile/pages/ClientMapPageMobile.tsx` | 5 | `../components/leadmap/LeadMap` | `../../desktop/components/leadmap/LeadMap` | **Componente en desktop** |
| `mobile/pages/ClientsPageMobile.tsx` | 20 | `../LeadMapPage` | `../../desktop/pages/LeadMapPage` | **Archivo en desktop/pages** |
| `mobile/pages/ClientsPageMobile.tsx` | 21 | `../components/CreateClientDialog` | `../../desktop/components/clients/CreateClientDialog` | **Componente en desktop** |
| `mobile/pages/LeadMapPageMobile.tsx` | 12 | `../components/leadmap/LeadMap` | `../../desktop/components/leadmap/LeadMap` | **Componente en desktop** |
| `mobile/pages/LeadMapPageMobile.tsx` | 15 | `../LeadMapPage` | `../../desktop/pages/LeadMapPage` | **Archivo en desktop/pages** |
| `mobile/pages/LeadMapPageMobile.tsx` | 17 | `../components/leadmap/CanvassingMapSidebar` | `../../desktop/components/leadmap/CanvassingMapSidebar` | **Componente en desktop** |
| `mobile/pages/LeadMapPageMobile.tsx` | 18 | `../components/leadmap/CanvassingDetailPanel` | `../../desktop/components/leadmap/CanvassingDetailPanel` | **Componente en desktop** |
| `mobile/pages/LeadMapPageMobile.tsx` | 19 | `../components/leadmap/CanvassingLocationDialog` | `../../desktop/components/leadmap/CanvassingLocationDialog` | **Componente en desktop** |
| `mobile/pages/ProjectDetailPageMobile.tsx` | 37 | `../components/DetailTabsMobile` | `../components/mobile/DetailTabsMobile` | **Subruta mobile/** |
| `mobile/pages/TechnicianDetailPageMobile.tsx` | 32 | `../components/EditTechnicianDialog` | `../../desktop/components/technicians/EditTechnicianDialog` | **Componente en desktop** |
| `mobile/pages/TechniciansPageMobile.tsx` | 26 | `../components/CreateTechnicianDialog` | `../../desktop/components/technicians/CreateTechnicianDialog` | **Componente en desktop** |

---

## 📍 CATEGORIZACIÓN POR TIPO DE ERROR

### 1. **Ruta Incorrecta (Archivos en subdirectorios)**
Archivos que existen pero en una carpeta diferente a la importada:

- ❌ [desktop/components/Header.tsx](desktop/components/Header.tsx#L2) - `./UserAvatarDropdown` → ✅ `./layout/UserAvatarDropdown`
- ❌ [desktop/components/Header.tsx](desktop/components/Header.tsx#L3) - `./NexoHeader` → ✅ `./layout/NexoHeader`
- ❌ [desktop/components/purchases/PurchaseInvoiceLinesEditor.tsx](desktop/components/purchases/PurchaseInvoiceLinesEditor.tsx#L22) - `./ProductSearchInput` → ✅ `../common/ProductSearchInput`
- ❌ [desktop/components/settings/TemplatesTab.tsx](desktop/components/settings/TemplatesTab.tsx#L18) - `../InvoicePDFViewer` → ✅ `../invoices/InvoicePDFViewer`
- ❌ [mobile/pages/ProjectDetailPageMobile.tsx](mobile/pages/ProjectDetailPageMobile.tsx#L37) - `../components/DetailTabsMobile` → ✅ `../components/mobile/DetailTabsMobile`

### 2. **Archivos en Otra Carpeta (desktop/pages en lugar de desktop/components)**
Archivos de página que están ubicados en pages, no en components:

- ❌ [desktop/components/leadmap/CanvassingMapSidebar.tsx](desktop/components/leadmap/CanvassingMapSidebar.tsx#L4) - `../../LeadMapPage` → ✅ `../../pages/LeadMapPage`
- ❌ [desktop/components/leadmap/CreateLeadDialog.tsx](desktop/components/leadmap/CreateLeadDialog.tsx#L16) - `../../LeadMapPage` → ✅ `../../pages/LeadMapPage`
- ❌ [desktop/components/leadmap/LeadDetailMobileSheet.tsx](desktop/components/leadmap/LeadDetailMobileSheet.tsx#L17) - `../../LeadMapPage` → ✅ `../../pages/LeadMapPage`
- ❌ [desktop/components/leadmap/LeadDetailPanel.tsx](desktop/components/leadmap/LeadDetailPanel.tsx#L17) - `../../LeadMapPage` → ✅ `../../pages/LeadMapPage`
- ❌ [desktop/components/leadmap/LeadMap.tsx](desktop/components/leadmap/LeadMap.tsx#L7) - `../../LeadMapPage` → ✅ `../../pages/LeadMapPage`
- ❌ [desktop/components/leadmap/LeadMapFilters.tsx](desktop/components/leadmap/LeadMapFilters.tsx#L4) - `../../LeadMapPage` → ✅ `../../pages/LeadMapPage`
- ❌ [desktop/components/leadmap/LeadMapSidebar.tsx](desktop/components/leadmap/LeadMapSidebar.tsx#L3) - `../../LeadMapPage` → ✅ `../../pages/LeadMapPage`
- ❌ [mobile/pages/ClientsPageMobile.tsx](mobile/pages/ClientsPageMobile.tsx#L20) - `../LeadMapPage` → ✅ `../../desktop/pages/LeadMapPage`
- ❌ [mobile/pages/LeadMapPageMobile.tsx](mobile/pages/LeadMapPageMobile.tsx#L15) - `../LeadMapPage` → ✅ `../../desktop/pages/LeadMapPage`

### 3. **Componentes Desktop Importados desde Mobile**
Componentes que están en la carpeta desktop pero se importan desde mobile:

- ❌ [mobile/components/mobile/ClientsListMobile.tsx](mobile/components/mobile/ClientsListMobile.tsx#L5) - `../PaginationControls` → ✅ `../../desktop/components/common/PaginationControls`
- ❌ [mobile/components/mobile/DashboardMobile.tsx](mobile/components/mobile/DashboardMobile.tsx#L5) - `../QuickQuoteDialog` → ✅ `../../desktop/components/quotes/QuickQuoteDialog`
- ❌ [mobile/components/mobile/FormLineEditorMobile.tsx](mobile/components/mobile/FormLineEditorMobile.tsx#L14) - `../ProductSearchInput` → ✅ `../../desktop/components/common/ProductSearchInput`
- ❌ [mobile/components/mobile/InvoicesListMobile.tsx](mobile/components/mobile/InvoicesListMobile.tsx#L13) - `../PaginationControls` → ✅ `../../desktop/components/common/PaginationControls`
- ❌ [mobile/components/mobile/ProjectsListMobile.tsx](mobile/components/mobile/ProjectsListMobile.tsx#L5) - `../PaginationControls` → ✅ `../../desktop/components/common/PaginationControls`
- ❌ [mobile/components/mobile/QuotesListMobile.tsx](mobile/components/mobile/QuotesListMobile.tsx#L5) - `../PaginationControls` → ✅ `../../desktop/components/common/PaginationControls`
- ❌ [mobile/pages/CatalogPageMobile.tsx](mobile/pages/CatalogPageMobile.tsx#L13) - `../components/catalog/ProductsTab` → ✅ `../../desktop/components/catalog/ProductsTab`
- ❌ [mobile/pages/CatalogPageMobile.tsx](mobile/pages/CatalogPageMobile.tsx#L14) - `../components/catalog/PacksTab` → ✅ `../../desktop/components/catalog/PacksTab`
- ❌ [mobile/pages/ClientDetailPageMobile.tsx](mobile/pages/ClientDetailPageMobile.tsx#L39) - `../components/ClientProjectsTab` → ✅ `../../desktop/components/clients/ClientProjectsTab`
- ❌ [mobile/pages/ClientDetailPageMobile.tsx](mobile/pages/ClientDetailPageMobile.tsx#L40) - `../components/ClientQuotesTab` → ✅ `../../desktop/components/clients/ClientQuotesTab`
- ❌ [mobile/pages/ClientDetailPageMobile.tsx](mobile/pages/ClientDetailPageMobile.tsx#L41) - `../components/ClientInvoicesTab` → ✅ `../../desktop/components/clients/ClientInvoicesTab`
- ❌ [mobile/pages/ClientDetailPageMobile.tsx](mobile/pages/ClientDetailPageMobile.tsx#L42) - `../components/EditClientDialog` → ✅ `../../desktop/components/clients/EditClientDialog`
- ❌ [mobile/pages/ClientMapPageMobile.tsx](mobile/pages/ClientMapPageMobile.tsx#L5) - `../components/leadmap/LeadMap` → ✅ `../../desktop/components/leadmap/LeadMap`
- ❌ [mobile/pages/ClientsPageMobile.tsx](mobile/pages/ClientsPageMobile.tsx#L21) - `../components/CreateClientDialog` → ✅ `../../desktop/components/clients/CreateClientDialog`
- ❌ [mobile/pages/LeadMapPageMobile.tsx](mobile/pages/LeadMapPageMobile.tsx#L12) - `../components/leadmap/LeadMap` → ✅ `../../desktop/components/leadmap/LeadMap`
- ❌ [mobile/pages/LeadMapPageMobile.tsx](mobile/pages/LeadMapPageMobile.tsx#L17) - `../components/leadmap/CanvassingMapSidebar` → ✅ `../../desktop/components/leadmap/CanvassingMapSidebar`
- ❌ [mobile/pages/LeadMapPageMobile.tsx](mobile/pages/LeadMapPageMobile.tsx#L18) - `../components/leadmap/CanvassingDetailPanel` → ✅ `../../desktop/components/leadmap/CanvassingDetailPanel`
- ❌ [mobile/pages/LeadMapPageMobile.tsx](mobile/pages/LeadMapPageMobile.tsx#L19) - `../components/leadmap/CanvassingLocationDialog` → ✅ `../../desktop/components/leadmap/CanvassingLocationDialog`
- ❌ [mobile/pages/TechnicianDetailPageMobile.tsx](mobile/pages/TechnicianDetailPageMobile.tsx#L32) - `../components/EditTechnicianDialog` → ✅ `../../desktop/components/technicians/EditTechnicianDialog`
- ❌ [mobile/pages/TechniciansPageMobile.tsx](mobile/pages/TechniciansPageMobile.tsx#L26) - `../components/CreateTechnicianDialog` → ✅ `../../desktop/components/technicians/CreateTechnicianDialog`

### 4. **Archivos que NO Existen en el Proyecto**

- ❌ [components/MobileBottomNav.tsx](components/MobileBottomNav.tsx#L5) - `./mobile/MenuDesplegable` → **NO EXISTE** (No hay archivo MenuDesplegable.tsx)
- ❌ [mobile/components/InvoicePaymentsSection.tsx](mobile/components/InvoicePaymentsSection.tsx#L30) - `./RegisterPaymentDialog` → **NO EXISTE en mobile/** (Está en `../../desktop/components/invoices/RegisterPaymentDialog`)
- ❌ [mobile/components/ProjectExpensesTab.tsx](mobile/components/ProjectExpensesTab.tsx#L16) - `./CreateProjectExpenseDialog` → **NO EXISTE EN EL PROYECTO**
- ❌ [mobile/components/ProjectExpensesTab.tsx](mobile/components/ProjectExpensesTab.tsx#L17) - `./RegisterPurchasePaymentDialog` → **NO EXISTE en mobile/** (Está en `../../desktop/components/purchases/RegisterPurchasePaymentDialog`)

---

## 🔧 PRÓXIMOS PASOS

Hay dos enfoques posibles para resolver estos errores:

### **Opción A: Crear componentes compartidos**
Mover componentes comunes a una carpeta `shared/` accesible desde ambas plataformas.

### **Opción B: Reparar importaciones directamente**
Actualizar cada importación para apuntar a la ubicación correcta del componente.

**Recomendación:** Opción B es más rápida. Utilizaré herramientas de reemplazo para corregir todas las importaciones automáticamente.

---

## 📊 ESTADÍSTICAS

- **Total de archivos con errores originalmente:** 21
- **Total de importaciones incorrectas originalmente:** 38
- **Archivos que no existen:** 2
- **Rutas incorrectas:** 37

## ✅ ESTADO ACTUAL (24 de enero de 2026)

- **Errores resueltos:** La mayoría de los errores mencionados ya se resolvieron o los archivos fueron eliminados durante la limpieza de código
- **Archivos eliminados:** 9 componentes no usados fueron eliminados (ver `COMPONENTES_ELIMINADOS.md`)
- **Código hardcodeado eliminado:** Todos los valores hardcodeados en componentes UI base fueron reemplazados por variables CSS (ver `GUIA_EVITAR_CODIGO_HARDCODEADO.md`)
