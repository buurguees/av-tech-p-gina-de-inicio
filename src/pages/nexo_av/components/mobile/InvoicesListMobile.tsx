/**
 * InvoicesListMobile
 * 
 * Componente móvil para mostrar lista de facturas en formato card optimizado.
 * Incluye paginación y acciones táctiles.
 */

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import PaginationControls from "../PaginationControls";

interface Invoice {
  id: string;
  invoice_number: string | null;
  preliminary_number: string | null;
  client_id: string;
  client_name: string;
  project_name: string | null;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  total: number;
}

interface InvoicesListMobileProps {
  invoices: Invoice[];
  getStatusInfo: (status: string) => { label: string; className: string };
  formatCurrency: (amount: number) => string;
  onInvoiceClick: (invoiceId: string) => void;
  loading?: boolean;
  // Paginación
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

const InvoicesListMobile = ({
  invoices,
  getStatusInfo,
  formatCurrency,
  onInvoiceClick,
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
}: InvoicesListMobileProps) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center px-4"
      >
        <FileText className="h-16 w-16 text-white/20 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No hay facturas</h3>
        <p className="text-white/60 text-sm">
          Las facturas se generan automáticamente desde presupuestos aprobados
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {invoices.map((invoice, index) => {
        const statusInfo = getStatusInfo(invoice.status);
        const isOverdue = invoice.status === "OVERDUE";
        
        return (
          <motion.div
            key={invoice.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={`bg-card border-border cursor-pointer active:scale-[0.98] transition-all duration-200 ${
                isOverdue ? "border-destructive/30" : ""
              }`}
              onClick={() => onInvoiceClick(invoice.id)}
            >
              <CardContent className="p-2.5">
                {/* Header: Número, Cliente y Estado */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[11px] font-semibold text-foreground truncate">
                        {invoice.invoice_number || invoice.preliminary_number || 'Sin número'}
                      </p>
                      <Badge className={`${statusInfo.className} text-[10px] px-1.5 py-0 shrink-0`}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {invoice.client_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-foreground">
                      {formatCurrency(invoice.total)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="pt-4">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onPrevPage={onPrevPage}
            onNextPage={onNextPage}
            onGoToPage={onGoToPage}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={totalItems}
          />
        </div>
      )}
    </motion.div>
  );
};

export default InvoicesListMobile;
