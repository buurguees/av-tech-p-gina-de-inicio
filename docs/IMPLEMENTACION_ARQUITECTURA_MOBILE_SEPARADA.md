# Implementación: Arquitectura Mobile Separada para Nexo-AV

**Fecha de implementación:** 19 de enero de 2026

## Resumen Ejecutivo

Se ha implementado una arquitectura completamente separada para dispositivos móviles y de escritorio en la aplicación Nexo-AV, eliminando la lógica condicional basada en `isMobile` de los layouts y creando componentes específicos para cada plataforma.

## Cambios Estructurales

### 1. Layouts Separados

#### ✅ Creado: `NexoAvLayoutMobile.tsx`
**Ubicación:** `src/pages/nexo_av/layouts/NexoAvLayoutMobile.tsx`

**Características:**
- Header compacto (altura 3.25rem)
- Sin sidebar - navegación vía `MobileBottomNav`
- Uso de viewport dinámico (`100dvh`)
- Redirección automática: dashboard → lead-map/project-map según rol
- Outlet directo sin márgenes adicionales para maximizar espacio

**Código eliminado del layout anterior:**
- Toda la lógica condicional `isMobile`
- Import de `DashboardMobile`
- Lógica de redirección móvil específica

#### ✅ Refactorizado: `NexoAvLayout.tsx`
**Ubicación:** `src/pages/nexo_av/layouts/NexoAvLayout.tsx`

**Cambios aplicados:**
- Eliminada lógica condicional `isMobile`
- Eliminado import de `DashboardMobile`
- Eliminada lógica de redirección móvil
- Eliminado `MobileBottomNav` del render
- Estructura desktop pura con sidebar fijo

**Líneas eliminadas:**
- L29: Import `DashboardMobile`
- L114: `const isMobile = useIsMobile()`
- L157-176: Lógica redirección móvil
- L236-257: useEffect redirección dashboard móvil
- L434-467: Renderizado condicional móvil

#### ✅ Actualizado: `nexoav.tsx`
**Ubicación:** `src/pages/nexo_av/nexoav.tsx`

**Nuevo código:**
```typescript
import { useIsMobile } from "@/hooks/use-mobile";
import NexoAvLayout from "./layouts/NexoAvLayout";
import NexoAvLayoutMobile from "./layouts/NexoAvLayoutMobile";

const NexoAv = () => {
  const isMobile = useIsMobile();
  const Layout = isMobile ? NexoAvLayoutMobile : NexoAvLayout;
  return <Layout />;
};
```

**Beneficios:**
- Punto único de decisión para el layout
- Código limpio sin condicionales anidados
- Fácil mantenimiento y debugging

---

## 2. Componentes Compartidos Mobile

### ✅ `FormLineEditorMobile.tsx`
**Ubicación:** `src/pages/nexo_av/components/mobile/FormLineEditorMobile.tsx`

**Propósito:** Editor modal reutilizable para líneas de presupuestos y facturas

**Características principales:**
- Sheet desde abajo (90vh)
- Búsqueda integrada de productos con `ProductSearchInput`
- Cálculos automáticos en tiempo real
- Campos optimizados para táctil (height: 48px)
- Validación inline con feedback visual
- Formateo de moneda automático
- Props:
  ```typescript
  interface FormLineEditorMobileProps {
    line: FormLine | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (line: FormLine) => void;
    type: 'quote' | 'invoice';
  }
  ```

**Campos incluidos:**
- Búsqueda de producto
- Concepto (requerido)
- Descripción (opcional)
- Cantidad y precio unitario
- IVA y descuento
- Totales calculados automáticamente

### ✅ `MobileTotalsFooter.tsx`
**Ubicación:** `src/pages/nexo_av/components/mobile/MobileTotalsFooter.tsx`

**Propósito:** Footer sticky con totales y botones de acción

**Características principales:**
- Posición fixed bottom con `z-index: 40`
- Soporte para safe-area (pb-safe)
- Animaciones con `framer-motion`
- Formateo de moneda con `Intl.NumberFormat`
- Estados: normal, saving, disabled
- Props:
  ```typescript
  interface MobileTotalsFooterProps {
    subtotal: number;
    taxAmount: number;
    total: number;
    onSave: () => void;
    onCancel: () => void;
    saving?: boolean;
    saveLabel?: string;
    cancelLabel?: string;
    disabled?: boolean;
  }
  ```

**Secciones:**
1. **Totales** (bg-muted/20):
   - Subtotal
   - IVA
   - Total (destacado con animación)

2. **Botones de acción** (grid 2 columnas):
   - Cancelar (outline)
   - Guardar (primary con loader)

---

## 3. Páginas Mobile de Formularios

### ✅ `NewQuotePageMobile.tsx`
**Ubicación:** `src/pages/nexo_av/mobile/NewQuotePageMobile.tsx`

**Enfoque:** Versión simplificada para creación rápida

**Flujo funcional:**
1. Selección de cliente (obligatorio)
2. Selección de proyecto (opcional)
3. Fecha de validez (default: +30 días)
4. Gestión de líneas con editor modal
5. Vista de totales en footer sticky
6. Creación con RPCs de Supabase

**Características especiales:**
- Pre-carga de cliente desde URL (`?clientId=`)
- Fetch automático de proyectos al seleccionar cliente
- Líneas editables/eliminables con gestos táctiles
- Sin vista previa PDF durante creación
- Validación: cliente + al menos 1 línea

**RPCs utilizados:**
- `list_clients`
- `list_projects`
- `create_quote`
- `add_quote_line`

### ✅ `EditQuotePageMobile.tsx`
**Ubicación:** `src/pages/nexo_av/mobile/EditQuotePageMobile.tsx`

**Enfoque:** Funcionalidad completa con restricciones por estado

**Estructura con Tabs:**
1. **Tab Información:** Cliente, proyecto, fecha validez
2. **Tab Líneas:** Lista editable de líneas
3. **Tab PDF:** Preview con `PDFViewer`

**Estados y restricciones:**
| Estado | Edición Info | Edición Líneas | PDF |
|--------|--------------|----------------|-----|
| DRAFT  | ✅ Completa   | ✅ Completa     | ✅  |
| SENT   | ❌ Bloqueada  | ❌ Bloqueada    | ✅  |
| APPROVED | ❌ Bloqueada | ❌ Bloqueada   | ✅  |
| REJECTED | ❌ Bloqueada | ❌ Bloqueada   | ✅  |

**Indicadores visuales:**
- Badge de estado con colores
- Banner de bloqueo cuando no es DRAFT
- Deshabilitación de controles

**RPCs utilizados:**
- `get_quote_details`
- `get_quote_lines`
- `update_quote`
- `update_quote_line`
- `add_quote_line`
- `delete_quote_line`

### ✅ `NewInvoicePageMobile.tsx`
**Ubicación:** `src/pages/nexo_av/mobile/NewInvoicePageMobile.tsx`

**Enfoque:** Versión simplificada con opción de crear desde presupuesto

**Diferencias vs Quote:**
- ✅ Fecha de emisión (obligatoria)
- ✅ Fecha de vencimiento (default: +30 días)
- ✅ Creación desde presupuesto aprobado
- ❌ No tiene "fecha de validez"

**Flujo especial - Crear desde presupuesto:**
1. Usuario selecciona cliente
2. Sistema muestra presupuestos aprobados disponibles
3. Usuario elige presupuesto
4. Sistema precarga:
   - Cliente y proyecto del presupuesto
   - Todas las líneas con cantidades y precios
5. Usuario puede modificar antes de crear

**Características adicionales:**
- Selector destacado con badge azul para presupuestos aprobados
- Grid de fechas (2 columnas)
- Validación: cliente + fecha emisión + al menos 1 línea

**RPCs utilizados:**
- `list_clients`
- `list_projects`
- `list_quotes` (filtrado por status APPROVED)
- `get_quote_details`
- `get_quote_lines`
- `create_invoice`
- `add_invoice_line`

### ✅ `EditInvoicePageMobile.tsx`
**Ubicación:** `src/pages/nexo_av/mobile/EditInvoicePageMobile.tsx`

**Enfoque:** Funcionalidad completa con restricciones por estado y pagos

**Estructura con Tabs:**
1. **Tab Información:** Cliente, proyecto, fechas
2. **Tab Líneas:** Lista editable de líneas
3. **Tab PDF:** Preview con `PDFViewer`

**Estados y permisos:**
| Estado | Edición Info | Edición Líneas | PDF | Notas |
|--------|--------------|----------------|-----|-------|
| DRAFT  | ✅ Completa   | ✅ Completa     | ✅  | Editable |
| ISSUED | ❌ Bloqueada  | ❌ Bloqueada    | ✅  | Solo cambio estado |
| PARTIAL | ❌ Bloqueada | ❌ Bloqueada    | ✅  | Pagos parciales |
| OVERDUE | ❌ Bloqueada | ❌ Bloqueada   | ✅  | Vencida |
| PAID   | ❌ Bloqueada  | ❌ Bloqueada    | ✅  | Solo lectura |
| CANCELLED | ❌ Bloqueada | ❌ Bloqueada | ✅  | Solo lectura |

**Indicadores especiales:**
- Badge de estado con colores
- Banner de bloqueo (PAID, CANCELLED)
- Banner de pago parcial con cantidad pagada
- No muestra footer si está bloqueada

**RPCs utilizados:**
- `get_invoice_details`
- `get_invoice_lines`
- `update_invoice`
- `update_invoice_line`
- `add_invoice_line`
- `delete_invoice_line`

---

## 4. Sistema de Routing

### ✅ Actualizado: `MobilePageWrapper.tsx`
**No requirió cambios** - Ya soportaba el patrón necesario:

```typescript
export function createMobilePage<T extends object>({
  DesktopComponent,
  MobileComponent,
}: CreateMobilePageOptions<T>) {
  const ResponsivePage = (props: T) => {
    const isMobile = useIsMobile();
    return isMobile ? (
      <Suspense fallback={<LoadingSpinner />}>
        <MobileComponent {...props} />
      </Suspense>
    ) : (
      <DesktopComponent {...props} />
    );
  };
  return ResponsivePage;
}
```

### ✅ Exports actualizados

#### `NewQuotePage.tsx`
```typescript
import { lazy } from 'react';
import { createMobilePage } from './MobilePageWrapper';

const NewQuotePageMobile = lazy(() => import('./mobile/NewQuotePageMobile'));

export default createMobilePage({
  DesktopComponent: NewQuotePage,
  MobileComponent: NewQuotePageMobile,
});
```

#### `EditQuotePage.tsx`
```typescript
import { lazy } from 'react';
import { createMobilePage } from './MobilePageWrapper';

const EditQuotePageMobile = lazy(() => import('./mobile/EditQuotePageMobile'));

export default createMobilePage({
  DesktopComponent: EditQuotePage,
  MobileComponent: EditQuotePageMobile,
});
```

#### `NewInvoicePage.tsx`
```typescript
import { lazy } from 'react';
import { createMobilePage } from './MobilePageWrapper';

const NewInvoicePageMobile = lazy(() => import('./mobile/NewInvoicePageMobile'));

export default createMobilePage({
  DesktopComponent: NewInvoicePage,
  MobileComponent: NewInvoicePageMobile,
});
```

#### `EditInvoicePage.tsx`
```typescript
import { lazy } from 'react';
import { createMobilePage } from './MobilePageWrapper';

const EditInvoicePageMobile = lazy(() => import('./mobile/EditInvoicePageMobile'));

export default createMobilePage({
  DesktopComponent: EditInvoicePage,
  MobileComponent: EditInvoicePageMobile,
});
```

**Beneficios del patrón:**
- ✅ Lazy loading automático de versiones móviles
- ✅ Code splitting mejorado
- ✅ Sin cambios en `App.tsx` necesarios
- ✅ Compatibilidad con rutas existentes
- ✅ Fallback de carga con Suspense

---

## Estructura Final de Archivos

```
src/pages/nexo_av/
├── layouts/
│   ├── NexoAvLayout.tsx              ← Refactorizado (Desktop only)
│   └── NexoAvLayoutMobile.tsx        ← NUEVO (Mobile only)
│
├── components/
│   └── mobile/
│       ├── FormLineEditorMobile.tsx  ← NUEVO (Componente reutilizable)
│       └── MobileTotalsFooter.tsx    ← NUEVO (Componente reutilizable)
│
├── mobile/
│   ├── NewQuotePageMobile.tsx        ← NUEVO
│   ├── EditQuotePageMobile.tsx       ← NUEVO
│   ├── NewInvoicePageMobile.tsx      ← NUEVO
│   ├── EditInvoicePageMobile.tsx     ← NUEVO
│   └── ... (16 páginas existentes)
│
├── nexoav.tsx                         ← Modificado (Routing layouts)
├── MobilePageWrapper.tsx              ← Sin cambios (Ya funcional)
├── NewQuotePage.tsx                   ← Modificado (Export con mobile)
├── EditQuotePage.tsx                  ← Modificado (Export con mobile)
├── NewInvoicePage.tsx                 ← Modificado (Export con mobile)
└── EditInvoicePage.tsx                ← Modificado (Export con mobile)
```

**Total de archivos creados:** 6 nuevos
**Total de archivos modificados:** 6 existentes

---

## Consideraciones Técnicas Implementadas

### 1. Gestos Táctiles
- ✅ `touch-action: manipulation` en todos los botones interactivos
- ✅ Altura mínima de 44px para elementos táctiles (Apple HIG)
- ✅ Áreas de toque ampliadas en cards de líneas

### 2. Performance
- ✅ Lazy loading de componentes pesados
- ✅ Suspense boundaries con fallbacks
- ✅ Cálculos automáticos con useEffect optimizado
- ✅ Debounce implícito en búsquedas

### 3. UX Mobile
- ✅ Campos con `autocomplete` apropiado
- ✅ Teclado numérico (`inputMode="decimal"`) para cantidades/precios
- ✅ Validación en tiempo real con feedback visual
- ✅ Confirmación implícita antes de eliminar (click en icono separado)

### 4. Estado Compartido
- ✅ Estado temporal con `tempId` para nuevas líneas
- ✅ Sin localStorage en esta fase (previsto para futuro)
- ✅ Sincronización con Supabase en cada operación

---

## Testing Recomendado

### 1. Layouts
- [ ] Verificar redirección móvil desde dashboard
- [ ] Verificar header compacto en móvil
- [ ] Verificar sidebar en desktop
- [ ] Verificar MobileBottomNav en móvil
- [ ] Probar cambio de tema

### 2. Formularios - NewQuote Mobile
- [ ] Crear presupuesto vacío
- [ ] Crear desde cliente específico (URL)
- [ ] Agregar múltiples líneas
- [ ] Editar línea existente
- [ ] Eliminar línea
- [ ] Validación sin cliente
- [ ] Validación sin líneas
- [ ] Guardar exitoso

### 3. Formularios - EditQuote Mobile
- [ ] Editar presupuesto DRAFT
- [ ] Bloqueo en estado SENT
- [ ] Bloqueo en estado APPROVED
- [ ] Vista previa PDF
- [ ] Cambio de cliente con recarga de proyectos
- [ ] Agregar línea
- [ ] Modificar línea
- [ ] Eliminar línea

### 4. Formularios - NewInvoice Mobile
- [ ] Crear factura vacía
- [ ] Crear desde presupuesto aprobado
- [ ] Verificar precarga de líneas desde presupuesto
- [ ] Validación fechas requeridas
- [ ] Guardar exitoso

### 5. Formularios - EditInvoice Mobile
- [ ] Editar factura DRAFT
- [ ] Bloqueo en estado PAID
- [ ] Bloqueo en estado CANCELLED
- [ ] Mostrar info pagos parciales
- [ ] Vista previa PDF
- [ ] Modificar fechas

### 6. Componentes Compartidos
- [ ] FormLineEditorMobile: búsqueda producto
- [ ] FormLineEditorMobile: cálculo automático totales
- [ ] FormLineEditorMobile: validación campos requeridos
- [ ] MobileTotalsFooter: animaciones totales
- [ ] MobileTotalsFooter: estado saving

---

## Próximos Pasos (No Implementados)

### Páginas Pendientes (17 restantes)
Según el plan original, estas páginas no son prioritarias:

**Administración:**
- SettingsPage
- UsersPage
- AuditPage
- AuditEventDetailPage

**Análisis:**
- ReportsPage

**Catálogo:**
- ProductDetailPage
- TaxDetailPage

**Finanzas:**
- SuppliersPage
- ExpensesPage
- PurchaseInvoicesPage
- NewPurchaseInvoicePage

**Técnicos:**
- TechMapPage

**Mapas alternativos:**
- ClientMapPage (ya existe LeadMapPageMobile)
- ProjectMapPage

**Estrategia:** Crear bajo demanda según feedback de usuarios reales.

### Mejoras Futuras
1. **Auto-guardado:**
   - LocalStorage para recuperación de sesión
   - Auto-save cada 30 segundos en DRAFT
   - Advertencia al salir con cambios sin guardar

2. **Gestos avanzados:**
   - Swipe left para eliminar líneas
   - Pull to refresh en listas
   - Librería: `react-swipeable` o `framer-motion`

3. **Performance:**
   - Virtualización de listas largas (react-window)
   - Optimistic UI updates
   - Caché de búsquedas con React Query

4. **Offline:**
   - Service Worker para caché
   - Sync en background
   - Indicador de estado de conexión

---

## Métricas de Implementación

**Líneas de código:**
- Layouts: ~500 líneas
- Componentes compartidos: ~350 líneas
- Páginas mobile: ~2,000 líneas
- **Total:** ~2,850 líneas de código nuevo

**Archivos:**
- Creados: 6 archivos
- Modificados: 6 archivos
- **Total:** 12 archivos afectados

**Tiempo estimado de desarrollo:** 4-6 horas

**Complejidad:**
- Layouts: Media
- Componentes compartidos: Media-Alta
- Páginas mobile: Alta

---

## Conclusión

Se ha implementado exitosamente una arquitectura móvil completamente separada que:

✅ **Elimina toda lógica condicional** basada en `isMobile` de los layouts  
✅ **Mejora la mantenibilidad** con componentes específicos por plataforma  
✅ **Optimiza la experiencia móvil** con gestos táctiles y UI adaptada  
✅ **Mantiene compatibilidad** con el sistema de routing existente  
✅ **Facilita el crecimiento** futuro con patrón claro y reutilizable  

La aplicación ahora tiene una base sólida para continuar desarrollando páginas móviles específicas según las necesidades del negocio.
