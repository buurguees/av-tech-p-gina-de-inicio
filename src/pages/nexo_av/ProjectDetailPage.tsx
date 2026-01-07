import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Building2, MapPin, FileText, Calendar } from "lucide-react";
import { motion } from "motion/react";
import NexoHeader from "./components/NexoHeader";

interface ProjectDetail {
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
  quote_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
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

const ProjectDetailPage = () => {
  const { userId, projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_project', {
          p_project_id: projectId
        });

        if (error) throw error;
        if (data && data.length > 0) {
          setProject(data[0]);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-black">
        <NexoHeader userId={userId || ""} title="Proyecto" />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-white/60">Proyecto no encontrado</p>
            <Button
              variant="link"
              className="text-white mt-2"
              onClick={() => navigate(`/nexo-av/${userId}/projects`)}
            >
              Volver a proyectos
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const statusInfo = getStatusInfo(project.status);

  return (
    <div className="min-h-screen bg-black">
      <NexoHeader userId={userId || ""} title="Proyecto" />
      
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Back button */}
          <Button
            variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => navigate(`/nexo-av/${userId}/projects`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a proyectos
          </Button>

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-white/60">#{project.project_number}</span>
                <Badge variant="outline" className={`${statusInfo.color} border`}>
                  {statusInfo.label}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-white">{project.project_name}</h1>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Cliente */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-white/60 mb-2">
                <Building2 className="h-4 w-4" />
                <span className="text-sm">Cliente</span>
              </div>
              <p className="text-white font-medium">{project.client_name || '-'}</p>
            </div>

            {/* Ubicación */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-white/60 mb-2">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">Ubicación</span>
              </div>
              <p className="text-white font-medium">
                {project.local_name || project.project_city || '-'}
              </p>
              {project.project_address && (
                <p className="text-white/60 text-sm mt-1">{project.project_address}</p>
              )}
            </div>

            {/* Nº Pedido */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-white/60 mb-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm">Nº Pedido Cliente</span>
              </div>
              <p className="text-white font-medium">{project.client_order_number || '-'}</p>
            </div>

            {/* Fecha creación */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-white/60 mb-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Fecha de creación</span>
              </div>
              <p className="text-white font-medium">
                {new Date(project.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Notes */}
          {project.notes && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-white font-medium mb-2">Notas</h3>
              <p className="text-white/60">{project.notes}</p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default ProjectDetailPage;
