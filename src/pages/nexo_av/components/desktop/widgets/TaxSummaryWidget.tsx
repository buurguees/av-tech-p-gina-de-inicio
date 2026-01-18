import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { Receipt } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const TaxSummaryWidget = () => {
    const [vatCollected, setVatCollected] = useState(0);
    const [vatPaid, setVatPaid] = useState(0); // Mock
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        calculateTaxes();
    }, []);

    const calculateTaxes = async () => {
        try {
            setLoading(true);
            const startOfQuarter = new Date();
            startOfQuarter.setMonth(Math.floor(startOfQuarter.getMonth() / 3) * 3, 1);
            startOfQuarter.setHours(0, 0, 0, 0);

            // Fetch Sales Invoices for Collected VAT
            const { data: salesData } = await supabase.rpc("finance_list_invoices", { p_search: null, p_status: null });

            // Fetch Purchase Invoices for Paid VAT
            const { data: purchaseData } = await supabase.rpc("list_purchase_invoices", { p_search: null, p_status: null, p_page_size: 1000 });

            let collected = 0;
            if (salesData) {
                (salesData as any[]).forEach(inv => {
                    if (inv.issue_date) {
                        const d = new Date(inv.issue_date);
                        if (d >= startOfQuarter) {
                            collected += (inv.tax_amount || 0);
                        }
                    }
                });
            }

            let paid = 0;
            if (purchaseData) {
                (purchaseData as any[]).forEach(pinv => {
                    if (pinv.date) {
                        const d = new Date(pinv.date);
                        if (d >= startOfQuarter) {
                            paid += (pinv.tax_amount || 0);
                        }
                    }
                });
            }

            setVatCollected(collected);
            setVatPaid(paid);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const netTax = vatCollected - vatPaid;
    const percentPaid = (vatPaid / vatCollected) * 100 || 0;

    return (
        <DashboardWidget
            title="Impuestos (Trimestre)"
            subtitle="IVA Repercutido vs Soportado"
            icon={Receipt}
            className="h-full"
        >
            <div className="space-y-6 mt-2">
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">A pagar (Neto)</span>
                        <span className="font-bold text-foreground">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(netTax)}</span>
                    </div>
                    <Progress value={Math.min(100, Math.max(0, 100 - percentPaid))} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-secondary/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Repercutido (+)</p>
                        <p className="font-semibold text-green-600">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(vatCollected)}
                        </p>
                    </div>
                    <div className="p-3 bg-secondary/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Soportado (-)</p>
                        <p className="font-semibold text-red-500">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(vatPaid)}
                        </p>
                    </div>
                </div>
            </div>
        </DashboardWidget>
    );
};

export default TaxSummaryWidget;
