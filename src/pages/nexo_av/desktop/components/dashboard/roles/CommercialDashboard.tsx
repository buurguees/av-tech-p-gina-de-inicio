import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  FileText, TrendingUp, Target, Receipt, Clock,
  AlertTriangle, CheckCircle, ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import DetailNavigationBar from "../../navigation/DetailNavigationBar";
import { cn } from "@/lib/utils";

interface PipelineItem {
  id: string;
  quote_number: string;
  status: string;
  client_name: string;
  client_id: string;
  total: number;
  created_at: string;
  updated_at: string;
  valid_until: string | null;
  days_since_update: number;
  project_name: string | null;
}

interface SiteReadyItem {
  site_id: string;
  site_name: string;
  project_id: string;
  project_number: string;
  project_name: string;
  client_name: string;
  linked_quote: { id: string; quote_number: string; total: number } | null;
}

interface CommercialData {
  period: { start: string; end: string };
  kpis: {
    quoted_amount: number;
    quotes_in_negotiation: number;
    conversion_rate: number;
    invoiced_amount: number;
  };
  pipeline: PipelineItem[];
  sites_ready: SiteReadyItem[];
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const CommercialDashboard = () => {
  const [data, setData] = useState<CommercialData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { userId } = useParams();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: result } = await supabase.rpc("dashboard_get_commercial_overview", {
          p_user_id: user?.id || null
        });
        setData(result as unknown as CommercialData);
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
        <DetailNavigationBar pageTitle="Dashboard" contextInfo="Comercial · Pipeline de ventas" />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const stale = data.pipeline.filter((q) => q.days_since_update > 7);
  const active = data.pipeline.filter((q) => q.days_since_update <= 7);

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar pageTitle="Dashboard" contextInfo="Comercial · Pipeline de ventas" />

      <div className="flex-1 overflow-y-auto space-y-4 pb-6">
        {/* Row 1: KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={FileText} label="Presupuestado (Trim.)" value={formatCurrency(data.kpis.quoted_amount)} color="cyan" delay={0.05} />
          <KpiCard icon={Target} label="En negociación" value={String(data.kpis.quotes_in_negotiation)} color="amber" delay={0.1} />
          <KpiCard icon={TrendingUp} label="Ratio conversión" value={`${data.kpis.conversion_rate}%`} color="emerald" delay={0.15} />
          <KpiCard icon={Receipt} label="Facturación generada" value={formatCurrency(data.kpis.invoiced_amount)} color="violet" delay={0.2} />
        </div>

        {/* Row 2: Pipeline */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card/50 border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-500" /> Pipeline de presupuestos
          </h3>

          {data.pipeline.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Sin presupuestos en negociación</div>
          ) : (
            <div className="space-y-4">
              {/* Stale quotes */}
              {stale.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-amber-500">Sin actividad reciente ({stale.length})</span>
                  </div>
                  <div className="space-y-1">
                    {stale.map((q) => <PipelineCard key={q.id} quote={q} userId={userId} navigate={navigate} />)}
                  </div>
                </div>
              )}
              {/* Active quotes */}
              {active.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Activos ({active.length})</span>
                  </div>
                  <div className="space-y-1">
                    {active.map((q) => <PipelineCard key={q.id} quote={q} userId={userId} navigate={navigate} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Row 3: Sites ready to invoice */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-card/50 border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" /> Sites listos para facturar
          </h3>
          {data.sites_ready.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">No hay sites pendientes de facturación</div>
          ) : (
            <div className="space-y-1.5">
              {data.sites_ready.map((s) => (
                <button key={s.site_id}
                  onClick={() => navigate(`/nexo-av/${userId}/projects/${s.project_id}?tab=planning`)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/50 transition-colors text-left">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground truncate">
                      {s.project_name}{s.site_name ? ` — ${s.site_name}` : ""}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{s.client_name} · {s.project_number}</div>
                  </div>
                  {s.linked_quote && (
                    <span className="text-xs font-semibold text-emerald-500 shrink-0 ml-3">{formatCurrency(s.linked_quote.total)}</span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-2 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, color, delay }: {
  icon: any; label: string; value: string; color: string; delay: number;
}) => {
  const colorMap: Record<string, string> = {
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <div className="bg-card/50 border border-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className={`p-1 rounded ${colorMap[color]}`}><Icon className="h-3.5 w-3.5" /></div>
          <span className="text-muted-foreground text-xs font-medium">{label}</span>
        </div>
        <div className="text-lg font-bold text-foreground">{value}</div>
      </div>
    </motion.div>
  );
};

const PipelineCard = ({ quote, userId, navigate }: { quote: PipelineItem; userId: string | undefined; navigate: any }) => (
  <button onClick={() => navigate(`/nexo-av/${userId}/quotes/${quote.id}`)}
    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/50 transition-colors text-left">
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-foreground truncate max-w-[180px]">{quote.client_name}</span>
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full",
          quote.status === "SENT" ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground"
        )}>
          {quote.status === "SENT" ? "Enviado" : "Borrador"}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground">
        {quote.quote_number}
        {quote.days_since_update > 0 && ` · ${quote.days_since_update}d sin actividad`}
      </div>
    </div>
    <span className="text-xs font-semibold text-foreground shrink-0 ml-3">{formatCurrency(quote.total)}</span>
  </button>
);

export default CommercialDashboard;
