import { useState, useEffect, useMemo, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Building2, MapPin, FileText, Users, ChevronDown } from "lucide-react";
import { PROJECT_STATUSES } from "@/constants/projectStatuses";
import StatusSelector, { StatusOption } from "../common/StatusSelector";
import DetailActionButton from "../navigation/DetailActionButton";
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

// ============= INLINE TEXT INPUT =============
interface InlineTextInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: "text" | "textarea";
  rows?: number;
  required?: boolean;
  disabled?: boolean;
}

const InlineTextInput = ({ label, placeholder, value, onChange, type = "text", rows = 3, required, disabled }: InlineTextInputProps) => {
  const baseClasses = cn(
    "w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm",
    "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
    "transition-all duration-200 placeholder:text-muted-foreground/60",
    disabled && "opacity-50 cursor-not-allowed bg-muted"
  );

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-muted-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}
      {type === "textarea" ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={cn(baseClasses, "resize-y min-h-[80px]")}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(baseClasses, "h-11")}
        />
      )}
    </div>
  );
};

// ============= INLINE DROPDOWN =============
interface DropDownOption {
  value: string;
  label: string;
}

interface InlineDropDownProps {
  options: DropDownOption[];
  value: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const InlineDropDown = ({ options, value, onSelect, placeholder = "Seleccionar...", disabled }: InlineDropDownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full h-11 px-4 flex items-center justify-between gap-2",
          "bg-background border border-border rounded-xl text-sm",
          "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
          "transition-all duration-200",
          disabled && "opacity-50 cursor-not-allowed bg-muted",
          !selected && "text-muted-foreground"
        )}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onSelect(opt.value); setIsOpen(false); }}
                className={cn(
                  "w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors",
                  value === opt.value && "bg-primary/10 text-primary font-medium"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ============= MAIN COMPONENT =============
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
  const availableClients = useMemo(() => clients.filter(client => client.lead_stage !== 'LOST'), [clients]);

  // Get selected client name
  const selectedClient = useMemo(() => availableClients.find(c => c.id === clientId), [availableClients, clientId]);

  // Generate project name automatically
  const generatedProjectName = useMemo(() => {
    const parts: string[] = [];
    if (selectedClient?.company_name) parts.push(selectedClient.company_name);
    if (clientOrderNumber?.trim()) parts.push(clientOrderNumber.trim());
    if (projectCity?.trim()) parts.push(projectCity.trim());
    if (localName?.trim()) parts.push(localName.trim());
    return parts.join(" - ");
  }, [selectedClient, clientOrderNumber, projectCity, localName]);

  // Convert clients to options
  const clientOptions: DropDownOption[] = useMemo(() => availableClients.map(client => ({ value: client.id, label: client.company_name })), [availableClients]);

  // Convert PROJECT_STATUSES to StatusSelector options
  const statusOptions: StatusOption[] = useMemo(() => PROJECT_STATUSES.map(s => ({ value: s.value, label: s.label, className: s.className })), []);

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
    if (open) fetchClients();
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
      toast({ title: "Error", description: "Debes seleccionar un cliente.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const sanitize = (val: string): string | null => val && val.trim() ? val.trim() : null;

      const { error } = await supabase.rpc("create_project", {
        p_client_id: clientId,
        p_status: status || "PLANNED",
        p_project_address: sanitize(projectAddress),
        p_project_city: sanitize(projectCity),
        p_local_name: sanitize(localName),
        p_client_order_number: sanitize(clientOrderNumber),
        p_notes: sanitize(internalNotes),
      });

      if (error) throw error;

      toast({ title: "Proyecto creado", description: "El proyecto se ha creado correctamente." });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast({ title: "Error al crear proyecto", description: error.message || "No se pudo crear el proyecto.", variant: "destructive" });
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
            <InlineFormSection title="Asignación" icon={<Users className="h-4 w-4" />} columns={2}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Cliente <span className="text-destructive">*</span>
                </label>
                <InlineDropDown
                  options={clientOptions}
                  value={clientId}
                  onSelect={setClientId}
                  placeholder={loadingClients ? "Cargando..." : "Seleccionar cliente..."}
                  disabled={!!preselectedClientId || loadingClients}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Estado inicial</label>
                <StatusSelector currentStatus={status} statusOptions={statusOptions} onStatusChange={setStatus} />
              </div>
            </InlineFormSection>

            {/* Sección: Ubicación */}
            <InlineFormSection title="Ubicación" icon={<MapPin className="h-4 w-4" />}>
              <InlineTextInput label="Dirección" placeholder="Calle y número del local" value={projectAddress} onChange={(e) => setProjectAddress(e.target.value)} />
              <InlineTextInput label="Ciudad" placeholder="Ciudad" value={projectCity} onChange={(e) => setProjectCity(e.target.value)} />
              <InlineTextInput label="Código Postal" placeholder="08000" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              <InlineTextInput label="Provincia" placeholder="Provincia" value={province} onChange={(e) => setProvince(e.target.value)} />
              <InlineTextInput label="País" placeholder="País" value={country} onChange={(e) => setCountry(e.target.value)} />
            </InlineFormSection>

            {/* Sección: Información del Proyecto */}
            <InlineFormSection title="Información del Proyecto" icon={<FileText className="h-4 w-4" />}>
              <div className="grid grid-cols-2 gap-3">
                <InlineTextInput label="Nº Pedido Cliente" placeholder="Referencia del cliente" value={clientOrderNumber} onChange={(e) => setClientOrderNumber(e.target.value)} />
                <InlineTextInput label="Nombre del Local" placeholder="Ej: Tienda Centro" value={localName} onChange={(e) => setLocalName(e.target.value)} />
              </div>
              <InlineTextInput type="textarea" label="Notas internas" placeholder="Notas adicionales sobre el proyecto..." value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} />
            </InlineFormSection>

            {/* Nombre del Proyecto Generado (Preview) */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Nombre del Proyecto (generado automáticamente)
              </label>
              <div className="text-sm font-medium text-foreground min-h-[24px]">
                {generatedProjectName || <span className="text-muted-foreground/60 italic">Selecciona un cliente para generar el nombre...</span>}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20 gap-2">
            <DetailActionButton actionType="cancel" onClick={() => onOpenChange(false)} disabled={loading} />
            <DetailActionButton actionType="create_project" onClick={handleSubmit} disabled={!clientId} loading={loading} />
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;