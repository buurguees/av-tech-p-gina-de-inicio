import { useState, useEffect } from "react";
import { ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Line, ComposedChart, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { TrendingUp } from "lucide-react";
import { format, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface MonthlyRevenue {
    month: string;
    monthIndex: number;
    revenue: number;
    expenses: number;
    profit: number;
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
                
                // Fetch all invoices (sales) and purchase invoices (expenses) in parallel
                const [invoicesResult, purchaseInvoicesResult] = await Promise.all([
                    supabase.rpc("finance_list_invoices", {}),
                    supabase.rpc("list_purchase_invoices", {
                        p_search: null,
                        p_status: null,
                        p_document_type: null,
                        p_page_size: 10000
                    })
                ]);
                
                if (invoicesResult.error) throw invoicesResult.error;
                if (purchaseInvoicesResult.error) throw purchaseInvoicesResult.error;
                
                const invoicesData = invoicesResult.data || [];
                const purchaseInvoicesData = purchaseInvoicesResult.data || [];
                
                // Obtener el año actual
                const yearStart = startOfYear(new Date(currentYear, 0, 1));
                const yearEnd = endOfYear(new Date(currentYear, 11, 31));
                
                // Crear array con todos los meses del año
                const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
                
                // Process invoices by month
                const monthlyData = months.map((month, index) => {
                    const monthStart = startOfMonth(month);
                    const monthEnd = endOfMonth(month);
                    
                    // Filtrar facturas de venta del mes y sumar ingresos
                    const monthInvoices = invoicesData.filter((inv: any) => {
                        if (!inv.issue_date) return false;
                        const invDate = new Date(inv.issue_date);
                        return invDate >= monthStart && invDate <= monthEnd && inv.status !== 'CANCELLED';
                    });
                    
                    const revenue = monthInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
                    
                    // Filtrar facturas de compra del mes y sumar gastos
                    const monthPurchaseInvoices = purchaseInvoicesData.filter((inv: any) => {
                        if (!inv.issue_date) return false;
                        const invDate = new Date(inv.issue_date);
                        // Incluir solo facturas registradas, aprobadas o pagadas (excluir canceladas y pendientes)
                        return invDate >= monthStart && invDate <= monthEnd && 
                               inv.status !== 'CANCELLED' && 
                               (inv.status === 'REGISTERED' || inv.status === 'APPROVED' || inv.status === 'PAID' || inv.status === 'CONFIRMED');
                    });
                    
                    const expenses = monthPurchaseInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
                    
                    // Calcular beneficios (ingresos - gastos)
                    const profit = revenue - expenses;
                    
                    return {
                        month: format(month, "MMM", { locale: es }),
                        monthIndex: index,
                        revenue: revenue,
                        expenses: expenses,
                        profit: profit,
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

    const renderCustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const revenueValue = payload.find((p: any) => p.dataKey === 'revenue')?.value;
            const forecastValue = payload.find((p: any) => p.dataKey === 'forecast')?.value;
            const profitValue = payload.find((p: any) => p.dataKey === 'profit')?.value;
            
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
                        {profitValue !== undefined && (
                            <p className="text-sm flex items-center justify-between gap-4" style={{ color: 'hsl(var(--chart-3))' }}>
                                <span>Beneficios:</span>
                                <span className={`font-medium ${profitValue >= 0 ? '' : 'text-destructive'}`}>
                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(profitValue)}
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
                            <Tooltip content={renderCustomTooltip} />
                            <Legend 
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => {
                                    if (value === 'revenue') return 'Ingresos Reales';
                                    if (value === 'forecast') return 'Estimación';
                                    if (value === 'profit') return 'Beneficios';
                                    return value;
                                }}
                            />
                            {/* Línea de ingresos reales - continua */}
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="hsl(var(--chart-1))"
                                strokeWidth={2.5}
                                dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
                                activeDot={{ r: 6 }}
                                name="revenue"
                            />
                            {/* Línea de estimación - punteada */}
                            <Line
                                type="monotone"
                                dataKey="forecast"
                                stroke="hsl(var(--chart-2))"
                                strokeDasharray="8 4"
                                strokeWidth={2.5}
                                dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
                                activeDot={{ r: 6 }}
                                connectNulls={false}
                                name="forecast"
                            />
                            {/* Línea de beneficios - continua */}
                            <Line
                                type="monotone"
                                dataKey="profit"
                                stroke="hsl(var(--chart-3))"
                                strokeWidth={2.5}
                                dot={{ fill: 'hsl(var(--chart-3))', r: 4 }}
                                activeDot={{ r: 6 }}
                                name="profit"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        </DashboardWidget>
    );
};

export default RevenueChart;
