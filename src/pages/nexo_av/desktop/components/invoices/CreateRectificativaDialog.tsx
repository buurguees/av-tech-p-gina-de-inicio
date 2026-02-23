import { useState, useMemo, useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CURRENCY = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

type RectificationType = "TOTAL" | "PARTIAL";

interface CreateRectificativaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    total: number;
    paid_amount: number;
    lines: Array<{
      id: string;
      concept: string;
      description: string | null;
      quantity: number;
      unit_price: number;
      tax_rate: number;
      discount_percent: number;
    }>;
  };
  onSuccess: (rectificativaId: string, rectificativaNumber: string) => void;
}

function lineTotal(line: {
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
}): number {
  const net = line.quantity * line.unit_price * (1 - line.discount_percent / 100);
  return net * (1 + line.tax_rate / 100);
}

export default function CreateRectificativaDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: CreateRectificativaDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<RectificationType>("TOTAL");
  const [reason, setReason] = useState("");
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const isPaid = invoice.status === "PAID";

  const allLineIds = useMemo(
    () => invoice.lines.map((l) => l.id),
    [invoice.lines]
  );

  useEffect(() => {
    if (!open) {
      setStep(1);
      setType("TOTAL");
      setReason("");
      setSelectedLineIds(new Set());
    }
  }, [open]);

  const totalAllLines = useMemo(
    () => invoice.lines.reduce((sum, l) => sum + lineTotal(l), 0),
    [invoice.lines]
  );

  const selectedLines = useMemo(
    () => invoice.lines.filter((l) => selectedLineIds.has(l.id)),
    [invoice.lines, selectedLineIds]
  );

  const totalSelected = useMemo(
    () => selectedLines.reduce((sum, l) => sum + lineTotal(l), 0),
    [selectedLines]
  );

  const previewTotal = type === "TOTAL" ? -totalAllLines : -totalSelected;

  const toggleLine = (id: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllLines = () => {
    setSelectedLineIds(new Set(allLineIds));
  };

  const canGoStep2 = reason.trim().length > 0;

  const canSubmit =
    step === 2 &&
    reason.trim().length > 0 &&
    (type === "TOTAL" || selectedLineIds.size > 0);

  const handleNext = () => {
    if (type === "PARTIAL" && selectedLineIds.size === 0) {
      selectAllLines();
    }
    setStep(2);
  };

  const handleBack = () => setStep(1);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("finance_create_rectificativa", {
        p_original_invoice_id: invoice.id,
        p_rectification_type: type,
        p_rectification_reason: reason.trim(),
        p_line_ids: type === "PARTIAL" ? Array.from(selectedLineIds) : null,
      });
      if (error) throw error;
      const result = data as any;
      const rectificativaId = result?.rectificativa_id ?? result?.[0]?.rectificativa_id;
      const rectificativaNumber = result?.rectificativa_number ?? result?.[0]?.rectificativa_number ?? "";
      if (!rectificativaId) {
        throw new Error("La respuesta del servidor no incluyó el ID de la factura rectificativa.");
      }
      toast({
        title: "Factura rectificativa creada",
        description: `Se ha generado la factura rectificativa correctamente.`,
      });
      onOpenChange(false);
      onSuccess(rectificativaId, rectificativaNumber ?? "");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo crear la factura rectificativa.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Crear factura rectificativa</DialogTitle>
          <DialogDescription>
            Factura original: {invoice.invoice_number} · Total {CURRENCY.format(invoice.total)}
          </DialogDescription>
        </DialogHeader>

        {isPaid && (
          <Alert variant="default" className="border-amber-500/50 bg-amber-500/10 text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription>
              Esta factura está cobrada. Al crear la rectificativa se generará automáticamente un asiento de devolución en contabilidad.
            </AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de rectificación</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rectificationType"
                    checked={type === "TOTAL"}
                    onChange={() => setType("TOTAL")}
                    className="rounded-full border-input"
                  />
                  <span className="text-sm font-medium">Total</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rectificationType"
                    checked={type === "PARTIAL"}
                    onChange={() => setType("PARTIAL")}
                    className="rounded-full border-input"
                  />
                  <span className="text-sm font-medium">Parcial</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (obligatorio)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Indica el motivo de la rectificación..."
                className="min-h-[100px] resize-none"
                required
              />
            </div>
            {type === "TOTAL" && (
              <p className="text-sm text-muted-foreground">
                Importe a rectificar: <strong>{CURRENCY.format(-totalAllLines)}</strong>
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {type === "PARTIAL" && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Líneas a rectificar</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={selectAllLines}
                      className="text-xs"
                    >
                      Seleccionar todas
                    </Button>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-2 space-y-2">
                    {invoice.lines.map((line) => (
                      <label
                        key={line.id}
                        className={cn(
                          "flex items-start gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                          selectedLineIds.has(line.id) && "bg-muted/70"
                        )}
                      >
                        <Checkbox
                          checked={selectedLineIds.has(line.id)}
                          onCheckedChange={() => toggleLine(line.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">
                            {line.concept}
                          </span>
                          {line.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {line.description}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-1">
                            {CURRENCY.format(lineTotal(line))}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                {selectedLineIds.size === 0 && (
                  <p className="text-sm text-destructive">
                    Selecciona al menos una línea para continuar.
                  </p>
                )}
              </>
            )}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground mb-1">Importe total de la rectificativa</p>
              <p className="text-xl font-semibold">{CURRENCY.format(previewTotal)}</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 2 ? (
            <>
              <Button type="button" variant="outline" onClick={handleBack} disabled={loading}>
                Atrás
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear rectificativa"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canGoStep2}
              >
                Siguiente
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
