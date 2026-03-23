import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_CHIP_COLORS, STATUS_LABELS } from "@/constants/siteStatuses";
import type { CalendarSite } from "@/pages/nexo_av/shared/hooks/useCalendarData";

interface CalendarSiteChipProps {
  site: CalendarSite;
  /** true = ocupa varias columnas (inicio del bloque multi-día) */
  isStart?: boolean;
  /** true = continúa de un día anterior (no mostrar nombre) */
  isContinuation?: boolean;
  onClick: (site: CalendarSite) => void;
}

const CalendarSiteChip = ({
  site,
  isStart = true,
  isContinuation = false,
  onClick,
}: CalendarSiteChipProps) => {
  const colorClass =
    STATUS_CHIP_COLORS[site.site_status] ||
    "border-border bg-muted/60 text-muted-foreground";

  return (
    <button
      type="button"
      onClick={() => onClick(site)}
      className={cn(
        "flex w-full items-center gap-1 rounded border px-1.5 py-0.5 text-left text-xs font-medium",
        "transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        colorClass,
        isContinuation && "rounded-l-none border-l-0 opacity-80"
      )}
      title={`${site.site_name} · ${site.project_name} · ${STATUS_LABELS[site.site_status] || site.site_status}`}
    >
      {!isContinuation && (
        <span className="min-w-0 flex-1 truncate leading-tight">{site.site_name}</span>
      )}
      {isContinuation && <span className="flex-1" />}
      {site.assignment_count > 0 && (
        <Users className="h-2.5 w-2.5 flex-shrink-0 opacity-70" />
      )}
    </button>
  );
};

export default CalendarSiteChip;
