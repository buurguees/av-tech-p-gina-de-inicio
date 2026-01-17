import { ShoppingCart, ArrowRight } from "lucide-react";
import DashboardWidget from "../DashboardWidget";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// MOCK DATA structure
interface PayableInvoice {
    id: string;
    vendor_name: string;
    amount: number;
    due_date: string;
}

const InvoicesPayableWidget = ({ userId }: { userId: string | undefined }) => {
    const navigate = useNavigate();

    // MOCK DATA
    const mockInvoices: PayableInvoice[] = [
        { id: '1', vendor_name: 'Tech Suppliers S.L.', amount: 1250.50, due_date: '2025-02-15' },
        { id: '2', vendor_name: 'Office Rent Corp', amount: 800.00, due_date: '2025-02-01' },
        { id: '3', vendor_name: 'Software Licenses Inc', amount: 349.99, due_date: '2025-01-25' },
        { id: '4', vendor_name: 'Cleaning Pros', amount: 120.00, due_date: '2025-01-20' },
        { id: '5', vendor_name: 'Energy Provider', amount: 450.25, due_date: '2025-01-28' },
    ].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

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
            subtitle="Facturas de compra (Demo)"
            icon={ShoppingCart}
            action={
                <Button variant="ghost" size="sm" onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices`)} className="gap-1">
                    Ver todas <ArrowRight className="w-4 h-4" />
                </Button>
            }
            variant="clean"
            className="h-full border-dashed" // Dashed border to indicate semi-mock/beta status
        >
            <div className="space-y-4">
                {mockInvoices.map((invoice, index) => {
                    const daysLeft = getDaysRemaining(invoice.due_date);
                    return (
                        <div key={invoice.id} className="flex items-center justify-between group p-2 hover:bg-secondary/50 rounded-lg transition-colors">
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
        </DashboardWidget>
    );
};

export default InvoicesPayableWidget;
