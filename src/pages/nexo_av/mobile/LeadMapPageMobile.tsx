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
import MobileBottomNav from "../components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LEAD_STAGE_COLORS, LEAD_STAGE_LABELS, LeadClient, LeadStats } from "../LeadMapPage";

const LeadMapPageMobile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [clients, setClients] = useState<LeadClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<LeadClient | null>(null);
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

  const handleClientSelect = (client: LeadClient | null) => {
    setSelectedClient(client);
  };

  const handleRefresh = () => {
    fetchClients();
    setSelectedClient(null);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Mapa a pantalla completa */}
      <div className="flex-1 relative">
        <LeadMap
          clients={clients}
          selectedClient={selectedClient}
          onClientSelect={handleClientSelect}
          loading={loading}
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

      {/* Bottom Navigation - Siempre visible */}
      <MobileBottomNav userId={userId || ''} />
    </div>
  );
};

export default LeadMapPageMobile;
