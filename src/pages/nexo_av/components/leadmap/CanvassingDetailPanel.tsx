/**
 * CanvassingDetailPanel - Panel de detalle completo para puntos de canvassing
 * Muestra información de contacto, historial de notas y acciones rápidas
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CANVASSING_STATUSES, CanvassingStatus } from "./CanvassingTool";
import LocationNotesSection from "./LocationNotesSection";
import {
  MapPin,
  Phone,
  Mail,
  Building2,
  User,
  Calendar,
  Clock,
  X,
  Edit,
  PhoneCall,
  Navigation,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CanvassingLocation {
  id: string;
  status: string;
  company_name: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_phone_primary: string | null;
  contact_phone_secondary: string | null;
  contact_email_primary: string | null;
  contact_position: string | null;
  priority: string | null;
  lead_score: number | null;
  appointment_date: string | null;
  appointment_time: string | null;
  callback_date: string | null;
  callback_time: string | null;
  business_type: string | null;
  created_at: string;
  updated_at: string;
}

interface CanvassingDetailPanelProps {
  location: {
    id: string;
    status: string;
    company_name?: string | null;
    latitude: number;
    longitude: number;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
    contact_first_name?: string | null;
    contact_last_name?: string | null;
    contact_phone_primary?: string | null;
    contact_email_primary?: string | null;
    priority?: string | null;
    lead_score?: number | null;
    appointment_date?: string | null;
    callback_date?: string | null;
    created_at: string;
    updated_at?: string;
  };
  onClose: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
}

const CanvassingDetailPanel = ({
  location,
  onClose,
  onEdit,
  onRefresh,
}: CanvassingDetailPanelProps) => {
  const { toast } = useToast();
  const [fullLocation, setFullLocation] = useState<CanvassingLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showNotes, setShowNotes] = useState(true);

  useEffect(() => {
    if (location?.id) {
      fetchFullLocation();
    }
  }, [location?.id]);

  const fetchFullLocation = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_canvassing_location' as any, {
        p_location_id: location.id
      });

      if (error) {
        console.error('Error fetching full location:', error);
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        setFullLocation(data[0] as CanvassingLocation);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      
      const { error } = await supabase.rpc('update_canvassing_location' as any, {
        p_location_id: location.id,
        p_data: { status: newStatus }
      });

      if (error) {
        console.error('Error updating status:', error);
        toast({
          title: "Error",
          description: "No se pudo actualizar el estado",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Estado actualizado",
        description: `Estado cambiado a ${CANVASSING_STATUSES[newStatus as keyof typeof CANVASSING_STATUSES]?.label || newStatus}`,
      });

      // Refresh data
      await fetchFullLocation();
      onRefresh?.();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCall = () => {
    const phone = fullLocation?.contact_phone_primary || location.contact_phone_primary;
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    }
  };

  const handleEmail = () => {
    const email = fullLocation?.contact_email_primary || location.contact_email_primary;
    if (email) {
      window.open(`mailto:${email}`, '_blank');
    }
  };

  const handleNavigate = () => {
    const lat = fullLocation?.latitude || location.latitude;
    const lng = fullLocation?.longitude || location.longitude;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const handleWhatsApp = () => {
    const phone = fullLocation?.contact_phone_primary || location.contact_phone_primary;
    if (phone) {
      // Remove non-numeric characters except +
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const loc = fullLocation || location;
  const statusInfo = CANVASSING_STATUSES[loc.status as keyof typeof CANVASSING_STATUSES];

  const getFullAddress = () => {
    const parts = [
      loc.address,
      loc.city,
      loc.province,
      loc.postal_code
    ].filter(Boolean);
    return parts.join(', ') || 'Sin dirección';
  };

  const getContactName = () => {
    const parts = [
      fullLocation?.contact_first_name || location.contact_first_name,
      fullLocation?.contact_last_name || location.contact_last_name
    ].filter(Boolean);
    return parts.join(' ') || null;
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority) return null;
    const colors: Record<string, string> = {
      URGENT: 'bg-red-500',
      HIGH: 'bg-orange-500',
      MEDIUM: 'bg-yellow-500',
      LOW: 'bg-green-500',
    };
    const labels: Record<string, string> = {
      URGENT: 'Urgente',
      HIGH: 'Alta',
      MEDIUM: 'Media',
      LOW: 'Baja',
    };
    return (
      <Badge className={`${colors[priority] || 'bg-gray-500'} text-white text-[10px]`}>
        {labels[priority] || priority}
      </Badge>
    );
  };

  return (
    <Card className="h-full flex flex-col shadow-none">
      {/* Header */}
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {loc.company_name || 'Sin nombre'}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {statusInfo && (
                <Badge 
                  style={{ backgroundColor: statusInfo.color, color: 'white' }}
                  className="text-[10px]"
                >
                  {statusInfo.icon} {statusInfo.label}
                </Badge>
              )}
              {getPriorityBadge(loc.priority || null)}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 flex-shrink-0">
            <X size={16} />
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="pt-0 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Cambio rápido de estado */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Cambiar Estado</label>
                <Select 
                  value={loc.status} 
                  onValueChange={handleStatusChange}
                  disabled={updatingStatus}
                >
                  <SelectTrigger className="h-9">
                    {updatingStatus ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <SelectValue />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CANVASSING_STATUSES).map(([code, status]) => (
                      <SelectItem key={code} value={code}>
                        <span className="flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: status.color }}
                          />
                          {status.icon} {status.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Acciones rápidas */}
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-16 flex-col gap-1 text-xs"
                  onClick={handleCall}
                  disabled={!loc.contact_phone_primary}
                >
                  <PhoneCall size={18} className="text-green-600" />
                  Llamar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-16 flex-col gap-1 text-xs"
                  onClick={handleWhatsApp}
                  disabled={!loc.contact_phone_primary}
                >
                  <MessageSquare size={18} className="text-green-500" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-16 flex-col gap-1 text-xs"
                  onClick={handleEmail}
                  disabled={!loc.contact_email_primary}
                >
                  <Mail size={18} className="text-blue-500" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-16 flex-col gap-1 text-xs"
                  onClick={handleNavigate}
                >
                  <Navigation size={18} className="text-purple-500" />
                  Navegar
                </Button>
              </div>

              <Separator />

              {/* Información de ubicación */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ubicación</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{getFullAddress()}</p>
                  </div>
                  {fullLocation?.business_type && (
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-muted-foreground flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">{fullLocation.business_type}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de contacto */}
              {(getContactName() || loc.contact_phone_primary || loc.contact_email_primary) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contacto</h4>
                    <div className="space-y-2">
                      {getContactName() && (
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{getContactName()}</p>
                            {fullLocation?.contact_position && (
                              <p className="text-xs text-muted-foreground">{fullLocation.contact_position}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {loc.contact_phone_primary && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-muted-foreground flex-shrink-0" />
                          <a href={`tel:${loc.contact_phone_primary}`} className="text-sm text-primary hover:underline">
                            {loc.contact_phone_primary}
                          </a>
                        </div>
                      )}
                      {fullLocation?.contact_phone_secondary && (
                        <div className="flex items-center gap-2 pl-5">
                          <p className="text-sm text-muted-foreground">{fullLocation.contact_phone_secondary}</p>
                        </div>
                      )}
                      {loc.contact_email_primary && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-muted-foreground flex-shrink-0" />
                          <a href={`mailto:${loc.contact_email_primary}`} className="text-sm text-primary hover:underline truncate">
                            {loc.contact_email_primary}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Próximas acciones */}
              {(loc.appointment_date || loc.callback_date) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Próximas acciones</h4>
                    <div className="space-y-2">
                      {loc.appointment_date && (
                        <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded-md border border-purple-500/20">
                          <Calendar size={14} className="text-purple-500 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-purple-600">Cita programada</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(loc.appointment_date), "d 'de' MMMM, yyyy", { locale: es })}
                              {fullLocation?.appointment_time && ` a las ${fullLocation.appointment_time}`}
                            </p>
                          </div>
                        </div>
                      )}
                      {loc.callback_date && (
                        <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-md border border-yellow-500/20">
                          <Clock size={14} className="text-yellow-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-yellow-700">Callback programado</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(loc.callback_date), "d 'de' MMMM, yyyy", { locale: es })}
                              {fullLocation?.callback_time && ` a las ${fullLocation.callback_time}`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Historial de notas - Colapsable */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare size={12} />
                    Historial de Actividad
                  </span>
                  {showNotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showNotes && (
                  <LocationNotesSection locationId={location.id} canEdit={true} />
                )}
              </div>

              {/* Botón de editar */}
              {onEdit && (
                <>
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={onEdit}
                  >
                    <Edit size={14} className="mr-2" />
                    Editar detalles completos
                  </Button>
                </>
              )}

              {/* Metadata */}
              <div className="text-[10px] text-muted-foreground/60 space-y-0.5 pt-2">
                <p>Creado: {format(new Date(loc.created_at), "d MMM yyyy, HH:mm", { locale: es })}</p>
                {loc.updated_at && (
                  <p>Actualizado: {format(new Date(loc.updated_at), "d MMM yyyy, HH:mm", { locale: es })}</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default CanvassingDetailPanel;
