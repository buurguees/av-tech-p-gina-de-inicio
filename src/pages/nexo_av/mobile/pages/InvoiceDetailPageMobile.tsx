/**
 * InvoiceDetailPageMobile
 * 
 * Versión optimizada para móviles de la página de detalle de factura.
 * Diseñada para visualización rápida con PDF bajo demanda.
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Edit, 
  Building2, 
  User, 
  FolderOpen, 
  Calendar, 
  FileText, 
  Lock,
  ExternalLink,
  Phone,
  Mail,
  Receipt
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import MobileBottomNav from "../components/MobileBottomNav";
import InvoicePaymentsSection from "../components/InvoicePaymentsSection";
import { getFinanceStatusInfo, LOCKED_FINANCE_INVOICE_STATES } from "@/constants/financeStatuses";
import { NexoLogo } from "../components/NexoHeader";
import { InvoicePDFDocument } from "../components/InvoicePDFViewer";
import { pdf } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string | null;
  preliminary_number: string | null;
  client_id: string;
  project_id: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  issue_date: string | null;
  due_date: string | null;
  notes: string | null;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
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
  billing_province: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
}

interface Company {
  id: string;
  name: string;
  legal_name: string;
  tax_id: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
}

const InvoiceDetailPageMobile = () => {
  const navigate = useNavigate();
  const { userId, invoiceId } = useParams<{ userId: string; invoiceId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [showPDF, setShowPDF] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceData();
    }
  }, [invoiceId]);

  const generatePDFBlob = async () => {
    if (!invoice || !client || !company || lines.length === 0) return;

    try {
      const doc = (
        <InvoicePDFDocument
          invoice={invoice}
          lines={lines}
          client={client}
          company={company}
          project={project}
          preferences={preferences}
        />
      );
      const asBlob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(asBlob);
      setPdfBlobUrl(url);
    } catch (error) {
      console.error("Error generating PDF blob:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (showPDF && invoice && client && company && lines.length > 0 && preferences !== null) {
      generatePDFBlob();
    }
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    };
  }, [showPDF]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);

      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase.rpc(
        "finance_get_invoice" as any,
        { p_invoice_id: invoiceId }
      );

      if (invoiceError) throw invoiceError;
      
      const invoiceRecord = Array.isArray(invoiceData) ? invoiceData[0] : invoiceData;
      if (!invoiceRecord) throw new Error("Factura no encontrada");

      setInvoice(invoiceRecord);

      // Fetch invoice lines
      const { data: linesData, error: linesError } = await supabase.rpc(
        "finance_get_invoice_lines" as any,
        { p_invoice_id: invoiceId }
      );

      if (!linesError && linesData) {
        const sortedLines = (linesData || []).sort((a: any, b: any) => 
          (a.line_order || 0) - (b.line_order || 0)
        );
        setLines(sortedLines);
      }

      // Fetch client
      if (invoiceRecord.client_id) {
        const { data: clientData } = await supabase.rpc("get_client", {
          p_client_id: invoiceRecord.client_id,
        });
        if (clientData) {
          setClient(Array.isArray(clientData) ? clientData[0] : clientData);
        }
      }

      // Fetch company info
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .limit(1)
        .single();
      if (companyData) {
        setCompany(companyData);
      }

      // Fetch project if exists
      if (invoiceRecord.project_id) {
        const { data: projectData } = await supabase
          .from("projects")
          .select("id, name, description")
          .eq("id", invoiceRecord.project_id)
          .single();
        if (projectData) {
          setProject(projectData);
        }
      }

      // Fetch preferences
      const { data: prefsData } = await supabase
        .from("finance_preferences")
        .select("*")
        .limit(1)
        .single();
      if (prefsData) {
        setPreferences(prefsData);
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


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <NexoLogo />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Factura no encontrada</h2>
          <Button
            onClick={() => navigate(`/nexo-av/${userId}/invoices`)}
            className="bg-white text-black hover:bg-white/90 mt-4"
          >
            Volver a Facturas
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = getFinanceStatusInfo(invoice.status);
  const isLocked = invoice.is_locked || LOCKED_FINANCE_INVOICE_STATES.includes(invoice.status);
  const displayNumber = invoice.invoice_number || invoice.preliminary_number;

  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <main className="px-3 py-3 space-y-3">
        {/* Estado y Acciones Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {/* Estado Actual - Solo visualización */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Estado</span>
                <Badge className={statusInfo.className}>
                  {isLocked && <Lock className="w-3 h-3 mr-1" />}
                  {statusInfo.label}
                </Badge>
              </div>
              
              {isLocked && (
                <div className="flex items-center gap-2 text-white/40 text-xs mt-2">
                  <Lock className="h-3 w-3" />
                  <span>Esta factura está bloqueada</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botones de Acción */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setShowPDF(!showPDF)}
              className="bg-white/10 text-white hover:bg-white/20 border border-white/20 h-11"
            >
              <FileText className="h-4 w-4 mr-2" />
              {showPDF ? "Ocultar PDF" : "Ver PDF"}
            </Button>
            
            {invoice.status === "DRAFT" && (
              <Button
                onClick={() => navigate(`/nexo-av/${userId}/invoices/${invoiceId}/edit`)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 h-11"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </motion.div>

        {/* PDF Viewer - Mejorado para móvil */}
        {showPDF && invoice && client && company && lines.length > 0 && preferences !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl overflow-hidden border border-white/10 bg-white/5"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
              <span className="text-white/60 text-xs">Vista Previa PDF</span>
              <div className="flex items-center gap-2">
                {pdfBlobUrl ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-white/60 hover:text-white gap-1.5"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = pdfBlobUrl;
                      link.download = `Factura-${displayNumber}.pdf`;
                      link.click();
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="text-xs">Descargar</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-white/60 gap-1.5"
                    disabled
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-xs">Generando...</span>
                  </Button>
                )}
              </div>
            </div>
            <div className="h-[500px] bg-zinc-900">
              {pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-white/40" />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Información de la Factura */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {/* Total */}
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <span className="text-white/60">Total</span>
                <span className="text-white font-bold text-lg">{formatCurrency(invoice.total)}</span>
              </div>

              {/* Pagos */}
              {invoice.paid_amount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Pagado</span>
                  <span className="text-white font-medium">{formatCurrency(invoice.paid_amount)}</span>
                </div>
              )}

              {invoice.pending_amount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Pendiente</span>
                  <span className="text-white font-medium">{formatCurrency(invoice.pending_amount)}</span>
                </div>
              )}

              {/* Cliente */}
              {client && (
                <div className="flex items-start justify-between gap-2 pt-2 border-t border-white/10">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Building2 className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/60 text-xs mb-0.5">Cliente</p>
                      <p className="text-white font-medium truncate">{client.company_name}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/nexo-av/${userId}/clients/${invoice.client_id}`)}
                    className="shrink-0 h-8 px-2"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Contacto del Cliente */}
              {client && (
                <div className="space-y-2 pl-6">
                  {client.contact_phone && (
                    <a 
                      href={`tel:${client.contact_phone}`}
                      className="flex items-center gap-2 text-white/60 active:text-white text-xs"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{client.contact_phone}</span>
                    </a>
                  )}
                  {client.contact_email && (
                    <a 
                      href={`mailto:${client.contact_email}`}
                      className="flex items-center gap-2 text-white/60 active:text-white text-xs"
                    >
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{client.contact_email}</span>
                    </a>
                  )}
                </div>
              )}

              {/* Proyecto */}
              {project ? (
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <FolderOpen className="h-4 w-4 text-white/40 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/60 text-xs mb-0.5">Proyecto</p>
                    <p className="text-white font-medium truncate">{project.name}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/nexo-av/${userId}/projects/${invoice.project_id}`)}
                    className="shrink-0 h-8 px-2"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <FolderOpen className="h-4 w-4 text-white/40 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/60 text-xs mb-0.5">Proyecto</p>
                    <p className="text-white/40 text-xs">Sin proyecto asignado</p>
                  </div>
                </div>
              )}

              {/* Fechas - Solo vencimiento si existe */}
              {invoice.due_date && (
                <div className="flex items-start gap-2 pt-2 border-t border-white/10">
                  <Calendar className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-white/60 text-xs mb-0.5">Vencimiento</p>
                    <p className="text-white text-xs">{formatDate(invoice.due_date)}</p>
                  </div>
                </div>
              )}

              {/* Subtotal e Impuestos - Compacto */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex justify-between text-xs text-white/60">
                  <span>Subtotal: {formatCurrency(invoice.subtotal)}</span>
                  <span>IVA: {formatCurrency(invoice.tax_amount)}</span>
                </div>
              </div>

              {/* Notas */}
              {invoice.notes && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-white/60 text-xs mb-1">Notas</p>
                  <p className="text-white/80 text-sm">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Líneas de Factura */}
        {lines.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base">Líneas ({lines.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lines.map((line, index) => (
                  <div key={line.id} className="pb-2 border-b border-white/5 last:border-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-white font-medium text-sm flex-1">{line.description || 'Sin descripción'}</p>
                      <p className="text-white font-semibold text-sm ml-2">{formatCurrency(line.total)}</p>
                    </div>
                    <div className="flex justify-between text-xs text-white/60">
                      <span>{line.quantity} x {formatCurrency(line.unit_price)}</span>
                      {line.tax_rate > 0 && <span>IVA {line.tax_rate}%</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pagos */}
        <InvoicePaymentsSection
          invoiceId={invoiceId!}
          total={invoice.total}
          paidAmount={invoice.paid_amount}
          pendingAmount={invoice.pending_amount}
          status={invoice.status}
          isLocked={invoice.is_locked}
          onPaymentChange={fetchInvoiceData}
        />
      </main>

      <MobileBottomNav userId={userId || ''} />
    </div>
  );
};

export default InvoiceDetailPageMobile;
