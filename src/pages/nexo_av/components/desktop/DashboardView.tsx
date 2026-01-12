import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Receipt, 
  Euro,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  FolderKanban,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardStats {
  // Trimestre actual
  quarterInvoices: number;
  quarterInvoicesAmount: number;
  quarterQuotes: number;
  quarterQuotesAmount: number;
  quarterProjects: number;
  
  // Año actual
  yearInvoices: number;
  yearInvoicesAmount: number;
  yearQuotes: number;
  yearQuotesAmount: number;
  yearProjects: number;
  
  // Pendientes
  pendingInvoices: number;
  pendingAmount: number;
  
  // Totales
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
      
      // Calcular fechas del trimestre
      const quarterStart = new Date(currentYear, (currentQuarter - 1) * 3, 1);
      const quarterEnd = new Date(currentYear, currentQuarter * 3, 0, 23, 59, 59);
      
      // Calcular fechas del año
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

      // Obtener facturas usando RPC
      const { data: allInvoicesData, error: invoicesError } = await supabase.rpc("finance_list_invoices", {
        p_search: null,
        p_status: null,
      });

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
      }

      // Obtener presupuestos usando RPC
      const { data: allQuotesData, error: quotesError } = await supabase.rpc("list_quotes", {
        p_status: null,
        p_search: null,
      });

      if (quotesError) {
        console.error('Error fetching quotes:', quotesError);
      }

      // Obtener proyectos usando RPC
      const { data: allProjectsData, error: projectsError } = await supabase.rpc('list_projects', {
        p_search: null
      });

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
      }

      // Obtener clientes - usar RPC en vez de acceso directo a tabla
      const { data: clientsData, error: clientsError } = await supabase.rpc('list_clients', {});

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
      }

      // Procesar datos
      const allInvoices = allInvoicesData || [];
      const allQuotes = allQuotesData || [];
      const allProjects = allProjectsData || [];
      const clients = clientsData || [];

      // Filtrar facturas del trimestre
      const quarterInvoices = allInvoices.filter(inv => {
        if (!inv.issue_date) return false;
        const issueDate = new Date(inv.issue_date);
        return issueDate >= quarterStart && issueDate <= quarterEnd;
      });

      // Filtrar facturas del año
      const yearInvoices = allInvoices.filter(inv => {
        if (!inv.issue_date) return false;
        const issueDate = new Date(inv.issue_date);
        return issueDate >= yearStart && issueDate <= yearEnd;
      });

      // Filtrar presupuestos del trimestre
      const quarterQuotes = allQuotes.filter(q => {
        const created = new Date(q.created_at);
        return created >= quarterStart && created <= quarterEnd;
      });

      // Filtrar presupuestos del año
      const yearQuotes = allQuotes.filter(q => {
        const created = new Date(q.created_at);
        return created >= yearStart && created <= yearEnd;
      });

      // Filtrar proyectos del trimestre y año
      const quarterProjects = allProjects.filter(p => {
        const created = new Date(p.created_at);
        return created >= quarterStart && created <= quarterEnd;
      });

      const yearProjects = allProjects.filter(p => {
        const created = new Date(p.created_at);
        return created >= yearStart && created <= yearEnd;
      });

      // Calcular pendientes (facturas con pending_amount > 0)
      const pendingInvoices = allInvoices.filter(inv => {
        const pending = inv.pending_amount || 0;
        return pending > 0 && inv.status !== 'cancelled';
      });

      // Proyectos activos
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
        pendingAmount: pendingInvoices.reduce((sum, inv) => sum + (inv.pending_amount || 0), 0),
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con selector de período */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Resumen Financiero</h1>
          <p className="text-white/60">Vista general de tu negocio</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedPeriod('quarter')}
            className={selectedPeriod === 'quarter' 
              ? "px-4 py-2 bg-white text-black rounded-lg font-medium"
              : "px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20"
            }
          >
            Trimestre
          </button>
          <button
            onClick={() => setSelectedPeriod('year')}
            className={selectedPeriod === 'year'
              ? "px-4 py-2 bg-white text-black rounded-lg font-medium"
              : "px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20"
            }
          >
            Año
          </button>
        </div>
      </div>

      {/* Período seleccionado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-5 w-5 text-indigo-400" />
          <span className="text-white/80 font-medium">{currentPeriod.label}</span>
        </div>
      </motion.div>

      {/* Cards principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-sm mb-1">Facturas</p>
                  <p className="text-white text-2xl font-bold">{currentPeriod.invoices}</p>
                  <p className="text-emerald-400 text-sm mt-1">{formatCurrency(currentPeriod.invoicesAmount)}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <Receipt className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-sm mb-1">Presupuestos</p>
                  <p className="text-white text-2xl font-bold">{currentPeriod.quotes}</p>
                  <p className="text-blue-400 text-sm mt-1">{formatCurrency(currentPeriod.quotesAmount)}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <FileText className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-sm mb-1">Proyectos</p>
                  <p className="text-white text-2xl font-bold">{currentPeriod.projects}</p>
                  <p className="text-purple-400 text-sm mt-1">En {selectedPeriod === 'quarter' ? 'trimestre' : 'año'}</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <FolderKanban className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-sm mb-1">Pendiente Cobro</p>
                  <p className="text-white text-2xl font-bold">{stats.pendingInvoices}</p>
                  <p className="text-red-400 text-sm mt-1">{formatCurrency(stats.pendingAmount)}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-500/10">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-sm mb-1">Total Clientes</p>
                  <p className="text-white text-2xl font-bold">{stats.totalClients}</p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-500/10">
                  <Users className="h-6 w-6 text-indigo-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-sm mb-1">Proyectos Activos</p>
                  <p className="text-white text-2xl font-bold">{stats.activeProjects}</p>
                </div>
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-sm mb-1">Total Facturado (Año)</p>
                  <p className="text-white text-2xl font-bold">{formatCurrency(stats.yearInvoicesAmount)}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-400" />
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
