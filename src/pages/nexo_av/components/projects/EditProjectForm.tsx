/**
 * EditProjectForm - Formulario compartido para editar proyecto
 * Usado por EditProjectDialog (desktop) y EditProjectSheet (mobile)
 */
import { useState, useEffect, useMemo, ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, MapPin, FileText, Users } from "lucide-react";
import { PROJECT_STATUSES } from "@/constants/projectStatuses";
import StatusSelector, { StatusOption } from "@/pages/nexo_av/desktop/components/common/StatusSelector";
import { cn } from "@/lib/utils";

// ============= INLINE FORM SECTION =============
interface InlineFormSectionProps {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  columns?: 1 | 2;
}

const InlineFormSection = ({ title, icon, children, columns = 1 }: InlineFormSectionProps) => (
  <div className="space-y-3">
    {(title || icon) && (
      <div className="flex items-center gap-2 pb-1 border-b border-border/50">
        {icon && <div className="text-primary">{icon}</div>}
        {title && <h4 className="text-sm font-semibold text-foreground">{title}</h4>}
      </div>
    )}
    <div className={cn("space-y-3", columns === 2 && "grid grid-cols-2 gap-3 space-y-0")}>
      {children}
    </div>
  </div>
);

// ============= LABELED INPUT WRAPPER =============
interface LabeledInputProps {
  label?: string;
  required?: boolean;
  children: ReactNode;
}

const LabeledInput = ({ label, required, children }: LabeledInputProps) => (
  <div className="space-y-1.5">
    {label && (
      <Label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
    )}
    {children}
  </div>
);

// ============= SCHEMA & TYPES =============
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

export interface ProjectDetail {
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

export interface EditProjectFormProps {
  project: ProjectDetail;
  onSuccess: () => void;
  onClose: () => void;
  /** Layout: "dialog" (2 cols) o "sheet" (1 col, mobile) */
  layout?: "dialog" | "sheet";
  /** ID del form para asociar botones externos (ej. form="edit-project-form") */
  formId?: string;
  renderFooter?: (props: { loading: boolean; onCancel: () => void }) => ReactNode;
}

export const EditProjectForm = ({
  project,
  onSuccess,
  onClose,
  layout = "dialog",
  formId = "edit-project-form",
  renderFooter,
}: EditProjectFormProps) => {
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

  const clientId = form.watch("client_id");
  const clientOrderNumber = form.watch("client_order_number");
  const projectCity = form.watch("project_city");
  const localName = form.watch("local_name");

  const availableClients = useMemo(() => clients.filter(client => client.lead_stage !== 'LOST'), [clients]);
  const selectedClient = useMemo(() => availableClients.find(c => c.id === clientId), [availableClients, clientId]);

  const generatedProjectName = useMemo(() => {
    const parts: string[] = [];
    if (project.project_number) parts.push(project.project_number);
    if (selectedClient?.company_name) parts.push(selectedClient.company_name);
    else if (project.client_name) parts.push(project.client_name);
    if (clientOrderNumber?.trim()) parts.push(clientOrderNumber.trim());
    if (projectCity?.trim()) parts.push(projectCity.trim());
    if (localName?.trim()) parts.push(localName.trim());
    return parts.join(" - ");
  }, [project.project_number, project.client_name, selectedClient, clientOrderNumber, projectCity, localName]);

  const clientOptions = useMemo(() => availableClients.map(client => ({ value: client.id, label: client.company_name })), [availableClients]);
  const statusOptions: StatusOption[] = useMemo(() => PROJECT_STATUSES.map(status => ({ value: status.value, label: status.label, className: status.className })), []);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        const { data, error } = await supabase.rpc("list_clients", { p_search: null });
        if (error) throw error;
        setClients(data || []);
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    form.reset({
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
    });
  }, [project, form]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
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

      const { error, data: result } = await supabase.rpc("update_project", updateData);
      if (error) throw error;
      if (result === false) throw new Error("No se pudo actualizar el proyecto.");

      toast({ title: "Proyecto actualizado", description: "El proyecto se ha actualizado correctamente." });
      onClose();
      onSuccess();
    } catch (error: any) {
      console.error("Error updating project:", error);
      toast({ title: "Error", description: error.message || "No se pudo actualizar el proyecto", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isSheet = layout === "sheet";

  return (
    <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
      <div className={cn("space-y-5", isSheet ? "px-4 py-4" : "px-6 py-5")}>
        <InlineFormSection title="Asignación" icon={<Users className="h-4 w-4" />} columns={isSheet ? 1 : 2}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Cliente <span className="text-destructive">*</span></label>
            <Select 
              value={form.watch("client_id")} 
              onValueChange={(value) => form.setValue("client_id", value, { shouldValidate: true })}
              disabled={true}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingClients ? "Cargando..." : "Seleccionar cliente..."} />
              </SelectTrigger>
              <SelectContent>
                {clientOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Estado</label>
            <StatusSelector
              currentStatus={form.watch("status")}
              statusOptions={statusOptions}
              onStatusChange={(value) => form.setValue("status", value)}
            />
          </div>
        </InlineFormSection>

        <InlineFormSection title="Ubicación" icon={<MapPin className="h-4 w-4" />}>
          <LabeledInput label="Dirección">
            <Input placeholder="Calle y número del local" value={form.watch("project_address") || ""} onChange={(e) => form.setValue("project_address", e.target.value)} />
          </LabeledInput>
          <LabeledInput label="Ciudad">
            <Input placeholder="Ciudad" value={form.watch("project_city") || ""} onChange={(e) => form.setValue("project_city", e.target.value)} />
          </LabeledInput>
          <LabeledInput label="Código Postal">
            <Input placeholder="08000" value={form.watch("postal_code") || ""} onChange={(e) => form.setValue("postal_code", e.target.value)} />
          </LabeledInput>
          <LabeledInput label="Provincia">
            <Input placeholder="Provincia" value={form.watch("province") || ""} onChange={(e) => form.setValue("province", e.target.value)} />
          </LabeledInput>
          <LabeledInput label="País">
            <Input placeholder="País" value={form.watch("country") || ""} onChange={(e) => form.setValue("country", e.target.value)} />
          </LabeledInput>
        </InlineFormSection>

        <InlineFormSection title="Información del Proyecto" icon={<FileText className="h-4 w-4" />}>
          <div className={cn("gap-3", isSheet ? "space-y-3" : "grid grid-cols-2")}>
            <LabeledInput label="Nº Pedido Cliente">
              <Input placeholder="Referencia del cliente" value={form.watch("client_order_number") || ""} onChange={(e) => form.setValue("client_order_number", e.target.value)} />
            </LabeledInput>
            <LabeledInput label="Nombre del Local">
              <Input placeholder="Ej: Tienda Centro" value={form.watch("local_name") || ""} onChange={(e) => form.setValue("local_name", e.target.value)} />
            </LabeledInput>
          </div>
          <LabeledInput label="Notas">
            <Textarea placeholder="Notas adicionales..." value={form.watch("notes") || ""} onChange={(e) => form.setValue("notes", e.target.value)} rows={3} />
          </LabeledInput>
        </InlineFormSection>

        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
          <label className="text-xs font-medium text-muted-foreground block mb-2">Nombre del Proyecto (generado automáticamente)</label>
          <div className="text-sm font-medium text-foreground min-h-[24px]">
            {generatedProjectName || <span className="text-muted-foreground/60 italic">Selecciona un cliente...</span>}
          </div>
        </div>
      </div>

      {renderFooter ? (
        renderFooter({ loading, onCancel: onClose })
      ) : (
        <div className={cn(
          "gap-2 border-t border-border/50 bg-muted/20 flex flex-col-reverse sm:flex-row sm:justify-end",
          isSheet ? "p-4 flex-shrink-0" : "px-6 py-4"
        )}>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      )}
    </form>
  );
};
