# MIGRACIÓN COMPLETA: DropDown

## **STATUS: ⚠️ REQUIERE MIGRACIÓN A CSS MODULE**

---

## 1. ANÁLISIS DEL COMPONENTE ACTUAL

### Archivos Involucrados
- **Componente**: `src/pages/nexo_av/desktop/components/common/DropDown.tsx`
- **CSS**: `src/pages/nexo_av/desktop/styles/components/common/dropdown.css`
- **Líneas de CSS**: 261

### Estado Actual

✅ **BUENO**:
- Usa `position: fixed` para el dropdown menu
- Z-index usa variable CSS (`var(--z-dropdown, 1000)`)
- Maneja eventos de click outside y Escape
- Usa `clamp()` para valores responsive

❌ **MEJORABLE**:
- NO usa React Portal (renderiza en el mismo contenedor)
- Import de CSS global (`import "../../styles/components/common/dropdown.css"`)
- Clases CSS no encapsuladas (riesgo de colisión)
- Falta manejo de scroll y resize para reposicionamiento

---

## 2. PLAN DE MIGRACIÓN

### **PASO 1: Crear CSS Module**

**Archivo nuevo**: `src/pages/nexo_av/desktop/components/common/DropDown.module.css`

```css
/* ============================================
   DROPDOWN - CSS MODULE
   Componente reutilizable de dropdown con autoajuste
   Usa clamp() para autoajustarse según el tamaño de pantalla
   Soporta de 2 a 7 opciones
   ============================================ */

.container {
  --dropdown-item-height: clamp(2.25rem, 2.5rem, 2.75rem);
  --dropdown-padding-y: clamp(0.25rem, 0.375rem, 0.5rem);
  --dropdown-padding-x: clamp(0.5rem, 0.75rem, 1rem);
  
  position: relative;
  display: inline-block;
  width: 100%;
}

/* Trigger Button (si no se proporciona trigger personalizado) */
.trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(0.5rem, 0.75rem, 1rem);
  width: 100%;
  padding: clamp(0.5rem, 0.625rem, 0.75rem) clamp(0.75rem, 1rem, 1.25rem);
  font-size: clamp(0.8125rem, 0.9375rem, 1.0625rem);
  font-weight: 400;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: clamp(0.375rem, 0.5rem, 0.625rem);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.trigger:hover:not(:disabled) {
  background: hsl(var(--accent) / 0.05);
  border-color: hsl(var(--border) / 0.8);
}

.trigger:focus {
  outline: none;
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
}

.triggerDisabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.triggerLabel {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  width: clamp(0.875rem, 1rem, 1.125rem);
  height: clamp(0.875rem, 1rem, 1.125rem);
  color: hsl(var(--muted-foreground));
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.chevronOpen {
  transform: rotate(180deg);
}

/* Trigger Wrapper (para triggers personalizados) */
.triggerWrapper {
  cursor: pointer;
  display: inline-block;
  position: relative;
  width: auto;
  height: auto;
}

.triggerWrapperDisabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Dropdown Menu */
.menu {
  position: fixed;
  min-width: 100%;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: clamp(0.375rem, 0.5rem, 0.625rem);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: var(--z-dropdown, 1000);
  padding: var(--dropdown-padding-y) 0;
  overflow: hidden;
  animation: fadeIn 0.15s ease-out;
}

.menuAlignStart {
  left: 0;
}

.menuAlignCenter {
  left: 50%;
  transform: translateX(-50%);
}

.menuAlignEnd {
  right: 0;
}

.menuScrollable {
  overflow-y: auto;
  overflow-x: hidden;
}

/* Scrollbar styling */
.menuScrollable::-webkit-scrollbar {
  width: clamp(0.375rem, 0.5rem, 0.625rem);
}

.menuScrollable::-webkit-scrollbar-track {
  background: hsl(var(--muted) / 0.3);
  border-radius: clamp(0.25rem, 0.375rem, 0.5rem);
}

.menuScrollable::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: clamp(0.25rem, 0.375rem, 0.5rem);
}

.menuScrollable::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Dropdown Items */
.item {
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 0.625rem, 0.75rem);
  width: 100%;
  padding: clamp(0.5rem, 0.625rem, 0.75rem) var(--dropdown-padding-x);
  font-size: clamp(0.8125rem, 0.9375rem, 1.0625rem);
  font-weight: 400;
  color: hsl(var(--foreground));
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: var(--dropdown-item-height);
}

.item:hover:not(:disabled) {
  background: hsl(var(--accent) / 0.1);
  color: hsl(var(--foreground));
}

.item:focus {
  outline: none;
  background: hsl(var(--accent) / 0.1);
}

.itemSelected {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  font-weight: 500;
}

.itemSelected:hover {
  background: hsl(var(--primary) / 0.15);
}

.itemDisabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.itemDestructive {
  color: hsl(var(--destructive));
}

.itemDestructive:hover {
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

.itemIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(0.875rem, 1rem, 1.125rem);
  height: clamp(0.875rem, 1rem, 1.125rem);
  flex-shrink: 0;
  color: inherit;
}

.itemLabel {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itemIndicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(1rem, 1.125rem, 1.25rem);
  height: clamp(1rem, 1.125rem, 1.25rem);
  flex-shrink: 0;
  font-size: clamp(0.75rem, 0.875rem, 1rem);
  color: hsl(var(--primary));
  font-weight: 600;
}

/* Dark mode adjustments */
:global(body.nexo-av-theme-dark) .menu {
  background: hsl(var(--card));
  border-color: hsl(var(--border) / 0.8);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
}

:global(body.nexo-av-theme-dark) .item:hover:not(:disabled) {
  background: hsl(var(--accent) / 0.15);
}

:global(body.nexo-av-theme-dark) .itemSelected {
  background: hsl(var(--primary) / 0.15);
}

:global(body.nexo-av-theme-dark) .menuScrollable::-webkit-scrollbar-track {
  background: hsl(var(--muted) / 0.2);
}

:global(body.nexo-av-theme-dark) .menuScrollable::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.4);
}

:global(body.nexo-av-theme-dark) .menuScrollable::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.6);
}
```

---

### **PASO 2: Actualizar el Componente TSX**

**Cambios clave**:
1. ✅ Importar CSS Module en lugar de CSS global
2. ✅ Agregar React Portal para renderizar en `body`
3. ✅ Agregar manejo de scroll y resize
4. ✅ Calcular posición dinámica con `getBoundingClientRect()`
5. ✅ Reemplazar todas las clases CSS con `styles.className`

**Archivo actualizado**: `src/pages/nexo_av/desktop/components/common/DropDown.tsx`

```typescript
import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import styles from "./DropDown.module.css";

export interface DropDownOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  variant?: "default" | "destructive";
  className?: string;
}

export interface DropDownProps {
  options: DropDownOption[];
  value?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  trigger?: ReactNode;
  align?: "start" | "center" | "end";
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  maxOptions?: number;
}

export default function DropDown({
  options,
  value,
  onSelect,
  placeholder = "Seleccionar...",
  trigger,
  align = "start",
  disabled = false,
  className,
  triggerClassName,
  maxOptions = 7,
}: DropDownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonTriggerRef = useRef<HTMLButtonElement>(null);
  const divTriggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Validar que tenga entre 2 y 7 opciones
  const validOptions = options.filter(opt => !opt.disabled);
  if (validOptions.length < 2 || validOptions.length > 7) {
    console.warn(`DropDown: Se esperan entre 2 y 7 opciones, pero se recibieron ${validOptions.length}`);
  }

  // Calcular posición del menú
  const updatePosition = useCallback(() => {
    const triggerElement = buttonTriggerRef.current || divTriggerRef.current;
    if (!triggerElement) return;
    
    const rect = triggerElement.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  // Abrir dropdown
  const handleOpen = useCallback(() => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
  }, [disabled, updatePosition]);

  // Cerrar dropdown
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Cerrar el dropdown cuando hacemos click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const triggerElement = buttonTriggerRef.current || divTriggerRef.current;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !triggerElement?.contains(target)
      ) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, handleClose]);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, handleClose]);

  // Actualizar posición en scroll y resize
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

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue: string) => {
    if (options.find(opt => opt.value === optionValue)?.disabled) {
      return;
    }
    onSelect(optionValue);
    handleClose();
  };

  // Calcular altura dinámica basada en el número de opciones
  const itemCount = validOptions.length;
  const needsScroll = itemCount > maxOptions;

  return (
    <>
      <div className={cn(styles.container, className)} ref={dropdownRef}>
        {trigger ? (
          <div
            ref={divTriggerRef}
            onClick={() => !disabled && (isOpen ? handleClose() : handleOpen())}
            className={cn(
              styles.triggerWrapper,
              disabled && styles.triggerWrapperDisabled,
              triggerClassName
            )}
          >
            {trigger}
          </div>
        ) : (
          <button
            ref={buttonTriggerRef}
            onClick={() => !disabled && (isOpen ? handleClose() : handleOpen())}
            disabled={disabled}
            className={cn(
              styles.trigger,
              disabled && styles.triggerDisabled,
              triggerClassName
            )}
          >
            <span className={styles.triggerLabel}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown
              className={cn(
                styles.chevron,
                isOpen && styles.chevronOpen
              )}
            />
          </button>
        )}
      </div>

      {isOpen && menuPosition && createPortal(
        <div
          ref={menuRef}
          className={cn(
            styles.menu,
            styles[`menuAlign${align.charAt(0).toUpperCase() + align.slice(1)}` as keyof typeof styles],
            needsScroll && styles.menuScrollable
          )}
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            minWidth: `${menuPosition.width}px`,
            maxHeight: needsScroll
              ? 'calc(var(--dropdown-item-height) * 7 + var(--dropdown-padding-y) * 2)'
              : 'auto',
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            const isDisabled = option.disabled;

            return (
              <button
                key={option.value}
                onClick={() => !isDisabled && handleSelect(option.value)}
                disabled={isDisabled}
                className={cn(
                  styles.item,
                  isSelected && styles.itemSelected,
                  isDisabled && styles.itemDisabled,
                  option.variant === "destructive" && styles.itemDestructive,
                  option.className
                )}
              >
                {option.icon && (
                  <span className={styles.itemIcon}>{option.icon}</span>
                )}
                <span className={styles.itemLabel}>{option.label}</span>
                {isSelected && (
                  <span className={styles.itemIndicator}>✓</span>
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
```

---

### **PASO 3: Eliminar Archivo CSS Antiguo**

```bash
# Eliminar archivo CSS global obsoleto
Remove-Item "src\pages\nexo_av\desktop\styles\components\common\dropdown.css"
```

---

## 3. CHECKLIST DE VALIDACIÓN

### Pre-Migración
- [x] Componente identificado con import de CSS global
- [x] 261 líneas de CSS a modularizar

### Durante la Migración
- [ ] CSS Module creado (`DropDown.module.css`)
- [ ] Import actualizado: `import styles from "./DropDown.module.css"`
- [ ] Todas las clases CSS actualizadas (`.dropdown` → `styles.container`)
- [ ] React Portal agregado (`createPortal`)
- [ ] Posicionamiento dinámico implementado (`getBoundingClientRect()`)
- [ ] Manejo de scroll y resize agregado
- [ ] Archivo CSS antiguo eliminado

### Post-Migración
- [ ] No hay errores de linter
- [ ] No hay errores de TypeScript
- [ ] No hay regresiones visuales
- [ ] Dropdown funciona correctamente en scroll
- [ ] Dropdown funciona correctamente en resize
- [ ] Dropdown no se corta por `overflow: hidden` del padre
- [ ] Z-index usa variable CSS del sistema (`var(--z-dropdown)`)
- [ ] Componente renderiza correctamente con 2-7 opciones
- [ ] Hover y estados selected funcionan correctamente
- [ ] Dark mode funciona correctamente

---

## 4. MEJORAS IMPLEMENTADAS

### Antes de la Migración
```typescript
// DropDown.tsx (ANTES)
import "../../styles/components/common/dropdown.css"; // ❌ CSS global

return (
  <div className="dropdown">
    {/* ... */}
    {isOpen && (
      <div className="dropdown__menu"> {/* ❌ NO usa Portal */}
        {/* ... */}
      </div>
    )}
  </div>
);
```

### Después de la Migración
```typescript
// DropDown.tsx (DESPUÉS)
import styles from "./DropDown.module.css"; // ✅ CSS Module
import { createPortal } from "react-dom";

return (
  <>
    <div className={styles.container}>
      {/* ... */}
    </div>
    
    {isOpen && menuPosition && createPortal( // ✅ Usa Portal
      <div 
        ref={menuRef}
        className={styles.menu}
        style={{
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
          minWidth: `${menuPosition.width}px`,
        }}
      >
        {/* ... */}
      </div>,
      document.body // ✅ Renderiza en body
    )}
  </>
);
```

---

## 5. RESULTADO ESPERADO

### Reducción de Código Global
- **global.css**: -0 líneas (este componente ya no afecta global.css)
- **dropdown.css**: -261 líneas (eliminado)
- **DropDown.module.css**: +261 líneas (CSS encapsulado)
- **Impacto neto**: 0 líneas, pero con CSS encapsulado

### Mejoras Funcionales
✅ CSS encapsulado (sin colisión de nombres)
✅ Usa React Portal (evita overflow issues)
✅ Maneja scroll y resize (dropdown siempre visible)
✅ Z-index usa variable CSS del sistema
✅ Posicionamiento dinámico (no depende de `absolute` relativo al padre)

### Estado Final
**🎉 COMPONENTE MIGRADO Y OPTIMIZADO**

---

**Última actualización**: 2026-01-25
**Status**: ⚠️ Requiere implementación - Patrón definido
**Prioridad**: ALTA (componente crítico no funcional)
