import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { FileText, Edit, Trash2, Loader2, Copy, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useDebounce } from "@/hooks/useDebounce";
import { cn, toNumber } from "@/lib/utils";
import { getStatusInfo } from "@/constants/quoteStatuses";
import SearchBar from "../components/common/SearchBar";
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
import DataList, { DataListAction, DataListFooterCell } from "../components/common/DataList";


interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  client_name: string | null;
  project_name: string | null;
  order_number: string | null;
  project_client_order_number: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  valid_until: string | null;
  issue_date: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface QuoteStatusStats {
  sent: number;
  approved: number;
  expired: number;
  draft: number;
  rejected: number;
  invoiced: number;
}

const QuotesPageDesktop = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteStats, setQuoteStats] = useState<QuoteStatusStats>({
    sent: 0,
    approved: 0,
    expired: 0,
    draft: 0,
    rejected: 0,
    invoiced: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [amountRange, setAmountRange] = useState("all");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter, debouncedSearchQuery]);


  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const [{ data, error }, { data: statsData, error: statsError }] = await Promise.all([
        supabase.rpc("list_quotes", {
          p_status: statusFilter,
          p_search: debouncedSearchQuery || null,
        }),
        supabase.rpc("list_quotes", {
          p_status: null,
          p_search: debouncedSearchQuery || null,
        }),
      ]);

      if (error) throw error;
      if (statsError) throw statsError;

      const statsSource = statsData || [];
      setQuoteStats({
        sent: statsSource.filter((quote: Quote) => quote.status === "SENT").length,
        approved: statsSource.filter((quote: Quote) => quote.status === "APPROVED").length,
        expired: statsSource.filter((quote: Quote) => quote.status === "EXPIRED").length,
        draft: statsSource.filter((quote: Quote) => quote.status === "DRAFT").length,
        rejected: statsSource.filter((quote: Quote) => quote.status === "REJECTED").length,
        invoiced: statsSource.filter((quote: Quote) => quote.status === "INVOICED").length,
      });

      setQuotes(data || []);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      setQuoteStats({
        sent: 0,
        approved: 0,
        expired: 0,
        draft: 0,
        rejected: 0,
        invoiced: 0,
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

  // Clientes únicos para el dropdown
  const uniqueClients = useMemo(() => {
    const seen = new Set<string>();
    return quotes
      .filter((q) => q.client_name)
      .map((q) => q.client_name!)
      .filter((name) => { if (seen.has(name)) return false; seen.add(name); return true; })
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [quotes]);

  // Filtros combinados client-side
  const monthFilteredQuotes = useMemo(() => {
    let result = quotes;
    if (monthFilter !== "all") {
      result = result.filter((q) => q.issue_date?.startsWith(monthFilter));
    }
    if (clientFilter !== "all") {
      result = result.filter((q) => q.client_name === clientFilter);
    }
    if (amountRange !== "all") {
      result = result.filter((q) => {
        const t = q.total;
        if (amountRange === "lt500") return t < 500;
        if (amountRange === "500-2000") return t >= 500 && t < 2000;
        if (amountRange === "2000-10000") return t >= 2000 && t < 10000;
        if (amountRange === "gt10000") return t >= 10000;
        return true;
      });
    }
    return result;
  }, [quotes, monthFilter, clientFilter, amountRange]);

  const sortedQuotes = [...monthFilteredQuotes].sort((a, b) => {
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

  const paginatedQuotes = sortedQuotes;

  return (
    <div className="flex flex-col h-full gap-3">
          {/* Stats Cards - Clickable Filters */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 flex-shrink-0">
            <div
              className={cn(
                "border rounded-lg p-2 cursor-pointer transition-all",
                statusFilter === 'SENT'
                  ? "bg-card/50 border-blue-500/30 ring-1 ring-blue-500/20"
                  : "bg-card/50 border-border/60 opacity-70 hover:opacity-100"
              )}
              onClick={() => setStatusFilter(statusFilter === 'SENT' ? null : 'SENT')}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-blue-500/10 rounded text-blue-500 text-[10px] font-bold uppercase tracking-wider">
                  Enviados
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-foreground">
                  {quoteStats.sent}
                </span>
                <span className="text-[10px] text-muted-foreground">pendientes de respuesta</span>
              </div>
            </div>

            <div
              className={cn(
                "border rounded-lg p-2 cursor-pointer transition-all",
                statusFilter === 'APPROVED'
                  ? "bg-card/50 border-green-500/30 ring-1 ring-green-500/20"
                  : "bg-card/50 border-border/60 opacity-70 hover:opacity-100"
              )}
              onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? null : 'APPROVED')}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-green-500/10 rounded text-green-500 text-[10px] font-bold uppercase tracking-wider">
                  Aprobados
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-foreground">
                  {quoteStats.approved}
                </span>
                <span className="text-[10px] text-muted-foreground">presupuestos</span>
              </div>
            </div>

            <div
              className={cn(
                "border rounded-lg p-2 cursor-pointer transition-all",
                statusFilter === 'EXPIRED'
                  ? "bg-card/50 border-amber-500/30 ring-1 ring-amber-500/20"
                  : "bg-card/50 border-border/60 opacity-70 hover:opacity-100"
              )}
              onClick={() => setStatusFilter(statusFilter === 'EXPIRED' ? null : 'EXPIRED')}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-amber-500/10 rounded text-amber-500 text-[10px] font-bold uppercase tracking-wider">
                  Vencidos
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-foreground">
                  {quoteStats.expired}
                </span>
                <span className="text-[10px] text-muted-foreground">presupuestos</span>
              </div>
            </div>

            <div
              className={cn(
                "border rounded-lg p-2 cursor-pointer transition-all",
                statusFilter === 'DRAFT'
                  ? "bg-card/50 border-purple-500/30 ring-1 ring-purple-500/20"
                  : "bg-card/50 border-border/60 opacity-70 hover:opacity-100"
              )}
              onClick={() => setStatusFilter(statusFilter === 'DRAFT' ? null : 'DRAFT')}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-purple-500/10 rounded text-purple-500 text-[10px] font-bold uppercase tracking-wider">
                  Borradores
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-foreground">
                  {quoteStats.draft}
                </span>
                <span className="text-[10px] text-muted-foreground">pendientes de enviar</span>
              </div>
            </div>

            <div
              className={cn(
                "border rounded-lg p-2 cursor-pointer transition-all",
                statusFilter === 'INVOICED'
                  ? "bg-card/50 border-cyan-500/30 ring-1 ring-cyan-500/20"
                  : "bg-card/50 border-border/60 opacity-70 hover:opacity-100"
              )}
              onClick={() => setStatusFilter(statusFilter === 'INVOICED' ? null : 'INVOICED')}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-cyan-500/10 rounded text-cyan-500 text-[10px] font-bold uppercase tracking-wider">
                  Facturados
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-foreground">
                  {quoteStats.invoiced}
                </span>
                <span className="text-[10px] text-muted-foreground">convertidos a factura</span>
              </div>
            </div>

            <div
              className={cn(
                "border rounded-lg p-2 cursor-pointer transition-all",
                statusFilter === 'REJECTED'
                  ? "bg-card/50 border-rose-500/30 ring-1 ring-rose-500/20"
                  : "bg-card/50 border-border/60 opacity-70 hover:opacity-100"
              )}
              onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? null : 'REJECTED')}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-rose-500/10 rounded text-rose-500 text-[10px] font-bold uppercase tracking-wider">
                  Rechazados
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-foreground">
                  {quoteStats.rejected}
                </span>
                <span className="text-[10px] text-muted-foreground">presupuestos perdidos</span>
              </div>
            </div>
          </div>

          {/* DetailNavigationBar */}
          <div className="flex-shrink-0">
            <DetailNavigationBar
              pageTitle="Presupuestos"
              contextInfo={
                <SearchBar
                  value={searchInput}
                  onChange={setSearchInput}
                  items={quotes}
                  getSearchText={(quote) => `${quote.quote_number} ${quote.client_name || ''} ${quote.project_name || ''} ${quote.order_number || ''}`}
                  renderResult={(quote) => ({
                    id: quote.id,
                    label: quote.quote_number,
                    subtitle: `${quote.client_name || 'Sin cliente'} - ${formatCurrency(quote.total)}`,
                    icon: <FileText className="h-4 w-4" />,
                    data: quote,
                  })}
                  onSelectResult={(result) => {
                    navigate(`/nexo-av/${userId}/quotes/${result.data.id}`);
                  }}
                  placeholder="Buscar presupuestos..."
                  maxResults={8}
                  debounceMs={300}
                />
              }
              tools={
                <DetailActionButton
                  actionType="quote"
                  onClick={handleNewQuote}
                />
              }
            />
          </div>

          {/* Barra de filtros */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {/* Mes */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 px-3 text-xs", monthFilter !== "all" && "bg-accent")}>
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

            {/* Cliente */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 px-3 text-xs max-w-[160px]", clientFilter !== "all" && "bg-accent")}>
                  <span className="truncate">
                    {clientFilter === "all" ? "Cliente" : clientFilter}
                  </span>
                  <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto max-w-[240px]">
                <DropdownMenuItem onClick={() => setClientFilter("all")} className={cn(clientFilter === "all" && "bg-accent")}>
                  Todos los clientes
                </DropdownMenuItem>
                {uniqueClients.map((name) => (
                  <DropdownMenuItem key={name} onClick={() => setClientFilter(name)} className={cn(clientFilter === name && "bg-accent")}>
                    <span className="truncate">{name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Importe */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 px-3 text-xs", amountRange !== "all" && "bg-accent")}>
                  {amountRange === "all" ? "Importe" :
                    amountRange === "lt500" ? "< 500€" :
                    amountRange === "500-2000" ? "500 – 2.000€" :
                    amountRange === "2000-10000" ? "2.000 – 10.000€" :
                    "> 10.000€"}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setAmountRange("all")} className={cn(amountRange === "all" && "bg-accent")}>
                  Todos los importes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAmountRange("lt500")} className={cn(amountRange === "lt500" && "bg-accent")}>
                  Menos de 500€
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAmountRange("500-2000")} className={cn(amountRange === "500-2000" && "bg-accent")}>
                  500€ – 2.000€
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAmountRange("2000-10000")} className={cn(amountRange === "2000-10000" && "bg-accent")}>
                  2.000€ – 10.000€
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAmountRange("gt10000")} className={cn(amountRange === "gt10000" && "bg-accent")}>
                  Más de 10.000€
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Limpiar filtros */}
            {(monthFilter !== "all" || clientFilter !== "all" || amountRange !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => { setMonthFilter("all"); setClientFilter("all"); setAmountRange("all"); }}
              >
                Limpiar filtros
              </Button>
            )}

            <span className="text-xs text-muted-foreground ml-auto">
              {monthFilteredQuotes.length} presupuesto{monthFilteredQuotes.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* DataList */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <DataList
              data={paginatedQuotes}
              columns={[
                {
                  key: "quote_number",
                  label: "Nº",
                  sortable: true,
                  align: "left",
                  priority: 1,
                  render: (quote) => (
                    <span className="text-foreground/80">
                      {quote.quote_number}
                    </span>
                  ),
                },
                {
                  key: "project_name",
                  label: "Proyecto",
                  sortable: true,
                  align: "left",
                  priority: 3,
                  render: (quote) => (
                    <span className="text-foreground truncate block">
                      {quote.project_name || "-"}
                    </span>
                  ),
                },
                {
                  key: "client_name",
                  label: "Cliente",
                  sortable: true,
                  align: "left",
                  priority: 5,
                  render: (quote) => (
                    <span className="text-foreground/80">
                      {quote.client_name || "-"}
                    </span>
                  ),
                },
                {
                  key: "project_client_order_number",
                  label: "Nº Pedido",
                  sortable: true,
                  align: "left",
                  priority: 7,
                  render: (quote) => (
                    <span className="text-muted-foreground">
                      {quote.project_client_order_number || "-"}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Estado",
                  align: "center",
                  priority: 2,
                  render: (quote) => {
                    const statusInfo = getStatusInfo(quote.status);
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
                  label: "F. Emisión",
                  sortable: true,
                  align: "left",
                  priority: 6,
                  render: (quote) => {
                    const dateToShow = quote.issue_date || quote.created_at;
                    return (
                      <span className="text-muted-foreground">
                        {dateToShow
                          ? new Date(dateToShow).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                          : '-'}
                      </span>
                    );
                  },
                },
                {
                  key: "valid_until",
                  label: "Vencimiento",
                  sortable: true,
                  align: "left",
                  priority: 7,
                  render: (quote) => {
                    const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date() && quote.status === 'SENT';
                    const isAlreadyExpired = quote.status === 'EXPIRED';
                    return (
                      <span className={cn(
                        "text-muted-foreground",
                        (isExpired || isAlreadyExpired) && "text-amber-500 font-medium"
                      )}>
                        {quote.valid_until
                          ? new Date(quote.valid_until).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                          : '-'}
                      </span>
                    );
                  },
                },
                {
                  key: "subtotal",
                  label: "Presupuesto",
                  sortable: true,
                  align: "right",
                  priority: 5,
                  render: (quote) => (
                    <span className="text-foreground">
                      {formatCurrency(quote.subtotal)}
                    </span>
                  ),
                },
                {
                  key: "total",
                  label: "Total",
                  sortable: true,
                  align: "right",
                  priority: 4,
                  render: (quote) => (
                    <span className="text-foreground">
                      {formatCurrency(quote.total)}
                    </span>
                  ),
                },
              ]}
              actions={[
                {
                  label: "Editar",
                  icon: <Edit className="mr-2 h-4 w-4" />,
                  onClick: (quote) => navigate(`/nexo-av/${userId}/quotes/${quote.id}/edit`),
                  condition: (quote) => quote.status === "DRAFT",
                },
                {
                  label: "Nueva Versión",
                  icon: <Copy className="mr-2 h-4 w-4" />,
                  onClick: (quote) => navigate(`/nexo-av/${userId}/quotes/new?sourceQuoteId=${quote.id}`),
                },
                {
                  label: "Eliminar",
                  icon: <Trash2 className="mr-2 h-4 w-4" />,
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
              footerCells={(() => {
                const sent = quotes.filter(q => q.status === 'SENT');
                return [
                  { key: "quote_number", value: <span className="text-muted-foreground text-xs uppercase">Emitidos ({sent.length})</span>, align: "left" as const },
                  { key: "subtotal", value: <span>{formatCurrency(sent.reduce((s, q) => s + toNumber(q.subtotal), 0))}</span>, align: "right" as const },
                  { key: "total", value: <span>{formatCurrency(sent.reduce((s, q) => s + toNumber(q.total), 0))}</span>, align: "right" as const },
                ];
              })()}
            />
          </div>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el presupuesto {quoteToDelete?.quote_number} y todas sus líneas.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
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
