import { motion } from "framer-motion";
import { 
  TrendingUp, 
  FolderKanban, 
  FileText, 
  Receipt,
  Clock,
  CheckCircle,
  AlertCircle,
  Euro
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ClientDetail {
  id: string;
  company_name: string;
  contact_phone: string;
  contact_email: string;
  tax_id: string | null;
  legal_name: string | null;
  industry_sector: string | null;
  approximate_budget: number | null;
  lead_stage: string;
  notes: string | null;
  created_at: string;
}

interface ClientDashboardTabProps {
  client: ClientDetail;
}

const ClientDashboardTab = ({ client }: ClientDashboardTabProps) => {
  // TODO: Fetch real data from projects, quotes, and invoices tables
  const stats = {
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingProjects: 0,
    totalQuotes: 0,
    quotesAmount: 0,
    totalInvoices: 0,
    invoicesAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
  };

  const statCards = [
    {
      title: "Proyectos Totales",
      value: stats.totalProjects,
      icon: FolderKanban,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "En Progreso",
      value: stats.activeProjects,
      icon: Clock,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Completados",
      value: stats.completedProjects,
      icon: CheckCircle,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Presupuestos",
      value: stats.totalQuotes,
      icon: FileText,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Total Presupuestado",
      value: `${stats.quotesAmount.toLocaleString('es-ES')}€`,
      icon: Euro,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
    },
    {
      title: "Facturas",
      value: stats.totalInvoices,
      icon: Receipt,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Total Facturado",
      value: `${stats.invoicesAmount.toLocaleString('es-ES')}€`,
      icon: TrendingUp,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Pendiente Cobro",
      value: `${stats.pendingAmount.toLocaleString('es-ES')}€`,
      icon: AlertCircle,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-white/40 text-sm">{stat.title}</p>
                    <p className="text-white text-xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/40 text-sm">Sector</p>
                  <p className="text-white capitalize">{client.industry_sector?.toLowerCase() || '-'}</p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">NIF/CIF</p>
                  <p className="text-white">{client.tax_id || '-'}</p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">Presupuesto Medio</p>
                  <p className="text-white">
                    {client.approximate_budget 
                      ? `${client.approximate_budget.toLocaleString('es-ES')}€`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">Cliente desde</p>
                  <p className="text-white">
                    {new Date(client.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              {client.notes && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-white/40 text-sm mb-2">Notas</p>
                  <p className="text-white/80 text-sm">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8 text-white/40">
                <p>No hay actividad reciente</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ClientDashboardTab;
