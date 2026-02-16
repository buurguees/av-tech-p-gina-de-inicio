import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Calendar,
  Users,
  Clock,
  Plus,
  Play,
  Square,
  CheckCircle,
  FileText,
  Loader2,
  ChevronRight,
  CalendarCheck,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ───────────────────────────────────────────
interface PlanSite {
  id: string;
  site_name: string;
  city: string | null;
  site_status: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  planned_days: number | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  is_default: boolean;
  assignment_count: number;
  visit_count: number;
}

interface Assignment {
  id: string;
  technician_id: string;
  technician_name: string;
  technician_number: string;
  role: string;
  date_from: string | null;
  date_to: string | null;
  notes: string | null;
}

interface Visit {
  id: string;
  technician_id: string;
  technician_name: string;
  visit_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  notes: string | null;
}

interface Technician {
  id: string;
  company_name: string;
  technician_number: string;
}

interface ProjectPlanningTabProps {
  projectId: string;
  siteMode?: string | null;
}

// ─── Status helpers ──────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  PLANNED: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  IN_PROGRESS: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  READY_TO_INVOICE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  INVOICED: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  CLOSED: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planificado",
  SCHEDULED: "Programado",
  IN_PROGRESS: "En ejecución",
  READY_TO_INVOICE: "Listo para facturar",
  INVOICED: "Facturado",
  CLOSED: "Cerrado",
};

const StatusBadge = ({ status }: { status: string }) => (
  <Badge className={`${STATUS_COLORS[status] || "bg-muted text-muted-foreground"} border-0 text-xs`}>
    {STATUS_LABELS[status] || status}
  </Badge>
);

// ─── Main Component ──────────────────────────────────
const ProjectPlanningTab = ({ projectId, siteMode }: ProjectPlanningTabProps) => {
  const { toast } = useToast();
  const [sites, setSites] = useState<PlanSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  useEffect(() => {
    fetchSites();
  }, [projectId]);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_project_sites", { p_project_id: projectId });
      if (error) throw error;
      const activeSites = ((data || []) as any[]).filter((s) => s.is_active).map((s) => ({
        id: s.id,
        site_name: s.site_name,
        city: s.city,
        site_status: s.site_status || "PLANNED",
        planned_start_date: s.planned_start_date,
        planned_end_date: s.planned_end_date,
        planned_days: s.planned_days,
        actual_start_at: s.actual_start_at,
        actual_end_at: s.actual_end_at,
        is_default: s.is_default,
        assignment_count: Number(s.assignment_count || 0),
        visit_count: Number(s.visit_count || 0),
      }));
      setSites(activeSites);
      // Auto-select first/default
      if (activeSites.length > 0 && !selectedSiteId) {
        const def = activeSites.find((s) => s.is_default) || activeSites[0];
        setSelectedSiteId(def.id);
      }
    } catch (err) {
      console.error("Error fetching sites:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || null;
  const isSingle = siteMode === "SINGLE_SITE" || sites.length <= 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Sin sitios configurados</p>
        <p className="text-sm mt-1">Crea al menos un sitio en la pestaña "Sitios" para usar la planificación.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[500px]">
      {/* Left panel: site list (only for multi-site) */}
      {!isSingle && (
        <div className="w-72 border-r border-border overflow-y-auto">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Sitios</h3>
          </div>
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => setSelectedSiteId(site.id)}
              className={`w-full text-left px-4 py-3 border-b border-border transition-colors hover:bg-accent/50 ${
                selectedSiteId === site.id ? "bg-accent" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-foreground truncate">{site.site_name}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={site.site_status} />
                {site.city && <span className="text-xs text-muted-foreground truncate">{site.city}</span>}
              </div>
              <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{site.assignment_count}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{site.visit_count}</span>
                {site.planned_start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(site.planned_start_date), "dd/MM")}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Right panel: site detail */}
      <div className="flex-1 overflow-y-auto">
        {selectedSite ? (
          <SiteDetailPanel
            site={selectedSite}
            onRefresh={fetchSites}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Selecciona un sitio</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Site Detail Panel ───────────────────────────────
const SiteDetailPanel = ({
  site,
  onRefresh,
}: {
  site: PlanSite;
  onRefresh: () => void;
}) => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // Planning form
  const [planStart, setPlanStart] = useState(site.planned_start_date || "");
  const [planDays, setPlanDays] = useState(site.planned_days?.toString() || "");
  const [planEnd, setPlanEnd] = useState(site.planned_end_date || "");
  const [savingPlan, setSavingPlan] = useState(false);

  // Dialogs
  const [assignDialog, setAssignDialog] = useState(false);
  const [visitDialog, setVisitDialog] = useState(false);
  const [assignTechId, setAssignTechId] = useState("");
  const [assignRole, setAssignRole] = useState("INSTALLER");
  const [assignDateFrom, setAssignDateFrom] = useState("");
  const [assignDateTo, setAssignDateTo] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [visitTechId, setVisitTechId] = useState("");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [visitNotes, setVisitNotes] = useState("");
  const [savingAssign, setSavingAssign] = useState(false);
  const [savingVisit, setSavingVisit] = useState(false);

  // Reset form when site changes
  useEffect(() => {
    setPlanStart(site.planned_start_date || "");
    setPlanDays(site.planned_days?.toString() || "");
    setPlanEnd(site.planned_end_date || "");
    loadData();
    loadTechnicians();
  }, [site.id]);

  // Auto-calculate end date
  useEffect(() => {
    if (planStart && planDays) {
      const start = new Date(planStart);
      const days = parseInt(planDays, 10);
      if (!isNaN(days) && days > 0) {
        start.setDate(start.getDate() + days - 1);
        setPlanEnd(start.toISOString().split("T")[0]);
      }
    }
  }, [planStart, planDays]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [assignRes, visitRes] = await Promise.all([
        supabase.rpc("list_site_assignments", { p_site_id: site.id }),
        supabase.rpc("list_site_visits", { p_site_id: site.id }),
      ]);
      setAssignments((assignRes.data || []) as Assignment[]);
      setVisits((visitRes.data || []) as Visit[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadTechnicians = async () => {
    try {
      const { data } = await supabase.rpc("list_technicians", { p_search: null });
      setTechnicians(
        ((data || []) as any[]).map((t) => ({
          id: t.id,
          company_name: t.company_name,
          technician_number: t.technician_number,
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePlanning = async () => {
    setSavingPlan(true);
    try {
      const { error } = await supabase.rpc("update_site_planning", {
        p_site_id: site.id,
        p_planned_start_date: planStart || null,
        p_planned_days: planDays ? parseInt(planDays, 10) : null,
        p_planned_end_date: planEnd || null,
      });
      if (error) throw error;
      toast({ title: "Planificación guardada" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingPlan(false);
    }
  };

  const handleMarkActualStart = async () => {
    try {
      const { error } = await supabase.rpc("set_site_actual_dates", {
        p_site_id: site.id,
        p_actual_start_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast({ title: "Inicio real registrado" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleMarkActualEnd = async (markReady: boolean) => {
    try {
      const { error } = await supabase.rpc("set_site_actual_dates", {
        p_site_id: site.id,
        p_actual_end_at: new Date().toISOString(),
        p_mark_ready_to_invoice: markReady,
      });
      if (error) throw error;
      toast({ title: markReady ? "Marcado listo para facturar" : "Fin real registrado" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAddAssignment = async () => {
    if (!assignTechId) return;
    setSavingAssign(true);
    try {
      const { error } = await supabase.rpc("upsert_site_assignment", {
        p_site_id: site.id,
        p_technician_id: assignTechId,
        p_role: assignRole || "INSTALLER",
        p_date_from: assignDateFrom || null,
        p_date_to: assignDateTo || null,
        p_notes: assignNotes || null,
      });
      if (error) throw error;
      toast({ title: "Técnico asignado" });
      setAssignDialog(false);
      setAssignTechId("");
      setAssignRole("INSTALLER");
      setAssignDateFrom("");
      setAssignDateTo("");
      setAssignNotes("");
      loadData();
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingAssign(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await supabase.rpc("delete_site_assignment", { p_assignment_id: id });
      toast({ title: "Asignación eliminada" });
      loadData();
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAddVisit = async () => {
    if (!visitTechId) return;
    setSavingVisit(true);
    try {
      const { error } = await supabase.rpc("register_site_visit", {
        p_site_id: site.id,
        p_technician_id: visitTechId,
        p_visit_date: visitDate || null,
        p_check_in_at: new Date().toISOString(),
        p_notes: visitNotes || null,
      });
      if (error) throw error;
      toast({ title: "Visita registrada" });
      setVisitDialog(false);
      setVisitTechId("");
      setVisitDate(new Date().toISOString().split("T")[0]);
      setVisitNotes("");
      loadData();
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingVisit(false);
    }
  };

  const handleCloseVisit = async (visitId: string) => {
    try {
      await supabase.rpc("close_site_visit", { p_visit_id: visitId });
      toast({ title: "Visita cerrada" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-bold text-foreground">{site.site_name}</h3>
            {site.city && <p className="text-sm text-muted-foreground">{site.city}</p>}
          </div>
          <StatusBadge status={site.site_status} />
        </div>
      </div>

      {/* Planning Section */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-foreground text-sm">Fechas planificadas</h4>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha inicio</Label>
            <Input type="date" value={planStart} onChange={(e) => setPlanStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Días de trabajo</Label>
            <Input
              type="number"
              min={1}
              value={planDays}
              onChange={(e) => setPlanDays(e.target.value)}
              placeholder="Nº días"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha fin (calculada)</Label>
            <Input type="date" value={planEnd} onChange={(e) => setPlanEnd(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button size="sm" onClick={handleSavePlanning} disabled={savingPlan}>
            {savingPlan && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Guardar planificación
          </Button>
        </div>
      </div>

      {/* Actual Dates / Actions */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-foreground text-sm">Ejecución real</h4>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Inicio real</p>
            <p className="text-sm font-medium">
              {site.actual_start_at
                ? format(new Date(site.actual_start_at), "dd/MM/yyyy HH:mm")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Fin real</p>
            <p className="text-sm font-medium">
              {site.actual_end_at
                ? format(new Date(site.actual_end_at), "dd/MM/yyyy HH:mm")
                : "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!site.actual_start_at && site.site_status !== "CLOSED" && (
            <Button size="sm" variant="outline" onClick={handleMarkActualStart} className="gap-1.5">
              <Play className="h-3.5 w-3.5" /> Marcar inicio real
            </Button>
          )}
          {site.actual_start_at && !site.actual_end_at && (
            <>
              <Button size="sm" variant="outline" onClick={() => handleMarkActualEnd(false)} className="gap-1.5">
                <Square className="h-3.5 w-3.5" /> Marcar fin real
              </Button>
              <Button size="sm" onClick={() => handleMarkActualEnd(true)} className="gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Listo para facturar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Assignments */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-foreground text-sm">Equipo asignado</h4>
            <span className="text-xs text-muted-foreground">({assignments.length})</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAssignDialog(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Asignar
          </Button>
        </div>

        {loadingData ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
        ) : assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin técnicos asignados</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium">{a.technician_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.role}
                      {a.date_from && ` · ${format(new Date(a.date_from), "dd/MM")}`}
                      {a.date_to && ` - ${format(new Date(a.date_to), "dd/MM")}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => handleDeleteAssignment(a.id)}
                >
                  Quitar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visits */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-foreground text-sm">Visitas</h4>
            <span className="text-xs text-muted-foreground">({visits.length})</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setVisitDialog(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Registrar visita
          </Button>
        </div>

        {loadingData ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
        ) : visits.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin visitas registradas</p>
        ) : (
          <div className="space-y-2">
            {visits.map((v) => {
              const isOpen = !v.check_out_at;
              return (
                <div key={v.id} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{v.technician_name}</p>
                      {isOpen && (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[10px]">
                          Abierta
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(v.visit_date), "dd/MM/yyyy")}
                      {v.check_in_at && ` · Entrada: ${format(new Date(v.check_in_at), "HH:mm")}`}
                      {v.check_out_at && ` · Salida: ${format(new Date(v.check_out_at), "HH:mm")}`}
                    </p>
                    {v.notes && <p className="text-xs text-muted-foreground mt-0.5">{v.notes}</p>}
                  </div>
                  {isOpen && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleCloseVisit(v.id)}>
                      Cerrar visita
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assignment Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Asignar técnico
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Técnico *</Label>
              <Select value={assignTechId || undefined} onValueChange={setAssignTechId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar técnico..." /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.company_name} ({t.technician_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rol</Label>
              <Select value={assignRole} onValueChange={setAssignRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSTALLER">Instalador</SelectItem>
                  <SelectItem value="LEAD">Responsable</SelectItem>
                  <SelectItem value="SUPPORT">Apoyo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Desde</Label>
                <Input type="date" value={assignDateFrom} onChange={(e) => setAssignDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hasta</Label>
                <Input type="date" value={assignDateTo} onChange={(e) => setAssignDateTo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notas</Label>
              <Textarea value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddAssignment} disabled={savingAssign || !assignTechId}>
              {savingAssign && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visit Dialog */}
      <Dialog open={visitDialog} onOpenChange={setVisitDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Registrar visita
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Técnico *</Label>
              <Select value={visitTechId || undefined} onValueChange={setVisitTechId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar técnico..." /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.company_name} ({t.technician_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha</Label>
              <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notas</Label>
              <Textarea value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVisitDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddVisit} disabled={savingVisit || !visitTechId}>
              {savingVisit && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectPlanningTab;
