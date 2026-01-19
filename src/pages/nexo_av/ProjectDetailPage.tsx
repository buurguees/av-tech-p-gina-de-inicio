import { useState, useEffect, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Edit
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import ProjectDashboardTab from "./components/ProjectDashboardTab";
import ProjectPlanningTab from "./components/ProjectPlanningTab";
import ProjectQuotesTab from "./components/ProjectQuotesTab";
import ProjectTechniciansTab from "./components/ProjectTechniciansTab";
import ProjectExpensesTab from "./components/ProjectExpensesTab";
import ProjectInvoicesTab from "./components/ProjectInvoicesTab";
import CreateProjectDialog from "./components/CreateProjectDialog";
import { createMobilePage } from "./MobilePageWrapper";

// Lazy load mobile version
const ProjectDetailPageMobile = lazy(() => import("./mobile/ProjectDetailPageMobile"));

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

const ProjectDetailPageDesktop = () => {
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
      }
    } catch (error) {
      console.error('Error fetching project:', error);
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">Proyecto no encontrado</p>
        <Button
          variant="link"
          className="text-primary mt-2"
          onClick={() => navigate(`/nexo-av/${userId}/projects`)}
        >
          Volver a proyectos
        </Button>
      </div>
    );
  }

  const statusInfo = getStatusInfo(project.status);

  return (
    <div className="w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-secondary">
                    <FolderKanban className="h-8 w-8 text-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="font-mono text-muted-foreground">#{project.project_number}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={updatingStatus}>
                          <button 
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-colors hover:opacity-80 ${statusInfo.color} cursor-pointer`}
                          >
                            {updatingStatus ? "Actualizando..." : statusInfo.label}
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="start" 
                          className="min-w-[180px]"
                        >
                          {PROJECT_STATUSES.map((status) => (
                            <DropdownMenuItem
                              key={status.value}
                              onClick={() => handleStatusChange(status.value)}
                              className={`cursor-pointer ${status.value === project.status ? 'bg-accent' : ''}`}
                            >
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${status.color.split(' ')[0]}`} />
                              <span>{status.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">{project.project_name}</h2>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      {project.client_name && (
                        <span className="text-muted-foreground">
                          Cliente: <span className="text-foreground">{project.client_name}</span>
                        </span>
                      )}
                      {project.project_city && (
                        <span className="text-muted-foreground">
                          Ciudad: <span className="text-foreground">{project.project_city}</span>
                        </span>
                      )}
                      {project.local_name && (
                        <span className="text-muted-foreground">
                          Local: <span className="text-foreground">{project.local_name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {activeTab === "dashboard" && (
                  <Button 
                    variant="outline"
                    onClick={() => setEditDialogOpen(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Proyecto
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs Navigation - Desktop only */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-secondary border border-border p-1 h-auto flex-wrap">
              <TabsTrigger 
                value="dashboard" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="planning"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Planificación
              </TabsTrigger>
              <TabsTrigger 
                value="quotes"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileText className="h-4 w-4 mr-2" />
                Presupuestos
              </TabsTrigger>
              <TabsTrigger 
                value="technicians"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Users className="h-4 w-4 mr-2" />
                Técnicos
              </TabsTrigger>
              <TabsTrigger 
                value="expenses"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Gastos
              </TabsTrigger>
              <TabsTrigger 
                value="invoices"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Facturas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <ProjectDashboardTab project={project} />
            </TabsContent>

            <TabsContent value="planning" className="mt-6">
              <ProjectPlanningTab projectId={project.id} />
            </TabsContent>

            <TabsContent value="quotes" className="mt-6">
              <ProjectQuotesTab projectId={project.id} clientId={project.client_id || undefined} />
            </TabsContent>

            <TabsContent value="technicians" className="mt-6">
              <ProjectTechniciansTab projectId={project.id} />
            </TabsContent>

            <TabsContent value="expenses" className="mt-6">
              <ProjectExpensesTab projectId={project.id} />
            </TabsContent>

            <TabsContent value="invoices" className="mt-6">
              <ProjectInvoicesTab projectId={project.id} clientId={project.client_id || undefined} />
            </TabsContent>
            </Tabs>
          </motion.div>

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
      </div>
    </div>
  );
};

// Export version with mobile routing
const ProjectDetailPage = createMobilePage({
  DesktopComponent: ProjectDetailPageDesktop,
  MobileComponent: ProjectDetailPageMobile,
});

export default ProjectDetailPage;
