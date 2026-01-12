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
  invoice_number: string;
  client_id: string;
  client_name: string;
  project_name: string | null;
  status: string;
  issue_date: string;
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
              className={`bg-white/5 border-white/10 cursor-pointer active:scale-[0.98] transition-all duration-200 ${
                isOverdue ? "border-red-500/30" : ""
              }`}
              onClick={() => onInvoiceClick(invoice.id)}
            >
              <CardContent className="p-4">
                {/* Header: Número y Estado */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-mono font-bold text-sm mb-1 truncate">
                      {invoice.invoice_number}
                    </h3>
                    <div className="flex items-center gap-1.5 text-white/60">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs truncate">{invoice.client_name}</span>
                    </div>
                  </div>
                  <Badge className={`${statusInfo.className} text-xs shrink-0 ml-2`}>
                    {statusInfo.label}
                  </Badge>
                </div>

                {/* Proyecto (si existe) */}
                {invoice.project_name && (
                  <div className="mb-3 text-xs text-white/50 truncate">
                    📁 {invoice.project_name}
                  </div>
                )}

                {/* Footer: Fechas y Total */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-1.5 text-white/50">
                      <Calendar className="h-3 w-3" />
                      <span>Emisión: {formatDate(invoice.issue_date)}</span>
                    </div>
                    {invoice.due_date && (
                      <div className={`flex items-center gap-1.5 ${isOverdue ? "text-red-400" : "text-white/50"}`}>
                        <Calendar className="h-3 w-3" />
                        <span>Vence: {formatDate(invoice.due_date)}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold text-base">
                      {formatCurrency(invoice.total)}
                    </div>
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
            onPageChange={onGoToPage}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onPrevPage={onPrevPage}
            onNextPage={onNextPage}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={totalItems}
            itemLabel="facturas"
          />
        </div>
      )}
    </motion.div>
  );
};

export default InvoicesListMobile;
