import { useState, useEffect } from "react";
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

interface PayrollRun {
  id: string;
  payroll_number: string;
  employee_name: string;
  net_amount: number;
  paid_amount?: number;
}

interface CompensationRun {
  id: string;
  compensation_number: string;
  partner_name: string;
  net_amount: number;
  paid_amount?: number;
}

interface CreatePayrollPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  payrollRunId?: string;
  compensationRunId?: string;
}

export default function CreatePayrollPaymentDialog({
  open,
  onOpenChange,
  onSuccess,
  payrollRunId,
  compensationRunId,
}: CreatePayrollPaymentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);
  const [payrolls, setPayrolls] = useState<PayrollRun[]>([]);
  const [compensations, setCompensations] = useState<CompensationRun[]>([]);

  const [formData, setFormData] = useState({
    payment_type: payrollRunId ? "payroll" : compensationRunId ? "compensation" : "payroll",
    payroll_run_id: "",
    partner_compensation_run_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    amount: "",
    payment_method: "TRANSFER",
    bank_reference: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      if (payrollRunId) {
        fetchPayrolls().then(() => {
          const payroll = payrolls.find((p) => p.id === payrollRunId);
          if (payroll) {
            setFormData({
              payment_type: "payroll",
              payroll_run_id: payrollRunId,
              partner_compensation_run_id: "",
              payment_date: new Date().toISOString().split("T")[0],
              amount: (payroll.net_amount - (payroll.paid_amount || 0)).toFixed(2),
              payment_method: "TRANSFER",
              bank_reference: "",
              notes: "",
            });
          }
        });
      } else if (compensationRunId) {
        fetchCompensations().then(() => {
          const comp = compensations.find((c) => c.id === compensationRunId);
          if (comp) {
            setFormData({
              payment_type: "compensation",
              payroll_run_id: "",
              partner_compensation_run_id: compensationRunId,
              payment_date: new Date().toISOString().split("T")[0],
              amount: (comp.net_amount - (comp.paid_amount || 0)).toFixed(2),
              payment_method: "TRANSFER",
              bank_reference: "",
              notes: "",
            });
          }
        });
      } else {
        if (formData.payment_type === "payroll") {
          fetchPayrolls();
        } else {
          fetchCompensations();
        }
      }
    }
  }, [open, payrollRunId, compensationRunId]);

  const fetchPayrolls = async (): Promise<void> => {
    setLoadingPayrolls(true);
    try {
      const { data, error } = await supabase.rpc("list_payroll_runs", {
        p_status: "POSTED",
        p_limit: 1000,
      });

      if (error) throw error;

      // Calcular pagos realizados para cada nómina
      const payrollsWithPayments = await Promise.all(
        (data || []).map(async (payroll: any) => {
          const { data: payments } = await supabase.rpc("list_payroll_payments", {
            p_payroll_run_id: payroll.id,
          });
          const paid = (payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
          return { ...payroll, paid_amount: paid };
        })
      );

      setPayrolls(payrollsWithPayments);
    } catch (error: any) {
      console.error("Error fetching payrolls:", error);
      toast({
        title: "Error",
        description: "Error al cargar nóminas",
        variant: "destructive",
      });
    } finally {
      setLoadingPayrolls(false);
    }
  };

  const fetchCompensations = async (): Promise<void> => {
    setLoadingPayrolls(true);
    try {
      const { data, error } = await supabase.rpc("list_partner_compensation_runs", {
        p_status: "POSTED",
        p_limit: 1000,
      });

      if (error) throw error;

      // Calcular pagos realizados
      const compensationsWithPayments = await Promise.all(
        (data || []).map(async (comp: any) => {
          const { data: payments } = await supabase.rpc("list_payroll_payments", {
            p_partner_compensation_run_id: comp.id,
          });
          const paid = (payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
          return { ...comp, paid_amount: paid };
        })
      );

      setCompensations(compensationsWithPayments);
    } catch (error: any) {
      console.error("Error fetching compensations:", error);
      toast({
        title: "Error",
        description: "Error al cargar retribuciones",
        variant: "destructive",
      });
    } finally {
      setLoadingPayrolls(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("create_payroll_payment", {
        p_amount: parseFloat(formData.amount),
        p_payroll_run_id: formData.payment_type === "payroll" ? formData.payroll_run_id : null,
        p_partner_compensation_run_id: formData.payment_type === "compensation" ? formData.partner_compensation_run_id : null,
        p_payment_date: formData.payment_date,
        p_payment_method: formData.payment_method,
        p_bank_reference: formData.bank_reference || null,
        p_notes: formData.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Pago registrado",
        description: "El pago se ha registrado y el asiento contable se ha generado automáticamente",
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast({
        title: "Error",
        description: error.message || "Error al registrar el pago",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      payment_type: "payroll",
      payroll_run_id: "",
      partner_compensation_run_id: "",
      payment_date: new Date().toISOString().split("T")[0],
      amount: "",
      payment_method: "TRANSFER",
      bank_reference: "",
      notes: "",
    });
  };

  const selectedPayroll = payrolls.find((p) => p.id === formData.payroll_run_id);
  const selectedCompensation = compensations.find((c) => c.id === formData.partner_compensation_run_id);
  const pendingAmount = formData.payment_type === "payroll"
    ? (selectedPayroll?.net_amount || 0) - (selectedPayroll?.paid_amount || 0)
    : (selectedCompensation?.net_amount || 0) - (selectedCompensation?.paid_amount || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Pago de Nómina/Retribución</DialogTitle>
          <DialogDescription>
            Registra un pago. Se generará automáticamente el asiento contable.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="payment_type">Tipo de pago</Label>
            <Select
              value={formData.payment_type}
              onValueChange={(value) => {
                setFormData({
                  ...formData,
                  payment_type: value,
                  payroll_run_id: value === "payroll" ? formData.payroll_run_id : "",
                  partner_compensation_run_id: value === "compensation" ? formData.partner_compensation_run_id : "",
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="payroll">Nómina</SelectItem>
                <SelectItem value="compensation">Retribución</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.payment_type === "payroll" ? (
            <div>
              <Label htmlFor="payroll_run_id">
                Nómina <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.payroll_run_id}
                onValueChange={(value) => {
                  const payroll = payrolls.find((p) => p.id === value);
                  setFormData({
                    ...formData,
                    payroll_run_id: value,
                    amount: payroll ? (payroll.net_amount - (payroll.paid_amount || 0)).toFixed(2) : "",
                  });
                }}
                disabled={loadingPayrolls}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una nómina" />
                </SelectTrigger>
                <SelectContent>
                  {payrolls.map((payroll) => {
                    const pending = payroll.net_amount - (payroll.paid_amount || 0);
                    return (
                      <SelectItem key={payroll.id} value={payroll.id} disabled={pending <= 0}>
                        {payroll.payroll_number} - {payroll.employee_name} (Pendiente: {pending.toFixed(2)}€)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedPayroll && (
                <p className="text-sm text-muted-foreground mt-1">
                  Neto: {selectedPayroll.net_amount.toFixed(2)}€ | 
                  Pagado: {(selectedPayroll.paid_amount || 0).toFixed(2)}€ | 
                  Pendiente: {pendingAmount.toFixed(2)}€
                </p>
              )}
            </div>
          ) : (
            <div>
              <Label htmlFor="partner_compensation_run_id">
                Retribución <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.partner_compensation_run_id}
                onValueChange={(value) => {
                  const comp = compensations.find((c) => c.id === value);
                  setFormData({
                    ...formData,
                    partner_compensation_run_id: value,
                    amount: comp ? (comp.net_amount - (comp.paid_amount || 0)).toFixed(2) : "",
                  });
                }}
                disabled={loadingPayrolls || !!compensationRunId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una retribución" />
                </SelectTrigger>
                <SelectContent>
                  {compensations.map((comp) => {
                    const pending = comp.net_amount - (comp.paid_amount || 0);
                    return (
                      <SelectItem key={comp.id} value={comp.id} disabled={pending <= 0}>
                        {comp.compensation_number} - {comp.partner_name} (Pendiente: {pending.toFixed(2)}€)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedCompensation && (
                <p className="text-sm text-muted-foreground mt-1">
                  Neto: {selectedCompensation.net_amount.toFixed(2)}€ | 
                  Pagado: {(selectedCompensation.paid_amount || 0).toFixed(2)}€ | 
                  Pendiente: {pendingAmount.toFixed(2)}€
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_date">Fecha de pago <span className="text-destructive">*</span></Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="amount">
                Importe (€) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="payment_method">Método de pago</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSFER">Transferencia</SelectItem>
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="CHECK">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bank_reference">Referencia bancaria</Label>
              <Input
                id="bank_reference"
                value={formData.bank_reference}
                onChange={(e) => setFormData({ ...formData, bank_reference: e.target.value })}
                placeholder="Nº de transferencia, cheque, etc."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.amount ||
                (formData.payment_type === "payroll" && !formData.payroll_run_id) ||
                (formData.payment_type === "compensation" && !formData.partner_compensation_run_id)
              }
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar Pago"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
