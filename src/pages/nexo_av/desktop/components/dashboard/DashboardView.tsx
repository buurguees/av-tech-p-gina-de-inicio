import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Receipt,
  AlertCircle,
  FolderKanban,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DetailNavigationBar from "../navigation/DetailNavigationBar";

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

  // Period filter component for the navigation bar tools
  const PeriodFilter = () => (
    <div className="flex gap-1.5 bg-secondary/50 rounded-lg p-1 border border-border/50">
      <button
        onClick={() => setSelectedPeriod('quarter')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
          selectedPeriod === 'quarter' 
            ? "bg-background text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Trimestre
      </button>
      <button
        onClick={() => setSelectedPeriod('year')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
          selectedPeriod === 'year' 
            ? "bg-background text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Año
      </button>
    </div>
  );

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
    <div className="w-full h-full flex flex-col">
      {/* Navigation Bar */}
      <DetailNavigationBar
        pageTitle="Dashboard"
        contextInfo="Visión global de tu negocio"
        tools={<PeriodFilter />}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Row 1: KPI Cards - ProjectsPage Style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          {/* Facturas */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-emerald-500/10 rounded text-emerald-600 dark:text-emerald-400">
                  <Receipt className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Facturado ({selectedPeriod === 'quarter' ? 'Trimestre' : 'Año'})</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">{formatCurrency(kpis.invoicesAmount)}</span>
                <span className="text-[10px] text-muted-foreground ml-1 block">
                  {kpis.invoicesCount} ops
                </span>
              </div>
            </div>
          </motion.div>

          {/* Presupuestos */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-cyan-500/10 rounded text-cyan-600 dark:text-cyan-400">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Presupuestado</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">{formatCurrency(kpis.quotesAmount)}</span>
                <span className="text-[10px] text-muted-foreground ml-1 block">
                  {kpis.quotesCount} ops
                </span>
              </div>
            </div>
          </motion.div>

          {/* Proyectos */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-violet-500/10 rounded text-violet-600 dark:text-violet-400">
                  <FolderKanban className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Proyectos Activos</span>
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">{kpis.activeProjects}</span>
                <span className="text-[10px] text-muted-foreground ml-1 block">
                  En curso
                </span>
              </div>
            </div>
          </motion.div>

          {/* Pendiente Cobro */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-destructive/10 rounded text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Pendiente cobrar</span>
              </div>
              <div>
                <span className="text-base font-bold text-destructive">{formatCurrency(kpis.pendingAmount)}</span>
                <span className="text-[10px] text-muted-foreground ml-1 block">
                  {kpis.pendingCount} ops
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Row 2: Unified Lists & Financial Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main List Widget (2/3) */}
          <motion.div
            className="lg:col-span-2 min-h-[500px]"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <DashboardListsWidget userId={userId} />
          </motion.div>

          {/* Financial Side Column (1/3) - Chart Blocks Square */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
            >
              <TaxSummaryWidget period={selectedPeriod} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <ProfitMarginWidget period={selectedPeriod} />
            </motion.div>
          </div>
        </div>

        {/* Row 3: Full Width Revenue Chart */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <RevenueChart />
        </motion.div>

        {/* Row 4: Cash Flow Chart */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <CashFlowChart />
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardView;
