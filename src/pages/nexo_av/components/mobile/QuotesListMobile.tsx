import { motion } from "framer-motion";
import { FileText, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PaginationControls from "../PaginationControls";

interface Quote {
  id: string;
  quote_number: string;
  client_name: string | null;
  project_name: string | null;
  status: string;
  total: number;
  created_by_name: string | null;
  created_at: string;
  valid_until: string | null;
}

interface StatusInfo {
  label: string;
  className: string;
}

interface QuotesListMobileProps {
  quotes: Quote[];
  getStatusInfo: (status: string) => StatusInfo;
  formatCurrency: (amount: number) => string;
  onQuoteClick: (quoteId: string) => void;
  onCreateClick: () => void;
  loading?: boolean;
  // Pagination props
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
}

const QuotesListMobile = ({
  quotes,
  getStatusInfo,
  formatCurrency,
  onQuoteClick,
  onCreateClick,
  loading = false,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  canGoPrev,
  canGoNext,
  onPrevPage,
  onNextPage,
  onGoToPage,
}: QuotesListMobileProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16 rounded-xl border border-white/10 bg-white/5"
      >
        <FileText className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <p className="text-white/40 text-sm mb-2">No hay presupuestos</p>
        <Button
          variant="link"
          onClick={onCreateClick}
          className="text-white/60 hover:text-white text-sm touch-target"
        >
          Crear el primero
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {quotes.map((quote, index) => {
        const statusInfo = getStatusInfo(quote.status);
        const createdDate = new Date(quote.created_at);
        const formattedDate = createdDate.toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: 'short' 
        });

        return (
          <motion.button
            key={quote.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            onClick={() => onQuoteClick(quote.id)}
            className="w-full p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200 text-left backdrop-blur-sm active:scale-[0.98] shadow-sm nexo-card-mobile"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-orange-500 text-sm font-semibold">
                    {quote.quote_number}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`${statusInfo.className} text-xs px-2 py-0.5`}
                  >
                    {statusInfo.label}
                  </Badge>
                </div>
                <h3 className="text-white font-semibold text-sm mb-1 truncate">
                  {quote.client_name || 'Sin cliente'}
                </h3>
                {quote.project_name && (
                  <p className="text-white/50 text-xs truncate">
                    {quote.project_name}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
              <div className="flex items-center gap-3 text-white/50 text-xs">
                {quote.created_by_name && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[100px]">{quote.created_by_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formattedDate}</span>
                </div>
              </div>
              <span className="text-white font-semibold text-base">
                {formatCurrency(quote.total)}
              </span>
            </div>
          </motion.button>
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
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        onGoToPage={onGoToPage}
      />
    </div>
  );
};

export default QuotesListMobile;
