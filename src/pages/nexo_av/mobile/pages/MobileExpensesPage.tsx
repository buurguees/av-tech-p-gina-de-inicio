import { useState, useEffect, useMemo } from "react";
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
  Receipt,
  Filter,
} from "lucide-react";
import { cn, toNumber } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import {
  normalizePurchaseDocumentStatus,
  getDocumentStatusInfo,
  calculatePaymentStatus,
  getPaymentStatusInfo,
} from "@/constants/purchaseInvoiceStatuses";
import { Button } from "@/components/ui/button";

interface Expense {
  id: string;
  invoice_number: string;
  internal_purchase_number: string | null;
  issue_date: string;
  total: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  provider_name: string | null;
  project_name: string | null;
  expense_category?: string | null;
  created_at: string;
}

const MobileExpensesPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [showTechnicalDrafts, setShowTechnicalDrafts] = useState(false);

  const isTechnicalDraft = (expense: Expense) =>
    normalizePurchaseDocumentStatus(expense.status) === "DRAFT" &&
    !expense.internal_purchase_number &&
    !expense.provider_name &&
    !expense.project_name &&
    !expense.expense_category &&
    toNumber(expense.total) === 0 &&
    toNumber(expense.paid_amount) === 0 &&
    toNumber(expense.pending_amount) === 0;

  const hiddenTechnicalDraftsCount = useMemo(
    () => expenses.filter((expense) => isTechnicalDraft(expense)).length,
    [expenses]
  );

  const visibleExpenses = useMemo(
    () => (showTechnicalDrafts ? expenses : expenses.filter((expense) => !isTechnicalDraft(expense))),
    [expenses, showTechnicalDrafts]
  );

  const stats = useMemo(() => {
    const pending = visibleExpenses.filter((e) => {
      const status = normalizePurchaseDocumentStatus(e.status);
      return status === "DRAFT" || status === "PENDING_VALIDATION";
    }).length;
    const approved = visibleExpenses.filter(
      (e) => normalizePurchaseDocumentStatus(e.status) === "APPROVED" && toNumber(e.pending_amount) > 0
    ).length;
    const paid = visibleExpenses.filter(
      (e) => calculatePaymentStatus(toNumber(e.paid_amount), toNumber(e.total), null, e.status) === "PAID"
    ).length;
    return { pending, approved, paid };
  }, [visibleExpenses]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_purchase_invoices", {
        p_search: debouncedSearch || null,
        p_status: null,
        p_supplier_id: null,
        p_technician_id: null,
        p_document_type: "EXPENSE",
        p_page: 1,
        p_page_size: 200,
      });
      if (error) throw error;
      const list = ((data || []) as unknown) as Expense[];
      setExpenses(list);
    } catch (e) {
      console.error("Error fetching expenses:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [debouncedSearch]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getCategoryLabel = (cat: string | null) => {
    if (!cat) return null;
    const map: Record<string, string> = {
      FUEL: "Combustible",
      MEALS: "Comidas",
      TOLLS: "Peajes",
      PARKING: "Parking",
      MATERIALS: "Materiales",
      TRANSPORT: "Transporte",
      OTHER: "Otros",
    };
    return map[cat] || cat;
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
              <p className="text-[10px] text-muted-foreground">Aprobados</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg text-green-500">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <span className="text-lg text-foreground font-semibold">{stats.paid}</span>
              <p className="text-[10px] text-muted-foreground">Pagados</p>
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
              placeholder="Buscar tickets / gastos..."
              className="pl-9 h-8 bg-card border-border text-sm"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-8 px-2 text-xs whitespace-nowrap",
              !showTechnicalDrafts && hiddenTechnicalDraftsCount > 0 && "bg-secondary"
            )}
            onClick={() => setShowTechnicalDrafts((current) => !current)}
          >
            <Filter className="h-3.5 w-3.5 mr-1" />
            {showTechnicalDrafts ? "Ver todos" : `Ocultar borr. (${hiddenTechnicalDraftsCount})`}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-3 pb-[80px] w-full h-full px-[15px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : visibleExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay tickets / gastos</p>
            <p className="text-muted-foreground text-sm">
              {searchInput
                ? "Prueba con otra búsqueda"
                : hiddenTechnicalDraftsCount > 0 && !showTechnicalDrafts
                  ? "Solo hay borradores tecnicos vacios ocultos"
                  : "Aún no se han registrado gastos"}
            </p>
          </div>
        ) : (
          visibleExpenses.map((exp) => {
            const statusInfo = getDocumentStatusInfo(exp.status);
            const catLabel = getCategoryLabel(exp.expense_category);

            return (
              <button
                key={exp.id}
                onClick={() => navigate(`/nexo-av/${userId}/expenses/${exp.id}`)}
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
                        {exp.internal_purchase_number || exp.invoice_number}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(statusInfo.className, "text-[10px] px-1.5 py-0")}
                      >
                        {statusInfo.label}
                      </Badge>
                      {catLabel && (
                        <span className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                          {catLabel}
                        </span>
                      )}
                    </div>

                    {/* Provider */}
                    <h3 className="font-medium text-foreground truncate mb-1">
                      {exp.provider_name || "Sin proveedor"}
                    </h3>

                    {/* Project */}
                    {exp.project_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        📁 {exp.project_name}
                      </p>
                    )}

                    {/* Date */}
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDate(exp.issue_date)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(exp.total)}
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

export default MobileExpensesPage;
