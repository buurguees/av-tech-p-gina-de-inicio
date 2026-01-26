import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsNexoAvDarkTheme } from '../../hooks/useNexoAvThemeMode';
import '../../styles/components/common/searchable-select.css';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

export interface SearchableSelectProps {
  /** Valor seleccionado */
  value: string;
  /** Callback cuando cambia el valor */
  onChange: (value: string) => void;
  /** Lista de opciones */
  options: SearchableSelectOption[];
  /** Placeholder cuando no hay selección */
  placeholder?: string;
  /** Placeholder del input de búsqueda */
  searchPlaceholder?: string;
  /** Texto cuando no hay resultados */
  emptyMessage?: string;
  /** Deshabilitar el componente */
  disabled?: boolean;
  /** Estado de carga */
  loading?: boolean;
  /** Icono para mostrar en el trigger */
  icon?: React.ReactNode;
  /** Clase CSS adicional para el contenedor */
  className?: string;
  /** Texto alternativo cuando está deshabilitado */
  disabledText?: string;
}

const SearchableSelect = forwardRef<HTMLButtonElement, SearchableSelectProps>(({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Sin resultados",
  disabled = false,
  loading = false,
  icon,
  className,
  disabledText,
}, ref) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isDark = useIsNexoAvDarkTheme();

  // Encontrar la opción seleccionada
  const selectedOption = options.find(opt => opt.value === value);

  // Filtrar opciones basado en búsqueda
  const filteredOptions = searchQuery.trim()
    ? options.filter(opt => {
        const searchLower = searchQuery.toLowerCase();
        return (
          opt.label.toLowerCase().includes(searchLower) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(searchLower))
        );
      })
    : options;

  // Calcular posición del dropdown
  const updateDropdownPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 280),
      });
    }
  }, []);

  // Abrir dropdown
  const handleOpen = () => {
    if (disabled || loading) return;
    setOpen(true);
    setSearchQuery("");
    setHighlightedIndex(-1);
    requestAnimationFrame(() => {
      updateDropdownPosition();
      searchInputRef.current?.focus();
    });
  };

  // Cerrar dropdown
  const handleClose = () => {
    setOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  };

  // Seleccionar opción
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    handleClose();
  };

  // Navegación por teclado
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (filteredOptions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
    }
  };

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  // Actualizar posición en scroll/resize
  useEffect(() => {
    if (!open) return;

    const handleUpdate = () => updateDropdownPosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [open, updateDropdownPosition]);

  // Determinar texto del trigger
  const getTriggerText = () => {
    if (loading) return "Cargando...";
    if (disabled && disabledText) return disabledText;
    if (selectedOption) return selectedOption.label;
    return placeholder;
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={(node) => {
          (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type="button"
        onClick={handleOpen}
        disabled={disabled || loading}
        className={cn(
          "searchable-select__trigger",
          open && "searchable-select__trigger--open",
          (disabled || loading) && "searchable-select__trigger--disabled",
          className
        )}
      >
        <span className="searchable-select__trigger-content">
          {icon && <span className="searchable-select__trigger-icon">{icon}</span>}
          <span className={cn(
            "searchable-select__trigger-text",
            !selectedOption && "searchable-select__trigger-placeholder"
          )}>
            {getTriggerText()}
          </span>
          {selectedOption?.sublabel && (
            <span className="searchable-select__trigger-sublabel">{selectedOption.sublabel}</span>
          )}
        </span>
        <span className="searchable-select__trigger-chevron">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
          )}
        </span>
      </button>

      {/* Dropdown Portal */}
      {open && dropdownPosition && createPortal(
        <div
          ref={dropdownRef}
          className={cn(
            "searchable-select__dropdown",
            isDark && "searchable-select__dropdown--dark"
          )}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          {/* Search Input */}
          <div className="searchable-select__search">
            <Search className="searchable-select__search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="searchable-select__search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="searchable-select__search-clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="searchable-select__options">
            {filteredOptions.length === 0 ? (
              <div className="searchable-select__empty">{emptyMessage}</div>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "searchable-select__option",
                      isSelected && "searchable-select__option--selected",
                      isHighlighted && "searchable-select__option--highlighted"
                    )}
                  >
                    <span className="searchable-select__option-content">
                      {opt.icon && <span className="searchable-select__option-icon">{opt.icon}</span>}
                      {opt.sublabel && (
                        <span className="searchable-select__option-sublabel">{opt.sublabel}</span>
                      )}
                      <span className="searchable-select__option-label">{opt.label}</span>
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
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
});

SearchableSelect.displayName = "SearchableSelect";

export default SearchableSelect;
