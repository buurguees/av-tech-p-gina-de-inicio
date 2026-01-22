import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUOTE_STATUSES, getStatusInfo } from "@/constants/quoteStatuses";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "../common/PaginationControls";
import "../../styles/components/projects/project-items-list.css";

interface Quote {
  id: string;
  quote_number: string;
  client_name: string;
  status: string;
  valid_until: string | null;
  subtotal: number;
  total: number;
  created_at: string;
}

interface ProjectQuotesListProps {
  projectId: string;
}

const ProjectQuotesList = ({ projectId }: ProjectQuotesListProps) => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    fetchQuotes();
  }, [projectId]);

  const fetchQuotes = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_quotes", {
        p_search: null,
      });

      if (error) throw error;

      // Filtrar solo los presupuestos del proyecto
      const projectQuotes = (data || []).filter(
        (q: any) => q.project_id === projectId
      );

      setQuotes(projectQuotes);
    } catch (error: any) {
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

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

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
  } = usePagination(quotes, { pageSize: 20 });

  if (loading) {
    return (
      <div className="project-items-list project-items-list--loading">
        <div className="project-items-list__loading">
          <Loader2 className="project-items-list__loading-icon" />
          <p className="project-items-list__loading-text">Cargando presupuestos...</p>
        </div>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="project-items-list project-items-list--empty">
        <div className="project-items-list__empty">
          <p className="project-items-list__empty-text">
            No hay presupuestos asociados a este proyecto
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="project-items-list">
      <div className="project-items-list__container">
        <div className="project-items-list__table-wrapper">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="project-items-list__header">Fecha</TableHead>
                <TableHead className="project-items-list__header">Nº Presupuesto</TableHead>
                <TableHead className="project-items-list__header">Cliente</TableHead>
                <TableHead className="project-items-list__header">Válido hasta</TableHead>
                <TableHead className="project-items-list__header text-right">Subtotal</TableHead>
                <TableHead className="project-items-list__header text-right">Total</TableHead>
                <TableHead className="project-items-list__header text-center">Estado</TableHead>
                <TableHead className="project-items-list__header w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedQuotes.map((quote) => {
                const statusInfo = getStatusInfo(quote.status);

                return (
                  <TableRow
                    key={quote.id}
                    className="project-items-list__row"
                    onClick={() => navigate(`/nexo-av/${userId}/quotes/${quote.id}`)}
                  >
                    <TableCell className="project-items-list__cell">
                      {formatDate(quote.created_at)}
                    </TableCell>
                    <TableCell className="project-items-list__cell project-items-list__cell--number">
                      {quote.quote_number}
                    </TableCell>
                    <TableCell className="project-items-list__cell">
                      {quote.client_name}
                    </TableCell>
                    <TableCell className="project-items-list__cell">
                      {formatDate(quote.valid_until)}
                    </TableCell>
                    <TableCell className="project-items-list__cell text-right">
                      {formatCurrency(quote.subtotal)}
                    </TableCell>
                    <TableCell className="project-items-list__cell text-right project-items-list__cell--total">
                      {formatCurrency(quote.total)}
                    </TableCell>
                    <TableCell className="project-items-list__cell text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          statusInfo.className,
                          "project-items-list__badge"
                        )}
                      >
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="project-items-list__cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="project-items-list__menu-button"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/nexo-av/${userId}/quotes/${quote.id}`);
                            }}
                          >
                            Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem>Duplicar</DropdownMenuItem>
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
      </div>
    </div>
  );
};

export default ProjectQuotesList;
