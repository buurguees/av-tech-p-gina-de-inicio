import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, ChevronDown, Edit, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectDetail {
  id: string;
  project_number: string;
  project_name: string;
  client_order_number: string | null;
  project_city: string | null;
  status: string;
}

interface ProjectHeaderProps {
  project: ProjectDetail;
  updatingStatus: boolean;
  onStatusChange: (newStatus: string) => void;
  onEditClick: () => void;
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

const ProjectHeader = ({ project, updatingStatus, onStatusChange, onEditClick }: ProjectHeaderProps) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const statusInfo = getStatusInfo(project.status);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(`/nexo-av/${userId}/projects`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{project.project_name}</h1>
            <span className="font-mono text-muted-foreground text-xs">#{project.project_number}</span>
            {project.client_order_number && (
              <span className="text-muted-foreground text-xs">• {project.client_order_number}</span>
            )}
            {project.project_city && (
              <span className="text-muted-foreground text-xs">• {project.project_city}</span>
            )}
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={updatingStatus}>
              <button 
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors",
                  statusInfo.color,
                  updatingStatus && "opacity-50 cursor-not-allowed"
                )}
              >
                {updatingStatus ? "Actualizando..." : statusInfo.label}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="min-w-[180px] bg-zinc-900 border-white/10"
            >
              {PROJECT_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status.value}
                  onClick={() => onStatusChange(status.value)}
                  className={cn(
                    "cursor-pointer text-white hover:bg-white/10",
                    status.value === project.status && 'bg-accent'
                  )}
                >
                  <span className={cn("inline-block w-2 h-2 rounded-full mr-2", status.color.split(' ')[0])} />
                  <span>{status.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="outline"
            size="sm"
            className="h-9 px-2 text-[10px] font-medium gap-2"
            onClick={onEditClick}
          >
            <Edit className="h-3 w-3" />
            Editar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
