import { useState, useEffect } from "react";
import { Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Line, ComposedChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { TrendingUp } from "lucide-react";
import { format, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface MonthlyRevenue {
    month: string;
    monthIndex: number;
    revenue: number;
    forecast: number | null;
}

const RevenueChart = () => {
    const [data, setData] = useState<MonthlyRevenue[]>([]);
    const [loading, setLoading] = useState(true);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    useEffect(() => {
        const fetchYearlyData = async () => {
            try {
                setLoading(true);
                
                const { data: invoicesData, error } = await supabase.rpc("finance_list_invoices", {
                    p_search: null,
                    p_status: null,
                });
                
                if (error) throw error;
                
                const yearStart = startOfYear(new Date(currentYear, 0, 1));
                const yearEnd = endOfYear(new Date(currentYear, 11, 31));
                const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
                
                const monthlyData = months.map((month, index) => {
                    const monthStart = startOfMonth(month);
                    const monthEnd = endOfMonth(month);
                    
                    const monthInvoices = (invoicesData || []).filter((inv: any) => {
                        if (!inv.issue_date) return false;
                        const invDate = new Date(inv.issue_date);
                        return invDate >= monthStart && invDate <= monthEnd 
                            && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT';
                    });
                    
                    const revenue = monthInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
                    
                    return {
                        month: format(month, "MMM", { locale: es }),
                        monthIndex: index,
                        revenue,
                        forecast: null as number | null,
                    };
                });
                
                // Improved forecast: weighted moving average (recent months weigh more)
                const pastMonthsWithRevenue = monthlyData
                    .filter((m, idx) => idx < currentMonth && m.revenue > 0);

                let forecastBase = 0;
                if (pastMonthsWithRevenue.length > 0) {
                    // Weighted average: more recent months have higher weight
                    let totalWeight = 0;
                    let weightedSum = 0;
                    pastMonthsWithRevenue.forEach((m, i) => {
                        const weight = i + 1; // increasing weight
                        weightedSum += m.revenue * weight;
                        totalWeight += weight;
                    });
                    forecastBase = weightedSum / totalWeight;
                }

                // Project current month
                const dayOfMonth = new Date().getDate();
                const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const currentMonthRevenue = monthlyData[currentMonth]?.revenue || 0;
                const projectedCurrentMonth = currentMonthRevenue > 0
                    ? (currentMonthRevenue / dayOfMonth) * daysInCurrentMonth
                    : forecastBase;

                const dataWithForecast = monthlyData.map((m, idx) => ({
                    ...m,
                    forecast: idx === currentMonth 
                        ? Math.round(projectedCurrentMonth)
                        : idx > currentMonth 
                            ? Math.round(forecastBase) 
                            : null,
                }));
                
                setData(dataWithForecast);
            } catch (error) {
                console.error('Error fetching revenue data:', error);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchYearlyData();
    }, [currentYear, currentMonth]);

    const renderCustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const revenueValue = payload.find((p: any) => p.dataKey === 'revenue')?.value;
            const forecastValue = payload.find((p: any) => p.dataKey === 'forecast')?.value;
            
            return (
                <div className="bg-popover border border-border p-3 rounded-xl shadow-lg">
                    <p className="font-semibold text-foreground mb-1">{label}</p>
                    <div className="space-y-1">
                        {revenueValue !== undefined && revenueValue > 0 && (
                            <p className="text-sm flex items-center justify-between gap-4" style={{ color: 'hsl(var(--chart-1))' }}>
                                <span>Ingresos:</span>
                                <span className="font-medium">
                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(revenueValue)}
                                </span>
                            </p>
                        )}
                        {forecastValue !== undefined && forecastValue !== null && forecastValue > 0 && (
                            <p className="text-sm flex items-center justify-between gap-4" style={{ color: 'hsl(var(--chart-2))' }}>
                                <span>Previsión:</span>
                                <span className="font-medium">
                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(forecastValue)}
                                </span>
                            </p>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <DashboardWidget
            title="Evolución de Ingresos Anual"
            subtitle={`Año ${currentYear}`}
            icon={TrendingUp}
            variant="clean"
        >
            <div className="h-[280px] w-full">
                {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
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
                                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)}
                                width={45}
                                domain={[0, 'dataMax + 500']}
                            />
                            <Tooltip content={renderCustomTooltip} />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="hsl(var(--chart-1))"
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                strokeWidth={2.5}
                            />
                            <Line
                                type="monotone"
                                dataKey="forecast"
                                stroke="hsl(var(--chart-2))"
                                strokeDasharray="6 4"
                                strokeWidth={2}
                                dot={false}
                                connectNulls={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        </DashboardWidget>
    );
};

export default RevenueChart;
