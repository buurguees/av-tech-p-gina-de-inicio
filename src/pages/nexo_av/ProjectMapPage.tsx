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
const ProjectMapPageMobile = lazy(() => import("./mobile/LeadMapPageMobile"));

interface Project extends MapItem {
  project_number: string;
  project_name: string;
  project_address: string | null;
  project_city: string | null;
  latitude: number | null;
  longitude: number | null;
  client_name: string | null;
}

const ProjectMapPageDesktop = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [focusProject, setFocusProject] = useState<Project | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      // Consulta directa a la tabla para obtener proyectos con coordenadas
      // Si los proyectos no tienen coordenadas, las obtendremos del cliente asociado
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          project_number,
          project_name,
          project_address,
          project_city,
          latitude,
          longitude,
          client_id,
          clients:client_id (
            company_name
          )
        `)
        .order('project_name');
      
      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        toast({
          title: "Error",
          description: "No se pudieron cargar los proyectos",
          variant: "destructive",
        });
        return;
      }

      const projects = (projectsData || []).map((p: any) => {
        const clientName = p.clients ? (Array.isArray(p.clients) ? p.clients[0]?.company_name : p.clients?.company_name) : null;
        return {
          id: p.id,
          name: p.project_name,
          project_number: p.project_number,
          project_name: p.project_name,
          project_address: p.project_address,
          project_city: p.project_city,
          latitude: p.latitude,
          longitude: p.longitude,
          client_name: clientName,
          address: p.project_address ? `${p.project_address}${p.project_city ? `, ${p.project_city}` : ''}` : null,
        };
      }) as Project[];

      setProjects(projects);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (project: Project | null) => {
    setSelectedProject(project);
  };

  const totalProjects = projects.length;
  const mappableProjects = projects.filter(p => p.latitude && p.longitude).length;

  return (
    <div className="w-full flex flex-col" style={{ height: 'calc(100vh - 8rem)', minHeight: '600px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mapa Proyectos</h1>
          <p className="text-sm text-muted-foreground">
            Todos los proyectos ({mappableProjects}/{totalProjects} en mapa)
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
            items={projects}
            selectedItem={selectedProject}
            onItemSelect={handleProjectSelect}
            loading={loading}
            focusItem={focusProject}
            markerColor="#8B5CF6"
            getItemLabel={(item) => item.project_name || item.name}
            getItemDetails={(item) => (
              <div>
                <p className="font-semibold">{item.project_name || item.name}</p>
                {item.project_number && <p className="text-xs text-muted-foreground">#{item.project_number}</p>}
                {item.address && <p className="text-sm text-muted-foreground">{item.address}</p>}
                {item.client_name && <p className="text-xs text-muted-foreground">Cliente: {item.client_name}</p>}
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
const ProjectMapPage = createMobilePage({
  DesktopComponent: ProjectMapPageDesktop,
  MobileComponent: ProjectMapPageMobile,
});

export default ProjectMapPage;
