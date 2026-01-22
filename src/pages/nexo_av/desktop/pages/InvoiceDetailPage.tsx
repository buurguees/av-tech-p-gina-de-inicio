import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Edit, Trash2, FileText, Building2, User, FolderOpen, Calendar, Copy, Receipt, MessageSquare, Clock, Send, MoreVertical, Share2, Save, LayoutDashboard, Mail, CheckCircle2, FolderKanban, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import TabNav, { TabItem } from "../components/navigation/TabNav";
import { DetailInfoBlock, DetailInfoHeader, DetailInfoSummary, MetricCard } from "../components/detail";
import StatusSelector from "../components/common/StatusSelector";
import DocumentPDFViewer from "../components/common/DocumentPDFViewer";
import LockedIndicator from "../components/common/LockedIndicator";
import DetailActionButton from "../components/navigation/DetailActionButton";
import { InvoicePDFDocument } from "../components/invoices/InvoicePDFViewer";
import { FINANCE_INVOICE_STATUSES, getFinanceStatusInfo, LOCKED_FINANCE_INVOICE_STATES } from "@/constants/financeStatuses";


interface Invoice {
  id: string;
  invoice_number: string | null;
  preliminary_number: string | null;
  client_id: string;
  client_name: string;
  project_name: string | null;
  project_id?: string | null;
  client_order_number: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  issue_date: string | null;
  due_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  is_locked: boolean;
}

interface Project {
  project_number: string;
  project_name: string;
  project_address: string | null;
  project_city: string | null;
  local_name: string | null;
  client_order_number: string | null;
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
}

// States that allow status changes
const getAvailableStatusTransitions = (currentStatus: string) => {
  switch (currentStatus) {
    case "DRAFT":
      return ["DRAFT", "ISSUED"];
    case "ISSUED":
      return ["ISSUED", "CANCELLED"];
    case "PARTIAL":
      return ["PARTIAL", "PAID", "CANCELLED"];
    case "PAID":
      return ["PAID"]; // Cannot be changed
    case "OVERDUE":
      return ["OVERDUE", "PAID", "PARTIAL", "CANCELLED"];
    case "CANCELLED":
      return ["CANCELLED"]; // Cannot be changed
    default:
      return [currentStatus];
  }
};

const InvoiceDetailPageDesktop = () => {
  const navigate = useNavigate();
  const { userId, invoiceId } = useParams<{ userId: string; invoiceId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [preferences, setPreferences] = useState<CompanyPreferences | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentNote, setCurrentNote] = useState("");
  const [savedNotes, setSavedNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState("resumen");

  const tabs: TabItem[] = [
    { value: "resumen", label: "Resumen", icon: LayoutDashboard },
    { value: "lineas", label: "Lineas", icon: FileText },
    { value: "auditoria", label: "Auditoria", icon: Clock },
  ];

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceData();
      fetchSavedNotes();
    }
  }, [invoiceId]);

  useEffect(() => {
    if (invoice) {
      setCurrentNote(invoice.notes || "");
    }
  }, [invoice]);

  const fetchInvoiceData = async () => {
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
        if (!projectError && projectData) {
          const projectInfo = Array.isArray(projectData) ? projectData[0] : projectData;
          if (projectInfo) {
            setProject({
              project_number: projectInfo.project_number,
              project_name: projectInfo.project_name,
              project_address: projectInfo.project_address,
              project_city: projectInfo.project_city,
              local_name: projectInfo.local_name,
              client_order_number: projectInfo.client_order_number,
            });
          }
        }
      }

      // Fetch company settings
      const { data: companyData, error: companyError } = await supabase.rpc("get_company_settings");
      if (!companyError && companyData) {
        const companyInfo = Array.isArray(companyData) ? companyData[0] : companyData;
        if (companyInfo) {
          setCompany(companyInfo);
        }
      }

      // Fetch company preferences (for bank accounts)
      const { data: preferencesData } = await supabase.rpc("get_company_preferences");
      if (preferencesData) {
        const prefs = Array.isArray(preferencesData) ? preferencesData[0] : preferencesData;
        setPreferences({
          bank_accounts: Array.isArray(prefs?.bank_accounts) ? prefs.bank_accounts : []
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

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice || newStatus === invoice.status) return;

    // If changing from DRAFT to ISSUED, use the issue function
    if (invoice.status === "DRAFT" && newStatus === "ISSUED") {
      return handleIssueInvoice();
    }

    setUpdatingStatus(true);
    try {
      const { error } = await supabase.rpc("finance_update_invoice", {
        p_invoice_id: invoiceId!,
        p_status: newStatus,
      });

      if (error) throw error;

      // Refetch invoice to get updated data
      await fetchInvoiceData();

      const statusLabel = getFinanceStatusInfo(newStatus).label;
      toast({
        title: "Estado actualizado",
        description: `La factura ahora está "${statusLabel}"`,
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

  const handleIssueInvoice = async () => {
    if (!invoice || invoice.status !== "DRAFT") return;

    setUpdatingStatus(true);
    try {
      const { error } = await supabase.rpc("finance_issue_invoice", {
        p_invoice_id: invoiceId!,
      });

      if (error) throw error;

      // Refetch invoice to get updated number
      await fetchInvoiceData();

      toast({
        title: "Factura emitida",
        description: "La factura se ha bloqueado y se ha asignado el número definitivo",
      });
    } catch (error: any) {
      console.error("Error issuing invoice:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo emitir la factura",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice || invoice.status !== "DRAFT") return;

    try {
      setDeleting(true);

      // First delete all invoice lines
      for (const line of lines) {
        await supabase.rpc("finance_delete_invoice_line", { p_line_id: line.id });
      }

      // Then cancel/delete the invoice
      const { error } = await supabase.rpc("finance_cancel_invoice", {
        p_invoice_id: invoiceId!,
        p_reason: "Borrador eliminado por el usuario",
      });

      if (error) throw error;

      toast({
        title: "Factura eliminada",
        description: `La factura ${invoice.preliminary_number || invoice.invoice_number} ha sido eliminada`,
      });
      navigate(`/nexo-av/${userId}/invoices`);
    } catch (error: any) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la factura",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const fetchSavedNotes = async () => {
    if (!invoiceId) return;
    try {
      setLoadingNotes(true);
      // TODO: Implementar notas de facturas si es necesario
      setSavedNotes([]);
    } catch (error: any) {
      console.error("Error fetching saved notes:", error);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleSaveNote = async () => {
    if (!currentNote.trim() || !invoiceId) {
      toast({
        title: "Error",
        description: "La nota no puede estar vacía",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      // TODO: Implementar guardado de notas si es necesario
      toast({
        title: "Nota",
        description: "Funcionalidad de notas temporalmente deshabilitada. Se implementará próximamente.",
      });
      setCurrentNote("");
    } catch (error: any) {
      console.error("Error saving note:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la nota",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Check if invoice is locked
  const isLocked = invoice ? (invoice.is_locked || LOCKED_FINANCE_INVOICE_STATES.includes(invoice.status)) : false;
  const canDelete = invoice?.status === "DRAFT";
  const isPreliminaryNumber = invoice?.preliminary_number && !invoice?.invoice_number;
  const hasFinalNumber = invoice?.invoice_number && !isPreliminaryNumber;
  const availableTransitions = invoice ? getAvailableStatusTransitions(invoice.status) : [];
  const canChangeStatus = availableTransitions.length > 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Factura no encontrada</p>
        <Button
          variant="link"
          onClick={() => navigate(`/nexo-av/${userId}/invoices`)}
          className="text-primary mt-2"
        >
          Volver a facturas
        </Button>
      </div>
    );
  }

  const statusInfo = getFinanceStatusInfo(invoice.status);
  const displayNumber = hasFinalNumber ? invoice.invoice_number : `(${invoice.preliminary_number || invoice.invoice_number || "Sin número"})`;
  
  // Generar nombre del archivo PDF: "Nombre Empresa - Nº Factura - Nombre Proyecto"
  // Sanitizar el nombre para evitar caracteres problemáticos en nombres de archivo
  const sanitizeFileName = (name: string) => {
    return name.replace(/[<>:"/\\|?*]/g, '').trim();
  };
  
  const companyName = sanitizeFileName(company?.legal_name || company?.commercial_name || 'Empresa');
  const invoiceNumber = invoice.invoice_number || invoice.preliminary_number || 'factura';
  const projectName = project?.project_name || invoice.project_name || '';
  const pdfFileNameParts = [
    companyName,
    invoiceNumber,
    ...(projectName ? [sanitizeFileName(projectName)] : [])
  ];
  const pdfFileName = `${pdfFileNameParts.join(' - ')}.pdf`;

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar
        pageTitle="Detalle de Factura"
        contextInfo={
          <div className="flex items-center gap-2">
            <span>{client?.company_name || invoice.client_name} - Factura {displayNumber}</span>
            <LockedIndicator isLocked={isLocked} />
          </div>
        }
        backPath={userId ? `/nexo-av/${userId}/invoices` : undefined}
        tools={
          <div className="flex items-center gap-2">
            {/* Estado DRAFT: mostrar "Editar" y "Emitir" */}
            {invoice?.status === "DRAFT" && (
              <>
                <DetailActionButton
                  actionType="edit"
                  onClick={() => navigate(`/nexo-av/${userId}/invoices/${invoiceId}/edit`)}
                />
                <DetailActionButton
                  actionType="send"
                  onClick={handleIssueInvoice}
                  disabled={updatingStatus}
                />
              </>
            )}

            {/* Estado ISSUED: mostrar acciones según necesidad */}
            {invoice?.status === "ISSUED" && (
              <>
                {/* Puedes agregar más acciones aquí si es necesario */}
              </>
            )}
          </div>
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
              <div className="w-full h-full px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Desktop Layout: PDF Preview */}
                  <div className="hidden md:block bg-white/5 border border-white/10 overflow-hidden flex flex-col h-[calc(100vh-180px)]">
                    <DocumentPDFViewer
                      document={
                        <InvoicePDFDocument
                          invoice={invoice}
                          lines={lines}
                          client={client}
                          company={company}
                          project={project}
                          preferences={preferences}
                        />
                      }
                      fileName={pdfFileName.replace('.pdf', '')}
                      defaultShowPreview={true}
                      showToolbar={false}
                      className="h-full"
                    />
                  </div>
                </motion.div>
              </div>
            )}
            {activeTab === "lineas" && (
              <div className="p-6">
                <p className="text-muted-foreground">Lineas - Se trabajará más adelante</p>
              </div>
            )}
            {activeTab === "auditoria" && (
              <div className="p-6">
                <p className="text-muted-foreground">Auditoria - Se trabajará más adelante</p>
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha - DetailInfoBlock */}
        <div className="w-[20rem] flex-shrink-0 border-l border-border h-full">
          <div className="h-full">
            <DetailInfoBlock
              header={
                <DetailInfoHeader
                  title={invoice ? (client?.company_name || invoice.client_name) : "Cargando..."}
                  subtitle={client?.legal_name && client?.company_name !== client?.legal_name ? client.legal_name : undefined}
                >
                  <div className="flex flex-col gap-2 mt-2">
                    {client?.tax_id && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground" />
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
                  
                  {/* Estado de la Factura */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground uppercase font-medium">Estado de la Factura</span>
                      <StatusSelector
                        currentStatus={invoice?.status || "DRAFT"}
                        statusOptions={FINANCE_INVOICE_STATUSES.map(status => ({
                          value: status.value,
                          label: status.label,
                          className: status.className,
                          color: status.color,
                        }))}
                        onStatusChange={(newStatus) => {
                          if (invoice && newStatus !== invoice.status) {
                            handleStatusChange(newStatus);
                          }
                        }}
                        size="md"
                      />
                    </div>
                  </div>
                </DetailInfoHeader>
              }
              summary={
                <DetailInfoSummary columns={2}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2">
                      <FolderKanban className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Nombre del proyecto</p>
                        <p className="text-sm font-medium">
                          {project?.project_name || invoice?.project_name || "Sin proyecto asignado"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Creador de la Factura</p>
                        <p className="text-sm font-medium">
                          {invoice?.created_by_name || "Usuario"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Fecha de Emisión</p>
                        <p className="text-sm font-medium">
                          {invoice ? formatDate(invoice.issue_date) : "N/A"}
                        </p>
                      </div>
                    </div>
                    
                    {invoice?.due_date && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Fecha de Vencimiento</p>
                          <p className="text-sm font-medium">
                            {formatDate(invoice.due_date)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </DetailInfoSummary>
              }
              content={
                <div className="flex flex-col gap-3">
                  <MetricCard
                    title="Subtotal"
                    value={formatCurrency(invoice?.subtotal || 0)}
                    icon={FileText}
                  />
                  <MetricCard
                    title="Impuestos"
                    value={formatCurrency(invoice?.tax_amount || 0)}
                    icon={Receipt}
                  />
                  <MetricCard
                    title="Total"
                    value={formatCurrency(invoice?.total || 0)}
                    icon={TrendingUp}
                  />
                  {invoice?.status !== "DRAFT" && (
                    <>
                      <MetricCard
                        title="Pagado"
                        value={formatCurrency(invoice?.paid_amount || 0)}
                        icon={CheckCircle2}
                      />
                      <MetricCard
                        title="Pendiente"
                        value={formatCurrency(invoice?.pending_amount || 0)}
                        icon={Clock}
                      />
                    </>
                  )}
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailPageDesktop;
