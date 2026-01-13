import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import LeadMap from "./components/leadmap/LeadMap";
import LeadMapFilters from "./components/leadmap/LeadMapFilters";
import LeadMapSidebar from "./components/leadmap/LeadMapSidebar";
import LeadDetailPanel from "./components/leadmap/LeadDetailPanel";
import LeadDetailMobileSheet from "./components/leadmap/LeadDetailMobileSheet";
import CreateClientDialog from "./components/CreateClientDialog";
import { Button } from "@/components/ui/button";
import { Plus, Filter, X } from "lucide-react";
import { createMobilePage } from "./MobilePageWrapper";
import { lazy } from "react";

// Lazy load mobile version
const LeadMapPageMobile = lazy(() => import("./mobile/LeadMapPageMobile"));

// Lead stage colors and labels
export const LEAD_STAGE_COLORS: Record<string, string> = {
  NEW: "#3B82F6",
  CONTACTED: "#F59E0B",
  MEETING: "#A855F7",
  PROPOSAL: "#6366F1",
  NEGOTIATION: "#F97316",
  WON: "#10B981",
  RECURRING: "#059669",
  LOST: "#EF4444",
  PAUSED: "#6B7280",
};

export const LEAD_STAGE_LABELS: Record<string, string> = {
  NEW: "Nuevo Lead",
  CONTACTED: "Contactado",
  MEETING: "Reunión Programada",
  PROPOSAL: "Propuesta Enviada",
  NEGOTIATION: "En Negociación",
  WON: "Cliente (Ganado)",
  RECURRING: "Recurrente",
  LOST: "Perdido",
  PAUSED: "Pausado",
};

export interface LeadClient {
  id: string;
  client_number: string;
  company_name: string;
  legal_name: string | null;
  contact_email: string;
  contact_phone: string;
  lead_stage: string;
  latitude: number | null;
  longitude: number | null;
  full_address: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_at: string;
  notes_count?: number;
}

export interface LeadStats {
  lead_stage: string;
  count: number;
}

const LeadMapPageDesktop = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [clients, setClients] = useState<LeadClient[]>([]);
  const [stats, setStats] = useState<LeadStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<LeadClient | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Filters
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [showOnlyMine, setShowOnlyMine] = useState(false); // Por defecto mostrar todos los clientes
  
  // User info
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (currentUserId !== null) {
      fetchClients();
      fetchStats();
    }
  }, [currentUserId, selectedStages, showOnlyMine]);

  const fetchUserInfo = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_user_info');
      if (!error && data && data.length > 0) {
        const user = data[0];
        setCurrentUserId(user.user_id);
        setIsAdmin(user.roles?.includes('admin') || false);
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
    }
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params: { p_assigned_to?: string; p_lead_stages?: string[] } = {};
      
      if (showOnlyMine && currentUserId) {
        params.p_assigned_to = currentUserId;
      }
      
      if (selectedStages.length > 0) {
        params.p_lead_stages = selectedStages;
      }

      const { data, error } = await supabase.rpc('list_clients_for_map', params);
      
      if (error) {
        console.error('Error fetching clients:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes",
          variant: "destructive",
        });
        return;
      }

      setClients(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params: { p_assigned_to?: string } = {};
      if (showOnlyMine && currentUserId) {
        params.p_assigned_to = currentUserId;
      }

      const { data, error } = await supabase.rpc('get_lead_stats', params);
      
      if (error) {
        console.error('Error fetching stats:', error);
        return;
      }

      setStats(data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleClientSelect = (client: LeadClient | null) => {
    setSelectedClient(client);
  };

  const handleRefresh = () => {
    fetchClients();
    fetchStats();
    setSelectedClient(null);
  };

  const totalLeads = clients.filter(c => c.latitude && c.longitude).length;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mapa de Leads</h1>
          <p className="text-sm text-muted-foreground">
            {showOnlyMine ? "Mis leads" : "Todos los leads"} ({totalLeads} en mapa)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-secondary" : ""}
          >
            {showFilters ? <X size={16} /> : <Filter size={16} />}
            <span className="ml-1 hidden sm:inline">Filtros</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus size={16} />
            <span className="ml-1 hidden sm:inline">Nuevo Lead</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <LeadMapFilters
          selectedStages={selectedStages}
          onStagesChange={setSelectedStages}
          showOnlyMine={showOnlyMine}
          onShowOnlyMineChange={setShowOnlyMine}
          isAdmin={isAdmin}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Map */}
        <div className={`flex-1 rounded-lg overflow-hidden border border-border ${isMobile ? 'h-full' : ''}`}>
          <LeadMap
            clients={clients}
            selectedClient={selectedClient}
            onClientSelect={handleClientSelect}
            loading={loading}
          />
        </div>

        {/* Sidebar - Desktop only */}
        {!isMobile && (
          <div className="w-80 flex-shrink-0">
            {selectedClient ? (
              <LeadDetailPanel
                client={selectedClient}
                onClose={() => setSelectedClient(null)}
                onRefresh={handleRefresh}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
              />
            ) : (
              <LeadMapSidebar
                stats={stats}
                clients={clients}
                onClientSelect={handleClientSelect}
              />
            )}
          </div>
        )}
      </div>

      {/* Mobile detail sheet */}
      {isMobile && selectedClient && (
        <LeadDetailMobileSheet
          client={selectedClient}
          open={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          onRefresh={handleRefresh}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
        />
      )}

      {/* Create dialog */}
      <CreateClientDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleRefresh}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        enableGeocoding={true}
      />
    </div>
  );
};

// Export version with mobile routing
const LeadMapPage = createMobilePage({
  DesktopComponent: LeadMapPageDesktop,
  MobileComponent: LeadMapPageMobile,
});

export default LeadMapPage;
