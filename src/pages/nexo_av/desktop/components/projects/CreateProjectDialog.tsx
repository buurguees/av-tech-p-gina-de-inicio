import { useState, useEffect, useMemo } from "react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, MapPin, FileText, Users } from "lucide-react";
import { PROJECT_STATUSES } from "@/constants/projectStatuses";
import TextInput from "../common/TextInput";
import FormSection from "../common/FormSection";
import DropDown, { DropDownOption } from "../common/DropDown";
import StatusSelector, { StatusOption } from "../common/StatusSelector";

const formSchema = z.object({
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
  lead_stage?: string;
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
      client_id: preselectedClientId || "",
      status: "PLANNED",
      project_address: "",
      project_city: "",
      local_name: "",
      client_order_number: "",
      notes: "",
    },
  });

  // Watch form values for auto-generating project name
  const clientId = form.watch("client_id");
  const clientOrderNumber = form.watch("client_order_number");
  const projectCity = form.watch("project_city");
  const localName = form.watch("local_name");

  // Filter out LOST clients
  const availableClients = useMemo(() => {
    return clients.filter(client => client.lead_stage !== 'LOST');
  }, [clients]);

  // Get selected client name
  const selectedClient = useMemo(() => {
    return availableClients.find(c => c.id === clientId);
  }, [availableClients, clientId]);

  // Generate project name automatically
  const generatedProjectName = useMemo(() => {
    const parts: string[] = [];
    
    // Add client name
    if (selectedClient?.company_name) {
      parts.push(selectedClient.company_name);
    }
    
    // Add client order number
    if (clientOrderNumber?.trim()) {
      parts.push(clientOrderNumber.trim());
    }
    
    // Add city
    if (projectCity?.trim()) {
      parts.push(projectCity.trim());
    }
    
    // Add local name
    if (localName?.trim()) {
      parts.push(localName.trim());
    }
    
    return parts.join(" - ");
  }, [selectedClient, clientOrderNumber, projectCity, localName]);

  // Convert clients to DropDown options
  const clientOptions: DropDownOption[] = useMemo(() => {
    return availableClients.map((client) => ({
      value: client.id,
      label: client.company_name,
    }));
  }, [availableClients]);

  // Convert PROJECT_STATUSES to StatusSelector options
  const statusOptions: StatusOption[] = useMemo(() => {
    return PROJECT_STATUSES.map((status) => ({
      value: status.value,
      label: status.label,
      className: status.className,
    }));
  }, []);

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
    if (!generatedProjectName.trim()) {
      toast({
        title: "Error",
        description: "No se puede crear un proyecto sin nombre. Selecciona un cliente.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.rpc("create_project", {
        p_project_name: generatedProjectName,
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
                <DropDown
                  options={clientOptions}
                  value={form.watch("client_id")}
                  onSelect={(value) => form.setValue("client_id", value, { shouldValidate: true })}
                  placeholder={loadingClients ? "Cargando..." : "Seleccionar cliente..."}
                  disabled={!!preselectedClientId || loadingClients}
                />
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
                <StatusSelector
                  currentStatus={form.watch("status")}
                  statusOptions={statusOptions}
                  onStatusChange={(value) => form.setValue("status", value)}
                />
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
              <div className="grid grid-cols-2 gap-3">
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
                  label="Nombre del Local"
                  placeholder="Ej: Tienda Centro"
                  value={form.watch("local_name") || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    form.setValue("local_name", e.target.value);
                  }}
                  size="sm"
                />
              </div>
            </FormSection>

            {/* Sección: Información Adicional */}
            <FormSection
              title="Información Adicional"
              icon={<FileText className="h-4 w-4" />}
              columns={1}
            >
              <TextInput
                label="Nº Pedido Cliente"
                placeholder="Referencia del cliente"
                value={form.watch("client_order_number") || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  form.setValue("client_order_number", e.target.value);
                }}
                size="sm"
              />

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
            </FormSection>

            {/* Nombre del Proyecto Generado (Preview) */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Nombre del Proyecto (generado automáticamente)
              </label>
              <div className="text-sm font-medium text-foreground min-h-[24px]">
                {generatedProjectName || (
                  <span className="text-muted-foreground/60 italic">
                    Selecciona un cliente para generar el nombre...
                  </span>
                )}
              </div>
            </div>
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
            <Button type="submit" disabled={loading || !clientId} className="h-9">
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
