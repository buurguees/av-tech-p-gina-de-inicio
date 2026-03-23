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
import { Link2, Plus, Pencil, Trash2, Loader2, Info, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface CompanionRuleRow {
  id: string;
  trigger_product_id: string;
  trigger_sku: string;
  trigger_name: string;
  companion_product_id: string;
  companion_sku: string;
  companion_name: string;
  companion_sale_price: number;
  quantity_ratio: number;
  is_active: boolean;
}

interface ProductOption {
  id: string;
  sku: string;
  name: string;
}

interface RuleForm {
  trigger_product_id: string;
  companion_product_id: string;
  quantity_ratio: string;
  is_active: boolean;
}

const emptyForm = (): RuleForm => ({
  trigger_product_id: "",
  companion_product_id: "",
  quantity_ratio: "1",
  is_active: true,
});

export function CompanionRulesTab() {
  const [rules, setRules] = useState<CompanionRuleRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<CompanionRuleRow | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm());
  const [productSearch, setProductSearch] = useState({ trigger: "", companion: "" });

  useEffect(() => {
    fetchRules();
    fetchProducts();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_product_companion_rules");
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRules((data as any[]) ?? []);
    } catch {
      toast.error("No se pudieron cargar las reglas");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, sku, name")
        .order("name");
      if (error) throw error;
      setProducts(data ?? []);
    } catch {
      // silent
    }
  };

  const filteredProducts = (search: string): ProductOption[] => {
    if (!search.trim()) return products.slice(0, 50);
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    ).slice(0, 50);
  };

  const openCreate = () => {
    setEditingRule(null);
    setForm(emptyForm());
    setProductSearch({ trigger: "", companion: "" });
    setShowDialog(true);
  };

  const openEdit = (rule: CompanionRuleRow) => {
    setEditingRule(rule);
    setForm({
      trigger_product_id: rule.trigger_product_id,
      companion_product_id: rule.companion_product_id,
      quantity_ratio: String(rule.quantity_ratio),
      is_active: rule.is_active,
    });
    setProductSearch({ trigger: rule.trigger_name, companion: rule.companion_name });
    setShowDialog(true);
  };

  const handleSave = async () => {
    const ratio = parseFloat(form.quantity_ratio);
    if (!form.trigger_product_id) {
      toast.error("Selecciona el producto que activa la regla");
      return;
    }
    if (!form.companion_product_id) {
      toast.error("Selecciona el producto acompañante");
      return;
    }
    if (form.trigger_product_id === form.companion_product_id) {
      toast.error("El producto activador y el acompañante no pueden ser el mismo");
      return;
    }
    if (isNaN(ratio) || ratio <= 0) {
      toast.error("El ratio debe ser un número positivo");
      return;
    }

    setSaving(true);
    try {
      if (editingRule) {
        const { error } = await supabase
          .from("product_companion_rules")
          .update({
            trigger_product_id: form.trigger_product_id,
            companion_product_id: form.companion_product_id,
            quantity_ratio: ratio,
            is_active: form.is_active,
          })
          .eq("id", editingRule.id);
        if (error) throw error;
        toast.success("Regla actualizada");
      } else {
        const { error } = await supabase.from("product_companion_rules").insert({
          trigger_product_id: form.trigger_product_id,
          companion_product_id: form.companion_product_id,
          quantity_ratio: ratio,
          is_active: form.is_active,
        });
        if (error) throw error;
        toast.success("Regla añadida");
      }
      setShowDialog(false);
      fetchRules();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("unique") || msg.includes("duplicate")) {
        toast.error("Ya existe una regla para ese par de productos");
      } else {
        toast.error("No se pudo guardar la regla");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (rule: CompanionRuleRow) => {
    try {
      const { error } = await supabase
        .from("product_companion_rules")
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

  const handleDelete = async (rule: CompanionRuleRow) => {
    if (!window.confirm(`¿Eliminar la regla "${rule.trigger_name} → ${rule.companion_name}"?`)) return;
    try {
      const { error } = await supabase
        .from("product_companion_rules")
        .delete()
        .eq("id", rule.id);
      if (error) throw error;
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      toast.success("Regla eliminada");
    } catch {
      toast.error("No se pudo eliminar la regla");
    }
  };

  const formatRatio = (ratio: number): string => {
    if (ratio === 1) return "1 por 1";
    return `×${ratio}`;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-foreground">Productos vinculados</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Define qué producto acompañante se añade automáticamente al seleccionar un producto
          activador en un presupuesto o factura.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex gap-2 items-start bg-muted/40 border border-border rounded-xl p-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Al añadir una línea con el producto activador, el sistema añade automáticamente
          la sub-línea acompañante con la cantidad proporcional. Puede eliminarse por documento
          pulsando la <span className="font-medium text-foreground">✕</span> de la sub-línea.
        </p>
      </div>

      {/* Tabla de reglas */}
      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">
                Producto activador
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">
                Producto acompañante
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-center">
                Ratio
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
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                </TableCell>
              </TableRow>
            ) : rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                  No hay reglas configuradas
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id} className={!rule.is_active ? "opacity-50" : undefined}>
                  <TableCell className="text-sm font-medium">
                    <div className="flex flex-col">
                      <span>{rule.trigger_name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{rule.trigger_sku}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="flex flex-col">
                        <span>{rule.companion_name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{rule.companion_sku}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-sm">
                    {formatRatio(rule.quantity_ratio)}
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
        Añadir regla
      </Button>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar regla" : "Nueva regla de producto vinculado"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Trigger product */}
            <div className="space-y-1.5">
              <Label className="text-xs">Producto activador</Label>
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={productSearch.trigger}
                onChange={(e) =>
                  setProductSearch((s) => ({ ...s, trigger: e.target.value }))
                }
                className="h-8 text-sm"
              />
              {productSearch.trigger.length > 0 && (
                <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border">
                  {filteredProducts(productSearch.trigger).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/60 flex items-center justify-between ${form.trigger_product_id === p.id ? "bg-muted" : ""}`}
                      onClick={() => {
                        setForm((f) => ({ ...f, trigger_product_id: p.id }));
                        setProductSearch((s) => ({ ...s, trigger: `${p.sku} – ${p.name}` }));
                      }}
                    >
                      <span className="font-medium truncate">{p.name}</span>
                      <span className="text-muted-foreground font-mono ml-2 shrink-0">{p.sku}</span>
                    </button>
                  ))}
                  {filteredProducts(productSearch.trigger).length === 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-2">Sin resultados</p>
                  )}
                </div>
              )}
            </div>

            {/* Companion product */}
            <div className="space-y-1.5">
              <Label className="text-xs">Producto acompañante (sub-línea automática)</Label>
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={productSearch.companion}
                onChange={(e) =>
                  setProductSearch((s) => ({ ...s, companion: e.target.value }))
                }
                className="h-8 text-sm"
              />
              {productSearch.companion.length > 0 && (
                <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border">
                  {filteredProducts(productSearch.companion).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/60 flex items-center justify-between ${form.companion_product_id === p.id ? "bg-muted" : ""}`}
                      onClick={() => {
                        setForm((f) => ({ ...f, companion_product_id: p.id }));
                        setProductSearch((s) => ({ ...s, companion: `${p.sku} – ${p.name}` }));
                      }}
                    >
                      <span className="font-medium truncate">{p.name}</span>
                      <span className="text-muted-foreground font-mono ml-2 shrink-0">{p.sku}</span>
                    </button>
                  ))}
                  {filteredProducts(productSearch.companion).length === 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-2">Sin resultados</p>
                  )}
                </div>
              )}
            </div>

            {/* Ratio */}
            <div className="space-y-1.5">
              <Label className="text-xs">Ratio (unidades acompañante por unidad activador)</Label>
              <Input
                type="number"
                min={0.01}
                step={0.5}
                value={form.quantity_ratio}
                onChange={(e) => setForm((f) => ({ ...f, quantity_ratio: e.target.value }))}
                placeholder="1"
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Ej: 1 = misma cantidad que el activador · 0.5 = la mitad
              </p>
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
