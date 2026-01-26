# Análisis del Sistema de Gastos y Plan de Acción

## 📋 Resumen Ejecutivo

Este documento analiza el estado actual del sistema de **Proveedores, Técnicos, Facturas de Compra y Gastos** y define un plan de acción para completar las funcionalidades requeridas.

---

## ✅ Estado Actual - Lo que EXISTE

### 1. **Base de Datos**
- ✅ Tabla `sales.purchase_invoices` - Facturas de compra y gastos
- ✅ Tabla `sales.purchase_invoice_lines` - Líneas de factura
- ✅ Tabla `sales.purchase_invoice_payments` - Pagos registrados
- ✅ Tabla `internal.suppliers` - Proveedores
- ✅ Tabla `internal.technicians` - Técnicos autónomos
- ✅ Funciones RPC:
  - `create_purchase_invoice` - Crear factura/gasto
  - `list_purchase_invoices` - Listar facturas
  - `update_purchase_invoice` - Actualizar factura
  - `get_purchase_invoice` - Obtener factura
  - `get_purchase_invoice_lines` - Obtener líneas
  - `add_purchase_invoice_line` - Añadir línea
  - `create_supplier` - Crear proveedor
  - `list_suppliers` - Listar proveedores
  - `create_technician` - Crear técnico
  - `list_technicians` - Listar técnicos

### 2. **Páginas Frontend**
- ✅ `PurchaseInvoicesPage.tsx` - Listado de facturas de compra
- ✅ `ExpensesPage.tsx` - Página de gastos/tickets
- ✅ `PurchaseInvoiceDetailPage.tsx` - Detalle de factura
- ✅ `NewPurchaseInvoicePage.tsx` - Crear nueva factura (básico)
- ✅ `SuppliersPage.tsx` - Listado de proveedores
- ✅ `TechniciansPage.tsx` - Listado de técnicos

### 3. **Funcionalidades Implementadas**
- ✅ Subida de PDFs desde desktop
- ✅ Escaneo de documentos con cámara móvil (`DocumentScanner`)
- ✅ Almacenamiento en Storage (`purchase-documents`)
- ✅ Creación de registro con estado `PENDING` al subir documento
- ✅ Filtros por tipo (INVOICE/EXPENSE) y estado
- ✅ Visualización básica de facturas

---

## ❌ Lo que FALTA - Requisitos Pendientes

### 1. **Sistema de "Pendientes de Revisar"**
**Problema:** Los documentos subidos se crean con estado `PENDING` pero no hay:
- ❌ Vista dedicada de documentos pendientes
- ❌ Filtro específico para `status = 'PENDING'`
- ❌ Indicador visual de documentos sin datos completos
- ❌ Workflow para completar datos desde documentos pendientes

**Solución Requerida:**
- Crear sección/vista de "Pendientes de Revisar"
- Filtrar facturas con `status = 'PENDING'` y sin proveedor/técnico asignado
- Permitir completar datos desde esta vista

### 2. **Crear Factura desde PDF Subido**
**Problema:** Actualmente se sube el PDF pero no se puede:
- ❌ Extraer datos del PDF (OCR/parsing)
- ❌ Asignar proveedor o técnico al crear la factura
- ❌ Completar datos fiscales automáticamente desde proveedor/técnico
- ❌ Registrar el PDF al ID del proveedor

**Solución Requerida:**
- Formulario completo para crear/editar factura desde PDF
- Selector de proveedor/técnico con búsqueda
- Auto-completar datos fiscales al seleccionar proveedor/técnico
- Asociar PDF al proveedor en la base de datos

### 3. **Crear Nuevo Proveedor desde Gastos**
**Problema:** En la página de gastos no se puede:
- ❌ Crear nuevo proveedor rápidamente
- ❌ Asignar proveedor a tickets de comida/gasolina/parking

**Solución Requerida:**
- Dialog/modal para crear proveedor rápido desde gastos
- Formulario simplificado para proveedores ocasionales
- Asignación inmediata del proveedor al gasto

### 4. **Escaneo Múltiple en Móviles**
**Problema:** El `DocumentScanner` actual:
- ❌ Solo permite escanear un documento a la vez
- ❌ No guarda múltiples documentos en "pendientes"
- ❌ No permite escanear varios tickets seguidos

**Solución Requerida:**
- Modo de escaneo múltiple
- Lista de documentos escaneados antes de subir
- Subida en lote a "pendientes de revisar"

### 5. **Asignación de Gastos a Cliente/Proyecto**
**Problema:** No se puede:
- ❌ Asignar gasto a un cliente específico
- ❌ Asignar gasto a un proyecto
- ❌ Filtrar gastos por proyecto/cliente

**Solución Requerida:**
- Selector de cliente/proyecto en formulario de factura
- Campo `client_id` y `project_id` en `purchase_invoices`
- Filtros por cliente/proyecto en listados

### 6. **Sistema Fiscal: IVA e IRPF**
**Problema:** No se gestiona:
- ❌ Deducción de IVA de facturas de compra
- ❌ Retención de IRPF de técnicos autónomos
- ❌ Cálculo automático de retenciones
- ❌ Reportes fiscales

**Solución Requerida:**
- Campo `withholding_tax_rate` (IRPF) en técnicos
- Cálculo automático de retención IRPF (15% típico)
- Cálculo de IVA deducible
- Reportes de IVA soportado y retenciones

### 7. **Visualización de PDFs**
**Problema:** En `PurchaseInvoiceDetailPage`:
- ❌ No se muestra el PDF real, solo placeholder
- ❌ No hay visor de PDF integrado

**Solución Requerida:**
- Integrar visor de PDF (react-pdf o similar)
- Mostrar PDF desde Storage
- Descarga de PDF

### 8. **Formulario Completo de Factura**
**Problema:** `NewPurchaseInvoicePage` está incompleto:
- ❌ No permite seleccionar proveedor/técnico
- ❌ No permite añadir líneas de factura
- ❌ No calcula totales automáticamente
- ❌ No guarda realmente los datos

**Solución Requerida:**
- Formulario completo similar a `NewInvoicePage`
- Selector de proveedor/técnico
- Editor de líneas de factura
- Cálculo automático de totales
- Guardado completo en base de datos

---

## 🎯 Plan de Acción Detallado

### FASE 1: Sistema de Pendientes de Revisar (Prioridad ALTA)

#### 1.1. Crear Vista de Pendientes
- [ ] Crear componente `PendingReviewTab.tsx` o sección en `PurchaseInvoicesPage`
- [ ] Filtrar facturas con `status = 'PENDING'`
- [ ] Mostrar lista de documentos pendientes con preview
- [ ] Botón "Completar Datos" que lleva al formulario de edición

#### 1.2. Mejorar Filtros
- [ ] Añadir filtro "Pendientes" en `PurchaseInvoicesPage`
- [ ] Badge con contador de pendientes
- [ ] Indicador visual en tabla de documentos pendientes

**Archivos a modificar:**
- `src/pages/nexo_av/PurchaseInvoicesPage.tsx`
- `src/pages/nexo_av/components/PendingReviewTab.tsx` (nuevo)

---

### FASE 2: Formulario Completo de Factura de Compra (Prioridad ALTA)

#### 2.1. Mejorar `NewPurchaseInvoicePage`
- [ ] Crear formulario completo con campos:
  - Número de factura
  - Fecha emisión / vencimiento
  - Selector de Proveedor/Técnico (con búsqueda)
  - Selector de Cliente (opcional)
  - Selector de Proyecto (opcional)
  - Líneas de factura (tabla editable)
  - Totales calculados automáticamente
- [ ] Auto-completar datos fiscales al seleccionar proveedor/técnico
- [ ] Guardar factura completa en base de datos
- [ ] Asociar PDF si existe

#### 2.2. Mejorar `PurchaseInvoiceDetailPage`
- [ ] Añadir botón "Editar" que abre formulario
- [ ] Permitir editar todos los campos
- [ ] Permitir añadir/editar/eliminar líneas
- [ ] Actualizar totales en tiempo real

**Archivos a modificar:**
- `src/pages/nexo_av/NewPurchaseInvoicePage.tsx` (reescribir)
- `src/pages/nexo_av/PurchaseInvoiceDetailPage.tsx`
- `src/pages/nexo_av/components/CreatePurchaseInvoiceDialog.tsx` (nuevo, reutilizable)

---

### FASE 3: Crear Proveedor desde Gastos (Prioridad MEDIA)

#### 3.1. Dialog de Creación Rápida
- [ ] Crear `CreateSupplierQuickDialog.tsx`
- [ ] Formulario simplificado (solo campos esenciales)
- [ ] Integrar en `ExpensesPage` y `NewPurchaseInvoicePage`
- [ ] Después de crear, asignar automáticamente al gasto

**Archivos a crear:**
- `src/pages/nexo_av/components/CreateSupplierQuickDialog.tsx`

**Archivos a modificar:**
- `src/pages/nexo_av/ExpensesPage.tsx`
- `src/pages/nexo_av/NewPurchaseInvoicePage.tsx`

---

### FASE 4: Escaneo Múltiple en Móviles (Prioridad MEDIA)

#### 4.1. Mejorar `DocumentScanner`
- [ ] Añadir modo "múltiple"
- [ ] Lista de documentos escaneados
- [ ] Botón "Añadir otro" después de capturar
- [ ] Vista previa de todos los documentos
- [ ] Subida en lote al confirmar

#### 4.2. Integrar en `ExpensesPage`
- [ ] Modo múltiple activado por defecto en móviles
- [ ] Mostrar contador de documentos escaneados
- [ ] Subir todos a "pendientes de revisar"

**Archivos a modificar:**
- `src/pages/nexo_av/components/DocumentScanner.tsx`
- `src/pages/nexo_av/ExpensesPage.tsx`

---

### FASE 5: Asignación a Cliente/Proyecto (Prioridad MEDIA)

#### 5.1. Verificar Base de Datos
- [ ] Verificar que `purchase_invoices` tiene `project_id`
- [ ] Añadir `client_id` si no existe (migración)
- [ ] Verificar relaciones con `projects` y `clients`

#### 5.2. Añadir Selectores
- [ ] Selector de cliente en formulario de factura
- [ ] Selector de proyecto (filtrado por cliente)
- [ ] Filtros por cliente/proyecto en listados

**Archivos a modificar:**
- `src/pages/nexo_av/NewPurchaseInvoicePage.tsx`
- `src/pages/nexo_av/PurchaseInvoicesPage.tsx`
- Migración SQL si es necesario

---

### FASE 6: Sistema Fiscal IVA e IRPF (Prioridad ALTA)

#### 6.1. Retención IRPF en Técnicos
- [ ] Añadir campo `withholding_tax_rate` en tabla `technicians` (si no existe)
- [ ] Añadir campo en formulario de técnico
- [ ] Calcular retención automáticamente al crear factura de técnico

#### 6.2. Cálculo de IVA Deducible
- [ ] Verificar que se calcula correctamente el IVA
- [ ] Mostrar IVA deducible en resumen de factura
- [ ] Añadir campo `vat_deductible` si es necesario

#### 6.3. Reportes Fiscales
- [ ] Crear vista de resumen fiscal
- [ ] Mostrar IVA soportado total
- [ ] Mostrar retenciones IRPF totales
- [ ] Exportar datos para contabilidad

**Archivos a modificar:**
- `src/pages/nexo_av/components/CreateTechnicianDialog.tsx`
- `src/pages/nexo_av/NewPurchaseInvoicePage.tsx`
- Migración SQL para `withholding_tax_rate`
- `src/pages/nexo_av/components/FiscalSummaryWidget.tsx` (nuevo)

---

### FASE 7: Visualización de PDFs (Prioridad BAJA)

#### 7.1. Integrar Visor de PDF
- [ ] Instalar `react-pdf` o similar
- [ ] Crear componente `PDFViewer.tsx`
- [ ] Integrar en `PurchaseInvoiceDetailPage`
- [ ] Añadir botón de descarga

**Archivos a crear:**
- `src/pages/nexo_av/components/PDFViewer.tsx`

**Archivos a modificar:**
- `src/pages/nexo_av/PurchaseInvoiceDetailPage.tsx`

---

## 📊 Priorización Final

### 🔴 CRÍTICO (Hacer primero)
1. **FASE 1**: Sistema de Pendientes de Revisar
2. **FASE 2**: Formulario Completo de Factura
3. **FASE 6**: Sistema Fiscal IVA e IRPF

### 🟡 IMPORTANTE (Hacer después)
4. **FASE 3**: Crear Proveedor desde Gastos
5. **FASE 4**: Escaneo Múltiple en Móviles
6. **FASE 5**: Asignación a Cliente/Proyecto

### 🟢 MEJORAS (Opcional)
7. **FASE 7**: Visualización de PDFs

---

## 🔍 Verificaciones en Base de Datos - RESULTADOS

### ✅ Verificado - Estructura Actual

1. **Tabla `sales.purchase_invoices`:**
   - ✅ Tiene `supplier_id` (uuid, nullable)
   - ✅ Tiene `technician_id` (uuid, nullable)
   - ✅ Tiene `project_id` (uuid, nullable)
   - ❌ **NO tiene `client_id`** - **NECESITA MIGRACIÓN**
   - ✅ Tiene `status` (text, default 'DRAFT') - Puede usar 'PENDING'
   - ✅ Tiene `file_path` y `file_name`
   - ✅ Tiene `document_type` (INVOICE/EXPENSE)
   - ✅ Tiene `expense_category`
   - ✅ Tiene campos de totales: `subtotal`, `tax_amount`, `total`, `paid_amount`, `pending_amount`

2. **Tabla `internal.technicians`:**
   - ✅ Tiene `tax_id` (text, nullable)
   - ❌ **NO tiene `withholding_tax_rate`** - **NECESITA MIGRACIÓN**
   - ✅ Tiene otros datos fiscales (IBAN, payment_terms, etc.)

3. **Tabla `internal.suppliers`:**
   - ✅ Existe y tiene datos fiscales
   - ✅ Tiene relación con `purchase_invoices` vía `supplier_id`

4. **Funciones RPC:**
   - ✅ `create_purchase_invoice` acepta `p_supplier_id` y `p_technician_id`
   - ✅ `update_purchase_invoice` permite actualizar todos los campos
   - ✅ `list_purchase_invoices` soporta filtros por tipo y estado

### 🔧 Migraciones Necesarias

**MIGRACIÓN 1: Añadir `client_id` a `sales.purchase_invoices`**
```sql
ALTER TABLE sales.purchase_invoices 
ADD COLUMN client_id uuid REFERENCES crm.clients(id);
```

**MIGRACIÓN 2: Añadir `withholding_tax_rate` a `internal.technicians`**
```sql
ALTER TABLE internal.technicians 
ADD COLUMN withholding_tax_rate numeric(5,2) DEFAULT 15.00 
CHECK (withholding_tax_rate >= 0 AND withholding_tax_rate <= 100);
COMMENT ON COLUMN internal.technicians.withholding_tax_rate IS 'Porcentaje de retención IRPF (típicamente 15% para autónomos)';
```

---

## 📝 Notas Técnicas

### Consideraciones de Implementación

1. **OCR/Extracción de Datos de PDF:**
   - Por ahora, entrada manual de datos
   - Futuro: Integrar servicio OCR (Tesseract.js, Google Vision, etc.)

2. **Storage de PDFs:**
   - Bucket: `purchase-documents`
   - Estructura: `{userId}/{fileName}`
   - Políticas RLS necesarias

3. **Estados de Factura:**
   - `PENDING`: Documento subido, sin datos completos
   - `REGISTERED`: Datos completos, pendiente de pago
   - `PARTIAL`: Pago parcial
   - `PAID`: Pagado completamente

4. **Tipos de Documento:**
   - `INVOICE`: Factura de proveedor
   - `EXPENSE`: Ticket/gasto

---

## ✅ Checklist de Implementación

### Pre-requisitos
- [ ] Verificar estructura de base de datos
- [ ] Verificar funciones RPC disponibles
- [ ] Verificar permisos de Storage

### Fase 1: Pendientes
- [ ] Crear componente de pendientes
- [ ] Añadir filtros
- [ ] Añadir indicadores visuales

### Fase 2: Formulario
- [ ] Crear formulario completo
- [ ] Integrar selectores
- [ ] Añadir cálculo de totales
- [ ] Guardar en BD

### Fase 3: Proveedor Rápido
- [ ] Crear dialog
- [ ] Integrar en gastos
- [ ] Asignación automática

### Fase 4: Escaneo Múltiple
- [ ] Modificar DocumentScanner
- [ ] Añadir modo múltiple
- [ ] Subida en lote

### Fase 5: Cliente/Proyecto
- [ ] Verificar campos en BD
- [ ] Añadir selectores
- [ ] Añadir filtros

### Fase 6: Fiscal
- [ ] Añadir campo IRPF
- [ ] Calcular retenciones
- [ ] Crear reportes

### Fase 7: PDF Viewer
- [ ] Instalar librería
- [ ] Crear componente
- [ ] Integrar

---

## 🚀 Siguiente Paso

**Empezar con FASE 1: Sistema de Pendientes de Revisar**

Este es el bloqueo principal: los usuarios suben documentos pero no tienen forma fácil de completar los datos. Una vez resuelto esto, el resto del flujo será más fluido.
