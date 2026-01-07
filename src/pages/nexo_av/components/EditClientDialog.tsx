import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";


const formSchema = z.object({
  company_name: z.string().min(2, "Mínimo 2 caracteres").max(100),
  legal_name: z.string().max(100).optional().or(z.literal("")),
  contact_email: z.string().email("Email inválido").max(255),
  contact_phone: z.string().min(6, "Teléfono inválido").max(20),
  tax_id: z.string().max(20).optional().or(z.literal("")),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  instagram_handle: z.string().max(50).optional().or(z.literal("")),
  tiktok_handle: z.string().max(50).optional().or(z.literal("")),
  linkedin_url: z.string().url("URL inválida").optional().or(z.literal("")),
  billing_address: z.string().max(200).optional().or(z.literal("")),
  billing_city: z.string().max(100).optional().or(z.literal("")),
  billing_province: z.string().max(100).optional().or(z.literal("")),
  billing_postal_code: z.string().max(10).optional().or(z.literal("")),
  billing_country: z.string().max(100).optional().or(z.literal("")),
  industry_sector: z.string().optional().or(z.literal("")),
  lead_stage: z.string(),
  lead_source: z.string().optional().or(z.literal("")),
  urgency: z.string().optional().or(z.literal("")),
  
  assigned_to: z.string().optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  created_at: z.date().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AssignableUser {
  id: string;
  full_name: string;
  email: string;
  department: string;
}

interface ClientDetail {
  id: string;
  company_name: string;
  contact_phone: string;
  contact_email: string;
  tax_id: string | null;
  legal_name: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_province: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  website: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  linkedin_url: string | null;
  industry_sector: string | null;
  approximate_budget: number | null;
  urgency: string | null;
  lead_stage: string;
  lead_source: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
}

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientDetail;
  isAdmin: boolean;
  onSuccess: () => void;
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

const URGENCY_LEVELS = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
];

const EditClientDialog = ({ 
  open, 
  onOpenChange, 
  client,
  isAdmin,
  onSuccess,
}: EditClientDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: client.company_name || "",
      legal_name: client.legal_name || "",
      contact_email: client.contact_email || "",
      contact_phone: client.contact_phone || "",
      tax_id: client.tax_id || "",
      website: client.website || "",
      instagram_handle: client.instagram_handle || "",
      tiktok_handle: client.tiktok_handle || "",
      linkedin_url: client.linkedin_url || "",
      billing_address: client.billing_address || "",
      billing_city: client.billing_city || "",
      billing_province: client.billing_province || "",
      billing_postal_code: client.billing_postal_code || "",
      billing_country: client.billing_country || "",
      industry_sector: client.industry_sector || "",
      lead_stage: client.lead_stage || "NEW",
      lead_source: client.lead_source || "",
      urgency: client.urgency || "",
      assigned_to: client.assigned_to || "",
      notes: client.notes || "",
      created_at: client.created_at ? new Date(client.created_at) : undefined,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        company_name: client.company_name || "",
        legal_name: client.legal_name || "",
        contact_email: client.contact_email || "",
        contact_phone: client.contact_phone || "",
        tax_id: client.tax_id || "",
        website: client.website || "",
        instagram_handle: client.instagram_handle || "",
        tiktok_handle: client.tiktok_handle || "",
        linkedin_url: client.linkedin_url || "",
        billing_address: client.billing_address || "",
        billing_city: client.billing_city || "",
        billing_province: client.billing_province || "",
        billing_postal_code: client.billing_postal_code || "",
        billing_country: client.billing_country || "",
        industry_sector: client.industry_sector || "",
        lead_stage: client.lead_stage || "NEW",
        lead_source: client.lead_source || "",
        urgency: client.urgency || "",
        
        assigned_to: client.assigned_to || "",
        notes: client.notes || "",
        created_at: client.created_at ? new Date(client.created_at) : undefined,
      });
    }
  }, [open, client]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.rpc('list_assignable_users');
      if (!error && data) {
        setAssignableUsers(data);
      }
    };
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('update_client', {
        p_client_id: client.id,
        p_company_name: data.company_name,
        p_contact_email: data.contact_email,
        p_contact_phone: data.contact_phone,
        p_lead_stage: data.lead_stage,
        p_lead_source: data.lead_source || undefined,
        p_industry_sector: data.industry_sector || undefined,
        p_urgency: data.urgency || undefined,
        p_tax_id: data.tax_id || undefined,
        p_legal_name: data.legal_name || undefined,
        p_billing_address: data.billing_address || undefined,
        p_billing_city: data.billing_city || undefined,
        p_billing_province: data.billing_province || undefined,
        p_billing_postal_code: data.billing_postal_code || undefined,
        p_billing_country: data.billing_country || undefined,
        p_website: data.website || undefined,
        p_notes: data.notes || undefined,
        // Only admin can change assigned_to
        p_assigned_to: isAdmin && data.assigned_to ? data.assigned_to : undefined,
        // Only admin can change created_at
        p_created_at: isAdmin && data.created_at ? data.created_at.toISOString() : undefined,
      });

      if (error) {
        console.error('Error updating client:', error);
        toast({
          title: "Error",
          description: error.message || "No se pudo actualizar el cliente",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Cliente actualizado",
        description: "Los datos del cliente se han actualizado correctamente",
      });
      
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: "Error",
        description: "Ha ocurrido un error inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-white sm:max-w-2xl max-h-[90vh] p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-white">Editar Cliente</DialogTitle>
          <DialogDescription className="text-white/60">
            Modifica la información del cliente.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-2">
              <div className="space-y-3">
                <h3 className="text-white font-medium text-sm border-b border-white/10 pb-1">
                  Información de la Empresa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Nombre Comercial *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="legal_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Razón Social</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tax_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">NIF/CIF</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="industry_sector"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Sector</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue placeholder="Seleccionar sector" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-black border-white/10">
                            {INDUSTRY_SECTORS.map((sector) => (
                              <SelectItem key={sector.value} value={sector.value} className="text-white">
                                {sector.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-white font-medium text-sm border-b border-white/10 pb-1">
                  Información de Contacto
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Email *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Teléfono *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="tel"
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Sitio Web</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://"
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instagram_handle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Instagram</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="@usuario"
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-white font-medium text-sm border-b border-white/10 pb-1">
                  Dirección de Facturación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="billing_address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-white/80">Dirección</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Escribe la dirección..."
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billing_city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Ciudad</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billing_province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Provincia</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billing_postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Código Postal</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billing_country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">País</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="España"
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-white font-medium text-sm border-b border-white/10 pb-1">
                  Información CRM
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="lead_stage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Estado *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-black border-white/10">
                            {LEAD_STAGES.map((stage) => (
                              <SelectItem key={stage.value} value={stage.value} className="text-white">
                                {stage.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lead_source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Origen</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue placeholder="Seleccionar origen" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-black border-white/10">
                            {LEAD_SOURCES.map((source) => (
                              <SelectItem key={source.value} value={source.value} className="text-white">
                                {source.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Urgencia</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue placeholder="Seleccionar urgencia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-black border-white/10">
                            {URGENCY_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value} className="text-white">
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  {/* Presupuesto Medio - Solo lectura, calculado automáticamente */}
                  
                  {/* Only admin can see and change assigned_to */}
                  {isAdmin && (
                    <FormField
                      control={form.control}
                      name="assigned_to"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Asignado a</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === "_unassigned" ? "" : value)} 
                            value={field.value || "_unassigned"}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Sin asignar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-black border-white/10">
                              <SelectItem value="_unassigned" className="text-white/60">
                                Sin asignar
                              </SelectItem>
                              {assignableUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id} className="text-white">
                                  {user.full_name} ({user.department})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {/* Only admin can see and change created_at */}
                  {isAdmin && (
                    <FormField
                      control={form.control}
                      name="created_at"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Fecha de Alta</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: es })
                                  ) : (
                                    <span>Seleccionar fecha</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-black border-white/10" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={2}
                        className="bg-white/5 border-white/10 text-white resize-none"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-white text-black hover:bg-white/90"
                >
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientDialog;
