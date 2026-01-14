import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Sheet, SheetContent } from "@/components/ui/sheet";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Project interface
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
  ON_HOLD: "#6B7280",
  COMPLETED: "#10B981",
  CANCELLED: "#EF4444",
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planificado",
  IN_PROGRESS: "En Progreso",
  ON_HOLD: "En Pausa",
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
    if (selectedProject?.latitude && selectedProject?.longitude) {
      map.setView([selectedProject.latitude, selectedProject.longitude], 14, {
        animate: true,
      });
    }
  }, [selectedProject, map]);
  
  return null;
};

const ProjectMapPageMobile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const defaultCenter: [number, number] = [41.3851, 2.1734];
  const defaultZoom = 10;

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Usar RPC function para obtener proyectos
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

      // Filtrar proyectos cancelados
      const filteredProjects = (projectsData || []).filter(
        (p: any) => p.status !== 'CANCELLED'
      );

      // Obtener coordenadas de clientes
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

      // Mapear los datos con coordenadas
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

  const totalProjects = projects.length;
  const mappableProjects = projects.filter(p => p.latitude && p.longitude).length;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-semibold text-foreground">Mapa Proyectos</h1>
        <p className="text-sm text-muted-foreground">
          Proyectos ({mappableProjects}/{totalProjects} en mapa)
        </p>
      </div>

      {/* Map */}
      <div className="flex-1 rounded-lg overflow-hidden border border-border min-h-[400px]">
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
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterHandler selectedProject={selectedProject} />
            
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
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[50vh]">
          {selectedProject && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold truncate">{selectedProject.project_name}</h3>
                <Badge 
                  style={{ backgroundColor: PROJECT_STATUS_COLORS[selectedProject.status], color: 'white' }}
                  className="text-xs flex-shrink-0"
                >
                  {PROJECT_STATUS_LABELS[selectedProject.status] || selectedProject.status}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{selectedProject.client_name || 'Sin cliente'}</p>
                </div>
                {selectedProject.full_address && (
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">{selectedProject.full_address}</p>
                  </div>
                )}
              </div>
              
              <Button
                className="w-full"
                onClick={() => handleViewProjectDetails(selectedProject.id)}
              >
                Ver Detalles del Proyecto
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProjectMapPageMobile;
