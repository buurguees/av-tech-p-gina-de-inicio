/**
 * ProjectDetailPageMobile
 * 
 * Versión optimizada para móviles de la página de detalle de proyecto.
 * Diseñada para técnicos en campo con información esencial y rápida.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  FolderKanban, 
  LayoutDashboard, 
  FileText, 
  Receipt,
  Wallet,
  Users,
  CalendarDays,
  ChevronDown,
  Building2,
  MapPin,
  ExternalLink,
  Edit
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import DetailTabsMobile from "../components/mobile/DetailTabsMobile";
import ProjectDashboardTab from "../components/ProjectDashboardTab";
import ProjectPlanningTab from "../components/ProjectPlanningTab";
import ProjectQuotesTab from "../components/ProjectQuotesTab";
import ProjectTechniciansTab from "../components/ProjectTechniciansTab";
import ProjectExpensesTab from "../components/ProjectExpensesTab";
import ProjectInvoicesTab from "../components/ProjectInvoicesTab";
import CreateProjectDialog from "../components/CreateProjectDialog";
import MobileBottomNav from "../components/MobileBottomNav";
import { NexoLogo } from "../components/NexoHeader";

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

const ProjectDetailPageMobile = () => {
  const { userId, projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
      } else {
        toast.error("Proyecto no encontrado");
        navigate(`/nexo-av/${userId}/projects`);
      }
    } catch (error: any) {
      console.error('Error fetching project:', error);
      toast.error(error?.message || "Error al cargar el proyecto");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!project) return;
    
    setUpdatingStatus(true);
    try {
      const { error } = await supabase.rpc('update_project', {
        p_project_id: project.id,
        p_status: newStatus,
      });

      if (error) throw error;

      setProject({ ...project, status: newStatus });
      
      const statusLabel = PROJECT_STATUSES.find(s => s.value === newStatus)?.label || newStatus;
      toast.success(`Estado actualizado a "${statusLabel}"`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error("Error al actualizar el estado");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <NexoLogo />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <FolderKanban className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Proyecto no encontrado</h2>
          <Button
            onClick={() => navigate(`/nexo-av/${userId}/projects`)}
            className="bg-white text-black hover:bg-white/90 mt-4"
          >
            Volver a Proyectos
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(project.status);

  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <main className="px-3 py-3 space-y-3">
        {/* Header - Título del Proyecto */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-foreground truncate">{project.project_name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-muted-foreground text-xs">#{project.project_number}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={updatingStatus}>
                      <button 
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${statusInfo.color}`}
                      >
                        {updatingStatus ? "Actualizando..." : statusInfo.label}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="start" 
                      className="bg-zinc-900 border-white/10"
                    >
                      {PROJECT_STATUSES.map((status) => (
                        <DropdownMenuItem
                          key={status.value}
                          onClick={() => handleStatusChange(status.value)}
                          className={`cursor-pointer ${status.value === project.status ? 'bg-white/10' : ''}`}
                        >
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${status.color.split(' ')[0]}`} />
                          <span className="text-white">{status.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {project.client_name && `Cliente: ${project.client_name}`}
                  {project.project_city && ` • ${project.project_city}`}
                  {project.local_name && ` • ${project.local_name}`}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditDialogOpen(true)}
                className="h-8 px-2 text-white/80 hover:text-white hover:bg-white/10 shrink-0 ml-2"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Header Card - Información clave */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-4 pb-4 space-y-3">

              {/* Cliente */}
              {project.client_name && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Building2 className="h-4 w-4 text-white/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/60 text-xs mb-0.5">Cliente</p>
                      <p className="text-white font-medium truncate">{project.client_name}</p>
                    </div>
                  </div>
                  {project.client_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/nexo-av/${userId}/clients/${project.client_id}`)}
                      className="shrink-0 h-8 px-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}

              {/* Ubicación */}
              {(project.project_address || project.project_city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-white/60 text-xs mb-0.5">Ubicación</p>
                    {project.local_name && (
                      <p className="text-white text-sm font-medium">{project.local_name}</p>
                    )}
                    {project.project_address && (
                      <p className="text-white/80 text-xs">{project.project_address}</p>
                    )}
                    {project.project_city && (
                      <p className="text-white/60 text-xs">{project.project_city}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Número de pedido del cliente */}
              {project.client_order_number && (
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <FileText className="h-4 w-4 text-white/40 shrink-0" />
                  <div>
                    <p className="text-white/60 text-xs mb-0.5">Nº Pedido Cliente</p>
                    <p className="text-white text-sm font-medium">{project.client_order_number}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs - Información detallada */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <DetailTabsMobile
            value={activeTab}
            onValueChange={setActiveTab}
            tabs={[
              { value: "dashboard", label: "Info", icon: LayoutDashboard },
              { value: "planning", label: "Planning", icon: CalendarDays },
              { value: "quotes", label: "Presup.", icon: FileText },
              { value: "technicians", label: "Técnicos", icon: Users },
              { value: "expenses", label: "Gastos", icon: Wallet },
              { value: "invoices", label: "Facturas", icon: Receipt },
            ]}
          >
            <TabsContent value="dashboard" className="mt-3">
              <ProjectDashboardTab project={project} />
            </TabsContent>

            <TabsContent value="planning" className="mt-3">
              <ProjectPlanningTab projectId={project.id} />
            </TabsContent>

            <TabsContent value="quotes" className="mt-3">
              <ProjectQuotesTab projectId={project.id} clientId={project.client_id || undefined} />
            </TabsContent>

            <TabsContent value="technicians" className="mt-3">
              <ProjectTechniciansTab projectId={project.id} />
            </TabsContent>

            <TabsContent value="expenses" className="mt-3">
              <ProjectExpensesTab projectId={project.id} />
            </TabsContent>

            <TabsContent value="invoices" className="mt-3">
              <ProjectInvoicesTab projectId={project.id} clientId={project.client_id || undefined} />
            </TabsContent>
          </DetailTabsMobile>
        </motion.div>
      </main>

      {/* Edit Project Dialog */}
      <CreateProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          setEditDialogOpen(false);
          fetchProject(); // Reload project data
        }}
        project={project}
      />

      <MobileBottomNav userId={userId || ''} />
    </div>
  );
};

export default ProjectDetailPageMobile;
