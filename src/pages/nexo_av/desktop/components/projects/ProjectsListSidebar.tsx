import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
    TrendingUp,
    BarChart3,
    Briefcase,
    Target,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PortfolioSummary {
    total_active_projects: number;
    total_pipeline_value: number;
    avg_project_ticket: number;
    max_project_value: number;
    min_project_value: number;
    total_invoiced_ytd: number;
}

const ProjectsListSidebar = () => {
    const [summary, setSummary] = useState<PortfolioSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const { data, error } = await supabase.rpc('get_projects_portfolio_summary') as { data: PortfolioSummary[] | null; error: any };
                if (error) throw error;
                if (data && Array.isArray(data) && data.length > 0) {
                    setSummary(data[0]);
                }
            } catch (error) {
                console.error('Error fetching portfolio summary:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-[200px] w-full bg-white/5" />
                <Skeleton className="h-[300px] w-full bg-white/5" />
            </div>
        );
    }

    if (!summary) return null;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
        }).format(val);
    };

    return (
        <div className="space-y-6">
            <Card className="bg-white/5 border-white/10 shadow-xl overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-400" />
                        Objetivos YTD
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        <p className="text-2xl font-bold text-white">
                            {formatCurrency(summary.total_invoiced_ytd)}
                        </p>
                        <p className="text-xs text-white/40 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-green-400" />
                            Facturación acumulada anual
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 shadow-xl">
                <CardHeader className="pb-2 border-b border-white/5 bg-white/2">
                    <CardTitle className="text-white text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-purple-400" />
                        Métricas de Cartera
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-white/40 text-[10px] uppercase tracking-wider">Ticket Medio</p>
                            <p className="text-lg font-semibold text-white">{formatCurrency(summary.avg_project_ticket)}</p>
                        </div>
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Briefcase className="h-4 w-4 text-purple-400" />
                        </div>
                    </div>

                    <div className="pt-2 space-y-3">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-white/40 text-[10px] uppercase tracking-wider">Proyecto Máximo</p>
                                <ArrowUpRight className="h-3 w-3 text-white/20" />
                            </div>
                            <p className="text-sm font-medium text-white">{formatCurrency(summary.max_project_value)}</p>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-white/40 text-[10px] uppercase tracking-wider">Proyecto Mínimo</p>
                                <ArrowDownRight className="h-3 w-3 text-white/20" />
                            </div>
                            <p className="text-sm font-medium text-white">{formatCurrency(summary.min_project_value)}</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Valor en Pipeline</p>
                        <p className="text-xl font-bold text-green-400">{formatCurrency(summary.total_pipeline_value)}</p>
                        <p className="text-[10px] text-white/30 mt-1">Suma de presupuestos aceptados</p>
                    </div>
                </CardContent>
            </Card>

            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/5">
                <p className="text-xs text-white/60 leading-relaxed italic">
                    "La rentabilidad media de los proyectos este mes ha subido un 4.2% respecto al anterior."
                </p>
            </div>
        </div>
    );
};

export default ProjectsListSidebar;
