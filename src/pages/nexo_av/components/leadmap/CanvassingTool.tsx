import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Estados de Canvassing con colores e iconos
export const CANVASSING_STATUSES = {
  CB: {
    code: 'CB',
    label: 'Call Back',
    description: 'Llamar de nuevo',
    color: '#3B82F6', // Azul
    icon: '📞',
  },
  CX: {
    code: 'CX',
    label: 'Customer',
    description: 'Cliente convertido',
    color: '#10B981', // Verde
    icon: '✅',
  },
  GB: {
    code: 'GB',
    label: 'Go Back',
    description: 'Volver más tarde',
    color: '#8B5CF6', // Morado
    icon: '🔄',
  },
  NH: {
    code: 'NH',
    label: 'Not Home',
    description: 'No está en casa',
    color: '#F59E0B', // Naranja
    icon: '🏠',
  },
  NI: {
    code: 'NI',
    label: 'Not Interested',
    description: 'No interesado',
    color: '#EF4444', // Rojo
    icon: '❌',
  },
  OTH: {
    code: 'OTH',
    label: 'Other',
    description: 'Otro',
    color: '#6B7280', // Gris
    icon: '❓',
  },
  DK: {
    code: 'DK',
    label: 'Doors Knocked',
    description: 'Puerta tocada',
    color: '#EC4899', // Rosa
    icon: '🚪',
  },
  RNT: {
    code: 'RNT',
    label: 'Renter',
    description: 'Inquilino',
    color: '#14B8A6', // Turquesa
    icon: '🏘️',
  },
  INT: {
    code: 'INT',
    label: 'Interested',
    description: 'Interesado',
    color: '#F97316', // Naranja oscuro
    icon: '⭐',
  },
  APP: {
    code: 'APP',
    label: 'Appointment Set',
    description: 'Cita programada',
    color: '#6366F1', // Índigo
    icon: '📅',
  },
  PRES: {
    code: 'PRES',
    label: 'Presupuesto enviado',
    description: 'Presupuesto entregado',
    color: '#8B5CF6', // Morado
    icon: '📄',
  },
  NEG: {
    code: 'NEG',
    label: 'Negotiation',
    description: 'En negociación',
    color: '#F59E0B', // Naranja
    icon: '🤝',
  },
} as const;

export type CanvassingStatus = keyof typeof CANVASSING_STATUSES;

interface CanvassingToolProps {
  onStatusSelect: (status: CanvassingStatus) => void;
  isActive: boolean;
}

const CanvassingTool = ({ onStatusSelect, isActive }: CanvassingToolProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleStatusClick = (status: CanvassingStatus) => {
    onStatusSelect(status);
    setIsOpen(false);
  };

  if (!isActive) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="absolute bottom-4 right-4 z-[1000] flex items-center gap-2">
        {/* Selector de iconos - Horizontal hacia la izquierda del botón + */}
        {isOpen && (
          <div className={cn(
            "bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-xl p-1.5 flex gap-1",
            "overflow-x-auto max-w-[calc(100vw-8rem)] scrollbar-hide",
            isMobile ? "gap-0.5" : ""
          )}>
            {Object.entries(CANVASSING_STATUSES).map(([code, status]) => {
              const buttonContent = (
                <button
                  key={code}
                  onClick={() => handleStatusClick(code as CanvassingStatus)}
                  className={cn(
                    "flex items-center justify-center rounded-lg flex-shrink-0",
                    "hover:scale-110 active:scale-95 transition-all duration-200",
                    "border border-transparent hover:border-primary/30",
                    "hover:shadow-md",
                    isMobile 
                      ? "w-7 h-7 p-0.5" // Móvil: muy compacto, solo iniciales
                      : "w-11 h-11 p-1.5" // Desktop: compacto, icono + código
                  )}
                  style={isMobile ? {} : {
                    backgroundColor: `${status.color}12`,
                  }}
                >
                  {isMobile ? (
                    // Móvil: solo iniciales en círculo de color
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center"
                      style={{ 
                        backgroundColor: `${status.color}20`, 
                        color: status.color,
                        border: `1.5px solid ${status.color}40`
                      }}
                    >
                      <span className="text-[9px] font-extrabold leading-none">
                        {code}
                      </span>
                    </div>
                  ) : (
                    // Desktop: icono + código, sin descripción (se muestra en hover)
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
                  )}
                </button>
              );

              // En desktop, envolver con Tooltip para mostrar descripción en hover
              if (!isMobile) {
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
              }

              return buttonContent;
            })}
          </div>
        )}

        {/* Botón + */}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="icon"
          className={cn(
            "rounded-full shadow-lg flex-shrink-0",
            "hover:scale-105 active:scale-95 transition-all duration-200",
            isMobile ? "h-10 w-10" : "h-12 w-12",
            isOpen ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
          )}
          aria-label={isOpen ? "Cerrar selector" : "Abrir herramienta de Canvassing"}
        >
          {isOpen ? <X className={isMobile ? "h-4 w-4" : "h-5 w-5"} /> : <Plus className={isMobile ? "h-4 w-4" : "h-5 w-5"} />}
        </Button>
      </div>
    </TooltipProvider>
  );
};

export default CanvassingTool;
