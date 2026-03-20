import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Receipt,
  Target,
  TrendingUp,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import DetailNavigationBar from "../../navigation/DetailNavigationBar";
import CompactKpiCard from "../../common/CompactKpiCard";
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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

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

const CommercialDashboard = () => {
  const [data, setData] = useState<CommercialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [commercialTab, setCommercialTab] = useState<"pipeline" | "facturar">("pipeline");
  const navigate = useNavigate();
  const { userId } = useParams();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { data: result } = await supabase.rpc("dashboard_get_commercial_overview", {
          p_user_id: user?.id || null,
        });

        setData(result as unknown as CommercialData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div className="w-full h-full flex flex-col">
        <DetailNavigationBar pageTitle="Dashboard" contextInfo="Comercial · Pipeline de ventas" />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const staleQuotes = data.pipeline.filter((quote) => quote.days_since_update > 7);
  const activeQuotes = data.pipeline.filter((quote) => quote.days_since_update <= 7);

  // Agrupación por estado para el gráfico
  const pipelineByStatus = (() => {
    const map: Record<string, { label: string; amount: number; count: number }> = {};
    data.pipeline.forEach((q) => {
      const key = q.status;
      if (!map[key]) map[key] = { label: key === "SENT" ? "Enviado" : key === "DRAFT" ? "Borrador" : key, amount: 0, count: 0 };
      map[key].amount += q.total;
      map[key].count += 1;
    });
    return Object.entries(map).map(([, v]) => v).sort((a, b) => b.amount - a.amount);
  })();

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar pageTitle="Dashboard" contextInfo="Comercial · Pipeline de ventas" />

      <div className="flex-1 overflow-y-auto px-4 pt-3 space-y-3 pb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <CompactKpiCard label="Presupuestado (trim.)" value={formatCurrency(data.kpis.quoted_amount)} color="cyan" delay={0.05} />
          <CompactKpiCard label="En negociación" value={String(data.kpis.quotes_in_negotiation)} color="amber" delay={0.1} />
          <CompactKpiCard label="Ratio conversión" value={`${data.kpis.conversion_rate}%`} color="emerald" delay={0.15} />
          <CompactKpiCard label="Facturado bruto" value={formatCurrency(data.kpis.invoiced_amount)} color="violet" delay={0.2} />
        </div>

        {/* Mini bar chart: pipeline por estado */}
        {pipelineByStatus.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card border border-border rounded-md px-3 pt-2 pb-1"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-cyan-500" />
              <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
                Volumen por estado
              </span>
            </div>
            <div className="h-[72px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineByStatus} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barSize={12}>
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    width={52}
                  />
                  <ReTooltip
                    formatter={(value: number, _: string, entry: any) =>
                      [`${formatCurrency(value)} (${entry.payload.count})`, "Importe"]
                    }
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "11px",
                      padding: "4px 8px",
                    }}
                  />
                  <Bar dataKey="amount" radius={[0, 3, 3, 0]}>
                    {pipelineByStatus.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "hsl(var(--chart-1))" : i === 1 ? "hsl(var(--chart-2))" : "hsl(var(--chart-3))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Panel unificado: Pipeline + Sites a facturar con tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col bg-card border border-border rounded-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 h-8 border-b border-border flex-shrink-0 bg-muted/25">
            <Target className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide leading-none">
              Acciones comerciales
            </span>
          </div>
          {/* Tab bar */}
          <div className="px-3 py-1.5 border-b border-border/50 flex-shrink-0">
            <TabBar
              tabs={[
                { key: "pipeline", label: "Pipeline", badge: data.pipeline.length },
                { key: "facturar", label: "A facturar", badge: data.sites_ready.length },
              ]}
              active={commercialTab}
              onChange={(k) => setCommercialTab(k as "pipeline" | "facturar")}
            />
          </div>
          {/* Body */}
          <div
            className="flex-1 overflow-y-auto px-3 py-2"
            style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--border)) transparent" }}
          >
            {commercialTab === "pipeline" ? (
              data.pipeline.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">Sin presupuestos en negociación</div>
              ) : (
                <div className="space-y-3">
                  {staleQuotes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-[11px] font-medium text-amber-500">Sin actividad ({staleQuotes.length})</span>
                      </div>
                      <div className="space-y-0.5">
                        {staleQuotes.map((quote) => (
                          <PipelineCard key={quote.id} quote={quote} userId={userId} navigate={navigate} />
                        ))}
                      </div>
                    </div>
                  )}
                  {activeQuotes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-medium text-muted-foreground">Activos ({activeQuotes.length})</span>
                      </div>
                      <div className="space-y-0.5">
                        {activeQuotes.map((quote) => (
                          <PipelineCard key={quote.id} quote={quote} userId={userId} navigate={navigate} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              data.sites_ready.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">No hay sites pendientes de facturación</div>
              ) : (
                <div className="space-y-0.5">
                  {data.sites_ready.map((site) => (
                    <button
                      key={site.site_id}
                      onClick={() => navigate(`/nexo-av/${userId}/projects/${site.project_id}?tab=planning`)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-foreground truncate">
                          {site.project_name}{site.site_name ? ` — ${site.site_name}` : ""}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {site.client_name} · {site.project_number}
                        </div>
                      </div>
                      {site.linked_quote && (
                        <span className="text-xs font-semibold text-emerald-500 shrink-0 ml-3">
                          {formatCurrency(site.linked_quote.total)}
                        </span>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-2 shrink-0" />
                    </button>
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


const PipelineCard = ({
  quote,
  userId,
  navigate,
}: {
  quote: PipelineItem;
  userId: string | undefined;
  navigate: ReturnType<typeof useNavigate>;
}) => (
  <button
    onClick={() => navigate(`/nexo-av/${userId}/quotes/${quote.id}`)}
    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/50 transition-colors text-left"
  >
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-foreground truncate max-w-[180px]">{quote.client_name}</span>
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full",
            quote.status === "SENT" ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground"
          )}
        >
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
