import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Loader2, Euro, TrendingUp, BarChart3, Target, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import CompactKpiCard from "../components/common/CompactKpiCard";
import { usePagination } from "@/hooks/usePagination";
import CreateProjectDialog from "../components/projects/CreateProjectDialog";
import PaginationControls from "../components/common/PaginationControls";
import { useDebounce } from "@/hooks/useDebounce";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import { cn } from "@/lib/utils";
import DataList from "../components/common/DataList";
import SearchBar from "../components/common/SearchBar";
import { PROJECT_STATUSES, getProjectStatusInfo, normalizeProjectStatus } from "@/constants/projectStatuses";


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

interface ProjectFinancialStats {
  total_budget: number;
  total_invoiced: number;
  total_expenses: number;
  margin: number;
  margin_percentage: number;
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

  const fetchProjectFinancialSnapshots = async (projectIds: string[]) => {
    const statsMap = new Map<string, ProjectFinancialStats>();
    const profitabilityMap = new Map<string, number>();

    if (projectIds.length === 0) {
      return { statsMap, profitabilityMap };
    }

    const batchSize = 5;

    for (let i = 0; i < projectIds.length; i += batchSize) {
      const batch = projectIds.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (projectId) => {
          try {
            const { data: financialData, error: financialError } = await supabase.rpc('get_project_financial_stats', {
              p_project_id: projectId
            });

            if (financialError || !financialData || !Array.isArray(financialData) || financialData.length === 0) {
              return { projectId, stats: null };
            }

            return { projectId, stats: financialData[0] as ProjectFinancialStats };
          } catch {
            return { projectId, stats: null };
          }
        })
      );

      results.forEach(({ projectId, stats }) => {
        if (!stats) return;

        statsMap.set(projectId, stats);

        const hasActivity = (stats.total_invoiced || 0) > 0 || (stats.total_expenses || 0) > 0;
        if (!hasActivity) return;

        let marginPercentage = stats.margin_percentage || 0;
        if ((stats.total_invoiced || 0) === 0 && (stats.total_expenses || 0) > 0) {
          marginPercentage = -100;
        }

        profitabilityMap.set(projectId, marginPercentage);
      });

      if (i + batchSize < projectIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return { statsMap, profitabilityMap };
  };

  const calculateProjectKPIs = async () => {
    try {
      if (projects.length === 0) {
        setProjectTotals(new Map());
        setProjectExpenses(new Map());
        setProjectProfitability(new Map());
        setProjectKPIs({
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
        return;
      }

      // Contar proyectos por estado
      const byStatus: Record<string, number> = {};
      PROJECT_STATUSES.forEach(status => {
        byStatus[status.value] = projects.filter((project) => normalizeProjectStatus(project.status) === status.value).length;
      });

      // Obtener presupuestos (quotes) asignados a proyectos usando RPC
      const { data: quotesData, error: quotesError } = await supabase.rpc('list_quotes', {
        p_search: null,
        p_status: null
      });

      if (quotesError) {
        console.error('Error fetching quotes:', quotesError);
      }

      // Presupuestos aprobados por proyecto: contrato mas fiable que mezclar enviados, borradores e historicos
      const approvedProjectQuotes = (quotesData || []).filter((quote: any) =>
        quote.project_id && quote.status === 'APPROVED'
      );
      const totalQuotesValue = approvedProjectQuotes.reduce((sum: number, quote: any) => sum + (quote.subtotal || 0), 0);
      const projectsWithQuotes = new Set(approvedProjectQuotes.map((quote: any) => quote.project_id));
      const avgQuoteValue = projectsWithQuotes.size > 0
        ? totalQuotesValue / projectsWithQuotes.size
        : 0;

      setLoadingProfitability(true);
      const { statsMap, profitabilityMap } = await fetchProjectFinancialSnapshots(projects.map((project) => project.id));

      const totalRevenue = Array.from(statsMap.values()).reduce((sum, stats) => sum + (stats.total_invoiced || 0), 0);
      const totalCosts = Array.from(statsMap.values()).reduce((sum, stats) => sum + (stats.total_expenses || 0), 0);
      const profitability = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (profitability / totalRevenue) * 100 : 0;

      const totalsMap = new Map<string, number>();
      statsMap.forEach((stats, projectId) => {
        totalsMap.set(projectId, stats.total_invoiced || 0);
      });
      setProjectTotals(totalsMap);

      const expensesMap = new Map<string, number>();
      statsMap.forEach((stats, projectId) => {
        expensesMap.set(projectId, stats.total_expenses || 0);
      });
      setProjectExpenses(expensesMap);
      setProjectProfitability(profitabilityMap);

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
        return normalizeProjectStatus(p.status) === 'COMPLETED';
      }).length;

      // Valor medio de proyecto (facturacion neta media por proyecto con ingresos)
      const projectsWithInvoices = Array.from(statsMap.values()).filter((stats) => (stats.total_invoiced || 0) > 0);
      const avgProjectValue = projectsWithInvoices.length > 0
        ? totalRevenue / projectsWithInvoices.length
        : 0;

      const margins = Array.from(profitabilityMap.values());
      const avgProfitabilityMargin = margins.length > 0
        ? margins.reduce((sum, margin) => sum + margin, 0) / margins.length
        : 0;

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
    } finally {
      setLoadingProfitability(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [debouncedSearchTerm]);


  useEffect(() => {
    void calculateProjectKPIs();
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
    <div className="flex flex-col h-full gap-3 overflow-hidden">
          {/* KPIs — fila única compacta */}
          <div className="grid grid-cols-6 gap-2 flex-shrink-0">
            <CompactKpiCard label="En curso" value={String(projectKPIs.byStatus['IN_PROGRESS'] || 0)} color="blue" delay={0} />
            <CompactKpiCard label="Finalizados" value={String((projectKPIs.byStatus['COMPLETED'] || 0) + (projectKPIs.byStatus['INVOICED'] || 0) + (projectKPIs.byStatus['CLOSED'] || 0))} color="emerald" delay={0.05} />
            <CompactKpiCard label="Negociación" value={String(projectKPIs.byStatus['NEGOTIATION'] || 0)} color="amber" delay={0.1} />
            <CompactKpiCard label="Ingresos netos" value={formatCurrency(projectKPIs.totalRevenue)} color="emerald" delay={0.15} />
            <CompactKpiCard label="Costes" value={formatCurrency(projectKPIs.totalCosts)} color="amber" delay={0.2} />
            <CompactKpiCard label="Margen" value={`${projectKPIs.profitMargin.toFixed(1)}%`} color={projectKPIs.profitMargin >= 25 ? 'emerald' : projectKPIs.profitMargin >= 15 ? 'amber' : 'destructive'} delay={0.25} />
          </div>

              {/* DetailNavigationBar */}
              <div className="flex-shrink-0">
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
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
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
                      label: "Fact. neta",
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
                      onClick: () => { },
                    },
                    {
                      label: "Duplicar",
                      onClick: () => { },
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
          {/* Sidebar Column - Oculto para maximizar el ancho de la tabla */}
          <div className="hidden">
            <ProjectsListSidebar />
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
