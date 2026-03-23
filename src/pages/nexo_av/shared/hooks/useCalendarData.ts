import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addDays,
  parseISO,
} from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarSiteAssignment {
  technician_id: string;
  technician_name: string;
  role: string;
  date_from: string | null;
  date_to: string | null;
}

export interface CalendarSite {
  site_id: string;
  site_name: string;
  site_status: string;
  site_reference: string | null;
  city: string | null;
  province: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  planned_days: number | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  project_id: string;
  project_name: string;
  client_id: string | null;
  client_name: string;
  assignment_count: number;
  assignments: CalendarSiteAssignment[];
}

export interface UnplannedSite {
  site_id: string;
  site_name: string;
  site_status: string;
  city: string | null;
  project_id: string;
  project_name: string;
  client_id: string | null;
  client_name: string;
}

export interface CalendarKpis {
  planned: number;
  inProgress: number;
  withoutTechnician: number;
  readyToInvoice: number;
}

export interface UseCalendarDataResult {
  /** Sites agrupados por día (clave: "yyyy-MM-dd").
   *  Un site multi-día aparece en TODAS las fechas que ocupa. */
  sitesByDay: Map<string, CalendarSite[]>;
  /** Sites sin planned_start_date */
  unplannedSites: UnplannedSite[];
  kpis: CalendarKpis;
  loading: boolean;
  refetch: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCalendarData(
  /** Primer día del rango visible (generalmente startOfMonth) */
  dateFrom: Date,
  /** Último día del rango visible (generalmente endOfMonth) */
  dateTo: Date,
  /** Filtrar por estados concretos; null = todos */
  statuses: string[] | null = null,
  /** Filtrar por técnico; null = todos */
  technicianId: string | null = null
): UseCalendarDataResult {
  const [sites, setSites] = useState<CalendarSite[]>([]);
  const [unplannedSites, setUnplannedSites] = useState<UnplannedSite[]>([]);
  const [loading, setLoading] = useState(true);

  const fromStr = format(dateFrom, "yyyy-MM-dd");
  const toStr   = format(dateTo,   "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Llamadas en paralelo
      const [calendarRes, unplannedRes] = await Promise.all([
        supabase.rpc("list_calendar_sites", {
          p_date_from:     fromStr,
          p_date_to:       toStr,
          p_statuses:      statuses ?? null,
          p_technician_id: technicianId ?? null,
        }),
        supabase.rpc("list_unplanned_sites"),
      ]);

      if (calendarRes.error) throw calendarRes.error;
      if (unplannedRes.error) throw unplannedRes.error;

      const rawSites = ((calendarRes.data || []) as any[]).map<CalendarSite>((s) => ({
        site_id:            s.site_id,
        site_name:          s.site_name,
        site_status:        s.site_status || "PLANNED",
        site_reference:     s.site_reference ?? null,
        city:               s.city ?? null,
        province:           s.province ?? null,
        planned_start_date: s.planned_start_date ?? null,
        planned_end_date:   s.planned_end_date ?? null,
        planned_days:       s.planned_days ? Number(s.planned_days) : null,
        actual_start_at:    s.actual_start_at ?? null,
        actual_end_at:      s.actual_end_at ?? null,
        project_id:         s.project_id,
        project_name:       s.project_name || "",
        client_id:          s.client_id ?? null,
        client_name:        s.client_name || "",
        assignment_count:   Number(s.assignment_count || 0),
        assignments:        Array.isArray(s.assignments) ? s.assignments : [],
      }));

      const rawUnplanned = ((unplannedRes.data || []) as any[]).map<UnplannedSite>((s) => ({
        site_id:      s.site_id,
        site_name:    s.site_name,
        site_status:  s.site_status || "PLANNED",
        city:         s.city ?? null,
        project_id:   s.project_id,
        project_name: s.project_name || "",
        client_id:    s.client_id ?? null,
        client_name:  s.client_name || "",
      }));

      setSites(rawSites);
      setUnplannedSites(rawUnplanned);
    } catch (err) {
      console.error("[useCalendarData] error:", err);
    } finally {
      setLoading(false);
    }
  }, [fromStr, toStr, statuses ? JSON.stringify(statuses) : null, technicianId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Agrupar sites por día ─────────────────────────────────────────────────
  const sitesByDay = buildSitesByDay(sites, dateFrom, dateTo);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = buildKpis(sites);

  return { sitesByDay, unplannedSites, kpis, loading, refetch: fetchData };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Distribuye cada site en TODAS las fechas del rango que ocupa.
 * Un site con planned_start_date + planned_days aparece en cada día de ese rango.
 */
function buildSitesByDay(
  sites: CalendarSite[],
  rangeFrom: Date,
  rangeTo: Date
): Map<string, CalendarSite[]> {
  const map = new Map<string, CalendarSite[]>();

  // Inicializar todas las fechas del rango con array vacío
  for (const day of eachDayOfInterval({ start: rangeFrom, end: rangeTo })) {
    map.set(format(day, "yyyy-MM-dd"), []);
  }

  for (const site of sites) {
    if (!site.planned_start_date) continue;

    const start = parseISO(site.planned_start_date);
    const end   = site.planned_end_date
      ? parseISO(site.planned_end_date)
      : site.planned_days
        ? addDays(start, site.planned_days - 1)
        : start;

    for (const day of eachDayOfInterval({ start, end })) {
      const key = format(day, "yyyy-MM-dd");
      if (map.has(key)) {
        map.get(key)!.push(site);
      }
    }
  }

  return map;
}

function buildKpis(sites: CalendarSite[]): CalendarKpis {
  let planned = 0, inProgress = 0, withoutTechnician = 0, readyToInvoice = 0;

  for (const site of sites) {
    if (site.planned_start_date) planned++;
    if (site.site_status === "IN_PROGRESS") inProgress++;
    if (site.assignment_count === 0 && !["INVOICED", "CLOSED"].includes(site.site_status)) {
      withoutTechnician++;
    }
    if (site.site_status === "READY_TO_INVOICE") readyToInvoice++;
  }

  return { planned, inProgress, withoutTechnician, readyToInvoice };
}
