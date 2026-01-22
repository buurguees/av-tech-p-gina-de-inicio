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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2, MapPin, FileText } from "lucide-react";
import { PROJECT_STATUSES } from "@/constants/projectStatuses";

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
      <DialogContent className="sm:max-w-[600px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Crear Nuevo Proyecto
          </DialogTitle>
          <DialogDescription>
            Completa la información para crear un nuevo proyecto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre del proyecto */}
          <div className="space-y-2">
            <Label htmlFor="project_name">
              Nombre del Proyecto <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project_name"
              placeholder="Ej: Instalación LED Oficinas Centrales"
              {...form.register("project_name")}
              className="bg-muted/50"
            />
            {form.formState.errors.project_name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.project_name.message}
              </p>
            )}
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="client_id">
              Cliente <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.watch("client_id")}
              onValueChange={(value) => form.setValue("client_id", value)}
              disabled={!!preselectedClientId || loadingClients}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Seleccionar cliente..." />
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

          {/* Estado */}
          <div className="space-y-2">
            <Label htmlFor="status">Estado inicial</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(value) => form.setValue("status", value)}
            >
              <SelectTrigger className="bg-muted/50">
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

          {/* Dirección del proyecto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_address" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Dirección
              </Label>
              <Input
                id="project_address"
                placeholder="Calle, número..."
                {...form.register("project_address")}
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_city">Ciudad</Label>
              <Input
                id="project_city"
                placeholder="Ciudad"
                {...form.register("project_city")}
                className="bg-muted/50"
              />
            </div>
          </div>

          {/* Local y número de pedido */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="local_name">Nombre del Local</Label>
              <Input
                id="local_name"
                placeholder="Ej: Tienda Centro"
                {...form.register("local_name")}
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_order_number" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Nº Pedido Cliente
              </Label>
              <Input
                id="client_order_number"
                placeholder="Referencia del cliente"
                {...form.register("client_order_number")}
                className="bg-muted/50"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales sobre el proyecto..."
              {...form.register("notes")}
              className="bg-muted/50 min-h-[80px]"
            />
          </div>

          <DialogFooter className="pt-4">
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
                "Crear Proyecto"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;
