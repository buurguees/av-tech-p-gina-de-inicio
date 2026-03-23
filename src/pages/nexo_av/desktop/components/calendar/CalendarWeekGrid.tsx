import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isSameMonth,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { STATUS_CHIP_COLORS, STATUS_LABELS } from "@/constants/siteStatuses";
import type { CalendarSite } from "@/pages/nexo_av/shared/hooks/useCalendarData";

interface CalendarWeekGridProps {
  currentWeek: Date;
  sitesByDay: Map<string, CalendarSite[]>;
  onSiteClick: (site: CalendarSite) => void;
}

const WEEKDAYS_FULL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const CalendarWeekGrid = ({
  currentWeek,
  sitesByDay,
  onSiteClick,
}: CalendarWeekGridProps) => {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(currentWeek,   { weekStartsOn: 1 });
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Cabecera */}
      <div className="grid grid-cols-7 border-b border-l border-t border-border bg-muted/30">
        {days.map((day, i) => (
          <div
            key={i}
            className={cn(
              "border-r border-border px-2 py-2 text-center",
              isToday(day) && "bg-primary/5"
            )}
          >
            <span className="block text-xs font-medium text-muted-foreground">
              {WEEKDAYS_FULL[i]}
            </span>
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold",
                isToday(day)
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground"
              )}
            >
              {format(day, "d")}
            </span>
          </div>
        ))}
      </div>

      {/* Columnas */}
      <div className="grid flex-1 grid-cols-7 overflow-y-auto border-l border-border">
        {days.map((day) => {
          const key   = format(day, "yyyy-MM-dd");
          const sites = sitesByDay.get(key) || [];

          return (
            <div
              key={key}
              className={cn(
                "flex flex-col gap-1 border-b border-r border-border p-2",
                isToday(day) && "bg-primary/5"
              )}
            >
              {sites.length === 0 && (
                <p className="text-center text-xs text-muted-foreground/50 mt-4">—</p>
              )}
              {sites.map((site) => (
                <button
                  key={site.site_id}
                  type="button"
                  onClick={() => onSiteClick(site)}
                  className={cn(
                    "flex flex-col gap-0.5 rounded border px-2 py-1.5 text-left text-xs",
                    "transition-opacity hover:opacity-80",
                    STATUS_CHIP_COLORS[site.site_status] ||
                      "border-border bg-muted/60 text-muted-foreground"
                  )}
                >
                  <span className="font-medium leading-tight">{site.site_name}</span>
                  <span className="truncate opacity-70">{site.project_name}</span>
                  {site.city && (
                    <span className="flex items-center gap-0.5 opacity-60">
                      <MapPin className="h-2.5 w-2.5" />
                      {site.city}
                    </span>
                  )}
                  {site.assignment_count > 0 && (
                    <span className="flex items-center gap-0.5 opacity-60">
                      <Users className="h-2.5 w-2.5" />
                      {site.assignment_count} técnico
                      {site.assignment_count !== 1 && "s"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarWeekGrid;
