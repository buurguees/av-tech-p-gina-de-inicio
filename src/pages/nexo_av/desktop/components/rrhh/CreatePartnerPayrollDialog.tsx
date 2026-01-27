import { useState, useEffect, useMemo } from "react";
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
import { Loader2, User, FileText, Banknote, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PartnerData {
  full_name: string;
  tax_id: string;
  address?: string;
  city?: string;
  postal_code?: string;
  province?: string;
  iban?: string;
  email?: string;
  irpf_rate: number;
  ss_regime: string; // 'RETA' or 'SSG'
}

interface CreatePartnerPayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  partnerData: PartnerData;
  onSuccess: () => void;
}

interface NetoConcept {
  id: string;
  label: string;
  neto: string;
}

export default function CreatePartnerPayrollDialog({
  open,
  onOpenChange,
  partnerId,
  partnerData,
  onSuccess,
}: CreatePartnerPayrollDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    period_year: new Date().getFullYear(),
    period_month: new Date().getMonth() + 1,
    payment_date: "",
    notes: "",
  });

  // Conceptos de neto (dinámicos)
  const [netoConcepts, setNetoConcepts] = useState<NetoConcept[]>([
    { id: "base", label: "Neto Base", neto: "" },
    { id: "horas", label: "Plus Horas Extra", neto: "" },
    { id: "productividad", label: "Plus Productividad", neto: "" },
    { id: "otros", label: "Otros Conceptos", neto: "" },
  ]);

  // Cálculos automáticos basados en IRPF del socio
  const calculations = useMemo(() => {
    const irpfRate = partnerData.irpf_rate || 0;
    const t = irpfRate / 100;
    const factor = 1 - t; // Para calcular bruto = neto / (1 - t)

    const conceptDetails = netoConcepts.map((concept) => {
      const netoValue = parseFloat(concept.neto) || 0;
      if (netoValue === 0 || factor === 0) {
        return { ...concept, neto: netoValue, bruto: 0, irpf: 0 };
      }
      const bruto = netoValue / factor;
      const irpf = bruto - netoValue; // Calculado así para evitar descuadres por redondeo
      return {
        ...concept,
        neto: netoValue,
        bruto: Math.round(bruto * 100) / 100,
        irpf: Math.round(irpf * 100) / 100,
      };
    });

    const totals = conceptDetails.reduce(
      (acc, c) => ({
        totalNeto: acc.totalNeto + c.neto,
        totalBruto: acc.totalBruto + c.bruto,
        totalIrpf: acc.totalIrpf + c.irpf,
      }),
      { totalNeto: 0, totalBruto: 0, totalIrpf: 0 }
    );

    return {
      conceptDetails,
      ...totals,
      ssEmpresa: 0, // RETA propio = 0€
    };
  }, [netoConcepts, partnerData.irpf_rate]);

  const updateNetoConcept = (id: string, value: string) => {
    setNetoConcepts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, neto: value } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculations.totalNeto <= 0) {
      toast({
        title: "Error",
        description: "Debes introducir al menos un concepto de neto",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Crear el run de compensación con el BRUTO total calculado
      const { error } = await supabase.rpc("create_partner_compensation_run", {
        p_partner_id: partnerId,
        p_period_year: formData.period_year,
        p_period_month: formData.period_month,
        p_gross_amount: calculations.totalBruto,
        p_irpf_rate: partnerData.irpf_rate,
        p_notes: buildNotesWithBreakdown(),
      });

      if (error) throw error;

      toast({
        title: "Nómina creada",
        description: `Nómina de ${formatCurrency(calculations.totalNeto)} neto creada en estado DRAFT`,
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

  const buildNotesWithBreakdown = () => {
    const breakdown = calculations.conceptDetails
      .filter((c) => c.neto > 0)
      .map((c) => `${c.label}: ${formatCurrency(c.neto)} neto → ${formatCurrency(c.bruto)} bruto`)
      .join(" | ");
    
    return formData.notes 
      ? `${formData.notes}\n\nDesglose: ${breakdown}`
      : `Desglose: ${breakdown}`;
  };

  const resetForm = () => {
    setFormData({
      period_year: new Date().getFullYear(),
      period_month: new Date().getMonth() + 1,
      payment_date: "",
      notes: "",
    });
    setNetoConcepts([
      { id: "base", label: "Neto Base", neto: "" },
      { id: "horas", label: "Plus Horas Extra", neto: "" },
      { id: "productividad", label: "Plus Productividad", neto: "" },
      { id: "otros", label: "Otros Conceptos", neto: "" },
    ]);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(val);
  };

  const formatAddress = () => {
    const parts = [
      partnerData.address,
      partnerData.postal_code,
      partnerData.city,
      partnerData.province,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "No especificado";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nueva Nómina de Socio
          </DialogTitle>
          <DialogDescription>
            Introduce los importes NETOS. El sistema calculará automáticamente los brutos y retenciones.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del Socio (Solo lectura) */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <User className="h-4 w-4" />
              Datos del Socio (autocargados)
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nombre:</span>
                <span className="ml-2 font-medium">{partnerData.full_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">DNI/NIE:</span>
                <span className="ml-2 font-medium">{partnerData.tax_id || "No especificado"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Domicilio fiscal:</span>
                <span className="ml-2 font-medium">{formatAddress()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">% IRPF vigente:</span>
                <span className="ml-2 font-bold text-primary">{partnerData.irpf_rate}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Régimen SS:</span>
                <span className="ml-2 font-medium text-accent-foreground">
                  {partnerData.ss_regime === "RETA" 
                    ? "RETA propio (SS empresa = 0€)" 
                    : "Régimen General (SS trabajador + empresa)"}
                </span>
              </div>
              {partnerData.iban && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">IBAN:</span>
                  <span className="ml-2 font-mono text-xs">{partnerData.iban}</span>
                </div>
              )}
            </div>
          </div>

          {/* Periodo */}
          <div className="grid grid-cols-3 gap-4">
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
              <Label htmlFor="payment_date">Fecha de pago (opcional)</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
            </div>
          </div>

          {/* Conceptos de NETO */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Banknote className="h-4 w-4" />
              Retribución en NETO (lo que quieres cobrar)
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {netoConcepts.map((concept) => (
                <div key={concept.id}>
                  <Label htmlFor={concept.id} className="text-xs">
                    {concept.label} (€)
                  </Label>
                  <Input
                    id={concept.id}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={concept.neto}
                    onChange={(e) => updateNetoConcept(concept.id, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="text-right text-sm">
              <span className="text-muted-foreground">Total Neto deseado: </span>
              <span className="font-bold text-lg text-accent-foreground">
                {formatCurrency(calculations.totalNeto)}
              </span>
            </div>
          </div>

          {/* Cálculo Automático */}
          {calculations.totalNeto > 0 && (
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calculator className="h-4 w-4" />
                Cálculo Automático (IRPF {partnerData.irpf_rate}%)
              </div>

              {/* Desglose por concepto */}
              <div className="space-y-2">
                {calculations.conceptDetails
                  .filter((c) => c.neto > 0)
                  .map((concept) => (
                    <div key={concept.id} className="grid grid-cols-4 gap-2 text-xs bg-background/50 p-2 rounded">
                      <span className="font-medium">{concept.label}</span>
                      <span className="text-right">Neto: {formatCurrency(concept.neto)}</span>
                      <span className="text-right text-destructive">IRPF: -{formatCurrency(concept.irpf)}</span>
                      <span className="text-right font-medium">Bruto: {formatCurrency(concept.bruto)}</span>
                    </div>
                  ))}
              </div>

              {/* Totales */}
              <div className="pt-3 border-t border-primary/20 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bruto Total (gasto empresa)</span>
                  <span className="font-bold">{formatCurrency(calculations.totalBruto)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IRPF Retenido ({partnerData.irpf_rate}%)</span>
                  <span className="font-medium text-destructive">-{formatCurrency(calculations.totalIrpf)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    SS Empresa ({partnerData.ss_regime === "RETA" ? "RETA propio" : "Régimen General"})
                  </span>
                  <span className="font-medium text-accent-foreground">
                    {partnerData.ss_regime === "RETA" ? "0,00 €" : "Pendiente calcular"}
                  </span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-primary/20">
                  <span className="font-medium">Neto a Percibir</span>
                  <span className="font-bold text-accent-foreground text-lg">{formatCurrency(calculations.totalNeto)}</span>
                </div>
              </div>

              {/* Resumen Contable */}
              <div className="pt-3 border-t border-primary/20">
                <div className="text-xs text-muted-foreground mb-2">Asiento contable:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between bg-background/50 p-2 rounded">
                    <span>640 Gasto personal</span>
                    <span className="font-mono">{formatCurrency(calculations.totalBruto)}</span>
                  </div>
                  <div className="flex justify-between bg-background/50 p-2 rounded">
                    <span>4751 HP Retenciones</span>
                    <span className="font-mono text-destructive">{formatCurrency(calculations.totalIrpf)}</span>
                  </div>
                  <div className="flex justify-between bg-background/50 p-2 rounded col-span-2">
                    <span>465/572 Pendiente pago / Banco</span>
                    <span className="font-mono text-accent-foreground">{formatCurrency(calculations.totalNeto)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <Label htmlFor="notes">Observaciones / Concepto del mes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Ej: Bonus por objetivo Q1, horas extra proyecto X..."
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || calculations.totalNeto <= 0}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Nómina"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
