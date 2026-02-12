import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { DollarSign } from "lucide-react";
import { format, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

interface ProfitMarginWidgetProps {
    period?: 'quarter' | 'year';
}

const ProfitMarginWidget = ({ period = 'quarter' }: ProfitMarginWidgetProps) => {
    const [stats, setStats] = useState({ margin: 0, profit: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfitability = async () => {
            try {
                setLoading(true);
                const now = new Date();
                let start: Date, end: Date;

                if (period === 'year') {
                    start = startOfYear(now);
                    end = endOfYear(now);
                } else {
                    start = startOfQuarter(now);
                    end = endOfQuarter(now);
                }

                const periodStart = format(start, "yyyy-MM-dd");
                const periodEnd = format(end, "yyyy-MM-dd");

                // Use accounting P&L for real profitability
                const { data, error } = await supabase.rpc("get_period_profit_summary", {
                    p_start: periodStart,
                    p_end: periodEnd,
                });

                if (error) throw error;

                if (data && data.length > 0) {
                    const summary = data[0];
                    const revenue = summary.total_revenue || 0;
                    const expenses = summary.operating_expenses || 0;
                    const profit = summary.profit_before_tax || 0;
                    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

                    setStats({
                        margin: Math.round(margin * 10) / 10,
                        profit: profit,
                    });
                } else {
                    setStats({ margin: 0, profit: 0 });
                }
            } catch (error) {
                console.error('Error fetching profitability:', error);
                setStats({ margin: 0, profit: 0 });
            } finally {
                setLoading(false);
            }
        };

        fetchProfitability();
    }, [period]);

    // Determine color based on margin value
    const getMarginColor = () => {
        if (stats.margin >= 25) return 'hsl(var(--chart-2))';
        if (stats.margin >= 15) return 'hsl(var(--chart-3))';
        return 'hsl(var(--chart-5))';
    };
    
    const marginColor = getMarginColor();
    // Handle negative margins for the circle display
    const displayMargin = Math.abs(stats.margin);
    const circumference = 289;
    const strokeOffset = circumference * (1 - Math.min(displayMargin, 100) / 100);

    return (
        <DashboardWidget
            title="Rentabilidad"
            subtitle={`Margen Bruto Real (${period === 'quarter' ? 'Trimestre' : 'Año'})`}
            icon={DollarSign}
            className="h-full"
            variant="clean"
        >
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-center py-4">
                    <div className="relative inline-flex items-center justify-center">
                        <svg className="transform -rotate-90 w-28 h-28">
                            <circle 
                                cx="56" cy="56" r="46" 
                                strokeWidth="10" fill="transparent" 
                                stroke="hsl(var(--muted))"
                            />
                            <circle 
                                cx="56" cy="56" r="46" 
                                strokeWidth="10" fill="transparent" 
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeOffset}
                                strokeLinecap="round"
                                stroke={marginColor}
                                style={{ transition: 'stroke-dashoffset 0.7s ease-out, stroke 0.3s ease' }}
                            />
                        </svg>
                        <span className="absolute text-2xl font-bold text-foreground">
                            {stats.margin > 0 ? '' : stats.margin < 0 ? '-' : ''}{displayMargin}%
                        </span>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm text-muted-foreground">Beneficio Bruto Total</p>
                        <p className={`text-xl font-bold mt-1 ${stats.profit >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.profit)}
                        </p>
                    </div>
                </div>
            )}
        </DashboardWidget>
    );
};

export default ProfitMarginWidget;
