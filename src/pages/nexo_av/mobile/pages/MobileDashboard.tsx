import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  FolderKanban, 
  Users, 
  FileText, 
  TrendingUp,
  Clock,
  CheckCircle,
  Euro,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStats {
  activeProjects: number;
  pendingQuotes: number;
  totalClients: number;
  monthlyRevenue: number;
}

const MobileDashboard = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    pendingQuotes: 0,
    totalClients: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch user info
        const { data: userInfo } = await supabase.rpc('get_current_user_info');
        if (userInfo && userInfo.length > 0) {
          setUserName(userInfo[0].full_name?.split(' ')[0] || 'Usuario');
        }

        // Fetch projects count
        const { data: projectsData } = await supabase.rpc('list_projects', {
          p_search: null
        });
        const activeProjects = (projectsData || []).filter(
          (p: any) => p.status === 'IN_PROGRESS' || p.status === 'PLANNED'
        ).length;

        // Fetch pending quotes
        const { data: quotesData } = await supabase.rpc('list_quotes', {
          p_search: null,
          p_status: null
        });
        const pendingQuotes = (quotesData || []).filter(
          (q: any) => q.status === 'PENDING' || q.status === 'SENT'
        ).length;

        // Fetch clients count
        const { data: clientsData } = await supabase.rpc('list_clients', {
          p_search: null,
          p_status: null
        });
        const totalClients = (clientsData || []).length;

        // Fetch monthly revenue (simplified)
        const { data: invoicesData } = await supabase.rpc('finance_list_invoices', {
          p_search: null,
          p_status: null
        });
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyRevenue = (invoicesData || [])
          .filter((inv: any) => {
            const invDate = new Date(inv.created_at);
            return invDate >= firstDayOfMonth && inv.status !== 'CANCELLED';
          })
          .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

        setStats({
          activeProjects,
          pendingQuotes,
          totalClients,
          monthlyRevenue,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const quickActions = [
    {
      id: 'projects',
      label: 'Proyectos',
      icon: FolderKanban,
      path: `/nexo-av/${userId}/projects`,
      stat: stats.activeProjects,
      statLabel: 'activos',
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      id: 'quotes',
      label: 'Presupuestos',
      icon: FileText,
      path: `/nexo-av/${userId}/quotes`,
      stat: stats.pendingQuotes,
      statLabel: 'pendientes',
      color: 'bg-amber-500/10 text-amber-500',
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: Users,
      path: `/nexo-av/${userId}/clients`,
      stat: stats.totalClients,
      statLabel: 'total',
      color: 'bg-green-500/10 text-green-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-12 w-12 bg-primary/20 rounded-xl" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          Hola, {userName} 👋
        </h1>
        <p className="text-muted-foreground text-sm">
          Aquí tienes un resumen de tu actividad
        </p>
      </div>

      {/* Revenue Card */}
      <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Facturación del mes</p>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(stats.monthlyRevenue)}
            </p>
          </div>
          <div className="p-3 bg-primary/20 rounded-xl">
            <Euro className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <span className="text-green-500 font-medium">+12%</span>
          <span className="text-muted-foreground">vs mes anterior</span>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-muted-foreground text-xs">En progreso</span>
          </div>
          <span className="text-2xl font-bold text-foreground">
            {stats.activeProjects}
          </span>
          <span className="text-muted-foreground text-xs ml-1">proyectos</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <span className="text-muted-foreground text-xs">Completados</span>
          </div>
          <span className="text-2xl font-bold text-foreground">
            {stats.pendingQuotes}
          </span>
          <span className="text-muted-foreground text-xs ml-1">este mes</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Acceso rápido
        </h2>
        <div className="space-y-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => navigate(action.path)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl",
                  "bg-card border border-border",
                  "active:scale-[0.98] transition-all duration-200",
                  "hover:border-primary/30"
                )}
                style={{ touchAction: 'manipulation' }}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl", action.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.stat} {action.statLabel}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MobileDashboard;
