import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, GripVertical } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, STATUS_LABELS } from "@/constants/siteStatuses";
import type { UnplannedSite, CalendarSite } from "@/pages/nexo_av/shared/hooks/useCalendarData";

interface CalendarSidebarProps {
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  unplannedSites: UnplannedSite[];
  onDragStart: (site: CalendarSite | UnplannedSite) => void;
}

const CalendarSidebar = ({
  currentMonth,
  onMonthChange,
  unplannedSites,
  onDragStart,
}: CalendarSidebarProps) => {
  return (
    <div className="flex w-[220px] flex-shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-3">
      {/* Mini calendario */}
      <div>
        <DayPicker
          mode="single"
          month={currentMonth}
          onMonthChange={onMonthChange}
          locale={es}
          showOutsideDays={false}
          classNames={{
            root:          "text-[11px] w-full",
            months:        "w-full",
            month:         "w-full",
            caption:       "flex justify-between items-center mb-1 px-1",
            caption_label: "text-xs font-semibold capitalize text-foreground",
            nav:           "flex gap-1",
            nav_button:    "h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground",
            table:         "w-full border-collapse",
            head_row:      "flex",
            head_cell:     "flex-1 text-center text-[10px] text-muted-foreground font-medium pb-1",
            row:           "flex mt-0.5",
            cell:          "flex-1 text-center",
            day:           "h-5 w-full rounded text-[11px] hover:bg-muted transition-colors",
            day_selected:  "bg-primary text-primary-foreground hover:bg-primary",
            day_today:     "font-semibold text-primary",
            day_outside:   "text-muted-foreground/40",
          }}
        />
      </div>

      {/* Panel Sin planificar */}
      <div className="flex flex-1 flex-col min-h-0">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Sin planificar
          {unplannedSites.length > 0 && (
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium">
              {unplannedSites.length}
            </span>
          )}
        </h3>

        {unplannedSites.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/60">
            Todos los sitios tienen fecha asignada.
          </p>
        ) : (
          <div className="flex flex-col gap-1 overflow-y-auto">
            {unplannedSites.map((site) => (
              <div
                key={site.site_id}
                draggable
                onDragStart={() => onDragStart(site as any)}
                className={cn(
                  "group flex cursor-grab items-start gap-1.5 rounded border px-2 py-1.5",
                  "border-border bg-card transition-colors hover:bg-muted/50",
                  "active:cursor-grabbing"
                )}
                title="Arrastra al calendario para planificar"
              >
                <GripVertical className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium leading-tight text-foreground">
                    {site.site_name}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {site.project_name}
                  </p>
                  {site.city && (
                    <p className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
                      <MapPin className="h-2.5 w-2.5" />
                      {site.city}
                    </p>
                  )}
                  <Badge
                    className={`mt-0.5 ${STATUS_COLORS[site.site_status] || "bg-muted text-muted-foreground"} border-0 text-[9px]`}
                  >
                    {STATUS_LABELS[site.site_status] || site.site_status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {unplannedSites.length > 0 && (
          <p className="mt-2 text-[10px] text-muted-foreground/60">
            Arrastra un sitio al calendario para asignarle fecha.
          </p>
        )}
      </div>
    </div>
  );
};

export default CalendarSidebar;
