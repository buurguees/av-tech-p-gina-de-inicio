import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MapPin, Loader2 } from "lucide-react";

interface AddressResult {
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    province?: string;
    postcode?: string;
    country?: string;
  };
  lat: string;
  lon: string;
}

interface AddressData {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: AddressData) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const AddressAutocomplete = ({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Escribe una dirección...",
  className,
  disabled = false,
}: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search addresses using Nominatim - focused on Spain
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Add "España" to query if not already included to improve Spanish results
      const enhancedQuery = query.toLowerCase().includes("españa") || query.toLowerCase().includes("spain")
        ? query
        : `${query}, España`;
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(enhancedQuery)}&countrycodes=es&limit=8&bounded=1&viewbox=-9.392884,35.946850,4.315816,43.748337`,
        {
          headers: {
            'Accept-Language': 'es',
            'User-Agent': 'NexoAV-CRM/1.0',
          },
        }
      );
      const data: AddressResult[] = await response.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Error searching addresses:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 350);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (result: AddressResult) => {
    const addr = result.address;
    
    // Build street address
    const street = [addr.road, addr.house_number].filter(Boolean).join(" ");
    
    // Get city (can be in different fields)
    const city = addr.city || addr.town || addr.village || addr.municipality || "";
    
    // Get province/state
    const province = addr.province || addr.state || "";
    
    const addressData: AddressData = {
      street: street || result.display_name.split(",")[0],
      city,
      province,
      postalCode: addr.postcode || "",
      country: addr.country || "España",
    };

    onChange(street || result.display_name.split(",")[0]);
    onAddressSelect(addressData);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={cn("pr-10", className)}
          disabled={disabled}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white/40" />
          ) : (
            <MapPin className="h-4 w-4 text-white/40" />
          )}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-white/10 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((result, index) => (
            <button
              key={`${result.lat}-${result.lon}`}
              type="button"
              onClick={() => handleSelectSuggestion(result)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm transition-colors",
                "hover:bg-white/10 focus:bg-white/10 focus:outline-none",
                index === selectedIndex && "bg-white/10",
                "border-b border-white/5 last:border-0"
              )}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-white/40 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate">
                    {result.display_name.split(",")[0]}
                  </p>
                  <p className="text-white/50 text-xs truncate">
                    {result.display_name.split(",").slice(1).join(",").trim()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
