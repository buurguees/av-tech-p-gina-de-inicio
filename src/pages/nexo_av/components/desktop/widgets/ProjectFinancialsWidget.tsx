import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ProjectFinancialsWidgetProps {
    projectId: string;
}

interface FinancialStats {
    total_budget: number;
    total_invoiced: number;
    total_expenses: number;
    margin: number;
    margin_percentage: number;
}

const ProjectFinancialsWidget = ({ projectId }: ProjectFinancialsWidgetProps) => {
    const [stats, setStats] = useState<FinancialStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data, error } = await supabase.rpc('get_project_financial_stats', {
                    p_project_id: projectId
                }) as { data: FinancialStats[] | null; error: any };

                if (error) throw error;

                if (data && Array.isArray(data) && data.length > 0) {
                    setStats(data[0]);
                }
            } catch (error) {
                console.error('Error fetching financial stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [projectId]);

    if (loading) {
        return <Skeleton className="h-[300px] w-full bg-white/5" />;
    }

    if (!stats) return null;

    const chartData = [
        { name: 'Presupuesto', value: stats.total_budget, color: '#3b82f6' }, // Blue
        { name: 'Facturado', value: stats.total_invoiced, color: '#f59e0b' }, // Amber
        { name: 'Gastos', value: stats.total_expenses, color: '#ef4444' }, // Red
    ];

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
    };

    return (
        <Card className="bg-white/5 border-white/10">
            <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    Resumen Financiero
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Chart */}
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    stroke="#ffffff60"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                    cursor={{ fill: 'transparent' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                            <p className="text-white/60 text-xs mb-1">Margen Neto</p>
                            <div className="flex items-center gap-2">
                                <span className={`text-xl font-bold ${stats.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(stats.margin)}
                                </span>
                                {stats.margin >= 0 ?
                                    <TrendingUp className="h-4 w-4 text-green-400" /> :
                                    <TrendingDown className="h-4 w-4 text-red-400" />
                                }
                            </div>
                        </div>

                        <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                            <p className="text-white/60 text-xs mb-1">% Rentabilidad</p>
                            <div className="flex items-center gap-2">
                                <span className={`text-xl font-bold ${stats.margin_percentage >= 20 ? 'text-green-400' : stats.margin_percentage > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {stats.margin_percentage.toFixed(1)}%
                                </span>
                                {stats.margin_percentage < 15 && (
                                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                                )}
                            </div>
                        </div>

                        <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                            <p className="text-white/60 text-xs mb-1">Total Gastos</p>
                            <p className="text-white font-medium">{formatCurrency(stats.total_expenses)}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                            <p className="text-white/60 text-xs mb-1">Pendiente Facturar</p>
                            <p className="text-white font-medium">{formatCurrency(stats.total_budget - stats.total_invoiced)}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ProjectFinancialsWidget;
