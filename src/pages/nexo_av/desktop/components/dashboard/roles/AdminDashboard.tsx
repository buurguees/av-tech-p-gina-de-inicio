import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  Receipt,
  AlertCircle,
  FolderKanban,
  TrendingUp,
  Clock,
  CreditCard,
  Users,
  CalendarClock,
  Banknote,
  ArrowRight,
  CheckCircle2,
  Target,
  FileText,
  BarChart3,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import DetailNavigationBar from "../../navigation/DetailNavigationBar";
import CompactKpiCard from "../../common/CompactKpiCard";
import { cn } from "@/lib/utils";

interface AdminData {
  period: { start: string; end: string; type: string };
  kpis: {
    invoiced_amount: number;
    invoiced_net_amount: number;
    invoiced_tax_amount: number;
    invoiced_count: number;
    pending_collection: number;
    pending_collection_count: number;
    pending_payments_suppliers: number;
    pending_payroll: number;
    pending_financing: number;
    gross_margin: { revenue: number; expenses: number };
  };
  collection_risk: {
    overdue: { count: number; amount: number };
    due_7_days: { count: number; amount: number };
    top_debtors: { client_id: string; client_name: string; total_debt: number; invoice_count: number }[];
  };
  upcoming_payments: {
    purchase_invoices: any[];
    credit_installments: any[];
    payrolls: any[];
    partner_compensations: any[];
  };
  operations: {
    sites_ready_to_invoice: number;
    projects_in_progress: number;
    large_quotes_negotiation: any[];
  };
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const fmtDate = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
};

// ─── DashTabBar — navegación por pestañas interna ────────────────────────────
const DashTabBar = ({
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
              t.badgeDestructive
                ? "bg-destructive/15 text-destructive"
                : "bg-primary/10 text-primary"
            )}
          >
            {t.badge}
          </span>
        )}
      </button>
    ))}
  </div>
);

// ─── DashSection — sección del dashboard ─────────────────────────────────────
const DashSection = ({
  icon: Icon,
  title,
  badge,
  iconClass,
  children,
  delay = 0,
  tabBar,
}: {
  icon: any;
  title: string;
  badge?: number;
  iconClass?: string;
  children: React.ReactNode;
  delay?: number;
  tabBar?: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.2 }}
    className="flex flex-col bg-card border border-border rounded-md overflow-hidden min-h-0"
  >
    {/* Header 32px */}
    <div className="flex items-center gap-2 px-3 h-8 border-b border-border flex-shrink-0 bg-muted/25">
      <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", iconClass || "text-muted-foreground")} />
      <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide leading-none">
        {title}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
          {badge}
        </span>
      )}
    </div>
    {/* Tab bar opcional — fija, no scrollable */}
    {tabBar && (
      <div className="px-3 py-1.5 border-b border-border/50 flex-shrink-0">
        {tabBar}
      </div>
    )}
    {/* Body scrollable */}
    <div
      className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-0"
      style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--border)) transparent" }}
    >
      {children}
    </div>
  </motion.div>
);

// ─── DashRow — fila compacta de dato ─────────────────────────────────────────
const DashRow = ({
  label,
  value,
  sub,
  accentValue,
  badge,
  onClick,
}: {
  label: string;
  value?: string;
  sub?: string;
  accentValue?: string;
  badge?: string;
  onClick?: () => void;
}) => (
  <div
    className={cn(
      "flex items-center justify-between gap-2 min-h-[30px] border-b border-border/40 last:border-0",
      onClick &&
        "cursor-pointer hover:bg-muted/40 rounded -mx-1 px-1 transition-colors"
    )}
    onClick={onClick}
  >
    <div className="flex items-center gap-1.5 min-w-0">
      {badge && (
        <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1 py-0.5 rounded uppercase flex-shrink-0">
          {badge}
        </span>
      )}
      <span className="text-[12px] text-foreground truncate">{label}</span>
    </div>
    <div className="flex flex-col items-end flex-shrink-0">
      {value && (
        <span className={cn("text-[12px] font-semibold", accentValue || "text-foreground")}>
          {value}
        </span>
      )}
      {sub && <span className="text-[10px] text-muted-foreground leading-none">{sub}</span>}
    </div>
  </div>
);

// ─── DashLabel — etiqueta de grupo dentro de sección ─────────────────────────
const DashLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pt-1.5 pb-0.5 first:pt-0">
    {children}
  </div>
);

// ─── FinancialDonut — gráfico donut ingresos vs gastos ───────────────────────
const FinancialDonut = ({
  revenue,
  expenses,
  netResult,
  netMarginPct,
  pendingCollection,
  totalPayments,
}: {
  revenue: number;
  expenses: number;
  netResult: number;
  netMarginPct: string;
  pendingCollection: number;
  totalPayments: number;
}) => {
  const donutData = [
    { name: "Ingresos netos", value: revenue > 0 ? revenue : 0 },
    { name: "Gastos", value: expenses > 0 ? expenses : 0 },
  ];
  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-5))"];

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Donut */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-[90px] h-[90px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={42}
                strokeWidth={0}
                dataKey="value"
              >
                {donutData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <ReTooltip
                formatter={(value: number) => fmt(value)}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "11px",
                  padding: "4px 8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[0] }} />
            <span className="text-[11px] text-muted-foreground truncate">Ingresos netos</span>
            <span className="text-[11px] font-semibold text-foreground ml-auto">{fmt(revenue)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[1] }} />
            <span className="text-[11px] text-muted-foreground truncate">Gastos</span>
            <span className="text-[11px] font-semibold text-foreground ml-auto">{fmt(expenses)}</span>
          </div>
          <div className="border-t border-border/50 pt-1 mt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Resultado</span>
              <span className={cn("text-[12px] font-bold", netResult >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                {fmt(netResult)}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">{netMarginPct}% margen neto</div>
          </div>
        </div>
      </div>

      {/* Cobros vs pagos pendientes */}
      <div className="grid grid-cols-2 gap-1.5 mt-auto">
        <div className="rounded border border-destructive/20 bg-destructive/5 px-2 py-1.5">
          <div className="text-[10px] text-muted-foreground leading-none mb-0.5">Por cobrar</div>
          <div className={cn("text-sm font-bold leading-none", pendingCollection > 0 ? "text-destructive" : "text-muted-foreground")}>
            {fmt(pendingCollection)}
          </div>
        </div>
        <div className="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
          <div className="text-[10px] text-muted-foreground leading-none mb-0.5">Por pagar</div>
          <div className={cn("text-sm font-bold leading-none", totalPayments > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
            {fmt(totalPayments)}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TopProduct {
  product_id: string;
  sku: string;
  name: string;
  product_type: string;
  category_name: string;
  sales_count: number;
  total_qty: number;
  sales_total: number;
}

// ─── AdminDashboard ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"quarter" | "year">("quarter");
  const [treasuryTab, setTreasuryTab] = useState<"cobros" | "pagos">("cobros");
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const navigate = useNavigate();
  const { userId } = useParams();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [{ data: result }, { data: top }] = await Promise.all([
          supabase.rpc("dashboard_get_admin_overview", { p_period: period }),
          supabase.rpc("get_top_selling_products", { p_limit: 5 }),
        ]);
        setData(result as unknown as AdminData);
        setTopProducts((top || []) as TopProduct[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [period]);

  const PeriodFilter = () => (
    <div className="flex gap-0.5 bg-muted rounded p-0.5">
      {(["quarter", "year"] as const).map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={cn(
            "px-2.5 py-1 text-[11px] font-medium rounded transition-all duration-150",
            period === p
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {p === "quarter" ? "Trimestre" : "Año"}
        </button>
      ))}
    </div>
  );

  if (loading || !data) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        <DetailNavigationBar
          pageTitle="Dashboard"
          contextInfo="Admin · Centro de mando"
          tools={<PeriodFilter />}
        />
        <div className="flex-1 min-h-0 grid grid-rows-[auto_1fr_350px] gap-1.5 pt-2 px-4 pb-2 overflow-hidden">
          <div className="grid grid-cols-5 gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5 min-h-0">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="rounded-md" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Skeleton className="rounded-md" />
            <Skeleton className="rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  const k = data.kpis;
  const cr = data.collection_risk;
  const ops = data.operations;
  const up = data.upcoming_payments;

  const totalPendingPayments = k.pending_payments_suppliers + k.pending_payroll + k.pending_financing;
  const netResult = k.gross_margin.revenue - k.gross_margin.expenses;
  const netMarginPct =
    k.gross_margin.revenue > 0
      ? ((netResult / k.gross_margin.revenue) * 100).toFixed(1)
      : "0";

  // Unificar pagos próximos y ordenar por fecha
  type PaymentItem = { label: string; amount: number; due_date: string; badge: string };
  const allPayments: PaymentItem[] = [
    ...up.purchase_invoices.map((p) => ({
      label: p.supplier_name || p.reference || "Proveedor",
      amount: p.amount,
      due_date: p.due_date || "",
      badge: "COMP",
    })),
    ...up.credit_installments.map((p) => ({
      label: p.provider_name || "Financiación",
      amount: p.amount,
      due_date: p.due_date || "",
      badge: "FIN",
    })),
    ...up.payrolls.map((p) => ({
      label: p.employee_name || "Empleado",
      amount: p.net_amount,
      due_date: p.due_date || "",
      badge: "NOM",
    })),
    ...up.partner_compensations.map((p) => ({
      label: p.partner_name || "Socio",
      amount: p.net_amount,
      due_date: p.due_date || "",
      badge: "SOC",
    })),
  ].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <DetailNavigationBar
        pageTitle="Dashboard"
        contextInfo="Admin · Centro de mando"
        tools={<PeriodFilter />}
      />

      {/* Cuerpo: grid rows — KPIs / secciones / calendario */}
      <div className="flex-1 min-h-0 grid grid-rows-[auto_1fr_350px] gap-1.5 pt-2 px-4 pb-2 overflow-hidden">

        {/* ── Fila 1: KPIs ── */}
        <div className="grid grid-cols-5 gap-1.5">
          <CompactKpiCard
            label={`Facturado · ${period === "quarter" ? "Trim." : "Año"}`}
            value={fmt(k.invoiced_amount)}
            sub={`${k.invoiced_count} facturas`}
            color="emerald"
            delay={0.05}
          />
          <CompactKpiCard
            label="Facturado neto"
            value={fmt(k.invoiced_net_amount)}
            sub={`IVA: ${fmt(k.invoiced_tax_amount)}`}
            color="cyan"
            delay={0.08}
          />
          <CompactKpiCard
            label="Pendiente cobro"
            value={fmt(k.pending_collection)}
            sub={`${k.pending_collection_count} facturas`}
            color="destructive"
            delay={0.11}
          />
          <CompactKpiCard
            label="Pagos pendientes"
            value={fmt(totalPendingPayments)}
            sub="Prov. + nóm. + cuotas"
            color="amber"
            delay={0.14}
          />
          <CompactKpiCard
            label="Resultado P&G"
            value={fmt(netResult)}
            sub={`${netMarginPct}% margen`}
            color={netResult >= 0 ? "emerald" : "destructive"}
            delay={0.17}
          />
        </div>

        {/* ── Fila 2: secciones — 3 columnas ── */}
        <div className="grid grid-cols-3 gap-1.5 min-h-0">

          {/* S1+S2 fusionadas: Tesorería con tabs Cobros / Pagos */}
          <DashSection
            icon={cr.overdue.amount > 0 ? Receipt : CalendarClock}
            title="Tesorería"
            iconClass={cr.overdue.amount > 0 ? "text-destructive" : "text-emerald-500"}
            delay={0.15}
            tabBar={
              <DashTabBar
                tabs={[
                  {
                    key: "cobros",
                    label: "Cobros",
                    badge: k.pending_collection_count,
                    badgeDestructive: cr.overdue.amount > 0,
                  },
                  {
                    key: "pagos",
                    label: "Pagos",
                    badge: allPayments.length,
                  },
                ]}
                active={treasuryTab}
                onChange={(k) => setTreasuryTab(k as "cobros" | "pagos")}
              />
            }
          >
            {treasuryTab === "cobros" ? (
              <>
                {/* Mini-cards de riesgo */}
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  <div className="rounded border border-destructive/20 bg-destructive/5 px-2 py-1.5">
                    <div className="text-[10px] text-muted-foreground leading-none mb-0.5">Vencidas</div>
                    <div className={cn("text-sm font-bold leading-none", cr.overdue.amount > 0 ? "text-destructive" : "text-muted-foreground")}>
                      {fmt(cr.overdue.amount)}
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-none mt-0.5">{cr.overdue.count} fact.</div>
                  </div>
                  <div className="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
                    <div className="text-[10px] text-muted-foreground leading-none mb-0.5">En 7 días</div>
                    <div className={cn("text-sm font-bold leading-none", cr.due_7_days.amount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                      {fmt(cr.due_7_days.amount)}
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-none mt-0.5">{cr.due_7_days.count} fact.</div>
                  </div>
                </div>
                <DashLabel>Top deudores</DashLabel>
                {cr.top_debtors.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                    Sin deudas pendientes
                  </div>
                ) : (
                  cr.top_debtors.slice(0, 6).map((d) => (
                    <DashRow
                      key={d.client_id}
                      label={d.client_name}
                      value={fmt(d.total_debt)}
                      sub={`${d.invoice_count} fact.`}
                      accentValue="text-destructive"
                      onClick={() => navigate(`/nexo-av/${userId}/clients/${d.client_id}`)}
                    />
                  ))
                )}
              </>
            ) : (
              <>
                {allPayments.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                    Sin pagos próximos
                  </div>
                ) : (
                  allPayments.slice(0, 12).map((p, i) => (
                    <DashRow
                      key={i}
                      label={p.label}
                      value={fmt(p.amount)}
                      sub={fmtDate(p.due_date)}
                      badge={p.badge}
                    />
                  ))
                )}
              </>
            )}
          </DashSection>

          {/* S3: Operaciones activas */}
          <DashSection
            icon={FolderKanban}
            title="Operaciones activas"
            iconClass="text-violet-500"
            delay={0.25}
          >
            {/* Contadores principales */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <div
                className={cn(
                  "rounded border px-2 py-1.5 cursor-pointer transition-colors",
                  ops.sites_ready_to_invoice > 0
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                    : "border-border bg-muted/20"
                )}
                onClick={() => navigate(`/nexo-av/${userId}/projects`)}
              >
                <div className="text-[10px] text-muted-foreground leading-none mb-0.5">Listos a facturar</div>
                <div className={cn("text-xl font-bold leading-none", ops.sites_ready_to_invoice > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                  {ops.sites_ready_to_invoice}
                </div>
                <div className="text-[10px] text-muted-foreground leading-none mt-0.5">sites</div>
              </div>
              <div
                className="rounded border border-border bg-muted/20 px-2 py-1.5 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => navigate(`/nexo-av/${userId}/projects`)}
              >
                <div className="text-[10px] text-muted-foreground leading-none mb-0.5">En ejecución</div>
                <div className="text-xl font-bold leading-none text-violet-600 dark:text-violet-400">
                  {ops.projects_in_progress}
                </div>
                <div className="text-[10px] text-muted-foreground leading-none mt-0.5">proyectos</div>
              </div>
            </div>

            {ops.large_quotes_negotiation.length > 0 && (
              <>
                <DashLabel>Negociaciones activas</DashLabel>
                {ops.large_quotes_negotiation.slice(0, 5).map((q: any) => (
                  <DashRow
                    key={q.id}
                    label={q.client_name}
                    value={fmt(q.total)}
                    accentValue="text-primary"
                    onClick={() => navigate(`/nexo-av/${userId}/quotes/${q.id}`)}
                  />
                ))}
              </>
            )}

            <button
              onClick={() => navigate(`/nexo-av/${userId}/projects`)}
              className="mt-2 flex items-center gap-0.5 text-[11px] text-primary hover:underline"
            >
              Ver todos los proyectos <ArrowRight className="h-3 w-3" />
            </button>
          </DashSection>

          {/* S4: Resultado financiero — donut ingresos vs gastos */}
          <DashSection
            icon={BarChart3}
            title="Resultado financiero"
            iconClass="text-violet-500"
            delay={0.3}
          >
            <FinancialDonut
              revenue={k.gross_margin.revenue}
              expenses={k.gross_margin.expenses}
              netResult={netResult}
              netMarginPct={netMarginPct}
              pendingCollection={k.pending_collection}
              totalPayments={totalPendingPayments}
            />
          </DashSection>

        </div>

        {/* ── Fila 3: Top ventas + calendario ── */}
        <div className="grid grid-cols-2 gap-1.5 min-h-0">

          {/* Top 5 más vendidos */}
          <DashSection
            icon={TrendingUp}
            title="Top 5 más vendidos"
            iconClass="text-primary"
            delay={0.35}
          >
            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-6 text-muted-foreground/40 gap-1.5">
                <TrendingUp className="h-6 w-6" />
                <span className="text-[11px]">Sin datos de ventas aún</span>
              </div>
            ) : (
              topProducts.map((p, i) => (
                <DashRow
                  key={p.product_id}
                  badge={`#${i + 1}`}
                  label={p.name}
                  sub={`${Number(p.sales_count)} venta${Number(p.sales_count) !== 1 ? 's' : ''} · ${p.sku}`}
                  value={fmt(Number(p.sales_total))}
                  accentValue="text-primary"
                  onClick={() => navigate(`/nexo-av/${userId}/catalog/${p.product_id}`)}
                />
              ))
            )}
          </DashSection>

          <div className="flex items-center justify-center rounded-md border border-dashed border-border/50 bg-muted/20 text-[11px] text-muted-foreground/50 select-none">
            Calendario derecha
          </div>
        </div>

      </div>
      {/* fin cuerpo */}
    </div>
  );
};

export default AdminDashboard;
