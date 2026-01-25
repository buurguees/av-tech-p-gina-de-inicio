import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
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
  const [isSimulating, setIsSimulating] = useState(currentRole !== null && currentRole !== 'admin');

  if (!isVisible) return null;

  const handleRoleChange = (value: string) => {
    if (value === 'admin') {
      setIsSimulating(false);
      onRoleChange(null); // null means use real role
    } else {
      setIsSimulating(true);
      onRoleChange(value as SimulatedRole);
    }
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
      
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/30 border border-border/50">
        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
        <Select
          value={currentRole || 'admin'}
          onValueChange={handleRoleChange}
        >
          <SelectTrigger className="h-6 w-[110px] border-0 bg-transparent text-xs font-medium focus:ring-0 px-1">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent align="end" className="min-w-[200px]">
            {ROLE_OPTIONS.map((role) => (
              <SelectItem 
                key={role.value} 
                value={role.value}
                className="py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{role.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {role.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default RoleSimulator;
