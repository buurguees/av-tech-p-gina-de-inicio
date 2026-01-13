import { motion } from "framer-motion";
import { FileText } from "lucide-react";
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
  onQuoteClick: (quoteId: string, status?: string) => void;
  onEditClick?: (quoteId: string) => void;
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
  onEditClick,
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
    <div className="space-y-2">
      {quotes.map((quote, index) => {
        const statusInfo = getStatusInfo(quote.status);
        const createdDate = new Date(quote.created_at);
        const formattedDate = createdDate.toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: 'short',
          year: 'numeric'
        });

        const isDraft = quote.status === "DRAFT";

        return (
          <motion.button
            key={quote.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            onClick={() => onQuoteClick(quote.id, quote.status)}
            className="w-full p-3 bg-white border-b border-gray-200 active:bg-gray-50 transition-colors text-left min-h-[80px] max-h-[90px]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900">
                  {quote.quote_number}
                </h3>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {quote.client_name || 'Sin cliente'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formattedDate}
                </p>
              </div>
              <div className="ml-2 text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(quote.total)}
                </p>
                <Badge 
                  variant="outline" 
                  className={`${statusInfo.className} text-xs px-2 py-0.5 inline-block mt-1`}
                >
                  {statusInfo.label}
                </Badge>
              </div>
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
