import { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileCalendarAgenda from "../components/calendar/MobileCalendarAgenda";
import { useCalendarData } from "@/pages/nexo_av/shared/hooks/useCalendarData";

const MobileCalendarPage = () => {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const dateFrom = startOfMonth(currentMonth);
  const dateTo   = endOfMonth(currentMonth);

  const { sitesByDay, unplannedSites, kpis, loading } = useCalendarData(
    dateFrom,
    dateTo
  );

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: es });

  return (
    <div className="mobile-page-viewport bg-background">
      {/* Header compacto */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 px-4 py-3 supports-[backdrop-filter]:backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-base font-semibold capitalize text-foreground">
            {monthLabel}
          </h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPI pills */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {[
            { label: "Planificados", value: kpis.planned,           color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
            { label: "En progreso",  value: kpis.inProgress,        color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
            { label: "Sin técnico",  value: kpis.withoutTechnician, color: kpis.withoutTechnician > 0 ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground" },
            { label: "A facturar",   value: kpis.readyToInvoice,    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
          ].map((k) => (
            <span
              key={k.label}
              className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${k.color}`}
            >
              {k.label}: {loading ? "—" : k.value}
            </span>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="mobile-scroll-area">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <MobileCalendarAgenda
            sitesByDay={sitesByDay}
            unplannedSites={unplannedSites}
          />
        )}
      </div>
    </div>
  );
};

export default MobileCalendarPage;
