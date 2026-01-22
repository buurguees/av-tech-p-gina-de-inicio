import { useState, useEffect, lazy } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Loader2, Edit, MoreVertical, ChevronUp, ChevronDown, Calendar, Filter, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "../components/common/PaginationControls";
import SearchInput from "../components/common/SearchInput";
import { cn } from "@/lib/utils";
import { QUOTE_STATUSES, getStatusInfo } from "@/constants/quoteStatuses";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";


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
  const { toast } = useToast();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter, debouncedSearchQuery]);

  const handleSearchChange = (searchTerm: string) => {
    setDebouncedSearchQuery(searchTerm);
  };

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

  const handleQuoteClick = (e: React.MouseEvent, quoteId: string) => {
    // Prevenir navegación si se hace click en elementos interactivos
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('[role="menuitem"]')) {
      return;
    }

    // Siempre navegar a la página de detalle
    navigate(`/nexo-av/${userId}/quotes/${quoteId}`);
  };

  const handleEditClick = (e: React.MouseEvent, quoteId: string) => {
    e.stopPropagation(); // Evitar que se active el onClick de la fila
    navigate(`/nexo-av/${userId}/quotes/${quoteId}/edit`);
  };

  const handleDeleteClick = (e: React.MouseEvent, quote: Quote) => {
    e.stopPropagation();
    if (quote.status !== "DRAFT") {
      toast({
        title: "Error",
        description: "Solo se pueden eliminar presupuestos en estado borrador",
        variant: "destructive",
      });
      return;
    }
    setQuoteToDelete(quote);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quoteToDelete) return;

    try {
      setDeleting(true);

      // First, get quote lines to delete them
      const { data: linesData } = await supabase.rpc("get_quote_lines", {
        p_quote_id: quoteToDelete.id,
      });

      // Delete all quote lines
      if (linesData) {
        for (const line of linesData) {
          await supabase.rpc("delete_quote_line", { p_line_id: line.id });
        }
      }

      // Then cancel/delete the quote by setting status to CANCELLED
      const { error } = await supabase.rpc("update_quote", {
        p_quote_id: quoteToDelete.id,
        p_status: "CANCELLED",
      });

      if (error) throw error;

      toast({
        title: "Presupuesto eliminado",
        description: `El presupuesto ${quoteToDelete.quote_number} ha sido eliminado`,
      });

      // Refresh quotes list
      fetchQuotes();
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
    } catch (error: any) {
      console.error("Error deleting quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el presupuesto",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
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
    <div className="w-full h-full">
      <div className="w-full h-full">
        <div>
          {/* Stats Cards - Optimizado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <div className="bg-card/50 border border-white/10 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-orange-500/10 rounded text-orange-500 text-[10px] font-bold uppercase tracking-wider">
                  Pipeline Activo
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(quotes
                    .filter(q => q.status === 'SENT' || q.status === 'VIEWED' || q.status === 'PENDING')
                    .reduce((sum, q) => sum + (q.total || 0), 0)
                  )}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({quotes.filter(q => q.status === 'SENT' || q.status === 'VIEWED' || q.status === 'PENDING').length} presup.)
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-white/10 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-green-500/10 rounded text-green-500 text-[10px] font-bold uppercase tracking-wider">
                  Tasa Aceptación
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-foreground">
                  {(() => {
                    const closed = quotes.filter(q => q.status === 'ACCEPTED' || q.status === 'REJECTED');
                    if (closed.length === 0) return '0%';
                    const won = closed.filter(q => q.status === 'ACCEPTED').length;
                    return `${Math.round((won / closed.length) * 100)}%`;
                  })()}
                </span>
                <span className="text-[10px] text-muted-foreground">conversión                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-white/10 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-purple-500/10 rounded text-purple-500 text-[10px] font-bold uppercase tracking-wider">
                  Ticket Medio
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(
                    quotes.length > 0
                      ? quotes.reduce((sum, q) => sum + (q.total || 0), 0) / quotes.length
                      : 0
                  )}
                </span>
                <span className="text-[10px] text-muted-foreground">por presupuesto                </span>
              </div>
            </div>
          </div>

          {/* DetailNavigationBar */}
          <div className="mb-6">
            <DetailNavigationBar
              pageTitle="Presupuestos"
              tools={
                <DetailActionButton
                  actionType="quote"
                  onClick={handleNewQuote}
                />
              }
            />
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <SearchInput
              placeholder="Buscar presupuestos..."
              onSearchChange={handleSearchChange}
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay presupuestos</p>
              <p className="text-muted-foreground/70 text-[10px] mt-1">
                Crea tu primer presupuesto para comenzar
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
                        className="text-white/70 cursor-pointer hover:text-foreground select-none text-[10px] px-2 text-left"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1">
                          Fecha
                          {sortColumn === "date" && (
                            sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-foreground select-none text-[10px] px-2 text-left"
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
                        className="text-white/70 cursor-pointer hover:text-foreground select-none text-[10px] px-2 text-left"
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
                        className="text-white/70 cursor-pointer hover:text-foreground select-none text-[10px] px-2 text-left"
                        onClick={() => handleSort("project")}
                      >
                        <div className="flex items-center gap-1">
                          Proyecto
                          {sortColumn === "project" && (
                            sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-white/70 text-[10px] px-2 text-center">Estado</TableHead>
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
                      <TableHead className="text-white/70 w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedQuotes.map((quote) => {
                      const statusInfo = getStatusInfo(quote.status);
                      const isDraft = quote.status === "DRAFT";
                      return (
                        <TableRow
                          key={quote.id}
                          className="border-white/10 cursor-pointer hover:bg-white/[0.06] transition-colors duration-200"
                          onClick={(e) => handleQuoteClick(e, quote.id)}
                        >
                          <TableCell className="text-white text-[10px]">
                            {new Date(quote.created_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="font-mono text-white/70 text-[13px] font-semibold">
                            {quote.quote_number}
                          </TableCell>
                          <TableCell className="text-white text-[10px]">
                            {quote.client_name || "-"}
                          </TableCell>
                          <TableCell className="text-white/80 text-[10px]">
                            {quote.project_name || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Badge variant="outline" className={cn(statusInfo.className, "border text-[9px] px-1.5 py-0.5 w-20 justify-center")}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-white text-[10px]">
                            {formatCurrency(quote.total)}
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
                                    navigate(`/nexo-av/${userId}/quotes/${quote.id}`);
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
                                    <Edit className="h-3 w-3 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="text-white hover:bg-white/10">
                                  Duplicar
                                </DropdownMenuItem>
                                {isDraft && (
                                  <DropdownMenuItem
                                    className="text-red-400 hover:bg-red-500/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(e, quote);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" />
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Esta acción eliminará permanentemente el presupuesto {quoteToDelete?.quote_number} y todas sus líneas.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              disabled={deleting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuotesPageDesktop;
