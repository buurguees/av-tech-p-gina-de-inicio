/**
 * ProjectDashboardTabMobile
 * 
 * Versión optimizada para móviles del dashboard de proyecto.
 * Muestra solo los KPIs y información esencial para gestión rápida desde mobile.
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Receipt, Wallet, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ProjectDetail {
  id: string;
  project_number: string;
  client_id: string | null;
  client_name: string | null;
  status: string;
  project_address: string | null;
  project_city: string | null;
  client_order_number: string | null;
  local_name: string | null;
  project_name: string;
  quote_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectDashboardTabMobileProps {
  project: ProjectDetail;
}

interface FinancialStats {
  total_budget: number;
  total_invoiced: number;
  total_expenses: number;
  margin: number;
  margin_percentage: number;
}

const ProjectDashboardTabMobile = ({ project }: ProjectDashboardTabMobileProps) => {
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [loadingFinancial, setLoadingFinancial] = useState(true);
  const [stats, setStats] = useState({
    quotesCount: 0,
    invoicesCount: 0,
    expensesCount: 0,
  });

  useEffect(() => {
    const fetchFinancialStats = async () => {
      try {
        setLoadingFinancial(true);
        const { data, error } = await supabase.rpc('get_project_financial_stats', {
          p_project_id: project.id
        }) as { data: FinancialStats[] | null; error: any };

        if (error) throw error;
        if (data && Array.isArray(data) && data.length > 0) {
          setFinancialStats(data[0]);
        }

        // Obtener el importe pendiente de cobro
        const { data: invoicesData } = await supabase.rpc('finance_list_invoices', {
          p_search: null,
          p_status: null
        });

        if (invoicesData) {
          const projectInvoices = (invoicesData || []).filter((inv: any) => 
            inv.project_id === project.id && 
            inv.status !== 'CANCELLED'
          );
          
          const totalPending = projectInvoices.reduce((sum: number, inv: any) => {
            if (inv.status === 'DRAFT') {
              return sum + (inv.subtotal || 0);
            } else {
              return sum + (inv.pending_amount || 0);
            }
          }, 0);
          
          setPendingAmount(totalPending);
        }

        // Obtener contadores básicos
        const { data: quotesData } = await supabase.rpc('list_quotes', { p_search: null });
        const projectQuotes = (quotesData || []).filter((q: any) => q.project_id === project.id);

        const { data: invoicesData2 } = await supabase.rpc('finance_list_invoices', { 
          p_search: null, 
          p_status: null 
        });
        const projectInvoices = (invoicesData2 || []).filter((inv: any) => 
          inv.project_id === project.id && inv.status !== 'CANCELLED'
        );

        const { data: expensesData } = await supabase.rpc('list_purchase_invoices', {
          p_search: null,
          p_status: null,
          p_document_type: null
        });
        const projectExpenses = (expensesData || []).filter((exp: any) => 
          exp.project_id === project.id && exp.status !== 'CANCELLED'
        );

        setStats({
          quotesCount: projectQuotes.length,
          invoicesCount: projectInvoices.length,
          expensesCount: projectExpenses.length,
        });
      } catch (error) {
        console.error('Error fetching financial stats:', error);
      } finally {
        setLoadingFinancial(false);
      }
    };

    fetchFinancialStats();
  }, [project.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return value < 0 ? `-${Math.abs(value).toFixed(1)}%` : `${value.toFixed(1)}%`;
  };

  const getHealthStatus = () => {
    if (!financialStats) return { status: 'unknown', color: 'bg-gray-500/20', text: 'Sin datos', textColor: 'text-gray-400', icon: AlertCircle };
    
    if (financialStats.margin_percentage >= 25) {
      return { 
        status: 'rentable', 
        color: 'bg-emerald-500/20', 
        text: 'Rentable', 
        icon: CheckCircle2, 
        textColor: 'text-emerald-400', 
        borderColor: 'border-emerald-500/30' 
      };
    } else if (financialStats.margin_percentage >= 20) {
      return { 
        status: 'medio', 
        color: 'bg-amber-500/20', 
        text: 'Medio', 
        icon: AlertCircle, 
        textColor: 'text-amber-400', 
        borderColor: 'border-amber-500/30' 
      };
    } else {
      return { 
        status: 'no_rentable', 
        color: 'bg-red-500/20', 
        text: 'No rentable', 
        icon: AlertCircle, 
        textColor: 'text-red-400', 
        borderColor: 'border-red-500/30' 
      };
    }
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon || AlertCircle;

  const invoicingProgress = financialStats && financialStats.total_budget > 0
    ? Math.min((financialStats.total_invoiced / financialStats.total_budget) * 100, 100)
    : 0;

  return (
    <div className="space-y-3">
      {/* KPIs Principales - Grid 2 columnas en mobile */}
      {loadingFinancial ? (
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 bg-white/5" />
          ))}
        </div>
      ) : financialStats && (
        <div className="grid grid-cols-2 gap-2">
          {/* Presupuesto Total */}
          <Card className="border border-white/10 bg-white/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="p-1.5 rounded-lg bg-blue-500/20">
                  <FileText className="h-4 w-4 text-blue-400" />
                </div>
                {stats.quotesCount > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30 px-1.5 py-0">
                    {stats.quotesCount}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-white/60 mb-0.5">Presupuesto</p>
              <p className="text-base font-bold text-white truncate">
                {formatCurrency(financialStats.total_budget || 0)}
              </p>
            </CardContent>
          </Card>

          {/* Facturado */}
          <Card className="border border-white/10 bg-white/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/20">
                  <Receipt className="h-4 w-4 text-emerald-400" />
                </div>
                {stats.invoicesCount > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-1.5 py-0">
                    {stats.invoicesCount}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-white/60 mb-0.5">Facturado</p>
              <p className="text-base font-bold text-white truncate">
                {formatCurrency(financialStats.total_invoiced || 0)}
              </p>
            </CardContent>
          </Card>

          {/* Gastos */}
          <Card className="border border-white/10 bg-white/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="p-1.5 rounded-lg bg-red-500/20">
                  <Wallet className="h-4 w-4 text-red-400" />
                </div>
                {stats.expensesCount > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30 px-1.5 py-0">
                    {stats.expensesCount}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-white/60 mb-0.5">Gastos</p>
              <p className="text-base font-bold text-white truncate">
                {formatCurrency(financialStats.total_expenses || 0)}
              </p>
            </CardContent>
          </Card>

          {/* Margen Neto */}
          <Card className={`border border-white/10 ${financialStats && financialStats.margin >= 0 ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className={`p-1.5 rounded-lg ${financialStats && financialStats.margin >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  {financialStats && financialStats.margin >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  )}
                </div>
                {financialStats && (
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                    financialStats.margin_percentage >= 25 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                      : financialStats.margin_percentage >= 20 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>
                    {formatPercentage(financialStats.margin_percentage)}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-white/60 mb-0.5">Margen</p>
              <p className={`text-base font-bold truncate ${financialStats && financialStats.margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {financialStats ? formatCurrency(financialStats.margin) : formatCurrency(0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estado de Salud y Progreso - Compacto */}
      {loadingFinancial ? (
        <Skeleton className="h-24 w-full bg-white/5" />
      ) : financialStats && (
        <div className="space-y-2">
          {/* Estado del Proyecto */}
          <Card className="border border-white/10 bg-white/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HealthIcon className={`h-4 w-4 ${healthStatus.textColor || 'text-gray-400'}`} />
                  <span className="text-xs font-medium text-white">Estado del Proyecto</span>
                </div>
                <span className={`text-xs font-semibold ${healthStatus.textColor || 'text-gray-400'}`}>
                  {healthStatus.text}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">% Rentabilidad</span>
                  <span className={`font-semibold ${
                    financialStats.margin_percentage >= 25 
                      ? 'text-emerald-400' 
                      : financialStats.margin_percentage >= 20 
                      ? 'text-amber-400' 
                      : 'text-red-400'
                  }`}>
                    {formatPercentage(financialStats.margin_percentage)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Pendiente de Cobro</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(pendingAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progreso de Facturación */}
          <Card className="border border-white/10 bg-white/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium text-white">Progreso de Facturación</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Facturado</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(financialStats.total_invoiced)} / {formatCurrency(financialStats.total_budget)}
                  </span>
                </div>
                <Progress 
                  value={invoicingProgress} 
                  className="h-1.5"
                />
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Progreso</span>
                  <span className="font-semibold text-emerald-400">{invoicingProgress.toFixed(0)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notas - Solo si existen */}
      {project.notes && (
        <Card className="border border-white/10 bg-white/5">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-white mb-1.5">Notas</p>
            <p className="text-xs text-white/70 leading-relaxed">{project.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProjectDashboardTabMobile;
