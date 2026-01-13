/**
 * LeadMapPageMobile
 * 
 * Versión optimizada para móviles del mapa de leads.
 * Mapa a pantalla completa con botón flotante y popup desde abajo.
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LeadMap from "../components/leadmap/LeadMap";
import LeadDetailMobileSheet from "../components/leadmap/LeadDetailMobileSheet";
import CreateClientDialog from "../components/CreateClientDialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { LEAD_STAGE_COLORS, LEAD_STAGE_LABELS, LeadClient, LeadStats } from "../LeadMapPage";

// Geocoding helper
const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1100));
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&countrycodes=es&limit=1`,
      { headers: { 'User-Agent': 'NexoAV-LeadMap/1.0' } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch (err) {
    console.error('Geocoding error:', err);
    return null;
  }
};

const LeadMapPageMobile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [clients, setClients] = useState<LeadClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocodingProgress, setGeocodingProgress] = useState<{current: number; total: number} | null>(null);
  const [selectedClient, setSelectedClient] = useState<LeadClient | null>(null);
  const [focusClient, setFocusClient] = useState<LeadClient | null>(null);
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
        await supabase.rpc('update_client_coordinates', {
          p_client_id: client.id,
          p_latitude: coords.lat,
          p_longitude: coords.lon,
          p_full_address: client.full_address
        });

        setClients(prev => prev.map(c => 
          c.id === client.id 
            ? { ...c, latitude: coords.lat, longitude: coords.lon }
            : c
        ));
      }
    }

    setGeocodingProgress(null);
  };

  const handleClientSelect = (client: LeadClient | null) => {
    setSelectedClient(client);
  };

  const handleRefresh = () => {
    fetchClients();
    setSelectedClient(null);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Geocoding progress indicator */}
      {geocodingProgress && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs flex items-center gap-2 shadow-lg">
          <Loader2 className="h-3 w-3 animate-spin" />
          Geocodificando {geocodingProgress.current}/{geocodingProgress.total}...
        </div>
      )}

      {/* Mapa a pantalla completa */}
      <div className="flex-1 relative">
        <LeadMap
          clients={clients}
          selectedClient={selectedClient}
          onClientSelect={handleClientSelect}
          loading={loading}
          focusClient={focusClient}
        />
      </div>

      {/* Botón flotante para crear lead */}
      <Button
        onClick={() => setShowCreateDialog(true)}
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg bg-orange-500 hover:bg-orange-600 text-white"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-label="Crear nuevo lead"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Mobile detail sheet - Popup desde abajo */}
      {selectedClient && (
        <LeadDetailMobileSheet
          client={selectedClient}
          open={!!selectedClient}
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

export default LeadMapPageMobile;
