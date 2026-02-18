# Guía de Estilo UI - NexoAV Platform
## Sistema de Diseño iOS-Inspired

---

## 📐 Principios de Diseño

### 1. **Glassmorphism First**
Todos los elementos principales usan efectos glass (vidrio esmerilado) para crear profundidad y modernidad.

### 2. **Bordes Redondos Progresivos**
Los bordes redondos aumentan según la importancia del elemento.

### 3. **Contraste Sutil pero Efectivo**
Usamos opacidades sutiles de blanco sobre negro para crear jerarquía.

### 4. **Feedback Visual Inmediato**
Todas las interacciones tienen feedback visual claro (hover, active, focus).

### 5. **Uniformidad Total**
Todos los componentes siguen las mismas reglas de diseño.

---

## 🎨 Sistema de Border Radius

```
Elemento             | Border Radius  | Clase Tailwind
---------------------|----------------|----------------
Pequeños (badges)    | circular       | rounded-full
Botones pequeños     | 8px            | rounded-lg
Inputs/Selects       | 12px           | rounded-xl
Botones principales  | 12px           | rounded-xl
Cards/Containers     | 16px           | rounded-2xl
Modales/Dialogs      | 24px           | rounded-3xl
```

---

## 🔲 Componentes Base

### Button

```tsx
// Botón Principal (CTA)
<Button className="bg-white text-black hover:bg-white/90 rounded-xl shadow-sm">
  Acción Principal
</Button>

// Botón Secundario (Outline)
<Button 
  variant="outline" 
  className="border-white/20 text-white hover:bg-white/10 rounded-xl"
>
  Acción Secundaria
</Button>

// Botón con efecto Glass
<Button 
  variant="glass" 
  className="bg-white/[0.03] backdrop-blur-xl border-white/10"
>
  <Plus className="h-4 w-4 mr-2" />
  Glass Button
</Button>

// Botón Ghost (para navegación)
<Button 
  variant="ghost" 
  className="hover:bg-white/10 rounded-lg"
>
  <Home className="h-5 w-5" />
</Button>
```

**Propiedades clave:**
- ✅ Active state: `active:scale-[0.98]`
- ✅ Transition: `transition-all duration-200`
- ✅ Shadow: `shadow-sm` o `shadow-lg`

---

### Input & Textarea

```tsx
// Input de búsqueda
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
  <Input
    placeholder="Buscar..."
    className="pl-10 bg-white/5 border-white/10 text-white rounded-xl"
  />
</div>

// Textarea
<Textarea
  className="bg-white/5 border-white/10 text-white rounded-xl min-h-[100px]"
  placeholder="Notas..."
/>
```

**Propiedades clave:**
- ✅ Background: `bg-white/5`
- ✅ Border: `border-white/10`
- ✅ Focus ring: `focus-visible:ring-white/20`
- ✅ Focus border: `focus-visible:border-white/30`

---

### Select

```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl">
    <SelectValue placeholder="Seleccionar..." />
  </SelectTrigger>
  <SelectContent className="bg-zinc-900 border-white/10 rounded-2xl">
    <SelectItem value="option1" className="text-white">Opción 1</SelectItem>
    <SelectItem value="option2" className="text-white">Opción 2</SelectItem>
  </SelectContent>
</Select>
```

**Propiedades clave:**
- ✅ Content con glass: `bg-popover/95 backdrop-blur-2xl`
- ✅ Items hover: `focus:bg-white/10`
- ✅ Shadow: `shadow-2xl`

---

### Badge

```tsx
// Badge de estado
<Badge 
  variant="outline" 
  className="bg-blue-500/20 text-blue-400 border-blue-500/30"
>
  Nuevo
</Badge>

// Badge con contador
<Badge className="bg-white text-black shadow-sm">
  5
</Badge>
```

**Propiedades clave:**
- ✅ Padding: `px-3 py-1`
- ✅ Siempre circular: `rounded-full`
- ✅ Backdrop blur: `backdrop-blur-sm`

---

### Card

```tsx
<Card className="bg-white/[0.03] border-white/10 rounded-2xl shadow-lg backdrop-blur-sm">
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descripción</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Contenido */}
  </CardContent>
</Card>
```

**Propiedades clave:**
- ✅ Background glass: `bg-white/[0.03]`
- ✅ Border radius: `rounded-2xl`
- ✅ Shadow: `shadow-lg`
- ✅ Backdrop blur: `backdrop-blur-sm`

---

### Dialog/Modal

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir Modal</Button>
  </DialogTrigger>
  <DialogContent className="bg-zinc-900/95 backdrop-blur-2xl border-white/10 rounded-3xl shadow-2xl">
    <DialogHeader>
      <DialogTitle>Título del Modal</DialogTitle>
      <DialogDescription>Descripción</DialogDescription>
    </DialogHeader>
    {/* Contenido */}
  </DialogContent>
</Dialog>
```

**Propiedades clave:**
- ✅ Background glass: `bg-zinc-900/95`
- ✅ Backdrop blur dramático: `backdrop-blur-2xl`
- ✅ Border radius grande: `rounded-3xl`
- ✅ Shadow dramática: `shadow-2xl`
- ✅ Overlay con blur: `bg-black/90 backdrop-blur-sm`

---

## 📱 Componentes de Layout

### Header/Navigation

```tsx
<header className="bg-black/60 backdrop-blur-xl border-b border-white/10 shadow-lg sticky top-0 z-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16">
      {/* Logo y navegación */}
    </div>
  </div>
</header>
```

**Propiedades clave:**
- ✅ Semi-transparente: `bg-black/60`
- ✅ Backdrop blur fuerte: `backdrop-blur-xl`
- ✅ Sticky: `sticky top-0 z-50`
- ✅ Shadow: `shadow-lg`

---

### Mobile Bottom Navigation

```tsx
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-2xl border-t border-white/10 shadow-2xl md:hidden">
  <div className="flex items-center justify-around h-16 px-2">
    {navItems.map((item) => (
      <button
        key={item.id}
        className={cn(
          "flex flex-col items-center gap-0.5 flex-1 py-2 rounded-xl transition-all active:scale-95",
          isActive ? "text-orange-500 bg-white/5" : "text-white/50"
        )}
      >
        <item.icon className="h-5 w-5" />
        <span className="text-[10px] font-medium">{item.label}</span>
      </button>
    ))}
  </div>
</nav>
```

**Propiedades clave:**
- ✅ Background glass: `bg-black/80`
- ✅ Backdrop blur máximo: `backdrop-blur-2xl`
- ✅ Shadow superior: `shadow-2xl`
- ✅ Active state: `active:scale-95`

---

### Table Container

```tsx
<div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02] backdrop-blur-sm shadow-lg">
  <Table>
    <TableHeader>
      <TableRow className="border-white/10 hover:bg-transparent">
        <TableHead className="text-white/60">Columna</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="border-white/10 hover:bg-white/[0.06] cursor-pointer transition-colors duration-200">
        <TableCell>Contenido</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

**Propiedades clave:**
- ✅ Container: `rounded-2xl bg-white/[0.02]`
- ✅ Row hover: `hover:bg-white/[0.06]`
- ✅ Transition: `transition-colors duration-200`

---

### Mobile Cards (List Items)

```tsx
<button
  onClick={handleClick}
  className="w-full p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200 text-left backdrop-blur-sm active:scale-[0.98] shadow-sm"
>
  <div className="flex items-center justify-between gap-2">
    <p className="text-white font-medium text-xs truncate">Título</p>
    <Badge variant="outline" className="shrink-0">Estado</Badge>
  </div>
  <p className="text-white/40 text-xs mt-1">Descripción</p>
</button>
```

**Propiedades clave:**
- ✅ Padding: `p-3`
- ✅ Border radius: `rounded-xl`
- ✅ Glass background: `bg-white/[0.03]`
- ✅ Hover: `hover:bg-white/[0.06] hover:border-white/20`
- ✅ Active: `active:scale-[0.98]`

---

### Module Cards (Dashboard)

```tsx
<button
  onClick={() => navigate(path)}
  className="w-full h-28 md:h-40 p-4 md:p-6 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-blue-600/10 hover:border-white/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group text-left flex flex-col justify-between backdrop-blur-sm shadow-lg"
>
  <div className="p-2 md:p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors w-fit shadow-sm">
    <Icon className="h-4 w-4 md:h-6 md:w-6 text-white" />
  </div>
  <h3 className="text-white font-semibold text-xs md:text-base">Título</h3>
</button>
```

**Propiedades clave:**
- ✅ Border radius: `rounded-2xl`
- ✅ Gradient background
- ✅ Hover scale: `hover:scale-[1.02]`
- ✅ Icon container: `rounded-xl bg-white/5`
- ✅ Backdrop blur: `backdrop-blur-sm`

---

## 🎨 Paleta de Backgrounds

```css
/* Backgrounds principales */
.bg-main-screen          -> bg-black
.bg-card-subtle          -> bg-white/[0.02]
.bg-card-light           -> bg-white/[0.03]
.bg-input                -> bg-white/5
.bg-hover-subtle         -> bg-white/[0.06]
.bg-hover-medium         -> bg-white/10
.bg-active               -> bg-white/20

/* Con glass effect */
.bg-header              -> bg-black/60 backdrop-blur-xl
.bg-nav-mobile          -> bg-black/80 backdrop-blur-2xl
.bg-modal               -> bg-zinc-900/95 backdrop-blur-2xl
.bg-overlay             -> bg-black/90 backdrop-blur-sm
```

---

## 🎯 Paleta de Borders

```css
.border-default         -> border-white/10
.border-hover           -> border-white/20
.border-focus           -> border-white/30
.border-active          -> border-white/40

/* Borders de color (estados) */
.border-blue            -> border-blue-500/30
.border-green           -> border-green-500/30
.border-red             -> border-red-500/30
.border-orange          -> border-orange-500/30
```

---

## ✨ Efectos y Transiciones

### Shadows

```css
.shadow-sm              -> Elementos pequeños (badges, small buttons)
.shadow-lg              -> Cards, containers principales
.shadow-2xl             -> Modales, overlays importantes
```

### Backdrop Blur

```css
.backdrop-blur-sm       -> Elements sutiles (cards, inputs)
.backdrop-blur-xl       -> Headers, navegación principal
.backdrop-blur-2xl      -> Modales, bottom navigation
```

### Transitions

```css
/* Standard para la mayoría de elementos */
.transition-all .duration-200

/* Solo colores (para rows, hover states) */
.transition-colors .duration-200

/* Transforms específicos */
.transition-transform .duration-150
```

### Scale Effects

```css
/* Hover para cards grandes */
.hover:scale-[1.02]

/* Active para todos los elementos clickeables */
.active:scale-[0.98]

/* Active para navegación móvil */
.active:scale-95
```

---

## 🎭 Estados Interactivos

### Hover States

```tsx
// Botones
hover:bg-white/90           // Para botones blancos
hover:bg-white/10           // Para botones outline
hover:bg-white/[0.06]       // Para cards y rows

// Borders
hover:border-white/20       // Sutil
hover:border-white/30       // Más visible
hover:border-white/40       // Muy visible
```

### Focus States

```tsx
// Inputs, Selects, Textareas
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-white/20
focus-visible:ring-offset-0
focus-visible:border-white/30
```

### Active States

```tsx
// Todos los elementos clickeables
active:scale-[0.98]

// Navegación móvil
active:scale-95

// Añadir background en active
active:bg-white/5
```

---

## 📏 Espaciado Estándar

### Padding

```
Elemento               | Padding      | Uso
-----------------------|--------------|------------------
Badges                 | px-3 py-1    | Badges de estado
Small buttons          | px-3 py-2    | Botones pequeños
Default buttons        | px-4 py-2    | Botones normales
Large buttons          | px-8         | CTAs importantes
Mobile cards           | p-3          | Tarjetas móviles
Desktop cards          | p-4 md:p-6   | Tarjetas desktop
Modal content          | p-4 sm:p-6   | Contenido modales
```

### Gap

```
Contexto               | Gap          | Uso
-----------------------|--------------|------------------
Iconos en botones      | gap-2        | Icon + texto
Cards en grid          | gap-3 md:gap-4 | Grid de tarjetas
Form fields            | gap-3        | Campos de formulario
Sections               | gap-4 md:gap-6 | Secciones principales
```

---

## 🎯 Tipografía

### Tamaños

```tsx
// Mobile cards
text-xs              -> Texto principal en cards móviles
text-[10px]         -> Texto secundario muy pequeño
text-[9px]          -> Badges super pequeños

// Desktop
text-sm             -> Texto normal
text-base           -> Títulos pequeños
text-lg             -> Títulos medianos
text-xl md:text-2xl -> Títulos grandes
```

### Colores

```tsx
text-white              -> Texto principal
text-white/80           -> Texto importante secundario
text-white/60           -> Texto de apoyo
text-white/40           -> Placeholders, texto terciario
text-white/30           -> Texto deshabilitado
```

---

## 🚀 Checklist para Nuevos Componentes

Al crear un nuevo componente, verificar:

- [ ] **Border Radius** apropiado según tipo de elemento
- [ ] **Background** con opacity y backdrop-blur si aplica
- [ ] **Border** con `border-white/10` por defecto
- [ ] **Hover state** con cambio visual claro
- [ ] **Active state** con `active:scale-[0.98]`
- [ ] **Focus state** para elementos interactivos
- [ ] **Transition** con `duration-200`
- [ ] **Shadow** apropiada según importancia
- [ ] **Responsive** con clases sm/md/lg
- [ ] **Contraste** suficiente para accesibilidad

---

## 🔍 Ejemplos de Páginas Completas

### Lista de Clientes/Proyectos/Presupuestos

```tsx
<div className="min-h-screen bg-black pb-mobile-nav">
  {/* Header con glass effect */}
  <NexoHeader title="Título" userId={userId} />
  
  <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
    {/* Search bar */}
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
      <Input
        placeholder="Buscar..."
        className="pl-10 bg-white/5 border-white/10 text-white rounded-xl"
      />
    </div>

    {/* Mobile Cards */}
    <div className="md:hidden space-y-2">
      {items.map((item) => (
        <button
          key={item.id}
          className="w-full p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200 text-left backdrop-blur-sm active:scale-[0.98] shadow-sm"
        >
          {/* Contenido */}
        </button>
      ))}
    </div>

    {/* Desktop Table */}
    <div className="hidden md:block rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02] backdrop-blur-sm shadow-lg">
      <Table>
        {/* Tabla */}
      </Table>
    </div>
  </main>

  <MobileBottomNav userId={userId} />
</div>
```

---

## 📚 Referencias Rápidas

### Archivo de Estilos Base
📄 `src/index.css` - Variables CSS y estilos globales

### Componentes UI
📁 `src/components/ui/` - Todos los componentes base

### Componentes NexoAV
📁 `src/pages/nexo_av/components/` - Componentes específicos de NexoAV

### Configuración Tailwind
📄 `tailwind.config.ts` - Configuración de colores y temas

---

## 🎓 Recursos y Herramientas

### Herramientas de Desarrollo
- **Tailwind CSS IntelliSense** - VSCode extension
- **Tailwind CSS Playground** - Probar clases online
- **Chrome DevTools** - Inspeccionar backdrop-blur y shadows

### Inspiración de Diseño
- Apple Design Resources
- iOS Human Interface Guidelines
- Glassmorphism generators

---

## ⚠️ Notas Importantes

### Performance
- Backdrop blur puede ser costoso en dispositivos antiguos
- Usar blur moderado (sm, xl, 2xl) en lugar de blur máximo
- Evitar backdrop-blur en elementos que se animen constantemente

### Accesibilidad
- Mantener contraste mínimo de 4.5:1 para texto
- Focus states siempre visibles
- Touch targets de al menos 44x44px en móvil

### Browser Support
- Backdrop blur soportado en navegadores modernos
- Fallback: background semi-transparente sin blur funciona bien

---

## 📝 Mantenimiento

### Actualizar esta Guía
Al añadir nuevos componentes o patrones, documentar aquí con:
1. Código de ejemplo
2. Propiedades clave
3. Casos de uso
4. Screenshots si es relevante

### Testing
- Probar en Chrome, Firefox, Safari
- Verificar en móvil (iOS y Android)
- Validar contraste y accesibilidad
- Revisar rendimiento en DevTools

---

**Última actualización:** Enero 2026  
**Versión:** 1.0  
**Autor:** Sistema de Diseño NexoAV
