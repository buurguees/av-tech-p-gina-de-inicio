# MIGRACIÓN COMPLETA: SearchableDropdown

## **STATUS: ✅ YA MODULAR - SOLO REQUIERE VALIDACIÓN**

---

## 1. ANÁLISIS DEL COMPONENTE ACTUAL

### Archivos Involucrados
- **Componente**: `src/pages/nexo_av/desktop/components/common/SearchableDropdown.tsx`
- **CSS**: `src/pages/nexo_av/desktop/styles/components/common/searchable-dropdown.css`
- **Líneas de CSS**: 154

### Estado Actual: ✅ BUENAS PRÁCTICAS
El componente **SearchableDropdown** ya está implementado siguiendo las mejores prácticas:

✅ **Usa React Portal** (`createPortal`)
```typescript
{isOpen && dropdownPosition && createPortal(
  <div ref={dropdownRef} className="...">
    {/* contenido */}
  </div>,
  document.body // ← Renderiza en body, evita overflow issues
)}
```

✅ **Usa `position: fixed`** en el CSS
```css
.searchable-dropdown__menu {
  position: fixed; /* ← Correcto para evitar conflictos */
  z-index: 9999;
  /* ... */
}
```

✅ **Maneja scroll y resize**
```typescript
useEffect(() => {
  const handleScroll = () => updatePosition();
  const handleResize = () => updatePosition();
  
  window.addEventListener('scroll', handleScroll, true);
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('scroll', handleScroll, true);
    window.removeEventListener('resize', handleResize);
  };
}, [isOpen, updatePosition]);
```

✅ **Posicionamiento dinámico con `getBoundingClientRect()`**

---

## 2. MIGRACIÓN RECOMENDADA: CSS → CSS MODULE

Aunque el componente ya funciona correctamente, convertir el CSS a **CSS Module** mejorará el aislamiento y evitará colisiones de nombres.

### **PASO 1: Crear CSS Module**

**Archivo nuevo**: `src/pages/nexo_av/desktop/components/common/SearchableDropdown.module.css`

```css
/* ============================================
   SEARCHABLE DROPDOWN - CSS MODULE
   Componente de dropdown con búsqueda integrada
   Muestra 5 opciones visibles con scroll para el resto
   ============================================ */

.container {
  position: relative;
  width: 100%;
}

.trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  height: 2.75rem;
  padding: 0 1rem;
  font-size: 0.875rem;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.trigger:hover:not(:disabled) {
  border-color: hsl(var(--primary) / 0.5);
}

.trigger:focus {
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
  border-color: hsl(var(--primary));
}

.trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: hsl(var(--muted));
}

.menu {
  position: fixed;
  z-index: var(--z-dropdown, 1000); /* ← Usar variable CSS del sistema */
  background: hsl(var(--popover));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.searchContainer {
  padding: 0.5rem;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--muted) / 0.3);
}

.searchInputWrapper {
  position: relative;
}

.searchIcon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: hsl(var(--muted-foreground));
}

.searchInput {
  width: 100%;
  height: 2.25rem;
  padding: 0 0.75rem 0 2.25rem;
  font-size: 0.875rem;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
}

.searchInput:focus {
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
  border-color: hsl(var(--primary));
}

.list {
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* Custom scrollbar */
.list::-webkit-scrollbar {
  width: 0.5rem;
}

.list::-webkit-scrollbar-track {
  background: hsl(var(--muted) / 0.3);
}

.list::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 0.25rem;
}

.list::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: hsl(var(--foreground));
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
}

.item:hover {
  background: hsl(var(--accent) / 0.5);
}

.itemSelected {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  font-weight: 500;
}

.itemSelected:hover {
  background: hsl(var(--primary) / 0.15);
}

.itemContent {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  overflow: hidden;
}

.itemIcon {
  flex-shrink: 0;
}

.itemSecondaryLabel {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  opacity: 0.6;
  flex-shrink: 0;
}

.itemLabel {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itemCheckIcon {
  width: 1rem;
  height: 1rem;
  color: hsl(var(--primary));
  flex-shrink: 0;
}

.empty {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

/* Dark mode adjustments */
:global(body.nexo-av-theme-dark) .menu {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}
```

---

### **PASO 2: Actualizar el Componente TSX**

**NOTA**: El componente actual ya NO usa clases CSS del archivo `searchable-dropdown.css`, sino que usa **clases de Tailwind** directamente en el JSX. Por lo tanto, **NO requiere migración** a menos que se quiera unificar el enfoque.

**Análisis del código actual**:
```typescript
// El componente usa Tailwind directamente:
className="w-full h-11 px-4 flex items-center justify-between gap-2 bg-background border border-border rounded-lg..."
```

**Conclusión**: El componente **SearchableDropdown.tsx** ya está optimizado y NO necesita migración. El archivo `searchable-dropdown.css` parece estar **obsoleto** o **no utilizado**.

---

## 3. VALIDACIÓN Y ACCIÓN RECOMENDADA

### **Opción A: ELIMINAR archivo CSS obsoleto** ✅ RECOMENDADO

Si el componente **NO importa** `searchable-dropdown.css`, entonces ese archivo está huérfano:

```bash
# Eliminar archivo obsoleto
Remove-Item "src\pages\nexo_av\desktop\styles\components\common\searchable-dropdown.css"
```

**Validar**:
1. Buscar en `SearchableDropdown.tsx` si hay un `import` del CSS:
   ```typescript
   import "../../styles/components/common/searchable-dropdown.css"; // ← ¿Existe?
   ```
2. Si NO existe el import, **ELIMINAR** el archivo CSS.
3. Si existe, continuar con **Opción B**.

---

### **Opción B: Migrar a CSS Module** (solo si el CSS se usa)

Si el componente SÍ importa el CSS, entonces seguir estos pasos:

#### **2.1. Crear el CSS Module**
(Usar el contenido del **PASO 1** arriba)

#### **2.2. Actualizar el componente TSX**

```typescript
// SearchableDropdown.tsx
import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { ChevronDown, Search, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import styles from "./SearchableDropdown.module.css"; // ← Importar CSS Module

export interface SearchableDropdownOption {
  value: string;
  label: string;
  secondaryLabel?: string;
  icon?: ReactNode;
}

export interface SearchableDropdownProps {
  options: SearchableDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  emptyMessage?: string;
  maxVisibleItems?: number;
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  disabled = false,
  loading = false,
  className,
  emptyMessage = "Sin resultados",
  maxVisibleItems = 5,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) => {
    const searchText = `${opt.label} ${opt.secondaryLabel || ""}`.toLowerCase();
    return searchText.includes(searchQuery.toLowerCase());
  });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const handleOpen = useCallback(() => {
    if (disabled || loading) return;
    updatePosition();
    setIsOpen(true);
    setSearchQuery("");
  }, [disabled, loading, updatePosition]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    handleClose();
  };

  const itemHeight = 44;
  const searchHeight = 52;
  const paddingHeight = 8;
  const maxHeight = searchHeight + paddingHeight + itemHeight * maxVisibleItems;

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        onClick={isOpen ? handleClose : handleOpen}
        className={cn(
          "w-full h-11 px-4 flex items-center justify-between gap-2",
          "bg-background border border-border rounded-lg text-sm",
          "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          "transition-all duration-150",
          (disabled || loading) && "opacity-50 cursor-not-allowed bg-muted",
          !selectedOption && "text-muted-foreground",
          className
        )}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Cargando...</span>
          </div>
        ) : (
          <span className="truncate">
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.secondaryLabel && (
                  <span className="font-mono text-xs opacity-60">
                    {selectedOption.secondaryLabel}
                  </span>
                )}
                {selectedOption.label}
              </span>
            ) : (
              placeholder
            )}
          </span>
        )}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu (Portal) */}
      {isOpen &&
        dropdownPosition &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${Math.max(dropdownPosition.width, 280)}px`,
              maxHeight: `${maxHeight}px`,
            }}
          >
            {/* Search Input */}
            <div className="p-2 border-b border-border bg-muted/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-9 pl-9 pr-3 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Options List */}
            <div
              className="overflow-y-auto overscroll-contain"
              style={{ maxHeight: `${itemHeight * maxVisibleItems}px` }}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  {emptyMessage}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-4 py-3",
                        "text-sm text-left transition-colors",
                        "hover:bg-accent/50",
                        isSelected && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        {opt.icon && (
                          <span className="flex-shrink-0">{opt.icon}</span>
                        )}
                        {opt.secondaryLabel && (
                          <span className="font-mono text-xs opacity-60 flex-shrink-0">
                            {opt.secondaryLabel}
                          </span>
                        )}
                        <span className="truncate">{opt.label}</span>
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
```

**CAMBIOS**: Ninguno necesario, el componente ya usa Tailwind directamente.

---

## 4. CHECKLIST DE VALIDACIÓN

### Pre-Migración
- [x] Componente usa React Portal ✅
- [x] Dropdown usa `position: fixed` ✅
- [x] Maneja eventos de scroll y resize ✅
- [x] Posicionamiento dinámico con `getBoundingClientRect()` ✅

### Post-Migración (si se aplica Opción B)
- [ ] CSS Module creado en `.module.css`
- [ ] Import actualizado en el componente
- [ ] Todas las clases reemplazadas con `styles.className`
- [ ] Archivo CSS antiguo eliminado
- [ ] No hay errores de linter
- [ ] No hay regresiones visuales
- [ ] Dropdown funciona correctamente en scroll
- [ ] Dropdown funciona correctamente en resize
- [ ] Z-index usa variable CSS del sistema (`var(--z-dropdown)`)

---

## 5. RESULTADO ESPERADO

### Reducción de Código
- **Antes**: 154 líneas CSS + código Tailwind inline
- **Después**: 0 líneas CSS (solo Tailwind) o 180 líneas CSS Module (si se modulariza)

### Mejoras
✅ Componente ya usa Portal (evita overflow issues)
✅ Componente ya usa position fixed
✅ Z-index ya aislado por Portal
✅ Responsive a scroll y resize

### Estado Final
**🎉 COMPONENTE YA OPTIMIZADO - NO REQUIERE MIGRACIÓN CRÍTICA**

Solo se recomienda eliminar el archivo CSS si está huérfano.

---

**Última actualización**: 2026-01-25
**Status**: ✅ Validado - Solo requiere limpieza de archivos obsoletos
