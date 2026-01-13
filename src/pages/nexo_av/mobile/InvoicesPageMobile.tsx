/**
 * InvoicesPageMobile
 * 
 * Versión optimizada para móviles de la página de facturas.
 * Diseñada para comerciales con acceso rápido y UI simplificada.
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import InvoicesListMobile from "../components/mobile/InvoicesListMobile";
import MobileBottomNav from "../components/MobileBottomNav";
import { cn } from "@/lib/utils";
import { INVOICE_STATUSES, getStatusInfo } from "@/constants/invoiceStatuses";

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  project_name: string | null;
  project_id: string | null;
  status: string;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

const InvoicesPageMobile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, debouncedSearchQuery]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_invoices", {
        p_search: debouncedSearchQuery || null,
        p_status: statusFilter,
      });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
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

  const handleInvoiceClick = (invoiceId: string) => {
    navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
  };

  // Pagination (25 records per page en móvil para mejor performance)
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
  } = usePagination(invoices, { pageSize: 25 });

  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <main className="px-3 py-3 space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Info Card */}
          <div className="bg-card border border-border rounded-lg p-2 text-[10px] text-muted-foreground">
            <FileText className="h-3.5 w-3.5 mb-1 text-muted-foreground/60" />
            Las facturas se generan automáticamente desde presupuestos aprobados
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar factura, cliente o proyecto..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground h-9 text-xs"
            />
          </div>
          
          {/* Status Filters - Scrollable horizontal */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide">
            <Button
              variant={statusFilter === null ? "secondary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(null)}
              className={cn(
                "h-8 px-3 text-[10px] shrink-0",
                statusFilter === null 
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "border-border text-muted-foreground"
              )}
            >
              Todos
            </Button>
            {INVOICE_STATUSES.map((status) => (
              <Button
                key={status.value}
                variant={statusFilter === status.value ? "secondary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status.value)}
                className={cn(
                  "h-8 px-3 text-[10px] shrink-0",
                  statusFilter === status.value 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "border-border text-muted-foreground"
                )}
              >
                {status.label}
              </Button>
            ))}
          </div>

          {/* Invoices List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
            </div>
          ) : invoices.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center px-4"
            >
              <FileText className="h-16 w-16 text-white/20 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No hay facturas</h3>
              <p className="text-white/60 text-sm mb-4">
                {searchInput || statusFilter
                  ? "No se encontraron facturas con los filtros aplicados"
                  : "Las facturas se generan desde presupuestos aprobados"}
              </p>
              {!searchInput && !statusFilter && (
                <Button
                  onClick={() => navigate(`/nexo-av/${userId}/quotes`)}
                  className="bg-white text-black hover:bg-white/90"
                >
                  Ver Presupuestos
                </Button>
              )}
            </motion.div>
          ) : (
            <InvoicesListMobile
              invoices={paginatedInvoices}
              getStatusInfo={getStatusInfo}
              formatCurrency={formatCurrency}
              onInvoiceClick={handleInvoiceClick}
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

export default InvoicesPageMobile;
