/**
 * ProjectsPageMobile
 * 
 * Versión optimizada para móviles de la página de proyectos.
 * Diseñada para técnicos y comerciales con acceso rápido a la información.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, FolderKanban } from "lucide-react";
import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import NexoHeaderMobile from "../components/mobile/NexoHeaderMobile";
import ProjectsListMobile from "../components/mobile/ProjectsListMobile";
import CreateProjectDialog from "../components/CreateProjectDialog";
import MobileBottomNav from "../components/MobileBottomNav";

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
}

const PROJECT_STATUSES = [
  { value: 'PLANNED', label: 'Planificado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'IN_PROGRESS', label: 'En Progreso', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'PAUSED', label: 'Pausado', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'COMPLETED', label: 'Completado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'CANCELLED', label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

const getStatusInfo = (status: string) => {
  return PROJECT_STATUSES.find(s => s.value === status) || PROJECT_STATUSES[0];
};

const ProjectsPageMobile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 500);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('list_projects', {
        p_search: debouncedSearchTerm || null
      });

      if (error) throw error;
      setProjects(data || []);
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

  const handleProjectCreated = () => {
    setIsCreateDialogOpen(false);
    fetchProjects();
  };

  // Pagination (25 records per page en móvil)
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedProjects,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(projects, { pageSize: 25 });

  return (
    <div className="min-h-screen bg-black pb-mobile-nav">
      <NexoHeaderMobile 
        userId={userId || ""} 
        title="Proyectos" 
        showBack={false} 
        showHome={true} 
      />
      
      <main className="px-3 py-3 space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Botón Crear - Destacado */}
          <Button 
            className="w-full bg-white text-black hover:bg-white/90 h-12 text-sm font-medium"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Crear Proyecto
          </Button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Buscar proyectos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 h-11 text-sm"
            />
          </div>

          {/* Projects List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
            </div>
          ) : projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center px-4"
            >
              <FolderKanban className="h-16 w-16 text-white/20 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No hay proyectos</h3>
              <p className="text-white/60 text-sm mb-6">
                {searchInput
                  ? "No se encontraron proyectos con ese criterio"
                  : "Crea tu primer proyecto para comenzar"}
              </p>
              {!searchInput && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-white text-black hover:bg-white/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Proyecto
                </Button>
              )}
            </motion.div>
          ) : (
            <ProjectsListMobile
              projects={paginatedProjects}
              getStatusInfo={getStatusInfo}
              onProjectClick={handleProjectClick}
              onCreateClick={() => setIsCreateDialogOpen(true)}
              loading={loading}
              currentPage={currentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={totalItems}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
              onPrevPage={prevPage}
              onNextPage={nextPage}
              onGoToPage={goToPage}
            />
          )}
        </motion.div>
      </main>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleProjectCreated}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav userId={userId || ''} />
    </div>
  );
};

export default ProjectsPageMobile;
