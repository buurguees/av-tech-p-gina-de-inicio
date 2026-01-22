import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import ProjectHeader from "../components/projects/ProjectHeader";
import ProjectKPIs from "../components/projects/ProjectKPIs";
import ProjectTabNavigation from "../components/projects/ProjectTabNavigation";
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
    <div className="w-full h-full px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6 overflow-y-auto">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <ProjectHeader
          project={project}
          updatingStatus={updatingStatus}
          onStatusChange={handleStatusChange}
          onEditClick={() => setEditDialogOpen(true)}
        />

        {/* KPIs */}
        <ProjectKPIs
          totalBudget={projectKPIs.totalBudget}
          totalInvoiced={projectKPIs.totalInvoiced}
          totalExpenses={projectKPIs.totalExpenses}
          profitability={projectKPIs.profitability}
          profitabilityPercentage={projectKPIs.profitabilityPercentage}
          quotesCount={projectKPIs.quotesCount}
          invoicesCount={projectKPIs.invoicesCount}
          expensesCount={projectKPIs.expensesCount}
          loading={kpisLoading}
        />

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
          <ProjectTabNavigation />

          <div className="flex-1 overflow-auto">
            <TabsContent value="dashboard" className="mt-0 h-full">
              <ProjectDashboardTab project={project} />
            </TabsContent>

            <TabsContent value="planning" className="mt-0 h-full">
              <ProjectPlanningTab projectId={project.id} />
            </TabsContent>

            <TabsContent value="quotes" className="mt-0 h-full">
              <ProjectQuotesTab projectId={project.id} clientId={project.client_id || undefined} />
            </TabsContent>

            <TabsContent value="technicians" className="mt-0 h-full">
              <ProjectTechniciansTab projectId={project.id} />
            </TabsContent>

            <TabsContent value="expenses" className="mt-0 h-full">
              <ProjectExpensesTab projectId={project.id} />
            </TabsContent>

            <TabsContent value="invoices" className="mt-0 h-full">
              <ProjectInvoicesTab projectId={project.id} clientId={project.client_id || undefined} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

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
  );
};

export default ProjectDetailPageDesktop;
