import { motion } from "framer-motion";
import { FolderKanban, Building2, MapPin, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PaginationControls from "../PaginationControls";

interface Project {
  id: string;
  project_number: string;
  client_name: string | null;
  project_name: string;
  status: string;
  project_city: string | null;
  client_order_number: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface StatusInfo {
  label: string;
  color: string;
}

interface ProjectsListMobileProps {
  projects: Project[];
  getStatusInfo: (status: string) => StatusInfo;
  onProjectClick: (projectId: string) => void;
  onCreateClick: () => void;
  loading?: boolean;
  // Pagination props
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
}

const ProjectsListMobile = ({
  projects,
  getStatusInfo,
  onProjectClick,
  onCreateClick,
  loading = false,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  canGoPrev,
  canGoNext,
  onPrevPage,
  onNextPage,
  onGoToPage,
}: ProjectsListMobileProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16 rounded-xl border border-white/10 bg-white/5"
      >
        <FolderKanban className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <p className="text-white/40 text-sm mb-2">No hay proyectos</p>
        <Button
          variant="link"
          onClick={onCreateClick}
          className="text-white/60 hover:text-white text-sm touch-target"
        >
          Crear el primero
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project, index) => {
        const statusInfo = getStatusInfo(project.status);
        const createdDate = new Date(project.created_at);
        const formattedDate = createdDate.toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: 'short' 
        });

        return (
          <motion.button
            key={project.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            onClick={() => onProjectClick(project.id)}
            className="w-full p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200 text-left backdrop-blur-sm active:scale-[0.98] shadow-sm nexo-card-mobile"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-purple-500 text-sm font-semibold">
                    {project.project_number}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`${statusInfo.color} text-xs px-2 py-0.5`}
                  >
                    {statusInfo.label}
                  </Badge>
                </div>
                <h3 className="text-white font-semibold text-sm mb-1 truncate">
                  {project.project_name}
                </h3>
                {project.client_name && (
                  <div className="flex items-center gap-1.5 text-white/50 text-xs">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="truncate">{project.client_name}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
              <div className="flex items-center gap-3 text-white/50 text-xs flex-wrap">
                {project.project_city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[80px]">{project.project_city}</span>
                  </div>
                )}
                {project.client_order_number && (
                  <div className="flex items-center gap-1.5">
                    <span className="truncate max-w-[80px]">Pedido: {project.client_order_number}</span>
                  </div>
                )}
                {project.created_by_name && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[80px]">{project.created_by_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formattedDate}</span>
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
      
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={totalItems}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        onGoToPage={onGoToPage}
      />
    </div>
  );
};

export default ProjectsListMobile;
