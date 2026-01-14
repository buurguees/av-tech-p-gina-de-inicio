/**
 * ClientDetailPageMobile
 * 
 * Versión optimizada para móviles (especialmente iPhone) de la página de detalle de cliente.
 * Diseñada para comerciales en campo con información esencial y acciones rápidas.
 */

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
  ChevronDown,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
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
import { NexoLogo } from "../components/NexoHeader";
import DetailTabsMobile from "../components/mobile/DetailTabsMobile";
import ClientProjectsTab from "../components/ClientProjectsTab";
import ClientQuotesTab from "../components/ClientQuotesTab";
import ClientInvoicesTab from "../components/ClientInvoicesTab";
import EditClientDialog from "../components/EditClientDialog";
import MobileBottomNav from "../components/MobileBottomNav";
import ClientNotesSection from "../components/mobile/ClientNotesSection";

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
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-white">Acceso Denegado</h1>
          <p className="text-white/60 text-sm">No tienes permiso para acceder a este recurso.</p>
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <NexoLogo />
        </div>
      </div>
    );
  }

  const stageInfo = getStageInfo(client.lead_stage);

  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <main className="px-3 py-3 space-y-3">
        {/* Compact Client Header - Optimizado para móvil */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-4 pb-4 space-y-3">
              {/* Empresa y Estado */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2.5 rounded-xl bg-white/10 shrink-0">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white truncate">{client.company_name}</h2>
                    {client.legal_name && (
                      <p className="text-white/40 text-xs truncate">{client.legal_name}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Estado del Lead - Clickable dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={updatingStatus}>
                  <button 
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors active:scale-[0.98] ${stageInfo.color}`}
                  >
                    <span>{updatingStatus ? "Actualizando..." : stageInfo.label}</span>
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="center" 
                  className="bg-zinc-900 border-white/10 w-[calc(100vw-24px)] max-w-sm"
                >
                  {LEAD_STAGES.map((stage) => (
                    <DropdownMenuItem
                      key={stage.value}
                      onClick={() => handleStatusChange(stage.value)}
                      className={`cursor-pointer py-3 ${stage.value === client.lead_stage ? 'bg-white/10' : ''}`}
                    >
                      <span className={`inline-block w-2.5 h-2.5 rounded-full mr-3 ${stage.color.split(' ')[0]}`} />
                      <span className="text-white font-medium">{stage.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Acciones Rápidas - Optimizado para touch */}
              <div className="grid grid-cols-2 gap-2">
                <a 
                  href={`tel:${client.contact_phone}`}
                  className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 font-medium text-sm active:scale-[0.97] transition-transform"
                >
                  <Phone className="h-4 w-4" />
                  Llamar
                </a>
                <a 
                  href={`mailto:${client.contact_email}`}
                  className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 font-medium text-sm active:scale-[0.97] transition-transform"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </a>
              </div>

              {/* Información de Contacto - Compacta */}
              <div className="space-y-2 text-sm pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 text-white/60">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{client.contact_phone}</span>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{client.contact_email}</span>
                </div>
                {client.website && (
                  <a 
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-white/60 active:text-white"
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{client.website}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}
                {client.billing_city && (
                  <div className="flex items-center gap-2 text-white/60">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{client.billing_city}, {client.billing_province}</span>
                  </div>
                )}
              </div>

              {/* Botón Editar */}
              {activeTab === "notes" && (
                <Button 
                  variant="outline" 
                  className="w-full border-white/20 text-white hover:bg-white/10 h-11"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Cliente
                </Button>
              )}
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

        {/* Tabs Navigation - Optimizado para móvil */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
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
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav userId={userId || ''} />
    </div>
  );
};

export default ClientDetailPageMobile;
