import { useState, useEffect } from "react";
import { Receipt, ArrowRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Invoice {
    id: string;
    invoice_number: string;
    client_name: string;
    total: number;
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
            // Fetch all invoices and filter for pending/overdue in memory or use proper RPC parameters if available
            const { data, error } = await supabase.rpc("finance_list_invoices", {
                p_search: null,
                p_status: null, // We'll filter multiple statuses in JS
            });

            if (error) throw error;

            if (data) {
                // Filter for PENDING or PARTIAL or OVERDUE (logic: not PAID, not DRAFT, not CANCELLED)
                const pending = (data as any[])
                    .filter(inv => {
                        return inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT';
                    })
                    .sort((a, b) => {
                        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
                        return dateA - dateB;
                    })
                    .slice(0, 5);

                setInvoices(pending.map(inv => ({
                    id: inv.id,
                    invoice_number: inv.invoice_number,
                    client_name: inv.client_name,
                    total: inv.total,
                    due_date: inv.due_date,
                    status: inv.status
                })));
            }
        } catch (err) {
            console.error('Error fetching invoices:', err);
        } finally {
            setLoading(false);
        }
    };

    const getDaysOverdue = (dateStr: string | null) => {
        if (!dateStr) return null;
        const today = new Date();
        const dueDate = new Date(dateStr);
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getStatusColor = (daysOverdue: number | null) => {
        if (daysOverdue === null) return "text-muted-foreground";
        if (daysOverdue > 0) return "text-destructive font-bold"; // Overdue
        if (daysOverdue > -7) return "text-orange-500 font-medium"; // Due soon
        return "text-blue-600";
    };

    return (
        <DashboardWidget
            title="Cobros Pendientes"
            subtitle="Facturas por cobrar"
            icon={Receipt}
            action={
                <Button variant="ghost" size="sm" onClick={() => navigate(`/nexo-av/${userId}/invoices`)} className="gap-1">
                    Ver todas <ArrowRight className="w-4 h-4" />
                </Button>
            }
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
                    <p>Al día con los cobros</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {invoices.map((invoice) => {
                        const daysOverdue = getDaysOverdue(invoice.due_date);
                        const isOverdue = daysOverdue !== null && daysOverdue > 0;

                        return (
                            <div key={invoice.id} className="flex items-center justify-between group p-2 hover:bg-secondary/50 rounded-lg transition-colors cursor-pointer" onClick={() => navigate(`/nexo-av/${userId}/invoices/${invoice.id}`)}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                            {invoice.invoice_number}
                                        </h4>
                                        {isOverdue && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-bold flex items-center gap-0.5">
                                                <AlertTriangle className="w-3 h-3" />
                                                Vencida
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {invoice.client_name}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-foreground">
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(invoice.total || 0)}
                                    </p>
                                    <p className={`text-xs flex items-center justify-end gap-1 ${getStatusColor(daysOverdue)}`}>
                                        {daysOverdue === null ? 'Sin fecha' : isOverdue ? `+${daysOverdue} días` : `${Math.abs(daysOverdue)} días restantes`}
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
