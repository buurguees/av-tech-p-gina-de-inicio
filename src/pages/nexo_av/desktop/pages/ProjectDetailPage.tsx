import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import TabNav, { TabItem } from "../components/navigation/TabNav";
import DetailActionButton, { DetailActionType } from "../components/navigation/DetailActionButton";
import { DetailInfoBlock, DetailInfoHeader, DetailInfoSummary, MetricCard } from "../components/detail";
import { DetailDashboard, DetailDashboardKPIs, DetailDashboardTasks } from "../components/dashboard";
import ProjectInvoicesList from "../components/projects/ProjectInvoicesList";
import ProjectQuotesList from "../components/projects/ProjectQuotesList";
import ProjectPurchasesList from "../components/projects/ProjectPurchasesList";
import ProjectPurchaseOrdersList from "../components/projects/ProjectPurchaseOrdersList";
import ProjectHistoryTab from "../components/projects/ProjectHistoryTab";
import ProjectSitesTab from "../components/projects/ProjectSitesTab";
import ProjectPlanningTab from "../components/projects/ProjectPlanningTab";
import ProjectTechniciansTab from "../components/projects/ProjectTechniciansTab";
import ProjectStatusSuggestion from "../components/projects/ProjectStatusSuggestion";
import EditProjectDialog from "../components/projects/EditProjectDialog";
import StatusSelector from "../components/common/StatusSelector";
import { PROJECT_STATUSES } from "@/constants/projectStatuses";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Receipt,
  ShoppingCart,
  ClipboardList,
  Hash,
  Mail,
  FileText as FileTextIcon,
  MapPin,
  Building,
  Calendar as CalendarIcon,
  Package,
  TrendingUp,
  CheckCircle,
  Clock,
  History,
} from "lucide-react";

interface ProjectDetail {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string | null;
  client_id: string | null;
  status: string;
  project_address: string | null;
  project_city: string | null;
  client_order_number: string | null;
  local_name: string | null;
  notes: string | null;
  installation_start_date?: string | null;
  delivery_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  site_mode?: string | null;
  default_site_id?: string | null;
  default_site_name?: string | null;
  default_site_address?: string | null;
  default_site_city?: string | null;
}

interface ClientDetail {
  id: string;
  client_number?: string | null;
  company_name: string;
  legal_name: string | null;
  tax_id: string | null;
  contact_email: string | null;
}

const ProjectDetailPageDesktop = () => {
  const { userId, projectId } = useParams<{ userId: string; projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("resumen");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [metrics, setMetrics] = useState({
    quotesTotal: 0,
    invoicesTotal: 0,
    purchasesTotal: 0,
    margin: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [suggestedStatus, setSuggestedStatus] = useState<{ suggested_status: string; reason: string } | null>(null);

  const tabs: TabItem[] = [
    { value: "resumen", label: "Resumen", icon: LayoutDashboard },
    { value: "sitios", label: "Sitios", icon: MapPin },
    { value: "planificacion", label: "Planificación", icon: Calendar },
    { value: "tecnicos", label: "Técnicos", icon: Users },
    { value: "presupuestos", label: "Presupuestos", icon: FileText },
    { value: "facturas", label: "Facturas", icon: Receipt },
    { value: "pedidos", label: "Pedidos", icon: ClipboardList },
    { value: "compras", label: "Compras", icon: ShoppingCart },
    { value: "historico", label: "Histórico", icon: History, align: "right" },
  ];

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
          const projectData = data[0];
          setProject(projectData);

          // Fetch client data if client_id exists
          if (projectData.client_id) {
            const { data: clientData, error: clientError } = await supabase.rpc('get_client', {
              p_client_id: projectData.client_id
            });

            if (!clientError && clientData && clientData.length > 0) {
              setClient(clientData[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!projectId) return;

      try {
        setLoadingMetrics(true);

        // Fetch Quotes
        const { data: quotesData } = await supabase.rpc('list_quotes', { p_search: null });
        const projectQuotes = (quotesData || []).filter((q: any) => q.project_id === projectId);
        const quotesTotal = projectQuotes.reduce((sum: number, q: any) => sum + (q.subtotal || 0), 0);

        // Fetch Invoices
        const { data: invoicesData } = await supabase.rpc('finance_list_invoices', { 
          p_search: null, 
          p_status: null 
        });
        const projectInvoices = (invoicesData || []).filter((inv: any) => inv.project_id === projectId);
        const invoicesTotal = projectInvoices.reduce((sum: number, inv: any) => sum + (inv.subtotal || 0), 0);

        // Fetch Purchase Invoices
        const purchaseParams: Record<string, unknown> = {
          p_search: null,
          p_status: null,
          p_supplier_id: null,
          p_technician_id: null,
          p_document_type: null,
          p_page: 1,
          p_page_size: 5000,
        };
        if (projectId != null) purchaseParams.p_project_id = projectId;
        const { data: purchasesData } = await supabase.rpc('list_purchase_invoices', purchaseParams);
        const projectPurchases = (purchasesData || []).filter((p: any) => p.project_id === projectId);
        const purchasesTotal = projectPurchases.reduce((sum: number, p: any) => sum + (p.tax_base || p.subtotal || 0), 0);

        // Calculate margin
        const margin = invoicesTotal - purchasesTotal;

        setMetrics({
          quotesTotal,
          invoicesTotal,
          purchasesTotal,
          margin,
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchMetrics();
  }, [projectId]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!projectId) return;

      try {
        setLoadingTasks(true);
        // Por ahora, tareas vacías - se implementará más adelante
        setTasks([]);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoadingTasks(false);
      }
    };

    if (activeTab === "resumen") {
      fetchTasks();
    }
  }, [projectId, activeTab]);

  // Construir el texto contextual con el nombre del proyecto
  const getContextInfo = () => {
    if (loading) return "Cargando...";
    if (!project) return "Proyecto no encontrado";
    
    return project.project_name || "Sin nombre";
  };

  // Formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Formatear porcentaje
  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  // Obtener el tipo de acción según el tab activo
  const getActionType = (): DetailActionType | null => {
    switch (activeTab) {
      case "resumen":
        return "edit";
      case "presupuestos":
        return "quote";
      case "facturas":
        return "invoice";
      case "tecnicos":
        return "technicians";
      case "pedidos":
        return "purchase-order";
      case "compras":
        return "purchase";
      default:
        return null;
    }
  };

  // Manejar la acción del botón
  const handleActionClick = () => {
    const actionType = getActionType();
    if (!actionType || !projectId || !userId || !project) return;

    // Obtener client_id del proyecto actual
    const currentClientId = project.client_id;
    if (!currentClientId) {
      console.warn("El proyecto no tiene cliente asignado");
      return;
    }

    switch (actionType) {
      case "edit":
        // TODO: Abrir diálogo para editar proyecto
        setEditDialogOpen(true);
        break;
      case "quote":
        // Navegar a crear presupuesto con clientId y projectId pre-seleccionados
        navigate(`/nexo-av/${userId}/quotes/new?clientId=${currentClientId}&projectId=${projectId}`);
        break;
      case "invoice":
        // Navegar a crear factura con clientId y projectId pre-seleccionados
        navigate(`/nexo-av/${userId}/invoices/new?clientId=${currentClientId}&projectId=${projectId}`);
        break;
      case "technicians":
        // TODO: Abrir diálogo para asignar técnicos
        console.log("Asignar técnicos al proyecto:", projectId);
        break;
      case "purchase-order":
        // Navegar a crear pedido de compra con projectId
        navigate(`/nexo-av/${userId}/purchase-orders/new?projectId=${projectId}`);
        break;
      case "purchase":
        // Navegar a crear factura de compra con projectId
        navigate(`/nexo-av/${userId}/purchase-invoices/new?projectId=${projectId}`);
        break;
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar
        pageTitle="Detalle de Proyecto"
        contextInfo={getContextInfo()}
        backPath={userId ? `/nexo-av/${userId}/projects` : undefined}
        tools={
          getActionType() ? (
            <DetailActionButton
              actionType={getActionType()!}
              onClick={handleActionClick}
            />
          ) : undefined
        }
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Columna izquierda - TabNav y contenido */}
        <div className="flex-1 flex flex-col min-w-0">
          <TabNav
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          
          <div className="flex-1 overflow-auto">
            {activeTab === "resumen" && (
              <DetailDashboard
                kpis={
                  <DetailDashboardKPIs
                    title="Métricas del Proyecto"
                    columns={4}
                    kpis={[
                      {
                        title: "Presupuesto",
                        value: loadingMetrics ? "..." : formatCurrency(metrics.quotesTotal),
                        icon: <FileText className="w-5 h-5" />,
                        subtitle: "Total presupuestado",
                      },
                      {
                        title: "Facturación",
                        value: loadingMetrics ? "..." : formatCurrency(metrics.invoicesTotal),
                        icon: <Receipt className="w-5 h-5" />,
                        subtitle: "Total facturado",
                      },
                      {
                        title: "Compras",
                        value: loadingMetrics ? "..." : formatCurrency(metrics.purchasesTotal),
                        icon: <ShoppingCart className="w-5 h-5" />,
                        subtitle: "Total compras",
                      },
                      {
                        title: "Margen",
                        value: loadingMetrics 
                          ? "..." 
                          : `${formatCurrency(metrics.margin)} (${formatPercentage(metrics.margin, metrics.invoicesTotal || 1)})`,
                        icon: <TrendingUp className="w-5 h-5" />,
                        subtitle: "Facturación - Compras",
                      },
                    ]}
                  />
                }
                tasks={
                  <DetailDashboardTasks
                    title="Tareas del Proyecto"
                    tasks={tasks}
                    loading={loadingTasks}
                    emptyMessage="No hay tareas asociadas a este proyecto"
                  />
                }
              />
            )}
            {activeTab === "sitios" && projectId && (
              <ProjectSitesTab projectId={projectId} siteMode={project?.site_mode} />
            )}
            {activeTab === "planificacion" && projectId && (
              <ProjectPlanningTab projectId={projectId} siteMode={project?.site_mode} />
            )}
            {activeTab === "tecnicos" && projectId && (
              <ProjectTechniciansTab projectId={projectId} />
            )}
            {activeTab === "presupuestos" && projectId && (
              <ProjectQuotesList projectId={projectId} />
            )}
            {activeTab === "facturas" && projectId && (
              <ProjectInvoicesList projectId={projectId} />
            )}
            {activeTab === "pedidos" && projectId && (
              <ProjectPurchaseOrdersList projectId={projectId} />
            )}
            {activeTab === "compras" && projectId && (
              <ProjectPurchasesList projectId={projectId} />
            )}
            {activeTab === "historico" && projectId && (
              <ProjectHistoryTab projectId={projectId} />
            )}
          </div>
        </div>

        {/* Columna derecha - DetailInfoBlock */}
        <div className="w-72 xl:w-80 2xl:w-[20rem] flex-shrink-0 border-l border-border h-full">
          <div className="h-full">
            <DetailInfoBlock
            header={
              <DetailInfoHeader
                title={loading ? "Cargando..." : client?.company_name || client?.legal_name || "Sin cliente"}
                subtitle={client?.legal_name && client?.company_name !== client?.legal_name ? client.legal_name : undefined}
              >
                <div className="flex flex-col gap-2 mt-2">
                  {client?.client_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Nº Cliente:</span>
                      <span className="font-medium">{client.client_number}</span>
                    </div>
                  )}
                  {client?.tax_id && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileTextIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">CIF:</span>
                      <span className="font-medium">{client.tax_id}</span>
                    </div>
                  )}
                  {client?.contact_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{client.contact_email}</span>
                    </div>
                  )}
                </div>
                
                {/* Estado del Proyecto */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex flex-col gap-2 items-center">
                    <span className="text-xs text-muted-foreground uppercase font-medium w-full text-center">Estado del Proyecto</span>
                    <div className="w-full flex justify-center">
                      <StatusSelector
                        currentStatus={project?.status || "PLANNED"}
                        statusOptions={[...PROJECT_STATUSES]}
                        onStatusChange={async (newStatus) => {
                          if (!project) return;
                          const previousStatus = project.status;
                          setProject({ ...project, status: newStatus });
                          try {
                            const { error, data } = await supabase.rpc("update_project", {
                              p_project_id: project.id,
                              p_status: newStatus,
                            });
                            if (error) throw error;
                            if (data === false) throw new Error("No se pudo actualizar el estado.");
                            toast({ title: "Estado actualizado", description: "El estado del proyecto se ha guardado correctamente." });
                          } catch (err: any) {
                            setProject({ ...project, status: previousStatus });
                            toast({ title: "Error", description: err.message || "Error al actualizar el estado", variant: "destructive" });
                          }
                        }}
                        size="md"
                      />
                    </div>
                  </div>
                  {/* Status Suggestion */}
                  {project && projectId && (
                    <ProjectStatusSuggestion
                      projectId={projectId}
                      currentStatus={project.status}
                      onApply={async (newStatus) => {
                        if (!project) return;
                        const previousStatus = project.status;
                        setProject({ ...project, status: newStatus });
                        try {
                          const { error, data } = await supabase.rpc("update_project", {
                            p_project_id: project.id,
                            p_status: newStatus,
                          });
                          if (error) throw error;
                          if (data === false) throw new Error("No se pudo actualizar.");
                          toast({ title: "Estado actualizado" });
                        } catch (err: any) {
                          setProject({ ...project, status: previousStatus });
                          toast({ title: "Error", description: err.message, variant: "destructive" });
                        }
                      }}
                    />
                  )}
                </div>
              </DetailInfoHeader>
            }
            summary={
              <DetailInfoSummary
                columns={2}
                items={[
                  {
                    label: "Dirección",
                    value: project?.project_address 
                      ? `${project.project_address}${project.project_city ? `, ${project.project_city}` : ""}`
                      : "Sin dirección",
                    icon: <MapPin className="w-4 h-4" />,
                  },
                  {
                    label: "Local",
                    value: project?.local_name || "Sin local",
                    icon: <Building className="w-4 h-4" />,
                  },
                  ...((project?.installation_start_date || project?.actual_start_date || project?.start_date)
                    ? [
                        {
                          label: "Inicio Instalación",
                          value: formatDate(project.installation_start_date || project.actual_start_date || project.start_date || null) || "-",
                          icon: <CalendarIcon className="w-4 h-4" />,
                        },
                      ]
                    : []),
                  ...((project?.delivery_date || project?.actual_end_date || project?.end_date)
                    ? [
                        {
                          label: "Fecha Entrega",
                          value: formatDate(project.delivery_date || project.actual_end_date || project.end_date || null) || "-",
                          icon: <Package className="w-4 h-4" />,
                        },
                      ]
                    : []),
                ]}
              >
                <div className="space-y-3">
                  {/* Dirección y Local en layout horizontal */}
                  <div className="flex items-start gap-4">
                    {/* Dirección */}
                    <div className="flex items-start gap-2 text-sm flex-1">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-xs uppercase block">Dirección</span>
                        <p className="font-medium truncate">
                          {project?.project_address 
                            ? `${project.project_address}${project.project_city ? `, ${project.project_city}` : ""}`
                            : "Sin dirección"}
                        </p>
                      </div>
                    </div>
                    {/* Local */}
                    <div className="flex items-start gap-2 text-sm flex-shrink-0">
                      <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="text-muted-foreground text-xs uppercase block">Local</span>
                        <p className="font-medium">{project?.local_name || "Sin local"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Sitio / Modo */}
                  {project?.default_site_name && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-xs uppercase block">
                          Sitio {project.site_mode === "MULTI_SITE" ? "(Multi-sitio)" : "(Principal)"}
                        </span>
                        <p className="font-medium truncate">
                          {project.default_site_name}
                          {project.default_site_city ? ` — ${project.default_site_city}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Fechas */}
                  {(project?.installation_start_date || project?.actual_start_date || project?.start_date) && (
                    <div className="flex items-start gap-2 text-sm">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="text-muted-foreground text-xs uppercase">Inicio Instalación:</span>
                        <p className="font-medium">
                          {formatDate(project.installation_start_date || project.actual_start_date || project.start_date || null)}
                        </p>
                      </div>
                    </div>
                  )}
                  {(project?.delivery_date || project?.actual_end_date || project?.end_date) && (
                    <div className="flex items-start gap-2 text-sm">
                      <Package className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="text-muted-foreground text-xs uppercase">Fecha Entrega:</span>
                        <p className="font-medium">
                          {formatDate(project.delivery_date || project.actual_end_date || project.end_date || null)}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase mb-1">Técnicos asignados</p>
                    <p className="text-sm text-muted-foreground">Se trabajará más adelante</p>
                  </div>
                </div>
              </DetailInfoSummary>
            }
            content={
              <div className="flex flex-col gap-3">
                <MetricCard
                  title="Presupuesto"
                  value={loadingMetrics ? "Cargando..." : formatCurrency(metrics.quotesTotal)}
                  icon={FileText}
                />
                <MetricCard
                  title="Facturación"
                  value={loadingMetrics ? "Cargando..." : formatCurrency(metrics.invoicesTotal)}
                  icon={Receipt}
                />
                <MetricCard
                  title="Compras"
                  value={loadingMetrics ? "Cargando..." : formatCurrency(metrics.purchasesTotal)}
                  icon={ShoppingCart}
                />
                <MetricCard
                  title="Margen"
                  value={
                    loadingMetrics
                      ? "Cargando..."
                      : `${formatCurrency(metrics.margin)} (${formatPercentage(metrics.margin, metrics.invoicesTotal || 1)})`
                  }
                  icon={TrendingUp}
                />
              </div>
            }
            />
          </div>
        </div>
      </div>

      {project && (
        <EditProjectDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          project={project}
          onSuccess={() => {
            // Refrescar el proyecto después de editarlo
            const fetchProject = async () => {
              if (!projectId) return;
              
              try {
                const { data, error } = await supabase.rpc('get_project', {
                  p_project_id: projectId
                });

                if (error) throw error;
                if (data && data.length > 0) {
                  const projectData = data[0];
                  setProject(projectData);

                  // Fetch client data if client_id exists
                  if (projectData.client_id) {
                    const { data: clientData, error: clientError } = await supabase.rpc('get_client', {
                      p_client_id: projectData.client_id
                    });

                    if (!clientError && clientData && clientData.length > 0) {
                      setClient(clientData[0]);
                    }
                  }
                }
              } catch (error) {
                console.error('Error fetching project:', error);
              }
            };

            fetchProject();
            toast({
              title: "Proyecto actualizado",
              description: "Los datos del proyecto se han actualizado correctamente",
            });
          }}
        />
      )}
    </div>
  );
};

export default ProjectDetailPageDesktop;
