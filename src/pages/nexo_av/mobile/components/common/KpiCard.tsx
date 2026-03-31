import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Color palette ───────────────────────────────────────────────────────────
const COLOR_MAP = {
  blue:    { bg: "bg-blue-500/10",    text: "text-blue-500" },
  green:   { bg: "bg-green-500/10",   text: "text-green-500" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  yellow:  { bg: "bg-yellow-500/10",  text: "text-yellow-500" },
  amber:   { bg: "bg-amber-500/10",   text: "text-amber-500" },
  orange:  { bg: "bg-orange-500/10",  text: "text-orange-500" },
  red:     { bg: "bg-red-500/10",     text: "text-red-500" },
  purple:  { bg: "bg-purple-500/10",  text: "text-purple-500" },
  indigo:  { bg: "bg-indigo-500/10",  text: "text-indigo-500" },
  pink:    { bg: "bg-pink-500/10",    text: "text-pink-500" },
} as const;

export type KpiColor = keyof typeof COLOR_MAP;
export type KpiVariant = "simple" | "semi" | "full";

interface KpiCardProps {
  /** Visual weight of the card */
  variant?: KpiVariant;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Main displayed value (number or formatted string) */
  value: string | number;
  /** Short label — required for semi/full, ignored in simple */
  label?: string;
  /** Color key from the palette */
  color?: KpiColor;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
const KpiCard = ({
  variant = "simple",
  icon: Icon,
  value,
  label,
  color = "blue",
  className,
}: KpiCardProps) => {
  const c = COLOR_MAP[color];

  // ── simple ──────────────────────────────────────────────────────────────
  // [icon]  [value]
  // Compact, no label. For list-page KPI strips (Proyectos, Facturas…)
  if (variant === "simple") {
    return (
      <div
        className={cn(
          "bg-card border border-border rounded-xl px-3 py-2",
          "flex items-center gap-2",
          className
        )}
      >
        <div className={cn("p-1.5 rounded-lg flex-shrink-0", c.bg, c.text)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-lg text-foreground font-semibold leading-none">
          {value}
        </span>
      </div>
    );
  }

  // ── semi ────────────────────────────────────────────────────────────────
  // [icon]  [label (tiny)]
  //         [value]
  // Same card height as simple but adds a micro-label for context.
  if (variant === "semi") {
    return (
      <div
        className={cn(
          "bg-card border border-border rounded-xl px-3 py-2",
          "flex items-center gap-2",
          className
        )}
      >
        <div className={cn("p-1.5 rounded-lg flex-shrink-0", c.bg, c.text)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-col min-w-0">
          {label && (
            <span className="text-[10px] text-muted-foreground leading-none mb-0.5 truncate">
              {label}
            </span>
          )}
          <span className="text-base text-foreground font-semibold leading-none">
            {value}
          </span>
        </div>
      </div>
    );
  }

  // ── full ────────────────────────────────────────────────────────────────
  // [big icon]  [label]
  //             [BIG value]
  // For Dashboard. Noticeably larger, more visual weight.
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-2xl p-4",
        "flex items-center gap-3",
        className
      )}
    >
      <div className={cn("p-3 rounded-xl flex-shrink-0", c.bg, c.text)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex flex-col min-w-0">
        {label && (
          <span className="text-xs text-muted-foreground leading-none mb-1 truncate">
            {label}
          </span>
        )}
        <span className="text-2xl text-foreground font-bold leading-none truncate">
          {value}
        </span>
      </div>
    </div>
  );
};

export default KpiCard;
