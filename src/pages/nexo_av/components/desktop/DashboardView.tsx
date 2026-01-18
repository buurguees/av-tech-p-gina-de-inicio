import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Receipt,
  AlertCircle,
  FolderKanban,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

// Import new widgets
import DashboardListsWidget from "./widgets/DashboardListsWidget";
import CashFlowChart from "./widgets/CashFlowChart";
import TaxSummaryWidget from "./widgets/TaxSummaryWidget";
import ProfitMarginWidget from "./widgets/ProfitMarginWidget";
import RevenueChart from "./widgets/RevenueChart";

interface DashboardViewProps {
  userId: string | undefined;
}

const DashboardView = ({ userId }: DashboardViewProps) => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'quarter' | 'year'>('quarter');

  useEffect(() => {
    fetchDashboardStats();
  }, [userId, selectedPeriod]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_dashboard_metrics", {
        p_period: selectedPeriod
      });

      if (error) throw error;
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
      </div>
    );
  }

  if (!dashboardData && !loading) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px] border border-dashed rounded-3xl">
        <AlertCircle className="w-12 h-12 text-muted-foreground/20 mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Error al cargar el Dashboard</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          No se pudieron obtener los datos. Asegúrate de que las funciones de la base de datos (RPC) hayan sido aplicadas correctamente.
        </p>
        <button
          onClick={() => fetchDashboardStats()}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {
    invoicesAmount: 0,
    invoicesCount: 0,
    quotesAmount: 0,
    quotesCount: 0,
    activeProjects: 0,
    pendingAmount: 0,
    pendingCount: 0,
    totalClients: 0
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visión global de tu negocio</p>
        </div>
        <div className="flex gap-1.5 bg-secondary/50 rounded-lg p-1 border border-border/50">
          <button
            onClick={() => setSelectedPeriod('quarter')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${selectedPeriod === 'quarter' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Trimestre
          </button>
          <button
            onClick={() => setSelectedPeriod('year')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${selectedPeriod === 'year' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Año
          </button>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Facturas */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border border-border/60 hover:shadow-md transition-shadow h-full">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-green-500/10 text-green-600">
                  <Receipt size={18} />
                </div>
                <Users size={16} className="text-muted-foreground/40" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Facturado ({selectedPeriod === 'quarter' ? 'Trimestre' : 'Año'})</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(kpis.invoicesAmount)}</p>
                  <span className="text-xs font-medium text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                    {kpis.invoicesCount} ops
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Presupuestos */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border border-border/60 hover:shadow-md transition-shadow h-full">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600">
                  <FileText size={18} />
                </div>
                <Users size={16} className="text-muted-foreground/40" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Presupuestado</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(kpis.quotesAmount)}</p>
                  <span className="text-xs font-medium text-cyan-600 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">
                    {kpis.quotesCount} ops
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Proyectos */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border border-border/60 hover:shadow-md transition-shadow h-full">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600">
                  <FolderKanban size={18} />
                </div>
                <Users size={16} className="text-muted-foreground/40" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Proyectos Activos</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground">{kpis.activeProjects}</p>
                  <p className="text-xs text-muted-foreground">En curso</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pendiente Cobro */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border border-border/60 hover:shadow-md transition-shadow h-full">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600">
                  <AlertCircle size={18} />
                </div>
                <Users size={16} className="text-muted-foreground/40" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Pendiente cobrar</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(kpis.pendingAmount)}</p>
                  <span className="text-xs font-medium text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                    {kpis.pendingCount} ops
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 2: Unified Lists & Financial Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List Widget (2/3) */}
        <motion.div
          className="lg:col-span-2 min-h-[500px]"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <DashboardListsWidget userId={userId} />
        </motion.div>

        {/* Financial Side Column (1/3) */}
        <div className="space-y-6">
          <motion.div
            className="h-[300px]"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
          >
            <TaxSummaryWidget data={dashboardData.taxes} />
          </motion.div>

          <motion.div
            className="h-[250px]"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <ProfitMarginWidget data={dashboardData.profitability} />
          </motion.div>
        </div>
      </div>

      {/* Row 3: Full Width Revenue Chart */}
      <motion.div
        className="h-[350px]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <RevenueChart data={dashboardData.revenueChart} />
      </motion.div>

      {/* Row 4: Cash Flow Chart (Extra insight) */}
      <motion.div
        className="h-[350px]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <CashFlowChart data={dashboardData.revenueChart} />
      </motion.div>

    </div>
  );
};

export default DashboardView;
