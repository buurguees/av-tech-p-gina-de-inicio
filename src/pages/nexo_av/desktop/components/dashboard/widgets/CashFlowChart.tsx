import { useState, useEffect } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { ArrowUpRight } from "lucide-react";
import { format, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

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
    const [loading, setLoading] = useState(true);
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        const fetchCashFlowData = async () => {
            try {
                setLoading(true);
                
                // Use external data if provided, but ensure it's current year only
                if (externalData && externalData.length > 0) {
                    // Get current year months
                    const yearStart = startOfYear(new Date(currentYear, 0, 1));
                    const yearEnd = endOfYear(new Date(currentYear, 11, 31));
                    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
                    const monthNames = months.map(m => format(m, "MMM", { locale: es }));
                    
                    // Filter only current year data by matching month names
                    const currentYearData = monthNames.map(monthName => {
                        const found = externalData.find((item: any) => 
                            item.month?.toLowerCase() === monthName.toLowerCase()
                        );
                        return {
                            month: monthName,
                            income: found?.revenue || 0,
                            expenses: found?.expenses || 0,
                            net: (found?.revenue || 0) - (found?.expenses || 0)
                        };
                    });
                    
                    setData(currentYearData);
                    setLoading(false);
                    return;
                }
                
                // Fallback: fetch data directly for current year
                const yearStart = startOfYear(new Date(currentYear, 0, 1));
                const yearEnd = endOfYear(new Date(currentYear, 11, 31));
                const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
                
                const monthlyData = months.map(month => ({
                    month: format(month, "MMM", { locale: es }),
                    income: 0,
                    expenses: 0,
                    net: 0
                }));
                
                setData(monthlyData);
            } catch (error) {
                console.error('Error fetching cash flow data:', error);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCashFlowData();
    }, [externalData, currentYear]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const income = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
            const expenses = payload.find((p: any) => p.dataKey === 'expenses')?.value || 0;
            const net = income - expenses;
            
            return (
                <div className="bg-popover border border-border p-3 rounded-xl shadow-lg z-50">
                    <p className="font-semibold text-foreground mb-2">{label}</p>
                    <div className="space-y-1">
                        <p className="text-sm flex items-center justify-between gap-4" style={{ color: 'hsl(var(--status-success))' }}>
                            <span>Ingresos:</span>
                            <span className="font-medium">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(income)}
                            </span>
                        </p>
                        <p className="text-sm flex items-center justify-between gap-4" style={{ color: 'hsl(var(--status-error))' }}>
                            <span>Gastos:</span>
                            <span className="font-medium">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(expenses)}
                            </span>
                        </p>
                        <div className="h-px bg-border my-1" />
                        <p className="text-sm flex items-center justify-between gap-4">
                            <span>Beneficio:</span>
                            <span className={`font-bold ${net >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(net)}
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
            subtitle={`Ingresos vs Gastos - Año ${currentYear}`}
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
                        <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
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
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                width={45}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar
                                dataKey="income"
                                name="Ingresos"
                                fill="hsl(var(--status-success))"
                                radius={[4, 4, 0, 0]}
                                barSize={24}
                            />
                            <Bar
                                dataKey="expenses"
                                name="Gastos"
                                fill="hsl(var(--status-error))"
                                radius={[4, 4, 0, 0]}
                                barSize={24}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </DashboardWidget>
    );
};

export default CashFlowChart;
