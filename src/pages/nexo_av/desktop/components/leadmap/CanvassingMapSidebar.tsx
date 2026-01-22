import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CanvassingLocation, CanvassingStats } from "../../pages/LeadMapPage";
import { MapPin, Building2, Phone, Mail, Calendar, ArrowUpDown } from "lucide-react";
import { CANVASSING_STATUSES } from "./CanvassingTool";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CanvassingMapSidebarProps {
  stats: CanvassingStats[];
  locations: CanvassingLocation[];
  onLocationSelect: (location: CanvassingLocation) => void;
}

// Prioridades de estados según el sistema definido
// PRIORIDAD CRÍTICA 🔴: NEG, PRES, APP
// PRIORIDAD ALTA 🟠: INT, CB
// PRIORIDAD MEDIA 🟡: GB, NH
// PRIORIDAD BAJA 🟢: OTH, NI
// ESTADO FINAL ✅: CX
const STATUS_PRIORITY: Record<string, number> = {
  // PRIORIDAD CRÍTICA 🔴 (1-3)
  'NEG': 1,   // Negotiation - Máxima prioridad
  'PRES': 2,  // Presupuesto enviado
  'APP': 3,   // Appointment Set
  
  // PRIORIDAD ALTA 🟠 (4-5)
  'INT': 4,   // Interested
  'CB': 5,    // Call Back
  
  // PRIORIDAD MEDIA 🟡 (6-7)
  'GB': 6,    // Go Back
  'NH': 7,    // Not Home
  
  // PRIORIDAD BAJA 🟢 (8-9)
  'OTH': 8,   // Other
  'NI': 9,    // Not Interested
  
  // ESTADO FINAL ✅ (10)
  'CX': 10,   // Customer - Cliente cerrado
};

// TODO: Sistema de Alertas Automáticas
// Implementar alertas automáticas para los siguientes casos:
// - NEG: Alerta si lleva más de 3 días sin actividad
// - PRES: Alerta si lleva más de 5 días sin seguimiento
// - APP: Recordatorio 1 día antes y 1 hora antes de la cita
// - CB: Alerta en la fecha/hora programada para el callback
// - INT: Alerta si lleva más de 7 días sin avanzar a APP o PRES

const CanvassingMapSidebar = ({ stats, locations, onLocationSelect }: CanvassingMapSidebarProps) => {
  const [sortOrder, setSortOrder] = useState<'priority-desc' | 'priority-asc'>('priority-desc');

  // Obtener prioridad de un estado (por defecto 99 para estados desconocidos)
  const getPriority = (status: string): number => {
    return STATUS_PRIORITY[status] || 99;
  };

  // Ordenar ubicaciones según el orden seleccionado
  const sortedLocations = [...locations].sort((a, b) => {
    const priorityA = getPriority(a.status);
    const priorityB = getPriority(b.status);
    
    if (sortOrder === 'priority-desc') {
      // Mayor prioridad primero (menor número = mayor prioridad)
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      // Si tienen la misma prioridad, ordenar por fecha (más recientes primero)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      // Menor prioridad primero (mayor número = menor prioridad)
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      // Si tienen la misma prioridad, ordenar por fecha (más antiguas primero)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
  });

  const totalLocations = stats.reduce((sum, s) => sum + s.count, 0);

  const getStatusInfo = (status: string) => {
    return CANVASSING_STATUSES[status as keyof typeof CANVASSING_STATUSES] || {
      label: status,
      color: '#6B7280',
      icon: '📍',
    };
  };

  const getFullAddress = (location: CanvassingLocation) => {
    const parts = [
      location.address,
      location.city,
      location.province,
      location.postal_code
    ].filter(Boolean);
    return parts.join(', ') || 'Sin dirección';
  };

  return (
    <div className="h-full w-full flex flex-col gap-4">
      {/* Stats */}
      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Puntos por Estado</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {stats.map((stat) => {
              const statusInfo = getStatusInfo(stat.status);
              return (
                <div key={stat.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: statusInfo.color }}
                    />
                    <span className="text-sm">{statusInfo.label}</span>
                  </div>
                  <span className="text-sm font-medium">{stat.count}</span>
                </div>
              );
            })}
            <div className="border-t pt-2 mt-2">
              <div className="flex items-center justify-between font-medium">
                <span className="text-sm">Total</span>
                <span className="text-sm">{totalLocations}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations list */}
      <Card className="flex-1 flex flex-col min-h-0 shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 size={14} />
              Listado de Puntos
            </CardTitle>
            <Select value={sortOrder} onValueChange={(value: 'priority-desc' | 'priority-asc') => setSortOrder(value)}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <ArrowUpDown size={12} className="mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority-desc">Mayor → Menor</SelectItem>
                <SelectItem value="priority-asc">Menor → Mayor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-2">
              {sortedLocations.map((location) => {
                const statusInfo = getStatusInfo(location.status);
                return (
                  <button
                    key={location.id}
                    className="w-full text-left p-3 rounded-md hover:bg-secondary transition-colors border border-border/50 shadow-none"
                    onClick={() => onLocationSelect(location)}
                  >
                    {/* Nombre y Estado */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-medium text-sm flex-1 min-w-0 truncate">
                        {location.company_name || 'Sin nombre'}
                      </p>
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: statusInfo.color }}
                        title={statusInfo.label}
                      />
                    </div>
                    
                    {/* Ubicación */}
                    <div className="flex items-start gap-1.5 mb-1.5">
                      <MapPin size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                        {getFullAddress(location)}
                      </p>
                    </div>
                    
                    {/* Contacto */}
                    {(location.contact_first_name || location.contact_last_name) && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Building2 size={12} className="text-muted-foreground flex-shrink-0" />
                        <p className="text-xs text-muted-foreground truncate">
                          {[location.contact_first_name, location.contact_last_name].filter(Boolean).join(' ')}
                        </p>
                      </div>
                    )}
                    
                    {/* Teléfono */}
                    {location.contact_phone_primary && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Phone size={12} className="text-muted-foreground flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          {location.contact_phone_primary}
                        </p>
                      </div>
                    )}
                    
                    {/* Email */}
                    {location.contact_email_primary && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Mail size={12} className="text-muted-foreground flex-shrink-0" />
                        <p className="text-xs text-muted-foreground truncate">
                          {location.contact_email_primary}
                        </p>
                      </div>
                    )}

                    {/* Cita programada */}
                    {location.appointment_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-muted-foreground flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Cita: {new Date(location.appointment_date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
              {sortedLocations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay puntos de canvassing
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default CanvassingMapSidebar;
