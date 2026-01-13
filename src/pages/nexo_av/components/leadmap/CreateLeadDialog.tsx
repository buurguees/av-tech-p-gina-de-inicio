import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEAD_STAGE_LABELS } from "../../LeadMapPage";
import { Loader2 } from "lucide-react";

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentUserId: string | null;
}

const CreateLeadDialog = ({ open, onOpenChange, onSuccess, currentUserId }: CreateLeadDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    contactPerson: "",
    phone: "",
    email: "",
    status: "NEW",
    notes: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'address') {
      setGeocodeError(null);
    }
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      setGeocoding(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&countrycodes=es&limit=1`,
        {
          headers: {
            'User-Agent': 'NexoAV-LeadMap/1.0'
          }
        }
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();
      
      if (data.length === 0) {
        return null;
      }

      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.companyName.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la empresa es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!formData.address.trim()) {
      toast({
        title: "Error",
        description: "La dirección es obligatoria",
        variant: "destructive",
      });
      return;
    }

    if (!formData.phone.trim()) {
      toast({
        title: "Error",
        description: "El teléfono es obligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Geocode the address
      const coords = await geocodeAddress(formData.address);
      
      if (!coords) {
        setGeocodeError("No se pudo encontrar la dirección. Verifica que sea correcta.");
        setLoading(false);
        return;
      }

      // Create the client
      const { data: clientData, error: clientError } = await supabase.rpc('create_client', {
        p_company_name: formData.companyName.trim(),
        p_contact_email: formData.email.trim() || null,
        p_contact_phone: formData.phone.trim(),
        p_lead_stage: formData.status,
        p_assigned_to: currentUserId,
        p_notes: formData.notes.trim() || null,
      });

      if (clientError) throw clientError;

      const newClientId = clientData?.[0]?.client_id;
      
      if (!newClientId) throw new Error('No client ID returned');

      // Update coordinates
      const { error: coordError } = await supabase.rpc('update_client_coordinates', {
        p_client_id: newClientId,
        p_latitude: coords.lat,
        p_longitude: coords.lon,
        p_full_address: formData.address.trim()
      });

      if (coordError) {
        console.error('Error updating coordinates:', coordError);
      }

      // Add creation note
      await supabase.rpc('add_client_note', {
        p_client_id: newClientId,
        p_content: `Lead creado con estado "${LEAD_STAGE_LABELS[formData.status]}"`,
        p_note_type: 'creation'
      });

      // Add initial note if provided
      if (formData.notes.trim()) {
        await supabase.rpc('add_client_note', {
          p_client_id: newClientId,
          p_content: formData.notes.trim(),
          p_note_type: 'manual'
        });
      }

      toast({
        title: "Lead creado",
        description: `${formData.companyName} se ha añadido al mapa`,
      });

      // Reset form
      setFormData({
        companyName: "",
        address: "",
        contactPerson: "",
        phone: "",
        email: "",
        status: "NEW",
        notes: "",
      });
      setGeocodeError(null);

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('Error creating lead:', err);
      toast({
        title: "Error",
        description: "No se pudo crear el lead",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Lead</DialogTitle>
          <DialogDescription>
            Completa los datos para crear un nuevo lead en el mapa. La dirección se geocodificará automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nombre del local/empresa *</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              placeholder="Ej: Bar El Rincón"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección completa *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Calle, número, ciudad, código postal"
              required
            />
            {geocodeError && (
              <p className="text-sm text-destructive">{geocodeError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Persona de contacto</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
                placeholder="Nombre"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="912345678"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="email@ejemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado inicial</Label>
            <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEAD_STAGE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas iniciales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Añade observaciones iniciales..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || geocoding}>
              {(loading || geocoding) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {geocoding ? "Buscando dirección..." : loading ? "Guardando..." : "Guardar Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLeadDialog;
