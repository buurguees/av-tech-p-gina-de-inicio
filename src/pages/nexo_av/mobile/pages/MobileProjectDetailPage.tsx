/**
 * MobileProjectDetailPage - Página de detalle de proyecto para móvil
 * VERSIÓN: 2.0 - Sin Histórico, botones pill, acción contextual
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  ChevronLeft,
  MapPin,
  Building,
  Calendar,
  Package,
  FileText,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Mail,
  Hash,
  Phone,
  AlertCircle,
  Edit,
  LayoutDashboard,
  Users,
  Plus,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjectStatusInfo } from "@/constants/projectStatuses";
import { getQuoteStatusInfo } from "@/constants/quoteStatuses";
import EditProjectSheet from "../components/projects/EditProjectSheet";
import MobilePlanningTab from "../components/projects/MobilePlanningTab";
import MobileSitesTab from "../components/projects/MobileSitesTab";
import { getSalesDocumentStatusInfo, calculateCollectionStatus, getCollectionStatusInfo } from "@/constants/salesInvoiceStatuses";
import { getDocumentStatusInfo, calculatePaymentStatus, getPaymentStatusInfo } from "@/constants/purchaseInvoiceStatuses";

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
  site_mode: string | null;
  installation_start_date?: string | null;
  delivery_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
}

interface ClientDetail {
  id: string;
  client_number?: string | null;
  company_name: string;
  legal_name: string | null;
  tax_id: string | null;
  contact_email: string | null;
  phone?: string | null;
}

interface ProjectMetrics {
  quotesTotal: number;
  invoicesTotal: number;
  purchasesTotal: number;
  margin: number;
}

type TabId = 'resumen' | 'planificacion' | 'sitios' | 'presupuestos' | 'facturas' | 'compras' | 'tecnicos';

interface Tab {
  id: TabId;
  label: string;
  icon: any;
}

// Pestañas de navegación
const TABS: Tab[] = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'planificacion', label: 'Planificación', icon: Calendar },
  { id: 'sitios', label: 'Sitios', icon: MapPin },
  { id: 'presupuestos', label: 'Presupuestos', icon: FileText },
  { id: 'facturas', label: 'Facturas', icon: Receipt },
  { id: 'compras', label: 'Compras', icon: ShoppingCart },
  { id: 'tecnicos', label: 'Técnicos', icon: Users },
];

const MobileProjectDetailPage = () => {
  const { userId, projectId } = useParams<{ userId: string; projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('resumen');
  const [metrics, setMetrics] = useState<ProjectMetrics>({
    quotesTotal: 0,
    invoicesTotal: 0,
    purchasesTotal: 0,
    margin: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  
  // Estados para los listados de documentos
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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

        const { data: quotesData } = await supabase.rpc('list_quotes', { p_search: null });
        const projectQuotes = (quotesData || []).filter((q: any) => q.project_id === projectId);
        const quotesTotal = projectQuotes.reduce((sum: number, q: any) => sum + (q.subtotal || 0), 0);

        const { data: invoicesData } = await supabase.rpc('finance_list_invoices', { 
          p_search: null, 
          p_status: null 
        });
        const projectInvoices = (invoicesData || []).filter((inv: any) => inv.project_id === projectId);
        const invoicesTotal = projectInvoices.reduce((sum: number, inv: any) => sum + (inv.subtotal || 0), 0);

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

  // Fetch quotes cuando se activa la pestaña
  useEffect(() => {
    if (activeTab === 'presupuestos' && projectId) {
      fetchQuotes();
    }
  }, [activeTab, projectId]);

  // Fetch invoices cuando se activa la pestaña
  useEffect(() => {
    if (activeTab === 'facturas' && projectId) {
      fetchInvoices();
    }
  }, [activeTab, projectId]);

  // Fetch purchases cuando se activa la pestaña
  useEffect(() => {
    if (activeTab === 'compras' && projectId) {
      fetchPurchases();
    }
  }, [activeTab, projectId]);

  const fetchQuotes = async () => {
    if (!projectId) return;
    try {
      setLoadingQuotes(true);
      const { data, error } = await supabase.rpc('list_quotes', { p_search: null });
      if (error) throw error;
      const projectQuotes = (data || []).filter((q: any) => q.project_id === projectId);
      setQuotes(projectQuotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const fetchInvoices = async () => {
    if (!projectId) return;
    try {
      setLoadingInvoices(true);
      const { data, error } = await supabase.rpc('finance_list_invoices', { 
        p_search: null, 
        p_status: null 
      });
      if (error) throw error;
      const projectInvoices = (data || []).filter((inv: any) => inv.project_id === projectId);
      setInvoices(projectInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchPurchases = async () => {
    if (!projectId) return;
    try {
      setLoadingPurchases(true);
      const params: Record<string, unknown> = {
        p_search: null,
        p_status: null,
        p_supplier_id: null,
        p_technician_id: null,
        p_document_type: null,
        p_page: 1,
        p_page_size: 5000,
      };
      if (projectId != null) params.p_project_id = projectId;
      const { data, error } = await supabase.rpc('list_purchase_invoices', params);
      if (error) throw error;
      const projectPurchases = (data || []).filter((p: any) => p.project_id === projectId);
      setPurchases(projectPurchases);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleBack = () => {
    navigate(`/nexo-av/${userId}/projects`);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">Proyecto no encontrado</p>
        <button
          onClick={handleBack}
          className="text-primary underline"
        >
          Volver a proyectos
        </button>
      </div>
    );
  }

  const statusInfo = getProjectStatusInfo(project.status);
  const startDate = project.installation_start_date || project.actual_start_date || project.start_date;
  const endDate = project.delivery_date || project.actual_end_date || project.end_date;

  // TABS is now a static constant with Sitios always visible

  // Determinar qué botón de acción mostrar según la pestaña activa (igual que desktop)
  const getActionButton = () => {
    const currentClientId = project.client_id;
    if (!currentClientId && activeTab !== 'resumen') return null;

    switch (activeTab) {
      case 'resumen':
        return {
          label: 'Editar',
          icon: Edit,
          onClick: () => setEditDialogOpen(true),
        };
      case 'presupuestos':
        return {
          label: 'Nuevo',
          icon: Plus,
          onClick: () => navigate(`/nexo-av/${userId}/quotes/new?clientId=${currentClientId}&projectId=${projectId}`),
        };
      case 'facturas':
        return {
          label: 'Nueva',
          icon: Plus,
          onClick: () => navigate(`/nexo-av/${userId}/invoices/new?clientId=${currentClientId}&projectId=${projectId}`),
        };
      case 'tecnicos':
        return {
          label: 'Asignar',
          icon: Plus,
          onClick: () => {
            // TODO: Abrir diálogo para asignar técnicos (igual que desktop)
            console.log('Asignar técnico al proyecto:', projectId);
          },
        };
      case 'compras':
      default:
        return null; // Sin botón para compras
    }
  };

  const actionButton = getActionButton();

  return (
    <div className="w-full h-full flex flex-col">
      {/* ===== HEADER: 3 columnas (Atrás | Nombre | Acciones) ===== */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Columna izquierda: Botón Atrás */}
          <button
            onClick={handleBack}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
              "text-white/90 hover:text-white hover:bg-white/15",
              "active:scale-95 transition-all duration-200",
              "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]"
            )}
            style={{ touchAction: 'manipulation' }}
            aria-label="Volver"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Atrás</span>
          </button>
          
          {/* Columna central: Nombre del proyecto */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium text-foreground truncate leading-tight">
              {project.project_name}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              #{project.project_number}
            </p>
          </div>
          
          {/* Columna derecha: Botón de acción contextual */}
          {actionButton && (
            <button
              onClick={actionButton.onClick}
              className={cn(
                "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0",
                "text-sm font-medium whitespace-nowrap leading-none",
                "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
                "text-white/90 hover:text-white hover:bg-white/15",
                "active:scale-95 transition-all duration-200",
                "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]"
              )}
              style={{ touchAction: 'manipulation' }}
              aria-label={actionButton.label}
            >
              <actionButton.icon className="h-4 w-4" />
              <span>{actionButton.label}</span>
            </button>
          )}
        </div>
      </div>

      {/* ===== TABS: Navegación con estilo glass y distribución equitativa ===== */}
      <div className="flex-shrink-0 px-4 py-3">
        <div 
          className="flex overflow-x-auto scrollbar-hide gap-1 p-1 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(79, 79, 79, 1)',
            boxShadow: 'inset 0px 0px 15px 5px rgba(138, 138, 138, 0.1)',
          }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 whitespace-nowrap",
                  "text-sm font-medium transition-all duration-250 ease-out",
                  "flex-1 min-w-0",
                  "px-2 py-2 min-[420px]:px-3",
                  "rounded-full",
                  isActive 
                    ? "text-white" 
                    : "text-white/60 hover:text-white/80"
                )}
                style={{ 
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
                title={tab.label}
              >
                {/* Fondo glass para el tab activo */}
                {isActive && (
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(30px) saturate(200%)',
                      WebkitBackdropFilter: 'blur(30px) saturate(200%)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: 'inset 0px 0px 20px 8px rgba(255, 255, 255, 0.15), 0 0 20px 2px rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.15)',
                    }}
                  />
                )}
                {/* Contenido del tab */}
                <div className={cn(
                  "relative z-10 flex items-center justify-center gap-1.5",
                  "transition-all duration-250"
                )}>
                  {/* Icono: visible solo en pantallas estrechas (<420px) */}
                  <Icon className={cn(
                    "min-[420px]:hidden transition-all duration-250",
                    isActive ? "h-5 w-5 drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]" : "h-5 w-5"
                  )} />
                  {/* Texto: visible solo en pantallas anchas (>=420px) */}
                  <span className={cn(
                    "hidden min-[420px]:inline transition-all duration-250",
                    isActive && "drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]"
                  )}>
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== CONTENIDO DEL TAB ===== */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-[80px]">
        {activeTab === 'resumen' && (
          <ResumenTab 
            project={project}
            client={client}
            metrics={metrics}
            loadingMetrics={loadingMetrics}
            statusInfo={statusInfo}
            startDate={startDate}
            endDate={endDate}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}
        
        {activeTab === 'planificacion' && (
          <MobilePlanningTab 
            projectId={projectId!}
            siteMode={project?.site_mode}
          />
        )}

        {activeTab === 'sitios' && (
          <MobileSitesTab
            projectId={projectId!}
            siteMode={project?.site_mode}
          />
        )}
        
        {activeTab === 'presupuestos' && (
          <QuotesList 
            quotes={quotes}
            loading={loadingQuotes}
            onQuoteClick={(quoteId) => navigate(`/nexo-av/${userId}/quotes/${quoteId}`)}
            formatCurrency={formatCurrency}
          />
        )}
        
        {activeTab === 'facturas' && (
          <InvoicesList 
            invoices={invoices}
            loading={loadingInvoices}
            onInvoiceClick={(invoiceId) => navigate(`/nexo-av/${userId}/invoices/${invoiceId}`)}
            formatCurrency={formatCurrency}
          />
        )}
        
        {activeTab === 'compras' && (
          <PurchasesList 
            purchases={purchases}
            loading={loadingPurchases}
            onPurchaseClick={(purchaseId) => navigate(`/nexo-av/${userId}/purchase-invoices/${purchaseId}`)}
            formatCurrency={formatCurrency}
          />
        )}
        
        {activeTab === 'tecnicos' && (
          <EmptyTabContent 
            icon={Users}
            title="Técnicos"
            description="Técnicos asignados al proyecto"
          />
        )}
      </div>

      {/* Sheet Editar Proyecto (mobile) */}
      {project && (
        <EditProjectSheet
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          project={project}
          onSuccess={() => {
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
          }}
        />
      )}
    </div>
  );
};

// ===== COMPONENTES AUXILIARES =====

interface ResumenTabProps {
  project: ProjectDetail;
  client: ClientDetail | null;
  metrics: ProjectMetrics;
  loadingMetrics: boolean;
  statusInfo: { label: string; className: string };
  startDate: string | null | undefined;
  endDate: string | null | undefined;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | null | undefined) => string | null;
}

const ResumenTab = ({ 
  project, 
  client, 
  metrics, 
  loadingMetrics, 
  statusInfo,
  startDate,
  endDate,
  formatCurrency,
  formatDate 
}: ResumenTabProps) => (
  <div className="px-4 py-4 space-y-4">
    {/* ===== INFORMACIÓN DEL PROYECTO ===== */}
    <SectionCard title="Información del Proyecto">
      <div className="space-y-4">
        {/* Nombre y número */}
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground leading-tight">
            {project.project_name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">
              #{project.project_number}
            </span>
            <Badge 
              variant="outline" 
              className={cn(statusInfo.className, "text-xs px-2 py-0.5")}
            >
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        {/* Datos del proyecto en lista */}
        <div className="space-y-3 pt-2 border-t border-border/50">
          {/* Cliente */}
          {(client || project.client_name) && (
            <InfoRow 
              icon={Building} 
              label="Cliente" 
              value={client?.company_name || client?.legal_name || project.client_name || '-'}
              subValue={client?.client_number ? `#${client.client_number}` : undefined}
            />
          )}

          {/* Nº Pedido Cliente */}
          {project.client_order_number && (
            <InfoRow 
              icon={Hash} 
              label="Nº Pedido Cliente" 
              value={project.client_order_number}
            />
          )}

          {/* Ubicación */}
          {(project.project_address || project.project_city) && (
            <InfoRow 
              icon={MapPin} 
              label="Ubicación" 
              value={[project.project_address, project.project_city].filter(Boolean).join(', ')}
            />
          )}

          {/* Nombre del local */}
          {project.local_name && (
            <InfoRow 
              icon={Building} 
              label="Nombre del Local" 
              value={project.local_name}
            />
          )}

          {/* Fechas */}
          {startDate && (
            <InfoRow 
              icon={Calendar} 
              label="Fecha de Inicio" 
              value={formatDate(startDate) || '-'}
            />
          )}
          
          {endDate && (
            <InfoRow 
              icon={Package} 
              label="Fecha de Entrega" 
              value={formatDate(endDate) || '-'}
            />
          )}
        </div>

        {/* Contacto del cliente */}
        {client && (client.contact_email || client.phone || client.tax_id) && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Contacto del Cliente
            </p>
            <div className="flex flex-wrap gap-2">
              {client.tax_id && (
                <InfoChip icon={Hash} value={client.tax_id} />
              )}
              {client.contact_email && (
                <InfoChip 
                  icon={Mail} 
                  value={client.contact_email} 
                  href={`mailto:${client.contact_email}`}
                />
              )}
              {client.phone && (
                <InfoChip 
                  icon={Phone} 
                  value={client.phone} 
                  href={`tel:${client.phone}`}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </SectionCard>

    {/* ===== MÉTRICAS FINANCIERAS ===== */}
    <div className="grid grid-cols-2 gap-3">
      <MetricCard
        icon={FileText}
        label="Presupuesto"
        value={loadingMetrics ? "..." : formatCurrency(metrics.quotesTotal)}
        color="blue"
      />
      <MetricCard
        icon={Receipt}
        label="Facturado"
        value={loadingMetrics ? "..." : formatCurrency(metrics.invoicesTotal)}
        color="green"
      />
      <MetricCard
        icon={ShoppingCart}
        label="Compras"
        value={loadingMetrics ? "..." : formatCurrency(metrics.purchasesTotal)}
        color="orange"
      />
      <MetricCard
        icon={TrendingUp}
        label="Margen"
        value={loadingMetrics ? "..." : formatCurrency(metrics.margin)}
        color={metrics.margin >= 0 ? "emerald" : "red"}
      />
    </div>

    {/* ===== NOTAS ===== */}
    {project.notes && (
      <SectionCard title="Notas">
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {project.notes}
        </p>
      </SectionCard>
    )}
  </div>
);

// Componente para filas de información
interface InfoRowProps {
  icon: any;
  label: string;
  value: string;
  subValue?: string;
}

const InfoRow = ({ icon: Icon, label, value, subValue }: InfoRowProps) => (
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 mt-0.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm text-foreground">{value}</p>
        {subValue && (
          <span className="text-xs text-muted-foreground">{subValue}</span>
        )}
      </div>
    </div>
  </div>
);

interface MetricCardProps {
  icon: any;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'orange' | 'emerald' | 'red' | 'purple';
}

const MetricCard = ({ icon: Icon, label, value, color }: MetricCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    orange: 'bg-orange-500/10 text-orange-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    red: 'bg-red-500/10 text-red-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={cn("p-1.5 rounded-lg", colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-semibold text-foreground pl-1">{value}</p>
    </div>
  );
};

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

const SectionCard = ({ title, children }: SectionCardProps) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
      {title}
    </h3>
    {children}
  </div>
);

interface InfoChipProps {
  icon: any;
  value: string;
  href?: string;
}

const InfoChip = ({ icon: Icon, value, href }: InfoChipProps) => {
  const content = (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-full",
      "bg-white/5 border border-border text-xs",
      href && "hover:bg-white/10 cursor-pointer"
    )}>
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className={cn("truncate max-w-[150px]", href && "text-primary")}>
        {value}
      </span>
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }
  return content;
};

interface EmptyTabContentProps {
  icon: any;
  title: string;
  description: string;
}

const EmptyTabContent = ({ icon: Icon, title, description }: EmptyTabContentProps) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="p-4 bg-white/5 rounded-full mb-4">
      <Icon className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

// ===== COMPONENTES DE LISTADO DE DOCUMENTOS =====

interface QuotesListProps {
  quotes: any[];
  loading: boolean;
  onQuoteClick: (quoteId: string) => void;
  formatCurrency: (amount: number) => string;
}

const QuotesList = ({ quotes, loading, onQuoteClick, formatCurrency }: QuotesListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="p-4 bg-white/5 rounded-full mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">Presupuestos</h3>
        <p className="text-sm text-muted-foreground">No hay presupuestos para este proyecto</p>
      </div>
    );
  }

  const totalSubtotal = quotes.reduce((s: number, q: any) => s + (q.subtotal || 0), 0);
  const totalAmount = quotes.reduce((s: number, q: any) => s + (q.total || 0), 0);

  return (
    <div className="px-4 py-4 space-y-2">
      {quotes.map((quote) => {
        const statusInfo = getQuoteStatusInfo(quote.status);
        return (
          <button
            key={quote.id}
            onClick={() => onQuoteClick(quote.id)}
            className={cn(
              "w-full text-left p-3 rounded-xl",
              "bg-card border border-border",
              "active:scale-[0.98] transition-all duration-200",
              "hover:border-primary/30"
            )}
            style={{ touchAction: 'manipulation' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-muted-foreground truncate">
                    {quote.quote_number}
                  </span>
                  <Badge variant="outline" className={cn(statusInfo.className, "text-[10px] px-1.5 py-0")}>
                    {statusInfo.label}
                  </Badge>
                </div>
                <h4 className="text-sm font-medium text-foreground truncate">
                  {quote.client_name || "Sin cliente"}
                </h4>
                {quote.issue_date && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {new Date(quote.issue_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs text-muted-foreground">{formatCurrency(quote.subtotal || 0)}</span>
                <span className="text-sm font-semibold text-foreground">{formatCurrency(quote.total || 0)}</span>
              </div>
            </div>
          </button>
        );
      })}
      {/* Summary footer */}
      <div className="bg-card/50 border border-border rounded-xl p-3 mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{quotes.length} presupuesto{quotes.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-3">
            <span>Base: {formatCurrency(totalSubtotal)}</span>
            <span className="font-semibold text-foreground">Total: {formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface InvoicesListProps {
  invoices: any[];
  loading: boolean;
  onInvoiceClick: (invoiceId: string) => void;
  formatCurrency: (amount: number) => string;
}

const InvoicesList = ({ invoices, loading, onInvoiceClick, formatCurrency }: InvoicesListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="p-4 bg-white/5 rounded-full mb-4">
          <Receipt className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">Facturas</h3>
        <p className="text-sm text-muted-foreground">No hay facturas para este proyecto</p>
      </div>
    );
  }

  const totalAmount = invoices.reduce((s: number, i: any) => s + (i.total || 0), 0);
  const totalPaid = invoices.reduce((s: number, i: any) => s + (i.paid_amount || 0), 0);

  return (
    <div className="px-4 py-4 space-y-2">
      {invoices.map((invoice) => {
        const displayNumber = invoice.invoice_number || invoice.preliminary_number || 'Sin número';
        const docStatusInfo = getSalesDocumentStatusInfo(invoice.status);
        const collectionStatus = calculateCollectionStatus(
          invoice.paid_amount || 0,
          invoice.total || 0,
          invoice.due_date,
          invoice.status
        );
        const collectionInfo = getCollectionStatusInfo(collectionStatus);

        return (
          <button
            key={invoice.id}
            onClick={() => onInvoiceClick(invoice.id)}
            className={cn(
              "w-full text-left p-3 rounded-xl",
              "bg-card border border-border",
              "active:scale-[0.98] transition-all duration-200",
              "hover:border-primary/30"
            )}
            style={{ touchAction: 'manipulation' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground truncate">
                    {displayNumber}
                  </span>
                  <Badge variant="outline" className={cn("sales-status-badge sales-status-badge--document", docStatusInfo.className, "text-[10px] px-1.5 py-0")}>
                    {docStatusInfo.label}
                  </Badge>
                  {collectionInfo && (
                    <Badge variant="outline" className={cn("sales-status-badge sales-status-badge--collection", collectionInfo.className, "text-[10px] px-1.5 py-0")}>
                      {collectionInfo.label}
                    </Badge>
                  )}
                </div>
                <h4 className="text-sm font-medium text-foreground truncate">
                  {invoice.client_name || "Sin cliente"}
                </h4>
                {invoice.issue_date && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {new Date(invoice.issue_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {invoice.pending_amount > 0 && (
                  <span className="text-[10px] text-amber-500">Pend. {formatCurrency(invoice.pending_amount)}</span>
                )}
                <span className="text-sm font-semibold text-foreground">{formatCurrency(invoice.total || 0)}</span>
              </div>
            </div>
          </button>
        );
      })}
      {/* Summary footer */}
      <div className="bg-card/50 border border-border rounded-xl p-3 mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{invoices.length} factura{invoices.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-3">
            <span>Cobrado: {formatCurrency(totalPaid)}</span>
            <span className="font-semibold text-foreground">Total: {formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PurchasesListProps {
  purchases: any[];
  loading: boolean;
  onPurchaseClick: (purchaseId: string) => void;
  formatCurrency: (amount: number) => string;
}

const PurchasesList = ({ purchases, loading, onPurchaseClick, formatCurrency }: PurchasesListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="p-4 bg-white/5 rounded-full mb-4">
          <ShoppingCart className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">Compras</h3>
        <p className="text-sm text-muted-foreground">No hay compras para este proyecto</p>
      </div>
    );
  }

  const totalAmount = purchases.reduce((s: number, p: any) => s + (p.total || 0), 0);
  const totalPaid = purchases.reduce((s: number, p: any) => s + (p.paid_amount || 0), 0);

  return (
    <div className="px-4 py-4 space-y-2">
      {purchases.map((purchase) => {
        const displayNumber = purchase.internal_purchase_number || purchase.invoice_number || 'Sin número';
        const docStatusInfo = getDocumentStatusInfo(purchase.status);
        const paymentStatus = calculatePaymentStatus(
          purchase.paid_amount || 0,
          purchase.total || 0,
          purchase.due_date,
          purchase.status
        );
        const paymentInfo = getPaymentStatusInfo(paymentStatus);

        return (
          <button
            key={purchase.id}
            onClick={() => onPurchaseClick(purchase.id)}
            className={cn(
              "w-full text-left p-3 rounded-xl",
              "bg-card border border-border",
              "active:scale-[0.98] transition-all duration-200",
              "hover:border-primary/30"
            )}
            style={{ touchAction: 'manipulation' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground truncate">
                    {displayNumber}
                  </span>
                  <Badge variant="outline" className={cn(docStatusInfo.className, "text-[10px] px-1.5 py-0")}>
                    {docStatusInfo.label}
                  </Badge>
                  {paymentInfo && (
                    <Badge variant="outline" className={cn(paymentInfo.className, "text-[10px] px-1.5 py-0")}>
                      {paymentInfo.label}
                    </Badge>
                  )}
                </div>
                <h4 className="text-sm font-medium text-foreground truncate">
                  {purchase.provider_name || purchase.supplier_name || "Sin proveedor"}
                </h4>
                {purchase.issue_date && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {new Date(purchase.issue_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {purchase.pending_amount > 0 && (
                  <span className="text-[10px] text-amber-500">Pend. {formatCurrency(purchase.pending_amount)}</span>
                )}
                <span className="text-sm font-semibold text-foreground">{formatCurrency(purchase.total || 0)}</span>
              </div>
            </div>
          </button>
        );
      })}
      {/* Summary footer */}
      <div className="bg-card/50 border border-border rounded-xl p-3 mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{purchases.length} compra{purchases.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-3">
            <span>Pagado: {formatCurrency(totalPaid)}</span>
            <span className="font-semibold text-foreground">Total: {formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileProjectDetailPage;
