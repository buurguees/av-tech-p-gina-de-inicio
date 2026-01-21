import { useState, useEffect } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { ArrowUpRight } from "lucide-react";

interface CashFlowData {
    month: string;
    income: number;
    expenses: number;
    net: number;
}

interface CashFlowChartProps {
    data?: any[];
}

const CashFlowChart = ({ data: externalData }: CashFlowChartProps) => {
    const [data, setData] = useState<CashFlowData[]>([]);
    const [loading, setLoading] = useState(!externalData);

    useEffect(() => {
        if (externalData) {
            setData(externalData.map(item => ({
                month: item.month,
                income: item.revenue || 0,
                expenses: item.expenses || 0,
                net: (item.revenue || 0) - (item.expenses || 0)
            })));
            setLoading(false);
        }
    }, [externalData]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-popover border border-border p-3 rounded-xl shadow-lg z-50">
                    <p className="font-semibold text-foreground mb-2">{label}</p>
                    <div className="space-y-1">
                        <p className="text-sm text-green-600 flex items-center justify-between gap-4">
                            <span>Ingresos:</span>
                            <span className="font-medium">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(payload[0].value)}
                            </span>
                        </p>
                        <p className="text-sm text-red-500 flex items-center justify-between gap-4">
                            <span>Gastos:</span>
                            <span className="font-medium">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(payload[1].value)}
                            </span>
                        </p>
                        <div className="h-px bg-border my-1" />
                        <p className="text-sm text-foreground flex items-center justify-between gap-4">
                            <span>Beneficio:</span>
                            <span className={`font-bold ${payload[0].value - payload[1].value >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(payload[0].value - payload[1].value)}
                            </span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <DashboardWidget
            title="Flujo de Caja"
            subtitle="Ingresos vs Gastos (Estimado)"
            icon={ArrowUpRight}
            className="h-full"
        >
            <div className="h-[250px] w-full mt-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                tickFormatter={(value) => `${value / 1000}k`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar
                                dataKey="income"
                                name="Ingresos"
                                fill="hsl(152, 69%, 31%)"
                                radius={[4, 4, 0, 0]}
                                barSize={30}
                            />
                            <Bar
                                dataKey="expenses"
                                name="Gastos"
                                fill="hsl(0, 72%, 51%)"
                                radius={[4, 4, 0, 0]}
                                barSize={30}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </DashboardWidget>
    );
};

export default CashFlowChart;
