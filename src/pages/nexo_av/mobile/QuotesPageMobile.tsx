/**
 * QuotesPageMobile
 * 
 * Versión optimizada para móviles de la página de presupuestos.
 * Diseñada para comerciales con acceso rápido y UI simplificada.
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Edit } from "lucide-react";
import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import NexoHeaderMobile from "../components/mobile/NexoHeaderMobile";
import QuotesListMobile from "../components/mobile/QuotesListMobile";
import MobileBottomNav from "../components/MobileBottomNav";
import { cn } from "@/lib/utils";
import { QUOTE_STATUSES, getStatusInfo } from "@/constants/quoteStatuses";

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

const QuotesPageMobile = () => {
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

  const handleQuoteClick = (quoteId: string, status?: string) => {
    // Si es DRAFT, ir directamente a editar
    if (status === "DRAFT") {
      navigate(`/nexo-av/${userId}/quotes/${quoteId}/edit`);
    } else {
      navigate(`/nexo-av/${userId}/quotes/${quoteId}`);
    }
  };

  const handleEditClick = (quoteId: string) => {
    navigate(`/nexo-av/${userId}/quotes/${quoteId}/edit`);
  };

  // Pagination (25 records per page en móvil para mejor performance)
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
  } = usePagination(quotes, { pageSize: 25 });

  return (
    <div className="min-h-screen bg-black pb-mobile-nav">
      <NexoHeaderMobile 
        title="Presupuestos" 
        userId={userId || ""} 
        showBack={false}
        showHome={true}
      />
      
      <main className="px-3 py-3 space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Botón Nuevo - Destacado para comerciales */}
          <Button
            onClick={handleNewQuote}
            className="w-full bg-white text-black hover:bg-white/90 h-12 text-sm font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Presupuesto
          </Button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Buscar cliente o proyecto..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 h-11 text-sm"
            />
          </div>
          
          {/* Status Filters - Scrollable horizontal */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide">
            <Button
              variant={statusFilter === null ? "secondary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(null)}
              className={cn(
                "h-9 px-4 text-xs shrink-0",
                statusFilter === null 
                  ? "bg-white/20 text-white font-medium" 
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
                  "h-9 px-4 text-xs shrink-0",
                  statusFilter === status.value 
                    ? "bg-white/20 text-white font-medium" 
                    : "border-white/20 text-white/70 hover:bg-white/10"
                )}
              >
                {status.label}
              </Button>
            ))}
          </div>

          {/* Quotes List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
            </div>
          ) : quotes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center px-4"
            >
              <FileText className="h-16 w-16 text-white/20 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No hay presupuestos</h3>
              <p className="text-white/60 text-sm mb-6">
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
            </motion.div>
          ) : (
            <QuotesListMobile
              quotes={paginatedQuotes}
              getStatusInfo={getStatusInfo}
              formatCurrency={formatCurrency}
              onQuoteClick={handleQuoteClick}
              onEditClick={handleEditClick}
              onCreateClick={handleNewQuote}
              loading={loading}
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
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav userId={userId || ''} />
    </div>
  );
};

export default QuotesPageMobile;
