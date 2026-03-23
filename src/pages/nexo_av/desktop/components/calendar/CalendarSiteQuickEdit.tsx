import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExternalLink, Loader2, Users, Save, Calendar } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_CTA,
  isSiteLocked,
} from "@/constants/siteStatuses";
import type { CalendarSite } from "@/pages/nexo_av/shared/hooks/useCalendarData";

interface Technician {
  id: string;
  company_name: string;
  technician_number: string;
}

interface CalendarSiteQuickEditProps {
  site: CalendarSite | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const CalendarSiteQuickEdit = ({
  site,
  open,
  onClose,
  onSaved,
}: CalendarSiteQuickEditProps) => {
  const { toast }    = useToast();
  const navigate     = useNavigate();
  const { userId }   = useParams<{ userId: string }>();

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [planStart,   setPlanStart]   = useState("");
  const [planDays,    setPlanDays]    = useState("");
  const [planEnd,     setPlanEnd]     = useState("");
  const [saving,      setSaving]      = useState(false);

  // Asignación rápida
  const [techId,      setTechId]      = useState("");
  const [role,        setRole]        = useState("INSTALLER");
  const [savingAssign, setSavingAssign] = useState(false);

  const isLocked = site ? isSiteLocked(site.site_status) : false;

  // Sync state when site changes
  useEffect(() => {
    if (!site) return;
    setPlanStart(site.planned_start_date || "");
    setPlanDays(site.planned_days?.toString() || "");
    setPlanEnd(site.planned_end_date || "");
  }, [site?.site_id]);

  // Cargar técnicos una vez
  useEffect(() => {
    if (!open) return;
    supabase
      .rpc("list_technicians", { p_status: "ACTIVE" })
      .then(({ data }) => {
        setTechnicians(
          ((data || []) as any[]).map((t) => ({
            id:               t.id,
            company_name:     t.company_name || "",
            technician_number: t.technician_number || "",
          }))
        );
      });
  }, [open]);

  // Auto-calcular fecha fin cuando cambian inicio y días
  useEffect(() => {
    if (planStart && planDays && Number(planDays) > 0) {
      const end = addDays(parseISO(planStart), Number(planDays) - 1);
      setPlanEnd(format(end, "yyyy-MM-dd"));
    }
  }, [planStart, planDays]);

  const handleSavePlanning = async () => {
    if (!site || !planStart) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("update_site_planning", {
        p_site_id:          site.site_id,
        p_planned_start_date: planStart || null,
        p_planned_days:     planDays ? Number(planDays) : null,
        p_planned_end_date: planEnd || null,
      });
      if (error) throw error;
      toast({ title: "Planning guardado" });
      onSaved();
    } catch (err: any) {
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!site || !techId) return;
    setSavingAssign(true);
    try {
      const { error } = await supabase.rpc("upsert_site_assignment", {
        p_site_id:       site.site_id,
        p_technician_id: techId,
        p_role:          role,
        p_date_from:     planStart || null,
        p_date_to:       planEnd || null,
        p_notes:         null,
      });
      if (error) throw error;
      toast({ title: "Técnico asignado" });
      setTechId("");
      onSaved();
    } catch (err: any) {
      toast({ title: "Error al asignar", description: err.message, variant: "destructive" });
    } finally {
      setSavingAssign(false);
    }
  };

  const ctaInfo = site ? STATUS_CTA[site.site_status] : null;
  const statusColor = site
    ? STATUS_COLORS[site.site_status] || "bg-muted text-muted-foreground"
    : "";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[400px] p-0 flex flex-col">
        {site && (
          <>
            {/* Header */}
            <SheetHeader className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate text-sm font-semibold">
                    {site.site_name}
                  </SheetTitle>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {site.project_name}
                    {site.client_name && ` · ${site.client_name}`}
                  </p>
                </div>
                <Badge
                  className={`${statusColor} border-0 flex-shrink-0 text-[10px]`}
                >
                  {STATUS_LABELS[site.site_status] || site.site_status}
                </Badge>
              </div>

              {/* Link al proyecto */}
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-7 justify-start gap-1.5 px-1 text-xs text-muted-foreground"
                onClick={() => navigate(`/nexo-av/${userId}/projects/${site.project_id}`)}
              >
                <ExternalLink className="h-3 w-3" />
                Ver proyecto completo
              </Button>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">

              {/* ─── Planning de fechas ─────────────────────────── */}
              <section>
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Planificación
                </h3>
                {isLocked ? (
                  <p className="text-xs text-muted-foreground">
                    Este sitio está bloqueado ({STATUS_LABELS[site.site_status]}).
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Fecha inicio</Label>
                        <Input
                          type="date"
                          value={planStart}
                          onChange={(e) => setPlanStart(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Días previstos</Label>
                        <Input
                          type="number"
                          min={1}
                          value={planDays}
                          onChange={(e) => setPlanDays(e.target.value)}
                          className="h-8 text-xs"
                          placeholder="1"
                        />
                      </div>
                    </div>

                    {planEnd && (
                      <p className="text-[11px] text-muted-foreground">
                        Fin estimado:{" "}
                        <span className="font-medium text-foreground">
                          {format(parseISO(planEnd), "dd/MM/yyyy")}
                        </span>
                      </p>
                    )}

                    <Button
                      size="sm"
                      className="h-8 w-full gap-1.5 text-xs"
                      disabled={!planStart || saving}
                      onClick={handleSavePlanning}
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Guardar planning
                    </Button>
                  </div>
                )}
              </section>

              {/* ─── Técnicos asignados ─────────────────────────── */}
              <section>
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Técnicos asignados ({site.assignment_count})
                </h3>

                {site.assignments.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {site.assignments.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded border border-border bg-muted/30 px-2.5 py-1.5 text-xs"
                      >
                        <span className="font-medium">{a.technician_name}</span>
                        <span className="text-muted-foreground">{a.role}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!isLocked && (
                  <div className="space-y-2">
                    <Select value={techId} onValueChange={setTechId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Seleccionar técnico…" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            {t.company_name}
                            <span className="ml-1 text-muted-foreground">
                              #{t.technician_number}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INSTALLER" className="text-xs">Instalador</SelectItem>
                        <SelectItem value="LEAD"      className="text-xs">Responsable</SelectItem>
                        <SelectItem value="SUPPORT"   className="text-xs">Soporte</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-full gap-1.5 text-xs"
                      disabled={!techId || savingAssign}
                      onClick={handleAssign}
                    >
                      {savingAssign ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Users className="h-3.5 w-3.5" />
                      )}
                      Asignar técnico
                    </Button>
                  </div>
                )}
              </section>

              {/* ─── CTA contextual ─────────────────────────────── */}
              {ctaInfo && !isLocked && (
                <section className="border-t border-border pt-4">
                  <Button
                    className="h-9 w-full gap-2 text-xs"
                    onClick={() =>
                      navigate(`/nexo-av/${userId}/projects/${site.project_id}`)
                    }
                  >
                    <ctaInfo.icon className="h-4 w-4" />
                    {ctaInfo.label} en proyecto
                  </Button>
                </section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CalendarSiteQuickEdit;
