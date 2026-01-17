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

interface DashboardStats {
  quarterInvoices: number;
  quarterInvoicesAmount: number;
  quarterQuotes: number;
  quarterQuotesAmount: number;
  quarterProjects: number;
  yearInvoices: number;
  yearInvoicesAmount: number;
  yearQuotes: number;
  yearQuotesAmount: number;
  yearProjects: number;
  pendingInvoices: number;
  pendingAmount: number;
  totalClients: number;
  activeProjects: number;
}

interface DashboardViewProps {
  userId: string | undefined;
}

const DashboardView = ({ userId }: DashboardViewProps) => {
  const [stats, setStats] = useState<DashboardStats>({
    quarterInvoices: 0,
    quarterInvoicesAmount: 0,
    quarterQuotes: 0,
    quarterQuotesAmount: 0,
    quarterProjects: 0,
    yearInvoices: 0,
    yearInvoicesAmount: 0,
    yearQuotes: 0,
    yearQuotesAmount: 0,
    yearProjects: 0,
    pendingInvoices: 0,
    pendingAmount: 0,
    totalClients: 0,
    activeProjects: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'quarter' | 'year'>('quarter');

  useEffect(() => {
    fetchDashboardStats();
  }, [userId, selectedPeriod]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

      const quarterStart = new Date(currentYear, (currentQuarter - 1) * 3, 1);
      const quarterEnd = new Date(currentYear, currentQuarter * 3, 0, 23, 59, 59);
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

      const { data: allInvoicesData } = await supabase.rpc("finance_list_invoices", { p_search: null, p_status: null });
      const { data: allQuotesData } = await supabase.rpc("list_quotes", { p_status: null, p_search: null });
      const { data: allProjectsData } = await supabase.rpc('list_projects', { p_search: null });
      const { data: clientsData } = await supabase.rpc('list_clients', {});

      const allInvoices = allInvoicesData || [];
      const allQuotes = allQuotesData || [];
      const allProjects = allProjectsData || [];
      const clients = clientsData || [];

      // Calculate stats (same logic as before)
      const quarterInvoices = allInvoices.filter(inv => inv.issue_date && new Date(inv.issue_date) >= quarterStart && new Date(inv.issue_date) <= quarterEnd);
      const yearInvoices = allInvoices.filter(inv => inv.issue_date && new Date(inv.issue_date) >= yearStart && new Date(inv.issue_date) <= yearEnd);

      const quarterQuotes = allQuotes.filter(q => q.created_at && new Date(q.created_at) >= quarterStart && new Date(q.created_at) <= quarterEnd);
      const yearQuotes = allQuotes.filter(q => q.created_at && new Date(q.created_at) >= yearStart && new Date(q.created_at) <= yearEnd);

      const quarterProjects = allProjects.filter(p => p.created_at && new Date(p.created_at) >= quarterStart && new Date(p.created_at) <= quarterEnd);
      const yearProjects = allProjects.filter(p => p.created_at && new Date(p.created_at) >= yearStart && new Date(p.created_at) <= yearEnd);

      const pendingInvoices = allInvoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT');
      const activeProjects = allProjects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'PLANNED');

      setStats({
        quarterInvoices: quarterInvoices.length,
        quarterInvoicesAmount: quarterInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        quarterQuotes: quarterQuotes.length,
        quarterQuotesAmount: quarterQuotes.reduce((sum, q) => sum + (q.total || 0), 0),
        quarterProjects: quarterProjects.length,
        yearInvoices: yearInvoices.length,
        yearInvoicesAmount: yearInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        yearQuotes: yearQuotes.length,
        yearQuotesAmount: yearQuotes.reduce((sum, q) => sum + (q.total || 0), 0),
        yearProjects: yearProjects.length,
        pendingInvoices: pendingInvoices.length,
        pendingAmount: pendingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        totalClients: clients.length,
        activeProjects: activeProjects.length,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const currentPeriod = selectedPeriod === 'quarter' ? {
    invoices: stats.quarterInvoices,
    invoicesAmount: stats.quarterInvoicesAmount,
    quotes: stats.quarterQuotes,
    quotesAmount: stats.quarterQuotesAmount,
    projects: stats.quarterProjects,
    label: 'Trimestre Actual',
  } : {
    invoices: stats.yearInvoices,
    invoicesAmount: stats.yearInvoicesAmount,
    quotes: stats.yearQuotes,
    quotesAmount: stats.yearQuotesAmount,
    projects: stats.yearProjects,
    label: 'Año Actual',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
      </div>
    );
  }

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
                <p className="text-sm font-medium text-muted-foreground">Facturado ({currentPeriod.label})</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(currentPeriod.invoicesAmount)}</p>
                  <span className="text-xs font-medium text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                    {currentPeriod.invoices} ops
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
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(currentPeriod.quotesAmount)}</p>
                  <span className="text-xs font-medium text-cyan-600 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">
                    {currentPeriod.quotes} ops
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
                  <p className="text-2xl font-bold text-foreground">{stats.activeProjects}</p>
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
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.pendingAmount)}</p>
                  <span className="text-xs font-medium text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                    {stats.pendingInvoices} ops
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
            <TaxSummaryWidget />
          </motion.div>

          <motion.div
            className="h-[250px]"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <ProfitMarginWidget />
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
        <RevenueChart />
      </motion.div>

      {/* Row 4: Cash Flow Chart (Extra insight) */}
      <motion.div
        className="h-[350px]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <CashFlowChart />
      </motion.div>

    </div>
  );
};

export default DashboardView;
