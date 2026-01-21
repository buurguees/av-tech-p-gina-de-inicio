import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Estados de Canvassing con colores e iconos según prioridad
// PRIORIDAD CRÍTICA 🔴: NEG, PRES, APP
// PRIORIDAD ALTA 🟠: INT, CB
// PRIORIDAD MEDIA 🟡: GB, NH
// PRIORIDAD BAJA 🟢: OTH, NI
// ESTADO FINAL ✅: CX
export const CANVASSING_STATUSES = {
  // PRIORIDAD CRÍTICA 🔴
  NEG: {
    code: 'NEG',
    label: 'Negotiation',
    description: 'En negociación - Máxima prioridad',
    color: '#DC2626', // Rojo intenso
    icon: '🤝',
    priority: 1,
  },
  PRES: {
    code: 'PRES',
    label: 'Presupuesto enviado',
    description: 'Presupuesto entregado',
    color: '#EA580C', // Naranja intenso
    icon: '📄',
    priority: 2,
  },
  APP: {
    code: 'APP',
    label: 'Appointment Set',
    description: 'Cita programada',
    color: '#9333EA', // Morado
    icon: '📅',
    priority: 3,
  },
  
  // PRIORIDAD ALTA 🟠
  INT: {
    code: 'INT',
    label: 'Interested',
    description: 'Interesado',
    color: '#2563EB', // Azul brillante
    icon: '⭐',
    priority: 4,
  },
  CB: {
    code: 'CB',
    label: 'Call Back',
    description: 'Llamar de nuevo',
    color: '#EAB308', // Amarillo
    icon: '📞',
    priority: 5,
  },
  
  // PRIORIDAD MEDIA 🟡
  GB: {
    code: 'GB',
    label: 'Go Back',
    description: 'Volver más tarde',
    color: '#22C55E', // Verde claro
    icon: '🔄',
    priority: 6,
  },
  NH: {
    code: 'NH',
    label: 'Not Home',
    description: 'No está en casa',
    color: '#9CA3AF', // Gris claro
    icon: '🏠',
    priority: 7,
  },
  
  // PRIORIDAD BAJA 🟢
  OTH: {
    code: 'OTH',
    label: 'Other',
    description: 'Otro',
    color: '#4B5563', // Gris oscuro
    icon: '❓',
    priority: 8,
  },
  NI: {
    code: 'NI',
    label: 'Not Interested',
    description: 'No interesado',
    color: '#78350F', // Marrón
    icon: '❌',
    priority: 9,
  },
  
  // ESTADO FINAL ✅
  CX: {
    code: 'CX',
    label: 'Customer',
    description: 'Cliente cerrado',
    color: '#166534', // Verde oscuro
    icon: '✅',
    priority: 10,
  },
  
  // Otros estados adicionales (baja prioridad)
  DK: {
    code: 'DK',
    label: 'Doors Knocked',
    description: 'Puerta tocada',
    color: '#EC4899', // Rosa
    icon: '🚪',
    priority: 11,
  },
  RNT: {
    code: 'RNT',
    label: 'Renter',
    description: 'Inquilino',
    color: '#14B8A6', // Turquesa
    icon: '🏘️',
    priority: 12,
  },
} as const;

export type CanvassingStatus = keyof typeof CANVASSING_STATUSES;

interface CanvassingToolProps {
  onStatusSelect: (status: CanvassingStatus) => void;
  isActive: boolean;
}

const CanvassingTool = ({ onStatusSelect, isActive }: CanvassingToolProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusClick = (status: CanvassingStatus) => {
    onStatusSelect(status);
    setIsOpen(false);
  };

  if (!isActive) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "absolute right-4 flex items-center gap-2",
          // En mobile subimos el botón por encima de la bottom-nav
          "bottom-24 md:bottom-4",
          // Z-index muy alto para estar por encima del mapa de Leaflet
          "z-[9999] pointer-events-auto"
        )}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Selector de iconos - Horizontal hacia la izquierda del botón + */}
        {isOpen && (
          <div 
            className={cn(
              "bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-xl p-1.5 flex gap-1",
              "overflow-x-auto max-w-[calc(100vw-8rem)] scrollbar-hide",
              "pointer-events-auto"
            )}
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {Object.entries(CANVASSING_STATUSES).map(([code, status]) => {
              const buttonContent = (
                <button
                  key={code}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusClick(code as CanvassingStatus);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  className={cn(
                    "flex items-center justify-center rounded-lg flex-shrink-0",
                    "hover:scale-110 active:scale-95 transition-all duration-200",
                    "border border-transparent hover:border-primary/30",
                    "hover:shadow-md",
                    "pointer-events-auto touch-manipulation",
                    "w-11 h-11 p-1.5" // Desktop: compacto, icono + código
                  )}
                  style={{
                    pointerEvents: 'auto',
                    touchAction: 'manipulation',
                    backgroundColor: `${status.color}12`,
                  }}
                >
                  {/* Desktop: icono + código, sin descripción (se muestra en hover) */}
                  <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      style={{ 
                        backgroundColor: `${status.color}20`, 
                        color: status.color,
                        border: `1px solid ${status.color}30`
                      }}
                    >
                      {status.icon}
                    </div>
                    <span 
                      className="text-[8px] font-extrabold leading-none tracking-tight"
                      style={{ color: status.color }}
                    >
                      {code}
                    </span>
                  </div>
                </button>
              );

              // Desktop: envolver con Tooltip para mostrar descripción en hover
              return (
                <Tooltip key={code}>
                  <TooltipTrigger asChild>
                    {buttonContent}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[180px]">
                    <div className="text-center space-y-0.5">
                      <p className="font-semibold text-sm">{status.label}</p>
                      <p className="text-xs text-muted-foreground">{status.description}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        {/* Botón + */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          size="icon"
          className={cn(
            "rounded-full shadow-lg flex-shrink-0",
            "hover:scale-105 active:scale-95 transition-all duration-200",
            "h-12 w-12",
            isOpen ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90",
            "pointer-events-auto touch-manipulation"
          )}
          style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
          aria-label={isOpen ? "Cerrar selector" : "Abrir herramienta de Canvassing"}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </Button>
      </div>
    </TooltipProvider>
  );
};

export default CanvassingTool;
