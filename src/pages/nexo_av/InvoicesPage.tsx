import { useState, useEffect, lazy } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import MobileBottomNav from "./components/MobileBottomNav";
import PaginationControls from "./components/PaginationControls";
import { createMobilePage } from "./MobilePageWrapper";
import { FINANCE_INVOICE_STATUSES, getFinanceStatusInfo } from "@/constants/financeStatuses";

// Lazy load mobile version
const InvoicesPageMobile = lazy(() => import("./mobile/InvoicesPageMobile"));

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
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(new Set(paginatedInvoices.map(i => i.id)));
    } else {
      setSelectedInvoices(new Set());
    }
  };

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    const newSelected = new Set(selectedInvoices);
    if (checked) {
      newSelected.add(invoiceId);
    } else {
      newSelected.delete(invoiceId);
    }
    setSelectedInvoices(newSelected);
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
    <div className="w-full">
      <div className="w-full px-3 md:px-4 pb-4 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-white/60 text-sm font-medium">Facturado este mes</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-white">
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
                <div className="flex items-center gap-1 mt-1 text-xs text-white/40">
                  <span>Volumen mensual actual</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <span className="text-white/60 text-sm font-medium">Pendiente de Cobro</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-white">
                  {formatCurrency(invoices
                    .filter(inv => inv.status !== 'PAID' && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED')
                    .reduce((sum, inv) => sum + (inv.total || 0), 0)
                  )}
                </span>
                <div className="flex items-center gap-1 mt-1 text-xs text-blue-400">
                  <span>{invoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED').length} facturas pendientes</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <span className="text-white/60 text-sm font-medium">Vencido</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-red-500">
                  {formatCurrency(invoices
                    .filter(inv => {
                      if (inv.status === 'PAID' || inv.status === 'DRAFT' || inv.status === 'CANCELLED') return false;
                      if (!inv.due_date) return false;
                      return new Date(inv.due_date) < new Date();
                    })
                    .reduce((sum, inv) => sum + (inv.total || 0), 0)
                  )}
                </span>
                <div className="flex items-center gap-1 mt-1 text-xs text-red-400/80">
                  <span>Requiere atención inmediata</span>
                </div>
              </div>
            </motion.div>
          </div>
          {/* Header - Estilo Holded */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Facturas</h1>
                <Info className="h-4 w-4 text-white/40" />
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                      Acciones
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                    <DropdownMenuItem className="text-white hover:bg-white/10">
                      Exportar seleccionadas
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-white hover:bg-white/10">
                      Duplicar seleccionadas
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={() => navigate(`/nexo-av/${userId}/invoices/new`)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Nueva factura
                  <span className="ml-2 text-xs opacity-70">N</span>
                </Button>
              </div>
            </div>

            {/* Search and Filters Bar - Estilo Holded */}
            <div className="flex items-center gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-xs border-white/20 text-white/70 hover:bg-white/10",
                      statusFilter === "all" && "bg-white/10 text-white"
                    )}
                  >
                    {statusFilter === "all" ? "Todos" : INVOICE_STATUS_OPTIONS.find(s => s.value === statusFilter)?.label || "Todos"}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-zinc-900 border-white/10">
                  {INVOICE_STATUS_OPTIONS.map((status) => (
                    <DropdownMenuItem
                      key={status.value}
                      onClick={() => setStatusFilter(status.value)}
                      className={cn("text-white hover:bg-white/10", statusFilter === status.value && "bg-white/10")}
                    >
                      {status.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs border-white/20 text-white/70 hover:bg-white/10"
              >
                <Filter className="h-3 w-3 mr-1" />
                Filtro
              </Button>

              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Buscar facturas..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pr-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 h-8 text-xs"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs border-white/20 text-white/70 hover:bg-white/10"
              >
                <Calendar className="h-3 w-3 mr-1" />
                01/12/2025 - 31/12/2025
              </Button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-white/20 mb-4" />
              <p className="text-white/60">No hay facturas</p>
              <p className="text-white/40 text-sm mt-1">
                Las facturas se generan desde presupuestos aprobados
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm shadow-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent bg-white/[0.03]">
                      <TableHead className="w-12 px-4">
                        <Checkbox
                          checked={selectedInvoices.size === paginatedInvoices.length && paginatedInvoices.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="border-white/30 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-white select-none"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1">
                          Emisión
                          {sortColumn === "date" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-white select-none"
                        onClick={() => handleSort("number")}
                      >
                        <div className="flex items-center gap-1">
                          Num
                          {sortColumn === "number" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-white select-none"
                        onClick={() => handleSort("client")}
                      >
                        <div className="flex items-center gap-1">
                          Cliente
                          {sortColumn === "client" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-white select-none"
                        onClick={() => handleSort("project")}
                      >
                        <div className="flex items-center gap-1">
                          Proyecto
                          {sortColumn === "project" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-white/70">Pedido</TableHead>
                      <TableHead className="text-white/70 text-right">Subtotal</TableHead>
                      <TableHead
                        className="text-white/70 text-right cursor-pointer hover:text-white select-none"
                        onClick={() => handleSort("total")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Total
                          {sortColumn === "total" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-white/70">Estado</TableHead>
                      <TableHead className="text-white/70 w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => {
                      const statusInfo = getFinanceStatusInfo(invoice.status);
                      const displayNumber = invoice.invoice_number || invoice.preliminary_number;
                      const isDraft = invoice.status === 'DRAFT';
                      const isSelected = selectedInvoices.has(invoice.id);
                      return (
                        <TableRow
                          key={invoice.id}
                          className={cn(
                            "border-white/10 cursor-pointer hover:bg-white/[0.06] transition-colors duration-200",
                            isSelected && "bg-white/10"
                          )}
                          onClick={() => navigate(`/nexo-av/${userId}/invoices/${invoice.id}`)}
                        >
                          <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                              className="border-white/30 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                          </TableCell>
                          <TableCell className="text-white/80 text-xs">
                            {invoice.issue_date ? formatDate(invoice.issue_date) : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-emerald-500 font-medium text-sm">
                            <span className={isDraft ? 'text-white/60' : ''}>
                              {displayNumber}
                            </span>
                            {isDraft && (
                              <span className="ml-2 text-[10px] text-amber-400/80">(Borrador)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-white text-sm">
                            {invoice.client_name}
                          </TableCell>
                          <TableCell className="text-white/70 font-mono text-sm">
                            {invoice.project_number || "-"}
                          </TableCell>
                          <TableCell className="text-white/70 text-sm">
                            {invoice.client_order_number || "-"}
                          </TableCell>
                          <TableCell className="text-right text-white/60 text-sm">
                            {formatCurrency(invoice.subtotal)}
                          </TableCell>
                          <TableCell className="text-right text-white font-medium text-sm">
                            {formatCurrency(invoice.total)}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(statusInfo.className, "text-xs")}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
                                >
                                  <MoreVertical className="h-4 w-4" />
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
        </motion.div>
      </div>
    </div>
  );
};

// Export version with mobile routing
const InvoicesPage = createMobilePage({
  DesktopComponent: InvoicesPageDesktop,
  MobileComponent: InvoicesPageMobile,
});

export default InvoicesPage;
