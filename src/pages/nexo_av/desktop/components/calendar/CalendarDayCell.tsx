import { cn } from "@/lib/utils";
import CalendarSiteChip from "./CalendarSiteChip";
import type { CalendarSite } from "@/pages/nexo_av/shared/hooks/useCalendarData";

interface CalendarDayCellProps {
  date: Date;
  dateKey: string;
  sites: CalendarSite[];
  isToday: boolean;
  isCurrentMonth: boolean;
  onSiteClick: (site: CalendarSite) => void;
  onDrop?: (dateKey: string) => void;
  isDragOver?: boolean;
}

const MAX_VISIBLE = 3;

const CalendarDayCell = ({
  date,
  dateKey,
  sites,
  isToday,
  isCurrentMonth,
  onSiteClick,
  onDrop,
  isDragOver = false,
}: CalendarDayCellProps) => {
  const dayNumber = date.getDate();
  const overflow  = sites.length - MAX_VISIBLE;
  const visible   = sites.slice(0, MAX_VISIBLE);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop?.(dateKey);
  };

  return (
    <div
      className={cn(
        "relative flex min-h-[90px] flex-col gap-0.5 border-b border-r border-border p-1",
        "transition-colors",
        !isCurrentMonth && "bg-muted/20",
        isDragOver && "bg-primary/5 ring-1 ring-inset ring-primary/30"
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Número del día */}
      <span
        className={cn(
          "mb-0.5 flex h-5 w-5 items-center justify-center self-end rounded-full text-xs font-medium",
          isToday
            ? "bg-primary text-primary-foreground"
            : isCurrentMonth
              ? "text-foreground"
              : "text-muted-foreground"
        )}
      >
        {dayNumber}
      </span>

      {/* Chips de sites */}
      {visible.map((site) => (
        <CalendarSiteChip
          key={`${site.site_id}-${dateKey}`}
          site={site}
          onClick={onSiteClick}
        />
      ))}

      {/* Overflow */}
      {overflow > 0 && (
        <span className="px-1.5 text-[10px] text-muted-foreground">
          +{overflow} más
        </span>
      )}
    </div>
  );
};

export default CalendarDayCell;
