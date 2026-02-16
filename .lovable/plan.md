
# Plan: Paginas Mobile para Proveedores, Tecnicos, Facturas de Compra (detalle) y Tickets (detalle)

## Resumen

Crear 6 nuevas paginas mobile que se anaden al menu desplegable "+" de la navegacion inferior. Los listados de Facturas de Compra y Tickets ya existen en mobile pero les falta la pagina de detalle. Proveedores y Tecnicos no tienen ninguna version mobile.

---

## Paginas a Crear

### 1. MobileSuppliersPage.tsx (Listado)
- KPIs: Total activos, por categoria mas usada
- Busqueda con debounce
- Cards con: nombre, numero proveedor, categoria (badge color), telefono, ciudad
- Click navega al detalle
- RPC: `list_suppliers` (ya existe)

### 2. MobileSupplierDetailPage.tsx (Detalle - solo consulta)
- Header con nombre, numero y estado
- Datos de contacto: telefono (boton llamar), email (boton enviar), ciudad/provincia
- Tax ID, condiciones de pago
- Listado de facturas de compra vinculadas (usando `list_purchase_invoices` con `p_supplier_id`)
- Sin edicion (se mantiene en desktop)

### 3. MobileTechniciansPage.tsx (Listado)
- KPIs: Total activos, por tipo (Empresa/Autonomo/Plantilla)
- Busqueda con debounce
- Cards con: nombre, numero tecnico, tipo (badge), especialidades, telefono, valoracion (estrellas)
- Click navega al detalle
- RPC: `list_technicians` (ya existe)

### 4. MobileTechnicianDetailPage.tsx (Detalle - solo consulta)
- Header con nombre, numero y tipo
- Datos de contacto: telefono (boton llamar), email, ciudad/provincia
- Especialidades como badges
- Tarifas: diaria, por hora
- Valoracion
- Sin edicion (se mantiene en desktop; ademas la pagina desktop esta en mantenimiento)

### 5. MobilePurchaseInvoiceDetailPage.tsx (Detalle - solo consulta)
- Header con numero interno, estado (badge)
- Datos del proveedor/tecnico con enlace
- Proyecto vinculado con enlace
- Fecha emision, fecha vencimiento
- Desglose: base imponible, IVA, total
- Estado de pago: pagado vs pendiente
- Vista previa del documento adjunto (imagen/PDF)
- RPC: `get_purchase_invoice` y `get_purchase_invoice_lines` (ya existen)

### 6. MobileExpenseDetailPage.tsx (Detalle - solo consulta)
- Header con numero, estado, categoria de gasto (badge)
- Beneficiario
- Proyecto vinculado
- Importe total, estado de pago
- Notas
- Vista previa del documento adjunto
- RPC: `get_purchase_invoice` (misma RPC, document_type = EXPENSE)

---

## Cambios en Navegacion

### NexoAvMobileLayout.tsx
Anadir al array `moreMenuItems` (menu "+"):
- "Proveedores" con icono `Truck` -> `/nexo-av/{userId}/suppliers`
- "Tecnicos" con icono `UserRound` -> `/nexo-av/{userId}/technicians`

(Facturas de Compra y Tickets ya estan en el menu, solo les falta el detalle)

### App.tsx (Routing)
- Crear `ResponsiveSuppliersPage` y `ResponsiveTechniciansPage` con `createResponsivePage()`
- Crear `ResponsivePurchaseInvoiceDetailPage` y `ResponsiveExpenseDetailPage` con `createResponsivePage()`
- Actualizar las rutas existentes que hoy son `lazy()` solo desktop para que usen las versiones responsive

### index.ts (Exports)
Anadir las 6 nuevas paginas al barrel export de `mobile/pages/index.ts`

---

## Detalles Tecnicos

### Patron UI (consistente con paginas existentes)
- Listados: mismo layout que `MobilePurchaseInvoicesPage` y `MobileExpensesPage` (KPIs arriba, search sticky, cards con chevron)
- Detalles: scroll vertical con secciones separadas por dividers, botones de accion directa (llamar, email) como en `MobileClientDetailPage`
- Touch targets 44px, `touch-action: manipulation`, `rounded-2xl` cards
- Safe area padding inferior `pb-[80px]` para no tapar con la navbar

### RPCs reutilizadas (sin cambios en base de datos)
- `list_suppliers` - listado proveedores
- `list_technicians` - listado tecnicos
- `get_purchase_invoice` - detalle factura compra / gasto
- `get_purchase_invoice_lines` - lineas de factura
- `list_purchase_invoices` (con `p_supplier_id`) - facturas de un proveedor

### Constantes reutilizadas
- `supplierConstants.ts` - categorias y estados de proveedores
- `technicianConstants.ts` - tipos y estados de tecnicos
- `purchaseInvoiceStatuses.ts` - estados de documentos
- `ticketCategories.ts` - categorias de tickets/gastos

### Archivos nuevos (6)
```
src/pages/nexo_av/mobile/pages/MobileSuppliersPage.tsx
src/pages/nexo_av/mobile/pages/MobileSupplierDetailPage.tsx
src/pages/nexo_av/mobile/pages/MobileTechniciansPage.tsx
src/pages/nexo_av/mobile/pages/MobileTechnicianDetailPage.tsx
src/pages/nexo_av/mobile/pages/MobilePurchaseInvoiceDetailPage.tsx
src/pages/nexo_av/mobile/pages/MobileExpenseDetailPage.tsx
```

### Archivos modificados (3)
```
src/pages/nexo_av/mobile/pages/index.ts - anadir exports
src/pages/nexo_av/mobile/layouts/NexoAvMobileLayout.tsx - anadir items al menu "+"
src/App.tsx - actualizar rutas a responsive
```

---

## Orden de Implementacion

1. Primero los listados (Suppliers + Technicians) + menu "+"
2. Luego los detalles (PurchaseInvoice + Expense)
3. Detalle de Supplier y Technician
4. Actualizar routing en App.tsx
5. Actualizar exports en index.ts
