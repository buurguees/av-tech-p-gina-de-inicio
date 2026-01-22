import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Loader2, FileText, Plus, MoreVertical, ChevronUp, ChevronDown, Info, Calendar, Filter, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "../components/common/PaginationControls";
import { FINANCE_INVOICE_STATUSES, getFinanceStatusInfo } from "@/constants/financeStatuses";


interface Invoice {
  id: string;
  invoice_number: string;
  preliminary_number: string;
  source_quote_id: string | null;
  source_quote_number: string | null;
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
    <div className="w-full h-full">
      <div className="w-full h-full">
        <div>
          {/* Summary Metric Cards - Optimizado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
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
                      const d = new Date(inv.issue_date);
                      const now = new Date();
                      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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
          {/* Header - Estilo Holded */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Facturas</h1>
                <Info className="h-3 w-3 text-muted-foreground" />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate(`/nexo-av/${userId}/invoices/new`)}
                  className="h-9 px-2 text-[10px] font-medium"
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  Nueva factura
                  <span className="ml-2 text-[9px] px-1.5 py-0.5 opacity-70">N</span>
                </Button>
              </div>
            </div>

            {/* Search Bar - Estilo Holded */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar facturas..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pr-11 h-8 text-[9px] px-1.5 py-0.5"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay facturas</p>
              <p className="text-muted-foreground/70 text-[10px] mt-1">
                Las facturas se generan desde presupuestos aprobados
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md w-full">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30">
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-white select-none text-[10px] px-2"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1">
                          Emisión
                          {sortColumn === "date" && (
                            sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-white select-none text-[10px] px-2"
                        onClick={() => handleSort("number")}
                      >
                        <div className="flex items-center gap-1">
                          Num
                          {sortColumn === "number" && (
                            sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-white select-none text-[10px] px-2"
                        onClick={() => handleSort("client")}
                      >
                        <div className="flex items-center gap-1">
                          Cliente
                          {sortColumn === "client" && (
                            sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-white select-none text-[10px] px-2"
                        onClick={() => handleSort("project")}
                      >
                        <div className="flex items-center gap-1">
                          Proyecto
                          {sortColumn === "project" && (
                            sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-white/70 text-[10px] px-2 text-left">Pedido</TableHead>
                      <TableHead className="text-white/70 text-[10px] px-2 text-right">Subtotal</TableHead>
                      <TableHead
                        className="text-white/70 text-[10px] px-2 text-right cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("total")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Total
                          {sortColumn === "total" && (
                            sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-white/70 text-[10px] px-2 text-center">Estado</TableHead>
                      <TableHead className="text-white/70 w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => {
                      const statusInfo = getFinanceStatusInfo(invoice.status);
                      const displayNumber = invoice.invoice_number || invoice.preliminary_number;
                      const isDraft = invoice.status === 'DRAFT';
                      return (
                        <TableRow
                          key={invoice.id}
                          className="border-white/10 cursor-pointer hover:bg-white/[0.06] transition-colors duration-200"
                          onClick={() => navigate(`/nexo-av/${userId}/invoices/${invoice.id}`)}
                        >
                          <TableCell className="text-white/80 text-[9px] px-1.5 py-0.5">
                            {invoice.issue_date ? formatDate(invoice.issue_date) : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-white/70 text-[13px] font-semibold">
                            {displayNumber}
                          </TableCell>
                          <TableCell className="text-white text-[10px]">
                            {invoice.client_name}
                          </TableCell>
                          <TableCell className="text-white/80 text-[10px]">
                            {invoice.project_number || "-"}
                          </TableCell>
                          <TableCell className="text-white/70 text-[10px]">
                            {invoice.client_order_number || "-"}
                          </TableCell>
                          <TableCell className="text-white/70 text-[10px]">
                            {formatCurrency(invoice.subtotal)}
                          </TableCell>
                          <TableCell className="text-white text-[10px]">
                            {formatCurrency(invoice.total)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Badge variant="outline" className={cn(statusInfo.className, "border text-[9px] px-1.5 py-0.5 w-20 justify-center")}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                                <DropdownMenuItem
                                  className="text-white hover:bg-white/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/nexo-av/${userId}/invoices/${invoice.id}`);
                                  }}
                                >
                                  Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-white hover:bg-white/10">
                                  Duplicar
                                </DropdownMenuItem>
                                {isDraft && (
                                  <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">
                                    Eliminar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoicesPageDesktop;
