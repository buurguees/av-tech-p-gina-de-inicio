import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreatePartnerPayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  partnerName: string;
  defaultIrpfRate: number;
  onSuccess: () => void;
}

export default function CreatePartnerPayrollDialog({
  open,
  onOpenChange,
  partnerId,
  partnerName,
  defaultIrpfRate,
  onSuccess,
}: CreatePartnerPayrollDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    period_year: new Date().getFullYear(),
    period_month: new Date().getMonth() + 1,
    gross_amount: "",
    irpf_rate: defaultIrpfRate.toString(),
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.rpc("create_partner_compensation_run", {
        p_partner_id: partnerId,
        p_period_year: formData.period_year,
        p_period_month: formData.period_month,
        p_gross_amount: parseFloat(formData.gross_amount),
        p_irpf_rate: parseFloat(formData.irpf_rate),
        p_notes: formData.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Nómina creada",
        description: "La nómina se ha creado en estado DRAFT. Confírmala para generar el asiento contable.",
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating payroll:", error);
      toast({
        title: "Error",
        description: error.message || "Error al crear la nómina",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      period_year: new Date().getFullYear(),
      period_month: new Date().getMonth() + 1,
      gross_amount: "",
      irpf_rate: defaultIrpfRate.toString(),
      notes: "",
    });
  };

  const calculateNet = () => {
    const gross = parseFloat(formData.gross_amount) || 0;
    const irpfRate = parseFloat(formData.irpf_rate) || 0;
    const irpf = gross * (irpfRate / 100);
    return gross - irpf;
  };

  const calculateIrpf = () => {
    const gross = parseFloat(formData.gross_amount) || 0;
    const irpfRate = parseFloat(formData.irpf_rate) || 0;
    return gross * (irpfRate / 100);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(val);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva Nómina de Socio</DialogTitle>
          <DialogDescription>
            Crea una nueva retribución mensual para {partnerName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="period_year">Año</Label>
              <Input
                id="period_year"
                type="number"
                value={formData.period_year}
                onChange={(e) => setFormData({ ...formData, period_year: parseInt(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="period_month">Mes</Label>
              <Select
                value={formData.period_month.toString()}
                onValueChange={(value) => setFormData({ ...formData, period_month: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2000, month - 1).toLocaleDateString("es-ES", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="gross_amount">
                Retribución Bruta (€) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gross_amount"
                type="number"
                step="0.01"
                value={formData.gross_amount}
                onChange={(e) => setFormData({ ...formData, gross_amount: e.target.value })}
                placeholder="2500.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="irpf_rate">IRPF (%)</Label>
              <Input
                id="irpf_rate"
                type="number"
                step="0.01"
                value={formData.irpf_rate}
                onChange={(e) => setFormData({ ...formData, irpf_rate: e.target.value })}
              />
            </div>
          </div>

          {/* Preview */}
          {formData.gross_amount && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Retribución Bruta</span>
                <span className="font-medium">{formatCurrency(parseFloat(formData.gross_amount) || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IRPF ({formData.irpf_rate}%)</span>
                <span className="font-medium text-orange-400">-{formatCurrency(calculateIrpf())}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                <span className="font-medium">Neto a Pagar</span>
                <span className="font-bold text-green-400">{formatCurrency(calculateNet())}</span>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Ej: Bonus por objetivo Q1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.gross_amount}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Nómina"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
