import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building2,
  FileText,
  MoreVertical,
  Edit2,
  Eye,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ProjectDashboardTab from "../components/projects/ProjectDashboardTab";
import ProjectPlanningTab from "../components/projects/ProjectPlanningTab";
import ProjectQuotesTab from "../components/projects/ProjectQuotesTab";
import ProjectTechniciansTab from "../components/projects/ProjectTechniciansTab";
import ProjectExpensesTab from "../components/projects/ProjectExpensesTab";
import ProjectInvoicesTab from "../components/projects/ProjectInvoicesTab";
import CreateProjectDialog from "../components/projects/CreateProjectDialog";
import "../styles/components/tabs.css";


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


const ProjectDetailPageDesktop = () => {
  const { userId, projectId } = useParams();
  const { toast: toastHook } = useToast();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [projectKPIs, setProjectKPIs] = useState({
    totalBudget: 0,
    totalInvoiced: 0,
    totalExpenses: 0,
    profitability: 0,
    profitabilityPercentage: 0,
    quotesCount: 0,
    invoicesCount: 0,
    expensesCount: 0,
  });
  const [kpisLoading, setKpisLoading] = useState(true);

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

  const fetchProjectKPIs = async () => {
    if (!projectId) return;

    try {
      setKpisLoading(true);

      // Fetch Quotes
      const { data: quotesData } = await supabase.rpc('list_quotes', { p_search: null });
      const projectQuotes = (quotesData || []).filter((q: any) => q.project_id === projectId);
      const totalBudget = projectQuotes.reduce((sum: number, q: any) => sum + (q.subtotal || 0), 0);

      // Fetch Invoices
      const { data: invoicesData } = await supabase.rpc('finance_list_invoices', { 
        p_search: null, 
        p_status: null 
      });
      const projectInvoices = (invoicesData || []).filter((inv: any) => 
        inv.project_id === projectId && inv.status !== 'CANCELLED'
      );
      const totalInvoiced = projectInvoices.reduce((sum: number, inv: any) => sum + (inv.subtotal || 0), 0);

      // Fetch Expenses (Purchase Invoices)
      const { data: expensesData } = await supabase.rpc('list_purchase_invoices', {
        p_search: null,
        p_status: null,
        p_document_type: null
      });
      const projectExpenses = (expensesData || []).filter((exp: any) => 
        exp.project_id === projectId && exp.status !== 'CANCELLED'
      );
      const totalExpenses = projectExpenses.reduce((sum: number, exp: any) => sum + (exp.tax_base || 0), 0);

      // Calculate profitability
      const profitability = totalInvoiced - totalExpenses;
      const profitabilityPercentage = totalInvoiced > 0 ? (profitability / totalInvoiced) * 100 : 0;

      setProjectKPIs({
        totalBudget,
        totalInvoiced,
        totalExpenses,
        profitability,
        profitabilityPercentage,
        quotesCount: projectQuotes.length,
        invoicesCount: projectInvoices.length,
        expensesCount: projectExpenses.length,
      });
    } catch (error) {
      console.error('Error fetching project KPIs:', error);
    } finally {
      setKpisLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    if (project) {
      fetchProjectKPIs();
    }
  }, [project]);

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
      
      const PROJECT_STATUSES = [
        { value: 'PLANNED', label: 'Planificado' },
        { value: 'IN_PROGRESS', label: 'En Progreso' },
        { value: 'PAUSED', label: 'Pausado' },
        { value: 'COMPLETED', label: 'Completado' },
        { value: 'CANCELLED', label: 'Cancelado' },
      ];
      
      const statusLabel = PROJECT_STATUSES.find(s => s.value === newStatus)?.label || newStatus;
      toastHook({
        title: "Estado actualizado",
        description: `El proyecto ahora está en "${statusLabel}"`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toastHook({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
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
          onClick={() => window.history.back()}
        >
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <div className="border-b border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => navigate(`/nexo-av/${userId}/projects`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-bold text-foreground">{project?.project_name}</h1>
                <p className="text-xs text-muted-foreground font-mono">#{project?.project_number}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit2 className="h-4 w-4" />
                Editar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver en mapa
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Zap className="h-4 w-4 mr-2" />
                    Generar factura
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600 dark:text-red-400">
                    Archivar proyecto
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-4 h-full gap-0">
            {/* Sidebar - Left Column */}
            <div className="lg:col-span-1 border-r border-slate-200/80 dark:border-slate-700/80 bg-white/50 dark:bg-slate-950/30 backdrop-blur-sm overflow-y-auto">
              <div className="p-4 sm:p-6 space-y-6">
                {/* Project Status & Info */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</p>
                    <div className="flex items-center gap-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 p-2">
                      <Badge
                        className={cn(
                          "px-3 py-1 text-sm font-semibold",
                          project?.status === "COMPLETED"
                            ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30 dark:border-green-600/50"
                            : project?.status === "IN_PROGRESS"
                            ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 dark:border-blue-600/50"
                            : project?.status === "PLANNED"
                            ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30 dark:border-purple-600/50"
                            : "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30 dark:border-slate-600/50"
                        )}
                      >
                        {project?.status === "COMPLETED"
                          ? "Completado"
                          : project?.status === "IN_PROGRESS"
                          ? "En Progreso"
                          : project?.status === "PLANNED"
                          ? "Planificado"
                          : project?.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={updatingStatus}>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingStatus}
                            className="h-8 text-xs"
                          >
                            Cambiar
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => handleStatusChange("PLANNED")}>
                            Planificado
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange("IN_PROGRESS")}>
                            En Progreso
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange("COMPLETED")}>
                            Completado
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {project?.client_name && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</p>
                      <p className="text-sm font-medium text-foreground">{project.client_name}</p>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumen</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-xs text-muted-foreground">Presupuestos</span>
                      <span className="font-semibold text-foreground">{projectKPIs.quotesCount}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-xs text-muted-foreground">Facturas</span>
                      <span className="font-semibold text-foreground">{projectKPIs.invoicesCount}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-xs text-muted-foreground">Gastos</span>
                      <span className="font-semibold text-foreground">{projectKPIs.expensesCount}</span>
                    </div>
                  </div>
                </div>

                {/* Location & Details */}
                <div className="space-y-3 p-3 rounded-lg bg-slate-100/40 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detalles</p>
                  <div className="space-y-2 text-sm">
                    {project?.project_city && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <span className="text-foreground">{project.project_city}</span>
                      </div>
                    )}
                    {project?.project_address && (
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <span className="text-foreground text-xs">{project.project_address}</span>
                      </div>
                    )}
                    {project?.created_at && (
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <span className="text-foreground text-xs">
                          {new Date(project.created_at).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* KPIs Cards */}
                <div className="space-y-2 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30 p-3 rounded-lg border border-blue-200/60 dark:border-blue-800/60">
                    <p className="text-xs text-muted-foreground mb-1">Presupuesto Total</p>
                    <p className="text-lg font-bold text-foreground">
                      €{projectKPIs.totalBudget?.toLocaleString("es-ES", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/30 p-3 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                    <p className="text-xs text-muted-foreground mb-1">Facturado</p>
                    <p className="text-lg font-bold text-foreground">
                      €{projectKPIs.totalInvoiced?.toLocaleString("es-ES", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/30 p-3 rounded-lg border border-orange-200/60 dark:border-orange-800/60">
                    <p className="text-xs text-muted-foreground mb-1">Margen</p>
                    <p className="text-lg font-bold text-foreground">
                      {projectKPIs.profitabilityPercentage?.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content - Tabs */}
            <div className="lg:col-span-3 flex flex-col overflow-hidden">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full h-full flex flex-col"
              >
                {/* Tabs List */}
                <div className="border-b border-slate-200/80 dark:border-slate-700/80 bg-white/50 dark:bg-slate-950/30 backdrop-blur-sm px-4 sm:px-6 lg:px-8">
                  <TabsList className="h-auto bg-transparent border-0 p-0 gap-0">
                    <TabsTrigger
                      value="dashboard"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3 font-medium text-sm text-muted-foreground hover:text-foreground data-[state=active]:text-foreground transition-colors"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Dashboard
                    </TabsTrigger>
                    <TabsTrigger
                      value="planning"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3 font-medium text-sm text-muted-foreground hover:text-foreground data-[state=active]:text-foreground transition-colors"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Planificación
                    </TabsTrigger>
                    <TabsTrigger
                      value="quotes"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3 font-medium text-sm text-muted-foreground hover:text-foreground data-[state=active]:text-foreground transition-colors"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Presupuestos
                    </TabsTrigger>
                    <TabsTrigger
                      value="technicians"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3 font-medium text-sm text-muted-foreground hover:text-foreground data-[state=active]:text-foreground transition-colors"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Técnicos
                    </TabsTrigger>
                    <TabsTrigger
                      value="expenses"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3 font-medium text-sm text-muted-foreground hover:text-foreground data-[state=active]:text-foreground transition-colors"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Gastos
                    </TabsTrigger>
                    <TabsTrigger
                      value="invoices"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3 font-medium text-sm text-muted-foreground hover:text-foreground data-[state=active]:text-foreground transition-colors"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Facturas
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tabs Content */}
                <div className="flex-1 overflow-auto">
                  <div className="px-4 sm:px-6 lg:px-8 py-6">
                    <TabsContent value="dashboard" className="mt-0 data-[state=inactive]:hidden">
                      <ProjectDashboardTab project={project} />
                    </TabsContent>

                    <TabsContent value="planning" className="mt-0 data-[state=inactive]:hidden">
                      <ProjectPlanningTab projectId={project?.id} />
                    </TabsContent>

                    <TabsContent value="quotes" className="mt-0 data-[state=inactive]:hidden">
                      <ProjectQuotesTab projectId={project?.id} clientId={project?.client_id || undefined} />
                    </TabsContent>

                    <TabsContent value="technicians" className="mt-0 data-[state=inactive]:hidden">
                      <ProjectTechniciansTab projectId={project?.id} />
                    </TabsContent>

                    <TabsContent value="expenses" className="mt-0 data-[state=inactive]:hidden">
                      <ProjectExpensesTab projectId={project?.id} />
                    </TabsContent>

                    <TabsContent value="invoices" className="mt-0 data-[state=inactive]:hidden">
                      <ProjectInvoicesTab projectId={project?.id} clientId={project?.client_id || undefined} />
                    </TabsContent>
                  </div>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Project Dialog */}
      <CreateProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          setEditDialogOpen(false);
          fetchProject();
        }}
        project={project}
      />
    </div>
  );
};

export default ProjectDetailPageDesktop;
