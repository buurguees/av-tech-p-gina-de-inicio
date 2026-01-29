import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Loader2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface PurchaseOrderLine {
  id: string;
  purchase_order_id: string;
  line_order: number;
  concept: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  withholding_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  withholding_amount: number;
  total: number;
  group_name: string | null;
}

interface PurchaseOrderLinesEditorProps {
  orderId: string;
  readOnly?: boolean;
  onLinesChange?: () => void;
}

const PurchaseOrderLinesEditor = ({
  orderId,
  readOnly = false,
  onLinesChange,
}: PurchaseOrderLinesEditorProps) => {
  const { toast } = useToast();
  const [lines, setLines] = useState<PurchaseOrderLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<PurchaseOrderLine | null>(null);
  const [formData, setFormData] = useState({
    concept: "",
    description: "",
    quantity: 1,
    unit: "ud",
    unit_price: 0,
    tax_rate: 21,
    withholding_rate: 0,
    discount_percent: 0,
    group_name: "",
  });

  useEffect(() => {
    fetchLines();
  }, [orderId]);

  const fetchLines = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_purchase_order_lines", {
        p_order_id: orderId,
      });

      if (error) throw error;
      setLines(data || []);
    } catch (error: any) {
      console.error("Error fetching lines:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las líneas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleOpenDialog = (line?: PurchaseOrderLine) => {
    if (line) {
      setEditingLine(line);
      setFormData({
        concept: line.concept,
        description: line.description || "",
        quantity: line.quantity,
        unit: line.unit,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
        withholding_rate: line.withholding_rate,
        discount_percent: line.discount_percent,
        group_name: line.group_name || "",
      });
    } else {
      setEditingLine(null);
      setFormData({
        concept: "",
        description: "",
        quantity: 1,
        unit: "ud",
        unit_price: 0,
        tax_rate: 21,
        withholding_rate: 0,
        discount_percent: 0,
        group_name: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSaveLine = async () => {
    if (!formData.concept.trim()) {
      toast({
        title: "Error",
        description: "El concepto es obligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      if (editingLine) {
        // Actualizar línea existente
        const { error } = await supabase.rpc("update_purchase_order_line", {
          p_line_id: editingLine.id,
          p_concept: formData.concept,
          p_description: formData.description || null,
          p_quantity: formData.quantity,
          p_unit: formData.unit,
          p_unit_price: formData.unit_price,
          p_tax_rate: formData.tax_rate,
          p_withholding_rate: formData.withholding_rate,
          p_discount_percent: formData.discount_percent,
          p_group_name: formData.group_name || null,
        });

        if (error) throw error;

        toast({
          title: "Línea actualizada",
          description: "La línea se ha actualizado correctamente",
        });
      } else {
        // Crear nueva línea
        const { error } = await supabase.rpc("add_purchase_order_line", {
          p_order_id: orderId,
          p_concept: formData.concept,
          p_description: formData.description || null,
          p_quantity: formData.quantity,
          p_unit: formData.unit,
          p_unit_price: formData.unit_price,
          p_tax_rate: formData.tax_rate,
          p_withholding_rate: formData.withholding_rate,
          p_discount_percent: formData.discount_percent,
          p_group_name: formData.group_name || null,
        });

        if (error) throw error;

        toast({
          title: "Línea añadida",
          description: "La línea se ha añadido correctamente",
        });
      }

      setDialogOpen(false);
      fetchLines();
      onLinesChange?.();
    } catch (error: any) {
      console.error("Error saving line:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la línea",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    try {
      const { error } = await supabase.rpc("delete_purchase_order_line", {
        p_line_id: lineId,
      });

      if (error) throw error;

      toast({
        title: "Línea eliminada",
        description: "La línea se ha eliminado correctamente",
      });

      fetchLines();
      onLinesChange?.();
    } catch (error: any) {
      console.error("Error deleting line:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la línea",
        variant: "destructive",
      });
    }
  };

  // Calcular totales
  const totals = lines.reduce(
    (acc, line) => ({
      subtotal: acc.subtotal + (line.subtotal || 0),
      tax: acc.tax + (line.tax_amount || 0),
      withholding: acc.withholding + (line.withholding_amount || 0),
      total: acc.total + (line.total || 0),
    }),
    { subtotal: 0, tax: 0, withholding: 0, total: 0 }
  );

  // Conceptos predefinidos comunes para técnicos
  const commonConcepts = [
    "Mano de obra",
    "Dietas",
    "Desplazamiento",
    "Alojamiento",
    "Material",
    "Horas extra",
    "Coordinación",
  ];

  return (
    <div className="p-6 space-y-4">
      {/* Header con botón añadir */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Líneas del Pedido</h3>
        {!readOnly && (
          <Button onClick={() => handleOpenDialog()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Añadir línea
          </Button>
        )}
      </div>

      {/* Tabla de líneas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : lines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No hay líneas en este pedido</p>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => handleOpenDialog()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Añadir primera línea
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-center w-20">Cant.</TableHead>
                  <TableHead className="text-center w-16">Ud.</TableHead>
                  <TableHead className="text-right w-24">Precio</TableHead>
                  <TableHead className="text-center w-16">IVA</TableHead>
                  <TableHead className="text-center w-16">IRPF</TableHead>
                  <TableHead className="text-right w-24">Subtotal</TableHead>
                  <TableHead className="text-right w-24">Total</TableHead>
                  {!readOnly && <TableHead className="w-20"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id} className="hover:bg-accent/30">
                    <TableCell className="text-muted-foreground">
                      {line.line_order}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{line.concept}</p>
                        {line.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {line.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{line.quantity}</TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {line.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(line.unit_price)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {line.tax_rate}%
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {line.withholding_rate > 0 ? `${line.withholding_rate}%` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(line.subtotal)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(line.total)}
                    </TableCell>
                    {!readOnly && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDialog(line)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteLine(line.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Resumen de totales */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base imponible:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA:</span>
                <span>{formatCurrency(totals.tax)}</span>
              </div>
              {totals.withholding > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Retención IRPF:</span>
                  <span className="text-red-400">-{formatCurrency(totals.withholding)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
                <span>Total:</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Dialog para añadir/editar línea */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingLine ? "Editar línea" : "Nueva línea"}
            </DialogTitle>
            <DialogDescription>
              {editingLine
                ? "Modifica los datos de la línea"
                : "Añade una nueva línea al pedido de compra"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Conceptos rápidos */}
            {!editingLine && (
              <div>
                <Label className="text-xs text-muted-foreground">Conceptos comunes</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {commonConcepts.map((concept) => (
                    <Button
                      key={concept}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "text-xs h-7",
                        formData.concept === concept && "bg-accent"
                      )}
                      onClick={() => setFormData({ ...formData, concept })}
                    >
                      {concept}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Concepto */}
            <div>
              <Label htmlFor="concept">Concepto *</Label>
              <Input
                id="concept"
                value={formData.concept}
                onChange={(e) =>
                  setFormData({ ...formData, concept: e.target.value })
                }
                placeholder="Ej: Mano de obra instalación"
              />
            </div>

            {/* Descripción */}
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descripción detallada (opcional)"
              />
            </div>

            {/* Cantidad, Unidad, Precio */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="unit">Unidad</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  placeholder="ud, h, km..."
                />
              </div>
              <div>
                <Label htmlFor="unit_price">Precio unit.</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            {/* IVA, IRPF, Descuento */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="tax_rate">IVA %</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="withholding_rate">IRPF %</Label>
                <Input
                  id="withholding_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.withholding_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, withholding_rate: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="discount_percent">Dto. %</Label>
                <Input
                  id="discount_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discount_percent}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            {/* Vista previa de cálculo */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>
                  {formatCurrency(
                    formData.quantity *
                      formData.unit_price *
                      (1 - formData.discount_percent / 100)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA ({formData.tax_rate}%):</span>
                <span>
                  {formatCurrency(
                    formData.quantity *
                      formData.unit_price *
                      (1 - formData.discount_percent / 100) *
                      (formData.tax_rate / 100)
                  )}
                </span>
              </div>
              {formData.withholding_rate > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    IRPF ({formData.withholding_rate}%):
                  </span>
                  <span className="text-red-400">
                    -
                    {formatCurrency(
                      formData.quantity *
                        formData.unit_price *
                        (1 - formData.discount_percent / 100) *
                        (formData.withholding_rate / 100)
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t border-border mt-2 pt-2">
                <span>Total línea:</span>
                <span>
                  {formatCurrency(
                    formData.quantity *
                      formData.unit_price *
                      (1 - formData.discount_percent / 100) *
                      (1 + formData.tax_rate / 100) -
                      formData.quantity *
                        formData.unit_price *
                        (1 - formData.discount_percent / 100) *
                        (formData.withholding_rate / 100)
                  )}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveLine} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : editingLine ? (
                "Guardar cambios"
              ) : (
                "Añadir línea"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrderLinesEditor;
