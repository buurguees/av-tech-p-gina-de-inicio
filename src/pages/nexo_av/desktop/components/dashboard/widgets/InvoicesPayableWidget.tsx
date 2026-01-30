import { useState, useEffect } from "react";
import { ShoppingCart, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PayableInvoice {
    id: string;
    vendor_name: string;
    amount: number;
    due_date: string;
}

const InvoicesPayableWidget = ({ userId }: { userId: string | undefined }) => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<PayableInvoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPayables = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase.rpc("list_purchase_invoices", {
                    p_status: null,
                    p_page_size: 50
                });
                if (error) throw error;
                if (data) {
                    const pending = (data as any[])
                        .filter((inv: any) => (inv.pending_amount ?? inv.total) > 0 && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED')
                        .sort((a: any, b: any) => {
                            const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                            const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
                            return dateA - dateB;
                        })
                        .slice(0, 5)
                        .map((inv: any) => ({
                            id: inv.id,
                            vendor_name: inv.provider_name || 'Proveedor desconocido',
                            amount: inv.pending_amount ?? inv.total,
                            due_date: inv.due_date
                        }));
                    setInvoices(pending);
                }
            } catch (err) {
                console.error("Error fetching payables:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPayables();
    }, []);

    const getDaysRemaining = (dateStr: string) => {
        const today = new Date();
        // Reset time to start of day for accurate comparison
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(dateStr);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getUrgencyColor = (days: number) => {
        if (days < 0) return "text-destructive font-bold";
        if (days <= 5) return "text-orange-500 font-medium";
        return "text-muted-foreground";
    };

    return (
        <DashboardWidget
            title="Pagos Pendientes"
            subtitle="Facturas de compra pendientes de pago"
            icon={ShoppingCart}
            action={
                <Button variant="ghost" size="sm" onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices`)} className="gap-1">
                    Ver todas <ArrowRight className="w-4 h-4" />
                </Button>
            }
            variant="clean"
            className="h-full"
        >
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
            <div className="space-y-4">
                {invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <ShoppingCart className="h-10 w-10 mb-2 opacity-20" />
                        <p className="text-sm">No hay pagos pendientes</p>
                    </div>
                ) : invoices.map((invoice) => {
                    const daysLeft = getDaysRemaining(invoice.due_date);
                    return (
                        <div key={invoice.id} className="flex items-center justify-between group p-2 hover:bg-secondary/50 rounded-lg transition-colors cursor-pointer" onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/${invoice.id}`)}>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground truncate">
                                    {invoice.vendor_name}
                                </h4>
                                <p className="text-sm text-muted-foreground truncate opacity-75">
                                    Vence: {new Date(invoice.due_date).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-foreground">
                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(invoice.amount)}
                                </p>
                                <p className={`text-xs flex items-center justify-end gap-1 ${getUrgencyColor(daysLeft)}`}>
                                    {daysLeft < 0 ? `Hace ${Math.abs(daysLeft)} días` : daysLeft === 0 ? 'Hoy' : `${daysLeft} días`}
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

export default InvoicesPayableWidget;
