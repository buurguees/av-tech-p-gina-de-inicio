import { useState, useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Line, ComposedChart } from "recharts";
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

interface RevenueChartProps {
    data?: any[];
}

const RevenueChart = ({ data: externalData }: RevenueChartProps) => {
    const [data, setData] = useState<MonthlyRevenue[]>([]);
    const [loading, setLoading] = useState(true);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed

    useEffect(() => {
        const fetchYearlyData = async () => {
            try {
                setLoading(true);
                
                // Fetch all invoices once
                const { data: invoicesData, error } = await supabase.rpc("finance_list_invoices", {});
                
                if (error) throw error;
                
                // Obtener el año actual
                const yearStart = startOfYear(new Date(currentYear, 0, 1));
                const yearEnd = endOfYear(new Date(currentYear, 11, 31));
                
                // Crear array con todos los meses del año
                const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
                
                // Process invoices by month
                const monthlyData = months.map((month, index) => {
                    const monthStart = startOfMonth(month);
                    const monthEnd = endOfMonth(month);
                    
                    // Filtrar facturas del mes y sumar ingresos
                    const monthInvoices = (invoicesData || []).filter((inv: any) => {
                        if (!inv.issue_date) return false;
                        const invDate = new Date(inv.issue_date);
                        return invDate >= monthStart && invDate <= monthEnd && inv.status !== 'CANCELLED';
                    });
                    
                    const revenue = monthInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
                    
                    return {
                        month: format(month, "MMM", { locale: es }),
                        monthIndex: index,
                        revenue: revenue,
                        forecast: null as number | null,
                    };
                });
                
                // Calculate forecast based on current month's projection
                const currentMonthData = monthlyData[currentMonth];
                const dayOfMonth = new Date().getDate();
                const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                
                // Project current month's revenue to full month
                const projectedCurrentMonthRevenue = currentMonthData.revenue > 0 
                    ? (currentMonthData.revenue / dayOfMonth) * daysInCurrentMonth 
                    : 0;
                
                // Calculate average monthly revenue from past months with data
                const pastMonthsWithRevenue = monthlyData
                    .filter((m, idx) => idx < currentMonth && m.revenue > 0);
                const avgMonthlyRevenue = pastMonthsWithRevenue.length > 0
                    ? pastMonthsWithRevenue.reduce((sum, m) => sum + m.revenue, 0) / pastMonthsWithRevenue.length
                    : projectedCurrentMonthRevenue;
                
                // Set forecast values for current and future months
                const dataWithForecast = monthlyData.map((m, idx) => ({
                    ...m,
                    forecast: idx >= currentMonth 
                        ? (idx === currentMonth ? projectedCurrentMonthRevenue : avgMonthlyRevenue)
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

    const CustomTooltip = ({ active, payload, label }: any) => {
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
            className="h-full"
        >
            <div className="h-[300px] w-full mt-4">
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
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                width={45}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            {/* Revenue area - solid blue */}
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="hsl(var(--chart-1))"
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                strokeWidth={2.5}
                            />
                            {/* Forecast line - dashed teal/green, no fill */}
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
