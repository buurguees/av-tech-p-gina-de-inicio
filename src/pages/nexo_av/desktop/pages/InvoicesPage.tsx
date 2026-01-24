import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileText, AlertCircle, CheckCircle, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "../components/common/PaginationControls";
import { useDebounce } from "@/hooks/useDebounce";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import { getFinanceStatusInfo, FINANCE_INVOICE_STATUSES } from "@/constants/financeStatuses";
import DataList from "../components/common/DataList";
import SearchBar from "../components/common/SearchBar";


interface Invoice {
  id: string;
  invoice_number: string;
  preliminary_number: string;
  source_quote_id: string | null;
  source_quote_number: string | null;
  source_quote_order_number: string | null;
  client_id: string;
  client_name: string;
  project_id: string | null;
  project_number: string | null;
  project_name: string | null;
  client_order_number: string | null;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  is_locked: boolean;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

// Status options for the filter dropdown
const INVOICE_STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  ...FINANCE_INVOICE_STATUSES,
];

const InvoicesPageDesktop = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchInvoices();
  }, [debouncedSearchQuery, statusFilter]);


  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("finance_list_invoices", {
        p_search: debouncedSearchQuery || null,
        p_status: statusFilter === "all" ? null : statusFilter,
      });
      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las facturas",
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case "date":
        aValue = a.issue_date ? new Date(a.issue_date).getTime() : 0;
        bValue = b.issue_date ? new Date(b.issue_date).getTime() : 0;
        break;
      case "number":
        aValue = a.invoice_number || a.preliminary_number || "";
        bValue = b.invoice_number || b.preliminary_number || "";
        break;
      case "client":
        aValue = a.client_name || "";
        bValue = b.client_name || "";
        break;
      case "project":
        aValue = a.project_number || "";
        bValue = b.project_number || "";
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "total":
        aValue = a.total;
        bValue = b.total;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination (50 records per page)
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

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Summary Metric Cards - Optimizado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 flex-shrink-0">
            <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-2 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-emerald-500/10 rounded text-emerald-500">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <span className="text-white/60 text-[9px] px-1.5 py-0.5 font-medium">Facturado este mes</span>
              </div>
              <div>
                <span className="text-base font-bold text-white">
                  {formatCurrency(invoices
                    .filter(inv => {
                      if (!inv.issue_date) return false;
                      const invoiceDate = new Date(inv.issue_date);
                      const now = new Date();
                      // Calcular primer día del mes actual (día 1)
                      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                      // Calcular último día del mes actual (día 0 del siguiente mes)
                      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      // Normalizar fechas a medianoche para comparación precisa
                      firstDayOfMonth.setHours(0, 0, 0, 0);
                      lastDayOfMonth.setHours(23, 59, 59, 999);
                      invoiceDate.setHours(0, 0, 0, 0);
                      // Verificar que la fecha esté dentro del rango del mes (del 1 al último día)
                      return invoiceDate >= firstDayOfMonth && invoiceDate <= lastDayOfMonth;
                    })
                    .reduce((sum, inv) => sum + (inv.total || 0), 0)
                  )}
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-2 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-blue-500/10 rounded text-blue-500">
                  <CheckCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-white/60 text-[9px] px-1.5 py-0.5 font-medium">Pendiente de Cobro</span>
              </div>
              <div>
                <span className="text-base font-bold text-white">
                  {formatCurrency(invoices
                    .filter(inv => inv.status !== 'PAID' && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED')
                    .reduce((sum, inv) => sum + (inv.total || 0), 0)
                  )}
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-2 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-red-500/10 rounded text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-white/60 text-[9px] px-1.5 py-0.5 font-medium">Vencido</span>
              </div>
              <div>
                <span className="text-base font-bold text-red-500">
                  {formatCurrency(invoices
                    .filter(inv => {
                      if (inv.status === 'PAID' || inv.status === 'DRAFT' || inv.status === 'CANCELLED') return false;
                      if (!inv.due_date) return false;
                      return new Date(inv.due_date) < new Date();
                    })
                    .reduce((sum, inv) => sum + (inv.total || 0), 0)
                  )}
                </span>
                <div className="flex items-center gap-1 mt-1 text-[9px] px-1.5 py-0.5 text-red-400/80">
                  <span>Requiere atención inmediata</span>
                </div>
              </div>
            </div>
          </div>

          {/* DetailNavigationBar */}
          <div className="mb-6 flex-shrink-0">
            <DetailNavigationBar
              pageTitle="Facturas"
              contextInfo={
                <SearchBar
                  value={searchInput}
                  onChange={setSearchInput}
                  items={invoices}
                  getSearchText={(invoice) => {
                    const displayNumber = invoice.invoice_number || invoice.preliminary_number || '';
                    return `${displayNumber} ${invoice.client_name || ''} ${invoice.project_number || ''} ${invoice.client_order_number || ''}`;
                  }}
                  renderResult={(invoice) => {
                    const displayNumber = invoice.invoice_number || invoice.preliminary_number || '';
                    return {
                      id: invoice.id,
                      label: displayNumber,
                      subtitle: `${invoice.client_name || 'Sin cliente'} - ${formatCurrency(invoice.total)}`,
                      icon: <Receipt className="h-4 w-4" />,
                      data: invoice,
                    };
                  }}
                  onSelectResult={(result) => {
                    navigate(`/nexo-av/${userId}/invoices/${result.data.id}`);
                  }}
                  placeholder="Buscar facturas..."
                  maxResults={8}
                  debounceMs={300}
                />
              }
              tools={
                <DetailActionButton
                  actionType="new_invoice"
                  onClick={() => navigate(`/nexo-av/${userId}/invoices/new`)}
                />
              }
            />
          </div>

          {/* DataList */}
          <div className="flex-1 min-h-0 overflow-hidden">
          <DataList
            data={paginatedInvoices}
            columns={[
              {
                key: "invoice_number",
                label: "Nº",
                sortable: true,
                align: "left",
                priority: 1,
                render: (invoice) => {
                  const displayNumber = invoice.invoice_number || invoice.preliminary_number;
                  return (
                    <span className="text-foreground/80">
                      {displayNumber}
                    </span>
                  );
                },
              },
              {
                key: "project_name",
                label: "Proyecto",
                sortable: true,
                align: "left",
                priority: 3,
                render: (invoice) => (
                  <span className="text-foreground truncate block">
                    {invoice.project_name || invoice.project_number || "-"}
                  </span>
                ),
              },
              {
                key: "client_order_number",
                label: "Pedido cliente",
                sortable: true,
                align: "left",
                priority: 7,
                render: (invoice) => (
                  <span className="text-muted-foreground">
                    {invoice.client_order_number || "-"}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Estado",
                align: "center",
                priority: 2,
                render: (invoice) => {
                  const statusInfo = getFinanceStatusInfo(invoice.status);
                  return (
                    <div className="flex justify-center">
                      <Badge variant="outline" className={cn(statusInfo.className, "border text-[11px] px-1.5 py-0.5 w-20 justify-center")}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  );
                },
              },
              {
                key: "issue_date",
                label: "Emisión",
                sortable: true,
                align: "left",
                priority: 6,
                render: (invoice) => (
                  <span className="text-muted-foreground">
                    {invoice.issue_date ? formatDate(invoice.issue_date) : "-"}
                  </span>
                ),
              },
              {
                key: "due_date",
                label: "Vencimiento",
                sortable: true,
                align: "left",
                priority: 6,
                render: (invoice) => (
                  <span className="text-muted-foreground">
                    {invoice.due_date ? formatDate(invoice.due_date) : "-"}
                  </span>
                ),
              },
              {
                key: "source_quote_order_number",
                label: "Presupuesto Origen",
                align: "left",
                priority: 7,
                render: (invoice) => (
                  <span className="text-muted-foreground">
                    {invoice.source_quote_order_number || "-"}
                  </span>
                ),
              },
              {
                key: "subtotal",
                label: "Subtotal",
                sortable: true,
                align: "right",
                priority: 5,
                render: (invoice) => (
                  <span className="text-foreground">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                ),
              },
              {
                key: "tax_amount",
                label: "Impuestos",
                sortable: true,
                align: "right",
                priority: 5,
                render: (invoice) => (
                  <span className="text-foreground">
                    {formatCurrency(invoice.tax_amount || 0)}
                  </span>
                ),
              },
              {
                key: "total",
                label: "Total",
                sortable: true,
                align: "right",
                priority: 4,
                render: (invoice) => (
                  <span className="text-foreground">
                    {formatCurrency(invoice.total)}
                  </span>
                ),
              },
              {
                key: "paid_amount",
                label: "Pagado",
                sortable: true,
                align: "right",
                priority: 8,
                render: (invoice) => (
                  <span className="text-muted-foreground">
                    {formatCurrency(invoice.paid_amount || 0)}
                  </span>
                ),
              },
            ]}
            actions={[
              {
                label: "Ver detalle",
                onClick: (invoice) => navigate(`/nexo-av/${userId}/invoices/${invoice.id}`),
              },
              {
                label: "Duplicar",
                onClick: () => {},
              },
              {
                label: "Eliminar",
                variant: "destructive",
                onClick: () => {},
                condition: (invoice) => invoice.status === 'DRAFT',
              },
            ]}
            onItemClick={(invoice) => navigate(`/nexo-av/${userId}/invoices/${invoice.id}`)}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={loading}
            emptyMessage="No hay facturas"
            emptyIcon={<FileText className="h-16 w-16 text-muted-foreground" />}
            getItemId={(invoice) => invoice.id}
          />
          </div>

          {/* Paginación */}
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

export default InvoicesPageDesktop;
