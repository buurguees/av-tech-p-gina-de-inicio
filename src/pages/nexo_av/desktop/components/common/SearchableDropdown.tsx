import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { ChevronDown, Search, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

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

  // Filter options based on search query
  const filteredOptions = options.filter((opt) => {
    const searchText = `${opt.label} ${opt.secondaryLabel || ""}`.toLowerCase();
    return searchText.includes(searchQuery.toLowerCase());
  });

  // Update dropdown position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  // Handle open/close
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

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Close on click outside
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

  // Close on Escape
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

  // Update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    handleClose();
  };

  // Calculate max height based on visible items (each item ~44px + search ~52px + padding)
  const itemHeight = 44;
  const searchHeight = 52;
  const paddingHeight = 8;
  const maxHeight = searchHeight + paddingHeight + itemHeight * maxVisibleItems;

  return (
    <div className="searchable-dropdown w-full">
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
    </div>
  );
}
