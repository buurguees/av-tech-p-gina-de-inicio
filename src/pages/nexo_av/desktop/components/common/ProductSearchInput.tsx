import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Package, Wrench, Boxes, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CatalogItem {
  id: string;
  type: 'product' | 'service' | 'pack';
  name: string;
  code: string;
  price: number;
  tax_rate: number;
  description?: string;
}

interface ProductSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectItem: (item: CatalogItem) => void;
  placeholder?: string;
  className?: string;
}

export default function ProductSearchInput({
  value,
  onChange,
  onSelectItem,
  placeholder = "Concepto o @buscar",
  className,
}: ProductSearchInputProps) {
  const [searchResults, setSearchResults] = useState<CatalogItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position (fixed position, so use viewport coordinates)
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

  const searchCatalog = useCallback(async (query: string) => {
    setLoading(true);
    
    try {
      // Split the query into individual keywords
      const keywords = query.toLowerCase().trim().split(/\s+/).filter(k => k.length > 0);
      console.log('Search keywords:', keywords);
      
      // Search products and services - use the first keyword or full query
      const { data: productsData, error: productsError } = await supabase.rpc('list_products', {
        p_search: keywords[0] || query,
      });

      // Search packs
      const { data: packsData, error: packsError } = await supabase.rpc('list_product_packs', {
        p_search: keywords[0] || query,
      });

      if (productsError) console.error('Error searching products:', productsError);
      if (packsError) console.error('Error searching packs:', packsError);

      const items: CatalogItem[] = [];

      // Add products/services
      if (productsData) {
        productsData.forEach((p: any) => {
          const itemType: 'product' | 'service' = p.type === 'service' ? 'service' : 'product';
          const item: CatalogItem = {
            id: p.id,
            type: itemType,
            name: p.name,
            code: p.product_number,
            price: Number(p.base_price) || 0,
            tax_rate: Number(p.tax_rate) || 21,
            description: p.description || '',
          };
          items.push(item);
        });
      }

      // Add packs
      if (packsData) {
        packsData.forEach((p: any) => {
          const item = {
            id: p.id,
            type: 'pack' as const,
            name: p.name,
            code: p.pack_number,
            price: Number(p.final_price) || 0,
            tax_rate: Number(p.tax_rate) || 21,
            description: p.description || '',
          };
          items.push(item);
        });
      }

      // Filter results to include only items that contain ALL keywords
      const filteredItems = items.filter(item => {
        const searchText = `${item.name} ${item.code} ${item.description}`.toLowerCase();
        // Check if ALL keywords are present in the search text
        return keywords.every(keyword => searchText.includes(keyword));
      });

      console.log('Total items found:', items.length);
      console.log('Filtered items (containing all keywords):', filteredItems.length);
      
      const results = filteredItems.slice(0, 10);
      setSearchResults(results);
      
      // Show results and calculate position after setting results
      if (results.length > 0 && isFocused) {
        setShowResults(true);
        // Calculate position in next tick to ensure render
        requestAnimationFrame(() => {
          updateDropdownPosition();
        });
      } else {
        setShowResults(true); // Show even if no results to display "Sin resultados"
      }
    } catch (error) {
      console.error('Error searching catalog:', error);
    } finally {
      setLoading(false);
    }
  }, [updateDropdownPosition, isFocused]);

  useEffect(() => {
    if (searchMode && searchQuery.length >= 1) {
      searchCatalog(searchQuery);
    } else {
      setSearchResults([]);
      setShowResults(false);
      setDropdownPosition(null);
    }
  }, [value, searchMode, searchQuery, searchCatalog]);

  // Update position when showing results
  useEffect(() => {
    if (showResults && searchResults.length > 0) {
      updateDropdownPosition();
    }
  }, [showResults, searchResults.length, updateDropdownPosition]);

  // Update position on scroll and resize
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

  // Close results when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current && 
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showResults) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showResults]);

  const handleSelectItem = (item: CatalogItem) => {
    console.log('=== SELECTING ITEM ===');
    console.log('Original item:', item);
    console.log('Price:', item.price, typeof item.price);
    console.log('Tax rate:', item.tax_rate, typeof item.tax_rate);
    console.log('Description:', item.description);
    
    // Ensure all data is passed correctly with fallbacks
    const itemToPass: CatalogItem = {
      id: item.id,
      type: item.type,
      name: item.name || '',
      code: item.code || '',
      price: Number(item.price) || 0,
      tax_rate: Number(item.tax_rate) || 21,
      description: item.description || '',
    };
    
    console.log('Item to pass (after conversion):', itemToPass);
    console.log('Price to pass:', itemToPass.price, typeof itemToPass.price);
    console.log('Tax rate to pass:', itemToPass.tax_rate, typeof itemToPass.tax_rate);
    
    // Pass the item data FIRST (this will update all fields)
    onSelectItem(itemToPass);
    
    // Close dropdown
    setIsFocused(false);
    setShowResults(false);
    setSearchResults([]);
    setDropdownPosition(null);
  };

  const getItemIcon = (type: CatalogItem['type']) => {
    switch (type) {
      case 'product':
        return <Package className="h-3 w-3 text-primary" />;
      case 'service':
        return <Wrench className="h-3 w-3 text-accent-foreground" />;
      case 'pack':
        return <Boxes className="h-3 w-3 text-secondary-foreground" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  return (
    <>
      <div ref={containerRef} className="relative w-full min-w-0">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full min-w-0 bg-transparent border-0 border-b border-border/30 rounded-none",
            "text-foreground text-sm font-medium h-auto py-2 px-2",
            "hover:border-border focus:border-primary/50",
            "focus-visible:ring-0 focus-visible:shadow-none transition-colors",
            searchMode && "border-primary/50 bg-primary/5",
            className
          )}
          onFocus={() => {
            setIsFocused(true);
            if (searchResults.length > 0) {
              setShowResults(true);
              updateDropdownPosition();
            }
          }}
          onBlur={() => {
            // Delay to allow click on results
            setTimeout(() => {
              setIsFocused(false);
              setShowResults(false);
            }, 200);
          }}
        />
        
        {searchMode && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-primary font-mono pointer-events-none">
            @búsqueda
          </span>
        )}
      </div>

      {/* Search Results Dropdown - rendered via portal */}
      {showResults && dropdownPosition && searchResults.length > 0 && isFocused && createPortal(
        <div
          ref={resultsRef}
          className="fixed z-[99999] bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${Math.max(dropdownPosition.width, 320)}px`,
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground text-xs">Buscando...</span>
            </div>
          ) : (
            <div 
              className="overflow-y-auto overscroll-contain"
              style={{ maxHeight: '260px' }}
            >
              {searchResults.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelectItem(item)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors text-left border-b border-border/30 last:border-0"
                >
                  <div className="flex-shrink-0">
                    {getItemIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-xs font-medium truncate">{item.name}</p>
                    <p className="text-muted-foreground text-[10px] font-mono">{item.code}</p>
                  </div>
                  <span className="text-primary text-xs font-semibold shrink-0">
                    {formatPrice(item.price)}
                  </span>
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
