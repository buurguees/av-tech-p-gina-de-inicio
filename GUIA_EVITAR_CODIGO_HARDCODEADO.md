# Guía para Evitar Código Hardcodeado

**Fecha:** 24 de enero de 2026  
**Objetivo:** Establecer reglas y mejores prácticas para evitar valores hardcodeados en componentes UI

---

## Principios Fundamentales

### 1. Usar Variables CSS del Tema

**❌ INCORRECTO:**
```typescript
className="bg-zinc-900/95 text-white border-white/10"
```

**✅ CORRECTO:**
```typescript
className="bg-popover text-popover-foreground border-border"
```

### 2. Usar Variables CSS para Estados de Focus/Hover

**❌ INCORRECTO:**
```typescript
className="focus:ring-white/20 focus:border-white/30 hover:bg-white/10"
```

**✅ CORRECTO:**
```typescript
className="focus:ring-ring focus:border-ring hover:bg-accent"
```

### 3. Usar Variables CSS para Z-Index

**❌ INCORRECTO:**
```typescript
className="z-[10001]"
```

**✅ CORRECTO:**
```typescript
className="z-50" // O dejar que CSS global lo maneje con !important
```

---

## Variables CSS Disponibles

### Colores de Fondo
- `bg-background` - Fondo principal
- `bg-card` - Fondo de tarjetas
- `bg-popover` - Fondo de popovers/dropdowns
- `bg-secondary` - Fondo secundario
- `bg-accent` - Fondo de acento (hover states)
- `bg-muted` - Fondo muted

### Colores de Texto
- `text-foreground` - Texto principal
- `text-popover-foreground` - Texto en popovers
- `text-muted-foreground` - Texto muted
- `text-accent-foreground` - Texto en estados de acento

### Bordes
- `border-border` - Borde estándar
- `border-input` - Borde de inputs
- `border-ring` - Borde de focus ring

### Estados de Focus/Ring
- `ring-ring` - Color del ring de focus
- `border-ring` - Borde cuando está en focus

---

## Componentes UI Base (shadcn/ui)

Los componentes en `src/components/ui/` deben seguir estas reglas:

### Select
- ✅ Usar `bg-popover`, `text-popover-foreground`, `border-border`
- ✅ Usar `focus:ring-ring`, `focus:border-ring`
- ✅ Usar `z-50` en lugar de `z-[10001]`

### Dropdown Menu
- ✅ Usar `bg-popover`, `text-popover-foreground`, `border-border`
- ✅ Usar `hover:bg-accent`, `focus:bg-accent`
- ✅ Usar `z-50` en lugar de `z-[10001]`

### Input / Textarea
- ✅ Usar `focus-visible:ring-ring`, `focus-visible:border-ring`
- ✅ Usar `bg-background`, `border-input`

### Dialog
- ✅ Usar `bg-background/90` en lugar de `bg-black/90`
- ✅ Mantener `z-[9999]` para overlays si es necesario

---

## CSS Global y Overrides

El archivo `src/pages/nexo_av/desktop/styles/global.css` contiene overrides para asegurar que los componentes respeten el tema:

### Selectores Mejorados

Usar selectores más específicos para capturar componentes de Radix UI:

```css
/* ✅ CORRECTO - Selector específico */
body.nexo-av-theme [data-radix-select-content],
body.nexo-av-theme [class*="SelectContent"][class*="rounded"] {
  background-color: hsl(var(--card)) !important;
}

/* ❌ INCORRECTO - Selector muy genérico */
body.nexo-av-theme [class*="SelectContent"] {
  background-color: hsl(var(--card)) !important;
}
```

### Añadir Overrides Faltantes

Siempre añadir overrides para estados hover/focus que puedan faltar:

```css
/* Ejemplo: DropdownMenuItem text color */
body.nexo-av-theme [class*="DropdownMenuItem"] {
  color: hsl(var(--foreground)) !important;
}

body.nexo-av-theme [class*="DropdownMenuItem"]:hover {
  background-color: hsl(var(--accent)) !important;
  color: hsl(var(--accent-foreground)) !important;
}
```

---

## Checklist para Nuevos Componentes

Antes de crear o modificar un componente UI, verificar:

- [ ] ¿Usa variables CSS del tema en lugar de valores hardcodeados?
- [ ] ¿Los estados hover/focus usan variables CSS?
- [ ] ¿El z-index es consistente con el resto de la aplicación?
- [ ] ¿Hay overrides CSS globales necesarios para este componente?
- [ ] ¿El componente funciona correctamente en modo light y dark?

---

## Ejemplos de Corrección

### Antes (Hardcodeado)
```typescript
<SelectContent className="z-[10001] bg-zinc-900/95 text-white border-white/10">
```

### Después (Variables CSS)
```typescript
<SelectContent className="z-50 bg-popover text-popover-foreground border-border">
```

---

## Notas Técnicas

1. **Portals de Radix UI**: Los componentes que usan `Portal` se renderizan en `document.body`, por lo que deben heredar correctamente el contexto del tema. Asegurar que `useNexoAvTheme` se ejecute antes de que los Portals se rendericen.

2. **Especificidad CSS**: Los selectores CSS globales deben tener suficiente especificidad para sobrescribir estilos de componentes cuando sea necesario. Usar `data-radix-*` attributes cuando sea posible.

3. **Z-Index**: Mantener consistencia:
   - `z-50` para overlays y dropdowns
   - `z-[9999]` solo para overlays de dialogs cuando sea necesario
   - Dejar que CSS global maneje valores específicos con `!important` cuando sea necesario

---

**Última actualización:** 24 de enero de 2026
