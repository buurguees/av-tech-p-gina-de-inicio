import { FileText, Receipt, Wallet, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectKPIsProps {
  totalBudget: number;
  totalInvoiced: number;
  totalExpenses: number;
  profitability: number;
  profitabilityPercentage: number;
  quotesCount: number;
  invoicesCount: number;
  expensesCount: number;
  loading: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const ProjectKPIs = ({
  totalBudget,
  totalInvoiced,
  totalExpenses,
  profitability,
  profitabilityPercentage,
  quotesCount,
  invoicesCount,
  expensesCount,
  loading,
}: ProjectKPIsProps) => {
  if (loading) {
    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 bg-white/5 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 bg-white/5 rounded-lg" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* KPIs Cards - Métricas Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-card/50 border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1 bg-blue-500/10 rounded text-blue-600">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Presupuesto</span>
          </div>
          <div>
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(totalBudget)}
            </span>
          </div>
        </div>

        <div className="bg-card/50 border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1 bg-green-500/10 rounded text-green-600">
              <Receipt className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Facturado</span>
          </div>
          <div>
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(totalInvoiced)}
            </span>
          </div>
        </div>

        <div className="bg-card/50 border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1 bg-orange-500/10 rounded text-orange-600">
              <Wallet className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Gastos</span>
          </div>
          <div>
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        </div>

        <div className="bg-card/50 border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={cn(
              "p-1 rounded",
              profitabilityPercentage >= 25 
                ? "bg-emerald-500/10 text-emerald-600"
                : profitabilityPercentage >= 20
                ? "bg-amber-500/10 text-amber-600"
                : "bg-red-500/10 text-red-600"
            )}>
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Rentabilidad</span>
          </div>
          <div>
            <span className={cn(
              "text-lg font-bold",
              profitabilityPercentage >= 25 
                ? "text-emerald-600"
                : profitabilityPercentage >= 20
                ? "text-amber-600"
                : "text-red-600"
            )}>
              {profitabilityPercentage >= 0 ? '+' : ''}{profitabilityPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* KPIs Cards - Métricas Secundarias */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-card/50 border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1 bg-indigo-500/10 rounded text-indigo-600">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Presupuestos</span>
          </div>
          <div>
            <span className="text-base font-bold text-foreground">
              {quotesCount}
            </span>
          </div>
        </div>

        <div className="bg-card/50 border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1 bg-green-500/10 rounded text-green-600">
              <Receipt className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Facturas</span>
          </div>
          <div>
            <span className="text-base font-bold text-foreground">
              {invoicesCount}
            </span>
          </div>
        </div>

        <div className="bg-card/50 border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1 bg-orange-500/10 rounded text-orange-600">
              <Wallet className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Gastos</span>
          </div>
          <div>
            <span className="text-base font-bold text-foreground">
              {expensesCount}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectKPIs;
