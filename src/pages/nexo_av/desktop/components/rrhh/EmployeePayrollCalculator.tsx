import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calculator, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  SS_EMPLOYEE_RATE,
  SS_EMPLOYER_RATE,
  SS_BREAKDOWN,
  DEFAULT_IRPF_RATE,
  formatCurrency,
} from "@/constants/payrollConstants";

interface EmployeePayrollCalculatorProps {
  employeeId: string;
  employeeName: string;
  defaultGrossSalary?: number;
  defaultIrpfRate?: number;
  onPayrollCreated?: () => void;
}

interface CalcResult {
  dry_run: boolean;
  gross_salary: number;
  ss_base: number;
  ss_employee_rate: number;
  ss_employee: number;
  ss_employer_rate: number;
  ss_employer: number;
  irpf_rate: number;
  irpf_amount: number;
  net_salary: number;
  total_cost_company: number;
  payroll_run_id?: string;
  run_number?: string;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const EmployeePayrollCalculator = ({
  employeeId,
  employeeName,
  defaultGrossSalary,
  defaultIrpfRate,
  onPayrollCreated,
}: EmployeePayrollCalculatorProps) => {
  const { toast } = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [grossSalary, setGrossSalary] = useState(defaultGrossSalary?.toString() || "");
  const [ssBase, setSsBase] = useState("");
  const [irpfRate, setIrpfRate] = useState(defaultIrpfRate?.toString() || DEFAULT_IRPF_RATE.toString());
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const runSimulation = async () => {
    const salary = parseFloat(grossSalary);
    if (!salary || salary <= 0) {
      toast({ title: "Error", description: "Introduce un salario bruto válido", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await (supabase.rpc as any)("payroll_calculate_with_ss", {
        p_employee_id: employeeId,
        p_year: year,
        p_month: month,
        p_gross_salary: salary,
        p_ss_base: ssBase ? parseFloat(ssBase) : null,
        p_irpf_rate: irpfRate ? parseFloat(irpfRate) : null,
        p_dry_run: true,
      });
      if (error) throw error;
      setResult(data as unknown as CalcResult);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const confirmCreate = async () => {
    const salary = parseFloat(grossSalary);
    if (!salary || salary <= 0) return;
    setCreating(true);
    try {
      const { data, error } = await (supabase.rpc as any)("payroll_calculate_with_ss", {
        p_employee_id: employeeId,
        p_year: year,
        p_month: month,
        p_gross_salary: salary,
        p_ss_base: ssBase ? parseFloat(ssBase) : null,
        p_irpf_rate: irpfRate ? parseFloat(irpfRate) : null,
        p_dry_run: false,
      });
      if (error) throw error;
      const res = data as unknown as CalcResult;
      toast({
        title: "Nómina creada",
        description: `${res.run_number} - Neto: ${formatCurrency(res.net_salary)}`,
      });
      setResult(null);
      onPayrollCreated?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="border border-white/10 rounded-lg bg-zinc-900/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Calculadora Nómina con SS — {employeeName}</span>
        </div>
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-[10px] text-white/40 hover:text-white/70 underline"
        >
          {showBreakdown ? "Ocultar" : "Ver"} tipos SS
        </button>
      </div>

      {showBreakdown && (
        <div className="grid grid-cols-2 gap-3 text-[10px] bg-zinc-800/50 rounded p-2">
          <div>
            <span className="text-white/50 font-medium">Empleado ({SS_EMPLOYEE_RATE}%)</span>
            <div className="space-y-0.5 mt-1 text-white/40">
              <div>CC: {SS_BREAKDOWN.employee.contingencias_comunes}%</div>
              <div>Desempleo: {SS_BREAKDOWN.employee.desempleo_general}%</div>
              <div>FP: {SS_BREAKDOWN.employee.formacion_profesional}%</div>
              <div>MEI: {SS_BREAKDOWN.employee.mec}%</div>
            </div>
          </div>
          <div>
            <span className="text-white/50 font-medium">Empresa ({SS_EMPLOYER_RATE}%)</span>
            <div className="space-y-0.5 mt-1 text-white/40">
              <div>CC: {SS_BREAKDOWN.employer.contingencias_comunes}%</div>
              <div>Desempleo: {SS_BREAKDOWN.employer.desempleo_general}%</div>
              <div>FP: {SS_BREAKDOWN.employer.formacion_profesional}%</div>
              <div>FOGASA: {SS_BREAKDOWN.employer.fogasa}%</div>
              <div>AT/EP: {SS_BREAKDOWN.employer.accidentes_trabajo}%</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-2">
        <div>
          <Label className="text-xs text-white/60">Año</Label>
          <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || now.getFullYear())} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-white/60">Mes</Label>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-full h-8 text-sm rounded-md border border-input bg-background px-2">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs text-white/60">Bruto (EUR)</Label>
          <Input type="number" value={grossSalary} onChange={(e) => setGrossSalary(e.target.value)} placeholder="1500" className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-white/60">Base SS</Label>
          <Input type="number" value={ssBase} onChange={(e) => setSsBase(e.target.value)} placeholder="= Bruto" className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-white/60">IRPF %</Label>
          <Input type="number" value={irpfRate} onChange={(e) => setIrpfRate(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      <Button onClick={runSimulation} disabled={loading} size="sm" className="w-full">
        {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Calculator className="h-3 w-3 mr-1" />}
        Simular nómina
      </Button>

      {result && result.dry_run && (
        <div className="border border-blue-500/20 rounded-lg p-3 bg-blue-500/5 space-y-3">
          <div className="text-xs font-medium text-blue-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Simulación — {MONTHS[month - 1]} {year}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-white/50">Salario bruto</span>
              <span className="text-white font-mono">{formatCurrency(result.gross_salary)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Base SS</span>
              <span className="text-white/70 font-mono">{formatCurrency(result.ss_base)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">SS empleado ({result.ss_employee_rate}%)</span>
              <span className="text-red-400 font-mono">-{formatCurrency(result.ss_employee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">SS empresa ({result.ss_employer_rate}%)</span>
              <span className="text-amber-400 font-mono">{formatCurrency(result.ss_employer)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">IRPF ({result.irpf_rate}%)</span>
              <span className="text-red-400 font-mono">-{formatCurrency(result.irpf_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Coste empresa total</span>
              <span className="text-amber-400 font-mono font-bold">{formatCurrency(result.total_cost_company)}</span>
            </div>
          </div>
          <div className="border-t border-white/10 pt-2 flex justify-between items-center">
            <span className="text-sm font-medium text-white/70">Neto a percibir</span>
            <span className="text-lg font-bold text-emerald-400">{formatCurrency(result.net_salary)}</span>
          </div>
          <Button onClick={confirmCreate} disabled={creating} size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
            {creating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Crear nómina definitiva
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmployeePayrollCalculator;
