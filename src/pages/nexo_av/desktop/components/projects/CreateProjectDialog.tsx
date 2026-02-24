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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Building2, MapPin, FileText, Users, Plus, X } from "lucide-react";
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
  const [clientId, setClientId] = useState<string>(preselectedClientId || "");
  const [status, setStatus] = useState("NEGOTIATION");
  const [siteMode, setSiteMode] = useState<"SINGLE_SITE" | "MULTI_SITE">("SINGLE_SITE");
  const [projectAddress, setProjectAddress] = useState("");
  const [projectCity, setProjectCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("España");
  const [localName, setLocalName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [multiSiteNames, setMultiSiteNames] = useState<string[]>([""]);
  const [clientOrderNumber, setClientOrderNumber] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Filter out LOST clients
  const availableClients = useMemo(() => clients.filter(client => client.lead_stage !== 'LOST'), [clients]);

  // Get selected client name
  const selectedClient = useMemo(() => clientId ? availableClients.find(c => c.id === clientId) : null, [availableClients, clientId]);

  // Generate project name automatically
  const generatedProjectName = useMemo(() => {
    const parts: string[] = [];
    const firstMultiSiteName = multiSiteNames.find((site) => site.trim())?.trim() || "";
    const locationName = siteMode === "MULTI_SITE" ? firstMultiSiteName : localName.trim();
    if (selectedClient?.company_name) parts.push(selectedClient.company_name);
    if (clientOrderNumber?.trim()) parts.push(clientOrderNumber.trim());
    if (projectCity?.trim()) parts.push(projectCity.trim());
    if (locationName) parts.push(locationName);
    return parts.join(" - ");
  }, [selectedClient, clientOrderNumber, projectCity, localName, multiSiteNames, siteMode]);

  // Convert clients to options for Select
  const clientOptions = useMemo(() => availableClients.map(client => ({ value: client.id, label: client.company_name })), [availableClients]);

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
      setStatus("NEGOTIATION");
      setSiteMode("SINGLE_SITE");
      setProjectAddress("");
      setProjectCity("");
      setPostalCode("");
      setProvince("");
      setCountry("España");
      setLocalName("");
      setSiteName("");
      setMultiSiteNames([""]);
      setClientOrderNumber("");
      setInternalNotes("");
    }
  }, [open, preselectedClientId]);

  const updateMultiSiteName = (index: number, value: string) => {
    setMultiSiteNames((prev) => prev.map((site, i) => (i === index ? value : site)));
  };

  const addMultiSite = () => {
    setMultiSiteNames((prev) => [...prev, ""]);
  };

  const removeMultiSite = (index: number) => {
    setMultiSiteNames((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!clientId) {
      toast({ title: "Error", description: "Debes seleccionar un cliente.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const sanitize = (val: string): string | null => val && val.trim() ? val.trim() : null;
      const cleanedMultiSites = multiSiteNames.map((site) => site.trim()).filter(Boolean);

      if (siteMode === "MULTI_SITE" && cleanedMultiSites.length === 0) {
        toast({
          title: "Error",
          description: "Debes añadir al menos un sitio en modo Multi-Sitio.",
          variant: "destructive",
        });
        return;
      }

      const primarySiteName = siteMode === "MULTI_SITE"
        ? cleanedMultiSites[0]
        : (sanitize(siteName) || sanitize(localName));
      const effectiveLocalName = siteMode === "MULTI_SITE"
        ? (primarySiteName || null)
        : sanitize(localName);

      const { data, error } = await supabase.rpc("create_project", {
        p_client_id: clientId,
        p_status: status || "NEGOTIATION",
        p_project_address: sanitize(projectAddress),
        p_project_city: sanitize(projectCity),
        p_local_name: effectiveLocalName,
        p_client_order_number: sanitize(clientOrderNumber),
        p_notes: sanitize(internalNotes),
        p_site_mode: siteMode,
        p_site_name: primarySiteName || null,
      });

      if (error) throw error;

      const createdProject = Array.isArray(data) ? data[0] : null;
      if (siteMode === "MULTI_SITE" && createdProject?.project_id && cleanedMultiSites.length > 1) {
        for (const extraSiteName of cleanedMultiSites.slice(1)) {
          const { error: siteError } = await supabase.rpc("create_project_site", {
            p_project_id: createdProject.project_id,
            p_site_name: extraSiteName,
            p_city: sanitize(projectCity),
            p_country: sanitize(country) || "España",
          });
          if (siteError) throw siteError;
        }
      }

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
                <Select 
                  value={clientId || undefined}
                  onValueChange={(value) => setClientId(value)}
                  disabled={!!preselectedClientId || loadingClients}
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
                <label className="text-xs font-medium text-muted-foreground">Estado inicial</label>
                <StatusSelector currentStatus={status} statusOptions={statusOptions} onStatusChange={setStatus} />
              </div>
            </InlineFormSection>

            {/* Sección: Tipo de proyecto */}
            <InlineFormSection title="Tipo de Proyecto" icon={<Building2 className="h-4 w-4" />}>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSiteMode("SINGLE_SITE")}
                  className={cn(
                    "flex-1 p-3 rounded-lg border text-left transition-all text-sm",
                    siteMode === "SINGLE_SITE"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted/20 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <div className="font-medium">Sitio Único</div>
                  <div className="text-xs mt-0.5 opacity-70">Una sola instalación / ubicación</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSiteMode("MULTI_SITE")}
                  className={cn(
                    "flex-1 p-3 rounded-lg border text-left transition-all text-sm",
                    siteMode === "MULTI_SITE"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted/20 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <div className="font-medium">Multi-Sitio</div>
                  <div className="text-xs mt-0.5 opacity-70">Múltiples ubicaciones de instalación</div>
                </button>
              </div>
              {siteMode === "SINGLE_SITE" && (
                <LabeledInput label="Nombre del sitio principal">
                  <Input placeholder="Ej: Tienda Centro, Oficina Principal..." value={siteName} onChange={(e) => setSiteName(e.target.value)} />
                </LabeledInput>
              )}
            </InlineFormSection>

            {/* Sección: Ubicación */}
            <InlineFormSection title="Ubicación" icon={<MapPin className="h-4 w-4" />}>
              <LabeledInput label="Dirección">
                <Input placeholder="Calle y número del local" value={projectAddress} onChange={(e) => setProjectAddress(e.target.value)} />
              </LabeledInput>
              <LabeledInput label="Ciudad">
                <Input placeholder="Ciudad" value={projectCity} onChange={(e) => setProjectCity(e.target.value)} />
              </LabeledInput>
              <LabeledInput label="Código Postal">
                <Input placeholder="08000" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </LabeledInput>
              <LabeledInput label="Provincia">
                <Input placeholder="Provincia" value={province} onChange={(e) => setProvince(e.target.value)} />
              </LabeledInput>
              <LabeledInput label="País">
                <Input placeholder="País" value={country} onChange={(e) => setCountry(e.target.value)} />
              </LabeledInput>
            </InlineFormSection>

            {/* Sección: Información del Proyecto */}
            <InlineFormSection title="Información del Proyecto" icon={<FileText className="h-4 w-4" />}>
              <div className="grid grid-cols-2 gap-3">
                <LabeledInput label="Nº Pedido Cliente">
                  <Input placeholder="Referencia del cliente" value={clientOrderNumber} onChange={(e) => setClientOrderNumber(e.target.value)} />
                </LabeledInput>
                {siteMode === "SINGLE_SITE" ? (
                  <LabeledInput label="Nombre del Local">
                    <Input placeholder="Ej: Tienda Centro" value={localName} onChange={(e) => setLocalName(e.target.value)} />
                  </LabeledInput>
                ) : (
                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Sitios</Label>
                    <div className="space-y-2">
                      {multiSiteNames.map((site, index) => (
                        <div key={`site-${index}`} className="flex items-center gap-2">
                          <Input
                            placeholder={`Sitio ${index + 1}`}
                            value={site}
                            onChange={(e) => updateMultiSiteName(index, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeMultiSite(index)}
                            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                            aria-label={`Eliminar sitio ${index + 1}`}
                            disabled={multiSiteNames.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addMultiSite}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Añadir sitio
                    </button>
                  </div>
                )}
              </div>
              <LabeledInput label="Notas internas">
                <Textarea placeholder="Notas adicionales sobre el proyecto..." value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} />
              </LabeledInput>
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