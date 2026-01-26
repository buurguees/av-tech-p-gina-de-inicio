import { useState, useEffect } from "react";
import DashboardWidget from "../DashboardWidget";
import { TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProfitMarginWidgetProps {
    data?: any;
}

const ProfitMarginWidget = ({ data: externalData }: ProfitMarginWidgetProps) => {
    const [stats, setStats] = useState({ margin: 0, profit: 0 });
    const [loading, setLoading] = useState(!externalData);

    useEffect(() => {
        if (externalData) {
            setStats({
                margin: Math.round((externalData.margin || 0) * 10) / 10,
                profit: externalData.profit || 0
            });
            setLoading(false);
        }
    }, [externalData]);

    if (loading) {
        return (
            <DashboardWidget title="Rentabilidad" subtitle="Cargando..." icon={DollarSign} className="h-full">
                <div className="flex items-center justify-center h-[140px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
                </div>
            </DashboardWidget>
        );
    }

    // Calculate stroke offset for progress circle
    const circumference = 251.2;
    const strokeOffset = circumference * (1 - Math.max(0, Math.min(stats.margin, 100)) / 100);

    return (
        <DashboardWidget
            title="Rentabilidad"
            subtitle="Margen Bruto Real"
            icon={DollarSign}
            className="h-full"
            variant="solid"
        >
            <div className="flex flex-col items-center justify-center flex-1 text-center">
                <div className="relative inline-flex items-center justify-center">
                    <svg className="transform -rotate-90 w-24 h-24">
                        {/* Background circle */}
                        <circle 
                            cx="48" 
                            cy="48" 
                            r="40" 
                            stroke="currentColor" 
                            strokeWidth="8" 
                            fill="transparent" 
                            className="text-primary-foreground/20" 
                        />
                        {/* Progress circle */}
                        <circle 
                            cx="48" 
                            cy="48" 
                            r="40" 
                            stroke="currentColor"
                            strokeWidth="8" 
                            fill="transparent" 
                            strokeDasharray={circumference} 
                            strokeDashoffset={strokeOffset} 
                            strokeLinecap="round"
                            className="text-primary-foreground drop-shadow-md transition-all duration-700 ease-out" 
                        />
                    </svg>
                    <span className="absolute text-2xl font-bold text-primary-foreground">{stats.margin}%</span>
                </div>
                <div className="mt-4">
                    <p className="text-sm text-primary-foreground/80">Beneficio Bruto Total</p>
                    <p className="text-xl font-bold text-primary-foreground mt-1">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.profit)}
                    </p>
                </div>
            </div>
        </DashboardWidget>
    );
};

export default ProfitMarginWidget;
