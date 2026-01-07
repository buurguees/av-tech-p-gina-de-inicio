import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, FileText, Calendar, Hash, User } from "lucide-react";

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

interface ProjectDashboardTabProps {
  project: ProjectDetail;
}

const ProjectDashboardTab = ({ project }: ProjectDashboardTabProps) => {
  return (
    <div className="space-y-6">
      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Cliente */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-white/60 mb-2">
              <Building2 className="h-4 w-4" />
              <span className="text-sm">Cliente</span>
            </div>
            <p className="text-white font-medium">{project.client_name || '-'}</p>
          </CardContent>
        </Card>

        {/* Ubicación */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
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
            {project.project_city && project.local_name && (
              <p className="text-white/60 text-sm mt-1">{project.project_city}</p>
            )}
          </CardContent>
        </Card>

        {/* Nº Pedido */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-white/60 mb-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Nº Pedido Cliente</span>
            </div>
            <p className="text-white font-medium">{project.client_order_number || '-'}</p>
          </CardContent>
        </Card>

        {/* Fecha creación */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
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
          </CardContent>
        </Card>

        {/* Creado por */}
        {project.created_by_name && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-white/60 mb-2">
                <User className="h-4 w-4" />
                <span className="text-sm">Creado por</span>
              </div>
              <p className="text-white font-medium">{project.created_by_name}</p>
            </CardContent>
          </Card>
        )}

        {/* Número de proyecto */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-white/60 mb-2">
              <Hash className="h-4 w-4" />
              <span className="text-sm">Número de Proyecto</span>
            </div>
            <p className="text-white font-medium font-mono">{project.project_number}</p>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {project.notes && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60">{project.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProjectDashboardTab;