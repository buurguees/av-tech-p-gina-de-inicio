/**
 * MobileInvoiceDetailPage - Página de detalle de factura para móvil
 * VERSIÓN: 1.0 - SOLO CONSULTA (sin editar, cambiar estado, crear, etc.)
 * Las facturas solo se pueden modificar desde el ordenador
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
  EyeOff,
  Download,
  LayoutDashboard,
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
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSalesDocumentStatusInfo, calculateCollectionStatus, getCollectionStatusInfo } from "@/constants/salesInvoiceStatuses";
import { useToast } from "@/hooks/use-toast";
import { InvoicePDFDocument } from "@/pages/nexo_av/assets/plantillas";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";

interface Invoice {
  id: string;
  invoice_number: string | null;
  preliminary_number: string | null;
  client_id: string;
  client_name: string;
  project_id: string | null;
  project_name: string | null;
  project_number: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  issue_date: string | null;
  due_date: string | null;
  payment_terms: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  is_locked: boolean;
}

interface InvoiceLine {
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

interface CompanyPreferences {
  bank_accounts: any[];
  default_currency?: string;
  invoice_payment_days?: number;
  quote_validity_days?: number;
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

const MobileInvoiceDetailPage = () => {
  const { userId, invoiceId } = useParams<{ userId: string; invoiceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [preferences, setPreferences] = useState<CompanyPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('resumen');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceData();
    }
  }, [invoiceId]);

  const fetchInvoiceData = async () => {
    if (!invoiceId) return;
    
    try {
      setLoading(true);

      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase.rpc("finance_get_invoice", {
        p_invoice_id: invoiceId,
      });
      if (invoiceError) throw invoiceError;
      if (!invoiceData || (Array.isArray(invoiceData) && invoiceData.length === 0)) {
        throw new Error("Factura no encontrada");
      }

      const invoiceInfo = Array.isArray(invoiceData) ? invoiceData[0] : invoiceData;
      setInvoice(invoiceInfo);

      // Fetch invoice lines
      const { data: linesData, error: linesError } = await supabase.rpc("finance_get_invoice_lines", {
        p_invoice_id: invoiceId,
      });
      if (linesError) throw linesError;
      // Sort lines by line_order
      const sortedLines = (linesData || []).sort((a: any, b: any) =>
        (a.line_order || 0) - (b.line_order || 0)
      );
      setLines(sortedLines);

      // Fetch client details
      if (invoiceInfo.client_id) {
        const { data: clientData, error: clientError } = await supabase.rpc("get_client", {
          p_client_id: invoiceInfo.client_id,
        });
        if (!clientError && clientData) {
          const clientInfo = Array.isArray(clientData) ? clientData[0] : clientData;
          if (clientInfo) {
            setClient(clientInfo);
          }
        }
      }

      // Fetch project details if project exists
      if (invoiceInfo.project_id) {
        const { data: projectData, error: projectError } = await supabase.rpc("get_project", {
          p_project_id: invoiceInfo.project_id,
        });
        if (!projectError && projectData && projectData.length > 0) {
          setProject({
            project_number: projectData[0].project_number,
            project_name: projectData[0].project_name,
            project_address: projectData[0].project_address,
            project_city: projectData[0].project_city,
            local_name: projectData[0].local_name,
            client_order_number: projectData[0].client_order_number,
          });
        }
      }

      // Fetch company settings
      const { data: companyData, error: companyError } = await supabase.rpc("get_company_settings");
      if (!companyError && companyData && companyData.length > 0) {
        setCompany(companyData[0]);
      }

      // Fetch company preferences
      const { data: preferencesData, error: preferencesError } = await supabase.rpc("get_company_preferences");
      if (!preferencesError && preferencesData && Array.isArray(preferencesData) && preferencesData.length > 0) {
        const prefs = preferencesData[0];
        setPreferences({
          bank_accounts: Array.isArray(prefs?.bank_accounts) ? prefs.bank_accounts : [],
          default_currency: prefs?.default_currency,
          invoice_payment_days: prefs?.invoice_payment_days,
          quote_validity_days: prefs?.quote_validity_days,
        });
      }
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar la factura",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/nexo-av/${userId}/invoices`);
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

  if (!invoice) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">Factura no encontrada</p>
        <button
          onClick={handleBack}
          className="text-primary underline"
        >
          Volver a facturas
        </button>
      </div>
    );
  }

  const displayNumber = invoice.invoice_number || invoice.preliminary_number || 'Sin número';
  const docStatusInfo = getSalesDocumentStatusInfo(invoice.status);
  const collectionStatus = calculateCollectionStatus(
    invoice.paid_amount || 0,
    invoice.total || 0,
    invoice.due_date,
    invoice.status
  );
  const collectionInfo = getCollectionStatusInfo(collectionStatus);
  const fileName = `${displayNumber}.pdf`;

  return (
    <div className="w-full h-full flex flex-col">
      {/* ===== HEADER: 2 columnas (Atrás | Nombre) - SIN botón de acción ===== */}
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
          
          {/* Columna central: Nombre de la factura */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium text-foreground truncate leading-tight">
              {displayNumber}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {client?.company_name || 'Sin cliente'}
            </p>
          </div>
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
            invoice={invoice}
            client={client}
            project={project}
            docStatusInfo={docStatusInfo}
            collectionInfo={collectionInfo}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
          />
        )}
        
        {activeTab === 'preview' && (
          <PreviewTab 
            invoice={invoice}
            lines={lines}
            client={client}
            company={company}
            project={project}
            preferences={preferences}
            fileName={fileName}
          />
        )}
        
        {activeTab === 'lineas' && (
          <LineasTab 
            lines={lines}
            formatCurrency={formatCurrency}
          />
        )}
      </div>
    </div>
  );
};

// ===== COMPONENTES DE TABS =====

interface ResumenTabProps {
  invoice: Invoice;
  client: Client | null;
  project: Project | null;
  docStatusInfo: { label: string; className: string };
  collectionInfo: { label: string; className: string } | null;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | null | undefined) => string | null;
  expandedSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
}

const ResumenTab = ({
  invoice,
  client,
  project,
  docStatusInfo,
  collectionInfo,
  formatCurrency,
  formatDate,
  expandedSections,
  onToggleSection,
}: ResumenTabProps) => {
  const displayNumber = invoice.invoice_number || invoice.preliminary_number || 'Sin número';
  
  return (
    <div className="px-4 py-4 space-y-4">
      {/* ===== INFORMACIÓN DE LA FACTURA ===== */}
      <SectionCard 
        title="Información de la Factura"
        isExpanded={expandedSections.info}
        onToggle={() => onToggleSection('info')}
      >
        <div className="space-y-4">
          {/* Número y estado */}
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground leading-tight">
              {displayNumber}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant="outline" 
                className={cn(
                  "sales-status-badge sales-status-badge--document",
                  docStatusInfo.className, 
                  "text-xs px-2 py-0.5"
                )}
              >
                {docStatusInfo.label}
              </Badge>
              {collectionInfo && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "sales-status-badge sales-status-badge--collection",
                    collectionInfo.className,
                    "text-xs px-2 py-0.5"
                  )}
                >
                  {collectionInfo.label}
                </Badge>
              )}
            </div>
          </div>

          {/* Datos de la factura */}
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
                value={project.project_name}
                subValue={project.project_number ? `#${project.project_number}` : undefined}
              />
            )}

            {/* Fecha de emisión */}
            {invoice.issue_date && (
              <InfoRow 
                icon={Calendar} 
                label="Fecha de Emisión" 
                value={formatDate(invoice.issue_date) || '-'}
              />
            )}

            {/* Fecha de vencimiento */}
            {invoice.due_date && (
              <InfoRow 
                icon={Calendar} 
                label="Fecha de Vencimiento" 
                value={formatDate(invoice.due_date) || '-'}
              />
            )}

            {/* Términos de pago */}
            {invoice.payment_terms && (
              <InfoRow 
                icon={CreditCard} 
                label="Términos de Pago" 
                value={invoice.payment_terms}
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
          value={formatCurrency(invoice.subtotal)}
          color="blue"
        />
        <MetricCard
          label="IVA"
          value={formatCurrency(invoice.tax_amount)}
          color="orange"
        />
        {invoice.discount_amount > 0 && (
          <MetricCard
            label="Descuento"
            value={formatCurrency(invoice.discount_amount)}
            color="red"
          />
        )}
        <MetricCard
          label="Total"
          value={formatCurrency(invoice.total)}
          color="green"
          colSpan={invoice.discount_amount > 0 ? 1 : 2}
        />
      </div>

      {/* ===== ESTADO (SOLO LECTURA) ===== */}
      <SectionCard 
        title="Estado"
        isExpanded={expandedSections.status}
        onToggle={() => onToggleSection('status')}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estado del documento</span>
            <Badge 
              variant="outline" 
              className={cn(
                "sales-status-badge sales-status-badge--document",
                docStatusInfo.className, 
                "text-xs px-3 py-1"
              )}
            >
              {docStatusInfo.label}
            </Badge>
          </div>
          
          {collectionInfo && (
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado de cobro</span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "sales-status-badge sales-status-badge--collection",
                    collectionInfo.className,
                    "text-xs px-3 py-1"
                  )}
                >
                  {collectionInfo.label}
                </Badge>
              </div>
            </div>
          )}

          {/* Información de pago */}
          {invoice.paid_amount > 0 && (
            <div className="pt-2 border-t border-border/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pagado</span>
                <span className="text-foreground font-medium">{formatCurrency(invoice.paid_amount)}</span>
              </div>
              {invoice.pending_amount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pendiente</span>
                  <span className="text-foreground font-medium">{formatCurrency(invoice.pending_amount)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ===== NOTAS ===== */}
      {invoice.notes && (
        <SectionCard 
          title="Notas"
          isExpanded={expandedSections.notes}
          onToggle={() => onToggleSection('notes')}
        >
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {invoice.notes}
          </p>
        </SectionCard>
      )}
    </div>
  );
};

interface PreviewTabProps {
  invoice: Invoice;
  lines: InvoiceLine[];
  client: Client | null;
  company: CompanySettings | null;
  project: Project | null;
  preferences: CompanyPreferences | null;
  fileName: string;
}

const PreviewTab = ({ invoice, lines, client, company, project, preferences, fileName }: PreviewTabProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generar PDF como blob URL para mejor compatibilidad móvil
  useEffect(() => {
    let urlToRevoke: string | null = null;

    const generatePdf = async () => {
      if (!client || !company) {
        setError("Faltan datos del cliente o empresa");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const pdfDoc = (
          <InvoicePDFDocument
            invoice={invoice}
            lines={lines}
            client={client}
            company={company}
            project={project}
            preferences={preferences}
          />
        );
        
        const blob = await pdf(pdfDoc).toBlob();
        const url = URL.createObjectURL(blob);
        urlToRevoke = url;
        setPdfBlob(blob);
        setPdfUrl(url);
      } catch (err) {
        console.error("Error generating PDF:", err);
        setError("Error al generar el PDF");
      } finally {
        setLoading(false);
      }
    };

    generatePdf();

    return () => {
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [invoice, lines, client, company, project, preferences]);

  const handleDownload = () => {
    if (pdfBlob) {
      setDownloading(true);
      try {
        saveAs(pdfBlob, fileName);
      } catch (err) {
        console.error("Error descargando PDF:", err);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Loader2 className="h-16 w-16 text-orange-500 mb-4 animate-spin" />
        <p className="text-muted-foreground">Generando PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Barra de acciones */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => pdfUrl && window.open(pdfUrl, "_blank")}
            disabled={!pdfUrl}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
              "text-white/90 hover:text-white hover:bg-white/15",
              "active:scale-95 transition-all duration-200",
              "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]",
              !pdfUrl && "opacity-50"
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
      <div className="flex-1 min-h-0 flex flex-col gap-2 p-2">
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
            disabled={!pdfUrl}
            className={cn(
              "h-9 px-4 flex items-center justify-center gap-2 rounded-full",
              "text-sm font-medium bg-amber-500/20 hover:bg-amber-500/30",
              "border border-amber-500/40 text-amber-100",
              "active:scale-95 transition-all",
              !pdfUrl && "opacity-50"
            )}
            style={{ touchAction: "manipulation" }}
          >
            <Eye className="h-4 w-4" />
            Abrir PDF en nueva pestaña
          </button>
        </div>
        <div className="flex-1 min-h-0 bg-gray-800 rounded-lg overflow-hidden">
          <iframe
            src={pdfUrl ?? undefined}
            className="w-full h-full rounded-lg border-0"
            title="Vista previa de factura"
          />
        </div>
      </div>
    </div>
  );
};

interface LineasTabProps {
  lines: InvoiceLine[];
  formatCurrency: (amount: number) => string;
}

const LineasTab = ({ lines, formatCurrency }: LineasTabProps) => {
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">Líneas</h3>
        <p className="text-sm text-muted-foreground">No hay líneas en esta factura</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-2">
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
    if (label === 'Descuento') return TrendingUp;
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

export default MobileInvoiceDetailPage;
