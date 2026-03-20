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

// ============= SITE FORM ENTRY =============
interface SiteFormEntry {
  name: string;
  address: string;
  city: string;
  postalCode: string;
}

const emptySite = (): SiteFormEntry => ({ name: "", address: "", city: "", postalCode: "" });

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

  // SINGLE_SITE location
  const [projectAddress, setProjectAddress] = useState("");
  const [projectCity, setProjectCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("España");

  // SINGLE_SITE local name
  const [localName, setLocalName] = useState("");

  // MULTI_SITE sites
  const [multiSites, setMultiSites] = useState<SiteFormEntry[]>([emptySite()]);

  const [clientOrderNumber, setClientOrderNumber] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Filter out LOST clients
  const availableClients = useMemo(() => clients.filter(client => client.lead_stage !== 'LOST'), [clients]);

  // Get selected client name
  const selectedClient = useMemo(() => clientId ? availableClients.find(c => c.id === clientId) : null, [availableClients, clientId]);

  // Generate project name preview
  const generatedProjectName = useMemo(() => {
    const parts: string[] = [];
    const isMulti = siteMode === "MULTI_SITE";
    const locationName = isMulti ? (multiSites[0]?.name.trim() || "") : localName.trim();
    const cityForName = isMulti ? (multiSites[0]?.city.trim() || "") : projectCity.trim();
    if (selectedClient?.company_name) parts.push(selectedClient.company_name);
    if (clientOrderNumber?.trim()) parts.push(clientOrderNumber.trim());
    if (cityForName) parts.push(cityForName);
    if (locationName) parts.push(locationName);
    return parts.join(" - ");
  }, [selectedClient, clientOrderNumber, projectCity, localName, multiSites, siteMode]);

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
      setMultiSites([emptySite()]);
      setClientOrderNumber("");
      setInternalNotes("");
    }
  }, [open, preselectedClientId]);

  const updateMultiSite = (index: number, field: keyof SiteFormEntry, value: string) => {
    setMultiSites(prev => prev.map((site, i) => i === index ? { ...site, [field]: value } : site));
  };

  const addMultiSite = () => {
    setMultiSites(prev => [...prev, emptySite()]);
  };

  const removeMultiSite = (index: number) => {
    setMultiSites(prev => {
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

      if (siteMode === "MULTI_SITE") {
        const hasValidSite = multiSites.some(s => s.name.trim());
        if (!hasValidSite) {
          toast({
            title: "Error",
            description: "Debes añadir al menos un sitio con nombre en modo Multi-Sitio.",
            variant: "destructive",
          });
          return;
        }
      }

      const isMulti = siteMode === "MULTI_SITE";
      const firstSite = isMulti ? multiSites[0] : null;

      const primarySiteName = isMulti ? sanitize(firstSite?.name || "") : sanitize(localName);
      const effectiveLocalName = isMulti ? primarySiteName : sanitize(localName);
      const effectiveCity = isMulti ? sanitize(firstSite?.city || "") : sanitize(projectCity);
      const effectiveAddress = isMulti ? sanitize(firstSite?.address || "") : sanitize(projectAddress);
      const effectivePostalCode = isMulti ? sanitize(firstSite?.postalCode || "") : sanitize(postalCode);
      const effectiveProvince = isMulti ? null : sanitize(province);
      const effectiveCountry = isMulti ? "España" : (sanitize(country) || "España");

      const { data, error } = await supabase.rpc("create_project", {
        p_client_id: clientId,
        p_status: status || "NEGOTIATION",
        p_project_address: effectiveAddress,
        p_project_city: effectiveCity,
        p_postal_code: effectivePostalCode,
        p_province: effectiveProvince,
        p_country: effectiveCountry,
        p_local_name: effectiveLocalName,
        p_client_order_number: sanitize(clientOrderNumber),
        p_notes: sanitize(internalNotes),
        p_site_mode: siteMode,
        p_site_name: primarySiteName || null,
      });

      if (error) throw error;

      const createdProject = Array.isArray(data) ? data[0] : null;
      if (isMulti && createdProject?.project_id && multiSites.length > 1) {
        for (const extraSite of multiSites.slice(1)) {
          if (!extraSite.name.trim()) continue;
          const { error: siteError } = await supabase.rpc("create_project_site", {
            p_project_id: createdProject.project_id,
            p_site_name: extraSite.name.trim(),
            p_address: sanitize(extraSite.address),
            p_city: sanitize(extraSite.city),
            p_postal_code: sanitize(extraSite.postalCode),
            p_country: "España",
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

              {/* MULTI_SITE: mini-form per site */}
              {siteMode === "MULTI_SITE" && (
                <div className="space-y-3">
                  {multiSites.map((site, index) => (
                    <div key={`site-${index}`} className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Sitio {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeMultiSite(index)}
                          className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                          aria-label={`Eliminar sitio ${index + 1}`}
                          disabled={multiSites.length === 1}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <Input
                        placeholder="Nombre del sitio *"
                        value={site.name}
                        onChange={(e) => updateMultiSite(index, "name", e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Ciudad"
                          value={site.city}
                          onChange={(e) => updateMultiSite(index, "city", e.target.value)}
                        />
                        <Input
                          placeholder="Código Postal"
                          value={site.postalCode}
                          onChange={(e) => updateMultiSite(index, "postalCode", e.target.value)}
                        />
                      </div>
                      <Input
                        placeholder="Dirección"
                        value={site.address}
                        onChange={(e) => updateMultiSite(index, "address", e.target.value)}
                      />
                    </div>
                  ))}
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
            </InlineFormSection>

            {/* Sección: Ubicación — solo en SINGLE_SITE */}
            {siteMode === "SINGLE_SITE" && (
              <InlineFormSection title="Ubicación" icon={<MapPin className="h-4 w-4" />}>
                <LabeledInput label="Dirección">
                  <Input placeholder="Calle y número del local" value={projectAddress} onChange={(e) => setProjectAddress(e.target.value)} />
                </LabeledInput>
                <LabeledInput label="Ciudad">
                  <Input placeholder="Ciudad" value={projectCity} onChange={(e) => setProjectCity(e.target.value)} />
                </LabeledInput>
                <div className="grid grid-cols-2 gap-3">
                  <LabeledInput label="Código Postal">
                    <Input placeholder="08000" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                  </LabeledInput>
                  <LabeledInput label="Provincia">
                    <Input placeholder="Provincia" value={province} onChange={(e) => setProvince(e.target.value)} />
                  </LabeledInput>
                </div>
                <LabeledInput label="País">
                  <Input placeholder="País" value={country} onChange={(e) => setCountry(e.target.value)} />
                </LabeledInput>
              </InlineFormSection>
            )}

            {/* Sección: Información del Proyecto */}
            <InlineFormSection title="Información del Proyecto" icon={<FileText className="h-4 w-4" />}>
              <div className={cn("gap-3", siteMode === "SINGLE_SITE" ? "grid grid-cols-2" : "")}>
                <LabeledInput label="Nº Pedido Cliente">
                  <Input placeholder="Referencia del cliente" value={clientOrderNumber} onChange={(e) => setClientOrderNumber(e.target.value)} />
                </LabeledInput>
                {siteMode === "SINGLE_SITE" && (
                  <LabeledInput label="Nombre del Local">
                    <Input placeholder="Ej: Tienda Centro" value={localName} onChange={(e) => setLocalName(e.target.value)} />
                  </LabeledInput>
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
