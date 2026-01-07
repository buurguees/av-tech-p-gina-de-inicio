import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FolderKanban, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import NexoHeader from "./components/NexoHeader";
import CreateProjectDialog from "./components/CreateProjectDialog";
import PaginationControls from "./components/PaginationControls";

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

const ProjectsPage = () => {
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

  // Pagination (50 records per page)
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
  } = usePagination(projects, { pageSize: 50 });

  return (
    <div className="min-h-screen bg-black">
      <NexoHeader userId={userId || ""} title="Proyectos" />
      
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Proyectos</h1>
              <p className="text-white/60">Gestiona todos los proyectos</p>
            </div>
            <Button 
              className="bg-white text-black hover:bg-white/90"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Proyecto
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Buscar proyectos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          {/* Table */}
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">Nº Proyecto</TableHead>
                  <TableHead className="text-white/60">Cliente</TableHead>
                  <TableHead className="text-white/60">Nombre del Proyecto</TableHead>
                  <TableHead className="text-white/60">Nº Pedido</TableHead>
                  <TableHead className="text-white/60">Estado</TableHead>
                  <TableHead className="text-white/60">Ciudad</TableHead>
                  <TableHead className="text-white/60">Local</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={7} className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-white/40 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : projects.length === 0 ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={7} className="text-center py-12">
                      <FolderKanban className="h-12 w-12 text-white/20 mx-auto mb-3" />
                      <p className="text-white/40">No hay proyectos</p>
                      <Button
                        variant="link"
                        className="text-white/60 hover:text-white mt-2"
                        onClick={() => setIsCreateDialogOpen(true)}
                      >
                        Crear el primer proyecto
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProjects.map((project) => {
                    const statusInfo = getStatusInfo(project.status);
                    return (
                      <TableRow 
                        key={project.id} 
                        className="border-white/10 hover:bg-white/5 cursor-pointer"
                        onClick={() => handleProjectClick(project.id)}
                      >
                        <TableCell className="font-mono text-white">
                          {project.project_number}
                        </TableCell>
                        <TableCell className="text-white">
                          {project.client_name || '-'}
                        </TableCell>
                        <TableCell className="text-white/80 max-w-xs truncate">
                          {project.project_name}
                        </TableCell>
                        <TableCell className="text-white/60">
                          {project.client_order_number || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${statusInfo.color} border`}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/60">
                          {project.project_city || '-'}
                        </TableCell>
                        <TableCell className="text-white/60">
                          {project.local_name || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {paginatedProjects.length > 0 && (
              <PaginationControls
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
          </div>
        </motion.div>
      </main>

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
};

export default ProjectsPage;
