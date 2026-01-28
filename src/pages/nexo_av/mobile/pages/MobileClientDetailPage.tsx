/**
 * MobileClientDetailPage - Página de detalle de cliente para móvil
 * VERSIÓN: 1.0 - Con pestañas: Información, Presupuestos, Facturas, Proyectos
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  ChevronLeft,
  MapPin,
  Building2,
  Calendar,
  FileText,
  Receipt,
  FolderKanban,
  Mail,
  Hash,
  Phone,
  AlertCircle,
  Edit,
  LayoutDashboard,
  Plus,
  ChevronRight,
  Globe,
  Briefcase,
  Target,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjectStatusInfo } from "@/constants/projectStatuses";
import { getQuoteStatusInfo } from "@/constants/quoteStatuses";
import { getSalesDocumentStatusInfo, calculateCollectionStatus, getCollectionStatusInfo } from "@/constants/salesInvoiceStatuses";
// Definir LEAD_STAGES localmente (igual que en MobileClientsPage)
const LEAD_STAGES = [
  { value: 'NEW', label: 'Nuevo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'CONTACTED', label: 'Contactado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'MEETING', label: 'Reunión', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'PROPOSAL', label: 'Propuesta', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { value: 'NEGOTIATION', label: 'Negociación', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'WON', label: 'Ganado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'RECURRING', label: 'Recurrente', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'LOST', label: 'Perdido', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'PAUSED', label: 'Pausado', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

const getStageInfo = (stage: string) => {
  return LEAD_STAGES.find(s => s.value === stage) || LEAD_STAGES[0];
};

interface ClientDetail {
  id: string;
  company_name: string;
  legal_name: string | null;
  tax_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_province: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  website: string | null;
  industry_sector: string | null;
  lead_stage: string;
  lead_source: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
}

interface ClientMetrics {
  quotesTotal: number;
  invoicesTotal: number;
  projectsCount: number;
}

type TabId = 'informacion' | 'presupuestos' | 'facturas' | 'proyectos';

interface Tab {
  id: TabId;
  label: string;
  icon: any;
}

// Pestañas de navegación
const TABS: Tab[] = [
  { id: 'informacion', label: 'Información', icon: LayoutDashboard },
  { id: 'presupuestos', label: 'Presupuestos', icon: FileText },
  { id: 'facturas', label: 'Facturas', icon: Receipt },
  { id: 'proyectos', label: 'Proyectos', icon: FolderKanban },
];

const MobileClientDetailPage = () => {
  const { userId, clientId } = useParams<{ userId: string; clientId: string }>();
  const navigate = useNavigate();
  
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('informacion');
  const [metrics, setMetrics] = useState<ClientMetrics>({
    quotesTotal: 0,
    invoicesTotal: 0,
    projectsCount: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  
  // Estados para los listados
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    const fetchClient = async () => {
      if (!clientId) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_client', {
          p_client_id: clientId
        });

        if (error) throw error;
        if (data && data.length > 0) {
          setClient(data[0]);
        }
      } catch (error) {
        console.error('Error fetching client:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  useEffect(() => {
    if (client) {
      fetchMetrics();
    }
  }, [client]);

  // Fetch quotes cuando se activa la pestaña
  useEffect(() => {
    if (activeTab === 'presupuestos' && clientId) {
      fetchQuotes();
    }
  }, [activeTab, clientId]);

  // Fetch invoices cuando se activa la pestaña
  useEffect(() => {
    if (activeTab === 'facturas' && clientId) {
      fetchInvoices();
    }
  }, [activeTab, clientId]);

  // Fetch projects cuando se activa la pestaña
  useEffect(() => {
    if (activeTab === 'proyectos' && clientId) {
      fetchProjects();
    }
  }, [activeTab, clientId]);

  const fetchMetrics = async () => {
    if (!clientId) return;
    try {
      setLoadingMetrics(true);
      
      // Fetch quotes
      const { data: quotesData } = await supabase.rpc('list_quotes', { p_search: null });
      const clientQuotes = (quotesData || []).filter((q: any) => q.client_id === clientId);
      const quotesTotal = clientQuotes.reduce((sum: number, q: any) => sum + (q.total || 0), 0);
      
      // Fetch invoices
      const { data: invoicesData } = await supabase.rpc('finance_list_invoices', { 
        p_search: null, 
        p_status: null 
      });
      const clientInvoices = (invoicesData || []).filter((inv: any) => inv.client_id === clientId);
      const invoicesTotal = clientInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
      
      // Fetch projects
      const { data: projectsData } = await supabase.rpc('list_projects', { p_search: null });
      const clientProjects = (projectsData || []).filter((p: any) => p.client_id === clientId);
      
      setMetrics({
        quotesTotal,
        invoicesTotal,
        projectsCount: clientProjects.length,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchQuotes = async () => {
    if (!clientId) return;
    try {
      setLoadingQuotes(true);
      const { data, error } = await supabase.rpc('list_quotes', { p_search: null });
      if (error) throw error;
      const clientQuotes = (data || []).filter((q: any) => q.client_id === clientId);
      setQuotes(clientQuotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const fetchInvoices = async () => {
    if (!clientId) return;
    try {
      setLoadingInvoices(true);
      const { data, error } = await supabase.rpc('finance_list_invoices', { 
        p_search: null, 
        p_status: null 
      });
      if (error) throw error;
      const clientInvoices = (data || []).filter((inv: any) => inv.client_id === clientId);
      setInvoices(clientInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchProjects = async () => {
    if (!clientId) return;
    try {
      setLoadingProjects(true);
      const { data, error } = await supabase.rpc('list_projects', { p_search: null });
      if (error) throw error;
      const clientProjects = (data || []).filter((p: any) => p.client_id === clientId);
      setProjects(clientProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoadingProjects(false);
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
    navigate(`/nexo-av/${userId}/clients`);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <button
          onClick={handleBack}
          className="text-primary underline"
        >
          Volver a clientes
        </button>
      </div>
    );
  }

  const stageInfo = getStageInfo(client.lead_stage);

  // Determinar qué botón de acción mostrar según la pestaña activa
  const getActionButton = () => {
    switch (activeTab) {
      case 'informacion':
        return {
          label: 'Editar',
          icon: Edit,
          onClick: () => navigate(`/nexo-av/${userId}/clients/${clientId}/edit`),
        };
      case 'presupuestos':
        return {
          label: 'Nuevo',
          icon: Plus,
          onClick: () => navigate(`/nexo-av/${userId}/quotes/new?clientId=${clientId}`),
        };
      case 'facturas':
        return {
          label: 'Nueva',
          icon: Plus,
          onClick: () => console.log('Crear nueva factura'),
        };
      case 'proyectos':
        return {
          label: 'Nuevo',
          icon: Plus,
          onClick: () => navigate(`/nexo-av/${userId}/projects/new?clientId=${clientId}`),
        };
      default:
        return null;
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
          
          {/* Columna central: Nombre del cliente */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium text-foreground truncate leading-tight">
              {client.company_name}
            </h1>
            {client.legal_name && client.legal_name !== client.company_name && (
              <p className="text-xs text-muted-foreground truncate">
                {client.legal_name}
              </p>
            )}
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
        {activeTab === 'informacion' && (
          <InformacionTab 
            client={client}
            metrics={metrics}
            loadingMetrics={loadingMetrics}
            stageInfo={stageInfo}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
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
        
        {activeTab === 'proyectos' && (
          <ProjectsList 
            projects={projects}
            loading={loadingProjects}
            onProjectClick={(projectId) => navigate(`/nexo-av/${userId}/projects/${projectId}`)}
          />
        )}
      </div>
    </div>
  );
};

// ===== COMPONENTES AUXILIARES =====

interface InformacionTabProps {
  client: ClientDetail;
  metrics: ClientMetrics;
  loadingMetrics: boolean;
  stageInfo: { label: string; className: string };
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | null | undefined) => string | null;
}

const InformacionTab = ({ 
  client, 
  metrics, 
  loadingMetrics, 
  stageInfo,
  formatCurrency,
  formatDate 
}: InformacionTabProps) => (
  <div className="px-4 py-4 space-y-4">
    {/* ===== INFORMACIÓN DEL CLIENTE ===== */}
    <SectionCard title="Información del Cliente">
      <div className="space-y-4">
        {/* Nombre y estado */}
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground leading-tight">
            {client.company_name}
          </h3>
          {client.legal_name && client.legal_name !== client.company_name && (
            <p className="text-sm text-muted-foreground">{client.legal_name}</p>
          )}
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(stageInfo.className, "text-xs px-2 py-0.5")}
            >
              {stageInfo.label}
            </Badge>
          </div>
        </div>

        {/* Datos del cliente en lista */}
        <div className="space-y-3 pt-2 border-t border-border/50">
          {/* NIF/CIF */}
          {client.tax_id && (
            <InfoRow 
              icon={Hash} 
              label="NIF/CIF" 
              value={client.tax_id}
            />
          )}

          {/* Email */}
          {client.contact_email && (
            <InfoRow 
              icon={Mail} 
              label="Email" 
              value={client.contact_email}
              href={`mailto:${client.contact_email}`}
            />
          )}

          {/* Teléfono */}
          {client.contact_phone && (
            <InfoRow 
              icon={Phone} 
              label="Teléfono" 
              value={client.contact_phone}
              href={`tel:${client.contact_phone}`}
            />
          )}

          {/* Dirección */}
          {(client.billing_address || client.billing_city) && (
            <InfoRow 
              icon={MapPin} 
              label="Dirección" 
              value={[
                client.billing_address,
                client.billing_city,
                client.billing_postal_code,
                client.billing_province
              ].filter(Boolean).join(', ')}
            />
          )}

          {/* País */}
          {client.billing_country && (
            <InfoRow 
              icon={Globe} 
              label="País" 
              value={client.billing_country}
            />
          )}

          {/* Web */}
          {client.website && (
            <InfoRow 
              icon={Globe} 
              label="Página Web" 
              value={client.website}
              href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
            />
          )}

          {/* Sector */}
          {client.industry_sector && (
            <InfoRow 
              icon={Briefcase} 
              label="Sector" 
              value={client.industry_sector}
            />
          )}

          {/* Origen */}
          {client.lead_source && (
            <InfoRow 
              icon={Target} 
              label="Origen" 
              value={client.lead_source}
            />
          )}

          {/* Fecha de creación */}
          {client.created_at && (
            <InfoRow 
              icon={Calendar} 
              label="Fecha de Creación" 
              value={formatDate(client.created_at) || '-'}
            />
          )}
        </div>
      </div>
    </SectionCard>

    {/* ===== MÉTRICAS ===== */}
    <div className="grid grid-cols-2 gap-3">
      <MetricCard
        icon={FileText}
        label="Presupuestos"
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
        icon={FolderKanban}
        label="Proyectos"
        value={loadingMetrics ? "..." : metrics.projectsCount.toString()}
        color="purple"
      />
      <MetricCard
        icon={TrendingUp}
        label="Ticket Medio"
        value={loadingMetrics ? "..." : metrics.projectsCount > 0 ? formatCurrency(metrics.invoicesTotal / metrics.projectsCount) : formatCurrency(0)}
        color="emerald"
      />
    </div>

    {/* ===== NOTAS ===== */}
    {client.notes && (
      <SectionCard title="Notas">
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {client.notes}
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
  href?: string;
}

const InfoRow = ({ icon: Icon, label, value, href }: InfoRowProps) => {
  const content = (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm text-foreground", href && "text-primary")}>{value}</p>
      </div>
    </div>
  );

  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return content;
};

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

// ===== COMPONENTES DE LISTADO =====

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
        <p className="text-sm text-muted-foreground">No hay presupuestos para este cliente</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-2">
      {quotes.map((quote) => {
        const statusInfo = getQuoteStatusInfo(quote.status);
        return (
          <button
            key={quote.id}
            onClick={() => onQuoteClick(quote.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-xl",
              "bg-card border border-border",
              "active:scale-[0.98] transition-all duration-200",
              "hover:border-primary/30"
            )}
            style={{ touchAction: 'manipulation' }}
          >
            <div className="flex items-center gap-2">
              {/* Nº Documento - Columna fija */}
              <span className="font-mono text-xs text-muted-foreground w-[100px] flex-shrink-0 truncate">
                {quote.quote_number}
              </span>
              
              {/* Estado */}
              <Badge 
                variant="outline" 
                className={cn(
                  statusInfo.className,
                  "text-[10px] px-1.5 py-0 w-[70px] justify-center flex-shrink-0"
                )}
              >
                {statusInfo.label}
              </Badge>
              
              {/* Subtotal - Columna flexible */}
              <span className="text-sm text-foreground flex-1 text-right">
                {formatCurrency(quote.subtotal || 0)}
              </span>
              
              {/* Total - Columna fija */}
              <span className="text-sm font-semibold text-foreground w-[80px] text-right flex-shrink-0">
                {formatCurrency(quote.total || 0)}
              </span>
              
              {/* Arrow */}
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-1" />
            </div>
          </button>
        );
      })}
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
        <p className="text-sm text-muted-foreground">No hay facturas para este cliente</p>
      </div>
    );
  }

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
              "w-full text-left px-3 py-2 rounded-xl",
              "bg-card border border-border",
              "active:scale-[0.98] transition-all duration-200",
              "hover:border-primary/30"
            )}
            style={{ touchAction: 'manipulation' }}
          >
            <div className="flex items-center gap-2">
              {/* Nº Documento - Columna fija */}
              <span className="font-mono text-xs text-muted-foreground w-[90px] flex-shrink-0 truncate">
                {displayNumber}
              </span>
              
              {/* Estado del documento */}
              <Badge 
                variant="outline" 
                className={cn(
                  "sales-status-badge sales-status-badge--document",
                  docStatusInfo.className,
                  "text-[10px] px-1.5 py-0 w-[65px] justify-center flex-shrink-0"
                )}
              >
                {docStatusInfo.label}
              </Badge>
              
              {/* Estado de cobro (solo si está emitida) */}
              {collectionInfo && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "sales-status-badge sales-status-badge--collection",
                    collectionInfo.className,
                    "text-[10px] px-1.5 py-0 w-[60px] justify-center flex-shrink-0"
                  )}
                >
                  {collectionInfo.label}
                </Badge>
              )}
              
              {/* Subtotal - Columna flexible */}
              <span className="text-sm text-foreground flex-1 text-right">
                {formatCurrency(invoice.subtotal || 0)}
              </span>
              
              {/* Total - Columna fija */}
              <span className="text-sm font-semibold text-foreground w-[75px] text-right flex-shrink-0">
                {formatCurrency(invoice.total || 0)}
              </span>
              
              {/* Arrow */}
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-1" />
            </div>
          </button>
        );
      })}
    </div>
  );
};

interface ProjectsListProps {
  projects: any[];
  loading: boolean;
  onProjectClick: (projectId: string) => void;
}

const ProjectsList = ({ projects, loading, onProjectClick }: ProjectsListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="p-4 bg-white/5 rounded-full mb-4">
          <FolderKanban className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">Proyectos</h3>
        <p className="text-sm text-muted-foreground">No hay proyectos para este cliente</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-2">
      {projects.map((project) => {
        const statusInfo = getProjectStatusInfo(project.status);
        return (
          <button
            key={project.id}
            onClick={() => onProjectClick(project.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-xl",
              "bg-card border border-border",
              "active:scale-[0.98] transition-all duration-200",
              "hover:border-primary/30"
            )}
            style={{ touchAction: 'manipulation' }}
          >
            <div className="flex items-center gap-3">
              {/* Status Badge - Fixed width column */}
              <Badge 
                variant="outline" 
                className={cn(
                  statusInfo.className, 
                  "text-[10px] px-2 py-0.5 w-[80px] justify-center flex-shrink-0 whitespace-nowrap"
                )}
              >
                {statusInfo.label}
              </Badge>
              
              {/* Project Name - Flexible column */}
              <span className="font-normal text-foreground truncate text-sm flex-1 min-w-0">
                {project.project_name}
              </span>
              
              {/* Arrow */}
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MobileClientDetailPage;
