import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
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
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ClientDashboardTab from "./components/ClientDashboardTab";
import ClientProjectsTab from "./components/ClientProjectsTab";
import ClientQuotesTab from "./components/ClientQuotesTab";
import ClientInvoicesTab from "./components/ClientInvoicesTab";
import EditClientDialog from "./components/EditClientDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { lazy, Suspense } from "react";
import { createMobilePage } from "./MobilePageWrapper";

// Lazy load mobile version
const ClientDetailPageMobile = lazy(() => import("./mobile/ClientDetailPageMobile"));

// Lazy load mobile tabs
const DetailTabsMobile = lazy(() => import("./components/mobile/DetailTabsMobile"));

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
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchClient = async () => {
    if (!clientId) return;
    
    try {
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

      // Update local state
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
  }, [clientId]);

  if (loading || !client) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
      </div>
    );
  }

  const stageInfo = getStageInfo(client.lead_stage);

  return (
    <div className="w-full">
      <div className="w-[90%] max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-secondary">
                    <Building2 className="h-8 w-8 text-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h2 className="text-2xl font-bold text-foreground">{client.company_name}</h2>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={updatingStatus}>
                          <button 
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-colors hover:opacity-80 ${stageInfo.color} cursor-pointer`}
                          >
                            {updatingStatus ? "Actualizando..." : stageInfo.label}
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="start" 
                          className="min-w-[180px]"
                        >
                          {LEAD_STAGES.map((stage) => (
                            <DropdownMenuItem
                              key={stage.value}
                              onClick={() => handleStatusChange(stage.value)}
                              className={`cursor-pointer ${stage.value === client.lead_stage ? 'bg-accent' : ''}`}
                            >
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${stage.color.split(' ')[0]}`} />
                              <span>{stage.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {client.legal_name && (
                      <p className="text-muted-foreground text-sm">{client.legal_name}</p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-3 text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {client.contact_email}
                      </span>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {client.contact_phone}
                      </span>
                      {client.website && (
                        <a 
                          href={client.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                        >
                          <Globe className="h-4 w-4" />
                          {client.website}
                        </a>
                      )}
                      {client.billing_city && (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {client.billing_city}, {client.billing_province}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {activeTab === "dashboard" && (
                  <Button 
                    variant="outline"
                    onClick={() => setEditDialogOpen(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Cliente
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Edit Client Dialog */}
        <EditClientDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          client={client}
          isAdmin={isAdmin}
          onSuccess={fetchClient}
        />

        {/* Tabs Navigation - Desktop */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-secondary border border-border p-1 h-auto flex-wrap">
              <TabsTrigger 
                value="dashboard" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="projects"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FolderKanban className="h-4 w-4 mr-2" />
                Proyectos
              </TabsTrigger>
              <TabsTrigger 
                value="quotes"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileText className="h-4 w-4 mr-2" />
                Presupuestos
              </TabsTrigger>
              <TabsTrigger 
                value="invoices"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Receipt className="h-4 w-4" />
                Facturas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <ClientDashboardTab 
                client={client} 
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                onRefresh={fetchClient}
              />
            </TabsContent>

            <TabsContent value="projects" className="mt-6">
              <ClientProjectsTab clientId={client.id} />
            </TabsContent>

            <TabsContent value="quotes" className="mt-6">
              <ClientQuotesTab clientId={client.id} />
            </TabsContent>

            <TabsContent value="invoices" className="mt-6">
              <ClientInvoicesTab clientId={client.id} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

// Export version with mobile routing
const ClientDetailPage = createMobilePage({
  DesktopComponent: ClientDetailPageDesktop,
  MobileComponent: ClientDetailPageMobile,
});

export default ClientDetailPage;
