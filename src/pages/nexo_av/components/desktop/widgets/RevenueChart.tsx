import { useState, useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { TrendingUp } from "lucide-react";

interface MonthlyRevenue {
    month: string;
    revenue: number;
    forecast: number;
}

interface RevenueChartProps {
    data?: any[];
}

const RevenueChart = ({ data: externalData }: RevenueChartProps) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(!externalData);

    useEffect(() => {
        if (externalData) {
            setData(externalData.map(item => ({
                ...item,
                forecast: item.revenue * 1.1 // Keeping simple forecast logic for now
            })));
            setLoading(false);
        }
    }, [externalData]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-popover border border-border p-3 rounded-xl shadow-lg">
                    <p className="font-semibold text-foreground mb-1">{label}</p>
                    <div className="space-y-1">
                        <p className="text-sm text-primary flex items-center justify-between gap-4">
                            <span>Ingresos:</span>
                            <span className="font-medium">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(payload[0].value)}
                            </span>
                        </p>
                        <p className="text-sm text-purple-500/70 flex items-center justify-between gap-4">
                            <span>Previsto:</span>
                            <span className="font-medium">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(payload[1].value)}
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
            title="Evolución de Ingresos"
            subtitle="Últimos 6 meses"
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
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
                                tickFormatter={(value) => `${value / 1000}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="forecast"
                                stroke="#8b5cf6"
                                strokeDasharray="5 5"
                                fillOpacity={1}
                                fill="url(#colorForecast)"
                                strokeWidth={2}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="hsl(var(--primary))"
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                strokeWidth={3}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </DashboardWidget>
    );
};

export default RevenueChart;
