import { useState, useEffect, lazy } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search, Loader2, FileText, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import NexoHeader from "./components/NexoHeader";
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
  } = usePagination(invoices, { pageSize: 50 });

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black pb-mobile-nav">
      <NexoHeader title="Facturas" userId={userId || ""} />

      <main className="container mx-auto px-3 md:px-4 pt-20 md:pt-24 pb-4 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Facturas</h1>
              <p className="text-white/60 text-sm">Gestiona todas las facturas</p>
            </div>
            <Button
              onClick={() => navigate(`/nexo-av/${userId}/invoices/new`)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva Factura
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Buscar facturas..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                {INVOICE_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value} className="text-white">
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/60">Emisión</TableHead>
                      <TableHead className="text-white/60">Nº Factura</TableHead>
                      <TableHead className="text-white/60">Cliente</TableHead>
                      <TableHead className="text-white/60">Nº Proyecto</TableHead>
                      <TableHead className="text-white/60">Nº Pedido</TableHead>
                      <TableHead className="text-white/60 text-right">Subtotal</TableHead>
                      <TableHead className="text-white/60 text-right">Total</TableHead>
                      <TableHead className="text-white/60">Estado</TableHead>
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
                          className="border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
                          onClick={() => navigate(`/nexo-av/${userId}/invoices/${invoice.id}`)}
                        >
                          <TableCell className="text-white/60">
                            {invoice.issue_date ? formatDate(invoice.issue_date) : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-white font-medium">
                            <span className={isDraft ? 'text-white/60' : ''}>
                              {displayNumber}
                            </span>
                            {isDraft && (
                              <span className="ml-2 text-[10px] text-amber-400/80">(Borrador)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-white">
                            {invoice.client_name}
                          </TableCell>
                          <TableCell className="text-white/60 font-mono">
                            {invoice.project_number || "-"}
                          </TableCell>
                          <TableCell className="text-white/60">
                            {invoice.client_order_number || "-"}
                          </TableCell>
                          <TableCell className="text-right text-white/60">
                            {formatCurrency(invoice.subtotal)}
                          </TableCell>
                          <TableCell className="text-right text-white font-medium">
                            {formatCurrency(invoice.total)}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusInfo.className}>
                              {statusInfo.label}
                            </Badge>
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
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav userId={userId || ''} />
    </div>
  );
};

// Export version with mobile routing
const InvoicesPage = createMobilePage({
  DesktopComponent: InvoicesPageDesktop,
  MobileComponent: InvoicesPageMobile,
});

export default InvoicesPage;
