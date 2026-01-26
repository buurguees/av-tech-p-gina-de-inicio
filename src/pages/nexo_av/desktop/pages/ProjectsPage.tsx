import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Loader2, Euro, TrendingUp, BarChart3, Target, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import CreateProjectDialog from "../components/projects/CreateProjectDialog";
import PaginationControls from "../components/common/PaginationControls";
import { useDebounce } from "@/hooks/useDebounce";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import { cn } from "@/lib/utils";
import DataList, { DataListColumn } from "../components/common/DataList";
import SearchBar from "../components/common/SearchBar";
import { useToast } from "@/hooks/use-toast";
import { PROJECT_STATUSES, getProjectStatusInfo } from "@/constants/projectStatuses";


interface Project {
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
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  assigned_to_name: string | null;
  budget: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

import ProjectsListSidebar from "../components/projects/ProjectsListSidebar";

const ProjectsPageDesktop = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 500);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [projectKPIs, setProjectKPIs] = useState({
    byStatus: {} as Record<string, number>,
    totalRevenue: 0,
    totalCosts: 0,
    profitability: 0,
    profitMargin: 0,
    avgProjectsPerClient: 0,
    monthlyNewProjects: 0,
    monthlyCompletedProjects: 0,
    avgProjectValue: 0,
    avgQuoteValue: 0,
    totalQuotesValue: 0,
    avgProfitabilityMargin: 0
  });
  const [projectProfitability, setProjectProfitability] = useState<Map<string, number>>(new Map());
  const [loadingProfitability, setLoadingProfitability] = useState(false);
  const [projectTotals, setProjectTotals] = useState<Map<string, number>>(new Map());
  const [projectExpenses, setProjectExpenses] = useState<Map<string, number>>(new Map());

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('list_projects', {
        p_search: debouncedSearchTerm || null
      });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProjectKPIs = async () => {
    try {
      // Contar proyectos por estado
      const byStatus: Record<string, number> = {};
      PROJECT_STATUSES.forEach(status => {
        byStatus[status.value] = projects.filter(p => p.status === status.value).length;
      });

      // Obtener presupuestos (quotes) asignados a proyectos usando RPC
      const { data: quotesData, error: quotesError } = await supabase.rpc('list_quotes', { 
        p_search: null,
        p_status: null
      });

      if (quotesError) {
        console.error('Error fetching quotes:', quotesError);
      }

      // Calcular presupuestos totales y medios de proyectos (usando subtotales)
      const projectQuotes = (quotesData || []).filter((quote: any) => 
        quote.project_id && quote.status !== 'REJECTED' && quote.status !== 'EXPIRED'
      );
      const totalQuotesValue = projectQuotes.reduce((sum: number, quote: any) => sum + (quote.subtotal || 0), 0);
      const projectsWithQuotes = new Set(projectQuotes.map((q: any) => q.project_id));
      const avgQuoteValue = projectsWithQuotes.size > 0 
        ? totalQuotesValue / projectsWithQuotes.size 
        : 0;

      // Obtener facturas de venta relacionadas con proyectos usando RPC
      const { data: invoicesData, error: invoicesError } = await supabase.rpc('finance_list_invoices', {
        p_search: null,
        p_status: null
      });

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
      }

      // Calcular facturación total de proyectos (solo facturas con project_id asignado, usando subtotales)
      const projectInvoices = (invoicesData || []).filter((inv: any) => 
        inv.project_id && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT'
      );
      const totalRevenue = projectInvoices.reduce((sum: number, inv: any) => sum + (inv.subtotal || 0), 0);
      
      // Calcular total facturado por proyecto
      const totalsMap = new Map<string, number>();
      projectInvoices.forEach((inv: any) => {
        if (inv.project_id) {
          const currentTotal = totalsMap.get(inv.project_id) || 0;
          totalsMap.set(inv.project_id, currentTotal + (inv.total || 0));
        }
      });
      setProjectTotals(totalsMap);

      // Obtener facturas de compra relacionadas con proyectos usando RPC
      const { data: purchaseInvoicesData, error: purchaseInvoicesError } = await supabase.rpc('list_purchase_invoices', {
        p_search: null,
        p_status: null,
        p_document_type: null
      });

      if (purchaseInvoicesError) {
        console.error('Error fetching purchase invoices:', purchaseInvoicesError);
      }

      // Calcular costes totales de proyectos (solo facturas de compra con project_id asignado, usando tax_base/subtotal)
      // Incluir REGISTERED, APPROVED y PAID - excluir PENDING y CANCELLED
      const projectPurchaseInvoices = (purchaseInvoicesData || []).filter((inv: any) => 
        inv.project_id && (inv.status === 'REGISTERED' || inv.status === 'APPROVED' || inv.status === 'PAID')
      );
      const totalCosts = projectPurchaseInvoices.reduce((sum: number, inv: any) => sum + (inv.tax_base || 0), 0);
      
      // Calcular gastos por proyecto
      const expensesMap = new Map<string, number>();
      projectPurchaseInvoices.forEach((inv: any) => {
        if (inv.project_id) {
          const currentExpense = expensesMap.get(inv.project_id) || 0;
          expensesMap.set(inv.project_id, currentExpense + (inv.tax_base || inv.subtotal || 0));
        }
      });
      setProjectExpenses(expensesMap);

      // Calcular rentabilidad
      const profitability = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (profitability / totalRevenue) * 100 : 0;

      // Media de proyectos por cliente
      const projectsByClient = new Map<string, number>();
      projects.forEach(project => {
        if (project.client_id) {
          projectsByClient.set(project.client_id, (projectsByClient.get(project.client_id) || 0) + 1);
        }
      });
      const clientsWithProjects = projectsByClient.size;
      const avgProjectsPerClient = clientsWithProjects > 0 ? projects.length / clientsWithProjects : 0;

      // Proyectos del mes
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const monthlyNewProjects = projects.filter(p => {
        const createdDate = new Date(p.created_at);
        return createdDate >= firstDayOfMonth && createdDate <= lastDayOfMonth;
      }).length;

      const monthlyCompletedProjects = projects.filter(p => {
        return p.status === 'COMPLETED';
      }).length;

      // Valor medio de proyecto (facturación media por proyecto con facturas)
      const projectsWithInvoices = new Set(projectInvoices.map((inv: any) => inv.project_id));
      const avgProjectValue = projectsWithInvoices.size > 0 
        ? totalRevenue / projectsWithInvoices.size 
        : 0;

      // Calcular media de rentabilidad de los proyectos
      // Usamos los datos ya cargados en projectProfitability si están disponibles
      let avgProfitabilityMargin = 0;
      try {
        if (projectProfitability.size > 0) {
          const margins = Array.from(projectProfitability.values());
          if (margins.length > 0) {
            avgProfitabilityMargin = margins.reduce((sum, margin) => sum + margin, 0) / margins.length;
          }
        }
      } catch (err) {
        console.error('Error calculating average profitability margin:', err);
      }

      setProjectKPIs({
        byStatus,
        totalRevenue,
        totalCosts,
        profitability,
        profitMargin,
        avgProjectsPerClient,
        monthlyNewProjects,
        monthlyCompletedProjects,
        avgProjectValue,
        avgQuoteValue,
        totalQuotesValue,
        avgProfitabilityMargin
      });
    } catch (error) {
      console.error('Error calculating project KPIs:', error);
    }
  };

  const fetchProjectProfitability = async (projectIds: string[]) => {
    if (projectIds.length === 0) {
      setLoadingProfitability(false);
      return;
    }

    try {
      setLoadingProfitability(true);
      const profitabilityMap = new Map<string, number>();
      
      // Fetch profitability for all projects in parallel (batches of 5 to avoid overwhelming the server)
      const batchSize = 5;
      for (let i = 0; i < projectIds.length; i += batchSize) {
        const batch = projectIds.slice(i, i + batchSize);
        const promises = batch.map(async (projectId) => {
          try {
            const { data: financialData, error: financialError } = await supabase.rpc('get_project_financial_stats', {
              p_project_id: projectId
            });
            
            if (financialError) {
              // Silently skip errors for individual projects
              return { projectId, margin: null };
            }
            
            if (financialData && Array.isArray(financialData) && financialData.length > 0) {
              const stats = financialData[0];
              // Mostrar rentabilidad si hay facturación O gastos
              const hasActivity = (stats?.total_invoiced || 0) > 0 || (stats?.total_expenses || 0) > 0;
              if (hasActivity) {
                // Calcular margin_percentage: (margin / total_invoiced) * 100, o si no hay facturado, mostrar el margen absoluto
                let marginPercentage = stats?.margin_percentage || 0;
                // Si hay gastos pero no facturación, mostrar como -100% (todo son pérdidas)
                if ((stats?.total_invoiced || 0) === 0 && (stats?.total_expenses || 0) > 0) {
                  marginPercentage = -100;
                }
                return { projectId, margin: marginPercentage };
              }
            }
            return { projectId, margin: null };
          } catch (err) {
            // Silently skip errors for individual projects
            return { projectId, margin: null };
          }
        });
        
        const results = await Promise.all(promises);
        results.forEach(({ projectId, margin }) => {
          if (margin !== null && margin !== undefined) {
            profitabilityMap.set(projectId, margin);
          }
        });
        
        // Small delay between batches to avoid overwhelming the server
        if (i + batchSize < projectIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      setProjectProfitability(profitabilityMap);
    } catch (err) {
      console.error('Error fetching project profitability:', err);
    } finally {
      setLoadingProfitability(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [debouncedSearchTerm]);


  useEffect(() => {
    if (projects.length > 0) {
      calculateProjectKPIs();
    }
  }, [projects]);

  useEffect(() => {
    if (projects.length > 0) {
      // Fetch profitability for all projects separately to avoid blocking KPI calculation
      fetchProjectProfitability(projects.map(p => p.id));
    }
  }, [projects]);

  const handleProjectClick = (projectId: string) => {
    navigate(`/nexo-av/${userId}/projects/${projectId}`);
  };

  const handleProjectCreated = () => {
    setIsCreateDialogOpen(false);
    fetchProjects();
  };
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case "number":
        aValue = a.project_number || "";
        bValue = b.project_number || "";
        break;
      case "client":
        aValue = a.client_name || "";
        bValue = b.client_name || "";
        break;
      case "name":
        aValue = a.project_name || "";
        bValue = b.project_name || "";
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "city":
        aValue = a.project_city || "";
        bValue = b.project_city || "";
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination (50 records per page)
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedProjects,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(sortedProjects, { pageSize: 50 });

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-6">
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
          {/* Main Content - Ocupa todo el ancho disponible */}
          <div className="flex-1 min-w-0 w-full flex flex-col overflow-hidden">
            <div className="flex flex-col h-full overflow-hidden">
              {/* KPIs Cards - Recuento por Estado - Mejorado */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4 flex-shrink-0">
                <div className="bg-card border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-600">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Planificados</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">
                    {projectKPIs.byStatus['PLANNED'] || 0}
                  </span>
                </div>

                <div className="bg-card border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 bg-yellow-500/10 rounded-lg text-yellow-600">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">En Progreso</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">
                    {projectKPIs.byStatus['IN_PROGRESS'] || 0}
                  </span>
                </div>

                <div className="bg-card border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Pausados</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">
                    {projectKPIs.byStatus['PAUSED'] || 0}
                  </span>
                </div>

                <div className="bg-card border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 bg-green-500/10 rounded-lg text-green-600">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Completados</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">
                    {projectKPIs.byStatus['COMPLETED'] || 0}
                  </span>
                </div>

                <div className="bg-card border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 bg-red-500/10 rounded-lg text-red-600">
                      <XCircle className="h-4 w-4" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Cancelados</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">
                    {projectKPIs.byStatus['CANCELLED'] || 0}
                  </span>
                </div>
              </div>

              {/* KPIs Cards - Métricas Financieras - Mejorado */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 flex-shrink-0">
                <div className="bg-card border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 bg-green-500/10 rounded-lg text-green-600">
                      <Euro className="h-4 w-4" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Facturación Total</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-foreground">
                      {formatCurrency(projectKPIs.totalRevenue)}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      proyectos facturados
                    </span>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-600">
                      <Euro className="h-4 w-4" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Costes Total</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-foreground">
                      {formatCurrency(projectKPIs.totalCosts)}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      compras/gastos
                    </span>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`p-1.5 rounded-lg ${projectKPIs.profitability >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Rentabilidad</span>
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-lg font-bold ${projectKPIs.profitability >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                      {formatCurrency(projectKPIs.profitability)}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      margen: {projectKPIs.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-600">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Facturación Media</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-foreground">
                      {formatCurrency(projectKPIs.avgProjectValue)}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      por proyecto
                    </span>
                  </div>
                </div>
              </div>

              {/* KPIs Cards - Presupuestos y Productividad - Optimizado */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3 flex-shrink-0">
                <div className="bg-card/50 border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-indigo-500/10 rounded text-indigo-600">
                      <Target className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Presup. Medio</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-foreground">
                      {formatCurrency(projectKPIs.avgQuoteValue)}
                    </span>
                  </div>
                </div>

                <div className="bg-card/50 border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-cyan-500/10 rounded text-cyan-600">
                      <Euro className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Total Presup.</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-foreground">
                      {formatCurrency(projectKPIs.totalQuotesValue)}
                    </span>
                  </div>
                </div>

                <div className="bg-card/50 border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1 rounded ${projectKPIs.avgProfitabilityMargin >= 25 ? 'bg-emerald-500/10 text-emerald-600' : projectKPIs.avgProfitabilityMargin >= 20 ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'}`}>
                      <TrendingUp className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Media Rentabilidad</span>
                  </div>
                  <div>
                    <span className={`text-base font-bold ${projectKPIs.avgProfitabilityMargin >= 25 ? 'text-emerald-600' : projectKPIs.avgProfitabilityMargin >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                      {projectKPIs.avgProfitabilityMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="bg-card/50 border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-cyan-500/10 rounded text-cyan-600">
                      <Target className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Media/Cliente</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-foreground">
                      {projectKPIs.avgProjectsPerClient.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="bg-card/50 border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-blue-500/10 rounded text-blue-600">
                      <FolderKanban className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Nuevos (Mes)</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-foreground">
                      {projectKPIs.monthlyNewProjects}
                    </span>
                  </div>
                </div>

                <div className="bg-card/50 border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-green-500/10 rounded text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Completados</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-foreground">
                      {projectKPIs.byStatus['COMPLETED'] || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* DetailNavigationBar */}
              <div className="mb-6 flex-shrink-0">
                <DetailNavigationBar
                  pageTitle="Proyectos"
                  contextInfo={
                    <SearchBar
                      value={searchInput}
                      onChange={setSearchInput}
                      items={projects}
                      getSearchText={(project) => `${project.project_number} ${project.project_name || ''} ${project.client_name || ''} ${project.client_order_number || ''}`}
                      renderResult={(project) => ({
                        id: project.id,
                        label: project.project_number,
                        subtitle: `${project.client_name || 'Sin cliente'} - ${project.project_name || ''}`,
                        icon: <FolderKanban className="h-4 w-4" />,
                        data: project,
                      })}
                      onSelectResult={(result) => {
                        navigate(`/nexo-av/${userId}/projects/${result.data.id}`);
                      }}
                      placeholder="Buscar proyectos..."
                      maxResults={8}
                      debounceMs={300}
                    />
                  }
                  tools={
                    <DetailActionButton
                      actionType="new_project"
                      onClick={() => setIsCreateDialogOpen(true)}
                    />
                  }
                />
              </div>

              {/* DataList */}
              <div className="flex-1 min-h-0 overflow-hidden">
              <DataList
                data={paginatedProjects}
            columns={[
              {
                key: "project_number",
                label: "Nº",
                sortable: true,
                align: "left",
                priority: 1,
                render: (project) => (
                  <span className="text-foreground/80">
                    {project.project_number}
                  </span>
                ),
              },
              {
                key: "project_name",
                label: "Proyecto",
                sortable: true,
                align: "left",
                priority: 3,
                render: (project) => (
                  <span className="text-foreground truncate block">
                    {project.project_name}
                  </span>
                ),
              },
              {
                key: "client_name",
                label: "Cliente",
                sortable: true,
                align: "left",
                priority: 5,
                render: (project) => (
                  <span className="text-foreground/80">
                    {project.client_name || '-'}
                  </span>
                ),
              },
              {
                key: "client_order_number",
                label: "Nº Pedido",
                sortable: true,
                align: "left",
                priority: 7,
                render: (project) => (
                  <span className="text-muted-foreground">
                    {project.client_order_number || '-'}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Estado",
                sortable: true,
                align: "center",
                priority: 2,
                render: (project) => {
                  const statusInfo = getProjectStatusInfo(project.status);
                  return (
                    <div className="flex justify-center">
                      <Badge variant="outline" className={cn(statusInfo.className, "text-[11px] px-1.5 py-0.5 w-20 justify-center")}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  );
                },
              },
              {
                key: "project_city",
                label: "Ciudad",
                sortable: true,
                align: "left",
                priority: 8,
                render: (project) => (
                  <span className="text-muted-foreground">
                    {project.project_city || '-'}
                  </span>
                ),
              },
              {
                key: "local_name",
                label: "Local",
                align: "left",
                render: (project) => (
                  <span className="text-muted-foreground">
                    {project.local_name || '-'}
                  </span>
                ),
              },
              {
                key: "assigned_to_name",
                label: "Asignado",
                align: "left",
                priority: 6,
                render: (project) => (
                  <span className="text-muted-foreground">
                    {project.assigned_to_name || <span className="text-muted-foreground/50">Sin asignar</span>}
                  </span>
                ),
              },
              {
                key: "budget",
                label: "Presupuesto",
                sortable: true,
                align: "right",
                priority: 5,
                render: (project) => (
                  <span className="text-foreground">
                    {formatCurrency(project.budget || 0)}
                  </span>
                ),
              },
              {
                key: "expenses",
                label: "Gastos",
                sortable: true,
                align: "right",
                priority: 4,
                render: (project) => {
                  const expenses = projectExpenses.get(project.id) || 0;
                  return (
                    <span className="text-foreground">
                      {formatCurrency(expenses)}
                    </span>
                  );
                },
              },
              {
                key: "total",
                label: "Total",
                sortable: true,
                align: "right",
                priority: 4,
                render: (project) => {
                  const total = projectTotals.get(project.id) || 0;
                  return (
                    <span className="text-foreground">
                      {formatCurrency(total)}
                    </span>
                  );
                },
              },
              {
                key: "profitability",
                label: "Rentabilidad",
                align: "right",
                priority: 3,
                render: (project) => {
                  if (loadingProfitability) {
                    return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
                  }
                  if (projectProfitability.has(project.id)) {
                    const margin = projectProfitability.get(project.id)!;
                    const profitClass = margin >= 25 
                      ? "profit-high"
                      : margin >= 20
                      ? "profit-medium"
                      : "profit-low";
                    return (
                      <Badge 
                        variant="outline" 
                        className={cn(profitClass, "text-[11px] px-1.5 py-0.5")}
                      >
                        {margin.toFixed(1)}%
                      </Badge>
                    );
                  }
                  return <span className="text-muted-foreground">-</span>;
                },
              },
                ]}
                actions={[
                  {
                    label: "Ver detalle",
                    onClick: (project) => handleProjectClick(project.id),
                  },
                  {
                    label: "Editar",
                    onClick: () => {},
                  },
                  {
                    label: "Duplicar",
                    onClick: () => {},
                  },
                ]}
                onItemClick={(project) => handleProjectClick(project.id)}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                loading={loading}
                emptyMessage="No hay proyectos"
                emptyIcon={<FolderKanban className="h-16 w-16 text-muted-foreground" />}
                getItemId={(project) => project.id}
              />
              </div>

              {/* Paginación */}
              {!loading && projects.length > 0 && totalPages > 1 && (
                <div className="flex-shrink-0 mt-4">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalItems={totalItems}
                  canGoPrev={canGoPrev}
                  canGoNext={canGoNext}
                  onPrevPage={prevPage}
                  onNextPage={nextPage}
                  onGoToPage={goToPage}
                />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column - Oculto para maximizar el ancho de la tabla */}
          <div className="hidden">
            <ProjectsListSidebar />
          </div>
        </div>
      </div>

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
};

export default ProjectsPageDesktop;
