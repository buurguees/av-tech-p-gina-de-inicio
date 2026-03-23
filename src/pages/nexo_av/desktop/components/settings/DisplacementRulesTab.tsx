import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Car, Plus, Pencil, Trash2, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

interface KmRule {
  id: string;
  km_min: number;
  km_max: number | null;
  travel_hours: number;
  is_active: boolean;
  sort_order: number;
}

interface RuleForm {
  km_min: string;
  km_max: string;
  travel_hours: string;
  is_active: boolean;
}

const emptyForm = (): RuleForm => ({
  km_min: "",
  km_max: "",
  travel_hours: "",
  is_active: true,
});

export function DisplacementRulesTab() {
  const [rules, setRules] = useState<KmRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<KmRule | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm());

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("km_displacement_rules")
        .select("*")
        .order("sort_order")
        .order("km_min");
      if (error) throw error;
      setRules(data || []);
    } catch {
      toast.error("No se pudieron cargar las reglas");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingRule(null);
    setForm(emptyForm());
    setShowDialog(true);
  };

  const openEdit = (rule: KmRule) => {
    setEditingRule(rule);
    setForm({
      km_min: String(rule.km_min),
      km_max: rule.km_max !== null ? String(rule.km_max) : "",
      travel_hours: String(rule.travel_hours),
      is_active: rule.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    const km_min = parseInt(form.km_min, 10);
    const km_max = form.km_max.trim() !== "" ? parseInt(form.km_max, 10) : null;
    const travel_hours = parseFloat(form.travel_hours);

    if (isNaN(km_min) || km_min < 0) {
      toast.error("El km mínimo debe ser un número válido");
      return;
    }
    if (km_max !== null && (isNaN(km_max) || km_max <= km_min)) {
      toast.error("El km máximo debe ser mayor que el km mínimo");
      return;
    }
    if (isNaN(travel_hours) || travel_hours <= 0) {
      toast.error("Las horas de desplazamiento deben ser un número positivo");
      return;
    }

    setSaving(true);
    try {
      if (editingRule) {
        const { error } = await supabase
          .from("km_displacement_rules")
          .update({ km_min, km_max, travel_hours, is_active: form.is_active })
          .eq("id", editingRule.id);
        if (error) throw error;
        toast.success("Regla actualizada");
      } else {
        const nextOrder = rules.length > 0 ? Math.max(...rules.map((r) => r.sort_order)) + 1 : 1;
        const { error } = await supabase.from("km_displacement_rules").insert({
          km_min,
          km_max,
          travel_hours,
          is_active: form.is_active,
          sort_order: nextOrder,
        });
        if (error) throw error;
        toast.success("Regla añadida");
      }
      setShowDialog(false);
      fetchRules();
    } catch {
      toast.error("No se pudo guardar la regla");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (rule: KmRule) => {
    try {
      const { error } = await supabase
        .from("km_displacement_rules")
        .update({ is_active: !rule.is_active })
        .eq("id", rule.id);
      if (error) throw error;
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
      );
    } catch {
      toast.error("No se pudo actualizar la regla");
    }
  };

  const handleDelete = async (rule: KmRule) => {
    if (!window.confirm(`¿Eliminar la regla ${formatRange(rule)}?`)) return;
    try {
      const { error } = await supabase
        .from("km_displacement_rules")
        .delete()
        .eq("id", rule.id);
      if (error) throw error;
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      toast.success("Regla eliminada");
    } catch {
      toast.error("No se pudo eliminar la regla");
    }
  };

  const formatRange = (rule: KmRule): string => {
    if (rule.km_max === null) return `${rule.km_min}+ km`;
    return `${rule.km_min} – ${rule.km_max} km`;
  };

  const formatHours = (h: number): string => {
    if (h === 1) return "1 h";
    return `${h} h`;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Car className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-foreground">Reglas de desplazamiento</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Define cuántas horas de desplazamiento se añaden automáticamente según los km introducidos
          en un presupuesto o factura.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex gap-2 items-start bg-muted/40 border border-border rounded-xl p-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Al añadir la línea <span className="font-medium text-foreground">KILOMETRAJE</span> en un
          documento e introducir los km, el sistema añade automáticamente la línea{" "}
          <span className="font-medium text-foreground">HORA DE DESPLAZAMIENTO</span> con las horas
          que correspondan según estas reglas. Los precios de ambos servicios se configuran desde el
          catálogo.
        </p>
      </div>

      {/* Tabla de reglas */}
      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">
                Tramo km
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">
                Horas desplazamiento
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-center">
                Activa
              </TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                </TableCell>
              </TableRow>
            ) : rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                  No hay reglas configuradas
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id} className={!rule.is_active ? "opacity-50" : undefined}>
                  <TableCell className="font-medium text-sm">{formatRange(rule)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatHours(rule.travel_hours)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggleActive(rule)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(rule)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(rule)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Añadir tramo
      </Button>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar tramo" : "Nuevo tramo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Km mínimo</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.km_min}
                  onChange={(e) => setForm((f) => ({ ...f, km_min: e.target.value }))}
                  placeholder="100"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Km máximo (vacío = sin límite)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.km_max}
                  onChange={(e) => setForm((f) => ({ ...f, km_max: e.target.value }))}
                  placeholder="199"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horas de desplazamiento</Label>
              <Input
                type="number"
                min={0.5}
                step={0.5}
                value={form.travel_hours}
                onChange={(e) => setForm((f) => ({ ...f, travel_hours: e.target.value }))}
                placeholder="1"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label className="text-xs text-muted-foreground">Regla activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {editingRule ? "Guardar cambios" : "Añadir regla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
