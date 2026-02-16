import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  MapPin, CalendarDays, Clock, AlertCircle,
  Phone, Mail, PenLine
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import DetailNavigationBar from "../../navigation/DetailNavigationBar";
import { cn } from "@/lib/utils";

interface AgendaSite {
  site_id: string;
  site_name: string;
  address: string;
  city: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  site_status: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  planned_days: number | null;
  project_id: string;
  project_number: string;
  project_name: string;
  local_name: string;
  client_name: string;
}

interface OpenVisit {
  visit_id: string;
  visit_date: string;
  check_in_at: string;
  notes: string;
  site_name: string;
  site_id: string;
  project_name: string;
  project_number: string;
}

interface TechnicianData {
  kpis: { sites_today: number; sites_next_7_days: number; sites_in_progress: number };
  agenda: AgendaSite[];
  open_visits: OpenVisit[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PLANNED: { label: "Planificado", color: "bg-muted text-muted-foreground" },
  SCHEDULED: { label: "Programado", color: "bg-blue-500/10 text-blue-500" },
  IN_PROGRESS: { label: "En curso", color: "bg-amber-500/10 text-amber-500" },
};

const TechnicianDashboard = () => {
  const [data, setData] = useState<TechnicianData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { userId } = useParams();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: result } = await supabase.rpc("dashboard_get_technician_overview", {
          p_user_id: user?.id || null
        });
        setData(result as unknown as TechnicianData);
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
        <DetailNavigationBar pageTitle="Dashboard" contextInfo="Mi agenda de trabajo" />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar pageTitle="Dashboard" contextInfo="Mi agenda de trabajo" />

      <div className="flex-1 overflow-y-auto space-y-4 pb-6">
        {/* Row 1: KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard icon={CalendarDays} label="Mis sites hoy" value={data.kpis.sites_today} color="blue" delay={0.05} />
          <KpiCard icon={Clock} label="Próximos 7 días" value={data.kpis.sites_next_7_days} color="cyan" delay={0.1} />
          <KpiCard icon={MapPin} label="En curso" value={data.kpis.sites_in_progress} color="amber" delay={0.15} />
        </div>

        {/* Open visits warning */}
        {data.open_visits.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-amber-500 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Visitas abiertas ({data.open_visits.length})
            </h3>
            <div className="space-y-1.5">
              {data.open_visits.map((v) => (
                <div key={v.visit_id} className="flex items-center justify-between text-xs py-1.5 border-b border-amber-500/10 last:border-0">
                  <div>
                    <span className="text-foreground font-medium">{v.project_name}</span>
                    <span className="text-muted-foreground ml-1.5">— {v.site_name}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Entrada: {v.check_in_at ? new Date(v.check_in_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Row 2: Agenda */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" /> Mi agenda
          </h3>
          {data.agenda.length === 0 ? (
            <div className="bg-card/50 border border-border rounded-xl p-8 text-center">
              <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No tienes sites asignados actualmente</p>
            </div>
          ) : (
            data.agenda.map((site) => {
              const cfg = STATUS_LABELS[site.site_status] || { label: site.site_status, color: "bg-muted text-muted-foreground" };
              return (
                <div key={site.site_id} className="bg-card/50 border border-border rounded-xl p-3 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", cfg.color)}>{cfg.label}</span>
                        <span className="text-[10px] text-muted-foreground">{site.project_number}</span>
                      </div>
                      <div className="text-sm font-medium text-foreground">
                        {site.project_name}{site.local_name ? ` — ${site.local_name}` : ""}{site.site_name ? ` — ${site.site_name}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{site.client_name}</div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                        {site.planned_start_date && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(site.planned_start_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                            {site.planned_end_date && ` — ${new Date(site.planned_end_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}`}
                          </span>
                        )}
                        {site.address && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{site.address}{site.city ? `, ${site.city}` : ""}</span>
                        )}
                      </div>

                      {/* Contact */}
                      {(site.contact_name || site.contact_phone) && (
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          {site.contact_name && <span>{site.contact_name}</span>}
                          {site.contact_phone && (
                            <a href={`tel:${site.contact_phone}`} className="flex items-center gap-1 text-primary hover:underline">
                              <Phone className="h-3 w-3" />{site.contact_phone}
                            </a>
                          )}
                          {site.contact_email && (
                            <a href={`mailto:${site.contact_email}`} className="flex items-center gap-1 text-primary hover:underline">
                              <Mail className="h-3 w-3" />{site.contact_email}
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <button onClick={() => navigate(`/nexo-av/${userId}/projects/${site.project_id}?tab=planning`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0">
                      <PenLine className="h-3.5 w-3.5" />
                      Registrar visita
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </motion.div>
      </div>
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, color, delay }: {
  icon: any; label: string; value: number; color: string; delay: number;
}) => {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <div className="bg-card/50 border border-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className={`p-1 rounded ${colorMap[color]}`}><Icon className="h-3.5 w-3.5" /></div>
          <span className="text-muted-foreground text-xs font-medium">{label}</span>
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </div>
    </motion.div>
  );
};

export default TechnicianDashboard;
