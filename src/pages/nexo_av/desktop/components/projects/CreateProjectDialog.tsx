import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

  // Fetch clients on mount
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

  // Reset form when dialog opens with preselected client
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

      const { data: result, error } = await supabase.rpc("create_project", {
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
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Crear Nuevo Proyecto
          </DialogTitle>
          <DialogDescription>
            Completa la información para crear un nuevo proyecto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Sección: Cliente */}
          <FormSection
            title="Asignación de Cliente"
            icon={<Users className="h-4 w-4" />}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Cliente <span className="text-destructive">*</span>
              </label>
              <Select
                value={form.watch("client_id")}
                onValueChange={(value) => form.setValue("client_id", value)}
                disabled={!!preselectedClientId || loadingClients}
              >
                <SelectTrigger className="w-full bg-background border-border">
                  <SelectValue placeholder={loadingClients ? "Cargando clientes..." : "Seleccionar cliente..."} />
                </SelectTrigger>
                <SelectContent>
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Estado inicial
              </label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) => form.setValue("status", value)}
              >
                <SelectTrigger className="w-full bg-background border-border">
                  <SelectValue placeholder="Seleccionar estado..." />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormSection>

          {/* Sección: Ubicación */}
          <FormSection
            title="Ubicación del Proyecto"
            icon={<MapPin className="h-4 w-4" />}
          >
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Dirección"
                placeholder="Calle, número..."
                value={form.watch("project_address") || ""}
                onChange={(e) => {
                  if (typeof e === 'object' && 'target' in e) {
                    form.setValue("project_address", e.target.value);
                  }
                }}
                size="md"
              />
              <TextInput
                label="Ciudad"
                placeholder="Ciudad"
                value={form.watch("project_city") || ""}
                onChange={(e) => {
                  if (typeof e === 'object' && 'target' in e) {
                    form.setValue("project_city", e.target.value);
                  }
                }}
                size="md"
              />
            </div>
          </FormSection>

          {/* Sección: Información del Proyecto */}
          <FormSection
            title="Información del Proyecto"
            icon={<FileText className="h-4 w-4" />}
          >
            <TextInput
              label="Nombre del Proyecto"
              placeholder="Ej: Instalación LED Oficinas Centrales"
              value={form.watch("project_name") || ""}
              onChange={(e) => {
                if (typeof e === 'object' && 'target' in e) {
                  form.setValue("project_name", e.target.value);
                }
              }}
              required
              error={!!form.formState.errors.project_name}
              errorMessage={form.formState.errors.project_name?.message}
              size="md"
            />

            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Nombre del Local"
                placeholder="Ej: Tienda Centro"
                value={form.watch("local_name") || ""}
                onChange={(e) => {
                  if (typeof e === 'object' && 'target' in e) {
                    form.setValue("local_name", e.target.value);
                  }
                }}
                size="md"
              />
              <TextInput
                label="Nº Pedido Cliente"
                placeholder="Referencia del cliente"
                value={form.watch("client_order_number") || ""}
                onChange={(e) => {
                  if (typeof e === 'object' && 'target' in e) {
                    form.setValue("client_order_number", e.target.value);
                  }
                }}
                size="md"
              />
            </div>

            <TextInput
              type="textarea"
              label="Notas"
              placeholder="Notas adicionales sobre el proyecto..."
              value={form.watch("notes") || ""}
              onChange={(e) => {
                if (typeof e === 'object' && 'target' in e) {
                  form.setValue("notes", e.target.value);
                }
              }}
              rows={3}
              size="md"
            />
          </FormSection>

          <DialogFooter className="pt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Crear Proyecto
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
