import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

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

interface Invoice {
    id: string;
    project_id: string | null;
    status: string;
    pending_amount: number;
}

const ProjectFinancialsWidget = ({ projectId }: ProjectFinancialsWidgetProps) => {
    const [stats, setStats] = useState<FinancialStats | null>(null);
    const [pendingAmount, setPendingAmount] = useState<number>(0);
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

                // Obtener el importe pendiente de cobro de las facturas del proyecto
                // Incluye facturas DRAFT (borrador) ya que son facturas pendientes de confirmar pero que se van a emitir
                const { data: invoicesData } = await supabase.rpc('finance_list_invoices', {
                    p_search: null,
                    p_status: null
                });

                if (invoicesData) {
                    const projectInvoices = (invoicesData || []).filter((inv: Invoice) => 
                        inv.project_id === projectId && 
                        inv.status !== 'CANCELLED'
                    );
                    
                    const totalPending = projectInvoices.reduce((sum: number, inv: Invoice) => {
                        // Para facturas DRAFT, usar el subtotal completo ya que aún no se ha cobrado nada
                        // Para otras facturas, usar el pending_amount
                        if (inv.status === 'DRAFT') {
                            return sum + ((inv as any).subtotal || 0);
                        } else {
                            return sum + (inv.pending_amount || 0);
                        }
                    }, 0);
                    
                    setPendingAmount(totalPending);
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
        return new Intl.NumberFormat('es-ES', { 
            style: 'currency', 
            currency: 'EUR', 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 0 
        }).format(val);
    };

    const formatPercentage = (value: number) => {
        // Asegurar que los valores negativos muestren el signo "-"
        return value < 0 ? `-${Math.abs(value).toFixed(1)}%` : `${value.toFixed(1)}%`;
    };

    return (
        <Card className="border border-border/60 hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                        <DollarSign size={18} />
                    </div>
                    <div>
                        <CardTitle className="text-foreground text-lg">Resumen Financiero</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chart - Izquierda */}
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={chartData} 
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                barCategoryGap="20%"
                            >
                                <XAxis 
                                    dataKey="name"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis 
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => {
                                        if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                        return value.toString();
                                    }}
                                />
                                <Tooltip
                                    contentStyle={{ 
                                        backgroundColor: 'hsl(var(--card))', 
                                        border: '1px solid hsl(var(--border))', 
                                        color: 'hsl(var(--foreground))',
                                        borderRadius: '8px',
                                        padding: '8px 12px'
                                    }}
                                    formatter={(value: number) => formatCurrency(value)}
                                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                                />
                                <Bar 
                                    dataKey="value" 
                                    radius={[8, 8, 0, 0]} 
                                    barSize={60}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                    <LabelList 
                                        dataKey="value" 
                                        position="top"
                                        formatter={(value: number) => formatCurrency(value)}
                                        style={{ 
                                            fill: 'hsl(var(--foreground))',
                                            fontSize: '11px',
                                            fontWeight: 600
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stats Grid - Derecha */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="border border-border/60 hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <p className="text-sm font-medium text-muted-foreground mb-2">Margen Neto</p>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xl font-bold ${stats.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCurrency(stats.margin)}
                                    </span>
                                    {stats.margin >= 0 ?
                                        <TrendingUp className="h-4 w-4 text-emerald-600" /> :
                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                    }
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-border/60 hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <p className="text-sm font-medium text-muted-foreground mb-2">% Rentabilidad</p>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xl font-bold ${stats.margin_percentage >= 25 ? 'text-emerald-600' : stats.margin_percentage >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {formatPercentage(stats.margin_percentage)}
                                    </span>
                                    {stats.margin_percentage < 15 && (
                                        <AlertCircle className="h-4 w-4 text-amber-600" />
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-border/60 hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <p className="text-sm font-medium text-muted-foreground mb-2">Total Gastos</p>
                                <p className="text-lg font-bold text-foreground">{formatCurrency(stats.total_expenses)}</p>
                            </CardContent>
                        </Card>

                        <Card className="border border-border/60 hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <p className="text-sm font-medium text-muted-foreground mb-2">Pendiente de Cobro</p>
                                <p className="text-lg font-bold text-foreground">{formatCurrency(pendingAmount)}</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ProjectFinancialsWidget;
