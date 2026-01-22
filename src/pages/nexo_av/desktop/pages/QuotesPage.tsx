import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { FileText, Edit, Trash2, Loader2 } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "../components/common/PaginationControls";
import SearchInput from "../components/common/SearchInput";
import { cn } from "@/lib/utils";
import { getStatusInfo } from "@/constants/quoteStatuses";
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
import DataList, { DataListAction } from "../components/common/DataList";


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

          {/* DataList */}
          <DataList
            data={paginatedQuotes}
            columns={[
              {
                key: "created_at",
                label: "Fecha",
                sortable: true,
                align: "left",
                render: (quote) => (
                  <span className="text-white text-[10px]">
                    {new Date(quote.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </span>
                ),
              },
              {
                key: "quote_number",
                label: "Num",
                sortable: true,
                align: "left",
                render: (quote) => (
                  <span className="font-mono text-[13px] font-semibold">
                    {quote.quote_number}
                  </span>
                ),
              },
              {
                key: "client_name",
                label: "Cliente",
                sortable: true,
                align: "left",
                render: (quote) => (
                  <span className="text-white text-[10px]">
                    {quote.client_name || "-"}
                  </span>
                ),
              },
              {
                key: "project_name",
                label: "Proyecto",
                sortable: true,
                align: "left",
                render: (quote) => (
                  <span className="text-white/80 text-[10px]">
                    {quote.project_name || "-"}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Estado",
                align: "center",
                render: (quote) => {
                  const statusInfo = getStatusInfo(quote.status);
                  return (
                    <div className="flex justify-center">
                      <Badge variant="outline" className={cn(statusInfo.className, "border text-[9px] px-1.5 py-0.5 w-20 justify-center")}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  );
                },
              },
              {
                key: "total",
                label: "Total",
                sortable: true,
                align: "right",
                render: (quote) => (
                  <span className="text-white text-[10px]">
                    {formatCurrency(quote.total)}
                  </span>
                ),
              },
            ]}
            actions={[
              {
                label: "Ver detalle",
                onClick: (quote) => navigate(`/nexo-av/${userId}/quotes/${quote.id}`),
              },
              {
                label: "Editar",
                icon: <Edit className="h-3 w-3" />,
                onClick: (quote) => navigate(`/nexo-av/${userId}/quotes/${quote.id}/edit`),
                condition: (quote) => quote.status === "DRAFT",
              },
              {
                label: "Duplicar",
                onClick: () => {},
              },
              {
                label: "Eliminar",
                icon: <Trash2 className="h-3 w-3" />,
                variant: "destructive",
                onClick: (quote) => {
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
                },
                condition: (quote) => quote.status === "DRAFT",
              },
            ]}
            onItemClick={(quote) => navigate(`/nexo-av/${userId}/quotes/${quote.id}`)}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={loading}
            emptyMessage="No hay presupuestos"
            emptyIcon={<FileText className="h-16 w-16 text-muted-foreground" />}
            getItemId={(quote) => quote.id}
          />

          {/* Paginación */}
          {!loading && quotes.length > 0 && totalPages > 1 && (
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
