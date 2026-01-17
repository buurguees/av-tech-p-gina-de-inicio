import DashboardWidget from "../DashboardWidget";
import { TrendingUp, DollarSign } from "lucide-react";

// This is fully mocked for now as we don't have real cost data
const ProfitMarginWidget = () => {
    const marginPercent = 32.5;
    const grossProfit = 125000;

    return (
        <DashboardWidget
            title="Rentabilidad"
            subtitle="Margen Bruto Estimado"
            icon={DollarSign}
            className="h-full"
            variant="solid" // Highlight this one
        >
            <div className="flex flex-col items-center justify-center h-[140px] text-center">
                <div className="relative inline-flex items-center justify-center">
                    <svg className="transform -rotate-90 w-24 h-24">
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-primary-foreground/20" />
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - marginPercent / 100)} className="text-white drop-shadow-md" />
                    </svg>
                    <span className="absolute text-2xl font-bold text-white">{marginPercent}%</span>
                </div>
                <div className="mt-4">
                    <p className="text-sm text-primary-foreground/80">Beneficio Bruto (Año)</p>
                    <p className="text-xl font-bold text-white mt-1">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(grossProfit)}
                    </p>
                </div>
            </div>
        </DashboardWidget>
    );
};

export default ProfitMarginWidget;
