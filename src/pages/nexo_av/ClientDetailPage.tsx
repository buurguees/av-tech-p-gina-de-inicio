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
import NexoHeader, { NexoLogo } from "./components/NexoHeader";
import ClientDashboardTab from "./components/ClientDashboardTab";
import ClientProjectsTab from "./components/ClientProjectsTab";
import ClientQuotesTab from "./components/ClientQuotesTab";
import ClientInvoicesTab from "./components/ClientInvoicesTab";
import EditClientDialog from "./components/EditClientDialog";

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

const ClientDetailPage = () => {
  const { userId, clientId } = useParams<{ userId: string; clientId: string }>();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAdmin, setIsAdmin] = useState(false);
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Acceso Denegado</h1>
          <p className="text-white/60">No tienes permiso para acceder a este recurso.</p>
          <Button 
            onClick={() => navigate(`/nexo-av/${userId}/dashboard`)}
            className="bg-white text-black hover:bg-white/90"
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  if (loading || !client) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse">
          <NexoLogo />
        </div>
      </div>
    );
  }

  const stageInfo = getStageInfo(client.lead_stage);

  return (
    <div className="min-h-screen bg-black">
      <NexoHeader 
        title={client.company_name}
        subtitle="Ficha de Cliente"
        userId={userId || ''} 
        backTo={`/nexo-av/${userId}/clients`}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-white/10">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h2 className="text-2xl font-bold text-white">{client.company_name}</h2>
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
                          className="bg-zinc-900 border-white/10 min-w-[180px]"
                        >
                          {LEAD_STAGES.map((stage) => (
                            <DropdownMenuItem
                              key={stage.value}
                              onClick={() => handleStatusChange(stage.value)}
                              className={`cursor-pointer ${stage.value === client.lead_stage ? 'bg-white/10' : ''}`}
                            >
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${stage.color.split(' ')[0]}`} />
                              <span className="text-white">{stage.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {client.legal_name && (
                      <p className="text-white/40 text-sm">{client.legal_name}</p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-3 text-sm">
                      <span className="flex items-center gap-2 text-white/60">
                        <Mail className="h-4 w-4" />
                        {client.contact_email}
                      </span>
                      <span className="flex items-center gap-2 text-white/60">
                        <Phone className="h-4 w-4" />
                        {client.contact_phone}
                      </span>
                      {client.website && (
                        <a 
                          href={client.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-white/60 hover:text-white"
                        >
                          <Globe className="h-4 w-4" />
                          {client.website}
                        </a>
                      )}
                      {client.billing_city && (
                        <span className="flex items-center gap-2 text-white/60">
                          <MapPin className="h-4 w-4" />
                          {client.billing_city}, {client.billing_province}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Cliente
                </Button>
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

        {/* Tabs Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white/5 border border-white/10 p-1 h-auto flex-wrap">
              <TabsTrigger 
                value="dashboard" 
                className="data-[state=active]:bg-white data-[state=active]:text-black text-white/60"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="projects"
                className="data-[state=active]:bg-white data-[state=active]:text-black text-white/60"
              >
                <FolderKanban className="h-4 w-4 mr-2" />
                Proyectos
              </TabsTrigger>
              <TabsTrigger 
                value="quotes"
                className="data-[state=active]:bg-white data-[state=active]:text-black text-white/60"
              >
                <FileText className="h-4 w-4 mr-2" />
                Presupuestos
              </TabsTrigger>
              <TabsTrigger 
                value="invoices"
                className="data-[state=active]:bg-white data-[state=active]:text-black text-white/60"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Facturas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <ClientDashboardTab client={client} />
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
      </main>
    </div>
  );
};

export default ClientDetailPage;
