import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FolderKanban, Users, FileText, TrendingUp, Clock,
  CheckCircle, Euro, ArrowRight, MapPin, CalendarDays,
  Target, AlertCircle, Phone, PenLine, Receipt,
  AlertTriangle, CreditCard, Banknote
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import TasksWidget from "../../desktop/components/dashboard/widgets/TasksWidget";
import NotificationsWidget from "../../desktop/components/dashboard/widgets/NotificationsWidget";

const MobileDashboard = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data } = await supabase.rpc("get_current_user_info");
        if (data && data.length > 0) {
          setUserName(data[0].full_name?.split(" ")[0] || "Usuario");
          const roles: string[] = data[0].roles || [];
          if (roles.includes("admin")) setRole("admin");
          else if (roles.includes("manager")) setRole("manager");
          else if (roles.includes("comercial")) setRole("comercial");
          else if (roles.includes("tecnico")) setRole("tecnico");
          else setRole("admin");
        }
      } catch (e) {
        console.error(e);
        setRole("admin");
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 pb-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  switch (role) {
    case "admin":
      return <MobileAdminDashboard userName={userName} userId={userId} navigate={navigate} />;
    case "manager":
      return <MobileManagerDashboard userName={userName} userId={userId} navigate={navigate} />;
    case "comercial":
      return <MobileCommercialDashboard userName={userName} userId={userId} navigate={navigate} />;
    case "tecnico":
      return <MobileTechnicianDashboard userName={userName} userId={userId} navigate={navigate} />;
    default:
      return <MobileAdminDashboard userName={userName} userId={userId} navigate={navigate} />;
  }
};

// ============================================================
// SHARED
// ============================================================
const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

interface DashboardProps {
  userName: string;
  userId: string | undefined;
  navigate: any;
}

const Greeting = ({ userName, subtitle }: { userName: string; subtitle: string }) => (
  <div className="space-y-1">
    <h1 className="text-2xl font-semibold text-foreground">Hola, {userName} 👋</h1>
    <p className="text-muted-foreground text-sm">{subtitle}</p>
  </div>
);

const MiniKpi = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
  <div className="bg-card border border-border rounded-xl p-3">
    <div className="flex items-center gap-2 mb-1">
      <div className={cn("p-1.5 rounded-lg", color)}><Icon className="h-4 w-4" /></div>
      <span className="text-muted-foreground text-[11px]">{label}</span>
    </div>
    <span className="text-xl font-bold text-foreground">{value}</span>
  </div>
);

// ============================================================
// ADMIN MOBILE
// ============================================================
const MobileAdminDashboard = ({ userName, userId, navigate }: DashboardProps) => {
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState<"quarter" | "year">("quarter");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: r } = await supabase.rpc("dashboard_get_admin_overview", { p_period: period });
      setData(r);
      setLoading(false);
    };
    fetch();
  }, [period]);

  if (loading || !data) return <LoadingSkeleton />;

  const k = data.kpis;
  const marginPct = k.gross_margin?.revenue > 0
    ? ((k.gross_margin.revenue - k.gross_margin.expenses) / k.gross_margin.revenue * 100).toFixed(1) : "0";
  const totalPending = k.pending_payments_suppliers + k.pending_payroll + k.pending_financing;

  return (
    <div className="space-y-4 pb-4">
      <Greeting userName={userName} subtitle="Centro de mando financiero" />

      {/* Period toggle */}
      <div className="flex gap-1.5 bg-secondary/50 rounded-lg p-1 border border-border/50 w-fit">
        {(["quarter", "year"] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}>
            {p === "quarter" ? "Trimestre" : "Año"}
          </button>
        ))}
      </div>

      {/* Revenue card */}
      <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Facturado</p>
            <p className="text-3xl font-bold text-foreground">{fmt(k.invoiced_amount)}</p>
          </div>
          <div className="p-3 bg-primary/20 rounded-xl"><Euro className="h-6 w-6 text-primary" /></div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <span className="text-foreground font-medium">Margen: {marginPct}%</span>
        </div>
      </div>

      {/* KPIs grid */}
      <div className="grid grid-cols-2 gap-3">
        <MiniKpi icon={AlertCircle} label="Pendiente cobro" value={fmt(k.pending_collection)} color="bg-destructive/10 text-destructive" />
        <MiniKpi icon={CreditCard} label="Pagos pendientes" value={fmt(totalPending)} color="bg-amber-500/10 text-amber-500" />
      </div>

      {/* Collection risk */}
      {(data.collection_risk.overdue.count > 0 || data.collection_risk.due_7_days.count > 0) && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Riesgo de cobro
          </h3>
          {data.collection_risk.overdue.count > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{data.collection_risk.overdue.count} vencidas</span>
              <span className="font-semibold text-destructive">{fmt(data.collection_risk.overdue.amount)}</span>
            </div>
          )}
          {data.collection_risk.due_7_days.count > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{data.collection_risk.due_7_days.count} vencen en 7d</span>
              <span className="font-semibold text-amber-500">{fmt(data.collection_risk.due_7_days.amount)}</span>
            </div>
          )}
        </div>
      )}

      {/* Notificaciones */}
      <NotificationsWidget maxItems={5} />

      {/* Tareas hoy */}
      <TasksWidget variant="today" maxItems={5} />
      <TasksWidget variant="urgent" maxItems={5} />

      {/* Quick actions */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Operativa</h2>
        <QuickAction icon={FolderKanban} label="Sites listos p/ facturar" stat={data.operations.sites_ready_to_invoice}
          color="bg-emerald-500/10 text-emerald-500" onPress={() => navigate(`/nexo-av/${userId}/projects`)} />
        <QuickAction icon={Clock} label="Proyectos en curso" stat={data.operations.projects_in_progress}
          color="bg-blue-500/10 text-blue-500" onPress={() => navigate(`/nexo-av/${userId}/projects`)} />
        <QuickAction icon={FileText} label="Presupuestos en negociación" stat={data.operations.large_quotes_negotiation?.length || 0}
          color="bg-amber-500/10 text-amber-500" onPress={() => navigate(`/nexo-av/${userId}/quotes`)} />
      </div>
    </div>
  );
};

// ============================================================
// MANAGER MOBILE
// ============================================================
const MobileManagerDashboard = ({ userName, userId, navigate }: DashboardProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: r } = await supabase.rpc("dashboard_get_manager_overview", { p_days_ahead: 7 });
      setData(r);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading || !data) return <LoadingSkeleton />;

  const today = new Date().toISOString().split("T")[0];
  const agenda: any[] = data.agenda || [];
  const filtered = agenda.filter((s: any) => {
    if (filter === "in_progress") return s.site_status === "IN_PROGRESS";
    if (filter === "ready") return s.site_status === "READY_TO_INVOICE";
    if (filter === "today") return s.planned_start_date && s.planned_start_date <= today &&
      (s.planned_end_date || s.planned_start_date) >= today && ["SCHEDULED", "IN_PROGRESS"].includes(s.site_status);
    return true;
  });

  const k = data.kpis;

  return (
    <div className="space-y-4 pb-4">
      <Greeting userName={userName} subtitle="Centro de instalaciones" />

      <div className="grid grid-cols-2 gap-3">
        <MiniKpi icon={CalendarDays} label="Sites hoy" value={k.sites_today} color="bg-blue-500/10 text-blue-500" />
        <MiniKpi icon={Clock} label="Próx. 7 días" value={k.sites_next_days} color="bg-cyan-500/10 text-cyan-500" />
        <MiniKpi icon={MapPin} label="En curso" value={k.sites_in_progress} color="bg-amber-500/10 text-amber-500" />
        <MiniKpi icon={CheckCircle} label="Listos facturar" value={k.sites_ready_to_invoice} color="bg-emerald-500/10 text-emerald-500" />
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { key: "all", label: "Todos" },
          { key: "today", label: "Hoy" },
          { key: "in_progress", label: "En curso" },
          { key: "ready", label: "Facturar" },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn("px-3 py-1.5 text-xs font-medium rounded-lg border shrink-0 transition-all",
              filter === f.key ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary/50 text-muted-foreground border-border/50"
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Notificaciones */}
      <NotificationsWidget maxItems={5} />

      {/* Tareas */}
      <TasksWidget variant="today" maxItems={5} />

      {/* Agenda */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground">Sin sites en esta categoría</p>
          </div>
        ) : (
          filtered.map((s: any) => (
            <MobileSiteCard key={s.site_id} site={s} userId={userId} navigate={navigate} showFinancials={true} />
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================
// COMMERCIAL MOBILE
// ============================================================
const MobileCommercialDashboard = ({ userName, userId, navigate }: DashboardProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: r } = await supabase.rpc("dashboard_get_commercial_overview", { p_user_id: user?.id || null });
      setData(r);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading || !data) return <LoadingSkeleton />;

  const k = data.kpis;

  return (
    <div className="space-y-4 pb-4">
      <Greeting userName={userName} subtitle="Pipeline de ventas" />

      <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 rounded-2xl p-5">
        <p className="text-muted-foreground text-sm">Presupuestado (Trim.)</p>
        <p className="text-3xl font-bold text-foreground">{fmt(k.quoted_amount)}</p>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span className="text-emerald-500 font-medium">{k.conversion_rate}% conversión</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-foreground">{fmt(k.invoiced_amount)} facturado</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MiniKpi icon={Target} label="En negociación" value={k.quotes_in_negotiation} color="bg-amber-500/10 text-amber-500" />
        <MiniKpi icon={CheckCircle} label="Sites p/ facturar" value={data.sites_ready?.length || 0} color="bg-emerald-500/10 text-emerald-500" />
      </div>

      {/* Notificaciones */}
      <NotificationsWidget maxItems={5} />

      {/* Tareas */}
      <TasksWidget variant="today" maxItems={5} />

      {/* Pipeline */}
      {data.pipeline?.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Pipeline</h2>
          {data.pipeline.map((q: any) => (
            <button key={q.id} onClick={() => navigate(`/nexo-av/${userId}/quotes/${q.id}`)}
              className={cn("w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border",
                "active:scale-[0.98] transition-all"
              )} style={{ touchAction: "manipulation" }}>
              <div className="text-left min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm truncate">{q.client_name}</p>
                <p className="text-xs text-muted-foreground">
                  {q.quote_number}
                  {q.days_since_update > 7 && (
                    <span className="text-amber-500 ml-1.5">· {q.days_since_update}d sin actividad</span>
                  )}
                </p>
              </div>
              <span className="text-sm font-semibold text-foreground ml-3">{fmt(q.total)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sites ready */}
      {data.sites_ready?.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Sites listos para facturar</h2>
          {data.sites_ready.map((s: any) => (
            <button key={s.site_id} onClick={() => navigate(`/nexo-av/${userId}/projects/${s.project_id}?tab=planning`)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border active:scale-[0.98] transition-all"
              style={{ touchAction: "manipulation" }}>
              <div className="text-left min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm truncate">{s.project_name}{s.site_name ? ` — ${s.site_name}` : ""}</p>
                <p className="text-xs text-muted-foreground">{s.client_name}</p>
              </div>
              {s.linked_quote && <span className="text-sm font-semibold text-emerald-500 ml-3">{fmt(s.linked_quote.total)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// TECHNICIAN MOBILE
// ============================================================
const MobileTechnicianDashboard = ({ userName, userId, navigate }: DashboardProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: r } = await supabase.rpc("dashboard_get_technician_overview", { p_user_id: user?.id || null });
      setData(r);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading || !data) return <LoadingSkeleton />;

  const k = data.kpis;

  return (
    <div className="space-y-4 pb-4">
      <Greeting userName={userName} subtitle="Tu agenda de trabajo" />

      <div className="grid grid-cols-3 gap-2">
        <MiniKpi icon={CalendarDays} label="Hoy" value={k.sites_today} color="bg-blue-500/10 text-blue-500" />
        <MiniKpi icon={Clock} label="7 días" value={k.sites_next_7_days} color="bg-cyan-500/10 text-cyan-500" />
        <MiniKpi icon={MapPin} label="En curso" value={k.sites_in_progress} color="bg-amber-500/10 text-amber-500" />
      </div>

      {/* Notificaciones */}
      <NotificationsWidget maxItems={5} />

      {/* Tareas */}
      <TasksWidget variant="today" maxItems={5} />

      {/* Open visits */}
      {data.open_visits?.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-amber-500 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Visitas abiertas ({data.open_visits.length})
          </h3>
          {data.open_visits.map((v: any) => (
            <div key={v.visit_id} className="text-xs flex justify-between py-1 border-b border-amber-500/10 last:border-0">
              <span className="text-foreground">{v.project_name} — {v.site_name}</span>
              <span className="text-muted-foreground">
                {v.check_in_at ? new Date(v.check_in_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Agenda */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Mi agenda</h2>
        {(!data.agenda || data.agenda.length === 0) ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No tienes sites asignados</p>
          </div>
        ) : (
          data.agenda.map((s: any) => (
            <MobileSiteCard key={s.site_id} site={s} userId={userId} navigate={navigate} showFinancials={false} showContact={true} />
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================
// SHARED COMPONENTS
// ============================================================
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PLANNED: { label: "Planificado", color: "bg-muted text-muted-foreground" },
  SCHEDULED: { label: "Programado", color: "bg-blue-500/10 text-blue-500" },
  IN_PROGRESS: { label: "En curso", color: "bg-amber-500/10 text-amber-500" },
  READY_TO_INVOICE: { label: "Listo facturar", color: "bg-emerald-500/10 text-emerald-500" },
  INVOICED: { label: "Facturado", color: "bg-violet-500/10 text-violet-500" },
};

const MobileSiteCard = ({ site, userId, navigate, showFinancials = false, showContact = false }: {
  site: any; userId: string | undefined; navigate: any; showFinancials?: boolean; showContact?: boolean;
}) => {
  const cfg = STATUS_MAP[site.site_status] || { label: site.site_status, color: "bg-muted text-muted-foreground" };
  return (
    <button onClick={() => navigate(`/nexo-av/${userId}/projects/${site.project_id}?tab=planning`)}
      className="w-full text-left p-4 rounded-xl bg-card border border-border active:scale-[0.98] transition-all"
      style={{ touchAction: "manipulation" }}>
      <div className="flex items-center gap-2 mb-1">
        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", cfg.color)}>{cfg.label}</span>
        <span className="text-[10px] text-muted-foreground">{site.project_number}</span>
      </div>
      <p className="font-medium text-foreground text-sm">
        {site.project_name}{site.local_name ? ` — ${site.local_name}` : ""}{site.site_name ? ` — ${site.site_name}` : ""}
      </p>
      <p className="text-xs text-muted-foreground">{site.client_name}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
        {site.planned_start_date && (
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {new Date(site.planned_start_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
          </span>
        )}
        {site.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{site.city}</span>}
        {site.technicians?.length > 0 && (
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{site.technicians.length} téc.</span>
        )}
      </div>

      {showContact && site.contact_phone && (
        <div className="mt-2 text-[11px] flex items-center gap-2">
          <Phone className="h-3 w-3 text-primary" />
          <span className="text-primary">{site.contact_phone}</span>
        </div>
      )}

      {showFinancials && site.site_status === "READY_TO_INVOICE" && site.linked_quote && (
        <div className="mt-2 text-xs flex items-center gap-2">
          <span className="text-muted-foreground">Presupuesto:</span>
          <span className="font-semibold text-foreground">{fmt(site.linked_quote.total)}</span>
        </div>
      )}
    </button>
  );
};

const QuickAction = ({ icon: Icon, label, stat, color, onPress }: {
  icon: any; label: string; stat: number; color: string; onPress: () => void;
}) => (
  <button onClick={onPress}
    className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border active:scale-[0.98] transition-all"
    style={{ touchAction: "manipulation" }}>
    <div className="flex items-center gap-3">
      <div className={cn("p-2.5 rounded-xl", color)}><Icon className="h-5 w-5" /></div>
      <div className="text-left">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{stat}</p>
      </div>
    </div>
    <ArrowRight className="h-5 w-5 text-muted-foreground" />
  </button>
);

const LoadingSkeleton = () => (
  <div className="space-y-4 pb-4">
    <div className="space-y-1">
      <Skeleton className="h-8 w-48 rounded" />
      <Skeleton className="h-4 w-64 rounded" />
    </div>
    <Skeleton className="h-28 rounded-2xl" />
    <div className="grid grid-cols-2 gap-3">
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
    </div>
    <Skeleton className="h-48 rounded-xl" />
  </div>
);

export default MobileDashboard;
