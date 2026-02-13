/**
 * MobileNewProjectPage - Página para crear nuevo proyecto en móvil
 * VERSIÓN: 1.0 - Formulario completo con misma lógica que desktop
 */
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  ChevronLeft,
  Building2,
  MapPin,
  FileText,
  Users,
  Calendar,
  Save,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECT_STATUSES, getProjectStatusInfo } from "@/constants/projectStatuses";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Client {
  id: string;
  company_name: string;
  lead_stage?: string;
}

const MobileNewProjectPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Form state
  const [clientId, setClientId] = useState<string>("");
  const [status, setStatus] = useState("NEGOTIATION");
  const [projectAddress, setProjectAddress] = useState("");
  const [projectCity, setProjectCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("España");
  const [localName, setLocalName] = useState("");
  const [clientOrderNumber, setClientOrderNumber] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Filter out LOST clients
  const availableClients = useMemo(() => 
    clients.filter(client => client.lead_stage !== 'LOST'), 
    [clients]
  );

  // Get selected client name
  const selectedClient = useMemo(() => 
    clientId ? availableClients.find(c => c.id === clientId) : null, 
    [availableClients, clientId]
  );

  // Generate project name automatically
  const generatedProjectName = useMemo(() => {
    const parts: string[] = [];
    if (selectedClient?.company_name) parts.push(selectedClient.company_name);
    if (clientOrderNumber?.trim()) parts.push(clientOrderNumber.trim());
    if (projectCity?.trim()) parts.push(projectCity.trim());
    if (localName?.trim()) parts.push(localName.trim());
    return parts.join(" - ");
  }, [selectedClient, clientOrderNumber, projectCity, localName]);

  // Get status info
  const statusInfo = useMemo(() => getProjectStatusInfo(status), [status]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        const { data, error } = await supabase.rpc("list_clients", { p_search: null });
        if (error) throw error;
        setClients(data || []);
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes",
          variant: "destructive",
        });
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  const handleSubmit = async () => {
    if (!clientId) {
      toast({ 
        title: "Error", 
        description: "Debes seleccionar un cliente.", 
        variant: "destructive" 
      });
      return;
    }

    try {
      setLoading(true);
      const sanitize = (val: string): string | null => val && val.trim() ? val.trim() : null;

      const { error } = await supabase.rpc("create_project", {
        p_client_id: clientId,
        p_status: status || "NEGOTIATION",
        p_project_address: sanitize(projectAddress),
        p_project_city: sanitize(projectCity),
        p_local_name: sanitize(localName),
        p_client_order_number: sanitize(clientOrderNumber),
        p_notes: sanitize(internalNotes),
      });

      if (error) throw error;

      toast({ 
        title: "Proyecto creado", 
        description: "El proyecto se ha creado correctamente." 
      });
      
      // Navegar de vuelta a la lista de proyectos
      navigate(`/nexo-av/${userId}/projects`);
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast({ 
        title: "Error al crear proyecto", 
        description: error.message || "No se pudo crear el proyecto.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/nexo-av/${userId}/projects`);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* ===== HEADER ===== */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
              "text-white/90 hover:text-white hover:bg-white/15",
              "active:scale-95 transition-all duration-200",
              "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]"
            )}
            style={{ touchAction: 'manipulation' }}
            aria-label="Volver"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Atrás</span>
          </button>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium text-foreground truncate leading-tight">
              Nuevo Proyecto
            </h1>
          </div>
        </div>
      </div>

      {/* ===== FORMULARIO ===== */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-[80px]">
        <div className="px-4 py-4 space-y-4">
          {/* ===== SECCIÓN: ASIGNACIÓN ===== */}
          <SectionCard title="Asignación" icon={Users}>
            <div className="space-y-4">
              {/* Cliente */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Cliente <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={clientId || undefined}
                  onValueChange={(value) => setClientId(value)}
                  disabled={loadingClients}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingClients ? "Cargando..." : "Seleccionar cliente..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Estado inicial
                </Label>
                <Select 
                  value={status}
                  onValueChange={setStatus}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map(statusOption => (
                      <SelectItem key={statusOption.value} value={statusOption.value}>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn(statusOption.className, "text-xs px-2 py-0.5")}
                          >
                            {statusOption.label}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {status && (
                  <div className="pt-1">
                    <Badge 
                      variant="outline" 
                      className={cn(statusInfo.className, "text-xs px-2 py-0.5")}
                    >
                      {statusInfo.label}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* ===== SECCIÓN: UBICACIÓN ===== */}
          <SectionCard title="Ubicación" icon={MapPin}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Dirección
                </Label>
                <Input 
                  placeholder="Calle y número del local" 
                  value={projectAddress} 
                  onChange={(e) => setProjectAddress(e.target.value)}
                  className="bg-card border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Ciudad
                </Label>
                <Input 
                  placeholder="Ciudad" 
                  value={projectCity} 
                  onChange={(e) => setProjectCity(e.target.value)}
                  className="bg-card border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Código Postal
                  </Label>
                  <Input 
                    placeholder="08000" 
                    value={postalCode} 
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Provincia
                  </Label>
                  <Input 
                    placeholder="Provincia" 
                    value={province} 
                    onChange={(e) => setProvince(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  País
                </Label>
                <Input 
                  placeholder="País" 
                  value={country} 
                  onChange={(e) => setCountry(e.target.value)}
                  className="bg-card border-border"
                />
              </div>
            </div>
          </SectionCard>

          {/* ===== SECCIÓN: INFORMACIÓN DEL PROYECTO ===== */}
          <SectionCard title="Información del Proyecto" icon={FileText}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Nº Pedido Cliente
                  </Label>
                  <Input 
                    placeholder="Referencia del cliente" 
                    value={clientOrderNumber} 
                    onChange={(e) => setClientOrderNumber(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Nombre del Local
                  </Label>
                  <Input 
                    placeholder="Ej: Tienda Centro" 
                    value={localName} 
                    onChange={(e) => setLocalName(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Notas internas
                </Label>
                <Textarea 
                  placeholder="Notas adicionales sobre el proyecto..." 
                  value={internalNotes} 
                  onChange={(e) => setInternalNotes(e.target.value)} 
                  rows={4}
                  className="bg-card border-border resize-none"
                />
              </div>
            </div>
          </SectionCard>

          {/* ===== PREVIEW: NOMBRE DEL PROYECTO GENERADO ===== */}
          <div className="bg-card border border-border rounded-xl p-4">
            <Label className="text-xs font-medium text-muted-foreground block mb-2">
              Nombre del Proyecto (generado automáticamente)
            </Label>
            <div className="text-sm font-medium text-foreground min-h-[24px]">
              {generatedProjectName || (
                <span className="text-muted-foreground/60 italic">
                  Selecciona un cliente para generar el nombre...
                </span>
              )}
            </div>
          </div>

          {/* ===== BOTÓN CREAR ===== */}
          <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={!clientId || loading}
              className={cn(
                "w-full h-11 px-4 flex items-center justify-center gap-2 rounded-full",
                "text-sm font-medium whitespace-nowrap",
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "active:scale-95 transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "shadow-lg"
              )}
              style={{ touchAction: 'manipulation' }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Crear Proyecto</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== COMPONENTES AUXILIARES =====

interface SectionCardProps {
  title: string;
  icon: any;
  children: React.ReactNode;
}

const SectionCard = ({ title, icon: Icon, children }: SectionCardProps) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border/50">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
    {children}
  </div>
);

export default MobileNewProjectPage;
