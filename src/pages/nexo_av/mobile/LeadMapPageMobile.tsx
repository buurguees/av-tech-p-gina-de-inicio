/**
 * LeadMapPageMobile
 * 
 * Versión optimizada para móviles del Mapa Comercial (Canvassing).
 * Mapa a pantalla completa con botón flotante y popup desde abajo.
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LeadMap from "../components/leadmap/LeadMap";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CanvassingLocation, CanvassingStats } from "../LeadMapPage";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import CanvassingMapSidebar from "../components/leadmap/CanvassingMapSidebar";
import CanvassingDetailPanel from "../components/leadmap/CanvassingDetailPanel";
import CanvassingLocationDialog from "../components/leadmap/CanvassingLocationDialog";

const LeadMapPageMobile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  // Canvassing locations state
  const [canvassingLocations, setCanvassingLocations] = useState<CanvassingLocation[]>([]);
  const [canvassingStats, setCanvassingStats] = useState<CanvassingStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<CanvassingLocation | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // User info
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (currentUserId !== null) {
      fetchCanvassingLocations();
      fetchCanvassingStats();
    }
  }, [currentUserId]);

  const fetchUserInfo = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_user_info');
      if (!error && data && data.length > 0) {
        const user = data[0];
        setCurrentUserId(user.user_id);
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
    }
  };

  const fetchCanvassingLocations = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await (supabase.rpc as any)('list_user_canvassing_locations', {
        p_user_id: currentUserId || null
      });
      
      if (error) {
        console.error('Error fetching canvassing locations:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los puntos de canvassing",
          variant: "destructive",
        });
        return;
      }

      const locationsData = (data || []).map((loc: any) => ({
        id: loc.id,
        status: loc.status,
        company_name: loc.company_name,
        latitude: parseFloat(loc.latitude) || 0,
        longitude: parseFloat(loc.longitude) || 0,
        address: loc.address,
        city: loc.city,
        province: loc.province,
        postal_code: loc.postal_code,
        contact_first_name: loc.contact_first_name,
        contact_last_name: loc.contact_last_name,
        contact_phone_primary: loc.contact_phone_primary,
        contact_email_primary: loc.contact_email_primary,
        priority: loc.priority,
        lead_score: loc.lead_score,
        appointment_date: loc.appointment_date,
        callback_date: loc.callback_date,
        created_at: loc.created_at,
        updated_at: loc.updated_at,
      }));

      setCanvassingLocations(locationsData);
    } catch (err) {
      console.error('Error fetching canvassing locations:', err);
      toast({
        title: "Error",
        description: "Error al cargar los puntos de canvassing",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCanvassingStats = async () => {
    try {
      const { data, error } = await (supabase.rpc as any)('list_user_canvassing_locations', {
        p_user_id: currentUserId || null
      });
      
      if (error) {
        console.error('Error fetching canvassing stats:', error);
        return;
      }

      const locationsData = data || [];
      
      // Calcular estadísticas por estado
      const statsMap = new Map<string, number>();
      locationsData.forEach((loc: any) => {
        const status = loc.status || 'OTH';
        statsMap.set(status, (statsMap.get(status) || 0) + 1);
      });

      const stats: CanvassingStats[] = Array.from(statsMap.entries()).map(([status, count]) => ({
        status,
        count,
      }));

      stats.sort((a, b) => b.count - a.count);
      
      setCanvassingStats(stats);
    } catch (err) {
      console.error('Error fetching canvassing stats:', err);
    }
  };

  const handleLocationSelect = (location: CanvassingLocation | null) => {
    setSelectedLocation(location);
  };

  const handleRefresh = () => {
    fetchCanvassingLocations();
    fetchCanvassingStats();
    setSelectedLocation(null);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Mapa a pantalla completa */}
      <div className="flex-1 relative">
        <LeadMap
          canvassingLocations={canvassingLocations}
          selectedLocation={selectedLocation}
          onLocationSelect={handleLocationSelect}
          loading={loading}
          onCanvassingLocationCreate={(locationId) => {
            handleRefresh();
          }}
        />
      </div>

      {/* Mobile detail sheet - Popup desde abajo */}
      {selectedLocation && (
        <Sheet open={!!selectedLocation} onOpenChange={(open) => !open && setSelectedLocation(null)}>
          <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
            <CanvassingDetailPanel
              location={selectedLocation}
              onClose={() => setSelectedLocation(null)}
              onEdit={() => {
                setShowEditDialog(true);
                setSelectedLocation(null);
              }}
              onRefresh={handleRefresh}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Edit dialog */}
      {showEditDialog && selectedLocation && (
        <CanvassingLocationDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          locationId={selectedLocation.id}
          onSuccess={() => {
            handleRefresh();
            setShowEditDialog(false);
          }}
        />
      )}
    </div>
  );
};

export default LeadMapPageMobile;
