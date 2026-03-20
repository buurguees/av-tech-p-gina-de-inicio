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
import CompactKpiCard from "../../common/CompactKpiCard";
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

// ─── TabBar reutilizable ──────────────────────────────────────────────────────
const TabBar = ({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; badge?: number; badgeDestructive?: boolean }[];
  active: string;
  onChange: (key: string) => void;
}) => (
  <div className="flex gap-0.5 bg-muted/60 rounded p-0.5">
    {tabs.map((t) => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        className={cn(
          "flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium rounded transition-all duration-150",
          active === t.key
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {t.label}
        {t.badge !== undefined && t.badge > 0 && (
          <span
            className={cn(
              "text-[9px] font-bold px-1 py-px rounded leading-none",
              t.badgeDestructive ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
            )}
          >
            {t.badge}
          </span>
        )}
      </button>
    ))}
  </div>
);

const TechnicianDashboard = () => {
  const [data, setData] = useState<TechnicianData | null>(null);
  const [loading, setLoading] = useState(true);
  const [techTab, setTechTab] = useState<"agenda" | "visitas">("agenda");
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

      <div className="flex-1 overflow-y-auto px-4 pt-3 space-y-3 pb-6">
        {/* Row 1: KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <CompactKpiCard label="Mis sites hoy" value={String(data.kpis.sites_today)} color="blue" delay={0.05} />
          <CompactKpiCard label="Próximos 7 días" value={String(data.kpis.sites_next_7_days)} color="cyan" delay={0.1} />
          <CompactKpiCard label="En curso" value={String(data.kpis.sites_in_progress)} color="amber" delay={0.15} />
        </div>

        {/* Panel unificado: Agenda + Visitas abiertas con tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col bg-card border border-border rounded-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 h-8 border-b border-border flex-shrink-0 bg-muted/25">
            <CalendarDays className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide leading-none">
              Mi trabajo
            </span>
          </div>
          {/* Tab bar */}
          <div className="px-3 py-1.5 border-b border-border/50 flex-shrink-0">
            <TabBar
              tabs={[
                { key: "agenda", label: "Agenda", badge: data.agenda.length },
                {
                  key: "visitas",
                  label: "Visitas abiertas",
                  badge: data.open_visits.length,
                  badgeDestructive: data.open_visits.length > 0,
                },
              ]}
              active={techTab}
              onChange={(k) => setTechTab(k as "agenda" | "visitas")}
            />
          </div>
          {/* Body */}
          <div
            className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
            style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--border)) transparent" }}
          >
            {techTab === "agenda" ? (
              data.agenda.length === 0 ? (
                <div className="py-8 text-center">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tienes sites asignados actualmente</p>
                </div>
              ) : (
                data.agenda.map((site) => {
                  const cfg = STATUS_LABELS[site.site_status] || { label: site.site_status, color: "bg-muted text-muted-foreground" };
                  return (
                    <div key={site.site_id} className="border border-border rounded-lg p-3 hover:border-primary/30 transition-colors">
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
                        <button
                          onClick={() => navigate(`/nexo-av/${userId}/projects/${site.project_id}?tab=planning`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                        >
                          <PenLine className="h-3.5 w-3.5" />
                          Registrar visita
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              data.open_visits.length === 0 ? (
                <div className="py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay visitas abiertas</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {data.open_visits.map((v) => (
                    <div
                      key={v.visit_id}
                      className="flex items-center justify-between text-xs py-2 px-2 rounded-lg border border-amber-500/20 bg-amber-500/5"
                    >
                      <div>
                        <span className="text-foreground font-medium">{v.project_name}</span>
                        <span className="text-muted-foreground ml-1.5">— {v.site_name}</span>
                      </div>
                      <div className="text-muted-foreground flex-shrink-0">
                        Entrada: {v.check_in_at
                          ? new Date(v.check_in_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};


export default TechnicianDashboard;
