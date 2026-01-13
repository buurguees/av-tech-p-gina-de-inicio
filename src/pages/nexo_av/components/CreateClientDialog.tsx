import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const createFormSchema = (requireAddress: boolean = false) => z.object({
  company_name: z.string().min(1, "El nombre de la empresa es requerido"),
  contact_email: z.string().email("Email inválido").or(z.literal("")),
  contact_phone: z.string().min(1, "El teléfono es requerido"),
  lead_stage: z.string().default("NEW"),
  lead_source: z.string().optional(),
  industry_sector: z.string().optional(),
  tax_id: z.string().optional(),
  legal_name: z.string().optional(),
  notes: z.string().optional(),
  assigned_to: z.string().optional(),
  // Billing address fields
  billing_address: requireAddress 
    ? z.string().min(1, "La dirección es obligatoria para mostrar en el mapa")
    : z.string().optional(),
  billing_postal_code: z.string().optional(),
  billing_city: z.string().optional(),
  billing_province: z.string().optional(),
  billing_country: z.string().optional(),
  website: z.string().optional(),
});

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

interface AssignableUser {
  id: string;
  full_name: string;
  email: string;
  department: string;
}

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentUserId: string | null;
  isAdmin: boolean;
  enableGeocoding?: boolean; // Si es true, geocodifica la dirección y guarda coordenadas
}

const LEAD_SOURCES = [
  { value: 'WEBSITE', label: 'Sitio Web' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'REFERRAL', label: 'Referido' },
  { value: 'OUTBOUND', label: 'Outbound' },
  { value: 'TRADE_SHOW', label: 'Feria' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'COMMERCIAL', label: 'Comercial' },
  { value: 'OTHER', label: 'Otro' },
];

const INDUSTRY_SECTORS = [
  { value: 'RETAIL', label: 'Retail' },
  { value: 'HOSPITALITY', label: 'Hostelería' },
  { value: 'GYM', label: 'Gimnasio' },
  { value: 'OFFICE', label: 'Oficina' },
  { value: 'EVENTS', label: 'Eventos' },
  { value: 'EDUCATION', label: 'Educación' },
  { value: 'HEALTHCARE', label: 'Salud' },
  { value: 'DIGITAL_SIGNAGE', label: 'Cartelería Digital' },
  { value: 'OTHER', label: 'Otro' },
];

const LEAD_STAGES = [
  { value: 'NEW', label: 'Nuevo Lead' },
  { value: 'CONTACTED', label: 'Contactado' },
  { value: 'MEETING', label: 'Reunión Programada' },
  { value: 'PROPOSAL', label: 'Propuesta Enviada' },
  { value: 'NEGOTIATION', label: 'En Negociación' },
  { value: 'WON', label: 'Cliente (Ganado)' },
  { value: 'RECURRING', label: 'Recurrente' },
  { value: 'LOST', label: 'Perdido' },
  { value: 'PAUSED', label: 'Pausado' },
];

const CreateClientDialog = ({
  open,
  onOpenChange,
  onSuccess,
  currentUserId,
  isAdmin,
  enableGeocoding = false
}: CreateClientDialogProps) => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(createFormSchema(enableGeocoding)),
    defaultValues: {
      company_name: "",
      contact_email: "",
      contact_phone: "",
      lead_stage: "NEW",
      lead_source: undefined,
      industry_sector: undefined,
      tax_id: "",
      legal_name: "",
      notes: "",
      assigned_to: isAdmin ? undefined : currentUserId || undefined,
      billing_address: "",
      billing_postal_code: "",
      billing_city: "",
      billing_province: "",
      billing_country: "España",
      website: "",
    },
  });

  // Watch lead_source to auto-assign when "COMMERCIAL"
  const leadSource = form.watch('lead_source');

  useEffect(() => {
    // When source is COMMERCIAL, auto-assign to current user
    if (leadSource === 'COMMERCIAL' && currentUserId) {
      form.setValue('assigned_to', currentUserId);
    }
  }, [leadSource, currentUserId, form]);

  useEffect(() => {
    // Set default assigned_to for non-admins when dialog opens
    if (open && !isAdmin && currentUserId) {
      form.setValue('assigned_to', currentUserId);
    }
  }, [open, isAdmin, currentUserId, form]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.rpc('list_assignable_users');
      if (data) setAssignableUsers(data);
    };
    if (open) {
      fetchUsers();
      setGeocodeError(null);
    }
  }, [open]);

  const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      setGeocoding(true);
      setGeocodeError(null);
      
      // Delay de 1 segundo para cumplir con rate limiting de Nominatim
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setGeocodeError(null);
    try {
      // If enableGeocoding is true, geocode the address first
      let coords: { lat: number; lon: number } | null = null;
      if (enableGeocoding && data.billing_address) {
        coords = await geocodeAddress(data.billing_address);
        if (!coords) {
          setGeocodeError("No se pudo encontrar la dirección. Verifica que sea correcta.");
          setLoading(false);
          return;
        }
      }

      // First create the client (now returns table with client_id and client_number)
      const { data: clientResult, error: createError } = await supabase.rpc('create_client', {
        p_company_name: data.company_name.toUpperCase(),
        p_contact_phone: data.contact_phone,
        p_contact_email: data.contact_email,
        p_lead_stage: data.lead_stage,
        p_lead_source: data.lead_source || null,
        p_industry_sector: data.industry_sector || null,
        p_tax_id: data.tax_id || null,
        p_legal_name: data.legal_name || null,
        p_notes: data.notes || null,
        p_assigned_to: data.assigned_to || null,
        p_created_by: currentUserId,
      });

      if (createError) throw createError;
      
      // Extract client_id from the result array
      const clientId = clientResult?.[0]?.client_id;

      // Then update with billing address and website if provided
      const hasBillingData = data.billing_address || data.billing_city || data.billing_postal_code || data.billing_province || data.billing_country || data.website;
      
      if (clientId && hasBillingData) {
        const { error: updateError } = await supabase.rpc('update_client', {
          p_client_id: clientId,
          p_billing_address: data.billing_address || null,
          p_billing_city: data.billing_city || null,
          p_billing_postal_code: data.billing_postal_code || null,
          p_billing_province: data.billing_province || null,
          p_billing_country: data.billing_country || null,
          p_website: data.website || null,
        });
        
        if (updateError) {
          console.warn('Could not update billing address:', updateError);
        }
      }

      // If geocoding was successful, update coordinates
      if (clientId && coords && enableGeocoding && data.billing_address) {
        const { error: coordError } = await supabase.rpc('update_client_coordinates', {
          p_client_id: clientId,
          p_latitude: coords.lat,
          p_longitude: coords.lon,
          p_full_address: data.billing_address
        });
        
        if (coordError) {
          console.warn('Could not update coordinates:', coordError);
        }
      }

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('Error creating client:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "bg-zinc-900/95 backdrop-blur-2xl border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl shadow-2xl",
        isMobile && "max-w-[95vw] p-4 nexo-form-mobile"
      )}>
        <DialogHeader className={cn("pb-2", isMobile && "mb-4")}>
          <DialogTitle className={cn(isMobile && "text-lg")}>Nuevo Cliente / Lead</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={cn(
            "space-y-4",
            isMobile && "space-y-5"
          )}>
            {/* Basic info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Empresa *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className={cn(
                          "bg-white/5 border-white/10 text-white",
                          isMobile && "min-h-[44px] text-base"
                        )}
                        placeholder="Nombre comercial"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legal_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón Social</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className={cn(
                          "bg-white/5 border-white/10 text-white",
                          isMobile && "min-h-[44px] text-base"
                        )}
                        placeholder="Razón social legal"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email"
                        className={cn(
                          "bg-white/5 border-white/10 text-white",
                          isMobile && "min-h-[44px] text-base"
                        )}
                        placeholder="email@empresa.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="tel"
                        className={cn(
                          "bg-white/5 border-white/10 text-white",
                          isMobile && "min-h-[44px] text-base"
                        )}
                        placeholder="+34 600 000 000"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIF/CIF</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="B12345678"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="industry_sector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sector</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={cn(
                          "bg-white/5 border-white/10 text-white",
                          isMobile && "min-h-[44px] text-base"
                        )}>
                          <SelectValue placeholder="Seleccionar sector" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        {INDUSTRY_SECTORS.map((sector) => (
                          <SelectItem key={sector.value} value={sector.value} className="text-white">
                            {sector.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Billing Address - Collapsible section */}
            <div className="border border-white/10 rounded-lg p-3 space-y-3">
              <p className="text-sm font-medium text-white/70">
                {enableGeocoding ? "Dirección completa *" : "Dirección Fiscal (opcional)"}
              </p>
              
              <FormField
                control={form.control}
                name="billing_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {enableGeocoding ? "Dirección completa *" : "Dirección"}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className={cn(
                          "bg-white/5 border-white/10 text-white",
                          isMobile && "min-h-[44px] text-base"
                        )}
                        placeholder={enableGeocoding ? "Calle, número, ciudad, código postal" : "C/ Ejemplo, 123"}
                        onChange={(e) => {
                          field.onChange(e);
                          setGeocodeError(null);
                        }}
                      />
                    </FormControl>
                    {enableGeocoding && (
                      <p className="text-xs text-white/50">
                        La dirección se geocodificará automáticamente para mostrarla en el mapa
                      </p>
                    )}
                    {geocodeError && (
                      <p className="text-sm text-destructive">{geocodeError}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FormField
                  control={form.control}
                  name="billing_postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>C.P.</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className={cn(
                            "bg-white/5 border-white/10 text-white",
                            isMobile && "min-h-[44px] text-base"
                          )}
                          placeholder="08001"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billing_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className={cn(
                            "bg-white/5 border-white/10 text-white",
                            isMobile && "min-h-[44px] text-base"
                          )}
                          placeholder="Barcelona"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billing_province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provincia</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className={cn(
                            "bg-white/5 border-white/10 text-white",
                            isMobile && "min-h-[44px] text-base"
                          )}
                          placeholder="Barcelona"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billing_country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className={cn(
                            "bg-white/5 border-white/10 text-white",
                            isMobile && "min-h-[44px] text-base"
                          )}
                          placeholder="España"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Página Web</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="url"
                        className={cn(
                          "bg-white/5 border-white/10 text-white",
                          isMobile && "min-h-[44px] text-base"
                        )}
                        placeholder="https://ejemplo.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Lead info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="lead_stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        {LEAD_STAGES.map((stage) => (
                          <SelectItem key={stage.value} value={stage.value} className="text-white">
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lead_source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origen</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="¿Cómo nos encontró?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        {LEAD_SOURCES.map((source) => (
                          <SelectItem key={source.value} value={source.value} className="text-white">
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => {
                  // Find current user's name for display when disabled
                  const currentUserName = assignableUsers.find(u => u.id === field.value)?.full_name;
                  
                  return (
                    <FormItem>
                      <FormLabel>Asignar a {!isAdmin && "(automático)"}</FormLabel>
                      {!isAdmin ? (
                        // For non-admins: show a read-only input with their name
                        <FormControl>
                          <Input
                            value={currentUserName || "Tú"}
                            disabled
                            className="bg-white/5 border-white/10 text-white disabled:opacity-80 disabled:cursor-not-allowed"
                          />
                        </FormControl>
                      ) : (
                        // For admins: show the select dropdown
                        <Select 
                          onValueChange={(value) => field.onChange(value === "_none_" ? "" : value)} 
                          value={field.value || "_none_"}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue placeholder="Sin asignar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-zinc-900 border-white/10">
                            <SelectItem value="_none_" className="text-white/60">
                              Sin asignar
                            </SelectItem>
                            {assignableUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id} className="text-white">
                                {user.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      className={cn(
                        "bg-white/5 border-white/10 text-white min-h-[100px]",
                        isMobile && "min-h-[120px] text-base"
                      )}
                      placeholder="Información adicional sobre el cliente o lead..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className={cn(
              "flex justify-end gap-3 pt-3 border-t border-white/10",
              isMobile && "flex-col-reverse gap-2 sticky bottom-0 bg-background pb-2"
            )}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "text-white/60 hover:text-white hover:bg-white/10",
                  isMobile && "w-full touch-target"
                )}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className={cn(
                  "bg-white text-black hover:bg-white/90",
                  isMobile && "w-full touch-target"
                )}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear Cliente
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateClientDialog;
