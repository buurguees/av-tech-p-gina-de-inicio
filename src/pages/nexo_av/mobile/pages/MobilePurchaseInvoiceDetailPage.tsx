import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ChevronLeft,
  AlertCircle,
  FileText,
  Calendar,
  Building2,
  FolderKanban,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDocumentStatusInfo,
  calculatePaymentStatus,
  getPaymentStatusInfo,
} from "@/constants/purchaseInvoiceStatuses";

interface PurchaseInvoiceDetail {
  id: string;
  internal_purchase_number: string;
  invoice_number: string;
  supplier_invoice_number: string | null;
  status: string;
  document_type: string;
  issue_date: string;
  due_date: string | null;
  tax_base: number;
  tax_amount: number;
  withholding_amount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_number: string | null;
  technician_id: string | null;
  technician_name: string | null;
  technician_number: string | null;
  project_id: string | null;
  project_name: string | null;
  project_number: string | null;
  site_name: string | null;
  site_city: string | null;
  notes: string | null;
  file_name: string | null;
  file_path: string | null;
  created_at: string;
}

interface InvoiceLine {
  id: string;
  concept: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

const MobilePurchaseInvoiceDetailPage = () => {
  const { userId, invoiceId } = useParams<{ userId: string; invoiceId: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<PurchaseInvoiceDetail | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [invRes, linesRes] = await Promise.all([
          supabase.rpc("get_purchase_invoice", { p_invoice_id: invoiceId }),
          supabase.rpc("get_purchase_invoice_lines", { p_invoice_id: invoiceId }),
        ]);

        if (invRes.data && invRes.data.length > 0) {
          setInvoice(invRes.data[0] as unknown as PurchaseInvoiceDetail);
        }
        setLines(((linesRes.data || []) as unknown) as InvoiceLine[]);
      } catch (e) {
        console.error("Error fetching purchase invoice:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [invoiceId]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
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
        <button onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices`)} className="text-primary underline">
          Volver a facturas
        </button>
      </div>
    );
  }

  const docStatus = getDocumentStatusInfo(invoice.status);
  const payStatus = calculatePaymentStatus(invoice.paid_amount, invoice.total, invoice.due_date, invoice.status);
  const payInfo = getPaymentStatusInfo(payStatus);

  const providerName = invoice.supplier_name || invoice.technician_name || "Sin proveedor";
  const providerNumber = invoice.supplier_number || invoice.technician_number || "";
  const providerId = invoice.supplier_id || invoice.technician_id;
  const providerRoute = invoice.supplier_id
    ? `/nexo-av/${userId}/suppliers/${invoice.supplier_id}`
    : invoice.technician_id
    ? `/nexo-av/${userId}/technicians/${invoice.technician_id}`
    : null;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices`)}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
              "text-white/90 hover:text-white hover:bg-white/15",
              "active:scale-95 transition-all duration-200",
              "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]"
            )}
            style={{ touchAction: "manipulation" }}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Atrás</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium text-foreground truncate leading-tight">
              {invoice.internal_purchase_number}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className={cn(docStatus.className, "text-[10px] px-1.5 py-0")}>
                {docStatus.label}
              </Badge>
              {payInfo && (
                <Badge variant="outline" className={cn(payInfo.className, "text-[10px] px-1.5 py-0")}>
                  {payInfo.label}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-[80px] space-y-4">
        {/* Provider */}
        {providerRoute ? (
          <button
            onClick={() => navigate(providerRoute)}
            className={cn(
              "w-full text-left p-4 rounded-xl",
              "bg-card border border-border",
              "active:scale-[0.98] transition-all duration-200"
            )}
            style={{ touchAction: "manipulation" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{providerName}</p>
                  <p className="text-xs text-muted-foreground">{providerNumber}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ) : (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-foreground">{providerName}</p>
            </div>
          </div>
        )}

        {/* Project */}
        {invoice.project_name && (
          <button
            onClick={() => invoice.project_id && navigate(`/nexo-av/${userId}/projects/${invoice.project_id}`)}
            className={cn(
              "w-full text-left p-4 rounded-xl",
              "bg-card border border-border",
              "active:scale-[0.98] transition-all duration-200"
            )}
            style={{ touchAction: "manipulation" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FolderKanban className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{invoice.project_name}</p>
                  {invoice.project_number && (
                    <p className="text-xs text-muted-foreground">{invoice.project_number}</p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        )}

        {/* Dates */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Emisión</p>
                <p className="text-sm text-foreground">{formatDate(invoice.issue_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Vencimiento</p>
                <p className="text-sm text-foreground">{formatDate(invoice.due_date)}</p>
              </div>
            </div>
          </div>
          {invoice.supplier_invoice_number && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">Nº factura proveedor</p>
              <p className="text-sm text-foreground">{invoice.supplier_invoice_number}</p>
            </div>
          )}
        </div>

        {/* Lines */}
        {lines.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-3 font-medium">Líneas</p>
            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.id} className="flex justify-between items-start gap-2 py-1.5 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{line.concept}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.quantity} x {formatCurrency(line.unit_price)}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-foreground">{formatCurrency(line.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Base imponible</span>
            <span className="text-sm text-foreground">{formatCurrency(invoice.tax_base)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">IVA</span>
            <span className="text-sm text-foreground">{formatCurrency(invoice.tax_amount)}</span>
          </div>
          {invoice.withholding_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Retención IRPF</span>
              <span className="text-sm text-red-400">-{formatCurrency(invoice.withholding_amount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-base font-bold text-foreground">{formatCurrency(invoice.total)}</span>
          </div>
          {invoice.paid_amount > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pagado</span>
                <span className="text-sm text-green-500">{formatCurrency(invoice.paid_amount)}</span>
              </div>
              {invoice.pending_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pendiente</span>
                  <span className="text-sm text-amber-500">{formatCurrency(invoice.pending_amount)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Notas</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Document */}
        {invoice.file_name && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Documento adjunto</p>
                <p className="text-sm text-foreground truncate">{invoice.file_name}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobilePurchaseInvoiceDetailPage;
