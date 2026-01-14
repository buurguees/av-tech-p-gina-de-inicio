import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import LeadMap from "./components/leadmap/LeadMap";
import LeadMapFilters from "./components/leadmap/LeadMapFilters";
import CanvassingMapSidebar from "./components/leadmap/CanvassingMapSidebar";
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

// Canvassing Location interface
export interface CanvassingLocation {
  id: string;
  status: string;
  company_name: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_phone_primary: string | null;
  contact_email_primary: string | null;
  priority: string | null;
  lead_score: number | null;
  appointment_date: string | null;
  callback_date: string | null;
  created_at: string;
  updated_at: string;
}

// Legacy interface for backward compatibility (deprecated - use CanvassingLocation)
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

// Canvassing stats interface
export interface CanvassingStats {
  status: string;
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

  // Canvassing locations state
  const [canvassingLocations, setCanvassingLocations] = useState<CanvassingLocation[]>([]);
  const [canvassingStats, setCanvassingStats] = useState<CanvassingStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<CanvassingLocation | null>(null);
  const [focusLocation, setFocusLocation] = useState<CanvassingLocation | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Filters
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  
  // User info
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (currentUserId !== null) {
      fetchCanvassingLocations();
      fetchCanvassingStats();
    }
  }, [currentUserId, selectedStatuses]);

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

  const fetchCanvassingLocations = async () => {
    try {
      setLoading(true);
      
      // Llamar a la función RPC para obtener puntos de canvassing del usuario actual
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

      // Filtrar por estados seleccionados
      let filteredLocations = locationsData;
      if (selectedStatuses.length > 0) {
        filteredLocations = locationsData.filter((loc: CanvassingLocation) =>
          selectedStatuses.includes(loc.status)
        );
      }

      setCanvassingLocations(filteredLocations);
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
      // Obtener todas las ubicaciones para calcular estadísticas
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

      // Ordenar por cantidad descendente
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

  const totalLocations = canvassingLocations.length;
  const mappableLocations = canvassingLocations.filter(loc => loc.latitude && loc.longitude).length;

  return (
    <div className="w-full flex flex-col" style={{ height: 'calc(100vh - 8rem)', minHeight: '600px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mapa Comercial</h1>
          <p className="text-sm text-muted-foreground">
            Puntos de Canvassing / Prospección ({mappableLocations}/{totalLocations} en mapa)
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
            <span className="ml-1 hidden sm:inline">Nuevo Punto</span>
          </Button>
        </div>
      </div>

      {/* Filters - TODO: Crear filtros específicos para canvassing */}
      {showFilters && (
        <div className="mb-4 p-4 bg-card border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Filtros de Canvassing próximamente</p>
        </div>
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
            canvassingLocations={canvassingLocations}
            selectedLocation={selectedLocation}
            onLocationSelect={handleLocationSelect}
            loading={loading}
            focusLocation={focusLocation}
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
            {selectedLocation ? (
              <div className="h-full w-full flex items-center justify-center bg-card border border-border rounded-lg">
                <p className="text-muted-foreground text-sm">Detalle de punto de canvassing próximamente</p>
              </div>
            ) : (
              <CanvassingMapSidebar
                stats={canvassingStats}
                locations={canvassingLocations}
                onLocationSelect={handleLocationSelect}
              />
            )}
          </div>
        )}
      </div>

      {/* Mobile detail sheet */}
      {isMobile && selectedLocation && (
        <div className="fixed inset-0 z-50 bg-background">
          <p className="text-muted-foreground text-sm p-4">Detalle de punto de canvassing próximamente</p>
        </div>
      )}

      {/* Create dialog - TODO: Crear diálogo específico para canvassing */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card p-4 rounded-lg">
            <p className="text-muted-foreground text-sm">Crear punto de canvassing próximamente</p>
            <Button onClick={() => setShowCreateDialog(false)} className="mt-4">Cerrar</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Export version with mobile routing
const LeadMapPage = createMobilePage({
  DesktopComponent: LeadMapPageDesktop,
  MobileComponent: LeadMapPageMobile,
});

export default LeadMapPage;
