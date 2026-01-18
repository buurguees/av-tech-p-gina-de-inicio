import { useState, useEffect } from "react";
import DashboardWidget from "../DashboardWidget";
import { TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ProfitMarginWidget = () => {
    const [stats, setStats] = useState({ margin: 0, profit: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfitStats();
    }, []);

    const fetchProfitStats = async () => {
        try {
            setLoading(true);
            const { data: sales } = await supabase.rpc("finance_list_invoices", { p_search: null, p_status: null });
            const { data: purchases } = await supabase.rpc("list_purchase_invoices", { p_search: null, p_status: null, p_page_size: 1000 });

            const totalRevenue = (sales as any[] || []).reduce((sum, inv) => sum + (inv.total || 0), 0);
            const totalCosts = (purchases as any[] || []).reduce((sum, inv) => sum + (inv.total || 0), 0);

            const grossProfit = totalRevenue - totalCosts;
            const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

            setStats({
                margin: Math.round(marginPercent * 10) / 10,
                profit: grossProfit
            });
        } catch (err) {
            console.error('Error calculating margin:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardWidget title="Rentabilidad" subtitle="Cargando..." icon={DollarSign} className="h-full">
                <div className="flex items-center justify-center h-[140px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
                </div>
            </DashboardWidget>
        );
    }

    return (
        <DashboardWidget
            title="Rentabilidad"
            subtitle="Margen Bruto Real"
            icon={DollarSign}
            className="h-full"
            variant="solid"
        >
            <div className="flex flex-col items-center justify-center h-[140px] text-center">
                <div className="relative inline-flex items-center justify-center">
                    <svg className="transform -rotate-90 w-24 h-24">
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-primary-foreground/20" />
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - Math.max(0, stats.margin) / 100)} className="text-white drop-shadow-md" />
                    </svg>
                    <span className="absolute text-2xl font-bold text-white">{stats.margin}%</span>
                </div>
                <div className="mt-4">
                    <p className="text-sm text-primary-foreground/80">Beneficio Bruto Total</p>
                    <p className="text-xl font-bold text-white mt-1">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.profit)}
                    </p>
                </div>
            </div>
        </DashboardWidget>
    );
};

export default ProfitMarginWidget;
