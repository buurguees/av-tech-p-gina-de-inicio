# NEXO AV - Mobile Version

Estructura organizada de la versión móvil de la plataforma NEXO AV.

## 📁 Estructura de Carpetas

### `components/`
Componentes organizados por módulo funcional (similar a desktop):

#### **layout/** - Componentes de layout móvil
- `MobileHeader.tsx` - Header móvil con backdrop blur y safe area support
- `BottomNavigation.tsx` - Navegación inferior con 3 items principales

#### **common/** - Componentes comunes reutilizables
- `PlatformBrand.tsx` - Logo y marca (versión compacta)
- `UserAvatar.tsx` - Avatar de usuario (versión compacta)
- `RoleSimulator.tsx` - Simulador de roles (re-exportado desde desktop)

---

### `hooks/`
Hooks específicos para mobile:
- `useNexoAvTheme.ts` - Hook para aplicar tema NEXO AV (light/dark)

---

### `layouts/`
Layout principal de la aplicación móvil:
- `NexoAvMobileLayout.tsx` - Layout principal con Header fijo (superior) y Bottom Nav fijo (inferior)

---

### `styles/`
Estilos globales y específicos:

#### **base/**
- `variables.css` - Variables CSS del tema (colores, medidas móviles)
- `typography.css` - Estilos de tipografía (tamaños optimizados para móvil)

#### **components/layout/**
- `bottom-navigation.css` - Estilos de la navegación inferior

#### **global.css**
- Estilos globales de la versión móvil con tema NEXO AV
- Optimizaciones para touch (touch-action, safe-area-inset)
- Scrollbar styling para móvil

---

## 🎨 Características del Layout

### Header (Fijo Superior)
- **Posición**: `fixed top-0`
- **Altura**: `3.25rem` + safe area inset
- **z-index**: 50
- **Efecto**: Backdrop blur (translúcido)
- **Contenido**: Botón menú, logo compacto, notificaciones, avatar de usuario

### Bottom Navigation (Fijo Inferior)
- **Posición**: `fixed bottom-0`
- **Altura**: `4rem` + safe area inset
- **z-index**: 40
- **Efecto**: Backdrop blur (translúcido)
- **Items**: Dashboard, Clientes, Proyectos

### Contenido Principal
- **Padding superior**: `3.25rem` + safe area inset
- **Padding inferior**: `4rem` + safe area inset
- **Comportamiento**: Scrollable verticalmente
- **Altura**: `100dvh` (dynamic viewport height)

---

## 🚀 Características Técnicas

### Safe Area Support
- Soporte completo para notch/Dynamic Island (iOS)
- Soporte para home indicator (iOS)
- Soporte para punch-hole (Android)
- Uso de `env(safe-area-inset-*)` para compensación automática

### Touch Optimizations
- **Tamaño mínimo táctil**: 44px (Apple HIG) / 56px (Material Design)
- **Touch action**: `manipulation` (elimina delay de 300ms en iOS)
- **Feedback visual**: Escala al tocar (scale-95/scale-90)
- **Prevención de zoom**: `-webkit-text-size-adjust: 100%`

### Backdrop Blur
- Efecto cristal moderno (iOS/Android style)
- `backdrop-filter: blur(24px)`
- Fondo translúcido (80% opacidad)
- Aceleración GPU en dispositivos modernos

### Animaciones
- Transiciones suaves (200-300ms)
- Spring animations para feedback táctil

---

## 📱 Breakpoints

El layout móvil se activa cuando:
- `window.innerWidth < 550px` (definido en `use-mobile.tsx`)

---

## 🔄 Integración con Desktop

El `ResponsiveLayout.tsx` detecta automáticamente el tamaño de pantalla y carga:
- **Desktop**: `desktop/layouts/NexoAvLayout.tsx`
- **Mobile**: `mobile/layouts/NexoAvMobileLayout.tsx`

---

## 🎯 Módulos Disponibles

Los módulos se muestran según los permisos del usuario:

### Acceso Universal
- Dashboard
- Catálogo
- Calculadora

### Acceso Comercial/Sales
- Mapa Comercial
- Clientes / Leads
- Presupuestos
- Facturas
- Proyectos

### Acceso Técnico
- Proyectos
- Mapa Técnico

### Acceso Admin/Manager
- Informes
- Usuarios (solo Admin)
- Configuración (solo Admin)
- Auditoría (solo Admin)
- Contabilidad (solo Admin)

---

## 📝 Convenciones de Código

### Imports
Los imports siguen la estructura de carpetas:
```typescript
// Componentes de layout
import { MobileHeader } from "../components/layout/MobileHeader";
import { BottomNavigation } from "../components/layout/BottomNavigation";

// Componentes comunes
import PlatformBrand from "../components/common/PlatformBrand";
import UserAvatar from "../components/common/UserAvatar";
```

### Nomenclatura
- **Componentes**: PascalCase (ej: `MobileHeader.tsx`)
- **Carpetas**: lowercase (ej: `layout/`, `common/`)
- **Archivos**: Mismo nombre que el componente exportado

---

## 📝 Notas Importantes

1. **Solo Mobile**: Esta carpeta contiene exclusivamente componentes y páginas para la versión móvil
2. **Desktop Separado**: Los componentes desktop están en `src/pages/nexo_av/desktop/`
3. **Tema**: El archivo `styles/global.css` contiene el tema profesional NEXO AV con soporte para modo claro y oscuro
4. **Timeout de Sesión**: 60 minutos con advertencia 5 minutos antes del cierre (igual que desktop)
5. **Reutilización**: Algunos componentes comunes (como RoleSimulator) se re-exportan desde desktop para mantener consistencia

---

## 🔧 Mantenimiento

Cuando agregues nuevos componentes:
1. Identifica la categoría funcional
2. Coloca el componente en la carpeta correspondiente
3. Actualiza los imports en los archivos que lo usen
4. Si es una nueva categoría, crea una nueva carpeta y documéntala aquí

---

**Última actualización**: Enero 2026
