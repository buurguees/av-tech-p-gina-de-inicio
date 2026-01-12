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
import { Loader2, FileText, Building2, User, FolderOpen, Calendar, Lock } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import NexoHeader from "./components/NexoHeader";
import InvoicePDFViewer from "./components/InvoicePDFViewer";

interface Invoice {
  id: string;
  invoice_number: string;
  source_quote_id: string | null;
  source_quote_number: string | null;
  client_id: string;
  client_name: string;
  project_id: string | null;
  project_name: string | null;
  status: string;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
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

const INVOICE_STATUSES = [
  { value: "DRAFT", label: "Borrador", className: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
  { value: "SENT", label: "Enviada", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { value: "PAID", label: "Pagada", className: "bg-green-500/20 text-green-300 border-green-500/30" },
  { value: "OVERDUE", label: "Vencida", className: "bg-red-500/20 text-red-300 border-red-500/30" },
  { value: "CANCELLED", label: "Cancelada", className: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
];

const getStatusInfo = (status: string) => {
  return INVOICE_STATUSES.find(s => s.value === status) || INVOICE_STATUSES[0];
};

// States that block editing
const LOCKED_STATES = ["SENT", "PAID", "OVERDUE", "CANCELLED"];

// States that allow status changes
const getAvailableStatusTransitions = (currentStatus: string) => {
  switch (currentStatus) {
    case "DRAFT":
      return ["DRAFT", "SENT"];
    case "SENT":
      return ["SENT", "PAID", "OVERDUE"];
    case "PAID":
      return ["PAID"]; // Cannot be changed
    case "OVERDUE":
      return ["OVERDUE", "PAID"];
    case "CANCELLED":
      return ["CANCELLED"]; // Cannot be changed
    default:
      return [currentStatus];
  }
};

const InvoiceDetailPage = () => {
  const navigate = useNavigate();
  const { userId, invoiceId } = useParams<{ userId: string; invoiceId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceData();
    }
  }, [invoiceId]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);

      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase.rpc("get_invoice", {
        p_invoice_id: invoiceId,
      });
      if (invoiceError) throw invoiceError;
      if (!invoiceData || invoiceData.length === 0) throw new Error("Factura no encontrada");
      
      const invoiceInfo = invoiceData[0];
      setInvoice(invoiceInfo);

      // Fetch invoice lines
      const { data: linesData, error: linesError } = await supabase.rpc("get_invoice_lines", {
        p_invoice_id: invoiceId,
      });
      if (linesError) throw linesError;
      setLines(linesData || []);

      // Fetch client details
      if (invoiceInfo.client_id) {
        const { data: clientData, error: clientError } = await supabase.rpc("get_client", {
          p_client_id: invoiceInfo.client_id,
        });
        if (!clientError && clientData && clientData.length > 0) {
          setClient(clientData[0]);
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
    
    setUpdatingStatus(true);
    try {
      const { error } = await supabase.rpc("update_invoice", {
        p_invoice_id: invoiceId!,
        p_status: newStatus,
      });
      
      if (error) throw error;
      
      await fetchInvoiceData();
      
      const statusLabel = getStatusInfo(newStatus).label;
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Check if invoice is locked
  const isLocked = invoice ? LOCKED_STATES.includes(invoice.status) : false;
  const availableTransitions = invoice ? getAvailableStatusTransitions(invoice.status) : [];
  const canChangeStatus = availableTransitions.length > 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <NexoHeader title="Factura" userId={userId || ""} />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-white/40" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-black">
        <NexoHeader title="Factura" userId={userId || ""} />
        <div className="flex flex-col items-center justify-center pt-32">
          <FileText className="h-16 w-16 text-white/20 mb-4" />
          <p className="text-white/60">Factura no encontrada</p>
          <Button
            variant="link"
            onClick={() => navigate(`/nexo-av/${userId}/invoices`)}
            className="text-orange-500 mt-2"
          >
            Volver a facturas
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(invoice.status);
  const pdfFileName = `${invoice.invoice_number}${invoice.project_name ? ` - ${invoice.project_name}` : ''}.pdf`;

  // Custom header with status badge for mobile
  const headerTitle = (
    <div className="flex items-center gap-2">
      <span>{invoice.invoice_number}</span>
      <Badge className={`${statusInfo.className} text-[9px] md:text-xs px-1.5 py-0`}>
        {statusInfo.label}
      </Badge>
      {isLocked && <Lock className="h-3 w-3 text-white/40" />}
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-mobile-nav">
      <NexoHeader 
        title={invoice.invoice_number} 
        userId={userId || ""} 
        customTitle={headerTitle}
      />

      <main className="container mx-auto px-3 md:px-4 pt-20 md:pt-24 pb-4 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Desktop Layout: Side by side */}
          <div className="hidden md:grid md:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
            {/* PDF Preview - Left (2/3) */}
            <div className="md:col-span-2 bg-white/5 rounded-xl border border-white/10 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <span className="text-white/60 text-sm font-medium">Vista previa</span>
                <span className="text-white/40 text-xs">{pdfFileName}</span>
              </div>
              <div className="flex-1 min-h-0">
                <InvoicePDFViewer
                  invoice={invoice}
                  lines={lines}
                  client={client}
                  company={company}
                  project={project}
                  fileName={pdfFileName}
                />
              </div>
            </div>

            {/* Info Panel - Right (1/3) */}
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-mono font-bold text-lg">{invoice.invoice_number}</h2>
                    {isLocked && <Lock className="h-4 w-4 text-white/40" />}
                  </div>
                  {/* Status selector or badge */}
                  {canChangeStatus ? (
                    <Select 
                      value={invoice.status} 
                      onValueChange={handleStatusChange}
                      disabled={updatingStatus}
                    >
                      <SelectTrigger className={`${statusInfo.className} border h-7 px-2 mt-1 w-auto min-w-[90px] text-xs font-medium rounded-md`}>
                        <SelectValue>
                          <span>{statusInfo.label}</span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 z-50">
                        {availableTransitions.map((status) => {
                          const info = getStatusInfo(status);
                          return (
                            <SelectItem key={status} value={status} className="text-white text-sm">
                              <span className={`${info.className} px-2 py-0.5 rounded text-xs`}>{info.label}</span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`${statusInfo.className} text-xs mt-1`}>
                      {statusInfo.label}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Locked message */}
                {isLocked && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-yellow-500 shrink-0" />
                    <p className="text-yellow-300/80 text-xs">
                      {invoice.status === "CANCELLED" 
                        ? "Esta factura ha sido cancelada"
                        : invoice.status === "PAID"
                        ? "Esta factura ya ha sido pagada"
                        : "Esta factura está bloqueada para edición"}
                    </p>
                  </div>
                )}

                {/* Source Quote Link */}
                {invoice.source_quote_number && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                    <p className="text-purple-300/80 text-xs">
                      Generada desde presupuesto: <span className="font-mono font-bold">{invoice.source_quote_number}</span>
                    </p>
                  </div>
                )}

                {/* Client info */}
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                    <Building2 className="h-4 w-4 text-orange-500" />
                    <span className="text-white/60 text-xs font-medium uppercase">Cliente</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">
                    {client?.company_name || invoice.client_name}
                  </h3>
                  {client?.legal_name && client.legal_name !== client.company_name && (
                    <p className="text-white/60 text-sm">{client.legal_name}</p>
                  )}
                  {client?.tax_id && (
                    <p className="text-white/50 text-xs mt-1">{client.tax_id}</p>
                  )}
                  {client?.billing_address && (
                    <p className="text-white/50 text-xs mt-1">
                      {client.billing_address}
                      {client.billing_city && `, ${client.billing_city}`}
                    </p>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate(`/nexo-av/${userId}/clients/${invoice.client_id}`)}
                    className="text-orange-500 p-0 h-auto text-xs mt-2"
                  >
                    Ver cliente →
                  </Button>
                </div>

                {/* Project info */}
                {project && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                      <FolderOpen className="h-4 w-4 text-orange-500" />
                      <span className="text-white/60 text-xs font-medium uppercase">Proyecto</span>
                    </div>
                    <h3 className="text-white font-semibold mb-1">{project.project_name}</h3>
                    <p className="text-white/50 text-xs font-mono">{project.project_number}</p>
                    {project.local_name && (
                      <p className="text-white/60 text-sm mt-1">Local: {project.local_name}</p>
                    )}
                    {project.project_address && (
                      <p className="text-white/50 text-xs mt-1">
                        {project.project_address}
                        {project.project_city && `, ${project.project_city}`}
                      </p>
                    )}
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigate(`/nexo-av/${userId}/projects/${invoice.project_id}`)}
                      className="text-orange-500 p-0 h-auto text-xs mt-2"
                    >
                      Ver proyecto →
                    </Button>
                  </div>
                )}

                {/* Invoice dates */}
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <span className="text-white/60 text-xs font-medium uppercase">Fechas</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-white/50 text-sm">Emisión:</span>
                      <span className="text-white text-sm">{formatDate(invoice.issue_date)}</span>
                    </div>
                    {invoice.due_date && (
                      <div className="flex justify-between">
                        <span className="text-white/50 text-sm">Vencimiento:</span>
                        <span className="text-white text-sm">{formatDate(invoice.due_date)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/50">Base imponible</span>
                      <span className="text-white">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Impuestos</span>
                      <span className="text-white">{formatCurrency(invoice.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/10">
                      <span className="text-white font-semibold">Total</span>
                      <span className="text-white font-bold text-lg">{formatCurrency(invoice.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                    <User className="h-4 w-4 text-orange-500" />
                    <span className="text-white/60 text-xs font-medium uppercase">Información</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/50">Creado por:</span>
                      <span className="text-white">{invoice.created_by_name || "Usuario"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Creado:</span>
                      <span className="text-white">{formatDate(invoice.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-4">
            {/* PDF Preview */}
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <span className="text-white/60 text-sm font-medium">Vista previa</span>
              </div>
              <div className="h-[400px]">
                <InvoicePDFViewer
                  invoice={invoice}
                  lines={lines}
                  client={client}
                  company={company}
                  project={project}
                  fileName={pdfFileName}
                />
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/50 text-xs mb-1">Estado</p>
                  {canChangeStatus ? (
                    <Select 
                      value={invoice.status} 
                      onValueChange={handleStatusChange}
                      disabled={updatingStatus}
                    >
                      <SelectTrigger className={`${statusInfo.className} border h-8 px-3 w-auto min-w-[100px] text-sm font-medium rounded-md`}>
                        <SelectValue>
                          <span>{statusInfo.label}</span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 z-50">
                        {availableTransitions.map((status) => {
                          const info = getStatusInfo(status);
                          return (
                            <SelectItem key={status} value={status} className="text-white text-sm">
                              <span className={`${info.className} px-2 py-0.5 rounded text-xs`}>{info.label}</span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`${statusInfo.className} text-sm`}>
                      {statusInfo.label}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-xs mb-1">Total</p>
                  <p className="text-white font-bold text-xl">{formatCurrency(invoice.total)}</p>
                </div>
              </div>
            </div>

            {/* Client Card */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-orange-500" />
                <span className="text-white/60 text-xs font-medium uppercase">Cliente</span>
              </div>
              <h3 className="text-white font-semibold">{client?.company_name || invoice.client_name}</h3>
              {client?.tax_id && <p className="text-white/50 text-xs mt-1">{client.tax_id}</p>}
            </div>

            {/* Dates Card */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-orange-500" />
                <span className="text-white/60 text-xs font-medium uppercase">Fechas</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/50 text-xs">Emisión</p>
                  <p className="text-white text-sm">{formatDate(invoice.issue_date)}</p>
                </div>
                {invoice.due_date && (
                  <div>
                    <p className="text-white/50 text-xs">Vencimiento</p>
                    <p className="text-white text-sm">{formatDate(invoice.due_date)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default InvoiceDetailPage;
