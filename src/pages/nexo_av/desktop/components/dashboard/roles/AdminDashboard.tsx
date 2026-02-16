import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  Receipt, AlertCircle, FileText, FolderKanban, TrendingUp,
  Clock, CreditCard, Users, CalendarClock, Banknote
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import DetailNavigationBar from "../../navigation/DetailNavigationBar";

interface AdminData {
  period: { start: string; end: string; type: string };
  kpis: {
    invoiced_amount: number;
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

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const AdminDashboard = () => {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"quarter" | "year">("quarter");
  const navigate = useNavigate();
  const { userId } = useParams();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data: result } = await supabase.rpc("dashboard_get_admin_overview", { p_period: period });
        setData(result as unknown as AdminData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [period]);

  const PeriodFilter = () => (
    <div className="flex gap-1.5 bg-secondary/50 rounded-lg p-1 border border-border/50">
      {(["quarter", "year"] as const).map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
            period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p === "quarter" ? "Trimestre" : "Año"}
        </button>
      ))}
    </div>
  );

  if (loading || !data) {
    return (
      <div className="w-full h-full flex flex-col">
        <DetailNavigationBar pageTitle="Dashboard" contextInfo="Admin · Centro de mando" tools={<PeriodFilter />} />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  const k = data.kpis;
  const marginPct = k.gross_margin.revenue > 0
    ? ((k.gross_margin.revenue - k.gross_margin.expenses) / k.gross_margin.revenue * 100).toFixed(1)
    : "0";
  const totalPendingPayments = k.pending_payments_suppliers + k.pending_payroll + k.pending_financing;

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar pageTitle="Dashboard" contextInfo="Admin · Centro de mando financiero" tools={<PeriodFilter />} />

      <div className="flex-1 overflow-y-auto space-y-4 pb-6">
        {/* Row 1: KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={Receipt} label={`Facturado (${period === "quarter" ? "Trim." : "Año"})`} value={formatCurrency(k.invoiced_amount)} sub={`${k.invoiced_count} facturas`} color="emerald" delay={0.05} />
          <KpiCard icon={AlertCircle} label="Pendiente cobrar" value={formatCurrency(k.pending_collection)} sub={`${k.pending_collection_count} facturas`} color="destructive" delay={0.1} />
          <KpiCard icon={CreditCard} label="Pagos pendientes" value={formatCurrency(totalPendingPayments)} sub="Proveedores + nóminas + cuotas" color="amber" delay={0.15} />
          <KpiCard icon={TrendingUp} label="Margen bruto" value={`${marginPct}%`} sub={formatCurrency(k.gross_margin.revenue - k.gross_margin.expenses)} color="cyan" delay={0.2} />
        </div>

        {/* Row 2: Collection Risk */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-card/50 border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" /> Riesgo de cobro
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Overdue */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Vencidas</div>
              <div className="text-xl font-bold text-destructive">{formatCurrency(data.collection_risk.overdue.amount)}</div>
              <div className="text-xs text-muted-foreground">{data.collection_risk.overdue.count} facturas</div>
            </div>
            {/* Due 7 days */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Vencen en 7 días</div>
              <div className="text-xl font-bold text-amber-500">{formatCurrency(data.collection_risk.due_7_days.amount)}</div>
              <div className="text-xs text-muted-foreground">{data.collection_risk.due_7_days.count} facturas</div>
            </div>
            {/* Top debtors */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground mb-1">Top deudores</div>
              {data.collection_risk.top_debtors.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">Sin deudas pendientes</div>
              ) : (
                data.collection_risk.top_debtors.slice(0, 5).map((d) => (
                  <div key={d.client_id} className="flex justify-between items-center text-xs">
                    <button onClick={() => navigate(`/nexo-av/${userId}/clients/${d.client_id}`)} className="text-foreground hover:text-primary truncate max-w-[140px]">
                      {d.client_name}
                    </button>
                    <span className="font-semibold text-destructive">{formatCurrency(d.total_debt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Row 3: Upcoming Payments */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-card/50 border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-500" /> Pagos próximos 7 días
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Purchase invoices */}
            <PaymentList
              title="Facturas de compra"
              icon={FileText}
              items={data.upcoming_payments.purchase_invoices}
              renderItem={(item) => (
                <div key={item.id} className="flex justify-between items-center text-xs py-1.5 border-b border-border/50 last:border-0">
                  <div className="truncate max-w-[200px]">
                    <span className="text-foreground font-medium">{item.supplier_name}</span>
                    <span className="text-muted-foreground ml-1.5">#{item.reference}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">{formatCurrency(item.amount)}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(item.due_date).toLocaleDateString("es-ES")}</div>
                  </div>
                </div>
              )}
            />
            {/* Credit installments */}
            <PaymentList
              title="Cuotas financiación"
              icon={Banknote}
              items={data.upcoming_payments.credit_installments}
              renderItem={(item) => (
                <div key={item.id} className="flex justify-between items-center text-xs py-1.5 border-b border-border/50 last:border-0">
                  <div className="truncate max-w-[200px]">
                    <span className="text-foreground font-medium">{item.provider_name}</span>
                    <span className="text-muted-foreground ml-1.5">Cuota {item.installment_number}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">{formatCurrency(item.amount)}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(item.due_date).toLocaleDateString("es-ES")}</div>
                  </div>
                </div>
              )}
            />
            {/* Payrolls */}
            <PaymentList
              title="Nóminas pendientes"
              icon={Users}
              items={data.upcoming_payments.payrolls}
              renderItem={(item) => (
                <div key={item.id} className="flex justify-between items-center text-xs py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-foreground font-medium truncate max-w-[200px]">{item.employee_name}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(item.net_amount)}</span>
                </div>
              )}
            />
            {/* Partner compensations */}
            <PaymentList
              title="Compensaciones socios"
              icon={Users}
              items={data.upcoming_payments.partner_compensations}
              renderItem={(item) => (
                <div key={item.id} className="flex justify-between items-center text-xs py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-foreground font-medium truncate max-w-[200px]">{item.partner_name}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(item.net_amount)}</span>
                </div>
              )}
            />
          </div>
        </motion.div>

        {/* Row 4: Operations */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="bg-card/50 border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
            <FolderKanban className="h-6 w-6 text-violet-500 mb-2" />
            <div className="text-2xl font-bold text-foreground">{data.operations.sites_ready_to_invoice}</div>
            <div className="text-xs text-muted-foreground">Sites listos para facturar</div>
          </div>
          <div className="bg-card/50 border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
            <Clock className="h-6 w-6 text-blue-500 mb-2" />
            <div className="text-2xl font-bold text-foreground">{data.operations.projects_in_progress}</div>
            <div className="text-xs text-muted-foreground">Proyectos en curso</div>
          </div>
          <div className="bg-card/50 border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-2">Presupuestos grandes en negociación</div>
            {data.operations.large_quotes_negotiation.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">Sin presupuestos pendientes</div>
            ) : (
              <div className="space-y-1.5">
                {data.operations.large_quotes_negotiation.map((q: any) => (
                  <button key={q.id} onClick={() => navigate(`/nexo-av/${userId}/quotes/${q.id}`)}
                    className="w-full flex justify-between text-xs hover:bg-secondary/50 rounded px-1 py-1 transition-colors">
                    <span className="text-foreground truncate max-w-[150px]">{q.client_name}</span>
                    <span className="font-semibold text-primary">{formatCurrency(q.total)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Sub-components
const KpiCard = ({ icon: Icon, label, value, sub, color, delay }: {
  icon: any; label: string; value: string; sub: string; color: string; delay: number;
}) => {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    destructive: "bg-destructive/10 text-destructive",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <div className="bg-card/50 border border-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className={`p-1 rounded ${colorMap[color] || colorMap.cyan}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-muted-foreground text-xs font-medium">{label}</span>
        </div>
        <div className="text-lg font-bold text-foreground">{value}</div>
        <div className="text-[10px] text-muted-foreground">{sub}</div>
      </div>
    </motion.div>
  );
};

const PaymentList = ({ title, icon: Icon, items, renderItem }: {
  title: string; icon: any; items: any[]; renderItem: (item: any) => React.ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      {items.length > 0 && (
        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full">{items.length}</span>
      )}
    </div>
    {items.length === 0 ? (
      <div className="text-xs text-muted-foreground/60 italic">Sin pagos pendientes</div>
    ) : (
      <div>{items.map(renderItem)}</div>
    )}
  </div>
);

export default AdminDashboard;
