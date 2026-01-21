import { useState, useEffect, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, FolderKanban, Loader2, MoreVertical, ChevronUp, ChevronDown, Info, Filter, Euro, TrendingUp, BarChart3, Target, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import CreateProjectDialog from "../components/projects/CreateProjectDialog";
import PaginationControls from "../components/common/PaginationControls";
import { cn } from "@/lib/utils";


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
}

const PROJECT_STATUSES = [
  { value: 'PLANNED', label: 'Planificado', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'IN_PROGRESS', label: 'En Progreso', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'PAUSED', label: 'Pausado', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'COMPLETED', label: 'Completado', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'CANCELLED', label: 'Cancelado', color: 'bg-red-100 text-red-700 border-red-300' },
];

const getStatusInfo = (status: string) => {
  return PROJECT_STATUSES.find(s => s.value === status) || PROJECT_STATUSES[0];
};

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
  // ... rest of imports/logic ...
  const { userId } = useParams();
  const navigate = useNavigate();

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
      const projectPurchaseInvoices = (purchaseInvoicesData || []).filter((inv: any) => 
        inv.project_id && (inv.status === 'APPROVED' || inv.status === 'PAID')
      );
      const totalCosts = projectPurchaseInvoices.reduce((sum: number, inv: any) => sum + (inv.tax_base || 0), 0);

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
              const margin = stats?.margin_percentage;
              // Only include projects with invoiced amount > 0
              if (margin !== null && margin !== undefined && !isNaN(margin) && stats?.total_invoiced > 0) {
                return { projectId, margin };
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
    <div className="w-full">
      <div className="w-full px-3 md:px-4 pb-4 md:pb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content - Ocupa todo el ancho disponible */}
          <div className="flex-1 min-w-0 w-full">
            <div>
              {/* KPIs Cards - Recuento por Estado - Optimizado */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
                <div className="bg-card/50 border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-blue-500/10 rounded text-blue-600">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Planificados</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold text-foreground">
                      {projectKPIs.byStatus['PLANNED'] || 0}
                    </span>
                  </div>
                </div>

                <div className="bg-card/50 border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-yellow-500/10 rounded text-yellow-600">
                      <FolderKanban className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">En Progreso</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold text-foreground">
                      {projectKPIs.byStatus['IN_PROGRESS'] || 0}
                    </span>
                  </div>
                </div>

                <div className="bg-card/50 border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-orange-500/10 rounded text-orange-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Pausados</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold text-foreground">
                      {projectKPIs.byStatus['PAUSED'] || 0}
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
                    <span className="text-lg font-bold text-foreground">
                      {projectKPIs.byStatus['COMPLETED'] || 0}
                    </span>
                  </div>
                </div>

                <div className="bg-card/50 border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-red-500/10 rounded text-red-600">
                      <XCircle className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Cancelados</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold text-foreground">
                      {projectKPIs.byStatus['CANCELLED'] || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* KPIs Cards - Métricas Financieras - Optimizado */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <div className="bg-card/50 border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-green-500/10 rounded text-green-600">
                      <Euro className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Facturación Total</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-foreground">
                      {formatCurrency(projectKPIs.totalRevenue)}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1 block">
                      proyectos facturados
                    </span>
                  </div>
                </div>

                <div className="bg-card/50 border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-orange-500/10 rounded text-orange-600">
                      <Euro className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Costes Total</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-foreground">
                      {formatCurrency(projectKPIs.totalCosts)}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1 block">
                      compras/gastos
                    </span>
                  </div>
                </div>

                <div className="bg-card/50 border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1 rounded ${projectKPIs.profitability >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                      <TrendingUp className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Rentabilidad</span>
                  </div>
                  <div>
                    <span className={`text-base font-bold ${projectKPIs.profitability >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                      {formatCurrency(projectKPIs.profitability)}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1 block">
                      margen: {projectKPIs.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="bg-card/50 border border-border rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-purple-500/10 rounded text-purple-600">
                      <BarChart3 className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">Facturación Media</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-foreground">
                      {formatCurrency(projectKPIs.avgProjectValue)}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1 block">
                      por proyecto
                    </span>
                  </div>
                </div>
              </div>

              {/* KPIs Cards - Presupuestos y Productividad - Optimizado */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">
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

              {/* Header - Estilo Holded */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Proyectos</h1>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="h-9 px-4 text-sm font-medium"
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Nuevo proyecto
                      <span className="ml-2 text-xs opacity-70">N</span>
                    </Button>
                  </div>
                </div>

                {/* Search Bar - Estilo Holded */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar proyectos..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pr-11 h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FolderKanban className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay proyectos</p>
                  <p className="text-muted-foreground/70 text-sm mt-1">
                    Crea tu primer proyecto para comenzar
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md w-full">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/30">
                          <TableHead
                            className="text-white/70 cursor-pointer hover:text-foreground select-none text-[10px] px-2 text-left"
                            onClick={() => handleSort("number")}
                          >
                            <div className="flex items-center gap-1">
                              Nº Proyecto
                              {sortColumn === "number" && (
                                sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-white/70 cursor-pointer hover:text-white select-none text-[10px] px-2"
                            onClick={() => handleSort("client")}
                          >
                            <div className="flex items-center gap-1">
                              Cliente
                              {sortColumn === "client" && (
                                sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-white/70 cursor-pointer hover:text-white select-none text-[10px] px-2"
                            onClick={() => handleSort("name")}
                          >
                            <div className="flex items-center gap-1">
                              Nombre del Proyecto
                              {sortColumn === "name" && (
                                sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead className="text-white/70 text-[10px] px-2 text-left">Pedido</TableHead>
                          <TableHead
                            className="text-white/70 cursor-pointer hover:text-foreground select-none text-[10px] px-2 text-center"
                            onClick={() => handleSort("status")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Estado
                              {sortColumn === "status" && (
                                sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-white/70 cursor-pointer hover:text-foreground select-none text-[10px] px-2 text-left"
                            onClick={() => handleSort("city")}
                          >
                            <div className="flex items-center gap-1">
                              Ciudad
                              {sortColumn === "city" && (
                                sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead className="text-white/70 text-[10px] px-2 text-left">Local</TableHead>
                          <TableHead className="text-white/70 text-[10px] px-2 text-left">Rentabilidad</TableHead>
                          <TableHead className="text-white/70 w-10 px-2"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedProjects.map((project) => {
                          const statusInfo = getStatusInfo(project.status);
                          return (
                            <TableRow
                              key={project.id}
                              className="border-white/10 cursor-pointer hover:bg-white/[0.06] transition-colors duration-200"
                              onClick={() => handleProjectClick(project.id)}
                            >
                              <TableCell className="font-mono text-white/70 text-[13px] font-semibold px-2">
                                {project.project_number}
                              </TableCell>
                              <TableCell className="text-white text-[10px] px-2">
                                {project.client_name || '-'}
                              </TableCell>
                              <TableCell className="text-white/80 text-[10px] px-2 max-w-xs truncate">
                                {project.project_name}
                              </TableCell>
                              <TableCell className="text-white/70 text-[10px] px-2">
                                {project.client_order_number || '-'}
                              </TableCell>
                              <TableCell className="text-center px-2">
                                <div className="flex justify-center">
                                  <Badge variant="outline" className={cn(statusInfo.color, "border text-[9px] px-1.5 py-0.5 w-20 justify-center")}>
                                    {statusInfo.label}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-white/70 text-[10px] px-2">
                                {project.project_city || '-'}
                              </TableCell>
                              <TableCell className="text-white/70 text-[10px] px-2">
                                {project.local_name || '-'}
                              </TableCell>
                              <TableCell className="px-2">
                                {loadingProfitability ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                ) : projectProfitability.has(project.id) ? (
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] px-1.5 py-0.5 border",
                                      projectProfitability.get(project.id)! >= 25 
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                        : projectProfitability.get(project.id)! >= 20
                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                        : "bg-red-500/10 text-red-400 border-red-500/30"
                                    )}
                                  >
                                    {projectProfitability.get(project.id)!.toFixed(1)}%
                                  </Badge>
                                ) : (
                                  <span className="text-white/40 text-[9px]">-</span>
                                )}
                              </TableCell>
                              <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10"
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                                    <DropdownMenuItem
                                      className="text-white hover:bg-white/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleProjectClick(project.id);
                                      }}
                                    >
                                      Ver detalle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-white hover:bg-white/10">
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-white hover:bg-white/10">
                                      Duplicar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
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
                  )}
                </>
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
