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
  ExternalLink,
  MessageSquare,
  ArrowLeft,
  PhoneCall,
  Send,
  Plus,
  Briefcase,
  Target,
  Euro,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import DetailTabsMobile from "../components/mobile/DetailTabsMobile";
import ClientProjectsTab from "../components/ClientProjectsTab";
import ClientQuotesTab from "../components/ClientQuotesTab";
import ClientInvoicesTab from "../components/ClientInvoicesTab";
import EditClientDialog from "../components/EditClientDialog";
import MobileBottomNav from "../components/MobileBottomNav";
import ClientNotesSection from "../components/mobile/ClientNotesSection";
import { Loader2 } from "lucide-react";

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
  { value: 'NEW', label: 'Nuevo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'CONTACTED', label: 'Contactado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'MEETING', label: 'Reunión', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'PROPOSAL', label: 'Propuesta', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { value: 'NEGOTIATION', label: 'Negociación', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'WON', label: 'Ganado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'RECURRING', label: 'Recurrente', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'LOST', label: 'Perdido', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'PAUSED', label: 'Pausado', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

const getStageInfo = (stage: string) => {
  return LEAD_STAGES.find(s => s.value === stage) || LEAD_STAGES[0];
};

const ClientDetailPageMobile = () => {
  const { userId, clientId } = useParams<{ userId: string; clientId: string }>();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [activeTab, setActiveTab] = useState("notes");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
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
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/nexo-av');
          return;
        }

        const { data, error } = await supabase.rpc('get_current_user_info');
        
        if (error || !data || data.length === 0) {
          navigate('/nexo-av');
          return;
        }

        const currentUserInfo = data[0];

        if (userId && userId !== currentUserInfo.user_id) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const hasAccess = currentUserInfo.roles?.some((r: string) => 
          ['admin', 'manager', 'sales'].includes(r)
        );

        const userIsAdmin = currentUserInfo.roles?.includes('admin');
        setIsAdmin(userIsAdmin);
        setCurrentUserId(currentUserInfo.user_id);

        if (!hasAccess) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        setLoading(false);
        await fetchClient();
      } catch (err) {
        console.error('Auth check error:', err);
        navigate('/nexo-av');
      }
    };

    checkAuth();
  }, [navigate, userId, clientId]);

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Acceso Denegado</h1>
          <p className="text-muted-foreground text-sm">No tienes permiso para acceder a este recurso.</p>
          <Button 
            onClick={() => navigate(`/nexo-av/${userId}/dashboard`)}
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

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
    <div className="flex flex-col h-full pb-20">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate(`/nexo-av/${userId}/clients`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <h1 className="font-semibold text-base truncate">{client.company_name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={updatingStatus}>
                  <button 
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border transition-colors",
                      stageInfo.color,
                      updatingStatus && "opacity-50"
                    )}
                  >
                    {updatingStatus ? "Actualizando..." : stageInfo.label}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-[calc(100vw-24px)] max-w-sm">
                  {LEAD_STAGES.map((stage) => (
                    <DropdownMenuItem
                      key={stage.value}
                      onClick={() => handleStatusChange(stage.value)}
                      className={cn(
                        "cursor-pointer py-3",
                        stage.value === client.lead_stage && 'bg-accent'
                      )}
                    >
                      <span className={cn("inline-block w-2.5 h-2.5 rounded-full mr-3", stage.color.split(' ')[0])} />
                      <span>{stage.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9"
            onClick={() => setEditDialogOpen(true)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-2 mt-3">
          {client.contact_phone && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              asChild
            >
              <a href={`tel:${client.contact_phone}`}>
                <PhoneCall className="h-4 w-4" />
                Llamar
              </a>
            </Button>
          )}
          {client.contact_email && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              asChild
            >
              <a href={`mailto:${client.contact_email}`}>
                <Send className="h-4 w-4" />
                Email
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
          >
            <Plus className="h-4 w-4" />
            Tarea
          </Button>
        </div>
      </div>

      {/* Content scrollable */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Información destacada */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {client.approximate_budget && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Presupuesto</p>
                  <p className="text-lg font-bold">{formatCurrency(client.approximate_budget)}</p>
                </div>
              )}
              {client.industry_sector && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sector</p>
                  <p className="text-sm font-medium capitalize">{client.industry_sector.toLowerCase()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.contact_phone && (
              <a
                href={`tel:${client.contact_phone}`}
                className="flex items-center gap-2 text-primary active:opacity-70"
              >
                <Phone className="h-4 w-4" />
                {client.contact_phone}
              </a>
            )}
            {client.contact_email && (
              <a
                href={`mailto:${client.contact_email}`}
                className="flex items-center gap-2 text-primary active:opacity-70 break-all"
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span className="text-sm">{client.contact_email}</span>
              </a>
            )}
            {client.website && (
              <a
                href={client.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary active:opacity-70 break-all"
              >
                <Globe className="h-4 w-4 shrink-0" />
                <span className="text-sm">{client.website}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            )}
          </CardContent>
        </Card>

        {/* Dirección */}
        {(client.billing_address || client.billing_city) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Dirección
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.billing_address && <p className="font-medium mb-1">{client.billing_address}</p>}
              <p className="text-sm text-muted-foreground">
                {[client.billing_postal_code, client.billing_city, client.billing_province]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {client.billing_country && (
                <p className="text-sm text-muted-foreground mt-1">{client.billing_country}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Información adicional */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.tax_id && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">NIF/CIF</p>
                <p className="font-mono text-sm">{client.tax_id}</p>
              </div>
            )}
            {client.legal_name && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Razón social</p>
                <p className="text-sm font-medium">{client.legal_name}</p>
              </div>
            )}
            {client.number_of_locations && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Número de ubicaciones</p>
                <p className="text-sm font-medium">{client.number_of_locations}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Objetivos */}
        {client.target_objectives && client.target_objectives.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                Objetivos
              </CardTitle>
            </CardHeader>
            <CardContent>
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

        {/* Tabs Navigation - Optimizado para móvil */}
        <DetailTabsMobile
          value={activeTab}
          onValueChange={setActiveTab}
          tabs={[
            { value: "notes", label: "Notas", icon: MessageSquare },
            { value: "projects", label: "Proyectos", icon: FolderKanban },
            { value: "quotes", label: "Presup.", icon: FileText },
            { value: "invoices", label: "Facturas", icon: Receipt },
          ]}
        >
          <TabsContent value="notes" className="mt-3">
            <ClientNotesSection 
              clientId={client.id}
              canEdit={isAdmin || client.assigned_to === currentUserId}
              compact={false}
            />
          </TabsContent>

          <TabsContent value="projects" className="mt-3">
            <ClientProjectsTab clientId={client.id} />
          </TabsContent>

          <TabsContent value="quotes" className="mt-3">
            <ClientQuotesTab clientId={client.id} />
          </TabsContent>

          <TabsContent value="invoices" className="mt-3">
            <ClientInvoicesTab clientId={client.id} />
          </TabsContent>
        </DetailTabsMobile>
      </div>

      <EditClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={client}
        isAdmin={isAdmin}
        onSuccess={fetchClient}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav userId={userId || ''} />
    </div>
  );
};

export default ClientDetailPageMobile;