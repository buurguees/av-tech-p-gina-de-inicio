import { useState, useEffect, useRef, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import TextInput from './TextInput';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsNexoAvDarkTheme } from '../../hooks/useNexoAvThemeMode';
import '../../styles/components/common/search-bar.css';

export interface SearchResult<T = any> {
  id: string | number;
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  data: T;
}

export interface SearchBarProps<T = any> {
  /** Valor del input */
  value: string;
  /** Callback cuando cambia el valor del input */
  onChange: (value: string) => void;
  /** Lista de elementos a buscar */
  items: T[];
  /** Función para extraer el texto de búsqueda de cada elemento */
  getSearchText: (item: T) => string;
  /** Función para convertir un elemento en un SearchResult */
  renderResult: (item: T) => SearchResult<T>;
  /** Callback cuando se selecciona un resultado */
  onSelectResult?: (result: SearchResult<T>) => void;
  /** Placeholder del input */
  placeholder?: string;
  /** Clase CSS adicional para el contenedor */
  className?: string;
  /** Clase CSS adicional para el input */
  inputClassName?: string;
  /** Mostrar icono de búsqueda */
  showSearchIcon?: boolean;
  /** Mostrar botón de limpiar */
  showClearButton?: boolean;
  /** Número máximo de resultados a mostrar */
  maxResults?: number;
  /** Debounce en milisegundos para la búsqueda */
  debounceMs?: number;
  /** Texto cuando no hay resultados */
  emptyMessage?: string;
  /** Deshabilitar el componente */
  disabled?: boolean;
}

export default function SearchBar<T = any>({
  value,
  onChange,
  items,
  getSearchText,
  renderResult,
  onSelectResult,
  placeholder = "Buscar...",
  className,
  inputClassName,
  showSearchIcon = true,
  showClearButton = true,
  maxResults = 10,
  debounceMs = 200,
  emptyMessage = "No se encontraron resultados",
  disabled = false,
}: SearchBarProps<T>) {
  const [searchResults, setSearchResults] = useState<SearchResult<T>[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDark = useIsNexoAvDarkTheme();

  // Calcular posición del dropdown
  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  // Función de búsqueda con debounce
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const queryLower = query.toLowerCase().trim();
    const keywords = queryLower.split(/\s+/).filter(k => k.length > 0);

    // Filtrar items que contengan todos los keywords
    const filtered = items
      .filter(item => {
        const searchText = getSearchText(item).toLowerCase();
        return keywords.every(keyword => searchText.includes(keyword));
      })
      .slice(0, maxResults)
      .map(item => renderResult(item));

    setSearchResults(filtered);
    setShowResults(filtered.length > 0 || query.trim().length > 0);
    
    if (filtered.length > 0 || query.trim().length > 0) {
      requestAnimationFrame(() => {
        updateDropdownPosition();
      });
    }
  }, [items, getSearchText, renderResult, maxResults, updateDropdownPosition]);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, performSearch, debounceMs]);

  // Actualizar posición cuando se muestran resultados
  useEffect(() => {
    if (showResults && isFocused) {
      updateDropdownPosition();
    }
  }, [showResults, isFocused, updateDropdownPosition]);

  // Actualizar posición en scroll y resize
  useEffect(() => {
    if (!showResults || !dropdownPosition) return;

    const handleScrollOrResize = () => {
      updateDropdownPosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showResults, dropdownPosition, updateDropdownPosition]);

  // Cerrar resultados al hacer clic fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current && 
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
        setHighlightedIndex(-1);
      }
    };

    const handleEscapeKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && showResults) {
        setShowResults(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showResults]);

  // Manejar navegación con teclado
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
          handleSelectResult(searchResults[highlightedIndex]);
        }
        break;
    }
  };

  const handleSelectResult = (result: SearchResult<T>) => {
    onSelectResult?.(result);
    setShowResults(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onChange('');
    setSearchResults([]);
    setShowResults(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (value.trim() && searchResults.length > 0) {
      setShowResults(true);
      updateDropdownPosition();
    }
  };

  const handleBlur = () => {
    // Delay para permitir clic en resultados
    setTimeout(() => {
      setIsFocused(false);
      if (!resultsRef.current?.contains(document.activeElement)) {
        setShowResults(false);
      }
    }, 200);
  };

  return (
    <>
      <div ref={containerRef} className={cn("search-bar", className)}>
        <div className="search-bar__container">
          {showSearchIcon && (
            <Search className="search-bar__icon" />
          )}
          <TextInput
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            size="md"
            variant="default"
            className={cn("search-bar__input", inputClassName)}
          />
          {showClearButton && value && (
            <button
              type="button"
              onClick={handleClear}
              className="search-bar__clear"
              aria-label="Limpiar búsqueda"
            >
              <X className="search-bar__clear-icon" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown de resultados */}
      {showResults && dropdownPosition && isFocused && createPortal(
        <div
          ref={resultsRef}
          className={cn(
            "search-bar__results",
            isDark && "search-bar__results--dark"
          )}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${Math.max(dropdownPosition.width, 300)}px`,
          }}
        >
          {searchResults.length === 0 ? (
            <div className="search-bar__empty">
              <p className="search-bar__empty-message">{emptyMessage}</p>
            </div>
          ) : (
            <div className="search-bar__results-list">
              {searchResults.map((result, index) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleSelectResult(result)}
                  className={cn(
                    "search-bar__result-item",
                    index === highlightedIndex && "search-bar__result-item--highlighted"
                  )}
                >
                  {result.icon && (
                    <div className="search-bar__result-icon">
                      {result.icon}
                    </div>
                  )}
                  <div className="search-bar__result-content">
                    <p className="search-bar__result-label">{result.label}</p>
                    {result.subtitle && (
                      <p className="search-bar__result-subtitle">{result.subtitle}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
