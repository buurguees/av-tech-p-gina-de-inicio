import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Building2, FolderOpen, Search, ChevronDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

export interface Client {
  id: string;
  company_name: string;
}

export interface Project {
  id: string;
  project_number: string;
  project_name: string;
}

// ============= INLINE SEARCHABLE DROPDOWN =============
interface DropdownOption {
  value: string;
  label: string;
  secondaryLabel?: string;
}

interface InlineSearchableDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

const InlineSearchableDropdown = ({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  disabled = false,
  loading = false,
  emptyMessage = "Sin resultados",
}: InlineSearchableDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
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
    setDropdownPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
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
      if (dropdownRef.current && !dropdownRef.current.contains(target) && triggerRef.current && !triggerRef.current.contains(target)) {
        handleClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, handleClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) handleClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

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

  return (
    <div className="w-full min-w-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        onClick={isOpen ? handleClose : handleOpen}
        className={cn(
          "w-full min-h-[44px] px-4 py-2.5 flex items-center justify-between gap-3",
          "bg-background border border-border rounded-xl",
          "text-sm font-medium",
          "hover:border-primary/50 hover:bg-accent/30",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          "transition-all duration-150",
          (disabled || loading) && "opacity-50 cursor-not-allowed bg-muted hover:bg-muted",
          !selectedOption && "text-muted-foreground"
        )}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Cargando...</span>
          </div>
        ) : (
          <span className="truncate flex-1 text-left">
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.secondaryLabel && (
                  <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {selectedOption.secondaryLabel}
                  </span>
                )}
                <span className="text-foreground">{selectedOption.label}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
        )}
        <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform flex-shrink-0", isOpen && "rotate-180")} />
      </button>

      {isOpen && dropdownPosition && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
          style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px`, width: `${Math.max(dropdownPosition.width, 280)}px`, maxHeight: "280px" }}
        >
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
          </div>
          <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: "220px" }}>
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">{emptyMessage}</div>
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
                      {opt.secondaryLabel && <span className="font-mono text-xs opacity-60 flex-shrink-0">{opt.secondaryLabel}</span>}
                      <span className="truncate">{opt.label}</span>
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
    </div>
  );
};

// ============= MAIN COMPONENT =============
interface ClientProjectSelectorProps {
  selectedClientId: string;
  selectedProjectId: string;
  onClientChange: (clientId: string) => void;
  onProjectChange: (projectId: string) => void;
  onProjectsLoaded?: (projects: Project[]) => void;
  disabled?: boolean;
  className?: string;
  layout?: "horizontal" | "vertical";
  showLabels?: boolean;
}

export default function ClientProjectSelector({
  selectedClientId,
  selectedProjectId,
  onClientChange,
  onProjectChange,
  onProjectsLoaded,
  disabled = false,
  className,
  layout = "horizontal",
  showLabels = true,
}: ClientProjectSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Fetch clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const { data, error } = await supabase.rpc("list_clients", {});
        if (error) throw error;
        const clientList = data?.map((c: any) => ({ id: c.id, company_name: c.company_name })) || [];
        setClients(clientList);
      } catch (error) {
        console.error("Error fetching clients:", error);
        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  // Fetch projects when client changes
  useEffect(() => {
    if (!selectedClientId) {
      setProjects([]);
      return;
    }

    const fetchClientProjects = async () => {
      setLoadingProjects(true);
      try {
        const { data, error } = await supabase.rpc("list_projects", { p_search: null });
        if (error) throw error;
        
        const clientProjects = (data || [])
          .filter((p: any) => p.client_id === selectedClientId)
          .map((p: any) => ({ id: p.id, project_number: p.project_number, project_name: p.project_name }));
        
        setProjects(clientProjects);
        onProjectsLoaded?.(clientProjects);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchClientProjects();
  }, [selectedClientId, onProjectsLoaded]);

  const handleClientChange = (clientId: string) => {
    onClientChange(clientId);
    onProjectChange("");
  };

  // Convert to dropdown options
  const clientOptions: DropdownOption[] = clients.map(c => ({ value: c.id, label: c.company_name }));
  const projectOptions: DropdownOption[] = projects.map(p => ({ value: p.id, label: p.project_name, secondaryLabel: p.project_number }));

  return (
    <div className={cn(
      "client-project-selector",
      layout === "horizontal" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "flex flex-col gap-4",
      className
    )}>
      {/* Client Selector */}
      <div className="selector-field">
        {showLabels && (
          <Label className="selector-label flex items-center gap-1.5 mb-1.5 text-xs font-medium text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>Cliente</span>
          </Label>
        )}
        <InlineSearchableDropdown
          value={selectedClientId}
          onChange={handleClientChange}
          options={clientOptions}
          placeholder="Seleccionar cliente"
          searchPlaceholder="Buscar cliente..."
          disabled={disabled}
          loading={loadingClients}
          emptyMessage="No hay clientes"
        />
      </div>

      {/* Project Selector */}
      <div className="selector-field">
        {showLabels && (
          <Label className="selector-label flex items-center gap-1.5 mb-1.5 text-xs font-medium text-muted-foreground">
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Proyecto</span>
          </Label>
        )}
        <InlineSearchableDropdown
          value={selectedProjectId}
          onChange={onProjectChange}
          options={projectOptions}
          placeholder={
            !selectedClientId
              ? "Selecciona un cliente primero"
              : projects.length === 0
              ? "Sin proyectos disponibles"
              : "Seleccionar proyecto"
          }
          searchPlaceholder="Buscar proyecto..."
          disabled={disabled || !selectedClientId}
          loading={loadingProjects}
          emptyMessage={!selectedClientId ? "Selecciona un cliente" : "Sin proyectos"}
        />
      </div>
    </div>
  );
}