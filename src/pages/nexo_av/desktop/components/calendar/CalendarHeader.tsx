import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarView = "month" | "week";

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (v: CalendarView) => void;
}

const CalendarHeader = ({
  currentDate,
  view,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}: CalendarHeaderProps) => {
  const label =
    view === "month"
      ? format(currentDate, "MMMM yyyy", { locale: es })
      : `Semana del ${format(currentDate, "d MMM", { locale: es })}`;

  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-2">
      {/* Navegación */}
      <Button variant="ghost" size="icon" onClick={onPrev} className="h-7 w-7">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onNext} className="h-7 w-7">
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Título */}
      <h2 className="min-w-[160px] text-sm font-semibold capitalize text-foreground">
        {label}
      </h2>

      <Button variant="outline" size="sm" onClick={onToday} className="h-7 text-xs">
        Hoy
      </Button>

      <div className="flex-1" />

      {/* Toggle Mes / Semana */}
      <div className="flex rounded-md border border-border">
        <button
          type="button"
          onClick={() => onViewChange("month")}
          className={cn(
            "flex items-center gap-1.5 rounded-l-md px-2.5 py-1 text-xs font-medium transition-colors",
            view === "month"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Mes
        </button>
        <button
          type="button"
          onClick={() => onViewChange("week")}
          className={cn(
            "flex items-center gap-1.5 rounded-r-md border-l border-border px-2.5 py-1 text-xs font-medium transition-colors",
            view === "week"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <List className="h-3.5 w-3.5" />
          Semana
        </button>
      </div>
    </div>
  );
};

export default CalendarHeader;
