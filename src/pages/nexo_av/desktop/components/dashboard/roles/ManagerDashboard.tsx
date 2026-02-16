import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  MapPin, Clock, CheckCircle, FileText, CalendarDays,
  Users, ArrowRight, Eye, PenLine, Receipt
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import DetailNavigationBar from "../../navigation/DetailNavigationBar";
import { cn } from "@/lib/utils";

interface SiteAgendaItem {
  site_id: string;
  site_name: string;
  address: string;
  city: string;
  contact_name: string;
  contact_phone: string;
  site_status: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  planned_days: number | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  project_id: string;
  project_number: string;
  project_name: string;
  local_name: string;
  client_name: string;
  client_id: string;
  technicians: { id: string; name: string; role: string }[];
  last_visit: { visit_date: string; check_in_at: string; check_out_at: string; technician_name: string } | null;
  days_open: number;
  linked_quote: { id: string; quote_number: string; total: number } | null;
  linked_invoice: { id: string; invoice_number: string; total: number; status: string } | null;
}

interface ManagerData {
  kpis: { sites_today: number; sites_next_days: number; sites_in_progress: number; sites_ready_to_invoice: number };
  agenda: SiteAgendaItem[];
}

type FilterType = "all" | "today" | "next_7" | "in_progress" | "ready";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PLANNED: { label: "Planificado", color: "bg-muted text-muted-foreground" },
  SCHEDULED: { label: "Programado", color: "bg-blue-500/10 text-blue-500" },
  IN_PROGRESS: { label: "En curso", color: "bg-amber-500/10 text-amber-500" },
  READY_TO_INVOICE: { label: "Listo p/ facturar", color: "bg-emerald-500/10 text-emerald-500" },
  INVOICED: { label: "Facturado", color: "bg-violet-500/10 text-violet-500" },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const ManagerDashboard = () => {
  const [data, setData] = useState<ManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const navigate = useNavigate();
  const { userId } = useParams();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data: result } = await supabase.rpc("dashboard_get_manager_overview", { p_days_ahead: 7 });
        setData(result as unknown as ManagerData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading || !data) {
    return (
      <div className="w-full h-full flex flex-col">
        <DetailNavigationBar pageTitle="Dashboard" contextInfo="Manager · Centro de instalaciones" />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const next7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const filtered = data.agenda.filter((s) => {
    switch (filter) {
      case "today":
        return s.planned_start_date && s.planned_start_date <= today &&
          (s.planned_end_date || s.planned_start_date) >= today &&
          ["SCHEDULED", "IN_PROGRESS"].includes(s.site_status);
      case "next_7":
        return s.planned_start_date && s.planned_start_date >= today && s.planned_start_date <= next7 &&
          ["PLANNED", "SCHEDULED"].includes(s.site_status);
      case "in_progress":
        return s.site_status === "IN_PROGRESS";
      case "ready":
        return s.site_status === "READY_TO_INVOICE";
      default:
        return true;
    }
  });

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "Todos", count: data.agenda.length },
    { key: "today", label: "Hoy", count: data.kpis.sites_today },
    { key: "next_7", label: "7 días", count: data.kpis.sites_next_days },
    { key: "in_progress", label: "En curso", count: data.kpis.sites_in_progress },
    { key: "ready", label: "Facturar", count: data.kpis.sites_ready_to_invoice },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar pageTitle="Dashboard" contextInfo="Manager · Centro de instalaciones" />

      <div className="flex-1 overflow-y-auto space-y-4 pb-6">
        {/* Row 1: KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={CalendarDays} label="Sites hoy" value={data.kpis.sites_today} color="blue" delay={0.05} />
          <KpiCard icon={Clock} label="Próximos 7 días" value={data.kpis.sites_next_days} color="cyan" delay={0.1} />
          <KpiCard icon={MapPin} label="En curso" value={data.kpis.sites_in_progress} color="amber" delay={0.15} />
          <KpiCard icon={CheckCircle} label="Listos p/ facturar" value={data.kpis.sites_ready_to_invoice} color="emerald" delay={0.2} />
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-all border",
                filter === f.key
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-secondary/50 text-muted-foreground border-border/50 hover:text-foreground"
              )}
            >
              {f.label}
              {f.count !== undefined && (
                <span className="ml-1.5 text-[10px] opacity-70">{f.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Row 2: Agenda */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-card/50 border border-border rounded-xl p-8 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No hay sites en esta categoría</p>
            </div>
          ) : (
            filtered.map((site) => (
              <SiteAgendaCard key={site.site_id} site={site} userId={userId} navigate={navigate} />
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
};

// Sub-components
const KpiCard = ({ icon: Icon, label, value, color, delay }: {
  icon: any; label: string; value: number; color: string; delay: number;
}) => {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <div className="bg-card/50 border border-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className={`p-1 rounded ${colorMap[color]}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-muted-foreground text-xs font-medium">{label}</span>
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </div>
    </motion.div>
  );
};

const SiteAgendaCard = ({ site, userId, navigate }: { site: SiteAgendaItem; userId: string | undefined; navigate: any }) => {
  const cfg = STATUS_CONFIG[site.site_status] || { label: site.site_status, color: "bg-muted text-muted-foreground" };

  const getCta = () => {
    switch (site.site_status) {
      case "PLANNED":
      case "SCHEDULED":
        return { label: "Ver planificación", icon: Eye, action: () => navigate(`/nexo-av/${userId}/projects/${site.project_id}?tab=planning`) };
      case "IN_PROGRESS":
        return { label: "Registrar visita", icon: PenLine, action: () => navigate(`/nexo-av/${userId}/projects/${site.project_id}?tab=planning`) };
      case "READY_TO_INVOICE":
        return { label: "Crear factura", icon: Receipt, action: () => navigate(`/nexo-av/${userId}/projects/${site.project_id}?tab=planning`) };
      case "INVOICED":
        return site.linked_invoice
          ? { label: "Ver factura", icon: FileText, action: () => navigate(`/nexo-av/${userId}/invoices/${site.linked_invoice!.id}`) }
          : null;
      default:
        return null;
    }
  };

  const cta = getCta();

  return (
    <div className="bg-card/50 border border-border rounded-xl p-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Project + Site */}
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", cfg.color)}>{cfg.label}</span>
            <span className="text-[10px] text-muted-foreground">{site.project_number}</span>
          </div>
          <button onClick={() => navigate(`/nexo-av/${userId}/projects/${site.project_id}`)}
            className="text-sm font-medium text-foreground hover:text-primary truncate block max-w-full text-left">
            {site.project_name}{site.local_name ? ` — ${site.local_name}` : ""}{site.site_name ? ` — ${site.site_name}` : ""}
          </button>
          <div className="text-xs text-muted-foreground mt-0.5">{site.client_name}</div>

          {/* Details row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
            {site.planned_start_date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {new Date(site.planned_start_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                {site.planned_end_date && ` — ${new Date(site.planned_end_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}`}
              </span>
            )}
            {site.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{site.city}</span>}
            {site.technicians.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {site.technicians.length === 1 ? site.technicians[0].name : `${site.technicians.length} técnicos`}
              </span>
            )}
            {site.site_status === "IN_PROGRESS" && site.days_open > 0 && (
              <span className={cn("flex items-center gap-1", site.days_open > 5 ? "text-amber-500" : "")}>
                <Clock className="h-3 w-3" />{site.days_open}d abierto
              </span>
            )}
            {site.last_visit && (
              <span className="flex items-center gap-1">
                Última visita: {new Date(site.last_visit.visit_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
              </span>
            )}
          </div>

          {/* Financial info for READY_TO_INVOICE */}
          {site.site_status === "READY_TO_INVOICE" && site.linked_quote && (
            <div className="mt-2 text-xs flex items-center gap-2">
              <span className="text-muted-foreground">Presupuesto:</span>
              <span className="font-semibold text-foreground">{formatCurrency(site.linked_quote.total)}</span>
              <span className="text-muted-foreground">({site.linked_quote.quote_number})</span>
            </div>
          )}
        </div>

        {/* CTA */}
        {cta && (
          <button onClick={cta.action}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0">
            <cta.icon className="h-3.5 w-3.5" />
            {cta.label}
          </button>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;
