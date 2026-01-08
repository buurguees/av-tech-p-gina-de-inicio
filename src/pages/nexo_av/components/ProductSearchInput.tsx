import { useState, useEffect, useRef } from 'react';
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
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CatalogItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Check if we're in search mode (starts with @)
  const searchMode = value.startsWith('@');
  const searchQuery = searchMode ? value.slice(1).trim() : '';

  useEffect(() => {
    if (searchMode && searchQuery.length >= 1) {
      setIsSearching(true);
      searchCatalog(searchQuery);
    } else {
      setIsSearching(false);
      setSearchResults([]);
      setShowResults(false);
    }
  }, [value, searchMode, searchQuery]);

  // Close results when clicking outside
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchCatalog = async (query: string) => {
    setLoading(true);
    try {
      // Search products and services
      const { data: productsData, error: productsError } = await supabase.rpc('list_products', {
        p_search: query,
      });

      // Search packs
      const { data: packsData, error: packsError } = await supabase.rpc('list_product_packs', {
        p_search: query,
      });

      if (productsError) console.error('Error searching products:', productsError);
      if (packsError) console.error('Error searching packs:', packsError);

      const items: CatalogItem[] = [];

      // Add products/services
      if (productsData) {
        productsData.forEach((p: any) => {
          items.push({
            id: p.id,
            type: p.type === 'service' ? 'service' : 'product',
            name: p.name,
            code: p.product_number,
            price: p.base_price,
            tax_rate: p.tax_rate,
            description: p.description || '',
          });
        });
      }

      // Add packs
      if (packsData) {
        packsData.forEach((p: any) => {
          items.push({
            id: p.id,
            type: 'pack',
            name: p.name,
            code: p.pack_number,
            price: p.final_price,
            tax_rate: p.tax_rate,
            description: p.description || '',
          });
        });
      }

      setSearchResults(items.slice(0, 10)); // Limit to 10 results
      setShowResults(items.length > 0);
    } catch (error) {
      console.error('Error searching catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item: CatalogItem) => {
    onSelectItem(item);
    onChange(item.name); // Replace the search with the item name
    setShowResults(false);
  };

  const getItemIcon = (type: CatalogItem['type']) => {
    switch (type) {
      case 'product':
        return <Package className="h-3 w-3 text-blue-400" />;
      case 'service':
        return <Wrench className="h-3 w-3 text-orange-400" />;
      case 'pack':
        return <Boxes className="h-3 w-3 text-purple-400" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "bg-white/5 border-white/10 text-white h-8 text-xs",
          searchMode && "border-orange-500/50 bg-orange-500/5",
          className
        )}
        onFocus={() => {
          if (searchResults.length > 0) {
            setShowResults(true);
          }
        }}
      />
      
      {searchMode && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-orange-400 font-mono">
          @búsqueda
        </span>
      )}

      {/* Search Results Dropdown */}
      {showResults && (
        <div
          ref={resultsRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto"
        >
          {loading ? (
            <div className="flex items-center justify-center p-3">
              <Loader2 className="h-4 w-4 animate-spin text-white/40" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-3 text-center text-white/40 text-xs">
              Sin resultados para "{searchQuery}"
            </div>
          ) : (
            searchResults.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => handleSelectItem(item)}
                className="w-full flex items-center gap-2 p-2 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
              >
                {getItemIcon(item.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{item.name}</p>
                  <p className="text-white/40 text-[10px] font-mono">{item.code}</p>
                </div>
                <span className="text-green-400 text-xs font-medium shrink-0">
                  {formatPrice(item.price)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
