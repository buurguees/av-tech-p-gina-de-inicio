import { useState, useEffect } from "react";
import DashboardWidget from "../DashboardWidget";
import { DollarSign } from "lucide-react";

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
    
    // Determine color based on margin value
    const getMarginColor = () => {
        if (stats.margin >= 25) return 'hsl(var(--chart-2))'; // Green/Teal for good
        if (stats.margin >= 15) return 'hsl(var(--chart-3))'; // Yellow for medium
        return 'hsl(var(--chart-5))'; // Red for low
    };
    
    const marginColor = getMarginColor();

    return (
        <DashboardWidget
            title="Rentabilidad"
            subtitle="Margen Bruto Real"
            icon={DollarSign}
            className="h-full"
            variant="clean"
        >
            <div className="flex flex-col items-center justify-center flex-1 text-center py-4">
                <div className="relative inline-flex items-center justify-center">
                    <svg className="transform -rotate-90 w-28 h-28">
                        {/* Background circle */}
                        <circle 
                            cx="56" 
                            cy="56" 
                            r="46" 
                            strokeWidth="10" 
                            fill="transparent" 
                            stroke="hsl(var(--muted))"
                        />
                        {/* Progress circle */}
                        <circle 
                            cx="56" 
                            cy="56" 
                            r="46" 
                            strokeWidth="10" 
                            fill="transparent" 
                            strokeDasharray={289}
                            strokeDashoffset={289 * (1 - Math.max(0, Math.min(stats.margin, 100)) / 100)}
                            strokeLinecap="round"
                            stroke={marginColor}
                            style={{ transition: 'stroke-dashoffset 0.7s ease-out, stroke 0.3s ease' }}
                        />
                    </svg>
                    <span className="absolute text-2xl font-bold text-foreground">{stats.margin}%</span>
                </div>
                <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Beneficio Bruto Total</p>
                    <p className="text-xl font-bold text-foreground mt-1">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.profit)}
                    </p>
                </div>
            </div>
        </DashboardWidget>
    );
};

export default ProfitMarginWidget;
