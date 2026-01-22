# NEXO AV - Plataforma de Gestión Responsive

Plataforma de gestión empresarial con soporte completo para dispositivos desktop y mobile, con detección automática del tipo de dispositivo.

## 🎯 Arquitectura Responsive

La plataforma detecta automáticamente el layout apropiado usando una lógica híbrida:

### Desktop Layout
**Criterios de detección:**
1. **Pantallas >= 1440px de ancho**: Siempre Desktop (incluso si height > width)
   - Ejemplos: 1440x2560, 1920x1080, 2560x1440
   - Monitores grandes en cualquier orientación

2. **Pantallas < 1440px con orientación horizontal** (width ≥ height)
   - Aspect Ratios: 4:3, 16:9
   - Tablets horizontales

**Características:**
- **Layout**: `desktop/layouts/NexoAvLayout.tsx`
- **Header**: Fijo en la parte superior (3.25rem)
- **Sidebar**: Fijo a la izquierda (14rem) con navegación colapsable
- **Contenido**: Área principal con scroll vertical
- **Navegación**: A través del Sidebar

### Mobile Layout
**Criterios de detección:**
- **Pantallas < 1440px con orientación vertical** (height > width)
  - Aspect Ratios: 3:4, 9:16
  - Tablets verticales, móviles

**Características:**
- **Layout**: `mobile/layouts/NexoAvLayoutMobile.tsx`
- **Header**: Fijo en la parte superior con safe area insets
- **Navegación**: Bottom Navigation fija en la parte inferior
- **Contenido**: Pantalla completa optimizada para touch
- **Safe Areas**: Soporte completo para notch y áreas seguras

## 📱 Detección de Dispositivo

### Hook: `useDeviceDetection`
Ubicación: `src/hooks/useDeviceDetection.ts`

```typescript
const { isMobile, isTablet, isDesktop, width, height } = useDeviceDetection();
```

#### Breakpoints:
- **Mobile**: < 768px
- **Tablet**: 768px - 1023px
- **Desktop**: ≥ 1024px

#### Hooks disponibles:
- `useDeviceDetection()`: Información completa del dispositivo
- `useIsMobile()`: Retorna `true` si es mobile o tablet
- `useIsDesktop()`: Retorna `true` si es desktop

### Componente: `ResponsiveLayout`
Ubicación: `src/pages/nexo_av/layouts/ResponsiveLayout.tsx`

Este componente se encarga de:
1. Detectar el layout apropiado usando lógica híbrida:
   - **Ancho >= 1440px**: Siempre Desktop Layout
   - **Ancho < 1440px**: Basado en orientación (aspect ratio)
     * Horizontal (width ≥ height): Desktop Layout
     * Vertical (height > width): Mobile Layout
2. Cargar el layout apropiado según los criterios
3. Lazy loading de los layouts para optimizar el bundle
4. Re-renderizar automáticamente al cambiar el tamaño de ventana o la orientación
5. Detectar cambios de orientación en tiempo real (especialmente útil en tablets)

## 🗂️ Estructura de Carpetas

```
src/pages/nexo_av/
├── layouts/
│   └── ResponsiveLayout.tsx       (Selector automático de layout)
│
├── desktop/                        (Versión Desktop - Orientación Horizontal)
│   ├── layouts/
│   │   └── NexoAvLayout.tsx       (Layout con Header + Sidebar fijos)
│   ├── components/                (Componentes organizados por módulo)
│   │   ├── layout/                (Header, Sidebar, etc.)
│   │   ├── dashboard/             (Dashboard y widgets)
│   │   ├── clients/               (Componentes de clientes)
│   │   ├── projects/              (Componentes de proyectos)
│   │   ├── invoices/              (Componentes de facturas)
│   │   ├── quotes/                (Componentes de presupuestos)
│   │   ├── purchases/             (Componentes de compras)
│   │   ├── suppliers/             (Componentes de proveedores)
│   │   ├── technicians/           (Componentes de técnicos)
│   │   ├── accounting/            (Componentes de contabilidad)
│   │   ├── users/                 (Componentes de usuarios)
│   │   ├── common/                (Componentes comunes)
│   │   ├── catalog/               (Catálogo de productos)
│   │   ├── leadmap/               (Mapa comercial)
│   │   └── settings/              (Configuración)
│   ├── pages/                     (38 páginas desktop)
│   └── styles/
│       └── global.css             (Tema NEXO AV con modo claro/oscuro)
│
├── mobile/                         (Versión Mobile/Tablet < 1024px)
│   ├── layouts/
│   │   └── NexoAvLayoutMobile.tsx (Layout con Header + Bottom Nav)
│   ├── components/                (Componentes optimizados para mobile)
│   ├── pages/                     (Páginas mobile)
│   └── styles/
│       └── mobile.css             (Estilos específicos mobile)
│
├── hooks/
│   ├── useNexoAvTheme.ts         (Hook para aplicar tema)
│   └── useNexoAvThemeMode.ts     (Hook para modo claro/oscuro)
│
└── assets/
    └── logos/                     (Logos de la aplicación)
```

## 🚀 Flujo de Navegación

### Entrada a la Aplicación

1. **Login**: `/nexo-av` (usa componente de login común)
2. **Detección**: Al autenticarse, `ResponsiveLayout` detecta el dispositivo
3. **Redirección inicial**:
   - **Desktop**: → `/nexo-av/{userId}/dashboard`
   - **Mobile**: 
     - Sales/Comercial → `/nexo-av/{userId}/lead-map`
     - Admin → `/nexo-av/{userId}/project-map`
     - Otros → `/nexo-av/{userId}/lead-map`

### Cambio de Tamaño de Ventana

El sistema reacciona automáticamente:
- Si la ventana pasa de ≥1024px a <1024px → Cambia a layout mobile
- Si la ventana pasa de <1024px a ≥1024px → Cambia a layout desktop
- El estado de la aplicación se mantiene durante el cambio

## 🎨 Características por Layout

### Desktop Layout Features
- ✅ Header fijo con altura constante
- ✅ Sidebar colapsable con carpetas organizadas
- ✅ Navegación principal a través del Sidebar
- ✅ Área de contenido con scroll independiente
- ✅ Soporte para múltiples ventanas y pestañas
- ✅ Optimizado para mouse y teclado

### Mobile Layout Features
- ✅ Header compacto con safe area support
- ✅ Bottom Navigation con 4-5 ítems principales
- ✅ Navegación optimizada para touch
- ✅ Pantalla completa para maximizar espacio
- ✅ Soporte para gestos táctiles
- ✅ Optimizado para uso con una mano

## 🔒 Seguridad

Ambos layouts implementan:
- ✅ Verificación de autenticación
- ✅ Validación de permisos por rol
- ✅ Verificación de userId en URL vs usuario autenticado
- ✅ Auto logout por inactividad:
  - Desktop: 60 minutos
  - Mobile: 30 minutos
- ✅ Auditoría de acciones

## 🎯 Rutas Compartidas

Todas las rutas definidas en `src/App.tsx` funcionan en ambos layouts:

```typescript
/nexo-av/:userId/dashboard
/nexo-av/:userId/clients
/nexo-av/:userId/projects
/nexo-av/:userId/quotes
/nexo-av/:userId/invoices
/nexo-av/:userId/catalog
// ... y más
```

## 🛠️ Desarrollo

### Añadir Nuevas Páginas

1. **Crear página Desktop**: `src/pages/nexo_av/desktop/pages/NuevaPagina.tsx`
2. **Crear página Mobile** (si necesita UI diferente): `src/pages/nexo_av/mobile/pages/NuevaPagina.tsx`
3. **Añadir ruta en App.tsx**: Lazy load y definir ruta
4. **Actualizar navegación**: Añadir en Sidebar (desktop) y/o Bottom Nav (mobile)

### Añadir Nuevos Componentes

**Desktop**:
```
src/pages/nexo_av/desktop/components/{modulo}/NuevoComponente.tsx
```

**Mobile**:
```
src/pages/nexo_av/mobile/components/NuevoComponente.tsx
```

### Testing Responsive

Para probar ambas versiones:
1. **Desktop**: Ventana del navegador ≥ 1024px
2. **Mobile**: 
   - DevTools del navegador (F12 → Toggle Device Toolbar)
   - Resize ventana a < 1024px
   - Dispositivo móvil real

## 📊 Performance

- **Code Splitting**: Layouts cargados con lazy loading
- **Bundle Optimization**: Solo se carga el código del layout activo
- **Tree Shaking**: Componentes no utilizados se eliminan del bundle
- **Lazy Routes**: Todas las páginas se cargan bajo demanda

## 🔄 Migración y Compatibilidad

El sistema es retrocompatible:
- URLs antiguas siguen funcionando
- Redirecciones automáticas según el dispositivo
- Estado compartido entre layouts (a través de Supabase)
- Mismo backend y base de datos para ambas versiones

## 📝 Notas Importantes

1. **Componentes Compartidos**: Los componentes en `src/components/ui/` son compartidos por ambos layouts
2. **Hooks Compartidos**: Los hooks de autenticación y lógica de negocio son compartidos
3. **Estilos**: Cada layout tiene sus propios estilos globales optimizados
4. **Tema**: Ambos layouts usan el mismo sistema de temas (NEXO AV Light/Dark)

---

**Última actualización**: Enero 2026  
**Versión**: 2.0  
**Mantenido por**: Equipo de Desarrollo AV TECH
