import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { CANVASSING_STATUSES, CanvassingStatus } from "./CanvassingTool";
import { X, Save, Loader2, MapPin, User, Building2, Phone, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CanvassingLocation {
  id: string;
  status: CanvassingStatus;
  // Ubicación
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string;
  latitude: number;
  longitude: number;
  location_references: string | null;
  // Empresa
  company_name: string;
  business_type: string | null;
  business_hours: string | null;
  years_in_operation: number | null;
  // Contacto
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_position: string | null;
  contact_phone_primary: string | null;
  contact_phone_secondary: string | null;
  contact_email_primary: string | null;
  preferred_contact_method: string | null;
  best_contact_time: string | null;
  is_decision_maker: boolean;
  // Estado
  priority: string | null;
  lead_score: number | null;
  lead_source: string | null;
  // Soluciones AV
  av_solutions_required: string[] | null;
  solution_details: string | null;
  number_of_screens: number | null;
  estimated_budget_range: string | null;
  project_urgency: string | null;
  // Situación actual
  has_current_av_installation: boolean;
  current_provider: string | null;
  has_maintenance_contract: boolean;
  // Comercial
  interest_level: number | null;
  // Citas
  appointment_date: string | null;
  appointment_time: string | null;
  callback_date: string | null;
  callback_time: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

interface CanvassingLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string | null;
  onSuccess?: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
];

const BUSINESS_TYPES = [
  { value: 'RETAIL', label: 'Comercio Minorista' },
  { value: 'RESTAURANT', label: 'Restaurante/Bar' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'OFFICE', label: 'Oficina' },
  { value: 'SHOPPING_CENTER', label: 'Centro Comercial' },
  { value: 'GYM', label: 'Gimnasio' },
  { value: 'CLINIC', label: 'Clínica/Hospital' },
  { value: 'EDUCATION', label: 'Educación' },
  { value: 'ENTERTAINMENT', label: 'Entretenimiento' },
  { value: 'OTHER', label: 'Otro' },
];

const BUDGET_RANGES = [
  { value: 'LESS_5K', label: '< 5.000€' },
  { value: '5K_15K', label: '5.000€ - 15.000€' },
  { value: '15K_30K', label: '15.000€ - 30.000€' },
  { value: '30K_50K', label: '30.000€ - 50.000€' },
  { value: 'MORE_50K', label: '> 50.000€' },
];

const CanvassingLocationDialog = ({ 
  open, 
  onOpenChange, 
  locationId, 
  onSuccess 
}: CanvassingLocationDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<Partial<CanvassingLocation>>({});
  const [activeTab, setActiveTab] = useState("ubicacion");

  useEffect(() => {
    if (open && locationId) {
      fetchLocation();
    } else if (open && !locationId) {
      setLoading(false);
      setLocation({});
    }
  }, [open, locationId]);

  const fetchLocation = async () => {
    if (!locationId) return;
    
    try {
      setLoading(true);
      // Use RPC function to get location data
      const { data, error } = await supabase.rpc('get_canvassing_location' as any, {
        p_location_id: locationId
      });

      if (error) {
        console.error('Error fetching location:', error);
        toast({
          title: "Error",
          description: "No se pudo cargar la ubicación",
          variant: "destructive",
        });
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        setLocation(data[0] as CanvassingLocation);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!locationId) return;

    try {
      setSaving(true);
      
      // Prepare update data - only include fields that exist in the table
      const updateData: Record<string, any> = {
        status: location.status,
        company_name: location.company_name || 'Sin nombre',
        address: location.address,
        city: location.city,
        province: location.province,
        postal_code: location.postal_code,
        country: location.country || 'ES',
        location_references: location.location_references,
        business_type: location.business_type,
        business_hours: location.business_hours,
        years_in_operation: location.years_in_operation,
        contact_first_name: location.contact_first_name,
        contact_last_name: location.contact_last_name,
        contact_position: location.contact_position,
        contact_phone_primary: location.contact_phone_primary,
        contact_phone_secondary: location.contact_phone_secondary,
        contact_email_primary: location.contact_email_primary,
        preferred_contact_method: location.preferred_contact_method,
        best_contact_time: location.best_contact_time,
        is_decision_maker: location.is_decision_maker,
        priority: location.priority,
        lead_score: location.lead_score,
        lead_source: location.lead_source,
        av_solutions_required: location.av_solutions_required,
        solution_details: location.solution_details,
        number_of_screens: location.number_of_screens,
        estimated_budget_range: location.estimated_budget_range,
        project_urgency: location.project_urgency,
        has_current_av_installation: location.has_current_av_installation,
        current_provider: location.current_provider,
        has_maintenance_contract: location.has_maintenance_contract,
        interest_level: location.interest_level,
        appointment_date: location.appointment_date,
        appointment_time: location.appointment_time,
        callback_date: location.callback_date,
        callback_time: location.callback_time,
      };

      const { error } = await supabase.rpc('update_canvassing_location' as any, {
        p_location_id: locationId,
        p_data: updateData
      });

      if (error) {
        console.error('Error updating location:', error);
        toast({
          title: "Error",
          description: "No se pudo guardar la ubicación",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Guardado",
        description: "Ubicación actualizada correctamente",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: "Error",
        description: "Ha ocurrido un error inesperado",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof CanvassingLocation>(field: K, value: CanvassingLocation[K]) => {
    setLocation(prev => ({ ...prev, [field]: value }));
  };

  const statusInfo = location.status ? CANVASSING_STATUSES[location.status] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {location.company_name || 'Nueva Ubicación'}
            {statusInfo && (
              <Badge 
                style={{ backgroundColor: statusInfo.color, color: 'white' }}
                className="ml-2"
              >
                {statusInfo.icon} {statusInfo.label}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid grid-cols-4 flex-shrink-0">
                <TabsTrigger value="ubicacion" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  Ubicación
                </TabsTrigger>
                <TabsTrigger value="contacto" className="text-xs">
                  <User className="h-3 w-3 mr-1" />
                  Contacto
                </TabsTrigger>
                <TabsTrigger value="negocio" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  Negocio
                </TabsTrigger>
                <TabsTrigger value="comercial" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Comercial
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <div className="pr-4 space-y-4">
                  {/* Ubicación Tab */}
                  <TabsContent value="ubicacion" className="mt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Nombre Empresa *</Label>
                        <Input
                          value={location.company_name || ''}
                          onChange={(e) => updateField('company_name', e.target.value)}
                          placeholder="Nombre del negocio"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label>Estado</Label>
                        <Select 
                          value={location.status || ''} 
                          onValueChange={(v) => updateField('status', v as CanvassingStatus)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CANVASSING_STATUSES).map(([code, status]) => (
                              <SelectItem key={code} value={code}>
                                {status.icon} {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label>Dirección</Label>
                        <Input
                          value={location.address || ''}
                          onChange={(e) => updateField('address', e.target.value)}
                          placeholder="Calle y número"
                        />
                      </div>

                      <div>
                        <Label>Ciudad</Label>
                        <Input
                          value={location.city || ''}
                          onChange={(e) => updateField('city', e.target.value)}
                          placeholder="Ciudad"
                        />
                      </div>

                      <div>
                        <Label>Provincia</Label>
                        <Input
                          value={location.province || ''}
                          onChange={(e) => updateField('province', e.target.value)}
                          placeholder="Provincia"
                        />
                      </div>

                      <div>
                        <Label>Código Postal</Label>
                        <Input
                          value={location.postal_code || ''}
                          onChange={(e) => updateField('postal_code', e.target.value)}
                          placeholder="CP"
                        />
                      </div>

                      <div>
                        <Label>País</Label>
                        <Input
                          value={location.country || 'ES'}
                          onChange={(e) => updateField('country', e.target.value)}
                          placeholder="País"
                        />
                      </div>

                      <div className="col-span-2">
                        <Label>Referencias de ubicación</Label>
                        <Textarea
                          value={location.location_references || ''}
                          onChange={(e) => updateField('location_references', e.target.value)}
                          placeholder="Notas sobre cómo encontrar el lugar..."
                          rows={2}
                        />
                      </div>

                      <div className="col-span-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        📍 Coordenadas: {location.latitude?.toFixed(6) || '-'}, {location.longitude?.toFixed(6) || '-'}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Contacto Tab */}
                  <TabsContent value="contacto" className="mt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nombre</Label>
                        <Input
                          value={location.contact_first_name || ''}
                          onChange={(e) => updateField('contact_first_name', e.target.value)}
                          placeholder="Nombre"
                        />
                      </div>

                      <div>
                        <Label>Apellidos</Label>
                        <Input
                          value={location.contact_last_name || ''}
                          onChange={(e) => updateField('contact_last_name', e.target.value)}
                          placeholder="Apellidos"
                        />
                      </div>

                      <div>
                        <Label>Cargo</Label>
                        <Input
                          value={location.contact_position || ''}
                          onChange={(e) => updateField('contact_position', e.target.value)}
                          placeholder="Cargo/Posición"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={location.is_decision_maker || false}
                          onCheckedChange={(checked) => updateField('is_decision_maker', checked)}
                        />
                        <Label>Toma de decisiones</Label>
                      </div>

                      <div>
                        <Label>Teléfono Principal</Label>
                        <Input
                          value={location.contact_phone_primary || ''}
                          onChange={(e) => updateField('contact_phone_primary', e.target.value)}
                          placeholder="+34 600 000 000"
                        />
                      </div>

                      <div>
                        <Label>Teléfono Secundario</Label>
                        <Input
                          value={location.contact_phone_secondary || ''}
                          onChange={(e) => updateField('contact_phone_secondary', e.target.value)}
                          placeholder="+34 600 000 000"
                        />
                      </div>

                      <div className="col-span-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={location.contact_email_primary || ''}
                          onChange={(e) => updateField('contact_email_primary', e.target.value)}
                          placeholder="email@empresa.com"
                        />
                      </div>

                      <div>
                        <Label>Mejor hora de contacto</Label>
                        <Select 
                          value={location.best_contact_time || ''} 
                          onValueChange={(v) => updateField('best_contact_time', v as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MORNING">Mañana (9-13h)</SelectItem>
                            <SelectItem value="AFTERNOON">Tarde (14-18h)</SelectItem>
                            <SelectItem value="EVENING">Noche (18-21h)</SelectItem>
                            <SelectItem value="ANYTIME">Cualquier hora</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Método preferido</Label>
                        <Select 
                          value={location.preferred_contact_method || ''} 
                          onValueChange={(v) => updateField('preferred_contact_method', v as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PHONE">Teléfono</SelectItem>
                            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                            <SelectItem value="EMAIL">Email</SelectItem>
                            <SelectItem value="IN_PERSON">En persona</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Negocio Tab */}
                  <TabsContent value="negocio" className="mt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo de Negocio</Label>
                        <Select 
                          value={location.business_type || ''} 
                          onValueChange={(v) => updateField('business_type', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {BUSINESS_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Años en operación</Label>
                        <Input
                          type="number"
                          value={location.years_in_operation || ''}
                          onChange={(e) => updateField('years_in_operation', parseInt(e.target.value) || null)}
                          placeholder="0"
                        />
                      </div>

                      <div className="col-span-2">
                        <Label>Horario comercial</Label>
                        <Input
                          value={location.business_hours || ''}
                          onChange={(e) => updateField('business_hours', e.target.value)}
                          placeholder="Ej: L-V 9:00-20:00, S 10:00-14:00"
                        />
                      </div>

                      <div className="col-span-2 flex items-center gap-2">
                        <Switch
                          checked={location.has_current_av_installation || false}
                          onCheckedChange={(checked) => updateField('has_current_av_installation', checked)}
                        />
                        <Label>Tiene instalación AV actual</Label>
                      </div>

                      {location.has_current_av_installation && (
                        <div className="col-span-2">
                          <Label>Proveedor actual</Label>
                          <Input
                            value={location.current_provider || ''}
                            onChange={(e) => updateField('current_provider', e.target.value)}
                            placeholder="Nombre del proveedor actual"
                          />
                        </div>
                      )}

                      <div className="col-span-2 flex items-center gap-2">
                        <Switch
                          checked={location.has_maintenance_contract || false}
                          onCheckedChange={(checked) => updateField('has_maintenance_contract', checked)}
                        />
                        <Label>Tiene contrato de mantenimiento</Label>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Comercial Tab */}
                  <TabsContent value="comercial" className="mt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Prioridad</Label>
                        <Select 
                          value={location.priority || ''} 
                          onValueChange={(v) => updateField('priority', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Nivel de interés (1-10)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={location.interest_level || ''}
                          onChange={(e) => updateField('interest_level', parseInt(e.target.value) || null)}
                          placeholder="1-10"
                        />
                      </div>

                      <div>
                        <Label>Rango de presupuesto</Label>
                        <Select 
                          value={location.estimated_budget_range || ''} 
                          onValueChange={(v) => updateField('estimated_budget_range', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {BUDGET_RANGES.map(range => (
                              <SelectItem key={range.value} value={range.value}>
                                {range.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Nº Pantallas/Dispositivos</Label>
                        <Input
                          type="number"
                          value={location.number_of_screens || ''}
                          onChange={(e) => updateField('number_of_screens', parseInt(e.target.value) || null)}
                          placeholder="0"
                        />
                      </div>

                      <div className="col-span-2">
                        <Label>Detalles de la solución</Label>
                        <Textarea
                          value={location.solution_details || ''}
                          onChange={(e) => updateField('solution_details', e.target.value)}
                          placeholder="Describe qué tipo de solución AV necesitan..."
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label>Fecha próxima cita</Label>
                        <Input
                          type="date"
                          value={location.appointment_date || ''}
                          onChange={(e) => updateField('appointment_date', e.target.value || null)}
                        />
                      </div>

                      <div>
                        <Label>Hora cita</Label>
                        <Input
                          type="time"
                          value={location.appointment_time || ''}
                          onChange={(e) => updateField('appointment_time', e.target.value || null)}
                        />
                      </div>

                      <div>
                        <Label>Fecha callback</Label>
                        <Input
                          type="date"
                          value={location.callback_date || ''}
                          onChange={(e) => updateField('callback_date', e.target.value || null)}
                        />
                      </div>

                      <div>
                        <Label>Hora callback</Label>
                        <Input
                          type="time"
                          value={location.callback_time || ''}
                          onChange={(e) => updateField('callback_time', e.target.value || null)}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CanvassingLocationDialog;
