import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ChevronLeft,
  AlertCircle,
  FileText,
  Calendar,
  Building2,
  FolderKanban,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDocumentStatusInfo,
  calculatePaymentStatus,
  getPaymentStatusInfo,
} from "@/constants/purchaseInvoiceStatuses";
import { getTicketCategoryInfo } from "@/constants/ticketCategories";

interface ExpenseDetail {
  id: string;
  internal_purchase_number: string;
  invoice_number: string;
  status: string;
  document_type: string;
  expense_category: string | null;
  issue_date: string;
  due_date: string | null;
  tax_base: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  supplier_id: string | null;
  supplier_name: string | null;
  technician_id: string | null;
  technician_name: string | null;
  project_id: string | null;
  project_name: string | null;
  project_number: string | null;
  notes: string | null;
  file_name: string | null;
  file_path: string | null;
  created_at: string;
}

const MobileExpenseDetailPage = () => {
  const { userId, invoiceId } = useParams<{ userId: string; invoiceId: string }>();
  const navigate = useNavigate();

  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc("get_purchase_invoice", { p_invoice_id: invoiceId });
        if (error) throw error;
        if (data && data.length > 0) {
          setExpense(data[0] as unknown as ExpenseDetail);
        }
      } catch (e) {
        console.error("Error fetching expense:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [invoiceId]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">Gasto no encontrado</p>
        <button onClick={() => navigate(`/nexo-av/${userId}/expenses`)} className="text-primary underline">
          Volver a gastos
        </button>
      </div>
    );
  }

  const docStatus = getDocumentStatusInfo(expense.status);
  const payStatus = calculatePaymentStatus(expense.paid_amount, expense.total, expense.due_date, expense.status);
  const payInfo = getPaymentStatusInfo(payStatus);
  const catInfo = expense.expense_category ? getTicketCategoryInfo(expense.expense_category) : null;

  const beneficiary = expense.supplier_name || expense.technician_name || "Sin beneficiario";

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/nexo-av/${userId}/expenses`)}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
              "text-white/90 hover:text-white hover:bg-white/15",
              "active:scale-95 transition-all duration-200",
              "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]"
            )}
            style={{ touchAction: "manipulation" }}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Atrás</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium text-foreground truncate leading-tight">
              {expense.internal_purchase_number || expense.invoice_number}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant="outline" className={cn(docStatus.className, "text-[10px] px-1.5 py-0")}>
                {docStatus.label}
              </Badge>
              {payInfo && (
                <Badge variant="outline" className={cn(payInfo.className, "text-[10px] px-1.5 py-0")}>
                  {payInfo.label}
                </Badge>
              )}
              {catInfo && (
                <span className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                  {catInfo.icon} {catInfo.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-[80px] space-y-4">
        {/* Beneficiary */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Beneficiario</p>
              <p className="text-sm font-medium text-foreground">{beneficiary}</p>
            </div>
          </div>
        </div>

        {/* Project */}
        {expense.project_name && (
          <button
            onClick={() => expense.project_id && navigate(`/nexo-av/${userId}/projects/${expense.project_id}`)}
            className={cn(
              "w-full text-left p-4 rounded-xl",
              "bg-card border border-border",
              "active:scale-[0.98] transition-all duration-200"
            )}
            style={{ touchAction: "manipulation" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FolderKanban className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{expense.project_name}</p>
                  {expense.project_number && (
                    <p className="text-xs text-muted-foreground">{expense.project_number}</p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        )}

        {/* Date */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p className="text-sm text-foreground">{formatDate(expense.issue_date)}</p>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Base imponible</span>
            <span className="text-sm text-foreground">{formatCurrency(expense.tax_base)}</span>
          </div>
          {expense.tax_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">IVA</span>
              <span className="text-sm text-foreground">{formatCurrency(expense.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-base font-bold text-foreground">{formatCurrency(expense.total)}</span>
          </div>
          {expense.paid_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pagado</span>
              <span className="text-sm text-green-500">{formatCurrency(expense.paid_amount)}</span>
            </div>
          )}
          {expense.pending_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pendiente</span>
              <span className="text-sm text-amber-500">{formatCurrency(expense.pending_amount)}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {expense.notes && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Notas</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{expense.notes}</p>
          </div>
        )}

        {/* Document */}
        {expense.file_name && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Documento adjunto</p>
                <p className="text-sm text-foreground truncate">{expense.file_name}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileExpenseDetailPage;
