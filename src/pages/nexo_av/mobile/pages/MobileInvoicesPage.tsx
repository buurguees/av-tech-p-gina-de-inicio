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
import { getSalesDocumentStatusInfo, calculateCollectionStatus, getCollectionStatusInfo } from "@/constants/salesInvoiceStatuses";

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
        const collectionStatus = calculateCollectionStatus(
          inv.paid_amount || 0,
          inv.total || 0,
          inv.due_date,
          inv.status
        );
        return collectionStatus === 'PENDING' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT';
      }).length;
      
      const issued = invoicesList.filter((inv: Invoice) => 
        inv.status === 'ISSUED' || inv.status === 'SENT'
      ).length;
      
      const paid = invoicesList.filter((inv: Invoice) => {
        const collectionStatus = calculateCollectionStatus(
          inv.paid_amount || 0,
          inv.total || 0,
          inv.due_date,
          inv.status
        );
        return collectionStatus === 'PAID';
      }).length;
      
      setInvoiceStats({ pending, issued, paid });
    } catch (error) {
      console.error('Error fetching invoices:', error);
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
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-yellow-500/10 rounded-lg text-yellow-600">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-xs">Pendientes</span>
          </div>
          <span className="text-lg text-foreground font-semibold">
            {invoiceStats.pending}
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-600">
              <Receipt className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-xs">Emitidas</span>
          </div>
          <span className="text-lg text-foreground font-semibold">
            {invoiceStats.issued}
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg text-green-600">
              <CheckCircle className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-xs">Pagadas</span>
          </div>
          <span className="text-lg text-foreground font-semibold">
            {invoiceStats.paid}
          </span>
        </div>
      </div>

      {/* Search Bar - SIN botón de crear */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40 pb-3 mb-4 flex-shrink-0 -mx-[15px] px-[15px] pt-2">
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
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pb-4">
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
                    {/* Invoice Number & Status */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">
                        {displayNumber}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "sales-status-badge sales-status-badge--document",
                          docStatusInfo.className, 
                          "text-[10px] px-1.5 py-0"
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
                            "text-[10px] px-1.5 py-0"
                          )}
                        >
                          {collectionInfo.label}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Client Name */}
                    <h3 className="font-medium text-foreground truncate mb-1">
                      {invoice.client_name}
                    </h3>
                    
                    {/* Project Name */}
                    {invoice.project_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        📁 {invoice.project_name}
                      </p>
                    )}
                    
                    {/* Date */}
                    {invoice.issue_date && (
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDate(invoice.issue_date)}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(invoice.total)}
                    </span>
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
