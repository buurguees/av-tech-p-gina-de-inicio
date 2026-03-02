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
import { MoreVertical, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { FINANCE_INVOICE_STATUSES, getFinanceStatusInfo } from "@/constants/financeStatuses";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "../common/PaginationControls";
import "../../styles/components/projects/project-items-list.css";

interface Invoice {
  id: string;
  invoice_number: string;
  preliminary_number: string;
  client_name: string;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  subtotal: number;
  total: number;
  is_locked: boolean;
  site_id: string | null;
  site_name: string | null;
}

interface ProjectInvoicesListProps {
  projectId: string;
  siteMode?: string | null;
  defaultSiteName?: string | null;
}

interface ProjectSite {
  id: string;
  site_name: string;
}

const ProjectInvoicesList = ({ projectId, siteMode, defaultSiteName }: ProjectInvoicesListProps) => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    fetchInvoices();
  }, [projectId]);

  const fetchInvoices = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const { data: projectSitesData } = await supabase.rpc("list_project_sites", {
        p_project_id: projectId,
      });
      const siteNameById = new Map(
        ((projectSitesData || []) as ProjectSite[]).map((site) => [site.id, site.site_name])
      );
      const { data, error } = await supabase.rpc("finance_list_invoices", {
        p_search: null,
        p_status: null,
      });

      if (error) throw error;

      // Filtrar solo las facturas del proyecto
      const projectInvoices = (data || []).filter(
        (inv: any) => inv.project_id === projectId
      );
      const withCanonicalSiteName = (invoice: Invoice): Invoice => ({
        ...invoice,
        site_name: invoice.site_id ? siteNameById.get(invoice.site_id) ?? invoice.site_name : invoice.site_name,
      });

      const resolvedInvoices = await Promise.all(
        projectInvoices.map(async (invoice: Invoice) => {
          const normalizedInvoice = withCanonicalSiteName(invoice);
          if (normalizedInvoice.site_name) return normalizedInvoice;

          const { data: detailData, error: detailError } = await supabase.rpc("finance_get_invoice", {
            p_invoice_id: invoice.id,
          });

          if (detailError || !detailData || detailData.length === 0) return normalizedInvoice;

          const detail = detailData[0] as { site_id?: string | null; site_name?: string | null };
          return withCanonicalSiteName({
            ...normalizedInvoice,
            site_id: detail.site_id ?? invoice.site_id,
            site_name: detail.site_name ?? invoice.site_name,
          });
        })
      );

      setInvoices(resolvedInvoices);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
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

  const getResolvedSiteName = (siteName: string | null) => {
    if (siteName) return siteName;
    if (siteMode === "SINGLE_SITE" && defaultSiteName) return defaultSiteName;
    return null;
  };

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedInvoices,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(invoices, { pageSize: 20 });

  if (loading) {
    return (
      <div className="project-items-list project-items-list--loading">
        <div className="project-items-list__loading">
          <Loader2 className="project-items-list__loading-icon" />
          <p className="project-items-list__loading-text">Cargando facturas...</p>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="project-items-list project-items-list--empty">
        <div className="project-items-list__empty">
          <p className="project-items-list__empty-text">
            No hay facturas asociadas a este proyecto
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
                <TableHead className="project-items-list__header">Nº Factura</TableHead>
                <TableHead className="project-items-list__header">Cliente</TableHead>
                <TableHead className="project-items-list__header">Sitio</TableHead>
                <TableHead className="project-items-list__header text-right">Subtotal</TableHead>
                <TableHead className="project-items-list__header text-right">Total</TableHead>
                <TableHead className="project-items-list__header text-center">Estado</TableHead>
                <TableHead className="project-items-list__header w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.map((invoice) => {
                const statusInfo = getFinanceStatusInfo(invoice.status);
                const displayNumber = invoice.invoice_number || invoice.preliminary_number;
                const isDraft = invoice.status === "DRAFT";
                const resolvedSiteName = getResolvedSiteName(invoice.site_name);

                return (
                  <TableRow
                    key={invoice.id}
                    className="project-items-list__row"
                    onClick={() => navigate(`/nexo-av/${userId}/invoices/${invoice.id}`)}
                  >
                    <TableCell className="project-items-list__cell">
                      {formatDate(invoice.issue_date)}
                    </TableCell>
                    <TableCell className="project-items-list__cell project-items-list__cell--number">
                      {displayNumber}
                    </TableCell>
                    <TableCell className="project-items-list__cell">
                      {invoice.client_name}
                    </TableCell>
                    <TableCell className="project-items-list__cell">
                      {resolvedSiteName ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {resolvedSiteName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell className="project-items-list__cell text-right">
                      {formatCurrency(invoice.subtotal)}
                    </TableCell>
                    <TableCell className="project-items-list__cell text-right project-items-list__cell--total">
                      {formatCurrency(invoice.total)}
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
                              navigate(`/nexo-av/${userId}/invoices/${invoice.id}`);
                            }}
                          >
                            Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem>Duplicar</DropdownMenuItem>
                          {isDraft && (
                            <DropdownMenuItem className="text-destructive">
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
      </div>
    </div>
  );
};

export default ProjectInvoicesList;
