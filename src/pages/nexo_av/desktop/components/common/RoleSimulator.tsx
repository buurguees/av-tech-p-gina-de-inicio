import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Eye, ShieldCheck, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type SimulatedRole = 'admin' | 'manager' | 'comercial' | 'tecnico' | null;

interface RoleSimulatorProps {
  currentRole: SimulatedRole;
  onRoleChange: (role: SimulatedRole) => void;
  isVisible?: boolean;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Acceso completo a todo el sistema', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'manager', label: 'Manager', description: 'Sin Config, Auditoría, Contabilidad', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'comercial', label: 'Comercial (Sales)', description: 'Ventas, clientes, presupuestos. No emite facturas', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'tecnico', label: 'Técnico', description: 'Solo proyectos y mapa técnico', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
];

const RoleSimulator = ({ currentRole, onRoleChange, isVisible = true }: RoleSimulatorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSimulating = currentRole !== null && currentRole !== 'admin';

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  if (!isVisible) return null;

  const handleRoleChange = (value: string) => {
    if (value === 'admin') {
      onRoleChange(null); // null means use real role
    } else {
      onRoleChange(value as SimulatedRole);
    }
    setIsOpen(false);
  };

  const currentRoleInfo = ROLE_OPTIONS.find(r => r.value === (currentRole || 'admin'));

  return (
    <div className="flex items-center gap-2">
      {isSimulating && (
        <Badge 
          variant="outline" 
          className={cn(
            "h-6 px-2 text-[10px] font-medium uppercase tracking-wide animate-pulse",
            currentRoleInfo?.color
          )}
        >
          <Eye className="h-3 w-3 mr-1" />
          Vista Demo
        </Badge>
      )}
      
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 rounded-md",
            "bg-muted/30 border border-border/50 hover:bg-muted/50",
            "text-xs font-medium transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary/20"
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="min-w-[70px] text-left">{currentRoleInfo?.label || 'Admin'}</span>
          <ChevronDown className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </button>

        {isOpen && (
          <div 
            className={cn(
              "absolute right-0 top-full mt-1 z-[9999]",
              "min-w-[220px] p-1 rounded-lg",
              "bg-popover border border-border shadow-xl",
              "animate-in fade-in-0 zoom-in-95 duration-150"
            )}
          >
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => handleRoleChange(role.value)}
                className={cn(
                  "w-full flex items-start gap-2 px-3 py-2.5 rounded-md text-left",
                  "hover:bg-accent transition-colors",
                  (currentRole || 'admin') === role.value && "bg-accent"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{role.label}</span>
                    {(currentRole || 'admin') === role.value && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">
                    {role.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleSimulator;
