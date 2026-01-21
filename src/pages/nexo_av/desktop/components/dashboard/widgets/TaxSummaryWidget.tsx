import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { Receipt, Percent, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { format, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

interface TaxSummaryWidgetProps {
    data?: {
        collected: number;
        paid: number;
    };
    period?: 'quarter' | 'year';
}

const TaxSummaryWidget = ({ data: externalData, period = 'quarter' }: TaxSummaryWidgetProps) => {
    const [vatCollected, setVatCollected] = useState(0);
    const [vatPaid, setVatPaid] = useState(0);
    const [vatToPay, setVatToPay] = useState(0);
    const [irpfAmount, setIrpfAmount] = useState(0);
    const [corporateTax, setCorporateTax] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTaxData = async () => {
            try {
                setLoading(true);
                const now = new Date();
                let start: Date, end: Date;

                if (period === 'quarter') {
                    start = startOfQuarter(now);
                    end = endOfQuarter(now);
                } else {
                    start = startOfYear(now);
                    end = endOfYear(now);
                }

                const periodStart = format(start, "yyyy-MM-dd");
                const periodEnd = format(end, "yyyy-MM-dd");

                // Fetch VAT Summary - usando la misma función que AccountingPage
                const { data: vatData, error: vatError } = await supabase.rpc("get_vat_summary", {
                    p_period_start: periodStart,
                    p_period_end: periodEnd,
                });
                
                if (vatError) throw vatError;
                
                if (vatData && vatData.length > 0) {
                    const vatSummary = vatData[0];
                    setVatCollected(vatSummary.vat_received || 0);
                    setVatPaid(vatSummary.vat_paid || 0);
                    setVatToPay(vatSummary.vat_to_pay || 0);
                }

                // Fetch IRPF
                const { data: irpfData, error: irpfError } = await supabase.rpc("get_irpf_summary", {
                    p_period_start: periodStart,
                    p_period_end: periodEnd,
                });
                
                if (irpfError) throw irpfError;
                setIrpfAmount(typeof irpfData === 'number' ? irpfData : (irpfData?.[0]?.irpf_accumulated || 0));

                // Fetch Corporate Tax (IS)
                const { data: corporateTaxData, error: corporateTaxError } = await supabase.rpc("get_corporate_tax_summary", {
                    p_period_start: periodStart,
                    p_period_end: periodEnd,
                });
                
                if (corporateTaxError) throw corporateTaxError;
                setCorporateTax(corporateTaxData?.[0]?.tax_amount || 0);
            } catch (error) {
                console.error('Error fetching tax data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTaxData();
    }, [period]);

    const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

    return (
        <DashboardWidget
            title={`Impuestos (${period === 'quarter' ? 'Trimestre' : 'Año'})`}
            subtitle="Resumen de impuestos"
            icon={Receipt}
            className="h-auto"
        >
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-3 mt-2">
                {/* IVA Repercutido */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">IVA Repercutido</span>
                    </div>
                    <span className="font-semibold text-green-600 text-xs">{formatCurrency(vatCollected)}</span>
                </div>

                {/* IVA Soportado */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <TrendingDown className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">IVA Soportado</span>
                    </div>
                    <span className="font-semibold text-red-500 text-xs">{formatCurrency(vatPaid)}</span>
                </div>

                {/* IVA a pagar */}
                <div className="pt-1 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Receipt className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">IVA a pagar</span>
                    </div>
                    <span className={`font-semibold text-xs ${vatToPay >= 0 ? 'text-blue-600' : 'text-green-600'}`}>
                        {formatCurrency(vatToPay)}
                    </span>
                </div>

                {/* IRPF Section */}
                <div className="pt-1 border-t border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Percent className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">IRPF Retenido</span>
                        </div>
                        <span className="font-semibold text-blue-600 text-xs">{formatCurrency(irpfAmount)}</span>
                    </div>
                </div>

                {/* IS Section */}
                <div className="pt-1 border-t border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Receipt className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">IS Provisionado</span>
                        </div>
                        <span className="font-semibold text-blue-600 text-xs">{formatCurrency(corporateTax)}</span>
                    </div>
                </div>
                </div>
            )}
        </DashboardWidget>
    );
};

export default TaxSummaryWidget;
