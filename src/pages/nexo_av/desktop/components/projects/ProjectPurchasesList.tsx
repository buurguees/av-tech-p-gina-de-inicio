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
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "../common/PaginationControls";
import {
  getDocumentStatusInfo,
  calculatePaymentStatus,
  getPaymentStatusInfo,
} from "@/constants/purchaseInvoiceStatuses";
import "../../styles/components/projects/project-items-list.css";

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  internal_purchase_number: string | null;
  supplier_invoice_number: string | null;
  document_type: string;
  issue_date: string;
  due_date?: string | null;
  provider_name: string | null;
  total: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  site_id: string | null;
  site_name: string | null;
}

interface ProjectPurchasesListProps {
  projectId: string;
  siteMode?: string | null;
  defaultSiteName?: string | null;
}

const ProjectPurchasesList = ({ projectId, siteMode, defaultSiteName }: ProjectPurchasesListProps) => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);

  useEffect(() => {
    fetchPurchases();
  }, [projectId]);

  const fetchPurchases = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        p_search: null,
        p_status: null,
        p_supplier_id: null,
        p_technician_id: null,
        p_document_type: null,
        p_page: 1,
        p_page_size: 5000,
      };
      if (projectId != null) params.p_project_id = projectId;
      const { data, error } = await supabase.rpc("list_purchase_invoices", params);

      if (error) throw error;

      // Filtrar solo las compras del proyecto
      const projectPurchases = (data || []).filter(
        (p: any) => p.project_id === projectId
      );

      const resolvedPurchases = await Promise.all(
        (projectPurchases as PurchaseInvoice[]).map(async (purchase) => {
          if (purchase.site_name) return purchase;

          const { data: detailData, error: detailError } = await supabase.rpc("get_purchase_invoice", {
            p_invoice_id: purchase.id,
          });

          if (detailError || !detailData || detailData.length === 0) return purchase;

          const detail = detailData[0] as { site_id?: string | null; site_name?: string | null };
          return {
            ...purchase,
            site_id: detail.site_id ?? purchase.site_id,
            site_name: detail.site_name ?? purchase.site_name,
          };
        })
      );

      setPurchases(resolvedPurchases);
    } catch (error: any) {
      console.error("Error fetching purchases:", error);
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

  const formatDate = (date: string) => {
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
    paginatedData: paginatedPurchases,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(purchases, { pageSize: 20 });

  if (loading) {
    return (
      <div className="project-items-list project-items-list--loading">
        <div className="project-items-list__loading">
          <Loader2 className="project-items-list__loading-icon" />
          <p className="project-items-list__loading-text">Cargando compras...</p>
        </div>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="project-items-list project-items-list--empty">
        <div className="project-items-list__empty">
          <p className="project-items-list__empty-text">
            No hay compras asociadas a este proyecto
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
                <TableHead className="project-items-list__header">Nº Documento</TableHead>
                <TableHead className="project-items-list__header">Proveedor</TableHead>
                <TableHead className="project-items-list__header">Sitio</TableHead>
                <TableHead className="project-items-list__header">Tipo</TableHead>
                <TableHead className="project-items-list__header text-right">Total</TableHead>
                <TableHead className="project-items-list__header text-center">Estado</TableHead>
                <TableHead className="project-items-list__header text-center">Pagos</TableHead>
                <TableHead className="project-items-list__header w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPurchases.map((purchase) => {
                const docStatusInfo = getDocumentStatusInfo(purchase.status);
                const paymentStatus = calculatePaymentStatus(
                  purchase.paid_amount,
                  purchase.total,
                  purchase.due_date || null,
                  purchase.status
                );
                const paymentStatusInfo = getPaymentStatusInfo(paymentStatus);
                const displayNumber =
                  purchase.internal_purchase_number ||
                  purchase.supplier_invoice_number ||
                  purchase.invoice_number;
                const resolvedSiteName = getResolvedSiteName(purchase.site_name);

                return (
                  <TableRow
                    key={purchase.id}
                    className="project-items-list__row"
                    onClick={() =>
                      navigate(`/nexo-av/${userId}/purchase-invoices/${purchase.id}`)
                    }
                  >
                    <TableCell className="project-items-list__cell">
                      {formatDate(purchase.issue_date)}
                    </TableCell>
                    <TableCell className="project-items-list__cell project-items-list__cell--number">
                      {displayNumber}
                    </TableCell>
                    <TableCell className="project-items-list__cell">
                      {purchase.provider_name || "Sin proveedor"}
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
                    <TableCell className="project-items-list__cell">
                      {purchase.document_type}
                    </TableCell>
                    <TableCell className="project-items-list__cell text-right">
                      {formatCurrency(purchase.total)}
                    </TableCell>
                    <TableCell className="project-items-list__cell text-center">
                      <Badge
                        variant="outline"
                        className={cn("purchase-status-badge purchase-status-badge--document", docStatusInfo.className)}
                      >
                        {docStatusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="project-items-list__cell text-center">
                      {paymentStatusInfo ? (
                        <Badge
                          variant="outline"
                          className={cn("purchase-status-badge purchase-status-badge--payment", paymentStatusInfo.className)}
                        >
                          {paymentStatusInfo.label}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
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
                              navigate(
                                `/nexo-av/${userId}/purchase-invoices/${purchase.id}`
                              );
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

export default ProjectPurchasesList;
