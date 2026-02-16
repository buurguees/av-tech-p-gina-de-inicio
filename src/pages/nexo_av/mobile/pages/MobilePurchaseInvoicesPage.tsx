import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Loader2,
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import {
  getDocumentStatusInfo,
} from "@/constants/purchaseInvoiceStatuses";

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  internal_purchase_number: string | null;
  issue_date: string;
  due_date: string | null;
  total: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  provider_name: string | null;
  project_name: string | null;
  project_number: string | null;
  created_at: string;
}

const MobilePurchaseInvoicesPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [stats, setStats] = useState({ pending: 0, approved: 0, paid: 0 });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_purchase_invoices", {
        p_search: debouncedSearch || null,
        p_status: null,
        p_supplier_id: null,
        p_technician_id: null,
        p_document_type: "INVOICE",
        p_page: 1,
        p_page_size: 200,
      });
      if (error) throw error;
      const list = ((data || []) as unknown) as PurchaseInvoice[];
      setInvoices(list);

      const pending = list.filter((i) => i.status === "PENDING" || i.status === "DRAFT").length;
      const approved = list.filter((i) => i.status === "APPROVED" || i.status === "CONFIRMED").length;
      const paid = list.filter((i) => i.pending_amount <= 0 || i.status === "PAID").length;
      setStats({ pending, approved, paid });
    } catch (e) {
      console.error("Error fetching purchase invoices:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [debouncedSearch]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header: KPIs + Search */}
      <div
        className="flex-shrink-0 py-3 px-3 w-full"
        style={{ background: "linear-gradient(0deg, rgba(0,0,0,1) 100%, rgba(255,255,255,0) 0%)", height: "fit-content" }}
      >
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-yellow-500/10 rounded-lg text-yellow-500">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="text-lg text-foreground font-semibold">{stats.pending}</span>
              <p className="text-[10px] text-muted-foreground">Pendientes</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div>
              <span className="text-lg text-foreground font-semibold">{stats.approved}</span>
              <p className="text-[10px] text-muted-foreground">Aprobadas</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg text-green-500">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <span className="text-lg text-foreground font-semibold">{stats.paid}</span>
              <p className="text-[10px] text-muted-foreground">Pagadas</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar facturas de compra..."
              className="pl-9 h-8 bg-card border-border text-sm"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-3 pb-[80px] w-full h-full px-[15px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay facturas de compra</p>
            <p className="text-muted-foreground text-sm">
              {searchInput ? "Prueba con otra búsqueda" : "Aún no se han registrado facturas de compra"}
            </p>
          </div>
        ) : (
          invoices.map((inv) => {
            const statusInfo = getDocumentStatusInfo(inv.status);

            return (
              <button
                key={inv.id}
                onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/${inv.id}`)}
                className={cn(
                  "w-full text-left p-4 rounded-xl",
                  "bg-card border border-border",
                  "active:scale-[0.98] transition-all duration-200",
                  "hover:border-primary/30"
                )}
                style={{ touchAction: "manipulation" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Number & Status */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono text-muted-foreground">
                        {inv.internal_purchase_number || inv.invoice_number}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(statusInfo.className, "text-[10px] px-1.5 py-0")}
                      >
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Provider */}
                    <h3 className="font-medium text-foreground truncate mb-1">
                      {inv.provider_name || "Sin proveedor"}
                    </h3>

                    {/* Project */}
                    {inv.project_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        📁 {inv.project_name}
                      </p>
                    )}

                    {/* Date + Payment status */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground/70">
                        {formatDate(inv.issue_date)}
                      </span>
                      {inv.pending_amount > 0 && inv.total > 0 && (
                        <span className="text-[9px] text-amber-500">
                          Pend. {formatCurrency(inv.pending_amount)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(inv.total)}
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

export default MobilePurchaseInvoicesPage;
