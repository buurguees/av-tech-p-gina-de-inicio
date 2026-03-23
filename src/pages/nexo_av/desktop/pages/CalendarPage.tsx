import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  format,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import CalendarHeader, { type CalendarView } from "../components/calendar/CalendarHeader";
import CalendarKpiBar from "../components/calendar/CalendarKpiBar";
import CalendarMonthGrid from "../components/calendar/CalendarMonthGrid";
import CalendarWeekGrid from "../components/calendar/CalendarWeekGrid";
import CalendarSidebar from "../components/calendar/CalendarSidebar";
import CalendarSiteQuickEdit from "../components/calendar/CalendarSiteQuickEdit";
import { useCalendarData } from "@/pages/nexo_av/shared/hooks/useCalendarData";
import type { CalendarSite, UnplannedSite } from "@/pages/nexo_av/shared/hooks/useCalendarData";

const CalendarPage = () => {
  const navigate       = useNavigate();
  const { userId }     = useParams<{ userId: string }>();
  const { toast }      = useToast();

  const [today]         = useState(() => new Date());
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView]               = useState<CalendarView>("month");
  const [selectedSite, setSelectedSite] = useState<CalendarSite | null>(null);
  const [draggingSite, setDraggingSite] = useState<CalendarSite | UnplannedSite | null>(null);

  // Rango de fechas del calendario visible
  const dateFrom = view === "month"
    ? startOfMonth(currentDate)
    : startOfWeek(currentDate, { weekStartsOn: 1 });
  const dateTo = view === "month"
    ? endOfMonth(currentDate)
    : endOfWeek(currentDate, { weekStartsOn: 1 });

  const { sitesByDay, unplannedSites, kpis, loading, refetch } = useCalendarData(
    dateFrom,
    dateTo
  );

  // ── Navegación ────────────────────────────────────────────────────────────
  const handlePrev = () => {
    setCurrentDate((d) =>
      view === "month" ? subMonths(d, 1) : subWeeks(d, 1)
    );
  };
  const handleNext = () => {
    setCurrentDate((d) =>
      view === "month" ? addMonths(d, 1) : addWeeks(d, 1)
    );
  };
  const handleToday = () => setCurrentDate(new Date());

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDropToDay = useCallback(
    async (dateKey: string, site: CalendarSite | UnplannedSite) => {
      const siteId = "site_id" in site ? site.site_id : "";
      if (!siteId) return;

      try {
        const { error } = await supabase.rpc("update_site_planning", {
          p_site_id:            siteId,
          p_planned_start_date: dateKey,
          p_planned_days:       ("planned_days" in site && site.planned_days)
            ? site.planned_days
            : 1,
          p_planned_end_date:   dateKey,
        });
        if (error) throw error;
        toast({ title: "Fecha asignada", description: `Site movido a ${dateKey}` });
        refetch();
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      } finally {
        setDraggingSite(null);
      }
    },
    [refetch, toast]
  );

  const contextLabel =
    view === "month"
      ? format(currentDate, "MMMM yyyy", { locale: undefined })
      : `Semana del ${format(dateFrom, "d MMM yyyy")}`;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Barra superior */}
      <DetailNavigationBar
        pageTitle="Calendario"
        contextInfo={contextLabel}
        onBack={() => navigate(`/nexo-av/${userId}/dashboard`)}
      />

      {/* KPIs */}
      <CalendarKpiBar kpis={kpis} loading={loading} />

      {/* Controles de vista */}
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onViewChange={setView}
      />

      {/* Cuerpo: Sidebar + Grid */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <CalendarSidebar
          currentMonth={view === "month" ? currentDate : startOfMonth(currentDate)}
          onMonthChange={(m) => {
            setCurrentDate(m);
            setView("month");
          }}
          unplannedSites={unplannedSites}
          onDragStart={(s) => setDraggingSite(s)}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
              <span className="text-sm text-muted-foreground">Cargando…</span>
            </div>
          )}

          {view === "month" ? (
            <CalendarMonthGrid
              currentMonth={currentDate}
              sitesByDay={sitesByDay}
              onSiteClick={setSelectedSite}
              onDropToDay={handleDropToDay}
              draggingSite={draggingSite as CalendarSite | null}
            />
          ) : (
            <CalendarWeekGrid
              currentWeek={currentDate}
              sitesByDay={sitesByDay}
              onSiteClick={setSelectedSite}
            />
          )}

          {/* Empty state */}
          {!loading && sitesByDay.size > 0 &&
            [...sitesByDay.values()].every((v) => v.length === 0) &&
            unplannedSites.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm font-medium text-foreground">Sin instalaciones planificadas</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Arrastra sitios desde el panel izquierdo o planifica fechas dentro de cada proyecto.
                </p>
              </div>
            )}
        </div>
      </div>

      {/* Sheet de edición rápida */}
      <CalendarSiteQuickEdit
        site={selectedSite}
        open={selectedSite !== null}
        onClose={() => setSelectedSite(null)}
        onSaved={() => {
          setSelectedSite(null);
          refetch();
        }}
      />
    </div>
  );
};

export default CalendarPage;
