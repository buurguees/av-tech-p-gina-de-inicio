import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { QUOTE_STATUSES, getQuoteStatusInfo } from "@/constants/quoteStatuses";

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

const MobileQuotesPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 500);
  const [quoteStats, setQuoteStats] = useState({
    pending: 0,
    sent: 0,
    approved: 0,
  });

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('list_quotes', {
        p_search: debouncedSearchTerm || null,
        p_status: null
      });

      if (error) throw error;
      
      const quotesList = data || [];
      setQuotes(quotesList);

      // Calculate stats
      const pending = quotesList.filter((q: Quote) => q.status === 'PENDING' || q.status === 'DRAFT').length;
      const sent = quotesList.filter((q: Quote) => q.status === 'SENT').length;
      const approved = quotesList.filter((q: Quote) => q.status === 'APPROVED').length;
      
      setQuoteStats({ pending, sent, approved });
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
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
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-yellow-500/10 rounded-lg text-yellow-600">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-xs">Pendientes</span>
          </div>
          <span className="text-lg text-foreground font-semibold">
            {quoteStats.pending}
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-600">
              <Send className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-xs">Enviados</span>
          </div>
          <span className="text-lg text-foreground font-semibold">
            {quoteStats.sent}
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg text-green-600">
              <CheckCircle className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-xs">Aprobados</span>
          </div>
          <span className="text-lg text-foreground font-semibold">
            {quoteStats.approved}
          </span>
        </div>
      </div>

      {/* Search and Create Button */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40 pb-3 mb-4 flex-shrink-0 -mx-[15px] px-[15px] pt-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar presupuestos..."
              className="pl-9 h-10 bg-card border-border"
            />
          </div>
          <Button
            onClick={handleCreateQuote}
            size="sm"
            className="h-10 px-3 gap-1.5 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Quotes List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pb-4">
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
                    {/* Quote Number & Status */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono text-muted-foreground">
                        {quote.quote_number}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          statusInfo.className, 
                          "text-[10px] px-1.5 py-0"
                        )}
                      >
                        {statusInfo.label}
                      </Badge>
                    </div>
                    
                    {/* Client Name */}
                    <h3 className="font-medium text-foreground truncate mb-1">
                      {quote.client_name}
                    </h3>
                    
                    {/* Project Name */}
                    {quote.project_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        📁 {quote.project_name}
                      </p>
                    )}
                    
                    {/* Date */}
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDate(quote.created_at)}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-semibold text-foreground">
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
