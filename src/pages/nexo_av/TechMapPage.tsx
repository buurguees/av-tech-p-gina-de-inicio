import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import SimpleMap, { MapItem } from "./components/leadmap/SimpleMap";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { createMobilePage } from "./MobilePageWrapper";
import { lazy } from "react";

// Lazy load mobile version (por ahora usamos el mismo componente)
const TechMapPageMobile = lazy(() => import("./mobile/LeadMapPageMobile"));

interface Tech extends MapItem {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  current_location: string | null;
}

const TechMapPageDesktop = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState<Tech | null>(null);
  const [focusTech, setFocusTech] = useState<Tech | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTechs();
  }, []);

  const fetchTechs = async () => {
    try {
      setLoading(true);
      // Usar RPC para obtener usuarios y filtrar técnicos
      const { data, error } = await supabase.rpc('list_authorized_users');
      
      if (error) {
        console.error('Error fetching techs:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los técnicos",
          variant: "destructive",
        });
        return;
      }

      // Filtrar solo técnicos y mapear datos
      // Nota: Por ahora los técnicos no tienen coordenadas, se añadirán más adelante
      const techsData = (data || [])
        .filter((user: any) => user.roles?.includes('tecnico') || user.roles?.includes('tech'))
        .map((user: any) => ({
          id: user.id || user.user_id,
          name: user.full_name,
          user_id: user.user_id || user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone || null,
          latitude: user.latitude || null, // Por ahora null, se añadirá más adelante
          longitude: user.longitude || null, // Por ahora null, se añadirá más adelante
          current_location: user.current_location || null,
          address: user.current_location,
        })) as Tech[];

      setTechs(techsData);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTechSelect = (tech: Tech | null) => {
    setSelectedTech(tech);
  };

  const totalTechs = techs.length;
  const mappableTechs = techs.filter(t => t.latitude && t.longitude).length;

  return (
    <div className="w-full flex flex-col" style={{ height: 'calc(100vh - 8rem)', minHeight: '600px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mapa Técnicos</h1>
          <p className="text-sm text-muted-foreground">
            Todos los técnicos ({mappableTechs}/{totalTechs} en mapa)
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
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-4 bg-card border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Filtros próximamente disponibles</p>
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
          <SimpleMap
            items={techs}
            selectedItem={selectedTech}
            onItemSelect={handleTechSelect}
            loading={loading}
            focusItem={focusTech}
            markerColor="#10B981"
            getItemLabel={(item) => item.full_name || item.name}
            getItemDetails={(item) => (
              <div>
                <p className="font-semibold">{item.full_name || item.name}</p>
                {item.email && <p className="text-xs text-muted-foreground">{item.email}</p>}
                {item.phone && <p className="text-xs text-muted-foreground">{item.phone}</p>}
                {item.current_location && <p className="text-sm text-muted-foreground">{item.current_location}</p>}
              </div>
            )}
          />
        </div>

        {/* Sidebar - Desktop only - 40% del espacio - VACÍO por ahora */}
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
            <div className="h-full w-full flex items-center justify-center bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm">Panel de información próximamente</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Export version with mobile routing
const TechMapPage = createMobilePage({
  DesktopComponent: TechMapPageDesktop,
  MobileComponent: TechMapPageMobile,
});

export default TechMapPage;
