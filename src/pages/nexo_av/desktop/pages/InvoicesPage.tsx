import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, AlertCircle, CheckCircle, Receipt, Landmark, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "../components/common/PaginationControls";
import { useDebounce } from "@/hooks/useDebounce";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import {
  getSalesDocumentStatusInfo,
  calculateCollectionStatus,
  getCollectionStatusInfo,
  SALES_DOCUMENT_STATUSES,
  displayInvoiceNumber,
} from "@/constants/salesInvoiceStatuses";
import DataList, { DataListFooterCell } from "../components/common/DataList";
import SearchBar from "../components/common/SearchBar";
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

// Status options for the filter dropdown
const INVOICE_STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  ...SALES_DOCUMENT_STATUSES,
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
  const [paymentFilter, setPaymentFilter] = useState("all"); // all, pending, paid, partial
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchInvoices();
  }, [debouncedSearchQuery, statusFilter, paymentFilter]);


  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("finance_list_invoices", {
        p_search: debouncedSearchQuery || null,
        p_status: statusFilter === "all" ? null : statusFilter,
      });
      if (error) throw error;
      
      // Mapear datos agregando campos faltantes con valores por defecto
      let mappedData: Invoice[] = (data || []).map((inv: any) => ({
        ...inv,
        payment_bank_name: inv.payment_bank_name || null,
        payment_bank_id: inv.payment_bank_id || null,
      }));
      
      // Aplicar filtro de estado de pago
      if (paymentFilter === "pending") {
        // Pendiente de cobro: tiene saldo pendiente > 0
        mappedData = mappedData.filter((inv) => inv.pending_amount > 0);
      } else if (paymentFilter === "paid") {
        // Cobrado completamente
        mappedData = mappedData.filter((inv) => 
          inv.pending_amount <= 0 || inv.status === 'PAID'
        );
      } else if (paymentFilter === "partial") {
        // Parcialmente cobrado: tiene cobros pero no está completo
        mappedData = mappedData.filter((inv) => 
          inv.paid_amount > 0 && inv.pending_amount > 0
        );
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
    <div className="w-full h-full flex flex-col overflow-hidden p-6">
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Summary Metric Cards - Clickable Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 flex-shrink-0">
            <div 
              className={cn(
                "border rounded-lg p-2 flex flex-col justify-between cursor-pointer transition-all",
                paymentFilter === "all" && statusFilter === "all"
                  ? "bg-zinc-900/50 border-white/10"
                  : "bg-zinc-900/30 border-white/5 opacity-60 hover:opacity-80"
              )}
              onClick={() => { setPaymentFilter("all"); setStatusFilter("all"); }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-emerald-500/10 rounded text-emerald-500">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <span className="text-white/60 text-[9px] px-1.5 py-0.5 font-medium">Todas las facturas</span>
              </div>
              <div>
                <span className="text-base font-bold text-white">
                  {invoices.length}
                </span>
                <span className="text-[10px] text-white/40 ml-1">facturas</span>
              </div>
            </div>

            <div 
              className={cn(
                "border rounded-lg p-2 flex flex-col justify-between cursor-pointer transition-all",
                paymentFilter === "pending"
                  ? "bg-zinc-900/50 border-amber-500/30 ring-1 ring-amber-500/20"
                  : "bg-zinc-900/30 border-white/5 opacity-60 hover:opacity-80"
              )}
              onClick={() => { setPaymentFilter("pending"); setStatusFilter("all"); }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-amber-500/10 rounded text-amber-500">
                  <CheckCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-white/60 text-[9px] px-1.5 py-0.5 font-medium">Pendiente de Cobro</span>
              </div>
              <div>
                <span className="text-base font-bold text-white">
                  {invoices.filter(inv => inv.pending_amount > 0).length}
                </span>
                <span className="text-[10px] text-white/40 ml-1">facturas</span>
              </div>
            </div>

            <div 
              className={cn(
                "border rounded-lg p-2 flex flex-col justify-between cursor-pointer transition-all",
                paymentFilter === "all" && statusFilter === "all" ? "bg-zinc-900/30 border-white/5 opacity-60 hover:opacity-80" : "bg-zinc-900/30 border-white/5 opacity-60 hover:opacity-80"
              )}
              onClick={() => { setPaymentFilter("all"); setStatusFilter("all"); }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-red-500/10 rounded text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-white/60 text-[9px] px-1.5 py-0.5 font-medium">Vencido</span>
              </div>
              <div>
                <span className="text-base font-bold text-red-500">
                  {invoices.filter(inv => {
                    if (inv.status === 'PAID' || inv.status === 'DRAFT' || inv.status === 'CANCELLED') return false;
                    if (!inv.due_date || inv.pending_amount <= 0) return false;
                    return new Date(inv.due_date) < new Date();
                  }).length}
                </span>
                <span className="text-[10px] text-red-400/60 ml-1">facturas vencidas</span>
              </div>
            </div>
          </div>

          {/* DetailNavigationBar */}
          <div className="mb-4 flex-shrink-0">
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
                    return {
                      id: invoice.id,
                      label: displayInvoiceNumber(invoice.invoice_number, invoice.preliminary_number, invoice.status),
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

          {/* Filtros */}
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            {/* Filtro de Estado del Documento */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 px-3 text-xs",
                    statusFilter !== "all" && "bg-accent"
                  )}
                >
                  {statusFilter === "all" 
                    ? "Estado" 
                    : SALES_DOCUMENT_STATUSES.find(s => s.value === statusFilter)?.label || statusFilter}
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

            {/* Filtro de Estado de Cobro */}
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
                  className={cn(
                    paymentFilter === "pending" && "bg-accent",
                    "text-amber-400"
                  )}
                >
                  🔴 Pendiente de cobro
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setPaymentFilter("partial")}
                  className={cn(
                    paymentFilter === "partial" && "bg-accent",
                    "text-orange-400"
                  )}
                >
                  🟠 Parcialmente cobrado
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setPaymentFilter("paid")}
                  className={cn(
                    paymentFilter === "paid" && "bg-accent",
                    "text-emerald-400"
                  )}
                >
                  🟢 Cobrado
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-xs text-muted-foreground ml-2">
              {invoices.length} factura{invoices.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* DataList */}
          <div className="flex-1 min-h-0 overflow-hidden">
          <DataList
            data={paginatedInvoices}
            columns={[
              {
                key: "invoice_number",
                label: "Nº Factura",
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
                label: "Nº Proyecto",
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
                      <Badge variant="outline" className={cn("sales-status-badge sales-status-badge--document", docStatusInfo.className)}>
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
                  const collectionStatus = calculateCollectionStatus(
                    invoice.paid_amount,
                    invoice.total,
                    invoice.due_date,
                    invoice.status
                  );
                  const collectionInfo = getCollectionStatusInfo(collectionStatus);
                  
                  if (!collectionInfo) {
                    return <span className="text-muted-foreground text-xs">—</span>;
                  }
                  
                  return (
                    <div className="flex justify-center">
                      <Badge variant="outline" className={cn("sales-status-badge sales-status-badge--collection", collectionInfo.className)}>
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
                    return <span className="text-muted-foreground text-xs">—</span>;
                  }
                  return (
                    <div className="flex items-center gap-1.5">
                      <Landmark className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      <span className="text-foreground/80 text-xs truncate max-w-[100px]" title={invoice.payment_bank_name}>
                        {invoice.payment_bank_name}
                      </span>
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
            footerCells={[
              { key: "invoice_number", value: <span className="text-muted-foreground text-xs uppercase">Totales ({invoices.length})</span>, align: "left" },
              { key: "subtotal", value: <span>{formatCurrency(invoices.reduce((s, i) => s + (i.subtotal || 0), 0))}</span>, align: "right" },
              { key: "tax_amount", value: <span>{formatCurrency(invoices.reduce((s, i) => s + (i.tax_amount || 0), 0))}</span>, align: "right" },
              { key: "total", value: <span>{formatCurrency(invoices.reduce((s, i) => s + (i.total || 0), 0))}</span>, align: "right" },
              { key: "paid_amount", value: <span className="text-muted-foreground">{formatCurrency(invoices.reduce((s, i) => s + (i.paid_amount || 0), 0))}</span>, align: "right" },
            ]}
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
