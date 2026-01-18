import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ShieldAlert,
  LayoutDashboard,
  FolderKanban,
  FileText,
  Receipt,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Edit,
  ChevronDown,
  ArrowLeft,
  PhoneCall,
  Send,
  Plus,
  Euro,
  Calendar,
  Briefcase,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ClientDashboardTab from "./components/ClientDashboardTab";
import ClientProjectsTab from "./components/ClientProjectsTab";
import ClientQuotesTab from "./components/ClientQuotesTab";
import ClientInvoicesTab from "./components/ClientInvoicesTab";
import EditClientDialog from "./components/EditClientDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { lazy, Suspense } from "react";
import { createMobilePage } from "./MobilePageWrapper";
import { Loader2 } from "lucide-react";

// Lazy load mobile version
const ClientDetailPageMobile = lazy(() => import("./mobile/ClientDetailPageMobile"));

interface ClientDetail {
  id: string;
  company_name: string;
  contact_phone: string;
  contact_email: string;
  tax_id: string | null;
  legal_name: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_province: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  website: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  linkedin_url: string | null;
  number_of_locations: number | null;
  industry_sector: string | null;
  approximate_budget: number | null;
  urgency: string | null;
  target_objectives: string[] | null;
  lead_stage: string;
  lead_source: string | null;
  assigned_to: string | null;
  next_follow_up_date: string | null;
  estimated_close_date: string | null;
  lost_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const LEAD_STAGES = [
  { value: 'NEW', label: 'Nuevo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', statusColor: 'status-info' },
  { value: 'CONTACTED', label: 'Contactado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', statusColor: 'status-warning' },
  { value: 'MEETING', label: 'Reunión', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', statusColor: 'status-special' },
  { value: 'PROPOSAL', label: 'Propuesta', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', statusColor: 'status-info' },
  { value: 'NEGOTIATION', label: 'Negociación', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', statusColor: 'status-warning' },
  { value: 'WON', label: 'Ganado', color: 'bg-green-500/20 text-green-400 border-green-500/30', statusColor: 'status-success' },
  { value: 'RECURRING', label: 'Recurrente', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', statusColor: 'status-success' },
  { value: 'LOST', label: 'Perdido', color: 'bg-red-500/20 text-red-400 border-red-500/30', statusColor: 'status-error' },
  { value: 'PAUSED', label: 'Pausado', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', statusColor: 'status-neutral' },
];

const getStageInfo = (stage: string) => {
  return LEAD_STAGES.find(s => s.value === stage) || LEAD_STAGES[0];
};

const ClientDetailPageDesktop = () => {
  const { userId, clientId } = useParams<{ userId: string; clientId: string }>();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [stats, setStats] = useState({
    activeQuotes: 0,
    totalInvoiced: 0,
    averageTicket: 0
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchClient = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_client', {
        p_client_id: clientId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setClient(data[0]);
      } else {
        toast({
          title: "Error",
          description: "Cliente no encontrado",
          variant: "destructive",
        });
        navigate(`/nexo-av/${userId}/clients`);
      }
    } catch (err) {
      console.error('Error fetching client:', err);
      toast({
        title: "Error",
        description: "No se pudo cargar el cliente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientStats = async () => {
    if (!clientId) return;

    try {
      setSummaryLoading(true);

      // Fetch Quotes
      const { data: quotesData } = await supabase.rpc('list_quotes', { p_search: null });
      const clientQuotes = (quotesData || []).filter((q: any) => q.client_id === clientId);
      const activeQuotes = clientQuotes.filter((q: any) =>
        ['DRAFT', 'SENT', 'APPROVED'].includes(q.status)
      ).length;

      // Fetch Invoices
      const { data: invoicesData } = await supabase.rpc('finance_list_invoices', { p_search: null, p_status: null });
      const clientInvoices = (invoicesData || []).filter((inv: any) => inv.client_id === clientId);

      // Filter out drafts and cancelled for financial stats
      const validInvoices = clientInvoices.filter((inv: any) =>
        !['DRAFT', 'CANCELLED'].includes(inv.status)
      );

      const totalInvoiced = validInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
      const averageTicket = validInvoices.length > 0 ? totalInvoiced / validInvoices.length : 0;

      setStats({
        activeQuotes,
        totalInvoiced,
        averageTicket
      });
    } catch (err) {
      console.error('Error fetching client stats:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!client) return;

    setUpdatingStatus(true);
    try {
      const { error } = await supabase.rpc('update_client', {
        p_client_id: client.id,
        p_lead_stage: newStatus,
      });

      if (error) {
        console.error('Error updating status:', error);
        toast({
          title: "Error",
          description: "No se pudo actualizar el estado",
          variant: "destructive",
        });
        return;
      }

      setClient({ ...client, lead_stage: newStatus });

      const stageLabel = LEAD_STAGES.find(s => s.value === newStatus)?.label || newStatus;
      toast({
        title: "Estado actualizado",
        description: `El cliente ahora está en "${stageLabel}"`,
      });
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: "Error",
        description: "Ha ocurrido un error inesperado",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data, error } = await supabase.rpc('get_current_user_info');

        if (error || !data || data.length === 0) {
          console.error('Error fetching user info:', error);
          return;
        }

        const currentUserInfo = data[0];
        const userIsAdmin = currentUserInfo.roles?.includes('admin');
        setIsAdmin(userIsAdmin);
        setCurrentUserId(currentUserInfo.user_id);
      } catch (err) {
        console.error('Error fetching user info:', err);
      }
    };

    fetchUserInfo();
    fetchClient();
    fetchClientStats();
  }, [clientId]);

  if (loading || !client) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stageInfo = getStageInfo(client.lead_stage);

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return value.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header superior compacto */}
      <header className="flex-shrink-0 border-b bg-card px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate(`/nexo-av/${userId}/clients`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                CRM · Cliente
              </p>
              <h1 className="text-base font-semibold leading-none mt-0.5">
                {client.company_name}
              </h1>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setEditDialogOpen(true)}
          >
            <Edit className="h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      </header>

      {/* Contenido principal con scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            {/* Hero Section - Información principal */}
            <div className="mb-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-9 w-9 rounded-md flex items-center justify-center border shrink-0"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--status-info-bg)), hsl(var(--status-success-bg)))",
                    }}
                  >
                    <Building2 className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold leading-tight">{client.company_name}</h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={updatingStatus}>
                        <button
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors",
                            stageInfo.color,
                            updatingStatus && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {updatingStatus ? "Actualizando..." : stageInfo.label}
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[180px]">
                        {LEAD_STAGES.map((stage) => (
                          <DropdownMenuItem
                            key={stage.value}
                            onClick={() => handleStatusChange(stage.value)}
                            className={cn(
                              "cursor-pointer",
                              stage.value === client.lead_stage && 'bg-accent'
                            )}
                          >
                            <span className={cn("inline-block w-2 h-2 rounded-full mr-2", stage.color.split(' ')[0])} />
                            <span>{stage.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {client.legal_name && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{client.legal_name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Acciones rápidas + Tabs en la misma línea */}
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-2"
                      onClick={() => setEditDialogOpen(true)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Editar cliente
                    </Button>
                    {client.contact_phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        asChild
                      >
                        <a href={`tel:${client.contact_phone}`}>
                          <PhoneCall className="h-3.5 w-3.5" />
                          Llamar
                        </a>
                      </Button>
                    )}
                    {client.contact_email && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        asChild
                      >
                        <a href={`mailto:${client.contact_email}`}>
                          <Send className="h-3.5 w-3.5" />
                          Email
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Crear tarea
                    </Button>
                  </div>
                  {/* Tabs nav alineado horizontalmente con los botones */}
                  <TabsList className="bg-muted/60">
                    <TabsTrigger value="dashboard">
                      <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                      Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="projects">
                      <FolderKanban className="h-3.5 w-3.5 mr-1.5" />
                      Proyectos
                    </TabsTrigger>
                    <TabsTrigger value="quotes">
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      Presupuestos
                    </TabsTrigger>
                    <TabsTrigger value="invoices">
                      <Receipt className="h-3.5 w-3.5 mr-1.5" />
                      Facturas
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              {/* Mini KPIs con color usando la paleta global */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  className="rounded-md border px-3 py-2 flex flex-col gap-1"
                  style={{
                    backgroundColor: "hsl(var(--status-info-bg))",
                    borderColor: "hsl(var(--status-info-border))",
                  }}
                >
                  <span className="text-[11px] font-medium" style={{ color: "hsl(var(--status-info-text))" }}>
                    Presupuestos activos
                  </span>
                  <span className="text-sm font-semibold" style={{ color: "hsl(var(--status-info))" }}>
                    {summaryLoading ? "..." : `${stats.activeQuotes} activos`}
                  </span>
                </div>
                <div
                  className="rounded-md border px-3 py-2 flex flex-col gap-1"
                  style={{
                    backgroundColor: "hsl(var(--status-success-bg))",
                    borderColor: "hsl(var(--status-success-border))",
                  }}
                >
                  <span className="text-[11px] font-medium" style={{ color: "hsl(var(--status-success-text))" }}>
                    Total facturado
                  </span>
                  <span className="text-sm font-semibold" style={{ color: "hsl(var(--status-success))" }}>
                    {summaryLoading ? "..." : formatCurrency(stats.totalInvoiced)}
                  </span>
                </div>
                <div
                  className="rounded-md border px-3 py-2 flex flex-col gap-1"
                  style={{
                    backgroundColor: "hsl(var(--status-special-bg))",
                    borderColor: "hsl(var(--status-special-border))",
                  }}
                >
                  <span className="text-[11px] font-medium" style={{ color: "hsl(var(--status-special-text))" }}>
                    Ticket medio
                  </span>
                  <span className="text-sm font-semibold" style={{ color: "hsl(var(--status-special))" }}>
                    {summaryLoading ? "..." : formatCurrency(stats.averageTicket)}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid de información principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Columna izquierda - Información de contacto y ubicación */}
              <div className="lg:col-span-1 space-y-3">
                {/* Contacto */}
                {(client.contact_email || client.contact_phone || client.website) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        Contacto
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5 text-sm pb-4">
                      {client.contact_email && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                          <a
                            href={`mailto:${client.contact_email}`}
                            className="text-primary hover:underline break-all"
                          >
                            {client.contact_email}
                          </a>
                        </div>
                      )}
                      {client.contact_phone && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Teléfono</p>
                          <a
                            href={`tel:${client.contact_phone}`}
                            className="text-primary hover:underline font-medium"
                          >
                            {client.contact_phone}
                          </a>
                        </div>
                      )}
                      {client.website && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Web</p>
                          <a
                            href={client.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline break-all inline-flex items-center gap-1"
                          >
                            <Globe className="h-3 w-3" />
                            {client.website}
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Ubicación */}
                {(client.billing_address || client.billing_city) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        Ubicación
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm pb-4">
                      {client.billing_address && (
                        <p className="font-medium">{client.billing_address}</p>
                      )}
                      <p className="text-muted-foreground">
                        {[client.billing_postal_code, client.billing_city].filter(Boolean).join(" ") || "—"}
                      </p>
                      <p className="text-muted-foreground">
                        {[client.billing_province, client.billing_country || "España"]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Información del cliente */}
                {(client.tax_id || client.industry_sector || client.approximate_budget || client.number_of_locations) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        Información
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5 text-sm pb-4">
                      {client.tax_id && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">NIF / CIF</p>
                          <p className="font-mono">{client.tax_id}</p>
                        </div>
                      )}
                      {client.industry_sector && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Sector</p>
                          <p className="font-medium capitalize">{client.industry_sector.toLowerCase()}</p>
                        </div>
                      )}
                      {client.approximate_budget && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Presupuesto aproximado</p>
                          <p className="font-semibold">{formatCurrency(client.approximate_budget)}</p>
                        </div>
                      )}
                      {client.number_of_locations && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Número de ubicaciones</p>
                          <p className="font-medium">{client.number_of_locations}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Objetivos */}
                {client.target_objectives && client.target_objectives.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        Objetivos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="flex flex-wrap gap-2">
                        {client.target_objectives.map((obj) => (
                          <Badge key={obj} variant="secondary" className="text-xs">
                            {obj}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Columna derecha - Contenido de pestañas alineado con la columna izquierda */}
              <div className="lg:col-span-2">
                <TabsContent value="dashboard" className="mt-0">
                  <ClientDashboardTab
                    client={client}
                    isAdmin={isAdmin}
                    currentUserId={currentUserId}
                    onRefresh={fetchClient}
                  />
                </TabsContent>

                <TabsContent value="projects" className="mt-0">
                  <ClientProjectsTab clientId={client.id} />
                </TabsContent>

                <TabsContent value="quotes" className="mt-0">
                  <ClientQuotesTab clientId={client.id} />
                </TabsContent>

                <TabsContent value="invoices" className="mt-0">
                  <ClientInvoicesTab clientId={client.id} />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </div>

      <EditClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={client}
        isAdmin={isAdmin}
        onSuccess={fetchClient}
      />
    </div>
  );
};

// Export version with mobile routing
const ClientDetailPage = createMobilePage({
  DesktopComponent: ClientDetailPageDesktop,
  MobileComponent: ClientDetailPageMobile,
});

export default ClientDetailPage;