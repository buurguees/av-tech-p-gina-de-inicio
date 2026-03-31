import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Loader2, 
  Plus,
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  Send,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { getQuoteStatusInfo } from "@/constants/quoteStatuses";

interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  client_name: string;
  project_id: string | null;
  project_name: string | null;
  status: string;
  subtotal: number;
  total: number;
  created_at: string;
  valid_until: string | null;
  created_by_name: string | null;
}

interface QuoteStats {
  pending: number;
  sent: number;
  approved: number;
  expired: number;
}

const emptyQuoteStats: QuoteStats = {
  pending: 0,
  sent: 0,
  approved: 0,
  expired: 0,
};

const MobileQuotesPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 500);
  const [quoteStats, setQuoteStats] = useState<QuoteStats>(emptyQuoteStats);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc("list_quotes", {
          p_search: debouncedSearchTerm || null,
          p_status: null,
        });

        if (error) throw error;

        const quotesList = (data || []) as Quote[];
        setQuotes(quotesList);
        setQuoteStats({
          pending: quotesList.filter((quote) => quote.status === "DRAFT").length,
          sent: quotesList.filter((quote) => quote.status === "SENT").length,
          approved: quotesList.filter((quote) => quote.status === "APPROVED").length,
          expired: quotesList.filter((quote) => quote.status === "EXPIRED").length,
        });
      } catch (error) {
        console.error("Error fetching quotes:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchQuotes();
  }, [debouncedSearchTerm]);

  const handleQuoteClick = (quoteId: string) => {
    navigate(`/nexo-av/${userId}/quotes/${quoteId}`);
  };

  const handleCreateQuote = () => {
    navigate(`/nexo-av/${userId}/quotes/new`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="mobile-page-viewport">
      {/* Sticky Header: KPIs + Search */}
      <div className="mobile-sticky-header">
        {/* KPI Cards */}
        <div className="mobile-kpi-grid mobile-kpi-grid-4">
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
              <Send className="h-4 w-4" />
            </div>
            <span className="text-lg text-foreground font-semibold">{quoteStats.sent}</span>
          </div>
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg text-green-500">
              <CheckCircle className="h-4 w-4" />
            </div>
            <span className="text-lg text-foreground font-semibold">{quoteStats.approved}</span>
          </div>
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-lg text-foreground font-semibold">{quoteStats.expired}</span>
          </div>
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-lg text-foreground font-semibold">{quoteStats.pending}</span>
          </div>
        </div>
        {/* Search and Create Button */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar presupuestos..."
              className="pl-9 h-11 bg-card border-border text-sm"
            />
          </div>
          <button
            onClick={handleCreateQuote}
            className={cn(
              "h-11 min-w-11 px-3 min-[400px]:px-4 flex items-center justify-center gap-1.5 rounded-full shrink-0",
              "text-sm font-medium leading-none",
              "bg-primary text-primary-foreground",
              "active:scale-95 transition-all duration-200",
              "shadow-sm"
            )}
            style={{ touchAction: 'manipulation' }}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden min-[400px]:inline">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Quotes List */}
      <div className="mobile-scroll-area space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay presupuestos</p>
            <p className="text-muted-foreground text-sm">
              {searchInput ? 'Prueba con otra búsqueda' : 'Crea tu primer presupuesto'}
            </p>
          </div>
        ) : (
          quotes.map((quote) => {
            const statusInfo = getQuoteStatusInfo(quote.status);
            return (
              <button
                key={quote.id}
                onClick={() => handleQuoteClick(quote.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl",
                  "bg-card border border-border",
                  "active:scale-[0.98] transition-all duration-200",
                  "hover:border-primary/30"
                )}
                style={{ touchAction: 'manipulation' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Número + estado — badge ancho fijo */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
                        {quote.quote_number}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(statusInfo.className, "w-[72px] justify-center flex-shrink-0 text-[10px] px-1.5 py-0")}
                      >
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Nombre cliente */}
                    <h3 className="font-medium text-foreground truncate mb-1">
                      {quote.client_name}
                    </h3>

                    {/* Proyecto */}
                    {quote.project_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        📁 {quote.project_name}
                      </p>
                    )}

                    {/* Fecha */}
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDate(quote.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {formatCurrency(quote.total)}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MobileQuotesPage;
