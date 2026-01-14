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
import { CANVASSING_STATUSES, CanvassingStatus } from "./CanvassingTool";
import { X, Save } from "lucide-react";

interface CanvassingLocation {
  id: string;
  status: CanvassingStatus;
  // A. Ubicación
  address: string;
  city: string;
  province?: string;
  postal_code?: string;
  country: string;
  latitude: number;
  longitude: number;
  location_references?: string;
  // B. Negocio/Empresa
  company_name: string;
  business_type?: string;
  business_size_sqm?: number;
  business_floors?: number;
  business_hours?: string;
  years_in_operation?: number;
  // C. Contacto
  contact_first_name?: string;
  contact_last_name?: string;
  contact_position?: string;
  contact_phone_primary?: string;
  contact_phone_secondary?: string;
  contact_email_primary?: string;
  preferred_contact_method?: string;
  best_contact_time?: string;
  is_decision_maker?: boolean;
  secondary_contact_name?: string;
  secondary_contact_phone?: string;
  // D. Estado y Clasificación
  priority?: string;
  lead_score?: number;
  lead_source?: string;
  assigned_to?: string;
  team_id?: string;
  // E. Necesidades y Soluciones AV
  av_solutions_required?: string[];
  solution_details?: string;
  number_of_screens?: number;
  equipment_locations?: string;
  estimated_budget_range?: string;
  project_urgency?: string;
  // F. Situación Actual
  has_current_av_installation?: boolean;
  current_provider?: string;
  installation_age_years?: number;
  current_installation_problems?: string;
  has_maintenance_contract?: boolean;
  maintenance_contract_provider?: string;
  maintenance_contract_end_date?: string;
  has_requested_competitor_quotes?: boolean;
  competitors_contacted?: string;
  // G. Información Comercial
  interest_level?: number;
  purchase_phase?: string;
  main_objections?: string[];
  objections_other?: string;
  economic_decision_maker_identified?: boolean;
  approval_process?: string;
  // H. Citas
  appointment_date?: string;
  appointment_time?: string;
  appointment_type?: string;
  appointment_location?: string;
  callback_date?: string;
  callback_time?: string;
  reminder_enabled?: boolean;
  reminder_time_before?: string;
  // I. Archivos
  photos?: string[];
  videos?: string[];
  documents?: string[];
  // J. Información Técnica
  technical_service_type?: string;
  maintenance_frequency?: string;
  proposed_maintenance_contract?: boolean;
  maintenance_contract_value?: number;
  existing_equipment?: string;
  has_active_warranties?: boolean;
  warranty_end_date?: string;
  local_access_info?: string;
  // K. Tags
  tags?: string[];
  // Tracking
  created_at?: string;
  updated_at?: string;
}

interface CanvassingLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string | null;
  onSuccess?: () => void;
}

const CanvassingLocationDialog = ({
  open,
  onOpenChange,
  locationId,
  onSuccess,
}: CanvassingLocationDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CanvassingLocation>>({});

  // Load location data
  useEffect(() => {
    if (open && locationId) {
      loadLocationData();
    } else if (open && !locationId) {
      // New location - reset form
      setFormData({});
    }
  }, [open, locationId]);

  const loadLocationData = async () => {
    if (!locationId) return;

    try {
      const { data, error } = await supabase.rpc('get_canvassing_location', {
        p_location_id: locationId,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const location = data[0];
        // Asegurar que las coordenadas se parsean correctamente
        const formDataWithCoords = {
          ...location,
          latitude: location.latitude ? parseFloat(String(location.latitude)) : undefined,
          longitude: location.longitude ? parseFloat(String(location.longitude)) : undefined,
        };
        console.log('[CanvassingLocationDialog] Loaded location data:', formDataWithCoords);
        setFormData(formDataWithCoords);
      }
    } catch (error) {
      console.error('Error loading location:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del punto",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    // Validar campos obligatorios
    if (!formData.company_name || formData.company_name.trim() === '' || formData.company_name === 'Sin nombre') {
      toast({
        title: "Campo obligatorio",
        description: "El nombre del comercio es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      toast({
        title: "Campo obligatorio",
        description: "Las coordenadas son obligatorias",
        variant: "destructive",
      });
      return;
    }

    if (!formData.status) {
      toast({
        title: "Campo obligatorio",
        description: "El estado del lead (PIN) es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (locationId) {
        // Update existing using RPC
        const { data, error } = await supabase.rpc('update_canvassing_location', {
          p_location_id: locationId,
          p_data: formData as any,
        });

        if (error) throw error;

        toast({
          title: "Actualizado",
          description: "El punto de Canvassing se ha actualizado correctamente",
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving location:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el punto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof CanvassingLocation, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const statusInfo = formData.status ? CANVASSING_STATUSES[formData.status] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {statusInfo && (
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-xl shadow-sm"
                  style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color, border: `2px solid ${statusInfo.color}30` }}
                >
                  {statusInfo.icon}
                </div>
              )}
              <div>
                <DialogTitle className="text-xl">
                  {locationId ? 'Editar Punto de Canvassing' : 'Nuevo Punto de Canvassing'}
                </DialogTitle>
                {statusInfo && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                      style={{ borderColor: statusInfo.color, color: statusInfo.color }}
                    >
                      {statusInfo.code}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {statusInfo.label} - {statusInfo.description}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <Tabs defaultValue="location" className="w-full">
            <TabsList className="grid w-full grid-cols-8 mb-6 bg-muted/50">
              <TabsTrigger value="location">Ubicación</TabsTrigger>
              <TabsTrigger value="business">Negocio</TabsTrigger>
              <TabsTrigger value="contact">Contacto</TabsTrigger>
              <TabsTrigger value="status">Estado</TabsTrigger>
              <TabsTrigger value="solutions">Soluciones AV</TabsTrigger>
              <TabsTrigger value="current">Situación</TabsTrigger>
              <TabsTrigger value="commercial">Comercial</TabsTrigger>
              <TabsTrigger value="appointments">Citas</TabsTrigger>
              <TabsTrigger value="technical">Técnico</TabsTrigger>
              <TabsTrigger value="notes">Notas</TabsTrigger>
            </TabsList>

            {/* A. INFORMACIÓN DE UBICACIÓN */}
            <TabsContent value="location" className="space-y-5 mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-semibold">
                      Dirección
                    </Label>
                    <Input
                      id="address"
                      value={formData.address || ''}
                      onChange={(e) => updateField('address', e.target.value)}
                      placeholder="Calle y número (se completa automáticamente)"
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Se completa automáticamente con geocodificación
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-semibold">
                      Ciudad
                    </Label>
                    <Input
                      id="city"
                      value={formData.city || ''}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="Se completa automáticamente"
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Se completa automáticamente con geocodificación
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province" className="text-sm font-semibold">
                      Provincia
                    </Label>
                    <Input
                      id="province"
                      value={formData.province || ''}
                      onChange={(e) => updateField('province', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code" className="text-sm font-semibold">
                      Código Postal
                    </Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code || ''}
                      onChange={(e) => updateField('postal_code', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm font-semibold">
                      País
                    </Label>
                    <Input
                      id="country"
                      value={formData.country || 'ES'}
                      onChange={(e) => updateField('country', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
                  <Label className="text-sm font-semibold">
                    Coordenadas GPS <span className="text-red-500">*</span> (Autocompletadas)
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        step="any"
                        value={formData.latitude !== undefined && formData.latitude !== null ? formData.latitude : ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : undefined;
                          updateField('latitude', val);
                        }}
                        placeholder="Latitud"
                        className="font-mono text-sm"
                        readOnly
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        step="any"
                        value={formData.longitude !== undefined && formData.longitude !== null ? formData.longitude : ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : undefined;
                          updateField('longitude', val);
                        }}
                        placeholder="Longitud"
                        className="font-mono text-sm"
                        readOnly
                      />
                    </div>
                  </div>
                  {(formData.latitude && formData.longitude) && (
                    <p className="text-xs text-muted-foreground mt-2 font-mono bg-background px-2 py-1 rounded">
                      📍 {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location_references" className="text-sm font-semibold">
                    Referencias de ubicación
                  </Label>
                  <Textarea
                    id="location_references"
                    value={formData.location_references || ''}
                    onChange={(e) => updateField('location_references', e.target.value)}
                    placeholder='Ej: "Local junto a farmacia", "Edificio de oficinas planta 3"'
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>
            </TabsContent>

            {/* B. INFORMACIÓN DEL NEGOCIO/EMPRESA */}
            <TabsContent value="business" className="space-y-5 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-sm font-semibold">
                    Nombre del comercio/empresa <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company_name"
                    value={formData.company_name || ''}
                    onChange={(e) => updateField('company_name', e.target.value)}
                    placeholder="Ej: Restaurante El Buen Sabor"
                    className="text-sm"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Campo obligatorio
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_type" className="text-sm font-semibold">
                      Tipo de negocio
                    </Label>
                    <Select
                      value={formData.business_type || ''}
                      onValueChange={(value) => updateField('business_type', value)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RETAIL">Retail/Comercio</SelectItem>
                        <SelectItem value="RESTAURANT">Restaurante/Bar/Cafetería</SelectItem>
                        <SelectItem value="HOTEL">Hotel/Alojamiento</SelectItem>
                        <SelectItem value="OFFICE">Oficinas corporativas</SelectItem>
                        <SelectItem value="SHOPPING_MALL">Centro comercial</SelectItem>
                        <SelectItem value="GYM">Gimnasio/Centro deportivo</SelectItem>
                        <SelectItem value="CLINIC">Clínica/Centro médico</SelectItem>
                        <SelectItem value="DEALERSHIP">Concesionario</SelectItem>
                        <SelectItem value="SHOWROOM">Showroom</SelectItem>
                        <SelectItem value="WAREHOUSE">Almacén/Nave industrial</SelectItem>
                        <SelectItem value="EDUCATION">Centro educativo</SelectItem>
                        <SelectItem value="OTHER">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business_size_sqm" className="text-sm font-semibold">
                      Tamaño del local (m²)
                    </Label>
                    <Input
                      id="business_size_sqm"
                      type="number"
                      value={formData.business_size_sqm || ''}
                      onChange={(e) => updateField('business_size_sqm', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="Ej: 150"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business_floors" className="text-sm font-semibold">
                      Número de plantas/espacios
                    </Label>
                    <Input
                      id="business_floors"
                      type="number"
                      value={formData.business_floors || ''}
                      onChange={(e) => updateField('business_floors', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Ej: 2"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="years_in_operation" className="text-sm font-semibold">
                      Años en funcionamiento
                    </Label>
                    <Input
                      id="years_in_operation"
                      type="number"
                      value={formData.years_in_operation || ''}
                      onChange={(e) => updateField('years_in_operation', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Ej: 5"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_hours" className="text-sm font-semibold">
                    Horario comercial
                  </Label>
                  <Input
                    id="business_hours"
                    value={formData.business_hours || ''}
                    onChange={(e) => updateField('business_hours', e.target.value)}
                    placeholder="Ej: L-V 9:00-18:00, S 10:00-14:00"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Para planificar visitas
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* B. INFORMACIÓN DE CONTACTO */}
            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_first_name">Nombre</Label>
                  <Input
                    id="contact_first_name"
                    value={formData.contact_first_name || ''}
                    onChange={(e) => updateField('contact_first_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_last_name">Apellidos</Label>
                  <Input
                    id="contact_last_name"
                    value={formData.contact_last_name || ''}
                    onChange={(e) => updateField('contact_last_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone_primary">Teléfono Principal</Label>
                  <Input
                    id="contact_phone_primary"
                    value={formData.contact_phone_primary || ''}
                    onChange={(e) => updateField('contact_phone_primary', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone_secondary">Teléfono Secundario</Label>
                  <Input
                    id="contact_phone_secondary"
                    value={formData.contact_phone_secondary || ''}
                    onChange={(e) => updateField('contact_phone_secondary', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email_primary">Email Principal</Label>
                  <Input
                    id="contact_email_primary"
                    type="email"
                    value={formData.contact_email_primary || ''}
                    onChange={(e) => updateField('contact_email_primary', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email_secondary">Email Secundario</Label>
                  <Input
                    id="contact_email_secondary"
                    type="email"
                    value={formData.contact_email_secondary || ''}
                    onChange={(e) => updateField('contact_email_secondary', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferred_contact_method">Método de Contacto Preferido</Label>
                  <Select
                    value={formData.preferred_contact_method || ''}
                    onValueChange={(value) => updateField('preferred_contact_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PHONE">Teléfono</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="best_contact_time">Mejor Horario para Contactar</Label>
                  <Select
                    value={formData.best_contact_time || ''}
                    onValueChange={(value) => updateField('best_contact_time', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MORNING">Mañana</SelectItem>
                      <SelectItem value="AFTERNOON">Tarde</SelectItem>
                      <SelectItem value="EVENING">Noche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* D. ESTADO Y CLASIFICACIÓN DEL LEAD */}
            <TabsContent value="status" className="space-y-5 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-semibold">
                    Estado del Lead (PIN) <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.status || ''}
                    onValueChange={(value) => updateField('status', value as CanvassingStatus)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CANVASSING_STATUSES).map(([code, status]) => (
                        <SelectItem key={code} value={code}>
                          <div className="flex items-center gap-2">
                            <span>{status.icon}</span>
                            <span>{status.code}</span>
                            <span className="text-muted-foreground">- {status.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Campo obligatorio. Este estado se establece al crear el punto desde el mapa.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-sm font-semibold">
                      Prioridad
                    </Label>
                    <Select
                      value={formData.priority || 'MEDIUM'}
                      onValueChange={(value) => updateField('priority', value)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Baja</SelectItem>
                        <SelectItem value="MEDIUM">Media</SelectItem>
                        <SelectItem value="HIGH">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead_score" className="text-sm font-semibold">
                      Puntuación del Lead (0-100)
                    </Label>
                    <Input
                      id="lead_score"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.lead_score || ''}
                      onChange={(e) => updateField('lead_score', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead_source" className="text-sm font-semibold">
                      Fuente del Lead
                    </Label>
                    <Input
                      id="lead_source"
                      value={formData.lead_source || ''}
                      onChange={(e) => updateField('lead_source', e.target.value)}
                      placeholder="Canvassing, Referido, Web, Llamada entrante, LinkedIn, Evento"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* D. INFORMACIÓN DE LA PROPIEDAD */}
            <TabsContent value="property" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="property_type">Tipo de Propiedad</Label>
                  <Select
                    value={formData.property_type || ''}
                    onValueChange={(value) => updateField('property_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE_FAMILY">Casa Unifamiliar</SelectItem>
                      <SelectItem value="APARTMENT">Apartamento</SelectItem>
                      <SelectItem value="DUPLEX">Dúplex</SelectItem>
                      <SelectItem value="COMMERCIAL">Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property_status">Estado de la Propiedad</Label>
                  <Select
                    value={formData.property_status || ''}
                    onValueChange={(value) => updateField('property_status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">Propietario</SelectItem>
                      <SelectItem value="RENTER">Inquilino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_name">Nombre del Propietario</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner_name || ''}
                    onChange={(e) => updateField('owner_name', e.target.value)}
                    placeholder="Si es diferente del contacto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="construction_year">Año de Construcción</Label>
                  <Input
                    id="construction_year"
                    type="number"
                    value={formData.construction_year || ''}
                    onChange={(e) => updateField('construction_year', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property_size_sqm">Tamaño (m²)</Label>
                  <Input
                    id="property_size_sqm"
                    type="number"
                    step="0.01"
                    value={formData.property_size_sqm || ''}
                    onChange={(e) => updateField('property_size_sqm', parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number_of_floors">Número de Plantas</Label>
                  <Input
                    id="number_of_floors"
                    type="number"
                    value={formData.number_of_floors || ''}
                    onChange={(e) => updateField('number_of_floors', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roof_condition">Condición del Tejado</Label>
                  <Select
                    value={formData.roof_condition || ''}
                    onValueChange={(value) => updateField('roof_condition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOOD">Buena</SelectItem>
                      <SelectItem value="REGULAR">Regular</SelectItem>
                      <SelectItem value="POOR">Mala</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facade_condition">Condición de la Fachada</Label>
                  <Select
                    value={formData.facade_condition || ''}
                    onValueChange={(value) => updateField('facade_condition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOOD">Buena</SelectItem>
                      <SelectItem value="REGULAR">Regular</SelectItem>
                      <SelectItem value="POOR">Mala</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roof_type">Tipo de Tejado</Label>
                  <Select
                    value={formData.roof_type || ''}
                    onValueChange={(value) => updateField('roof_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TILES">Tejas</SelectItem>
                      <SelectItem value="SLATE">Pizarra</SelectItem>
                      <SelectItem value="METAL">Metal</SelectItem>
                      <SelectItem value="OTHER">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_renovation_date">Última Renovación</Label>
                  <Input
                    id="last_renovation_date"
                    type="date"
                    value={formData.last_renovation_date || ''}
                    onChange={(e) => updateField('last_renovation_date', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* E. INFORMACIÓN COMERCIAL */}
            <TabsContent value="commercial" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridad</Label>
                  <Select
                    value={formData.priority || 'MEDIUM'}
                    onValueChange={(value) => updateField('priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Baja</SelectItem>
                      <SelectItem value="MEDIUM">Media</SelectItem>
                      <SelectItem value="HIGH">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead_score">Puntuación del Lead (0-100)</Label>
                  <Input
                    id="lead_score"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.lead_score || ''}
                    onChange={(e) => updateField('lead_score', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead_source">Fuente del Lead</Label>
                  <Input
                    id="lead_source"
                    value={formData.lead_source || ''}
                    onChange={(e) => updateField('lead_source', e.target.value)}
                    placeholder="Canvassing, Referido, Web..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated_budget">Presupuesto Estimado (€)</Label>
                  <Input
                    id="estimated_budget"
                    type="number"
                    step="0.01"
                    value={formData.estimated_budget || ''}
                    onChange={(e) => updateField('estimated_budget', parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="need_urgency">Urgencia de la Necesidad</Label>
                  <Select
                    value={formData.need_urgency || ''}
                    onValueChange={(value) => updateField('need_urgency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IMMEDIATE">Inmediata</SelectItem>
                      <SelectItem value="1_3_MONTHS">1-3 meses</SelectItem>
                      <SelectItem value="3_6_MONTHS">3-6 meses</SelectItem>
                      <SelectItem value="MORE_6_MONTHS">Más de 6 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interest_level">Nivel de Interés (1-10)</Label>
                  <Input
                    id="interest_level"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.interest_level || ''}
                    onChange={(e) => updateField('interest_level', parseInt(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_interest">Producto/Servicio de Interés</Label>
                <Input
                  id="product_interest"
                  value={(formData.product_interest || []).join(', ')}
                  onChange={(e) => updateField('product_interest', e.target.value.split(',').map(s => s.trim()))}
                  placeholder="Solar, Tejado, Ventanas (separados por comas)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="main_objections">Objeciones Principales</Label>
                <Textarea
                  id="main_objections"
                  value={formData.main_objections || ''}
                  onChange={(e) => updateField('main_objections', e.target.value)}
                  placeholder="Precio, Tiempo, Desconfianza..."
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="competitors_contacted"
                  checked={formData.competitors_contacted || false}
                  onChange={(e) => updateField('competitors_contacted', e.target.checked)}
                />
                <Label htmlFor="competitors_contacted">Competidores Contactados</Label>
              </div>
              {formData.competitors_contacted && (
                <div className="space-y-2">
                  <Label htmlFor="competitors_list">Lista de Competidores</Label>
                  <Textarea
                    id="competitors_list"
                    value={formData.competitors_list || ''}
                    onChange={(e) => updateField('competitors_list', e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </TabsContent>

            {/* F. CITAS Y SEGUIMIENTOS */}
            <TabsContent value="appointments" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appointment_date">Fecha de Cita</Label>
                  <Input
                    id="appointment_date"
                    type="date"
                    value={formData.appointment_date || ''}
                    onChange={(e) => updateField('appointment_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointment_time">Hora de Cita</Label>
                  <Input
                    id="appointment_time"
                    type="time"
                    value={formData.appointment_time || ''}
                    onChange={(e) => updateField('appointment_time', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointment_type">Tipo de Cita</Label>
                  <Select
                    value={formData.appointment_type || ''}
                    onValueChange={(value) => updateField('appointment_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIRST_VISIT">Primera Visita</SelectItem>
                      <SelectItem value="FOLLOW_UP">Seguimiento</SelectItem>
                      <SelectItem value="CLOSING">Cierre</SelectItem>
                      <SelectItem value="INSTALLATION">Instalación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="callback_date">Fecha de Callback</Label>
                  <Input
                    id="callback_date"
                    type="date"
                    value={formData.callback_date || ''}
                    onChange={(e) => updateField('callback_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="callback_time">Hora de Callback</Label>
                  <Input
                    id="callback_time"
                    type="time"
                    value={formData.callback_time || ''}
                    onChange={(e) => updateField('callback_time', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminder_time_before">Tiempo de Recordatorio</Label>
                  <Select
                    value={formData.reminder_time_before || ''}
                    onValueChange={(value) => updateField('reminder_time_before', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15 min">15 minutos antes</SelectItem>
                      <SelectItem value="30 min">30 minutos antes</SelectItem>
                      <SelectItem value="1 hora">1 hora antes</SelectItem>
                      <SelectItem value="1 día">1 día antes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reminder_enabled"
                  checked={formData.reminder_enabled || false}
                  onChange={(e) => updateField('reminder_enabled', e.target.checked)}
                />
                <Label htmlFor="reminder_enabled">Activar Notificación de Recordatorio</Label>
              </div>
            </TabsContent>

            {/* G. NOTAS Y OBSERVACIONES */}
            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="general_notes">Notas Generales</Label>
                <Textarea
                  id="general_notes"
                  value={formData.general_notes || ''}
                  onChange={(e) => updateField('general_notes', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visit_notes">Notas de la Visita</Label>
                <Textarea
                  id="visit_notes"
                  value={formData.visit_notes || ''}
                  onChange={(e) => updateField('visit_notes', e.target.value)}
                  placeholder="Qué se habló, reacciones, detalles importantes..."
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internal_notes">Notas Internas</Label>
                <Textarea
                  id="internal_notes"
                  value={formData.internal_notes || ''}
                  onChange={(e) => updateField('internal_notes', e.target.value)}
                  placeholder="Solo visibles para el equipo"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags/Etiquetas</Label>
                <Input
                  id="tags"
                  value={(formData.tags || []).join(', ')}
                  onChange={(e) => updateField('tags', e.target.value.split(',').map(s => s.trim()))}
                  placeholder="perro grande, portón automático (separados por comas)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custom_field_1">Campo Personalizado 1</Label>
                  <Input
                    id="custom_field_1"
                    value={formData.custom_field_1 || ''}
                    onChange={(e) => updateField('custom_field_1', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom_field_2">Campo Personalizado 2</Label>
                  <Input
                    id="custom_field_2"
                    value={formData.custom_field_2 || ''}
                    onChange={(e) => updateField('custom_field_2', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom_field_3">Campo Personalizado 3</Label>
                  <Input
                    id="custom_field_3"
                    value={formData.custom_field_3 || ''}
                    onChange={(e) => updateField('custom_field_3', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom_field_4">Campo Personalizado 4</Label>
                  <Input
                    id="custom_field_4"
                    value={formData.custom_field_4 || ''}
                    onChange={(e) => updateField('custom_field_4', e.target.value)}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="custom_field_5">Campo Personalizado 5</Label>
                  <Input
                    id="custom_field_5"
                    value={formData.custom_field_5 || ''}
                    onChange={(e) => updateField('custom_field_5', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="min-w-[120px]">
            {loading ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CanvassingLocationDialog;
