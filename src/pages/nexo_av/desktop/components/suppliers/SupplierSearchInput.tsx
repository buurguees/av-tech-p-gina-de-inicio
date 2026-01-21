import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Building2, UserRound, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Supplier {
  id: string;
  company_name: string;
  tax_id: string | null;
}

interface Technician {
  id: string;
  company_name: string;
  tax_id: string | null;
  withholding_tax_rate: number | null;
}

interface SupplierSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectSupplier?: (supplier: Supplier) => void;
  onSelectTechnician?: (technician: Technician) => void;
  placeholder?: string;
  className?: string;
  entityType?: 'SUPPLIER' | 'TECHNICIAN' | 'BOTH';
  disabled?: boolean;
}

export default function SupplierSearchInput({
  value,
  onChange,
  onSelectSupplier,
  onSelectTechnician,
  placeholder = "Buscar proveedor o @buscar",
  className,
  entityType = 'BOTH',
  disabled = false,
}: SupplierSearchInputProps) {
  const [searchResults, setSearchResults] = useState<(Supplier | Technician)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);

  // Calculate dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  // Check if we're in search mode (starts with @)
  const searchMode = value.startsWith('@');
  const searchQuery = searchMode ? value.slice(1).trim() : '';

  const searchEntities = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 1) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    console.log(`Searching for: "${trimmedQuery}" (entityType: ${entityType})`);
    
    try {
      const results: (Supplier | Technician)[] = [];

      // Search suppliers if needed
      // No filtrar por status para encontrar todos (empresas, autónomos, excluyendo plantilla)
      if (entityType === 'SUPPLIER' || entityType === 'BOTH') {
        try {
          const { data: suppliersData, error: suppliersError } = await supabase.rpc('list_suppliers', {
            p_search: trimmedQuery || null,
            p_status: null, // Buscar todos los estados
          });

          if (suppliersError) {
            console.error('Error searching suppliers:', suppliersError);
          } else           if (suppliersData) {
            console.log(`Found ${suppliersData.length} suppliers for query: "${trimmedQuery}"`);
            suppliersData.forEach((s: any) => {
              // Excluir proveedores de plantilla si tienen un campo que lo indique
              // Por ahora incluimos todos
              results.push({
                id: s.id,
                company_name: s.company_name,
                tax_id: s.tax_id,
              } as Supplier);
            });
          }
        } catch (error) {
          console.error('Exception searching suppliers:', error);
        }
      }

      // Search technicians if needed
      // Filtrar solo COMPANY y FREELANCER, excluyendo plantilla (si existe un tipo específico)
      if (entityType === 'TECHNICIAN' || entityType === 'BOTH') {
        try {
          const { data: techniciansData, error: techniciansError } = await supabase.rpc('list_technicians', {
            p_search: trimmedQuery || null,
            p_type: null, // Buscar todos los tipos (COMPANY, FREELANCER)
            p_status: null, // Buscar todos los estados activos
            p_specialty: null, // No filtrar por especialidad
          });

          if (techniciansError) {
            console.error('Error searching technicians:', techniciansError);
          } else           if (techniciansData) {
            console.log(`Found ${techniciansData.length} technicians for query: "${trimmedQuery}"`);
            techniciansData.forEach((t: any) => {
              // Excluir técnicos de plantilla (si tienen monthly_salary o tipo específico)
              // Por ahora incluimos todos excepto si tienen monthly_salary (que indica plantilla)
              if (!t.monthly_salary || t.monthly_salary === null) {
                results.push({
                  id: t.id,
                  company_name: t.company_name,
                  tax_id: t.tax_id,
                  withholding_tax_rate: t.withholding_tax_rate,
                } as Technician);
              }
            });
          }
        } catch (error) {
          console.error('Exception searching technicians:', error);
        }
      }

      console.log(`Total results found: ${results.length} (${results.filter(r => !('withholding_tax_rate' in r)).length} suppliers, ${results.filter(r => 'withholding_tax_rate' in r).length} technicians)`);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching entities:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  // Search when in search mode
  useEffect(() => {
    if (searchMode && searchQuery) {
      const timeoutId = setTimeout(() => {
        searchEntities(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchMode, searchEntities]);

  // Update dropdown position on focus/resize
  useEffect(() => {
    if (isFocused) {
      updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isFocused, updateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    if (showResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showResults]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowResults(newValue.startsWith('@') && newValue.length > 1);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (value.startsWith('@') && value.length > 1) {
      setShowResults(true);
      updateDropdownPosition();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Don't close if clicking on results or if we're in the process of selecting
    if (isSelectingRef.current) {
      return;
    }
    if (resultsRef.current && resultsRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsFocused(false);
    // Delay hiding to allow click on results
    setTimeout(() => {
      if (!isSelectingRef.current) {
        setShowResults(false);
      }
    }, 200);
  };

  const handleSelect = (item: Supplier | Technician, event?: React.MouseEvent) => {
    // Prevent blur from closing dropdown before selection
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    isSelectingRef.current = true;
    
    const isTechnician = 'withholding_tax_rate' in item;
    
    // Call the appropriate callback first
    if (isTechnician && onSelectTechnician) {
      onSelectTechnician(item as Technician);
    } else if (!isTechnician && onSelectSupplier) {
      onSelectSupplier(item as Supplier);
    }
    
    // Update the input value
    onChange(item.company_name);
    
    // Close dropdown
    setShowResults(false);
    setIsFocused(false);
    
    // Reset selection flag after a short delay
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 100);
    
    // Blur the input to ensure proper state
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  return (
    <>
      <div ref={containerRef} className={cn("relative", className)}>
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full",
            searchMode && "border-orange-500/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      </div>

      {showResults && dropdownPosition && createPortal(
        <div
          ref={resultsRef}
          className="fixed z-50 bg-zinc-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl max-h-[300px] overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          {loading ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-white/40" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center text-white/40 text-sm">
              {searchQuery.length < 2 ? 'Escribe al menos 2 caracteres' : 'No se encontraron resultados'}
            </div>
          ) : (
            <div className="py-1">
              {searchResults.map((item) => {
                const isTechnician = 'withholding_tax_rate' in item;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(item, e);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors flex items-center gap-3"
                  >
                    {isTechnician ? (
                      <UserRound className="h-4 w-4 text-violet-400 flex-shrink-0" />
                    ) : (
                      <Building2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{item.company_name}</div>
                      {item.tax_id && (
                        <div className="text-white/40 text-xs truncate">{item.tax_id}</div>
                      )}
                    </div>
                    {isTechnician && (
                      <span className="text-violet-400 text-[10px] font-medium uppercase">Técnico</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
