import { useState, useEffect, lazy } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, FileText, Loader2, Edit, MoreVertical, ChevronUp, ChevronDown, Info, Calendar, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import NexoHeader from "./components/NexoHeader";
import PaginationControls from "./components/PaginationControls";
import MobileBottomNav from "./components/MobileBottomNav";
import { cn } from "@/lib/utils";
import { createMobilePage } from "./MobilePageWrapper";
import { QUOTE_STATUSES, getStatusInfo } from "@/constants/quoteStatuses";

// Lazy load mobile version
const QuotesPageMobile = lazy(() => import("./mobile/QuotesPageMobile"));

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

const QuotesPageDesktop = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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

  const handleQuoteClick = (quoteId: string, status?: string) => {
    // Si es DRAFT, ir directamente a editar
    if (status === "DRAFT") {
      navigate(`/nexo-av/${userId}/quotes/${quoteId}/edit`);
    } else {
      navigate(`/nexo-av/${userId}/quotes/${quoteId}`);
    }
  };

  const handleEditClick = (e: React.MouseEvent, quoteId: string) => {
    e.stopPropagation(); // Evitar que se active el onClick de la fila
    navigate(`/nexo-av/${userId}/quotes/${quoteId}/edit`);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuotes(new Set(paginatedQuotes.map(q => q.id)));
    } else {
      setSelectedQuotes(new Set());
    }
  };

  const handleSelectQuote = (quoteId: string, checked: boolean) => {
    const newSelected = new Set(selectedQuotes);
    if (checked) {
      newSelected.add(quoteId);
    } else {
      newSelected.delete(quoteId);
    }
    setSelectedQuotes(newSelected);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedQuotes = [...quotes].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aValue: any;
    let bValue: any;
    
    switch (sortColumn) {
      case "number":
        aValue = a.quote_number;
        bValue = b.quote_number;
        break;
      case "client":
        aValue = a.client_name || "";
        bValue = b.client_name || "";
        break;
      case "project":
        aValue = a.project_name || "";
        bValue = b.project_name || "";
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "total":
        aValue = a.total;
        bValue = b.total;
        break;
      case "date":
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
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
    paginatedData: paginatedQuotes,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(sortedQuotes, { pageSize: 50 });

  return (
    <div className="min-h-screen bg-black pb-mobile-nav">
      <NexoHeader title="Presupuestos" userId={userId || ""} showBack={false} showHome={true} />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 md:py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header - Estilo Holded */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Presupuestos</h1>
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
                      Exportar seleccionados
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-white hover:bg-white/10">
                      Duplicar seleccionados
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={handleNewQuote}
                  className="bg-orange-500 hover:bg-orange-600 text-white h-9 px-4 text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Nuevo presupuesto
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
                      statusFilter === null && "bg-white/10 text-white"
                    )}
                  >
                    {statusFilter === null ? "Todos" : QUOTE_STATUSES.find(s => s.value === statusFilter)?.label || "Todos"}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-zinc-900 border-white/10">
                  <DropdownMenuItem 
                    onClick={() => setStatusFilter(null)}
                    className={cn("text-white hover:bg-white/10", statusFilter === null && "bg-white/10")}
                  >
                    Todos
                  </DropdownMenuItem>
                  {QUOTE_STATUSES.map((status) => (
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
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Buscar presupuestos..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 h-8 text-xs"
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

          {/* Desktop table view */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm shadow-lg"
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
                    <TableRow className="border-white/10 hover:bg-transparent bg-white/[0.03]">
                      <TableHead className="w-12 px-4">
                        <Checkbox
                          checked={selectedQuotes.size === paginatedQuotes.length && paginatedQuotes.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="border-white/30 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                        />
                      </TableHead>
                      <TableHead 
                        className="text-white/70 cursor-pointer hover:text-white select-none"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1">
                          Fecha
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
                      <TableHead className="text-white/70">Estado</TableHead>
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
                      <TableHead className="text-white/70 w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedQuotes.map((quote) => {
                      const statusInfo = getStatusInfo(quote.status);
                      const isDraft = quote.status === "DRAFT";
                      const isSelected = selectedQuotes.has(quote.id);
                      return (
                        <TableRow
                          key={quote.id}
                          className={cn(
                            "border-white/10 hover:bg-white/[0.06] cursor-pointer transition-colors duration-200",
                            isSelected && "bg-white/10"
                          )}
                          onClick={() => handleQuoteClick(quote.id, quote.status)}
                        >
                          <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectQuote(quote.id, checked as boolean)}
                              className="border-white/30 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                            />
                          </TableCell>
                          <TableCell className="text-white/80 text-xs">
                            {new Date(quote.created_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="font-mono text-orange-500 font-medium text-sm">
                            {quote.quote_number}
                          </TableCell>
                          <TableCell className="text-white text-sm">
                            {quote.client_name || "-"}
                          </TableCell>
                          <TableCell className="text-white/70 text-sm">
                            {quote.project_name || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(statusInfo.className, "text-xs")}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white font-medium text-right text-sm">
                            {formatCurrency(quote.total)}
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
                                    handleQuoteClick(quote.id, quote.status);
                                  }}
                                >
                                  Ver detalle
                                </DropdownMenuItem>
                                {isDraft && (
                                  <DropdownMenuItem 
                                    className="text-white hover:bg-white/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditClick(e, quote.id);
                                    }}
                                  >
                                    Editar
                                  </DropdownMenuItem>
                                )}
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

// Export version with mobile routing
const QuotesPage = createMobilePage({
  DesktopComponent: QuotesPageDesktop,
  MobileComponent: QuotesPageMobile,
});

export default QuotesPage;
