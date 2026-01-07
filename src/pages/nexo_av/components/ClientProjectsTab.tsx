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
import CreateProjectDialog from "./CreateProjectDialog";

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
  { value: 'PLANNED', label: 'Planificado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'IN_PROGRESS', label: 'En Progreso', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'PAUSED', label: 'Pausado', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'COMPLETED', label: 'Completado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'CANCELLED', label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
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
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex justify-end">
        <Button 
          className="bg-white text-black hover:bg-white/90"
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
        className="rounded-xl border border-white/10 overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60">Nº Proyecto</TableHead>
              <TableHead className="text-white/60">Nombre</TableHead>
              <TableHead className="text-white/60">Estado</TableHead>
              <TableHead className="text-white/60">Ciudad</TableHead>
              <TableHead className="text-white/60">Local</TableHead>
              <TableHead className="text-white/60">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={6} className="text-center py-12">
                  <FolderKanban className="h-12 w-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">No hay proyectos para este cliente</p>
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
              projects.map((project) => {
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
                    <TableCell className="text-white max-w-xs truncate">
                      {project.project_name}
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
                    <TableCell className="text-white/60 text-sm">
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