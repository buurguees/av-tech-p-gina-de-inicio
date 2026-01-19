import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  TrendingDown,
  Download,
  Eye,
  Euro,
  Info,
  Edit,
  Loader2,
  Truck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  document_type: string;
  issue_date: string;
  due_date: string | null;
  tax_base: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  provider_id: string;
  provider_name: string;
  provider_type: string;
  provider_tax_id: string;
  file_path: string | null;
  file_name: string | null;
  project_id: string | null;
  project_name: string | null;
  expense_category: string | null;
  is_locked: boolean;
  created_at: string;
}

interface PurchaseInvoiceLine {
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
}

const PurchaseInvoiceDetailPageMobile = () => {
  const { userId, invoiceId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [lines, setLines] = useState<PurchaseInvoiceLine[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const fetchInvoiceData = async () => {
    if (!invoiceId) return;
    try {
      setLoading(true);
      // Obtener factura usando list_purchase_invoices pero filtrando por ID
      const { data: invoiceData, error: invoiceError } = await supabase.rpc("list_purchase_invoices", {
        p_search: invoiceId,
        p_page_size: 1
      });

      if (invoiceError) throw invoiceError;
      const record = invoiceData?.[0];
      if (!record) {
        toast.error("Documento no encontrado");
        navigate(`/nexo-av/${userId}/purchase-invoices`);
        return;
      }
      setInvoice(record);

      // Líneas usando RPC
      const { data: linesData, error: linesError } = await supabase
        .rpc('get_purchase_invoice_lines', {
          p_invoice_id: invoiceId
        });

      if (linesError) throw linesError;
      setLines(linesData || []);

      // Obtener URL del PDF si existe
      if (record.file_path) {
        const { data: urlData } = await supabase.storage
          .from('purchase-documents')
          .createSignedUrl(record.file_path, 3600);
        if (urlData) {
          setPdfUrl(urlData.signedUrl);
        }
      }
    } catch (error: any) {
      console.error("Error fetching purchase invoice:", error);
      toast.error("Error al cargar los detalles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceData();
  }, [invoiceId]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PARTIAL':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'PENDING':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">Documento no encontrado</p>
        <Button onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices`)}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-20">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {invoice.document_type === 'INVOICE' ? (
                <FileText className="h-4 w-4 shrink-0 text-blue-400" />
              ) : (
                <TrendingDown className="h-4 w-4 shrink-0 text-amber-400" />
              )}
              <h1 className="font-semibold text-base truncate">
                {invoice.document_type === 'INVOICE' ? 'Factura de Compra' : 'Gasto / Ticket'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{invoice.invoice_number}</span>
              <Badge className={cn("text-xs px-2 py-0.5 border", getStatusColor(invoice.status))}>
                {invoice.status}
              </Badge>
            </div>
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9"
            onClick={() => {
              // TODO: Implementar edición en FASE 2
              toast.info("Funcionalidad de edición en desarrollo");
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-2 mt-3">
          {pdfUrl && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => window.open(pdfUrl, '_blank')}
            >
              <Eye className="h-4 w-4" />
              Ver PDF
            </Button>
          )}
          {pdfUrl && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => {
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.download = invoice.file_name || 'documento.pdf';
                link.click();
              }}
            >
              <Download className="h-4 w-4" />
              Descargar
            </Button>
          )}
        </div>
      </div>

      {/* Content scrollable */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Totals Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Base Imponible</span>
              <span className="font-semibold">{formatCurrency(invoice.tax_base || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">IVA</span>
              <span className="font-semibold">{formatCurrency(invoice.tax_amount || 0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-end pt-2">
              <span className="text-sm font-medium">Total</span>
              <span className="text-2xl font-bold">{formatCurrency(invoice.total || 0)}</span>
            </div>
            {(invoice.pending_amount || 0) > 0 && (
              <div className="mt-4 bg-red-500/5 border border-red-500/10 p-3 rounded-lg flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-xs font-medium text-red-400">Pendiente de Pago</span>
                </div>
                <span className="text-sm font-bold text-red-400">{formatCurrency(invoice.pending_amount || 0)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Provider Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {invoice.provider_type === 'TECHNICIAN' ? (
                <UserRound className="h-4 w-4" />
              ) : (
                <Truck className="h-4 w-4" />
              )}
              {invoice.provider_type === 'TECHNICIAN' ? 'Técnico' : 'Proveedor'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Nombre</p>
              <p className="font-medium">{invoice.provider_name}</p>
            </div>
            {invoice.provider_tax_id && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">NIF/CIF</p>
                <p className="font-mono text-sm">{invoice.provider_tax_id}</p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => {
                if (invoice.provider_type === 'TECHNICIAN') {
                  navigate(`/nexo-av/${userId}/technicians/${invoice.provider_id}`);
                } else {
                  navigate(`/nexo-av/${userId}/suppliers/${invoice.provider_id}`);
                }
              }}
            >
              Ver {invoice.provider_type === 'TECHNICIAN' ? 'técnico' : 'proveedor'}
            </Button>
          </CardContent>
        </Card>

        {/* Project Info */}
        {invoice.project_name && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{invoice.project_name}</p>
              {invoice.project_id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => navigate(`/nexo-av/${userId}/projects/${invoice.project_id}`)}
                >
                  Ver proyecto
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fechas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Fecha de emisión</p>
              <p className="font-medium">{formatDate(invoice.issue_date)}</p>
            </div>
            {invoice.due_date && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Fecha de vencimiento</p>
                <p className={cn(
                  "font-medium",
                  new Date(invoice.due_date) < new Date() && invoice.pending_amount > 0
                    ? "text-red-400"
                    : ""
                )}>
                  {formatDate(invoice.due_date)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lines */}
        {lines.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Conceptos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lines.map((line) => (
                <div key={line.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{line.concept}</p>
                      {line.description && (
                        <p className="text-xs text-muted-foreground mt-1">{line.description}</p>
                      )}
                    </div>
                    <p className="font-bold text-sm ml-2">{formatCurrency(line.total)}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{line.quantity} x {formatCurrency(line.unit_price)}</span>
                    <span>IVA {line.tax_rate}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Document Preview */}
        {pdfUrl && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documento Adjunto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-[1.4/1] bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">PDF disponible</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(pdfUrl, '_blank')}
                    className="mt-2"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver documento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PurchaseInvoiceDetailPageMobile;
