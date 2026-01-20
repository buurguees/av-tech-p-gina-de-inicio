import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, FileText, Calendar, Hash, User, FileText as FileTextIcon, Receipt, Users, Wallet, Clock, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, DollarSign } from "lucide-react";
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

interface ProjectDashboardTabProps {
  project: ProjectDetail;
}

interface ProjectStats {
  quotesCount: number;
  invoicesCount: number;
  expensesCount: number;
  techniciansCount: number;
  daysSinceCreation: number;
  quotesTotal: number;
  invoicesTotal: number;
  expensesTotal: number;
}

interface FinancialStats {
  total_budget: number;
  total_invoiced: number;
  total_expenses: number;
  margin: number;
  margin_percentage: number;
  pending_amount?: number; // Importe pendiente de cobro
}

const ProjectDashboardTab = ({ project }: ProjectDashboardTabProps) => {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingFinancial, setLoadingFinancial] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);

        // Fetch Quotes - using subtotals only (no taxes)
        const { data: quotesData } = await supabase.rpc('list_quotes', { p_search: null });
        const projectQuotes = (quotesData || []).filter((q: any) => q.project_id === project.id);
        const quotesTotal = projectQuotes.reduce((sum: number, q: any) => sum + (q.subtotal || 0), 0);

        // Fetch Invoices - using subtotals only (no taxes)
        // Incluir todas las facturas excepto CANCELLED (incluir DRAFT/Borrador como solicitó el usuario)
        const { data: invoicesData } = await supabase.rpc('finance_list_invoices', { 
          p_search: null, 
          p_status: null 
        });
        const projectInvoices = (invoicesData || []).filter((inv: any) => 
          inv.project_id === project.id && inv.status !== 'CANCELLED'
        );
        const invoicesTotal = projectInvoices.reduce((sum: number, inv: any) => sum + (inv.subtotal || 0), 0);

        // Fetch Expenses (Purchase Invoices) - using tax_base (subtotal) only (no taxes)
        // Incluir todas las facturas de compra excepto las canceladas (igual que en la función RPC)
        const { data: expensesData } = await supabase.rpc('list_purchase_invoices', {
          p_search: null,
          p_status: null,
          p_document_type: null
        });
        const projectExpenses = (expensesData || []).filter((exp: any) => 
          exp.project_id === project.id && exp.status !== 'CANCELLED'
        );
        const expensesTotal = projectExpenses.reduce((sum: number, exp: any) => sum + (exp.tax_base || 0), 0);

        // Fetch Technicians
        const { data: techniciansData } = await supabase.rpc('list_project_technicians', {
          p_project_id: project.id
        } as any);
        const techniciansCount = techniciansData?.length || 0;

        // Calculate days since creation
        const createdDate = new Date(project.created_at);
        const today = new Date();
        const daysSinceCreation = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        setStats({
          quotesCount: projectQuotes.length,
          invoicesCount: projectInvoices.length,
          expensesCount: projectExpenses.length,
          techniciansCount,
          daysSinceCreation,
          quotesTotal,
          invoicesTotal,
          expensesTotal
        });
      } catch (error) {
        console.error('Error fetching project stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

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

        // Obtener el importe pendiente de cobro de las facturas del proyecto
        // Incluye facturas DRAFT (borrador) ya que son facturas pendientes de confirmar pero que se van a emitir
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
            // Para facturas DRAFT, usar el subtotal completo ya que aún no se ha cobrado nada
            // Para otras facturas, usar el pending_amount
            if (inv.status === 'DRAFT') {
              return sum + (inv.subtotal || 0);
            } else {
              return sum + (inv.pending_amount || 0);
            }
          }, 0);
          
          setPendingAmount(totalPending);
        }
      } catch (error) {
        console.error('Error fetching financial stats:', error);
      } finally {
        setLoadingFinancial(false);
      }
    };

    fetchStats();
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
    // Asegurar que los valores negativos muestren el signo "-"
    return value < 0 ? `-${Math.abs(value).toFixed(1)}%` : `${value.toFixed(1)}%`;
  };

  const getHealthStatus = () => {
    if (!financialStats) return { status: 'unknown', color: 'bg-gray-500/20', text: 'Sin datos', textColor: 'text-gray-400' };
    
    if (financialStats.margin_percentage >= 25) {
      return { status: 'rentable', color: 'bg-emerald-500/20', text: 'Rentable', icon: CheckCircle2, textColor: 'text-emerald-600', borderColor: 'border-emerald-500/30' };
    } else if (financialStats.margin_percentage >= 20) {
      return { status: 'medio', color: 'bg-amber-500/20', text: 'Medio', icon: AlertCircle, textColor: 'text-amber-600', borderColor: 'border-amber-500/30' };
    } else {
      return { status: 'no_rentable', color: 'bg-red-500/20', text: 'No rentable', icon: AlertCircle, textColor: 'text-red-600', borderColor: 'border-red-500/30' };
    }
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon || AlertCircle;

  const invoicingProgress = financialStats && financialStats.total_budget > 0
    ? Math.min((financialStats.total_invoiced / financialStats.total_budget) * 100, 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Sección 1: KPIs Principales - Destacados */}
      {loadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 bg-white/5" />
          ))}
        </div>
      ) : stats && financialStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Presupuesto Total */}
          <Card className="border border-border/60 hover:shadow-md transition-shadow bg-gradient-to-br from-blue-500/5 to-blue-500/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-600">
                  <FileTextIcon className="h-5 w-5" />
                </div>
                {stats.quotesCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                    {stats.quotesCount} {stats.quotesCount === 1 ? 'presupuesto' : 'presupuestos'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1">Presupuesto Total</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(financialStats.total_budget || stats.quotesTotal || 0)}
              </p>
            </CardContent>
          </Card>

          {/* Facturado */}
          <Card className="border border-border/60 hover:shadow-md transition-shadow bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600">
                  <Receipt className="h-5 w-5" />
                </div>
                {stats.invoicesCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    {stats.invoicesCount} {stats.invoicesCount === 1 ? 'factura' : 'facturas'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1">Total Facturado</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(financialStats.total_invoiced || stats.invoicesTotal || 0)}
              </p>
            </CardContent>
          </Card>

          {/* Gastos */}
          <Card className="border border-border/60 hover:shadow-md transition-shadow bg-gradient-to-br from-red-500/5 to-red-500/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-red-500/20 text-red-600">
                  <Wallet className="h-5 w-5" />
                </div>
                {stats.expensesCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                    {stats.expensesCount} {stats.expensesCount === 1 ? 'gasto' : 'gastos'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1">Total Gastos</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(financialStats.total_expenses || stats.expensesTotal || 0)}
              </p>
            </CardContent>
          </Card>

          {/* Margen Neto */}
          <Card className={`border border-border/60 hover:shadow-md transition-shadow bg-gradient-to-br ${financialStats && financialStats.margin >= 0 ? 'from-emerald-500/5 to-emerald-500/10' : 'from-red-500/5 to-red-500/10'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${financialStats && financialStats.margin >= 0 ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'}`}>
                  {financialStats && financialStats.margin >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                </div>
                {financialStats && (
                  <Badge variant="outline" className={`text-xs ${financialStats.margin_percentage >= 25 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : financialStats.margin_percentage >= 20 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                    {formatPercentage(financialStats.margin_percentage)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1">Margen Neto</p>
              <p className={`text-2xl font-bold ${financialStats && financialStats.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {financialStats ? formatCurrency(financialStats.margin) : formatCurrency(0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sección 2: Resumen Financiero Compacto */}
      {loadingFinancial ? (
        <Skeleton className="h-32 w-full bg-white/5" />
      ) : financialStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Estado de Salud del Proyecto */}
          <Card className="border border-border/60 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HealthIcon className={`h-4 w-4 ${healthStatus.textColor || 'text-gray-400'}`} />
                Estado del Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={`${healthStatus.color} rounded-lg p-3 border ${healthStatus.borderColor || 'border-gray-500/30'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${healthStatus.textColor || 'text-gray-400'}`}>{healthStatus.text}</span>
                  <span className="text-xs text-muted-foreground">{formatPercentage(financialStats.margin_percentage)} rentabilidad</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">% Rentabilidad</span>
                  <span className={`font-semibold ${financialStats.margin_percentage >= 25 ? 'text-emerald-600' : financialStats.margin_percentage >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                    {formatPercentage(financialStats.margin_percentage)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pendiente de Cobro</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(pendingAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progreso de Facturación */}
          <Card className="border border-border/60 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Progreso de Facturación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Facturado</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(financialStats.total_invoiced)} / {formatCurrency(financialStats.total_budget)}
                  </span>
                </div>
                <Progress 
                  value={invoicingProgress} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progreso</span>
                  <span className="font-semibold text-emerald-600">{invoicingProgress.toFixed(0)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen Rápido */}
          <Card className="border border-border/60 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Resumen Rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Días activo</span>
                <span className="font-semibold text-foreground">{stats?.daysSinceCreation || 0}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Técnicos</span>
                <span className="font-semibold text-foreground">{stats?.techniciansCount || 0}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Presupuestos</span>
                <span className="font-semibold text-foreground">{stats?.quotesCount || 0}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Facturas</span>
                <span className="font-semibold text-foreground">{stats?.invoicesCount || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sección 3: Información del Proyecto */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <Card className="border border-border/60 hover:shadow-md transition-shadow">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 bg-blue-500/10 rounded text-blue-600">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <span className="text-muted-foreground text-xs font-medium">Cliente</span>
            </div>
            <div>
              <p className="text-base font-bold text-foreground truncate">{project.client_name || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 hover:shadow-md transition-shadow">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 bg-purple-500/10 rounded text-purple-600">
                <MapPin className="h-3.5 w-3.5" />
              </div>
              <span className="text-muted-foreground text-xs font-medium">Ubicación</span>
            </div>
            <div>
              <p className="text-base font-bold text-foreground truncate">
                {project.local_name || project.project_city || '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 hover:shadow-md transition-shadow">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 bg-cyan-500/10 rounded text-cyan-600">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <span className="text-muted-foreground text-xs font-medium">Nº Pedido</span>
            </div>
            <div>
              <p className="text-base font-bold text-foreground truncate">{project.client_order_number || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 hover:shadow-md transition-shadow">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 bg-green-500/10 rounded text-green-600">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <span className="text-muted-foreground text-xs font-medium">Creado</span>
            </div>
            <div>
              <p className="text-base font-bold text-foreground">
                {new Date(project.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short'
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {project.created_by_name && (
          <Card className="border border-border/60 hover:shadow-md transition-shadow">
            <CardContent className="p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-orange-500/10 rounded text-orange-600">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Creado por</span>
              </div>
              <div>
                <p className="text-base font-bold text-foreground truncate">{project.created_by_name}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border border-border/60 hover:shadow-md transition-shadow">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 bg-violet-500/10 rounded text-violet-600">
                <Hash className="h-3.5 w-3.5" />
              </div>
              <span className="text-muted-foreground text-xs font-medium">Nº Proyecto</span>
            </div>
            <div>
              <p className="text-base font-bold text-foreground font-mono truncate">{project.project_number}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notas */}
      {project.notes && (
        <Card className="border border-border/60 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-semibold">Notas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">{project.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProjectDashboardTab;
