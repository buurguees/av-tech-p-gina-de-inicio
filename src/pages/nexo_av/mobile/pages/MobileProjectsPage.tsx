import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { 
  FolderKanban, 
  Loader2, 
  Clock, 
  CheckCircle, 
  Plus,
  Search,
  ChevronRight,
  Calendar,
  Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjectStatusInfo } from "@/constants/projectStatuses";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";

interface Project {
  id: string;
  project_number: string;
  client_id: string | null;
  client_name: string | null;
  status: string;
  project_address: string | null;
  project_city: string | null;
  client_order_number: string | null;
  local_name: string | null;
  project_name: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  assigned_to_name: string | null;
  budget: number;
}

const MobileProjectsPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 500);
  const [projectKPIs, setProjectKPIs] = useState({
    planned: 0,
    inProgress: 0,
    completed: 0,
    invoiced: 0,
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('list_projects', {
        p_search: debouncedSearchTerm || null
      });

      if (error) throw error;
      
      // Show ALL projects without filtering by status
      const projectsList = data || [];
      setProjects(projectsList);

      // Calculate KPIs from all projects
      const planned = projectsList.filter((p: Project) => p.status === 'PLANNED').length;
      const inProgress = projectsList.filter((p: Project) => p.status === 'IN_PROGRESS').length;
      const completed = projectsList.filter((p: Project) => p.status === 'COMPLETED').length;
      const invoiced = projectsList.filter((p: Project) => p.status === 'INVOICED').length;
      
      setProjectKPIs({ planned, inProgress, completed, invoiced });
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [debouncedSearchTerm]);

  const handleProjectClick = (projectId: string) => {
    navigate(`/nexo-av/${userId}/projects/${projectId}`);
  };

  const handleCreateProject = () => {
    navigate(`/nexo-av/${userId}/projects/new`);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Fixed Header Section: KPIs + Search - Always visible, never scrolls */}
      <div 
        className="flex-shrink-0 py-3 px-3 w-full"
        style={{ background: 'linear-gradient(0deg, rgba(0, 0, 0, 1) 100%, rgba(255, 255, 255, 0) 0%)', height: 'fit-content' }}
      >
        {/* KPI Cards - Compact: Icon + Number only */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {/* Planificados - Azul */}
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="text-lg text-foreground font-semibold">
              {projectKPIs.planned}
            </span>
          </div>

          {/* En Progreso - Naranja */}
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-500">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-lg text-foreground font-semibold">
              {projectKPIs.inProgress}
            </span>
          </div>

          {/* Completados - Morado */}
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500">
              <CheckCircle className="h-4 w-4" />
            </div>
            <span className="text-lg text-foreground font-semibold">
              {projectKPIs.completed}
            </span>
          </div>

          {/* Facturados - Verde */}
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg text-green-500">
              <Receipt className="h-4 w-4" />
            </div>
            <span className="text-lg text-foreground font-semibold">
              {projectKPIs.invoiced}
            </span>
          </div>
        </div>

        {/* Search and Create Button */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar proyectos..."
              className="pl-9 h-8 bg-card border-border text-sm"
            />
          </div>
          {/* Button styled like bottom navigation - same height as input */}
          <button
            onClick={handleCreateProject}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
              "text-white/90 hover:text-white hover:bg-white/15",
              "active:scale-95 transition-all duration-200",
              "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]"
            )}
            style={{ touchAction: 'manipulation', height: '32px' }}
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo</span>
          </button>
        </div>
      </div>

      {/* Projects List - Scrollable area */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-3 pb-[80px] w-full h-full px-[15px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay proyectos</p>
            <p className="text-muted-foreground text-sm">
              {searchInput ? 'Prueba con otra búsqueda' : 'Crea tu primer proyecto'}
            </p>
          </div>
        ) : (
          projects.map((project) => {
            const statusInfo = getProjectStatusInfo(project.status);
            return (
              <button
                key={project.id}
                onClick={() => handleProjectClick(project.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl",
                  "bg-card border border-border",
                  "active:scale-[0.98] transition-all duration-200",
                  "hover:border-primary/30"
                )}
                style={{ touchAction: 'manipulation' }}
              >
                <div className="flex items-center gap-3">
                  {/* Status Badge - Fixed width column */}
                  <Badge 
                    variant="outline" 
                    className={cn(
                      statusInfo.className, 
                      "text-[10px] px-2 py-0.5 w-[80px] justify-center flex-shrink-0 whitespace-nowrap"
                    )}
                  >
                    {statusInfo.label}
                  </Badge>
                  
                  {/* Project Name - Flexible column */}
                  <span className="font-normal text-foreground truncate text-sm flex-1 min-w-0">
                    {project.project_name}
                  </span>
                  
                  {/* Arrow */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MobileProjectsPage;
