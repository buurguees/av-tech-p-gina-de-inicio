import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2, MapPin, FileText, Users } from "lucide-react";
import { PROJECT_STATUSES } from "@/constants/projectStatuses";
import TextInput from "../common/TextInput";
import FormSection from "../common/FormSection";

const formSchema = z.object({
  project_name: z.string().min(1, "El nombre del proyecto es obligatorio"),
  client_id: z.string().min(1, "El cliente es obligatorio"),
  status: z.string().default("PLANNED"),
  project_address: z.string().optional(),
  project_city: z.string().optional(),
  local_name: z.string().optional(),
  client_order_number: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Client {
  id: string;
  company_name: string;
}

export interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedClientId?: string;
}

const CreateProjectDialog = ({
  open,
  onOpenChange,
  onSuccess,
  preselectedClientId,
}: CreateProjectDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      project_name: "",
      client_id: preselectedClientId || "",
      status: "PLANNED",
      project_address: "",
      project_city: "",
      local_name: "",
      client_order_number: "",
      notes: "",
    },
  });

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        const { data, error } = await supabase.rpc("list_clients", {
          p_search: null,
        });
        if (error) throw error;
        setClients(data || []);
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoadingClients(false);
      }
    };

    if (open) {
      fetchClients();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      form.reset({
        project_name: "",
        client_id: preselectedClientId || "",
        status: "PLANNED",
        project_address: "",
        project_city: "",
        local_name: "",
        client_order_number: "",
        notes: "",
      });
    }
  }, [open, preselectedClientId, form]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc("create_project", {
        p_project_name: data.project_name,
        p_client_id: data.client_id,
        p_status: data.status,
        p_project_address: data.project_address || null,
        p_project_city: data.project_city || null,
        p_local_name: data.local_name || null,
        p_client_order_number: data.client_order_number || null,
      });

      if (error) throw error;

      toast({
        title: "Proyecto creado",
        description: "El proyecto se ha creado correctamente.",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el proyecto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-background border-border p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-5 w-5 text-primary" />
            Crear Nuevo Proyecto
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
          <div className="px-6 py-5 space-y-5">
            {/* Sección: Información del Proyecto */}
            <FormSection
              title="Información del Proyecto"
              icon={<Building2 className="h-4 w-4" />}
              columns={1}
            >
              <TextInput
                label="Nombre del Proyecto"
                placeholder="Ej: Instalación LED Centro Comercial"
                value={form.watch("project_name") || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  form.setValue("project_name", e.target.value);
                }}
                size="sm"
                required
                error={!!form.formState.errors.project_name}
                errorMessage={form.formState.errors.project_name?.message}
              />
            </FormSection>

            {/* Sección: Asignación */}
            <FormSection
              title="Asignación"
              icon={<Users className="h-4 w-4" />}
              columns={2}
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Cliente <span className="text-destructive">*</span>
                </label>
                <Select
                  value={form.watch("client_id")}
                  onValueChange={(value) => form.setValue("client_id", value)}
                  disabled={!!preselectedClientId || loadingClients}
                >
                  <SelectTrigger className="h-9 text-sm bg-muted/20 border-border/70 hover:bg-muted/30 focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder={loadingClients ? "Cargando..." : "Seleccionar cliente..."} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.client_id && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.client_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Estado inicial
                </label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value) => form.setValue("status", value)}
                >
                  <SelectTrigger 
                    className={cn(
                      "h-9 text-sm border-border/70 hover:opacity-80 focus:ring-2 focus:ring-primary/20",
                      PROJECT_STATUSES.find(s => s.value === form.watch("status"))?.className
                    )}
                  >
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {PROJECT_STATUSES.map((status) => (
                      <SelectItem 
                        key={status.value} 
                        value={status.value}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span 
                            className={cn("w-2 h-2 rounded-full", status.className.split(' ')[0].replace('/20', ''))} 
                          />
                          {status.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormSection>

            {/* Sección: Ubicación */}
            <FormSection
              title="Ubicación"
              icon={<MapPin className="h-4 w-4" />}
              columns={1}
            >
              <TextInput
                label="Dirección"
                placeholder="Calle, número..."
                value={form.watch("project_address") || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  form.setValue("project_address", e.target.value);
                }}
                size="sm"
              />
              <div className="grid grid-cols-4 gap-3">
                <TextInput
                  label="Código Postal"
                  placeholder="Ej: 08001"
                  value=""
                  onChange={() => {}}
                  size="sm"
                />
                <TextInput
                  label="Ciudad"
                  placeholder="Ciudad"
                  value={form.watch("project_city") || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    form.setValue("project_city", e.target.value);
                  }}
                  size="sm"
                />
                <TextInput
                  label="Provincia"
                  placeholder="Provincia"
                  value=""
                  onChange={() => {}}
                  size="sm"
                />
                <TextInput
                  label="País"
                  placeholder="España"
                  value="España"
                  onChange={() => {}}
                  size="sm"
                  disabled
                />
              </div>
            </FormSection>

            {/* Sección: Información Adicional */}
            <FormSection
              title="Información Adicional"
              icon={<FileText className="h-4 w-4" />}
              columns={2}
            >
              <TextInput
                label="Nombre del Local"
                placeholder="Ej: Tienda Centro"
                value={form.watch("local_name") || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  form.setValue("local_name", e.target.value);
                }}
                size="sm"
              />

              <TextInput
                label="Nº Pedido Cliente"
                placeholder="Referencia del cliente"
                value={form.watch("client_order_number") || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  form.setValue("client_order_number", e.target.value);
                }}
                size="sm"
              />

              <div className="col-span-2">
                <TextInput
                  type="textarea"
                  label="Notas"
                  placeholder="Notas adicionales sobre el proyecto..."
                  value={form.watch("notes") || ""}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    form.setValue("notes", e.target.value);
                  }}
                  rows={3}
                  size="sm"
                />
              </div>
            </FormSection>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-9"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="h-9">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Nuevo Proyecto
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;
