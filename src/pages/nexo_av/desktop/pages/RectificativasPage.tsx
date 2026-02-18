import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import PaginationControls from "../components/common/PaginationControls";
import DataList from "../components/common/DataList";
import SearchBar from "../components/common/SearchBar";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import { getSalesDocumentStatusInfo } from "@/constants/salesInvoiceStatuses";

/** Invoice row from finance_list_invoices, extended with optional rectificativa fields */
interface RectificativaInvoice {
  id: string;
  invoice_number: string;
  preliminary_number: string;
  client_id: string;
  client_name: string;
  status: string;
  issue_date: string | null;
  total: number;
  created_at: string;
  /** Set when RPC or backend returns it */
  invoice_type?: string;
  original_invoice_id?: string | null;
  original_invoice_number?: string | null;
  rectification_type?: string | null;
  rectification_reason?: string | null;
}

const CURRENCY_FORMAT = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "-";

function isRectificativa(inv: { invoice_type?: string; invoice_number?: string | null }): boolean {
  if (inv.invoice_type === "RECTIFICATIVA") return true;
  return (inv.invoice_number ?? "").startsWith("R-");
}

const RectificativasPageDesktop = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<RectificativaInvoice[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);

  useEffect(() => {
    fetchRectificativas();
  }, [debouncedSearchQuery]);

  const fetchRectificativas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("finance_list_invoices", {
        p_search: debouncedSearchQuery || null,
        p_status: null,
      });
      if (error) throw error;

      const raw = (data ?? []) as (RectificativaInvoice & Record<string, unknown>)[];
      const filtered = raw.filter(isRectificativa) as RectificativaInvoice[];

      // Sort by created_at desc (RPC may not guarantee order for filtered subset)
      filtered.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setInvoices(filtered);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar las facturas rectificativas";
      console.error("Error fetching rectificativas:", err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => CURRENCY_FORMAT.format(amount);

  /** Total for rectificativas: show as negative (refund) */
  const formatTotal = (total: number) => {
    const value = total <= 0 ? total : -Math.abs(total);
    return CURRENCY_FORMAT.format(value);
  };

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    if (!sortColumn) return 0;
    let aVal: string | number;
    let bVal: string | number;
    switch (sortColumn) {
      case "invoice_number":
        aVal = a.invoice_number ?? "";
        bVal = b.invoice_number ?? "";
        break;
      case "original":
        aVal = a.original_invoice_number ?? a.original_invoice_id ?? "";
        bVal = b.original_invoice_number ?? b.original_invoice_id ?? "";
        break;
      case "client_name":
        aVal = a.client_name ?? "";
        bVal = b.client_name ?? "";
        break;
      case "rectification_type":
        aVal = a.rectification_type ?? "";
        bVal = b.rectification_type ?? "";
        break;
      case "rectification_reason":
        aVal = a.rectification_reason ?? "";
        bVal = b.rectification_reason ?? "";
        break;
      case "total":
        aVal = a.total;
        bVal = b.total;
        break;
      case "issue_date":
        aVal = a.issue_date ? new Date(a.issue_date).getTime() : 0;
        bVal = b.issue_date ? new Date(b.issue_date).getTime() : 0;
        break;
      case "status":
        aVal = a.status;
        bVal = b.status;
        break;
      default:
        return 0;
    }
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedInvoices,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(sortedInvoices, { pageSize: 50 });

  const targetInvoiceId = (inv: RectificativaInvoice) =>
    inv.original_invoice_id ?? inv.id;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-6">
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="mb-4 flex-shrink-0">
            <DetailNavigationBar
              pageTitle="Facturas rectificativas"
              contextInfo={
                <SearchBar
                  value={searchInput}
                  onChange={setSearchInput}
                  items={invoices}
                  getSearchText={(inv) =>
                    `${inv.invoice_number ?? ""} ${inv.client_name ?? ""} ${inv.original_invoice_number ?? ""}`.trim()
                  }
                  renderResult={(inv) => ({
                    id: inv.id,
                    label: inv.invoice_number || inv.preliminary_number || "Sin número",
                    subtitle: `${inv.client_name ?? "Sin cliente"} - ${formatCurrency(inv.total)}`,
                    icon: <FileText className="h-4 w-4" />,
                    data: inv,
                  })}
                  onSelectResult={(result) => {
                    const id = result.data.original_invoice_id ?? result.data.id;
                    navigate(`/nexo-av/${userId}/invoices/${id}`);
                  }}
                  placeholder="Buscar rectificativas..."
                  maxResults={8}
                  debounceMs={300}
                />
              }
            />
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <DataList<RectificativaInvoice>
              data={paginatedInvoices}
              columns={[
                {
                  key: "invoice_number",
                  label: "Nº Rectificativa",
                  sortable: true,
                  align: "left",
                  priority: 1,
                  render: (inv) => (
                    <span className="text-foreground/80">
                      {inv.invoice_number || inv.preliminary_number || "-"}
                    </span>
                  ),
                },
                {
                  key: "original",
                  label: "Factura Original",
                  sortable: true,
                  align: "left",
                  priority: 2,
                  render: (inv) => (
                    <span className="text-foreground/80">
                      {inv.original_invoice_number ?? inv.original_invoice_id ?? "-"}
                    </span>
                  ),
                },
                {
                  key: "client_name",
                  label: "Cliente",
                  sortable: true,
                  align: "left",
                  priority: 2,
                  render: (inv) => (
                    <span className="text-foreground font-medium truncate block max-w-[180px]">
                      {inv.client_name || "-"}
                    </span>
                  ),
                },
                {
                  key: "rectification_type",
                  label: "Tipo",
                  sortable: true,
                  align: "left",
                  priority: 3,
                  render: (inv) => (
                    <span className="text-muted-foreground">
                      {inv.rectification_type === "TOTAL"
                        ? "Total"
                        : inv.rectification_type === "PARTIAL"
                          ? "Parcial"
                          : inv.rectification_type ?? "-"}
                    </span>
                  ),
                },
                {
                  key: "rectification_reason",
                  label: "Motivo",
                  sortable: true,
                  align: "left",
                  priority: 4,
                  render: (inv) => (
                    <span className="text-muted-foreground truncate block max-w-[160px]" title={inv.rectification_reason ?? undefined}>
                      {inv.rectification_reason ?? "-"}
                    </span>
                  ),
                },
                {
                  key: "total",
                  label: "Total",
                  sortable: true,
                  align: "right",
                  priority: 4,
                  render: (inv) => (
                    <span className="text-foreground">
                      {formatTotal(inv.total)}
                    </span>
                  ),
                },
                {
                  key: "issue_date",
                  label: "Fecha",
                  sortable: true,
                  align: "left",
                  priority: 5,
                  render: (inv) => (
                    <span className="text-muted-foreground">
                      {formatDate(inv.issue_date)}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Estado",
                  align: "center",
                  priority: 2,
                  render: (inv) => {
                    const info = getSalesDocumentStatusInfo(inv.status);
                    return (
                      <div className="flex justify-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "sales-status-badge sales-status-badge--document",
                            info.className
                          )}
                        >
                          {info.label}
                        </Badge>
                      </div>
                    );
                  },
                },
              ]}
              onItemClick={(inv) =>
                navigate(`/nexo-av/${userId}/invoices/${targetInvoiceId(inv)}`)
              }
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              loading={loading}
              emptyMessage="No hay facturas rectificativas"
              emptyIcon={<FileText className="h-16 w-16 text-muted-foreground" />}
              getItemId={(inv) => inv.id}
            />
          </div>

          {!loading && invoices.length > 0 && totalPages > 1 && (
            <div className="flex-shrink-0 mt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={totalItems}
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
                onPrevPage={prevPage}
                onNextPage={nextPage}
                onGoToPage={goToPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RectificativasPageDesktop;
