import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, toNumber } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  FileText,
  Landmark,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "../components/common/PaginationControls";
import { useDebounce } from "@/hooks/useDebounce";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import {
  calculateCollectionStatus,
  displayInvoiceNumber,
  getCollectionStatusInfo,
  getSalesDocumentStatusInfo,
  normalizeSalesDocumentStatus,
  SALES_DOCUMENT_STATUSES,
} from "@/constants/salesInvoiceStatuses";
import DataList from "../components/common/DataList";
import SearchBar from "../components/common/SearchBar";
import CompactKpiCard from "../components/common/CompactKpiCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  payment_bank_name: string | null;
  payment_bank_id: string | null;
}

interface QuarterInvoiceKpis {
  period_start: string;
  period_end: string;
  issued_invoice_count: number;
  draft_invoice_count: number;
  cancelled_invoice_count: number;
  paid_invoice_count: number;
  partial_invoice_count: number;
  overdue_invoice_count: number;
  pending_collection_count: number;
  billed_gross_total: number;
  billed_net_total: number;
  billed_tax_total: number;
  collected_total: number;
  pending_total: number;
}

const INVOICE_STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  ...SALES_DOCUMENT_STATUSES,
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentQuarterRange = () => {
  const today = new Date();
  const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
  const start = new Date(today.getFullYear(), quarterStartMonth, 1);
  const end = new Date(today.getFullYear(), quarterStartMonth + 3, 0);
  return {
    start: formatIsoDate(start),
    end: formatIsoDate(end),
  };
};

const parseLocalDate = (value: string | null) => {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
};

const getInvoiceDocumentStatus = (invoice: Invoice) => normalizeSalesDocumentStatus(invoice.status);

const getInvoiceCollectionStatus = (invoice: Invoice) =>
  calculateCollectionStatus(invoice.paid_amount, invoice.total, invoice.due_date, invoice.status);

const hasPendingCollection = (invoice: Invoice) => {
  const documentStatus = getInvoiceDocumentStatus(invoice);
  const collectionStatus = getInvoiceCollectionStatus(invoice);
  return documentStatus === "ISSUED" && invoice.pending_amount > 0 && collectionStatus !== "PAID";
};

const isInvoiceOverdue = (invoice: Invoice) => {
  const dueDate = parseLocalDate(invoice.due_date);
  if (!dueDate || !hasPendingCollection(invoice)) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
};

const InvoicesPageDesktop = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quarterKpis, setQuarterKpis] = useState<QuarterInvoiceKpis | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    void fetchInvoices();
  }, [debouncedSearchQuery, statusFilter, paymentFilter]);

  useEffect(() => {
    void fetchQuarterKpis();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("finance_list_invoices", {
        p_search: debouncedSearchQuery || null,
        p_status: statusFilter === "all" ? null : statusFilter,
      });

      if (error) throw error;

      let mappedData: Invoice[] = (data || []).map((invoice: Invoice) => ({
        ...invoice,
        payment_bank_name: invoice.payment_bank_name || null,
        payment_bank_id: invoice.payment_bank_id || null,
      }));

      if (paymentFilter === "pending") {
        mappedData = mappedData.filter(hasPendingCollection);
      } else if (paymentFilter === "paid") {
        mappedData = mappedData.filter((invoice) => getInvoiceCollectionStatus(invoice) === "PAID");
      } else if (paymentFilter === "partial") {
        mappedData = mappedData.filter((invoice) => getInvoiceCollectionStatus(invoice) === "PARTIAL");
      }

      setInvoices(mappedData);
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

  const fetchQuarterKpis = async () => {
    try {
      setSummaryLoading(true);
      const quarterRange = getCurrentQuarterRange();
      const { data, error } = await supabase.rpc("get_sales_invoice_kpi_summary", {
        p_start_date: quarterRange.start,
        p_end_date: quarterRange.end,
      });

      if (error) throw error;

      setQuarterKpis((data || [])[0] || null);
    } catch (error: any) {
      console.error("Error fetching sales invoice KPI summary:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el resumen trimestral",
        variant: "destructive",
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }

    setSortColumn(column);
    setSortDirection("asc");
  };

  const monthFilteredInvoices = useMemo(() => {
    if (monthFilter === "all") return invoices;
    return invoices.filter((i) => i.issue_date?.startsWith(monthFilter));
  }, [invoices, monthFilter]);

  const sortedInvoices = [...monthFilteredInvoices].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: string | number = "";
    let bValue: string | number = "";

    switch (sortColumn) {
      case "issue_date":
        aValue = a.issue_date ? new Date(a.issue_date).getTime() : 0;
        bValue = b.issue_date ? new Date(b.issue_date).getTime() : 0;
        break;
      case "invoice_number":
        aValue = a.invoice_number || a.preliminary_number || "";
        bValue = b.invoice_number || b.preliminary_number || "";
        break;
      case "client_name":
        aValue = a.client_name || "";
        bValue = b.client_name || "";
        break;
      case "project_number":
        aValue = a.project_number || "";
        bValue = b.project_number || "";
        break;
      case "status":
        aValue = getInvoiceDocumentStatus(a);
        bValue = getInvoiceDocumentStatus(b);
        break;
      case "subtotal":
        aValue = a.subtotal;
        bValue = b.subtotal;
        break;
      case "tax_amount":
        aValue = a.tax_amount;
        bValue = b.tax_amount;
        break;
      case "total":
        aValue = a.total;
        bValue = b.total;
        break;
      case "paid_amount":
        aValue = a.paid_amount;
        bValue = b.paid_amount;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
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

  const listedPendingCount = invoices.filter(hasPendingCollection).length;
  const listedOverdueCount = invoices.filter(isInvoiceOverdue).length;
  const quarterRangeLabel = quarterKpis
    ? `${formatDate(quarterKpis.period_start)} - ${formatDate(quarterKpis.period_end)}`
    : "Trimestre actual";

  return (
    <div className="flex flex-col h-full gap-3">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 flex-shrink-0">
            <CompactKpiCard
              label="Facturado bruto"
              value={quarterKpis ? formatCurrency(quarterKpis.billed_gross_total) : "—"}
              sub={summaryLoading ? "Cargando..." : `${quarterKpis?.issued_invoice_count || 0} emitidas · ${quarterRangeLabel}`}
              color="emerald"
              delay={0.05}
            />
            <CompactKpiCard
              label="Base neta"
              value={quarterKpis ? formatCurrency(quarterKpis.billed_net_total) : "—"}
              sub={summaryLoading ? "Cargando..." : `IVA ${formatCurrency(quarterKpis?.billed_tax_total || 0)}`}
              color="cyan"
              delay={0.1}
            />
            <CompactKpiCard
              label="Cobrado"
              value={quarterKpis ? formatCurrency(quarterKpis.collected_total) : "—"}
              sub={summaryLoading ? "Cargando..." : `${quarterKpis?.paid_invoice_count || 0} cobradas`}
              color="violet"
              delay={0.15}
            />
            <CompactKpiCard
              label="Pendiente cobro"
              value={quarterKpis ? formatCurrency(quarterKpis.pending_total) : "—"}
              sub={summaryLoading ? "Cargando..." : `${quarterKpis?.pending_collection_count || 0} con saldo pendiente`}
              color="amber"
              delay={0.2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-shrink-0">
            <div
              className={cn(
                "border rounded-lg p-2 flex flex-col justify-between cursor-pointer transition-all",
                paymentFilter === "all" && statusFilter === "all"
                  ? "bg-card border-border"
                  : "bg-card/70 border-border/60 opacity-80 hover:opacity-100"
              )}
              onClick={() => {
                setPaymentFilter("all");
                setStatusFilter("all");
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-emerald-500/10 rounded text-emerald-500">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Listado actual</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">{invoices.length}</span>
                <span className="text-[10px] text-muted-foreground ml-1">facturas</span>
              </div>
            </div>

            <div
              className={cn(
                "border rounded-lg p-2 flex flex-col justify-between cursor-pointer transition-all",
                paymentFilter === "pending"
                  ? "bg-card border-amber-500/50 ring-1 ring-amber-500/20"
                  : "bg-card/70 border-border/60 opacity-80 hover:opacity-100"
              )}
              onClick={() => {
                setPaymentFilter("pending");
                setStatusFilter("all");
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-amber-500/10 rounded text-amber-500">
                  <CheckCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Pendientes en listado</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">{listedPendingCount}</span>
                <span className="text-[10px] text-muted-foreground ml-1">facturas</span>
              </div>
            </div>

            <div className="border rounded-lg p-2 flex flex-col justify-between bg-card/70 border-border/60">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-red-500/10 rounded text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Vencidas en listado</span>
              </div>
              <div>
                <span className="text-base font-bold text-red-500">{listedOverdueCount}</span>
                <span className="text-[10px] text-muted-foreground ml-1">facturas</span>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0">
            <DetailNavigationBar
              pageTitle="Facturas"
              contextInfo={
                <SearchBar
                  value={searchInput}
                  onChange={setSearchInput}
                  items={invoices}
                  getSearchText={(invoice) => {
                    const displayNumber = invoice.invoice_number || invoice.preliminary_number || "";
                    return `${displayNumber} ${invoice.client_name || ""} ${invoice.project_number || ""} ${invoice.client_order_number || ""}`;
                  }}
                  renderResult={(invoice) => ({
                    id: invoice.id,
                    label: displayInvoiceNumber(invoice.invoice_number, invoice.preliminary_number, invoice.status),
                    subtitle: `${invoice.client_name || "Sin cliente"} - ${formatCurrency(invoice.total)}`,
                    icon: <Receipt className="h-4 w-4" />,
                    data: invoice,
                  })}
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

          <div className="flex items-center gap-2 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-8 px-3 text-xs", statusFilter !== "all" && "bg-accent")}
                >
                  {statusFilter === "all"
                    ? "Estado"
                    : INVOICE_STATUS_OPTIONS.find((status) => status.value === statusFilter)?.label || statusFilter}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => setStatusFilter("all")}
                  className={cn(statusFilter === "all" && "bg-accent")}
                >
                  Todos los estados
                </DropdownMenuItem>
                {SALES_DOCUMENT_STATUSES.map((status) => (
                  <DropdownMenuItem
                    key={status.value}
                    onClick={() => setStatusFilter(status.value)}
                    className={cn(statusFilter === status.value && "bg-accent")}
                  >
                    {status.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 px-3 text-xs",
                    paymentFilter !== "all" && "bg-amber-500/20 border-amber-500/50 text-amber-400"
                  )}
                >
                  {paymentFilter === "all"
                    ? "Cobros"
                    : paymentFilter === "pending"
                      ? "Pendiente"
                      : paymentFilter === "partial"
                        ? "Parcial"
                        : "Cobrado"}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => setPaymentFilter("all")}
                  className={cn(paymentFilter === "all" && "bg-accent")}
                >
                  Todos los cobros
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setPaymentFilter("pending")}
                  className={cn(paymentFilter === "pending" && "bg-accent", "text-amber-400")}
                >
                  Pendiente de cobro
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setPaymentFilter("partial")}
                  className={cn(paymentFilter === "partial" && "bg-accent", "text-orange-400")}
                >
                  Parcialmente cobrado
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setPaymentFilter("paid")}
                  className={cn(paymentFilter === "paid" && "bg-accent", "text-emerald-400")}
                >
                  Cobrado
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-8 px-3 text-xs", monthFilter !== "all" && "bg-accent")}
                >
                  {monthFilter === "all"
                    ? "Mes"
                    : new Date(monthFilter + "-01").toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                <DropdownMenuItem onClick={() => setMonthFilter("all")} className={cn(monthFilter === "all" && "bg-accent")}>
                  Todos los meses
                </DropdownMenuItem>
                {Array.from({ length: 24 }, (_, i) => {
                  const d = new Date();
                  d.setDate(1);
                  d.setMonth(d.getMonth() - i);
                  const key = d.toISOString().slice(0, 7);
                  return (
                    <DropdownMenuItem key={key} onClick={() => setMonthFilter(key)} className={cn(monthFilter === key && "bg-accent")}>
                      {d.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-xs text-muted-foreground ml-2">
              {monthFilteredInvoices.length} factura{monthFilteredInvoices.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <DataList
              data={paginatedInvoices}
              columns={[
                {
                  key: "invoice_number",
                  label: "Factura",
                  sortable: true,
                  align: "left",
                  priority: 1,
                  render: (invoice) => (
                    <span className="text-foreground/80">
                      {displayInvoiceNumber(invoice.invoice_number, invoice.preliminary_number, invoice.status)}
                    </span>
                  ),
                },
                {
                  key: "client_name",
                  label: "Empresa",
                  sortable: true,
                  align: "left",
                  priority: 2,
                  render: (invoice) => (
                    <span className="text-foreground font-medium truncate block max-w-[180px]">
                      {invoice.client_name || "-"}
                    </span>
                  ),
                },
                {
                  key: "project_number",
                  label: "Proyecto",
                  sortable: true,
                  align: "left",
                  priority: 3,
                  render: (invoice) => (
                    <span className="text-muted-foreground font-mono text-sm">
                      {invoice.project_number || "-"}
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
                    const docStatusInfo = getSalesDocumentStatusInfo(invoice.status);
                    return (
                      <div className="flex justify-center">
                        <Badge
                          variant="outline"
                          className={cn("sales-status-badge sales-status-badge--document", docStatusInfo.className)}
                        >
                          {docStatusInfo.label}
                        </Badge>
                      </div>
                    );
                  },
                },
                {
                  key: "collection_status",
                  label: "Cobros",
                  align: "center",
                  priority: 3,
                  render: (invoice) => {
                    const collectionStatus = getInvoiceCollectionStatus(invoice);
                    const collectionInfo = getCollectionStatusInfo(collectionStatus);

                    if (!collectionInfo) {
                      return <span className="text-muted-foreground text-xs">-</span>;
                    }

                    return (
                      <div className="flex justify-center">
                        <Badge
                          variant="outline"
                          className={cn("sales-status-badge sales-status-badge--collection", collectionInfo.className)}
                        >
                          {collectionInfo.label}
                        </Badge>
                      </div>
                    );
                  },
                },
                {
                  key: "payment_bank_name",
                  label: "Pago",
                  align: "left",
                  priority: 4,
                  render: (invoice) => {
                    if (!invoice.payment_bank_name) {
                      return <span className="text-muted-foreground text-xs">-</span>;
                    }

                    return (
                      <div className="flex items-center gap-1.5">
                        <Landmark className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        <span
                          className="text-foreground/80 text-xs truncate max-w-[100px]"
                          title={invoice.payment_bank_name}
                        >
                          {invoice.payment_bank_name}
                        </span>
                      </div>
                    );
                  },
                },
                {
                  key: "issue_date",
                  label: "Emision",
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
                  key: "subtotal",
                  label: "Base",
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
                  label: "IVA",
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
                  label: "Cobrado",
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
                  condition: (invoice) => getInvoiceDocumentStatus(invoice) === "DRAFT",
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
              footerCells={[
                {
                  key: "invoice_number",
                  value: (
                    <span className="text-muted-foreground text-xs uppercase">
                      Totales del listado ({invoices.length})
                    </span>
                  ),
                  align: "left",
                },
                {
                  key: "subtotal",
                  value: <span>{formatCurrency(invoices.reduce((sum, invoice) => sum + toNumber(invoice.subtotal), 0))}</span>,
                  align: "right",
                },
                {
                  key: "tax_amount",
                  value: <span>{formatCurrency(invoices.reduce((sum, invoice) => sum + toNumber(invoice.tax_amount), 0))}</span>,
                  align: "right",
                },
                {
                  key: "total",
                  value: <span>{formatCurrency(invoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0))}</span>,
                  align: "right",
                },
                {
                  key: "paid_amount",
                  value: (
                    <span className="text-muted-foreground">
                      {formatCurrency(invoices.reduce((sum, invoice) => sum + toNumber(invoice.paid_amount), 0))}
                    </span>
                  ),
                  align: "right",
                },
              ]}
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
  );
};


export default InvoicesPageDesktop;
