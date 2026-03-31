/**
 * MobileInvoicesPage - Página de facturas para móvil
 * VERSIÓN: 1.0 - SOLO CONSULTA (sin crear, editar, cambiar estado)
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Receipt, 
  Loader2, 
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { getSalesDocumentStatusInfo, calculatePaymentStatus, getPaymentStatusInfo, isOverdue, normalizeSalesDocumentStatus } from "@/constants/salesInvoiceStatuses";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  invoice_number: string | null;
  preliminary_number: string | null;
  client_id: string;
  client_name: string;
  project_id: string | null;
  project_name: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  due_date: string | null;
  issue_date: string | null;
  created_at: string;
}

const MobileInvoicesPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 500);
  const [invoiceStats, setInvoiceStats] = useState({
    pending: 0,
    issued: 0,
    paid: 0,
  });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('finance_list_invoices', {
        p_search: debouncedSearchTerm || null,
        p_status: null
      });

      if (error) throw error;
      
      const invoicesList = data || [];
      setInvoices(invoicesList);

      // Calculate stats
      const pending = invoicesList.filter((inv: Invoice) => {
        const docStatus = normalizeSalesDocumentStatus(inv.status);
        const collectionStatus = calculateCollectionStatus(
          inv.paid_amount || 0,
          inv.total || 0,
          inv.status
        );
        return docStatus === 'ISSUED' && collectionStatus === 'PENDING';
      }).length;
      
      const issued = invoicesList.filter((inv: Invoice) => 
        normalizeSalesDocumentStatus(inv.status) === 'ISSUED'
      ).length;
      
      const paid = invoicesList.filter((inv: Invoice) => {
        const docStatus = normalizeSalesDocumentStatus(inv.status);
        const collectionStatus = calculateCollectionStatus(
          inv.paid_amount || 0,
          inv.total || 0,
          inv.status
        );
        return docStatus === 'ISSUED' && collectionStatus === 'PAID';
      }).length;
      
      setInvoiceStats({ pending, issued, paid });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({ title: "Error al cargar las facturas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [debouncedSearchTerm]);

  const handleInvoiceClick = (invoiceId: string) => {
    navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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

  return (
    <div className="mobile-page-viewport">
      {/* Sticky Header: KPIs + Search */}
      <div className="mobile-sticky-header">
        {/* KPI Cards */}
        <div className="mobile-kpi-grid mobile-kpi-grid-3">
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-yellow-500/10 rounded-lg text-yellow-500">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-lg text-foreground font-semibold">{invoiceStats.pending}</span>
          </div>
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
              <Receipt className="h-4 w-4" />
            </div>
            <span className="text-lg text-foreground font-semibold">{invoiceStats.issued}</span>
          </div>
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg text-green-500">
              <CheckCircle className="h-4 w-4" />
            </div>
            <span className="text-lg text-foreground font-semibold">{invoiceStats.paid}</span>
          </div>
        </div>
        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar facturas..."
              className="pl-9 h-10 bg-card border-border"
            />
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="mobile-scroll-area space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay facturas</p>
            <p className="text-muted-foreground text-sm">
              {searchInput ? 'Prueba con otra búsqueda' : 'Las facturas se crean desde el ordenador'}
            </p>
          </div>
        ) : (
          invoices.map((invoice) => {
            const displayNumber = invoice.invoice_number || invoice.preliminary_number || 'Sin número';
            const docStatusInfo = getSalesDocumentStatusInfo(invoice.status);
            const paymentStatus = calculatePaymentStatus(
              invoice.paid_amount || 0,
              invoice.total || 0,
              invoice.status
            );
            const overdue = isOverdue(invoice.status, paymentStatus, invoice.due_date);
            const paymentInfo = overdue
              ? { label: "Vencida", className: "status-error" }
              : getPaymentStatusInfo(paymentStatus);

            return (
              <button
                key={invoice.id}
                onClick={() => handleInvoiceClick(invoice.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl",
                  "bg-card border border-border",
                  "active:scale-[0.98] transition-all duration-200",
                  "hover:border-primary/30"
                )}
                style={{ touchAction: 'manipulation' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Número + estado doc — badge ancho fijo */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
                        {displayNumber}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(docStatusInfo.className, "w-[64px] justify-center flex-shrink-0 text-[10px] px-1.5 py-0")}
                      >
                        {docStatusInfo.label}
                      </Badge>
                    </div>

                    {/* Nombre cliente */}
                    <h3 className="font-medium text-foreground truncate mb-1">
                      {invoice.client_name}
                    </h3>

                    {/* Proyecto */}
                    {invoice.project_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        📁 {invoice.project_name}
                      </p>
                    )}

                    {/* Fecha */}
                    {invoice.issue_date && (
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDate(invoice.issue_date)}
                      </p>
                    )}
                  </div>

                  {/* Derecha: estado de pago + importe */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      {paymentInfo && (
                        <Badge
                          variant="outline"
                          className={cn(paymentInfo.className, "w-[64px] justify-center text-[10px] px-1.5 py-0")}
                        >
                          {paymentInfo.label}
                        </Badge>
                      )}
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {formatCurrency(invoice.total)}
                      </span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MobileInvoicesPage;
