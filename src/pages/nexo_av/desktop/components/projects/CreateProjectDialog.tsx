import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Building2, MapPin, FileText, Users } from "lucide-react";
import { PROJECT_STATUSES } from "@/constants/projectStatuses";
import TextInput from "../common/TextInput";
import FormSection from "../common/FormSection";
import DropDown, { DropDownOption } from "../common/DropDown";
import StatusSelector, { StatusOption } from "../common/StatusSelector";
import DetailActionButton from "../navigation/DetailActionButton";

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

  // Form state
  const [clientId, setClientId] = useState(preselectedClientId || "");
  const [status, setStatus] = useState("PLANNED");
  const [projectAddress, setProjectAddress] = useState("");
  const [projectCity, setProjectCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("España");
  const [localName, setLocalName] = useState("");
  const [clientOrderNumber, setClientOrderNumber] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

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
    if (selectedClient?.company_name) parts.push(selectedClient.company_name);
    if (clientOrderNumber?.trim()) parts.push(clientOrderNumber.trim());
    if (projectCity?.trim()) parts.push(projectCity.trim());
    if (localName?.trim()) parts.push(localName.trim());
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
    return PROJECT_STATUSES.map((s) => ({
      value: s.value,
      label: s.label,
      className: s.className,
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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setClientId(preselectedClientId || "");
      setStatus("PLANNED");
      setProjectAddress("");
      setProjectCity("");
      setPostalCode("");
      setProvince("");
      setCountry("España");
      setLocalName("");
      setClientOrderNumber("");
      setInternalNotes("");
    }
  }, [open, preselectedClientId]);

  const handleSubmit = async () => {
    if (!clientId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un cliente.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Convert empty strings to null for optional fields
      const sanitize = (val: string): string | null => 
        val && val.trim() ? val.trim() : null;

      // Use explicit parameter object to match the RPC signature without p_project_name
      const rpcParams: {
        p_client_id: string;
        p_status: string;
        p_project_address: string | null;
        p_project_city: string | null;
        p_local_name: string | null;
        p_client_order_number: string | null;
        p_notes: string | null;
      } = {
        p_client_id: clientId,
        p_status: status || "PLANNED",
        p_project_address: sanitize(projectAddress),
        p_project_city: sanitize(projectCity),
        p_local_name: sanitize(localName),
        p_client_order_number: sanitize(clientOrderNumber),
        p_notes: sanitize(internalNotes),
      };

      const { error } = await supabase.rpc("create_project", rpcParams);

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
        title: "Error al crear proyecto",
        description: error.message || "No se pudo crear el proyecto. Revisa los datos e inténtalo de nuevo.",
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

        <div className="flex flex-col">
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
                  value={clientId}
                  onSelect={setClientId}
                  placeholder={loadingClients ? "Cargando..." : "Seleccionar cliente..."}
                  disabled={!!preselectedClientId || loadingClients}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Estado inicial
                </label>
                <StatusSelector
                  currentStatus={status}
                  statusOptions={statusOptions}
                  onStatusChange={setStatus}
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
                placeholder="Calle y número del local"
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
                size="sm"
              />
              
              <TextInput
                label="Ciudad"
                placeholder="Ciudad"
                value={projectCity}
                onChange={(e) => setProjectCity(e.target.value)}
                size="sm"
              />

              <TextInput
                label="Código Postal"
                placeholder="08000"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                size="sm"
              />

              <TextInput
                label="Provincia"
                placeholder="Provincia"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                size="sm"
              />

              <TextInput
                label="País"
                placeholder="País"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                size="sm"
              />
            </FormSection>

            {/* Sección: Información del Proyecto */}
            <FormSection
              title="Información del Proyecto"
              icon={<FileText className="h-4 w-4" />}
              columns={1}
            >
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Nº Pedido Cliente"
                  placeholder="Referencia del cliente"
                  value={clientOrderNumber}
                  onChange={(e) => setClientOrderNumber(e.target.value)}
                  size="sm"
                />
                <TextInput
                  label="Nombre del Local"
                  placeholder="Ej: Tienda Centro"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  size="sm"
                />
              </div>

              <TextInput
                type="textarea"
                label="Notas internas"
                placeholder="Notas adicionales sobre el proyecto..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
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
            <DetailActionButton
              actionType="cancel"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            />
            <DetailActionButton
              actionType="create_project"
              onClick={handleSubmit}
              disabled={!clientId}
              loading={loading}
            />
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;
