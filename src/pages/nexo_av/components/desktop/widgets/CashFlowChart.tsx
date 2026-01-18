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

const CashFlowChart = () => {
    const [data, setData] = useState<CashFlowData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Get Invoices for Income (Real Data)
            const { data: invoices } = await supabase.rpc("finance_list_invoices", {
                p_search: null,
                p_status: null
            });

            // Get Purchase Invoices for Expenses (Real Data)
            const { data: purchaseInvoices } = await supabase.rpc("list_purchase_invoices", {
                p_search: null,
                p_status: null,
                p_page_size: 1000 // Get enough for history
            });

            // Prepare 6 months data
            const today = new Date();
            const months: CashFlowData[] = [];

            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthKey = d.toLocaleString('es-ES', { month: 'short' }).toUpperCase();

                // Filter income for this month
                let monthIncome = 0;
                if (invoices) {
                    (invoices as any[]).forEach(inv => {
                        if ((inv.status === 'PAID' || inv.status === 'SENT') && inv.issue_date) {
                            const invDate = new Date(inv.issue_date);
                            if (invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear()) {
                                monthIncome += (inv.total || 0);
                            }
                        }
                    });
                }

                // Filter expenses for this month (Real Data)
                let monthExpenses = 0;
                if (purchaseInvoices) {
                    (purchaseInvoices as any[]).forEach(pinv => {
                        if (pinv.date) {
                            const pinvDate = new Date(pinv.date);
                            if (pinvDate.getMonth() === d.getMonth() && pinvDate.getFullYear() === d.getFullYear()) {
                                monthExpenses += (pinv.total || 0);
                            }
                        }
                    });
                }

                months.push({
                    month: monthKey,
                    income: monthIncome,
                    expenses: monthExpenses,
                    net: monthIncome - monthExpenses
                });
            }

            setData(months);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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
