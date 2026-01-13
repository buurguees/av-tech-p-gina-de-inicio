import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
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

const PaginationControls = ({
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
}: PaginationControlsProps) => {
  if (totalItems === 0) return null;

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    pages.push(1);
    
    if (currentPage > 3) {
      pages.push('ellipsis');
    }
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }
    
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-1">
      <p className="text-muted-foreground text-xs">
        Mostrando {startIndex} - {endIndex} de {totalItems} registros
      </p>
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevPage}
          disabled={!canGoPrev}
          className="h-7 w-7 p-0 border-border text-muted-foreground hover:bg-secondary disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </Button>
        
        <div className="flex items-center gap-0.5">
          {getPageNumbers().map((page, idx) => (
            page === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-1.5 text-muted-foreground text-xs">...</span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onGoToPage(page)}
                className={`h-7 min-w-[28px] px-2 text-xs ${
                  page === currentPage 
                    ? "bg-primary text-primary-foreground" 
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {page}
              </Button>
            )
          ))}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!canGoNext}
          className="h-7 w-7 p-0 border-border text-muted-foreground hover:bg-secondary disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;
