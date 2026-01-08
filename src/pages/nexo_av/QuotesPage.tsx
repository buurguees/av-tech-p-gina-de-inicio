import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import NexoHeader from "./components/NexoHeader";
import PaginationControls from "./components/PaginationControls";
import MobileBottomNav from "./components/MobileBottomNav";
import { cn } from "@/lib/utils";

interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  client_name: string | null;
  project_name: string | null;
  order_number: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  valid_until: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

const QUOTE_STATUSES = [
  { value: "DRAFT", label: "Borrador", className: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
  { value: "SENT", label: "Enviado", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { value: "APPROVED", label: "Aprobado", className: "bg-green-500/20 text-green-300 border-green-500/30" },
  { value: "REJECTED", label: "Rechazado", className: "bg-red-500/20 text-red-300 border-red-500/30" },
  { value: "EXPIRED", label: "Expirado", className: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  { value: "INVOICED", label: "Facturado", className: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
];

const getStatusInfo = (status: string) => {
  return QUOTE_STATUSES.find(s => s.value === status) || QUOTE_STATUSES[0];
};

const QuotesPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter, debouncedSearchQuery]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_quotes", {
        p_status: statusFilter,
        p_search: debouncedSearchQuery || null,
      });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error("Error fetching quotes:", error);
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

  const handleNewQuote = () => {
    navigate(`/nexo-av/${userId}/quotes/new`);
  };

  const handleQuoteClick = (quoteId: string) => {
    navigate(`/nexo-av/${userId}/quotes/${quoteId}`);
  };

  // Pagination (50 records per page)
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedQuotes,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(quotes, { pageSize: 50 });

  return (
    <div className="min-h-screen bg-black pb-mobile-nav">
      <NexoHeader title="Presupuestos" userId={userId || ""} showBack={false} showHome={true} />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 md:py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header - simplified for mobile */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold text-white">Presupuestos</h1>
              <p className="text-white/60 text-sm">Gestiona todos los presupuestos</p>
            </div>
            
            <Button
              onClick={handleNewQuote}
              className="bg-white text-black hover:bg-white/90 h-9 md:h-10 text-sm ml-auto"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Nuevo Presupuesto</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-2 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Buscar..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9 text-sm"
              />
            </div>
            
            <div className="flex gap-1.5 flex-wrap">
              <Button
                variant={statusFilter === null ? "secondary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(null)}
                className={cn(
                  "h-7 px-2 text-xs",
                  statusFilter === null 
                    ? "bg-white/20 text-white" 
                    : "border-white/20 text-white/70 hover:bg-white/10"
                )}
              >
                Todos
              </Button>
              {QUOTE_STATUSES.map((status) => (
                <Button
                  key={status.value}
                  variant={statusFilter === status.value ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status.value)}
                  className={cn(
                    "h-7 px-2 text-xs",
                    statusFilter === status.value 
                      ? "bg-white/20 text-white" 
                      : "border-white/20 text-white/70 hover:bg-white/10"
                  )}
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : quotes.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm shadow-sm">
                <FileText className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No hay presupuestos</p>
                <Button
                  variant="link"
                  onClick={handleNewQuote}
                  className="text-white/60 hover:text-white text-sm mt-2"
                >
                  Crear el primero
                </Button>
              </div>
            ) : (
              <>
                {paginatedQuotes.map((quote) => {
                  const statusInfo = getStatusInfo(quote.status);
                  return (
                    <button
                      key={quote.id}
                      onClick={() => handleQuoteClick(quote.id)}
                      className="w-full p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200 text-left backdrop-blur-sm active:scale-[0.98] shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-orange-500 text-xs font-medium">
                          {quote.quote_number}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`${statusInfo.className} text-[9px] px-1.5 py-0`}
                        >
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-white text-xs font-medium uppercase truncate">
                        {quote.client_name || 'Sin cliente'}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-white/40 text-[10px] truncate max-w-[50%]">
                          {quote.created_by_name || 'Usuario'}
                        </span>
                        <span className="text-white font-medium text-xs">
                          {formatCurrency(quote.total)}
                        </span>
                      </div>
                    </button>
                  );
                })}
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
              </>
            )}
          </div>

          {/* Desktop table view */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="hidden md:block bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white/40" />
              </div>
            ) : quotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-16 w-16 text-white/20 mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No hay presupuestos</h3>
                <p className="text-white/60 mb-6">
                  {searchInput || statusFilter
                    ? "No se encontraron presupuestos con los filtros aplicados"
                    : "Crea tu primer presupuesto para comenzar"}
                </p>
                {!searchInput && !statusFilter && (
                  <Button
                    onClick={handleNewQuote}
                    className="bg-white text-black hover:bg-white/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Presupuesto
                  </Button>
                )}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/70">Num.</TableHead>
                      <TableHead className="text-white/70">Cliente</TableHead>
                      <TableHead className="text-white/70">Proyecto</TableHead>
                      <TableHead className="text-white/70">Estado</TableHead>
                      <TableHead className="text-white/70 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedQuotes.map((quote) => {
                      const statusInfo = getStatusInfo(quote.status);
                      return (
                        <TableRow
                          key={quote.id}
                          className="border-white/10 hover:bg-white/[0.06] cursor-pointer transition-colors duration-200"
                          onClick={() => handleQuoteClick(quote.id)}
                        >
                          <TableCell className="font-mono text-orange-500 font-medium">
                            {quote.quote_number}
                          </TableCell>
                          <TableCell className="text-white uppercase">
                            {quote.client_name || "-"}
                          </TableCell>
                          <TableCell className="text-white/80">
                            {quote.project_name || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusInfo.className}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white font-medium text-right">
                            {formatCurrency(quote.total)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {paginatedQuotes.length > 0 && (
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
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav userId={userId || ''} />
    </div>
  );
};

export default QuotesPage;
