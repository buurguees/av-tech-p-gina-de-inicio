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

interface BankAccount {
  id: string;
  bank_name: string;
  account_code: string;
}

interface RegisterPartnerPayrollPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payrollId: string;
  onSuccess: () => void;
}

export default function RegisterPartnerPayrollPaymentDialog({
  open,
  onOpenChange,
  payrollId,
  onSuccess,
}: RegisterPartnerPayrollPaymentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [payrollInfo, setPayrollInfo] = useState<{
    net_amount: number;
    partner_name: string;
    period: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "TRANSFER",
    bank_account_id: "",
    bank_reference: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      fetchPayrollInfo();
      fetchBankAccounts();
    }
  }, [open, payrollId]);

  const fetchPayrollInfo = async () => {
    setLoadingPayroll(true);
    try {
      const { data, error } = await supabase.rpc("list_partner_compensation_runs", {
        p_limit: 1000,
      });

      if (error) throw error;

      const payroll = (data || []).find((p: any) => p.id === payrollId);
      if (payroll) {
        setPayrollInfo({
          net_amount: payroll.net_amount,
          partner_name: payroll.partner_name,
          period: `${payroll.period_month}/${payroll.period_year}`,
        });
        setFormData(prev => ({
          ...prev,
          amount: payroll.net_amount.toFixed(2),
        }));
      }
    } catch (error) {
      console.error("Error fetching payroll:", error);
    } finally {
      setLoadingPayroll(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase.rpc("list_bank_accounts_with_balances", {});
      if (error) throw error;
      setBankAccounts(
        (data || []).map((b: any) => ({
          id: b.bank_account_id,
          bank_name: b.bank_name,
          account_code: b.account_code,
        }))
      );
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, bank_account_id: data[0].bank_account_id }));
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.rpc("create_payroll_payment", {
        p_partner_compensation_run_id: payrollId,
        p_amount: parseFloat(formData.amount),
        p_payment_date: formData.payment_date,
        p_payment_method: formData.payment_method,
        p_bank_account_id: formData.bank_account_id || null,
        p_bank_reference: formData.bank_reference || null,
        p_notes: formData.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Pago registrado",
        description: "El pago se ha registrado y el asiento contable se ha generado",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error registering payment:", error);
      toast({
        title: "Error",
        description: error.message || "Error al registrar el pago",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
          <DialogTitle>Registrar Pago de Nómina</DialogTitle>
          <DialogDescription>
            {payrollInfo
              ? `Pago para ${payrollInfo.partner_name} - ${payrollInfo.period}`
              : "Cargando información..."}
          </DialogDescription>
        </DialogHeader>

        {loadingPayroll ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Info summary */}
            {payrollInfo && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2 text-sm">
                <div className="flex justify-between pt-2">
                  <span className="font-medium">Neto a Pagar</span>
                  <span className="font-bold text-primary">{formatCurrency(payrollInfo.net_amount)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="payment_date">Fecha de Pago</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="payment_method">Método de Pago</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSFER">Transferencia</SelectItem>
                    <SelectItem value="CARD">Tarjeta</SelectItem>
                    <SelectItem value="CASH">Efectivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bank_account_id">Cuenta Origen</Label>
                <Select
                  value={formData.bank_account_id}
                  onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="bank_reference">Referencia Bancaria</Label>
                <Input
                  id="bank_reference"
                  value={formData.bank_reference}
                  onChange={(e) => setFormData({ ...formData, bank_reference: e.target.value })}
                  placeholder="Ej: TRF-123456"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !formData.amount}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar Pago"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
