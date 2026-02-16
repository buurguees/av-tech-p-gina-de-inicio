import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, MapPin, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";

interface SiteAssignment {
  id: string;
  site_id: string;
  site_name: string;
  technician_id: string;
  technician_name: string;
  technician_number: string;
  role: string;
  date_from: string | null;
  date_to: string | null;
}

interface SiteVisit {
  id: string;
  site_id: string;
  site_name: string;
  technician_id: string;
  technician_name: string;
  visit_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
}

interface TechnicianGroup {
  technician_id: string;
  technician_name: string;
  technician_number: string;
  assignments: SiteAssignment[];
  visits: SiteVisit[];
}

interface ProjectTechniciansTabProps {
  projectId: string;
}

const ROLE_LABELS: Record<string, string> = {
  INSTALLER: "Instalador",
  LEAD: "Responsable",
  SUPPORT: "Apoyo",
};

const ProjectTechniciansTab = ({ projectId }: ProjectTechniciansTabProps) => {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<TechnicianGroup[]>([]);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get all sites for this project
      const { data: sitesData, error: sitesError } = await supabase.rpc("list_project_sites", {
        p_project_id: projectId,
      });
      if (sitesError) throw sitesError;

      const sites = ((sitesData || []) as any[]).filter((s) => s.is_active);
      const allAssignments: SiteAssignment[] = [];
      const allVisits: SiteVisit[] = [];

      // Fetch assignments and visits for each site in parallel
      await Promise.all(
        sites.map(async (site) => {
          const [assignRes, visitRes] = await Promise.all([
            supabase.rpc("list_site_assignments", { p_site_id: site.id }),
            supabase.rpc("list_site_visits", { p_site_id: site.id }),
          ]);

          ((assignRes.data || []) as any[]).forEach((a) => {
            allAssignments.push({
              ...a,
              site_name: site.site_name,
            });
          });

          ((visitRes.data || []) as any[]).forEach((v) => {
            allVisits.push({
              ...v,
              site_name: site.site_name,
            });
          });
        })
      );

      // Group by technician
      const techMap = new Map<string, TechnicianGroup>();

      for (const a of allAssignments) {
        if (!techMap.has(a.technician_id)) {
          techMap.set(a.technician_id, {
            technician_id: a.technician_id,
            technician_name: a.technician_name,
            technician_number: a.technician_number,
            assignments: [],
            visits: [],
          });
        }
        techMap.get(a.technician_id)!.assignments.push(a);
      }

      for (const v of allVisits) {
        if (!techMap.has(v.technician_id)) {
          techMap.set(v.technician_id, {
            technician_id: v.technician_id,
            technician_name: v.technician_name,
            technician_number: "",
            assignments: [],
            visits: [],
          });
        }
        techMap.get(v.technician_id)!.visits.push(v);
      }

      setGroups(Array.from(techMap.values()).sort((a, b) => a.technician_name.localeCompare(b.technician_name)));
    } catch (err) {
      console.error("Error loading technician data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Sin técnicos asignados</p>
        <p className="text-sm mt-1">Asigna técnicos desde la pestaña "Planificación" de cada sitio.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground">Técnicos del proyecto</h3>
        <p className="text-sm text-muted-foreground">
          {groups.length} técnico{groups.length !== 1 ? "s" : ""} involucrado{groups.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.technician_id} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">{group.technician_name}</span>
                  {group.technician_number && (
                    <span className="text-xs text-muted-foreground">{group.technician_number}</span>
                  )}
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{group.assignments.length} asignación{group.assignments.length !== 1 ? "es" : ""}</span>
                  <span>{group.visits.length} visita{group.visits.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Assignments */}
              {group.assignments.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Asignaciones</p>
                  <div className="space-y-1.5">
                    {group.assignments.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 px-3 py-1.5 bg-muted/30 rounded-md text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">{a.site_name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {ROLE_LABELS[a.role] || a.role}
                        </Badge>
                        {a.date_from && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(a.date_from), "dd/MM")}
                            {a.date_to && ` - ${format(new Date(a.date_to), "dd/MM")}`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visits */}
              {group.visits.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Visitas realizadas</p>
                  <div className="space-y-1.5">
                    {group.visits.map((v) => {
                      const isOpen = !v.check_out_at;
                      return (
                        <div key={v.id} className="flex items-center gap-3 px-3 py-1.5 bg-muted/30 rounded-md text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">{v.site_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(v.visit_date), "dd/MM/yyyy")}
                          </span>
                          {v.check_in_at && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(v.check_in_at), "HH:mm")}
                              {v.check_out_at && ` - ${format(new Date(v.check_out_at), "HH:mm")}`}
                            </span>
                          )}
                          {isOpen && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[10px]">
                              Abierta
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectTechniciansTab;
