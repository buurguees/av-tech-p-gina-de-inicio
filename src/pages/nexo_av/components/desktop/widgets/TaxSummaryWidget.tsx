import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { Receipt } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TaxSummaryWidgetProps {
    data?: {
        collected: number;
        paid: number;
    };
}

const TaxSummaryWidget = ({ data: externalData }: TaxSummaryWidgetProps) => {
    const [vatCollected, setVatCollected] = useState(0);
    const [vatPaid, setVatPaid] = useState(0);
    const [loading, setLoading] = useState(!externalData);

    useEffect(() => {
        if (externalData) {
            setVatCollected(externalData.collected || 0);
            setVatPaid(externalData.paid || 0);
            setLoading(false);
        }
    }, [externalData]);

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
