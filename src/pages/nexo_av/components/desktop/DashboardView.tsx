import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  FileText, 
  Receipt, 
  AlertCircle,
  Clock,
  FolderKanban,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

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
  isAdmin: boolean | undefined;
  isManager: boolean | undefined;
}

const DashboardView = ({ userId, isAdmin, isManager }: DashboardViewProps) => {
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

      const { data: allInvoicesData, error: invoicesError } = await supabase.rpc("finance_list_invoices", {
        p_search: null,
        p_status: null,
      });

      if (invoicesError) console.error('Error fetching invoices:', invoicesError);

      const { data: allQuotesData, error: quotesError } = await supabase.rpc("list_quotes", {
        p_status: null,
        p_search: null,
      });

      if (quotesError) console.error('Error fetching quotes:', quotesError);

      const { data: allProjectsData, error: projectsError } = await supabase.rpc('list_projects', {
        p_search: null
      });

      if (projectsError) console.error('Error fetching projects:', projectsError);

      const { data: clientsData, error: clientsError } = await supabase.rpc('list_clients', {});

      if (clientsError) console.error('Error fetching clients:', clientsError);

      const allInvoices = allInvoicesData || [];
      const allQuotes = allQuotesData || [];
      const allProjects = allProjectsData || [];
      const clients = clientsData || [];

      const quarterInvoices = allInvoices.filter(inv => {
        if (!inv.issue_date) return false;
        const issueDate = new Date(inv.issue_date);
        return issueDate >= quarterStart && issueDate <= quarterEnd;
      });

      const yearInvoices = allInvoices.filter(inv => {
        if (!inv.issue_date) return false;
        const issueDate = new Date(inv.issue_date);
        return issueDate >= yearStart && issueDate <= yearEnd;
      });

      const quarterQuotes = allQuotes.filter(q => {
        const created = new Date(q.created_at);
        return created >= quarterStart && created <= quarterEnd;
      });

      const yearQuotes = allQuotes.filter(q => {
        const created = new Date(q.created_at);
        return created >= yearStart && created <= yearEnd;
      });

      const quarterProjects = allProjects.filter(p => {
        const created = new Date(p.created_at);
        return created >= quarterStart && created <= quarterEnd;
      });

      const yearProjects = allProjects.filter(p => {
        const created = new Date(p.created_at);
        return created >= yearStart && created <= yearEnd;
      });

      const pendingInvoices = allInvoices.filter(inv => {
        return inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT';
      });

      const activeProjects = allProjects.filter(p => 
        p.status === 'IN_PROGRESS' || p.status === 'PLANNED'
      );

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Resumen</h1>
          <p className="text-sm text-muted-foreground">Vista general de tu negocio</p>
        </div>
        <div className="flex gap-1.5 bg-secondary rounded-lg p-1">
          <button
            onClick={() => setSelectedPeriod('quarter')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedPeriod === 'quarter' 
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Trimestre
          </button>
          <button
            onClick={() => setSelectedPeriod('year')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedPeriod === 'year'
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Año
          </button>
        </div>
      </div>

      {/* Main stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Facturas */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="border border-border hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Facturas</p>
                  <p className="text-lg font-bold text-foreground">{currentPeriod.invoices}</p>
                  <p className="text-xs font-medium" style={{ color: 'hsl(152, 69%, 31%)' }}>
                    {formatCurrency(currentPeriod.invoicesAmount)}
                  </p>
                </div>
                <div className="p-2 rounded-md" style={{ backgroundColor: 'hsl(149, 80%, 95%)' }}>
                  <Receipt size={16} style={{ color: 'hsl(152, 69%, 31%)' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Presupuestos */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border border-border hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Presupuestos</p>
                  <p className="text-lg font-bold text-foreground">{currentPeriod.quotes}</p>
                  <p className="text-xs font-medium" style={{ color: 'hsl(187, 70%, 36%)' }}>
                    {formatCurrency(currentPeriod.quotesAmount)}
                  </p>
                </div>
                <div className="p-2 rounded-md" style={{ backgroundColor: 'hsl(187, 70%, 96%)' }}>
                  <FileText size={16} style={{ color: 'hsl(187, 70%, 36%)' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Proyectos */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border border-border hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Proyectos</p>
                  <p className="text-lg font-bold text-foreground">{currentPeriod.projects}</p>
                  <p className="text-xs text-muted-foreground">
                    En {selectedPeriod === 'quarter' ? 'trimestre' : 'año'}
                  </p>
                </div>
                <div className="p-2 rounded-md" style={{ backgroundColor: 'hsl(270, 80%, 97%)' }}>
                  <FolderKanban size={16} style={{ color: 'hsl(270, 60%, 50%)' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pendiente Cobro */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border border-border hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Pendiente</p>
                  <p className="text-lg font-bold text-foreground">{stats.pendingInvoices}</p>
                  <p className="text-xs font-medium" style={{ color: 'hsl(0, 72%, 51%)' }}>
                    {formatCurrency(stats.pendingAmount)}
                  </p>
                </div>
                <div className="p-2 rounded-md" style={{ backgroundColor: 'hsl(0, 86%, 97%)' }}>
                  <AlertCircle size={16} style={{ color: 'hsl(0, 72%, 51%)' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border border-border hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Clientes</p>
                  <p className="text-lg font-bold text-foreground">{stats.totalClients}</p>
                </div>
                <div className="p-2 rounded-md bg-secondary">
                  <Users size={16} className="text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border border-border hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Proyectos Activos</p>
                  <p className="text-lg font-bold text-foreground">{stats.activeProjects}</p>
                </div>
                <div className="p-2 rounded-md" style={{ backgroundColor: 'hsl(48, 100%, 96%)' }}>
                  <Clock size={16} style={{ color: 'hsl(32, 95%, 44%)' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border border-border hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Facturado (Año)</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(stats.yearInvoicesAmount)}</p>
                </div>
                <div className="p-2 rounded-md" style={{ backgroundColor: 'hsl(149, 80%, 95%)' }}>
                  <TrendingUp size={16} style={{ color: 'hsl(152, 69%, 31%)' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardView;
