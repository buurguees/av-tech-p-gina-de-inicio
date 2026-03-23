import {
  isToday,
  isTomorrow,
  isThisWeek,
  isNextWeek,
  format,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate, useParams } from "react-router-dom";
import { MapPin, Users, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, STATUS_LABELS } from "@/constants/siteStatuses";
import type { CalendarSite, UnplannedSite } from "@/pages/nexo_av/shared/hooks/useCalendarData";

interface AgendaSection {
  title: string;
  sites: CalendarSite[];
}

interface MobileCalendarAgendaProps {
  sitesByDay: Map<string, CalendarSite[]>;
  unplannedSites: UnplannedSite[];
}

const SiteCard = ({ site }: { site: CalendarSite }) => {
  const navigate   = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const statusColor =
    STATUS_COLORS[site.site_status] || "bg-muted text-muted-foreground";

  return (
    <button
      type="button"
      onClick={() => navigate(`/nexo-av/${userId}/projects/${site.project_id}`)}
      className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-1">
          <span className="text-sm font-semibold text-foreground leading-tight">
            {site.site_name}
          </span>
          <Badge className={`${statusColor} border-0 text-[10px] flex-shrink-0`}>
            {STATUS_LABELS[site.site_status] || site.site_status}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">{site.project_name}</p>
        {site.client_name && (
          <p className="truncate text-xs text-muted-foreground/70">{site.client_name}</p>
        )}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {site.city && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {site.city}
            </span>
          )}
          {site.assignment_count > 0 && (
            <span className="flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              {site.assignment_count} técnico{site.assignment_count !== 1 && "s"}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
    </button>
  );
};

const AgendaSectionBlock = ({ title, sites }: { title: string; sites: CalendarSite[] }) => {
  if (sites.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {sites.map((site) => (
        <SiteCard key={site.site_id} site={site} />
      ))}
    </div>
  );
};

const MobileCalendarAgenda = ({
  sitesByDay,
  unplannedSites,
}: MobileCalendarAgendaProps) => {
  // Agrupar en secciones por proximidad temporal
  const sections: AgendaSection[] = [
    { title: "Hoy",           sites: [] },
    { title: "Mañana",        sites: [] },
    { title: "Esta semana",   sites: [] },
    { title: "Próxima semana", sites: [] },
    { title: "Más adelante",  sites: [] },
  ];

  // Deduplicar: un site multi-día aparece solo una vez (por su planned_start_date)
  const seen = new Set<string>();

  for (const [dateKey, daySites] of sitesByDay) {
    const date = parseISO(dateKey);
    for (const site of daySites) {
      if (seen.has(site.site_id)) continue;
      // Solo incluir en la sección correspondiente a su planned_start_date
      if (site.planned_start_date && site.planned_start_date !== dateKey) continue;
      seen.add(site.site_id);

      if (isToday(date))        sections[0].sites.push(site);
      else if (isTomorrow(date)) sections[1].sites.push(site);
      else if (isThisWeek(date, { weekStartsOn: 1 })) sections[2].sites.push(site);
      else if (isNextWeek(date, { weekStartsOn: 1 })) sections[3].sites.push(site);
      else                      sections[4].sites.push(site);
    }
  }

  const totalSites = sections.reduce((sum, s) => sum + s.sites.length, 0);

  return (
    <div className="space-y-6 px-4 py-4">
      {totalSites === 0 && unplannedSites.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-sm font-medium text-foreground">Sin instalaciones planificadas</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Accede a un proyecto para planificar fechas en cada sitio de instalación.
          </p>
        </div>
      )}

      {sections.map((sec) => (
        <AgendaSectionBlock key={sec.title} title={sec.title} sites={sec.sites} />
      ))}

      {/* Sin planificar */}
      {unplannedSites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sin planificar ({unplannedSites.length})
          </h3>
          {unplannedSites.map((site) => (
            <div
              key={site.site_id}
              className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-card/60 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{site.site_name}</p>
                <p className="truncate text-xs text-muted-foreground">{site.project_name}</p>
                {site.city && (
                  <p className="flex items-center gap-0.5 text-[11px] text-muted-foreground/70">
                    <MapPin className="h-3 w-3" />
                    {site.city}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileCalendarAgenda;
