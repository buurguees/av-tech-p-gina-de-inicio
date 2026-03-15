import { useState, useEffect } from "react";
import { Receipt, ArrowRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  calculateCollectionStatus,
  displayInvoiceNumber,
  getSalesDocumentStatusInfo,
} from "@/constants/salesInvoiceStatuses";

interface Invoice {
  id: string;
  invoice_number: string;
  preliminary_number: string | null;
  client_name: string;
  total: number;
  paid_amount: number;
  pending_amount: number;
  due_date: string;
  status: string;
}

const InvoicesReceivableWidget = ({ userId }: { userId: string | undefined }) => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, [userId]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase.rpc("finance_list_invoices", {
        p_search: null,
        p_status: null,
      });

      if (error) throw error;

      if (data) {
        const pending = (data as any[])
          .filter((inv) => {
            const docStatus = getSalesDocumentStatusInfo(inv.status).value;
            const collectionStatus = calculateCollectionStatus(
              Number(inv.paid_amount || 0),
              Number(inv.total || 0),
              inv.status
            );

            return docStatus === "ISSUED"
              && collectionStatus !== "PAID"
              && Number(inv.pending_amount || 0) > 0;
          })
          .sort((a, b) => {
            const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
            const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
            return dateA - dateB;
          })
          .slice(0, 5);

        setInvoices(pending.map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          preliminary_number: inv.preliminary_number,
          client_name: inv.client_name,
          total: inv.total,
          paid_amount: inv.paid_amount,
          pending_amount: inv.pending_amount,
          due_date: inv.due_date,
          status: inv.status,
        })));
      }
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysOverdue = (dateStr: string | null) => {
    if (!dateStr) return null;
    const today = new Date();
    const dueDate = new Date(dateStr);
    const diffTime = today.getTime() - dueDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (daysOverdue: number | null) => {
    if (daysOverdue === null) return "text-muted-foreground";
    if (daysOverdue > 0) return "text-destructive font-bold";
    if (daysOverdue > -7) return "text-orange-500 font-medium";
    return "text-blue-600";
  };

  return (
    <DashboardWidget
      title="Cobros Pendientes"
      subtitle="Saldo vivo por cobrar"
      icon={Receipt}
      action={(
        <Button variant="ghost" size="sm" onClick={() => navigate(`/nexo-av/${userId}/invoices`)} className="gap-1">
          Ver todas <ArrowRight className="w-4 h-4" />
        </Button>
      )}
      variant="clean"
      className="h-full"
    >
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
          <Receipt className="w-10 h-10 mb-2 opacity-20" />
          <p>Al dia con los cobros</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const daysOverdue = getDaysOverdue(invoice.due_date);
            const isOverdue = daysOverdue !== null && daysOverdue > 0;

            return (
              <div
                key={invoice.id}
                className="flex items-center justify-between group p-2 hover:bg-secondary/50 rounded-lg transition-colors cursor-pointer"
                onClick={() => navigate(`/nexo-av/${userId}/invoices/${invoice.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {displayInvoiceNumber(invoice.invoice_number, invoice.preliminary_number, invoice.status)}
                    </h4>
                    {isOverdue && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-bold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        Vencida
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{invoice.client_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(invoice.pending_amount || 0)}
                  </p>
                  <p className={`text-xs flex items-center justify-end gap-1 ${getStatusColor(daysOverdue)}`}>
                    {daysOverdue === null ? "Sin fecha" : isOverdue ? `+${daysOverdue} dias` : `${Math.abs(daysOverdue)} dias restantes`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardWidget>
  );
};

export default InvoicesReceivableWidget;
