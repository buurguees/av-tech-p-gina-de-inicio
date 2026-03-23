import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import CalendarDayCell from "./CalendarDayCell";
import type { CalendarSite } from "@/pages/nexo_av/shared/hooks/useCalendarData";

interface CalendarMonthGridProps {
  currentMonth: Date;
  sitesByDay: Map<string, CalendarSite[]>;
  onSiteClick: (site: CalendarSite) => void;
  onDropToDay: (dateKey: string, site: CalendarSite) => void;
  draggingSite: CalendarSite | null;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const CalendarMonthGrid = ({
  currentMonth,
  sitesByDay,
  onSiteClick,
  onDropToDay,
  draggingSite,
}: CalendarMonthGridProps) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  // Semana completa: lunes a domingo
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 1 });
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Cabecera días de la semana */}
      <div className="grid grid-cols-7 border-b border-l border-t border-border bg-muted/30">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-r border-border px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div
        className="grid flex-1 grid-cols-7 overflow-y-auto border-l border-border"
        style={{ gridAutoRows: "minmax(90px, auto)" }}
      >
        {days.map((day) => {
          const key   = format(day, "yyyy-MM-dd");
          const sites = sitesByDay.get(key) || [];

          return (
            <CalendarDayCell
              key={key}
              date={day}
              dateKey={key}
              sites={sites}
              isToday={isToday(day)}
              isCurrentMonth={isSameMonth(day, currentMonth)}
              onSiteClick={onSiteClick}
              onDrop={(dk) => draggingSite && onDropToDay(dk, draggingSite)}
              isDragOver={false}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CalendarMonthGrid;
