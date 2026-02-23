import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calculator, Lock, Unlock, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PayrollCalculatorPanelProps {
  partnerId: string;
  partnerName: string;
  onCompensationCreated?: () => void;
}

interface PnlBasis {
  year: number;
  month: number;
  is_locked: boolean;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
}

interface CalculationResult {
  dry_run: boolean;
  gross_amount: number;
  base_amount: number;
  irpf_rate: number;
  irpf_amount: number;
  net_amount: number;
  pnl_net_profit: number;
  compensation_id?: string;
  compensation_number?: string;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const PayrollCalculatorPanel = ({ partnerId, partnerName, onCompensationCreated }: PayrollCalculatorPanelProps) => {
  const { toast } = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // previous month
  const [baseAmount, setBaseAmount] = useState<string>("");
  const [irpfRate, setIrpfRate] = useState<string>("19");
  const [pnlBasis, setPnlBasis] = useState<PnlBasis | null>(null);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [loadingBasis, setLoadingBasis] = useState(false);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchBasis = async () => {
    setLoadingBasis(true);
    setPnlBasis(null);
    setCalculation(null);
    try {
      const { data, error } = await (supabase.rpc as any)("payroll_get_partner_compensation_basis", {
        p_year: year,
        p_month: month,
      });
      if (error) throw error;
      setPnlBasis(data as unknown as PnlBasis);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingBasis(false);
    }
  };

  const runDryRun = async () => {
    if (!baseAmount || parseFloat(baseAmount) <= 0) {
      toast({ title: "Error", description: "Introduce un importe base válido", variant: "destructive" });
      return;
    }
    setLoadingCalc(true);
    setCalculation(null);
    try {
      const { data, error } = await (supabase.rpc as any)("payroll_calculate_partner_compensation", {
        p_partner_id: partnerId,
        p_year: year,
        p_month: month,
        p_base_amount: parseFloat(baseAmount),
        p_irpf_rate: parseFloat(irpfRate) || 19,
        p_dry_run: true,
      });
      if (error) throw error;
      setCalculation(data as unknown as CalculationResult);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingCalc(false);
    }
  };

  const confirmCreate = async () => {
    if (!baseAmount || parseFloat(baseAmount) <= 0) return;
    setCreating(true);
    try {
      const { data, error } = await (supabase.rpc as any)("payroll_calculate_partner_compensation", {
        p_partner_id: partnerId,
        p_year: year,
        p_month: month,
        p_base_amount: parseFloat(baseAmount),
        p_irpf_rate: parseFloat(irpfRate) || 19,
        p_dry_run: false,
      });
      if (error) throw error;
      const result = data as unknown as CalculationResult;
      toast({
        title: "Nómina creada",
        description: `${result.compensation_number} - Neto: ${formatCurrency(result.net_amount)}`,
      });
      setCalculation(null);
      setPnlBasis(null);
      setBaseAmount("");
      onCompensationCreated?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="border border-white/10 rounded-lg bg-zinc-900/50 p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="h-4 w-4 text-amber-400" />
        <span className="text-sm font-medium text-white">Calculadora de Nómina — {partnerName}</span>
      </div>

      {/* Step 1: Select period */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-white/60">Año</Label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value) || now.getFullYear())}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-white/60">Mes</Label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="w-full h-8 text-sm rounded-md border border-input bg-background px-3"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button onClick={fetchBasis} disabled={loadingBasis} size="sm" variant="outline" className="w-full h-8">
            {loadingBasis ? <Loader2 className="h-3 w-3 animate-spin" /> : "Consultar PyG"}
          </Button>
        </div>
      </div>

      {/* Step 2: Show P&L basis */}
      {pnlBasis && (
        <div className="border border-white/10 rounded-lg p-3 space-y-2 bg-zinc-800/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/70">PyG {MONTHS[pnlBasis.month - 1]} {pnlBasis.year}</span>
            <Badge variant="outline" className={cn("text-[10px]", pnlBasis.is_locked ? "text-emerald-400 border-emerald-500/30" : "text-amber-400 border-amber-500/30")}>
              {pnlBasis.is_locked ? <><Lock className="h-3 w-3 mr-1" /> Bloqueado</> : <><Unlock className="h-3 w-3 mr-1" /> Abierto</>}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-white/50">Ingresos</span>
              <div className="text-emerald-400 font-mono">{formatCurrency(pnlBasis.total_revenue)}</div>
            </div>
            <div>
              <span className="text-white/50">Gastos</span>
              <div className="text-red-400 font-mono">{formatCurrency(pnlBasis.total_expenses)}</div>
            </div>
            <div>
              <span className="text-white/50">Resultado Neto</span>
              <div className={cn("font-mono font-bold", pnlBasis.net_profit >= 0 ? "text-emerald-400" : "text-red-400")}>
                {pnlBasis.net_profit >= 0 ? <TrendingUp className="inline h-3 w-3 mr-1" /> : <TrendingDown className="inline h-3 w-3 mr-1" />}
                {formatCurrency(pnlBasis.net_profit)}
              </div>
            </div>
          </div>

          {!pnlBasis.is_locked && (
            <div className="text-[10px] text-amber-400/70 bg-amber-500/10 rounded px-2 py-1">
              El periodo no está bloqueado. La nómina no se podrá crear hasta que se bloquee.
            </div>
          )}
        </div>
      )}

      {/* Step 3: Input base amount */}
      {pnlBasis && pnlBasis.is_locked && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-white/60">Base bruta (EUR)</Label>
            <Input
              type="number"
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
              placeholder="2000"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-white/60">IRPF %</Label>
            <Input
              type="number"
              value={irpfRate}
              onChange={(e) => setIrpfRate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={runDryRun} disabled={loadingCalc} size="sm" className="w-full h-8">
              {loadingCalc ? <Loader2 className="h-3 w-3 animate-spin" /> : "Simular"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Show calculation result */}
      {calculation && calculation.dry_run && (
        <div className="border border-emerald-500/20 rounded-lg p-3 bg-emerald-500/5 space-y-2">
          <div className="text-xs font-medium text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Simulación
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-white/50">Bruto</span>
              <div className="text-white font-mono">{formatCurrency(calculation.gross_amount)}</div>
            </div>
            <div>
              <span className="text-white/50">IRPF ({calculation.irpf_rate}%)</span>
              <div className="text-red-400 font-mono">-{formatCurrency(calculation.irpf_amount)}</div>
            </div>
            <div>
              <span className="text-white/50">Neto</span>
              <div className="text-emerald-400 font-mono font-bold">{formatCurrency(calculation.net_amount)}</div>
            </div>
            <div>
              <span className="text-white/50">PyG ref.</span>
              <div className="text-white/70 font-mono">{formatCurrency(calculation.pnl_net_profit)}</div>
            </div>
          </div>
          <Button onClick={confirmCreate} disabled={creating} size="sm" className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700">
            {creating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Crear nómina definitiva
          </Button>
        </div>
      )}
    </div>
  );
};

export default PayrollCalculatorPanel;
