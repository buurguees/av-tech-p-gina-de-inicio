import { useState, useEffect, useCallback } from "react";
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
import { Plus, Filter, X, Loader2 } from "lucide-react";
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

// Geocoding helper - geocodifica direcciones usando Nominatim
const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    // Delay para cumplir rate limiting de Nominatim (1 request/second)
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&countrycodes=es&limit=1`,
      {
        headers: {
          'User-Agent': 'NexoAV-LeadMap/1.0'
        }
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    
    if (data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon)
    };
  } catch (err) {
    console.error('Geocoding error:', err);
    return null;
  }
};

const LeadMapPageDesktop = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [clients, setClients] = useState<LeadClient[]>([]);
  const [stats, setStats] = useState<LeadStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocodingProgress, setGeocodingProgress] = useState<{current: number; total: number} | null>(null);
  const [selectedClient, setSelectedClient] = useState<LeadClient | null>(null);
  const [focusClient, setFocusClient] = useState<LeadClient | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Filters
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  
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

      const clientsData = data || [];
      setClients(clientsData);

      // Geocodificar clientes que no tienen coordenadas pero tienen dirección
      const clientsNeedingGeocoding = clientsData.filter(
        (c: LeadClient) => !c.latitude && !c.longitude && c.full_address
      );

      if (clientsNeedingGeocoding.length > 0) {
        geocodeClientsInBackground(clientsNeedingGeocoding);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const geocodeClientsInBackground = async (clientsToGeocode: LeadClient[]) => {
    setGeocodingProgress({ current: 0, total: clientsToGeocode.length });

    for (let i = 0; i < clientsToGeocode.length; i++) {
      const client = clientsToGeocode[i];
      setGeocodingProgress({ current: i + 1, total: clientsToGeocode.length });

      if (!client.full_address) continue;

      const coords = await geocodeAddress(client.full_address);
      
      if (coords) {
        // Actualizar coordenadas en la base de datos
        await supabase.rpc('update_client_coordinates', {
          p_client_id: client.id,
          p_latitude: coords.lat,
          p_longitude: coords.lon,
          p_full_address: client.full_address
        });

        // Actualizar estado local
        setClients(prev => prev.map(c => 
          c.id === client.id 
            ? { ...c, latitude: coords.lat, longitude: coords.lon }
            : c
        ));
      }
    }

    setGeocodingProgress(null);
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

  const totalLeads = clients.length;
  const mappableLeads = clients.filter(c => c.latitude && c.longitude).length;

  return (
    <div className="w-full flex flex-col" style={{ height: 'calc(100vh - 8rem)', minHeight: '600px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mapa Comercial</h1>
          <p className="text-sm text-muted-foreground">
            {showOnlyMine ? "Mis leads" : "Todos los leads"} ({mappableLeads}/{totalLeads} en mapa)
            {geocodingProgress && (
              <span className="ml-2 text-primary">
                <Loader2 className="inline-block h-3 w-3 animate-spin mr-1" />
                Geocodificando {geocodingProgress.current}/{geocodingProgress.total}...
              </span>
            )}
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

      {/* Main content - 60/40 split: Map gets 60%, Sidebar gets 40% */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden" style={{ height: '100%', padding: '0 1%' }}>
        {/* Map - 60% del espacio con márgenes */}
        <div 
          className="rounded-lg overflow-hidden border border-border flex-shrink-0" 
          style={{ 
            width: '58%', 
            minWidth: '58%',
            maxWidth: '58%',
            flex: '0 0 58%',
            height: '100%',
            minHeight: '500px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <LeadMap
            clients={clients}
            selectedClient={selectedClient}
            onClientSelect={handleClientSelect}
            loading={loading}
            focusClient={focusClient}
          />
        </div>

        {/* Sidebar - Desktop only - 40% del espacio */}
        {!isMobile && (
          <div 
            className="flex-shrink-0 overflow-y-auto"
            style={{ 
              width: '40%', 
              minWidth: '40%',
              maxWidth: '40%',
              flex: '0 0 40%',
              height: '100%'
            }}
          >
            {selectedClient ? (
              <LeadDetailPanel
                client={selectedClient}
                onClose={() => {
                  setSelectedClient(null);
                  setFocusClient(null);
                }}
                onRefresh={handleRefresh}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                onFocusLocation={() => setFocusClient(selectedClient)}
                userId={userId || ''}
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
