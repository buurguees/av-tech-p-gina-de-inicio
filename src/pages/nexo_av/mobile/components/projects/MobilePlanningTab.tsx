/**
 * MobilePlanningTab - Pestaña de planificación de sitios para móvil
 * Versión móvil del ProjectPlanningTab de desktop
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Receipt,
  Eye,
  Loader2,
  CalendarCheck,
  ClipboardList,
  Lock,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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

interface SiteFinancials {
  quoted_total: number;
  quoted_count: number;
  invoiced_total: number;
  invoiced_count: number;
  paid_total: number;
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

interface MobilePlanningTabProps {
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
  READY_TO_INVOICE: "Listo p/ facturar",
  INVOICED: "Facturado",
  CLOSED: "Cerrado",
};

const FILTER_STATUSES = [
  { value: "ALL", label: "Todos" },
  { value: "PLANNED", label: "Planificado" },
  { value: "SCHEDULED", label: "Programado" },
  { value: "IN_PROGRESS", label: "En ejecución" },
  { value: "READY_TO_INVOICE", label: "Listo" },
  { value: "INVOICED", label: "Facturado" },
  { value: "CLOSED", label: "Cerrado" },
];

const STATUS_CTA: Record<string, { label: string; icon: React.ElementType }> = {
  PLANNED: { label: "Planificar", icon: CalendarCheck },
  SCHEDULED: { label: "Asignar equipo", icon: Users },
  IN_PROGRESS: { label: "Marcar fin", icon: Square },
  READY_TO_INVOICE: { label: "Crear factura", icon: Receipt },
  INVOICED: { label: "Ver factura", icon: Eye },
  CLOSED: { label: "Ver resumen", icon: Eye },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const StatusBadge = ({ status }: { status: string }) => (
  <Badge className={`${STATUS_COLORS[status] || "bg-muted text-muted-foreground"} border-0 text-[10px]`}>
    {STATUS_LABELS[status] || status}
  </Badge>
);

// ─── Main Component ──────────────────────────────────
const MobilePlanningTab = ({ projectId, siteMode }: MobilePlanningTabProps) => {
  const [sites, setSites] = useState<PlanSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

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
      // Auto-expand first site on single-site mode
      if (activeSites.length === 1) {
        setExpandedSiteId(activeSites[0].id);
      }
    } catch (err) {
      console.error("Error fetching sites:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = statusFilter === "ALL" ? sites : sites.filter((s) => s.site_status === statusFilter);
  const statusCounts = sites.reduce<Record<string, number>>((acc, s) => {
    acc[s.site_status] = (acc[s.site_status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="p-4 bg-white/5 rounded-full mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">Sin sitios</h3>
        <p className="text-sm text-muted-foreground">Configura sitios desde el escritorio para usar la planificación.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Filter pills */}
      {sites.length > 1 && (
        <div className="flex overflow-x-auto scrollbar-hide gap-1.5 pb-1">
          {FILTER_STATUSES.map((st) => {
            const count = st.value === "ALL" ? sites.length : (statusCounts[st.value] || 0);
            if (st.value !== "ALL" && count === 0) return null;
            const isActive = statusFilter === st.value;
            return (
              <button
                key={st.value}
                onClick={() => setStatusFilter(st.value)}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors flex-shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border"
                )}
                style={{ touchAction: "manipulation" }}
              >
                {st.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Site cards */}
      {filteredSites.map((site) => (
        <MobileSiteCard
          key={site.id}
          site={site}
          projectId={projectId}
          isExpanded={expandedSiteId === site.id}
          onToggle={() => setExpandedSiteId(expandedSiteId === site.id ? null : site.id)}
          onRefresh={fetchSites}
        />
      ))}

      {filteredSites.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Sin sitios en este estado
        </div>
      )}
    </div>
  );
};

// ─── Site Card ───────────────────────────────────────
const MobileSiteCard = ({
  site,
  projectId,
  isExpanded,
  onToggle,
  onRefresh,
}: {
  site: PlanSite;
  projectId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const isLocked = site.site_status === "INVOICED" || site.site_status === "CLOSED";
  const cta = STATUS_CTA[site.site_status];

  // Expanded data
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [financials, setFinancials] = useState<SiteFinancials | null>(null);
  const [loadingData, setLoadingData] = useState(false);
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

  useEffect(() => {
    setPlanStart(site.planned_start_date || "");
    setPlanDays(site.planned_days?.toString() || "");
    setPlanEnd(site.planned_end_date || "");
  }, [site.id]);

  useEffect(() => {
    if (isExpanded) {
      loadData();
      loadTechnicians();
    }
  }, [isExpanded, site.id]);

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
      const [assignRes, visitRes, finRes] = await Promise.all([
        supabase.rpc("list_site_assignments", { p_site_id: site.id }),
        supabase.rpc("list_site_visits", { p_site_id: site.id }),
        supabase.rpc("get_site_financials", { p_site_id: site.id }),
      ]);
      setAssignments((assignRes.data || []) as Assignment[]);
      setVisits((visitRes.data || []) as Visit[]);
      if (finRes.data && (finRes.data as any[]).length > 0) {
        const f = (finRes.data as any[])[0];
        setFinancials({
          quoted_total: Number(f.quoted_total || 0),
          quoted_count: Number(f.quoted_count || 0),
          invoiced_total: Number(f.invoiced_total || 0),
          invoiced_count: Number(f.invoiced_count || 0),
          paid_total: Number(f.paid_total || 0),
        });
      }
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
      toast({ title: markReady ? "Listo para facturar" : "Fin real registrado" });
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

  const handleCTA = () => {
    switch (site.site_status) {
      case "PLANNED":
        if (!isExpanded) onToggle();
        break;
      case "SCHEDULED":
        setAssignDialog(true);
        break;
      case "IN_PROGRESS":
        handleMarkActualEnd(true);
        break;
      case "READY_TO_INVOICE":
        if (userId) {
          navigate(`/nexo-av/${userId}/invoices/new?projectId=${projectId}&siteId=${site.id}`);
        }
        break;
      case "INVOICED":
      case "CLOSED":
        break;
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Card header - always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 active:bg-accent/50 transition-colors"
        style={{ touchAction: "manipulation" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-medium text-sm text-foreground truncate">{site.site_name}</span>
            <StatusBadge status={site.site_status} />
            {isLocked && <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* CTA button */}
            {cta && !isLocked && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCTA();
                }}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full font-medium",
                  "bg-primary text-primary-foreground",
                  "active:scale-95 transition-all"
                )}
                style={{ touchAction: "manipulation" }}
              >
                {cta.label}
              </button>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        {/* Summary line */}
        <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground pl-6">
          {site.city && <span>{site.city}</span>}
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{site.assignment_count}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{site.visit_count}</span>
          {site.planned_start_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(site.planned_start_date), "dd/MM")}
              {site.planned_end_date && ` - ${format(new Date(site.planned_end_date), "dd/MM")}`}
            </span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {loadingData ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Financial Summary */}
              {financials && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Presupuestado</p>
                    <p className="text-sm font-bold text-foreground">{formatCurrency(financials.quoted_total)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Facturado</p>
                    <p className="text-sm font-bold text-foreground">{formatCurrency(financials.invoiced_total)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Cobrado</p>
                    <p className="text-sm font-bold text-foreground">{formatCurrency(financials.paid_total)}</p>
                  </div>
                </div>
              )}

              {/* Planning dates */}
              <div className={cn("space-y-3", isLocked && "opacity-60")}>
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Planificación</span>
                  {isLocked && <Lock className="h-3 w-3 text-muted-foreground ml-auto" />}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Inicio</Label>
                    <Input type="date" value={planStart} onChange={(e) => setPlanStart(e.target.value)} disabled={isLocked} className="text-xs h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Días</Label>
                    <Input type="number" min={1} value={planDays} onChange={(e) => setPlanDays(e.target.value)} disabled={isLocked} className="text-xs h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Fin</Label>
                    <Input type="date" value={planEnd} onChange={(e) => setPlanEnd(e.target.value)} disabled={isLocked} className="text-xs h-9" />
                  </div>
                </div>
                {!isLocked && (
                  <Button size="sm" onClick={handleSavePlanning} disabled={savingPlan} className="w-full h-9 text-xs">
                    {savingPlan && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                    Guardar planificación
                  </Button>
                )}
              </div>

              {/* Actual dates */}
              <div className={cn("space-y-3", isLocked && "opacity-60")}>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Ejecución real</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Inicio real</p>
                    <p className="text-xs font-medium">
                      {site.actual_start_at ? format(new Date(site.actual_start_at), "dd/MM/yyyy HH:mm") : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Fin real</p>
                    <p className="text-xs font-medium">
                      {site.actual_end_at ? format(new Date(site.actual_end_at), "dd/MM/yyyy HH:mm") : "—"}
                    </p>
                  </div>
                </div>
                {!isLocked && (
                  <div className="flex flex-wrap gap-2">
                    {!site.actual_start_at && (
                      <Button size="sm" variant="outline" onClick={handleMarkActualStart} className="h-8 text-xs gap-1.5 flex-1">
                        <Play className="h-3.5 w-3.5" /> Marcar inicio
                      </Button>
                    )}
                    {site.actual_start_at && !site.actual_end_at && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleMarkActualEnd(false)} className="h-8 text-xs gap-1.5 flex-1">
                          <Square className="h-3.5 w-3.5" /> Marcar fin
                        </Button>
                        <Button size="sm" onClick={() => handleMarkActualEnd(true)} className="h-8 text-xs gap-1.5 flex-1">
                          <CheckCircle className="h-3.5 w-3.5" /> Listo p/ facturar
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Assignments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Equipo ({assignments.length})
                    </span>
                  </div>
                  {!isLocked && (
                    <button
                      onClick={() => setAssignDialog(true)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-primary text-primary-foreground active:scale-95 transition-all"
                      style={{ touchAction: "manipulation" }}
                    >
                      <Plus className="h-3 w-3 inline mr-1" />Asignar
                    </button>
                  )}
                </div>
                {assignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Sin técnicos asignados</p>
                ) : (
                  <div className="space-y-1.5">
                    {assignments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                        <div>
                          <p className="text-xs font-medium">{a.technician_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {a.role}
                            {a.date_from && ` · ${format(new Date(a.date_from), "dd/MM")}`}
                            {a.date_to && ` - ${format(new Date(a.date_to), "dd/MM")}`}
                          </p>
                        </div>
                        {!isLocked && (
                          <button
                            onClick={() => handleDeleteAssignment(a.id)}
                            className="text-[10px] text-destructive px-2 py-1"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Visits */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Visitas ({visits.length})
                    </span>
                  </div>
                  {!isLocked && (
                    <button
                      onClick={() => setVisitDialog(true)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-primary text-primary-foreground active:scale-95 transition-all"
                      style={{ touchAction: "manipulation" }}
                    >
                      <Plus className="h-3 w-3 inline mr-1" />Visita
                    </button>
                  )}
                </div>
                {visits.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Sin visitas</p>
                ) : (
                  <div className="space-y-1.5">
                    {visits.map((v) => {
                      const isOpen = !v.check_out_at;
                      return (
                        <div key={v.id} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium">{v.technician_name}</p>
                              {isOpen && (
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[9px] px-1.5 py-0">
                                  Abierta
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(v.visit_date), "dd/MM/yyyy")}
                              {v.check_in_at && ` · ${format(new Date(v.check_in_at), "HH:mm")}`}
                              {v.check_out_at && ` - ${format(new Date(v.check_out_at), "HH:mm")}`}
                            </p>
                          </div>
                          {isOpen && !isLocked && (
                            <button
                              onClick={() => handleCloseVisit(v.id)}
                              className="text-[10px] text-primary px-2 py-1 font-medium"
                            >
                              Cerrar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Assignment Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-[90vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" /> Asignar técnico
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Técnico *</Label>
              <Select value={assignTechId || undefined} onValueChange={setAssignTechId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.company_name} ({t.technician_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rol</Label>
              <Select value={assignRole} onValueChange={setAssignRole}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSTALLER" className="text-xs">Instalador</SelectItem>
                  <SelectItem value="LEAD" className="text-xs">Responsable</SelectItem>
                  <SelectItem value="SUPPORT" className="text-xs">Apoyo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Desde</Label>
                <Input type="date" value={assignDateFrom} onChange={(e) => setAssignDateFrom(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hasta</Label>
                <Input type="date" value={assignDateTo} onChange={(e) => setAssignDateTo(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notas</Label>
              <Textarea value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} rows={2} className="text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAssignDialog(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAddAssignment} disabled={savingAssign || !assignTechId}>
              {savingAssign && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visit Dialog */}
      <Dialog open={visitDialog} onOpenChange={setVisitDialog}>
        <DialogContent className="max-w-[90vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <ClipboardList className="h-4 w-4 text-primary" /> Registrar visita
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Técnico *</Label>
              <Select value={visitTechId || undefined} onValueChange={setVisitTechId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.company_name} ({t.technician_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha</Label>
              <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notas</Label>
              <Textarea value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} rows={2} className="text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setVisitDialog(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAddVisit} disabled={savingVisit || !visitTechId}>
              {savingVisit && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobilePlanningTab;
