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
  postal_code: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  local_name: z.string().optional(),
  client_order_number: z.string().optional(),
  notes: z.string().max(1000, "Las notas no pueden superar los 1000 caracteres").optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Client {
  id: string;
  company_name: string;
  lead_stage?: string;
}

interface ProjectDetail {
  id: string;
  project_number: string;
  project_name: string;
  client_id: string | null;
  client_name: string | null;
  status: string;
  project_address: string | null;
  project_city: string | null;
  client_order_number: string | null;
  local_name: string | null;
  notes: string | null;
}

export interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectDetail;
  onSuccess: () => void;
}

const EditProjectDialog = ({
  open,
  onOpenChange,
  project,
  onSuccess,
}: EditProjectDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: project.client_id || "",
      status: project.status || "PLANNED",
      project_address: project.project_address || "",
      project_city: project.project_city || "",
      postal_code: "",
      province: "",
      country: "España",
      local_name: project.local_name || "",
      client_order_number: project.client_order_number || "",
      notes: project.notes || "",
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

  // Generate project name automatically (same logic as CreateProjectDialog)
  const generatedProjectName = useMemo(() => {
    const parts: string[] = [];
    
    // Add project number
    if (project.project_number) {
      parts.push(project.project_number);
    }
    
    // Add client name
    if (selectedClient?.company_name) {
      parts.push(selectedClient.company_name);
    } else if (project.client_name) {
      parts.push(project.client_name);
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
  }, [project.project_number, project.client_name, selectedClient, clientOrderNumber, projectCity, localName]);

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

  // Function to parse address and separate components
  const parseAddress = (fullAddress: string | null) => {
    if (!fullAddress) {
      return {
        street: "",
        city: "",
        postalCode: "",
        province: "",
        country: "España",
      };
    }

    // Split by comma
    const parts = fullAddress.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
    
    let street = "";
    let city = "";
    let postalCode = "";
    let province = "";
    let country = "España";

    if (parts.length === 0) {
      return { street: fullAddress, city, postalCode, province, country };
    }

    // Pattern: "Dirección, Ciudad, Código Postal, Provincia/Ciudad, País"
    // Or: "Dirección, Ciudad, Código Postal, Ciudad (repetida)"
    
    // First part is usually the street address
    street = parts[0];

    // Try to find postal code (usually 5 digits)
    const postalCodeIndex = parts.findIndex((p) => /^\d{5}$/.test(p));
    if (postalCodeIndex !== -1) {
      postalCode = parts[postalCodeIndex];
      
      // City is usually before postal code
      if (postalCodeIndex > 0) {
        city = parts[postalCodeIndex - 1];
      }
      
      // Province or additional info after postal code
      if (postalCodeIndex < parts.length - 1) {
        const nextPart = parts[postalCodeIndex + 1];
        // If it's the same as city, it's probably a duplicate, otherwise it's province
        if (nextPart.toLowerCase() !== city.toLowerCase()) {
          province = nextPart;
        }
      }
      
      // Country might be the last part if it's not a duplicate
      if (parts.length > postalCodeIndex + 2) {
        const lastPart = parts[parts.length - 1];
        if (lastPart.toLowerCase() !== city.toLowerCase() && lastPart.toLowerCase() !== province.toLowerCase()) {
          country = lastPart;
        }
      }
    } else {
      // No postal code found, try simpler parsing
      if (parts.length >= 1) {
        street = parts[0];
      }
      if (parts.length >= 2) {
        city = parts[1];
      }
      if (parts.length >= 3) {
        // Could be postal code or province
        const thirdPart = parts[2];
        if (/^\d{5}$/.test(thirdPart)) {
          postalCode = thirdPart;
        } else {
          province = thirdPart;
        }
      }
      if (parts.length >= 4) {
        const fourthPart = parts[3];
        if (!postalCode && /^\d{5}$/.test(fourthPart)) {
          postalCode = fourthPart;
        } else if (!province) {
          province = fourthPart;
        }
      }
    }

    // If we have project_city from DB, use it
    if (project.project_city && !city) {
      city = project.project_city;
    }

    return { street, city, postalCode, province, country };
  };

  useEffect(() => {
    if (open) {
      const parsedAddress = parseAddress(project.project_address);
      
      form.reset({
        client_id: project.client_id || "",
        status: project.status || "PLANNED",
        project_address: parsedAddress.street,
        project_city: parsedAddress.city || project.project_city || "",
        postal_code: parsedAddress.postalCode,
        province: parsedAddress.province,
        country: parsedAddress.country,
        local_name: project.local_name || "",
        client_order_number: project.client_order_number || "",
        notes: project.notes || "",
      });
    }
  }, [open, project, form]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      // Get current form values to ensure we have all the data
      const formValues = form.getValues();

      const updateData = {
        p_project_id: project.id,
        p_status: formValues.status || data.status || project.status,
        p_project_address: (formValues.project_address || data.project_address || "").trim() || null,
        p_project_city: (formValues.project_city || data.project_city || "").trim() || null,
        p_local_name: (formValues.local_name || data.local_name || "").trim() || null,
        p_client_order_number: (formValues.client_order_number || data.client_order_number || "").trim() || null,
        p_notes: (formValues.notes || data.notes || "").trim() || null,
      };

      console.log("Updating project with data:", updateData);

      const { error, data: result } = await supabase.rpc("update_project", updateData);

      if (error) {
        console.error("RPC Error:", error);
        throw error;
      }

      console.log("Update result:", result);

      if (result === false) {
        throw new Error("No se pudo actualizar el proyecto. Verifica que el proyecto exista.");
      }

      toast({
        title: "Proyecto actualizado",
        description: "El proyecto se ha actualizado correctamente.",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating project:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el proyecto",
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
            Editar Proyecto
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
                  disabled={true} // Client ID cannot be changed after creation
                />
                {form.formState.errors.client_id && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.client_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Estado
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
              {/* Dirección - Calle y número */}
              <TextInput
                label="Dirección"
                placeholder="Calle y número del local"
                value={form.watch("project_address") || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  form.setValue("project_address", e.target.value, { shouldValidate: true });
                }}
                size="sm"
              />
              
              {/* Ciudad */}
              <TextInput
                label="Ciudad"
                placeholder="Ciudad"
                value={form.watch("project_city") || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  form.setValue("project_city", e.target.value, { shouldValidate: true });
                }}
                size="sm"
              />

              {/* Código Postal */}
              <TextInput
                label="Código Postal"
                placeholder="08000"
                value={form.watch("postal_code") || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  form.setValue("postal_code", e.target.value, { shouldValidate: true });
                }}
                size="sm"
              />

              {/* Provincia */}
              <TextInput
                label="Provincia"
                placeholder="Provincia"
                value={form.watch("province") || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  form.setValue("province", e.target.value, { shouldValidate: true });
                }}
                size="sm"
              />

              {/* País */}
              <TextInput
                label="País"
                placeholder="País"
                value={form.watch("country") || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  form.setValue("country", e.target.value, { shouldValidate: true });
                }}
                size="sm"
              />
            </FormSection>

            {/* Sección: Información del Proyecto */}
            <FormSection
              title="Información del Proyecto"
              icon={<FileText className="h-4 w-4" />}
              columns={1}
            >
              {/* Fila: Nº Pedido Cliente, Nombre del Local */}
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Nº Pedido Cliente"
                  placeholder="Referencia del cliente"
                  value={form.watch("client_order_number") || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    form.setValue("client_order_number", e.target.value, { shouldValidate: true });
                  }}
                  size="sm"
                />
                <TextInput
                  label="Nombre del Local"
                  placeholder="Ej: Tienda Centro"
                  value={form.watch("local_name") || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    form.setValue("local_name", e.target.value, { shouldValidate: true });
                  }}
                  size="sm"
                />
              </div>

              {/* Notas - ancho completo */}
              <TextInput
                type="textarea"
                label="Notas"
                placeholder="Notas adicionales sobre el proyecto..."
                value={form.watch("notes") || ""}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  form.setValue("notes", e.target.value, { shouldValidate: true });
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
                    El nombre se generará automáticamente...
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
            <Button type="submit" disabled={loading} className="h-9">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProjectDialog;
