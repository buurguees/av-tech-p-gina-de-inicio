import type { ElementType, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "orange" | "emerald" | "red" | "purple";

const toneStyles: Record<Tone, { bar: string; icon: string }> = {
  blue: {
    bar: "from-sky-500/80 via-blue-500/70 to-cyan-500/70",
    icon: "bg-sky-500/12 text-sky-600 dark:text-sky-300 ring-1 ring-sky-500/15",
  },
  green: {
    bar: "from-emerald-500/80 via-green-500/70 to-lime-500/70",
    icon: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/15",
  },
  orange: {
    bar: "from-amber-500/80 via-orange-500/70 to-yellow-500/70",
    icon: "bg-orange-500/12 text-orange-600 dark:text-orange-300 ring-1 ring-orange-500/15",
  },
  emerald: {
    bar: "from-emerald-500/80 via-teal-500/70 to-green-500/70",
    icon: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/15",
  },
  red: {
    bar: "from-rose-500/80 via-red-500/70 to-orange-500/70",
    icon: "bg-rose-500/12 text-rose-600 dark:text-rose-300 ring-1 ring-rose-500/15",
  },
  purple: {
    bar: "from-fuchsia-500/80 via-violet-500/70 to-purple-500/70",
    icon: "bg-violet-500/12 text-violet-600 dark:text-violet-300 ring-1 ring-violet-500/15",
  },
};

export const MobileSectionCard = ({
  title,
  description,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  description?: string;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) => (
  <section
    className={cn(
      "overflow-hidden rounded-[22px] border border-border/70 bg-gradient-to-br from-card via-card to-muted/20 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]",
      className
    )}
  >
    {(title || description) && (
      <div className="border-b border-border/50 px-4 py-3.5">
        {title && (
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/90">
            {title}
          </h3>
        )}
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    )}
    <div className={cn("px-4 py-4", bodyClassName)}>{children}</div>
  </section>
);

export const MobileMetricCard = ({
  icon: Icon,
  label,
  value,
  tone,
  helper,
}: {
  icon: ElementType;
  label: string;
  value: string;
  tone: Tone;
  helper?: string;
}) => (
  <div className="relative overflow-hidden rounded-[20px] border border-border/70 bg-gradient-to-br from-card via-card to-muted/20 px-3.5 py-3 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.5)]">
    <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", toneStyles[tone].bar)} />
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/90">
          {label}
        </p>
        <p className="mt-2 truncate text-lg font-semibold leading-none text-foreground">
          {value}
        </p>
        {helper && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {helper}
          </p>
        )}
      </div>
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", toneStyles[tone].icon)}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
    </div>
  </div>
);

export const MobileListCard = ({
  title,
  eyebrow,
  badges,
  subtitle,
  meta,
  amount,
  secondaryAmount,
  onClick,
  footer,
  className,
}: {
  title: string;
  eyebrow?: string;
  badges?: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  amount?: string;
  secondaryAmount?: string;
  onClick?: () => void;
  footer?: ReactNode;
  className?: string;
}) => {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {(eyebrow || badges) && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {eyebrow && (
                <span className="truncate rounded-full bg-muted/70 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {eyebrow}
                </span>
              )}
              {badges}
            </div>
          )}
          <h4 className="truncate text-sm font-semibold text-foreground">
            {title}
          </h4>
          {subtitle && (
            <div className="mt-1.5 text-xs text-muted-foreground">
              {subtitle}
            </div>
          )}
          {meta && (
            <div className="mt-2 text-[11px] text-muted-foreground/85">
              {meta}
            </div>
          )}
        </div>
        {(amount || secondaryAmount || onClick) && (
          <div className="flex flex-col items-end justify-start gap-1 text-right">
            {secondaryAmount && (
              <span className="text-[11px] text-muted-foreground">
                {secondaryAmount}
              </span>
            )}
            {amount && (
              <span className="text-sm font-semibold text-foreground">
                {amount}
              </span>
            )}
            {onClick && (
              <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
      {footer && (
        <div className="mt-3 border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
          {footer}
        </div>
      )}
    </>
  );

  if (!onClick) {
    return (
      <div
        className={cn(
          "rounded-[20px] border border-border/70 bg-gradient-to-br from-card via-card to-muted/20 px-3.5 py-3 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.5)]",
          className
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-[20px] border border-border/70 bg-gradient-to-br from-card via-card to-muted/20 px-3.5 py-3 text-left shadow-[0_12px_30px_-26px_rgba(15,23,42,0.5)] transition-all duration-200 active:scale-[0.985] hover:border-primary/30",
        className
      )}
      style={{ touchAction: "manipulation" }}
    >
      {content}
    </button>
  );
};

export const MobileEmptyState = ({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType;
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-border bg-muted/20 px-4 py-14 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border/60">
      <Icon className="h-7 w-7 text-muted-foreground" />
    </div>
    <h3 className="text-base font-semibold text-foreground">
      {title}
    </h3>
    <p className="mt-1.5 max-w-[240px] text-sm text-muted-foreground">
      {description}
    </p>
  </div>
);
