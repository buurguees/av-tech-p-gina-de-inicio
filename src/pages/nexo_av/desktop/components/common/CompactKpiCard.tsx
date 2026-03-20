import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type KpiAccent = "emerald" | "cyan" | "amber" | "destructive" | "violet" | "blue";

const accentMap: Record<KpiAccent, { dot: string; border: string; trendUp: string; trendDown: string }> = {
  emerald:     { dot: "bg-emerald-500",    border: "border-l-emerald-500",    trendUp: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",    trendDown: "text-destructive bg-destructive/10" },
  cyan:        { dot: "bg-cyan-500",       border: "border-l-cyan-500",       trendUp: "text-cyan-600 bg-cyan-500/10 dark:text-cyan-400",             trendDown: "text-destructive bg-destructive/10" },
  amber:       { dot: "bg-amber-500",      border: "border-l-amber-500",      trendUp: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",    trendDown: "text-amber-600 bg-amber-500/10 dark:text-amber-400" },
  destructive: { dot: "bg-destructive",    border: "border-l-destructive",    trendUp: "text-emerald-600 bg-emerald-500/10",                          trendDown: "text-destructive bg-destructive/10" },
  violet:      { dot: "bg-violet-500",     border: "border-l-violet-500",     trendUp: "text-emerald-600 bg-emerald-500/10",                          trendDown: "text-destructive bg-destructive/10" },
  blue:        { dot: "bg-blue-500",       border: "border-l-blue-500",       trendUp: "text-emerald-600 bg-emerald-500/10",                          trendDown: "text-destructive bg-destructive/10" },
};

interface CompactKpiCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: KpiAccent;
  /** Número decimal de tendencia: ej. 12.3 → "+12.3%" | -5.2 → "-5.2%" */
  trend?: number;
  delay?: number;
  className?: string;
}

/**
 * CompactKpiCard — tarjeta KPI de alta densidad para ERP desktop.
 * Alto ~56px, border-left de 3px de color, dot indicador, sin icono gigante.
 */
const CompactKpiCard = ({
  label,
  value,
  sub,
  color = "emerald",
  trend,
  delay = 0,
  className,
}: CompactKpiCardProps) => {
  const c = accentMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2 }}
      className={cn(
        "bg-card border border-border border-l-[3px] rounded-md px-3 py-2",
        "flex flex-col justify-center gap-1",
        "min-h-[56px]",
        c.border,
        className
      )}
    >
      {/* Fila superior: dot + label + tendencia */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", c.dot)} />
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-none truncate">
            {label}
          </span>
        </div>
        {trend !== undefined && (
          <span
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0",
              trend >= 0 ? c.trendUp : c.trendDown
            )}
          >
            {trend >= 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Valor principal */}
      <div className="text-xl font-semibold text-foreground leading-none">
        {value}
      </div>

      {/* Sublabel opcional */}
      {sub && (
        <div className="text-[10px] text-muted-foreground leading-none">{sub}</div>
      )}
    </motion.div>
  );
};

export default CompactKpiCard;
