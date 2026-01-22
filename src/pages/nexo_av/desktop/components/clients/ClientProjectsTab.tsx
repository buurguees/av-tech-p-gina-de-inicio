import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, FolderKanban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import CreateProjectDialog from "../projects/CreateProjectDialog";

interface ClientProjectsTabProps {
  clientId: string;
}

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  status: string;
  project_city: string | null;
  local_name: string | null;
  client_order_number: string | null;
  created_at: string;
}

const PROJECT_STATUSES = [
  { value: 'PLANNED', label: 'Planificado', color: 'status-info' },
  { value: 'IN_PROGRESS', label: 'En Progreso', color: 'status-warning' },
  { value: 'PAUSED', label: 'Pausado', color: 'status-neutral' },
  { value: 'COMPLETED', label: 'Completado', color: 'status-success' },
  { value: 'CANCELLED', label: 'Cancelado', color: 'status-error' },
];

const getStatusInfo = (status: string) => {
  return PROJECT_STATUSES.find(s => s.value === status) || PROJECT_STATUSES[0];
};

const ClientProjectsTab = ({ clientId }: ClientProjectsTabProps) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('list_projects', {
        p_search: null
      });

      if (error) throw error;
      
      // Filter projects by client_id
      const clientProjects = (data || []).filter((p: any) => p.client_id === clientId);
      setProjects(clientProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [clientId]);

  const handleProjectClick = (projectId: string) => {
    navigate(`/nexo-av/${userId}/projects/${projectId}`);
  };

  const handleProjectCreated = () => {
    setIsCreateDialogOpen(false);
    fetchProjects();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex justify-end">
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proyecto
        </Button>
      </div>

      {/* Projects Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-border overflow-hidden bg-card"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Nº Proyecto</TableHead>
              <TableHead className="text-muted-foreground">Nombre</TableHead>
              <TableHead className="text-muted-foreground">Estado</TableHead>
              <TableHead className="text-muted-foreground">Ciudad</TableHead>
              <TableHead className="text-muted-foreground">Local</TableHead>
              <TableHead className="text-muted-foreground">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="text-center py-12">
                  <FolderKanban className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No hay proyectos para este cliente</p>
                  <Button
                    variant="link"
                    className="text-primary mt-2"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    Crear el primer proyecto
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => {
                const statusInfo = getStatusInfo(project.status);
                return (
                  <TableRow 
                    key={project.id} 
                    className="border-border hover:bg-accent cursor-pointer"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <TableCell className="font-mono text-foreground">
                      {project.project_number}
                    </TableCell>
                    <TableCell className="text-foreground max-w-xs truncate">
                      {project.project_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.project_city || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.local_name || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(project.created_at).toLocaleDateString('es-ES')}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleProjectCreated}
        preselectedClientId={clientId}
      />
    </div>
  );
};

export default ClientProjectsTab;
