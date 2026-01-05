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

const formSchema = z.object({
  company_name: z.string().min(1, "El nombre de la empresa es requerido"),
  contact_email: z.string().email("Email inválido"),
  contact_phone: z.string().min(1, "El teléfono es requerido"),
  lead_stage: z.string().default("NEW"),
  lead_source: z.string().optional(),
  industry_sector: z.string().optional(),
  tax_id: z.string().optional(),
  legal_name: z.string().optional(),
  notes: z.string().optional(),
  assigned_to: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

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
}

const LEAD_SOURCES = [
  { value: 'WEBSITE', label: 'Sitio Web' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'REFERRAL', label: 'Referido' },
  { value: 'OUTBOUND', label: 'Outbound' },
  { value: 'TRADE_SHOW', label: 'Feria' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
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
  { value: 'OTHER', label: 'Otro' },
];

const LEAD_STAGES = [
  { value: 'NEW', label: 'Nuevo Lead' },
  { value: 'CONTACTED', label: 'Contactado' },
  { value: 'MEETING', label: 'Reunión Programada' },
  { value: 'PROPOSAL', label: 'Propuesta Enviada' },
  { value: 'NEGOTIATION', label: 'En Negociación' },
  { value: 'WON', label: 'Cliente (Ganado)' },
  { value: 'LOST', label: 'Perdido' },
  { value: 'PAUSED', label: 'Pausado' },
];

const CreateClientDialog = ({ 
  open, 
  onOpenChange, 
  onSuccess,
  currentUserId 
}: CreateClientDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
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
      assigned_to: undefined,
    },
  });

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.rpc('list_assignable_users');
      if (data) setAssignableUsers(data);
    };
    if (open) fetchUsers();
  }, [open]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('create_client', {
        p_company_name: data.company_name,
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

      if (error) throw error;

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
      <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Cliente / Lead</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Empresa *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-white/5 border-white/10 text-white"
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
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="Razón social legal"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        className="bg-white/5 border-white/10 text-white"
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
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="+34 600 000 000"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
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

            {/* Lead info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asignar a</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Seleccionar usuario" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        {assignableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id} className="text-white">
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
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
                      className="bg-white/5 border-white/10 text-white min-h-[100px]"
                      placeholder="Información adicional sobre el cliente o lead..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-white text-black hover:bg-white/90"
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
