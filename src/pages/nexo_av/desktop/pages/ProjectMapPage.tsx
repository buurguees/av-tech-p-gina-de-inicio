import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsNexoAvDarkTheme } from "../../hooks/useNexoAvThemeMode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RefreshCw, Loader2, MapPin, Building2, FolderKanban } from "lucide-react";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  status: string;
  project_city: string | null;
  client_name: string | null;
  client_id: string | null;
  latitude: number | null;
  longitude: number | null;
  full_address: string | null;
  created_at: string;
}

// Estados de proyectos con colores
const PROJECT_STATUS_COLORS: Record<string, string> = {
  PLANNED: "#3B82F6",
  IN_PROGRESS: "#F59E0B",
  PAUSED: "#6B7280",
  COMPLETED: "#10B981",
  CANCELLED: "#EF4444",
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planificado",
  IN_PROGRESS: "En Progreso",
  PAUSED: "Pausado",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

// Create colored marker icon for projects
const createProjectMarkerIcon = (status: string) => {
  const color = PROJECT_STATUS_COLORS[status] || '#6B7280';
  
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path fill="${color}" stroke="#fff" stroke-width="1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'project-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Component to handle map center updates
const MapCenterHandler = ({ selectedProject }: { selectedProject?: Project | null }) => {
  const map = useMap();
  
  useEffect(() => {
    if (selectedProject && selectedProject.latitude && selectedProject.longitude) {
      map.setView([selectedProject.latitude, selectedProject.longitude], 15);
    }
  }, [selectedProject, map]);
  
  return null;
};

const ProjectMapPageDesktop = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isDarkTheme = useIsNexoAvDarkTheme();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const isDarkTheme = useIsNexoAvDarkTheme();

  // Barcelona Metropolitan Area center coordinates
  const defaultCenter: [number, number] = [41.3851, 2.1734];
  const defaultZoom = 10;

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Usar RPC function para obtener proyectos (excluir cancelados)
      const { data: projectsData, error: projectsError } = await supabase
        .rpc('list_projects', { p_search: '' });
      
      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        toast({
          title: "Error",
          description: "No se pudieron cargar los proyectos",
          variant: "destructive",
        });
        return;
      }

      // Filtrar proyectos cancelados y obtener coordenadas de clientes
      const filteredProjects = (projectsData || []).filter(
        (p: any) => p.status !== 'CANCELLED'
      );

      // Obtener coordenadas de clientes para cada proyecto
      const clientIds = [...new Set(filteredProjects.map((p: any) => p.client_id).filter(Boolean))];
      
      let clientsMap: Record<string, any> = {};
      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .rpc('list_clients_for_map', { p_lead_stages: null });
        
        if (clientsData) {
          clientsMap = clientsData.reduce((acc: Record<string, any>, client: any) => {
            acc[client.id] = client;
            return acc;
          }, {});
        }
      }

      // Mapear los datos con coordenadas de los clientes
      const projectsWithCoords: Project[] = filteredProjects.map((project: any) => {
        const client = clientsMap[project.client_id];
        const latitude = client?.latitude ? parseFloat(String(client.latitude)) : null;
        const longitude = client?.longitude ? parseFloat(String(client.longitude)) : null;
        const fullAddress = client?.full_address || project.project_address;
        
        return {
          id: project.id,
          project_number: project.project_number,
          project_name: project.project_name || project.local_name || `Proyecto ${project.project_number}`,
          status: project.status,
          project_city: project.project_city,
          client_name: project.client_name || client?.company_name || null,
          client_id: project.client_id,
          latitude,
          longitude,
          full_address: fullAddress,
          created_at: project.created_at,
        };
      });

      setProjects(projectsWithCoords);
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: "Error",
        description: "Error al cargar los proyectos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (project: Project | null) => {
    setSelectedProject(project);
  };

  const handleViewProjectDetails = (projectId: string) => {
    if (userId) {
      navigate(`/nexo-av/${userId}/projects/${projectId}`);
    }
  };

  const handleRefresh = () => {
    fetchProjects();
    setSelectedProject(null);
  };

  const totalProjects = projects.length;
  const mappableProjects = projects.filter(p => p.latitude && p.longitude).length;

  // Calcular estadísticas por estado
  const statsByStatus = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="w-full flex flex-col" style={{ height: 'calc(100vh - 8rem)', minHeight: '600px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mapa Proyectos</h1>
          <p className="text-sm text-muted-foreground">
            Ubicación de proyectos ({mappableProjects}/{totalProjects} en mapa)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="ml-1 hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Main content - 60/40 split */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden" style={{ height: '100%' }}>
        {/* Map - 60% */}
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
          }}
        >
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-muted/30">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MapContainer
              center={defaultCenter}
              zoom={defaultZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                key={isDarkTheme ? "nexo-project-map-dark" : "nexo-project-map-light"}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapCenterHandler selectedProject={selectedProject} />
              
              {/* Project markers */}
              {projects.filter(p => p.latitude && p.longitude).map((project) => (
                <Marker
                  key={project.id}
                  position={[project.latitude!, project.longitude!]}
                  icon={createProjectMarkerIcon(project.status)}
                  eventHandlers={{
                    click: () => handleProjectSelect(project),
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-medium">{project.project_name}</p>
                      <p className="text-muted-foreground text-xs">{project.client_name}</p>
                      <Badge 
                        style={{ backgroundColor: PROJECT_STATUS_COLORS[project.status], color: 'white' }}
                        className="mt-1 text-[10px]"
                      >
                        {PROJECT_STATUS_LABELS[project.status] || project.status}
                      </Badge>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Sidebar - Desktop only - 40% */}
        {!isMobile && (
          <div 
            className="flex-shrink-0 overflow-hidden flex flex-col gap-4"
            style={{ 
              width: '40%', 
              minWidth: '40%',
              maxWidth: '40%',
              flex: '0 0 40%',
              height: '100%'
            }}
          >
            {/* Stats card */}
            <Card className="shadow-none flex-shrink-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Proyectos por Estado</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {Object.entries(statsByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PROJECT_STATUS_COLORS[status] || '#6B7280' }}
                        />
                        <span className="text-sm">{PROJECT_STATUS_LABELS[status] || status}</span>
                      </div>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-sm">Total</span>
                      <span className="text-sm">{totalProjects}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected project detail or project list */}
            {selectedProject ? (
              <Card className="flex-1 shadow-none overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium truncate">{selectedProject.project_name}</CardTitle>
                    <Badge 
                      style={{ backgroundColor: PROJECT_STATUS_COLORS[selectedProject.status], color: 'white' }}
                      className="text-[10px] flex-shrink-0"
                    >
                      {PROJECT_STATUS_LABELS[selectedProject.status] || selectedProject.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-muted-foreground flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{selectedProject.client_name || 'Sin cliente'}</p>
                  </div>
                  {selectedProject.full_address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">{selectedProject.full_address}</p>
                    </div>
                  )}
                  {selectedProject.project_city && (
                    <p className="text-xs text-muted-foreground pl-5">{selectedProject.project_city}</p>
                  )}
                  <div className="pt-2 space-y-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => handleViewProjectDetails(selectedProject.id)}
                    >
                      Ver Detalles del Proyecto
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProject(null)}
                      className="w-full"
                    >
                      Cerrar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex-1 flex flex-col min-h-0 shadow-none overflow-hidden">
                <CardHeader className="pb-2 flex-shrink-0">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FolderKanban size={14} />
                    Listado de Proyectos
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 flex-1 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-2">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          className="w-full text-left p-3 rounded-md hover:bg-secondary transition-colors border border-border/50 shadow-none"
                          onClick={() => handleProjectSelect(project)}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-medium text-sm truncate">{project.project_name}</p>
                            <div 
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: PROJECT_STATUS_COLORS[project.status] || '#6B7280' }}
                              title={PROJECT_STATUS_LABELS[project.status] || project.status}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{project.client_name}</p>
                          {project.project_city && (
                            <div className="flex items-center gap-1.5">
                              <MapPin size={10} className="text-muted-foreground flex-shrink-0" />
                              <p className="text-xs text-muted-foreground">{project.project_city}</p>
                            </div>
                          )}
                        </button>
                      ))}
                      {projects.length === 0 && !loading && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No hay proyectos
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectMapPageDesktop;
