/**
 * MobileQuoteDetailPage - Página de detalle de presupuesto para móvil
 * VERSIÓN: 1.0 - 3 pestañas (Resumen, Preview, Líneas)
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  ChevronLeft,
  FileText,
  Eye,
  Download,
  LayoutDashboard,
  Send,
  Edit,
  Building,
  Calendar,
  User,
  Hash,
  Mail,
  Phone,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Receipt,
  TrendingUp,
  Copy,
  Receipt as ReceiptIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getQuoteStatusInfo, QUOTE_STATUSES } from "@/constants/quoteStatuses";
import { useToast } from "@/hooks/use-toast";
import { QuotePDFDocument } from "@/pages/nexo_av/assets/plantillas";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  client_name: string;
  project_name: string | null;
  project_id: string | null;
  order_number: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  site_id?: string | null;
  site_name?: string | null;
  site_city?: string | null;
}

interface QuoteLine {
  id: string;
  concept: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  line_order: number;
}

interface Client {
  id: string;
  company_name: string;
  legal_name: string | null;
  tax_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_postal_code: string | null;
  billing_province: string | null;
  billing_country: string | null;
  website: string | null;
}

interface Project {
  project_number: string;
  project_name: string;
  project_address: string | null;
  project_city: string | null;
  local_name: string | null;
  client_order_number: string | null;
  site_name?: string | null;
}

interface CompanySettings {
  id: string;
  legal_name: string;
  commercial_name: string | null;
  tax_id: string;
  vat_number: string | null;
  fiscal_address: string;
  fiscal_city: string;
  fiscal_postal_code: string;
  fiscal_province: string;
  country: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  website: string | null;
  logo_url: string | null;
}

type TabId = 'resumen' | 'preview' | 'lineas';

interface Tab {
  id: TabId;
  label: string;
  icon: any;
}

const TABS: Tab[] = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'lineas', label: 'Líneas', icon: FileText },
];

// Estados que bloquean edición
const LOCKED_STATES = ["SENT", "APPROVED", "REJECTED", "EXPIRED", "INVOICED"];

// Obtener transiciones de estado disponibles
const getAvailableStatusTransitions = (currentStatus: string) => {
  switch (currentStatus) {
    case "DRAFT":
      return ["DRAFT", "SENT"];
    case "SENT":
      return ["SENT", "APPROVED", "REJECTED"];
    case "APPROVED":
      return ["APPROVED", "REJECTED"];
    case "REJECTED":
      return ["REJECTED", "APPROVED"];
    case "EXPIRED":
      return ["EXPIRED"];
    case "INVOICED":
      return ["INVOICED"];
    default:
      return [currentStatus];
  }
};

const MobileQuoteDetailPage = () => {
  const { userId, quoteId } = useParams<{ userId: string; quoteId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('resumen');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sending, setSending] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (quoteId) {
      fetchQuoteData();
    }
  }, [quoteId]);

  const fetchQuoteData = async () => {
    if (!quoteId) return;
    
    try {
      setLoading(true);

      // Fetch quote
      const { data: quoteData, error: quoteError } = await supabase.rpc("get_quote", {
        p_quote_id: quoteId,
      });
      if (quoteError) throw quoteError;
      if (!quoteData || quoteData.length === 0) throw new Error("Presupuesto no encontrado");

      const quoteInfo = quoteData[0];
      setQuote(quoteInfo);

      // Fetch quote lines
      const { data: linesData, error: linesError } = await supabase.rpc("get_quote_lines", {
        p_quote_id: quoteId,
      });
      if (linesError) throw linesError;
      setLines(linesData || []);

      // Fetch client details
      if (quoteInfo.client_id) {
        const { data: clientData, error: clientError } = await supabase.rpc("get_client", {
          p_client_id: quoteInfo.client_id,
        });
        if (!clientError && clientData && clientData.length > 0) {
          setClient(clientData[0]);
        }
      }

      // Fetch project details
      if (quoteInfo.project_id) {
        const { data: projectData, error: projectError } = await supabase.rpc("get_project", {
          p_project_id: quoteInfo.project_id,
        });
        if (!projectError && projectData && projectData.length > 0) {
          setProject({
            project_number: projectData[0].project_number,
            project_name: projectData[0].project_name,
            project_address: projectData[0].project_address,
            project_city: projectData[0].project_city,
            local_name: projectData[0].local_name,
            client_order_number: projectData[0].client_order_number,
            site_name: quoteInfo.site_name || null,
          });
        }
      }

      // Fetch company settings
      const { data: companyData, error: companyError } = await supabase.rpc("get_company_settings");
      if (!companyError && companyData && companyData.length > 0) {
        setCompany(companyData[0]);
      }
    } catch (error: any) {
      console.error("Error fetching quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el presupuesto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!quote || newStatus === quote.status) return;

    setUpdatingStatus(true);
    try {
      const { error } = await supabase.rpc("update_quote", {
        p_quote_id: quoteId!,
        p_status: newStatus,
      });

      if (error) throw error;

      await fetchQuoteData();

      const statusLabel = getQuoteStatusInfo(newStatus).label;
      toast({
        title: "Estado actualizado",
        description: newStatus === "SENT"
          ? "El presupuesto se ha bloqueado y se ha asignado el número definitivo"
          : `El presupuesto ahora está "${statusLabel}"`,
      });
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSend = async () => {
    if (!quote || quote.status !== "DRAFT") return;

    setSending(true);
    try {
      const { error } = await supabase.rpc("update_quote", {
        p_quote_id: quoteId!,
        p_status: "SENT",
      });

      if (error) throw error;

      await fetchQuoteData();

      toast({
        title: "Presupuesto enviado",
        description: "El presupuesto se ha bloqueado y se ha asignado el número definitivo",
      });
    } catch (error: any) {
      console.error("Error sending quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el presupuesto",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleEdit = () => {
    if (!quote || LOCKED_STATES.includes(quote.status)) {
      toast({
        title: "Presupuesto bloqueado",
        description: "No se puede editar un presupuesto bloqueado",
        variant: "destructive",
      });
      return;
    }
    navigate(`/nexo-av/${userId}/quotes/${quoteId}/edit`);
  };

  const handleCreateNewVersion = () => {
    if (!quote) return;
    navigate(`/nexo-av/${userId}/quotes/new?sourceQuoteId=${quoteId}`);
  };

  const handleInvoice = async () => {
    if (!quote) return;
    try {
      const { data, error } = await supabase.rpc("create_invoice_from_quote", {
        p_quote_id: quoteId!,
      });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No se pudo crear la factura");

      const invoiceId = data[0].invoice_id;
      const invoiceNumber = data[0].invoice_number;

      toast({
        title: "Factura creada",
        description: `Se ha generado la factura ${invoiceNumber}`,
      });

      navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la factura",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    navigate(`/nexo-av/${userId}/quotes`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">Presupuesto no encontrado</p>
        <button
          onClick={handleBack}
          className="text-primary underline"
        >
          Volver a presupuestos
        </button>
      </div>
    );
  }

  const statusInfo = getQuoteStatusInfo(quote.status);
  const availableStatuses = getAvailableStatusTransitions(quote.status);
  const isEditable = !LOCKED_STATES.includes(quote.status);
  const fileName = `${quote.quote_number}.pdf`;

  // Determinar botones de acción según estado (igual que desktop)
  const getActionButtons = (): Array<{ label: string; icon: any; onClick: () => void; loading?: boolean }> => {
    const buttons: Array<{ label: string; icon: any; onClick: () => void; loading?: boolean }> = [];

    if (quote.status === 'DRAFT') {
      buttons.push({
        label: 'Editar',
        icon: Edit,
        onClick: handleEdit,
      });
      buttons.push({
        label: 'Enviar',
        icon: Send,
        onClick: handleSend,
        loading: sending,
      });
    } else if (quote.status === 'SENT') {
      buttons.push({
        label: 'Nueva Versión',
        icon: Copy,
        onClick: handleCreateNewVersion,
      });
      buttons.push({
        label: 'Facturar',
        icon: ReceiptIcon,
        onClick: handleInvoice,
      });
    } else if (quote.status === 'APPROVED' || quote.status === 'REJECTED') {
      buttons.push({
        label: 'Nueva Versión',
        icon: Copy,
        onClick: handleCreateNewVersion,
      });
    }

    return buttons;
  };

  const actionButtons = getActionButtons();

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
          
          {/* Columna central: Nombre del presupuesto */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium text-foreground truncate leading-tight">
              {quote.quote_number}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {client?.company_name || 'Sin cliente'}
            </p>
          </div>
          
          {/* Columna derecha: Botones de acción contextual (igual que desktop) */}
          {actionButtons.length > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {actionButtons.map((btn) => (
                <button
                  key={btn.label}
                  onClick={btn.onClick}
                  disabled={btn.loading}
                  className={cn(
                    "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full",
                    "text-sm font-medium whitespace-nowrap leading-none",
                    "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
                    "text-white/90 hover:text-white hover:bg-white/15",
                    "active:scale-95 transition-all duration-200",
                    "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]",
                    btn.loading && "opacity-50"
                  )}
                  style={{ touchAction: 'manipulation' }}
                  aria-label={btn.label}
                >
                  {btn.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <btn.icon className="h-4 w-4" />
                  )}
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
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
            quote={quote}
            client={client}
            project={project}
            statusInfo={statusInfo}
            availableStatuses={availableStatuses}
            updatingStatus={updatingStatus}
            onStatusChange={handleStatusChange}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
          />
        )}
        
        {activeTab === 'preview' && (
          <PreviewTab 
            quote={quote}
            lines={lines}
            client={client}
            company={company}
            project={project}
            fileName={fileName}
          />
        )}
        
        {activeTab === 'lineas' && (
          <LineasTab 
            lines={lines}
            isEditable={isEditable}
            onEdit={handleEdit}
            formatCurrency={formatCurrency}
          />
        )}
      </div>
    </div>
  );
};

// ===== COMPONENTES DE TABS =====

interface ResumenTabProps {
  quote: Quote;
  client: Client | null;
  project: Project | null;
  statusInfo: { label: string; className: string };
  availableStatuses: string[];
  updatingStatus: boolean;
  onStatusChange: (status: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | null | undefined) => string | null;
  expandedSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
}

const ResumenTab = ({
  quote,
  client,
  project,
  statusInfo,
  availableStatuses,
  updatingStatus,
  onStatusChange,
  formatCurrency,
  formatDate,
  expandedSections,
  onToggleSection,
}: ResumenTabProps) => {
  return (
    <div className="px-4 py-4 space-y-4">
      {/* ===== INFORMACIÓN DEL PRESUPUESTO ===== */}
      <SectionCard 
        title="Información del Presupuesto"
        isExpanded={expandedSections.info}
        onToggle={() => onToggleSection('info')}
      >
        <div className="space-y-4">
          {/* Número y estado */}
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground leading-tight">
              {quote.quote_number}
            </h3>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn(statusInfo.className, "text-xs px-2 py-0.5")}
              >
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          {/* Datos del presupuesto */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            {/* Cliente */}
            {client && (
              <InfoRow 
                icon={Building} 
                label="Cliente" 
                value={client.company_name}
                subValue={client.tax_id ? `NIF: ${client.tax_id}` : undefined}
              />
            )}

            {/* Proyecto */}
            {project && (
              <InfoRow 
                icon={FileText} 
                label="Proyecto" 
                value={`${project.project_name}${project.site_name ? ` — ${project.site_name}` : ''}`}
                subValue={project.project_number ? `#${project.project_number}` : undefined}
              />
            )}

            {/* Fecha de creación */}
            <InfoRow 
              icon={Calendar} 
              label="Fecha de Creación" 
              value={formatDate(quote.created_at) || '-'}
            />

            {/* Válido hasta */}
            {quote.valid_until && (
              <InfoRow 
                icon={Calendar} 
                label="Válido hasta" 
                value={formatDate(quote.valid_until) || '-'}
              />
            )}

            {/* Nº Pedido */}
            {quote.order_number && (
              <InfoRow 
                icon={Hash} 
                label="Nº Pedido" 
                value={quote.order_number}
              />
            )}
          </div>

          {/* Contacto del cliente */}
          {client && (client.contact_email || client.contact_phone) && (
            <div className="pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Contacto del Cliente
              </p>
              <div className="flex flex-wrap gap-2">
                {client.contact_email && (
                  <InfoChip icon={Mail} value={client.contact_email} href={`mailto:${client.contact_email}`} />
                )}
                {client.contact_phone && (
                  <InfoChip icon={Phone} value={client.contact_phone} href={`tel:${client.contact_phone}`} />
                )}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ===== MÉTRICAS FINANCIERAS ===== */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Subtotal"
          value={formatCurrency(quote.subtotal)}
          color="blue"
        />
        <MetricCard
          label="IVA"
          value={formatCurrency(quote.tax_amount)}
          color="orange"
        />
        <MetricCard
          label="Total"
          value={formatCurrency(quote.total)}
          color="green"
          colSpan={2}
        />
      </div>

      {/* ===== ESTADO (Desplegable) ===== */}
      <SectionCard 
        title="Estado"
        isExpanded={expandedSections.status}
        onToggle={() => onToggleSection('status')}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estado actual</span>
            <Badge 
              variant="outline" 
              className={cn(statusInfo.className, "text-xs px-3 py-1")}
            >
              {statusInfo.label}
            </Badge>
          </div>
          
          {availableStatuses.length > 1 && (
            <div className="pt-2 border-t border-border/50">
              <label className="text-xs text-muted-foreground mb-2 block">
                Cambiar estado
              </label>
              <Select
                value={quote.status}
                onValueChange={onStatusChange}
                disabled={updatingStatus}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((status) => {
                    const statusInfo = getQuoteStatusInfo(status);
                    return (
                      <SelectItem key={status} value={status}>
                        {statusInfo.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ===== NOTAS ===== */}
      {quote.notes && (
        <SectionCard 
          title="Notas"
          isExpanded={expandedSections.notes}
          onToggle={() => onToggleSection('notes')}
        >
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {quote.notes}
          </p>
        </SectionCard>
      )}
    </div>
  );
};

interface PreviewTabProps {
  quote: Quote;
  lines: QuoteLine[];
  client: Client | null;
  company: CompanySettings | null;
  project: Project | null;
  fileName: string;
}

const PreviewTab = ({ quote, lines, client, company, project, fileName }: PreviewTabProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generar el PDF como blob URL cuando el componente se monta
  useEffect(() => {
    let urlToRevoke: string | null = null;

    const generatePdf = async () => {
      if (!client || !company) {
        setError(true);
        setErrorMessage("Faltan datos del cliente o empresa");
        setLoadingPdf(false);
        return;
      }
      
      try {
        setLoadingPdf(true);
        setError(false);
        setErrorMessage(null);
        
        const pdfDocument = (
          <QuotePDFDocument
            quote={quote}
            lines={lines}
            client={client}
            company={company}
            project={project}
          />
        );
        
        const blob = await pdf(pdfDocument).toBlob();
        const url = URL.createObjectURL(blob);
        urlToRevoke = url;
        setPdfBlob(blob);
        setPdfUrl(url);
      } catch (err) {
        console.error("Error generating PDF:", err);
        setError(true);
        setErrorMessage(err instanceof Error ? err.message : "Error al generar el PDF");
      } finally {
        setLoadingPdf(false);
      }
    };

    generatePdf();

    return () => {
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [quote, lines, client, company, project]);

  const handleDownload = () => {
    if (pdfBlob) {
      setDownloading(true);
      try {
        saveAs(pdfBlob, fileName);
      } catch (err) {
        console.error("Error descargando PDF:", err);
        // Fallback: abrir en nueva pestaña (en iOS a veces es la única opción)
        if (pdfUrl) window.open(pdfUrl, "_blank");
      } finally {
        setDownloading(false);
      }
    }
  };

  if (!client || !company) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No se puede generar el PDF</p>
        <p className="text-muted-foreground text-sm">Faltan datos del cliente o empresa</p>
      </div>
    );
  }

  if (loadingPdf) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Generando PDF...</p>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center min-h-[300px]">
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Error al generar el PDF</p>
        {errorMessage && (
          <p className="text-muted-foreground text-xs mt-1 mb-4 max-w-xs truncate" title={errorMessage}>
            {errorMessage}
          </p>
        )}
        <p className="text-muted-foreground text-sm mb-4">Intenta descargar el PDF directamente</p>
        <PDFDownloadLink
          document={
            <QuotePDFDocument
              quote={quote}
              lines={lines}
              client={client}
              company={company}
              project={project}
            />
          }
          fileName={fileName}
        >
          {({ loading }) => (
            <button
              className={cn(
                "h-10 px-4 flex items-center justify-center gap-2 rounded-full",
                "text-sm font-medium",
                "bg-orange-500 hover:bg-orange-600 text-white",
                "active:scale-95 transition-all duration-200",
                loading && "opacity-50"
              )}
              style={{ touchAction: "manipulation" }}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Descargar PDF</span>
            </button>
          )}
        </PDFDownloadLink>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[400px] flex flex-col">
      {/* Barra de acciones */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => pdfUrl && window.open(pdfUrl, "_blank")}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
              "text-white/90 hover:text-white hover:bg-white/15",
              "active:scale-95 transition-all duration-200",
              "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]"
            )}
            style={{ touchAction: "manipulation" }}
          >
            <Eye className="h-4 w-4" />
            <span>Ver PDF</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={!pdfBlob || downloading}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-orange-500 hover:bg-orange-600 text-white",
              "active:scale-95 transition-all duration-200",
              (!pdfBlob || downloading) && "opacity-50"
            )}
            style={{ touchAction: "manipulation" }}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Descargar</span>
          </button>
        </div>
      </div>

      {/* En móvil el iframe puede no mostrar el PDF; ofrecemos fallback visible */}
      <div className="flex-1 min-h-[300px] flex flex-col gap-2 p-2">
        <div
          className={cn(
            "flex-shrink-0 px-4 py-3 rounded-lg",
            "bg-amber-500/10 border border-amber-500/30",
            "text-amber-200/90 text-sm"
          )}
        >
          <p className="mb-2">
            Si el PDF no se muestra aquí, usa el botón &quot;Ver PDF&quot; para abrirlo en una nueva pestaña.
          </p>
          <button
            onClick={() => pdfUrl && window.open(pdfUrl, "_blank")}
            className={cn(
              "h-9 px-4 flex items-center justify-center gap-2 rounded-full",
              "text-sm font-medium bg-amber-500/20 hover:bg-amber-500/30",
              "border border-amber-500/40 text-amber-100",
              "active:scale-95 transition-all"
            )}
            style={{ touchAction: "manipulation" }}
          >
            <Eye className="h-4 w-4" />
            Abrir PDF en nueva pestaña
          </button>
        </div>
        <div className="flex-1 min-h-[250px] bg-zinc-900 rounded-lg overflow-hidden">
          <iframe
            src={pdfUrl ?? undefined}
            className="w-full h-full min-h-[250px] rounded-lg border border-border"
            title="Vista previa del presupuesto"
          />
        </div>
      </div>
    </div>
  );
};

interface LineasTabProps {
  lines: QuoteLine[];
  isEditable: boolean;
  onEdit: () => void;
  formatCurrency: (amount: number) => string;
}

const LineasTab = ({ lines, isEditable, onEdit, formatCurrency }: LineasTabProps) => {
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">Líneas</h3>
        <p className="text-sm text-muted-foreground mb-4">No hay líneas en este presupuesto</p>
        {isEditable && (
          <button
            onClick={onEdit}
            className={cn(
              "h-10 px-4 flex items-center justify-center gap-2 rounded-full",
              "text-sm font-medium",
              "bg-primary text-primary-foreground",
              "active:scale-95 transition-all duration-200"
            )}
            style={{ touchAction: 'manipulation' }}
          >
            <Edit className="h-4 w-4" />
            <span>Añadir líneas</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Botón de editar líneas */}
      {isEditable && (
        <button
          onClick={onEdit}
          className={cn(
            "w-full h-12 flex items-center justify-center gap-2 rounded-xl",
            "text-sm font-medium",
            "bg-primary/10 border-2 border-dashed border-primary/30 text-primary",
            "hover:bg-primary/20 hover:border-primary/50",
            "active:scale-[0.98] transition-all duration-200"
          )}
          style={{ touchAction: 'manipulation' }}
        >
          <Edit className="h-4 w-4" />
          <span>Modificar líneas del presupuesto</span>
        </button>
      )}
      
      {lines
        .sort((a, b) => a.line_order - b.line_order)
        .map((line) => (
          <div
            key={line.id}
            className="bg-card border border-border rounded-xl p-3"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground mb-1">
                  {line.concept}
                </h4>
                {line.description && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {line.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Precio: {formatCurrency(line.unit_price)}</span>
                  {line.discount_percent > 0 && (
                    <>
                      <span>•</span>
                      <span>Descuento: {line.discount_percent}%</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(line.total)}
                </p>
              </div>
            </div>
            
            {/* Desglose: Cantidad, Impuesto, Total */}
            <div className="pt-2 border-t border-border/50">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground mb-0.5">Cantidad</p>
                  <p className="text-foreground font-medium">{line.quantity}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Impuesto</p>
                  <p className="text-foreground font-medium">
                    {formatCurrency(line.tax_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Total</p>
                  <p className="text-foreground font-semibold">
                    {formatCurrency(line.total)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

// ===== COMPONENTES AUXILIARES =====

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const SectionCard = ({ title, children, isExpanded = true, onToggle }: SectionCardProps) => (
  <div className="bg-card border border-border rounded-xl overflow-hidden">
    <button
      onClick={onToggle}
      className={cn(
        "w-full px-4 py-3 flex items-center justify-between",
        "text-xs font-medium text-muted-foreground uppercase tracking-wider",
        "hover:bg-white/5 transition-colors",
        !onToggle && "cursor-default"
      )}
      style={onToggle ? { touchAction: 'manipulation' } : undefined}
    >
      <span>{title}</span>
      {onToggle && (
        isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )
      )}
    </button>
    {isExpanded && (
      <div className="px-4 pb-4">
        {children}
      </div>
    )}
  </div>
);

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

interface MetricCardProps {
  label: string;
  value: string;
  color: 'blue' | 'green' | 'orange' | 'emerald' | 'red' | 'purple';
  colSpan?: number;
}

const MetricCard = ({ label, value, color, colSpan = 1 }: MetricCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    orange: 'bg-orange-500/10 text-orange-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    red: 'bg-red-500/10 text-red-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };

  // Icono según el tipo de métrica
  const getIcon = () => {
    if (label === 'Total') return TrendingUp;
    if (label === 'IVA') return Receipt;
    return FileText;
  };

  const Icon = getIcon();

  return (
    <div className={cn(
      "bg-card border border-border rounded-xl p-3",
      colSpan === 2 && "col-span-2"
    )}>
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

export default MobileQuoteDetailPage;
