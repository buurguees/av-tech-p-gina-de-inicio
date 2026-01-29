import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, CreditCard, Loader2, Coins, Pencil, CheckCircle2, Ban, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_METHODS } from "@/constants/financeStatuses";

interface BankAccount {
  id: string;
  holder: string;
  bank: string;
  iban: string;
  notes: string;
}

interface RegisterPaymentDialogProps {
  invoiceId: string;
  pendingAmount: number;
  onPaymentRegistered: () => void;
  trigger?: React.ReactNode;
  payment?: {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    bank_reference: string | null;
    notes: string | null;
    company_bank_account_id?: string;
  };
}

const RegisterPaymentDialog = ({
  invoiceId,
  pendingAmount,
  onPaymentRegistered,
  trigger,
  payment,
}: RegisterPaymentDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date>(
    payment ? new Date(payment.payment_date) : new Date()
  );
  const [amount, setAmount] = useState(
    payment ? payment.amount.toString() : pendingAmount.toString()
  );
  const [paymentMethod, setPaymentMethod] = useState(
    payment ? payment.payment_method : "TRANSFER"
  );
  const [bankReference, setBankReference] = useState(
    payment?.bank_reference || ""
  );
  const [notes, setNotes] = useState(payment?.notes || "");
  const [bankAccountId, setBankAccountId] = useState<string>(
    payment?.company_bank_account_id || "NONE"
  );
  const [availableBankAccounts, setAvailableBankAccounts] = useState<BankAccount[]>([]);

  const isEditing = !!payment;

  useEffect(() => {
    if (open) {
      fetchBankAccounts();
      if (!isEditing) {
        setAmount(pendingAmount.toString());
        setPaymentDate(new Date());
        setBankReference("");
        setNotes("");
        setPaymentMethod("TRANSFER");
        setBankAccountId("NONE");
      }
    }
  }, [open, pendingAmount, isEditing]);

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase.rpc('get_company_preferences');
      if (error) throw error;

      if (data && data.length > 0 && data[0].bank_accounts) {
        setAvailableBankAccounts(data[0].bank_accounts as unknown as BankAccount[]);
      }
    } catch (err) {
      console.error("Error fetching bank accounts:", err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/,/g, ".");
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  const currentAmount = parseFloat(amount) || 0;
  const maxAllowed = isEditing ? (pendingAmount + payment.amount) : pendingAmount;
  const remainingAfterPayment = Math.max(0, maxAllowed - currentAmount);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El importe debe ser mayor a 0",
      });
      return;
    }

    if (numAmount > (maxAllowed + 0.01)) {
      const confirm = window.confirm(
        `El importe (${formatCurrency(numAmount)}) supera el pendiente (${formatCurrency(maxAllowed)}). ¿Deseas registrarlo de todos modos?`
      );
      if (!confirm) return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase.rpc("finance_update_payment", {
          p_payment_id: payment.id,
          p_amount: numAmount,
          p_payment_date: format(paymentDate, "yyyy-MM-dd"),
          p_payment_method: paymentMethod,
          p_bank_reference: bankReference || null,
          p_notes: notes || null,
          p_company_bank_account_id: bankAccountId === "NONE" ? null : bankAccountId
        });
        if (error) throw error;
        toast({
          title: "Pago actualizado",
          description: `Se ha modificado el cobro a ${formatCurrency(numAmount)}`,
        });
      } else {
        // Register payment - accounting entries are created automatically by the RPC
        const { error } = await supabase.rpc("finance_register_payment", {
          p_invoice_id: invoiceId,
          p_amount: numAmount,
          p_payment_date: format(paymentDate, "yyyy-MM-dd"),
          p_payment_method: paymentMethod,
          p_bank_reference: bankReference || null,
          p_notes: notes || null,
          p_company_bank_account_id: bankAccountId === "NONE" ? null : bankAccountId
        });
        if (error) throw error;
        toast({
          title: "Pago registrado",
          description: `Se ha registrado un cobro de ${formatCurrency(numAmount)}. Los asientos contables se han generado automáticamente.`,
        });
      }

      setOpen(false);
      onPaymentRegistered();
    } catch (error: any) {
      console.error("Error saving payment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo procesar el pago",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <CreditCard className="h-4 w-4" />
            Registrar Cobro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-900/90 backdrop-blur-3xl border-white/10 text-white max-w-xl rounded-[2.5rem] shadow-2xl p-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/5 pointer-events-none" />

        <div className="p-6 md:p-8 space-y-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
                {isEditing ? <Pencil className="h-5 w-5 text-amber-400" /> : <Coins className="h-5 w-5 text-emerald-400" />}
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {isEditing ? "Editar Cobro" : "Registrar Cobro"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-white/50 text-sm pl-0.5">
              {isEditing 
                ? `Modificando registro de cobro #${payment.id.slice(0, 8)}` 
                : "Los asientos contables se generarán automáticamente"}
            </DialogDescription>
          </DialogHeader>

          {/* Amount context display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1">
                {isEditing ? "Total Editable" : "Saldo Pendiente"}
              </span>
              <p className="text-lg font-bold text-white leading-none">
                {formatCurrency(maxAllowed)}
              </p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1">
                Restante tras cobro
              </span>
              <p className={`text-lg font-bold leading-none ${remainingAfterPayment < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {formatCurrency(Math.max(0, remainingAfterPayment))}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Fecha del pago */}
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-semibold ml-1 uppercase tracking-wide">
                Fecha del Cobro
              </Label>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 justify-start text-left font-medium bg-white/5 border-white/10 text-white rounded-2xl hover:bg-white/10 transition-all",
                      !paymentDate && "text-white/40"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 text-emerald-400" />
                    {paymentDate
                      ? format(paymentDate, "d 'de' MMMM, yyyy", { locale: es })
                      : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-900/95 backdrop-blur-3xl border-white/10 rounded-2xl shadow-2xl z-[10002]" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={(date) => date && setPaymentDate(date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Importe y Método de pago - Grid 2 columnas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/60 text-xs font-semibold ml-1 uppercase tracking-wide">
                  Importe (€)
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={handleAmountChange}
                  className="font-mono text-lg h-12 bg-white/5 border-white/10 text-white rounded-2xl"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/60 text-xs font-semibold ml-1 uppercase tracking-wide">
                  Método de Pago
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-2xl">
                    <SelectValue placeholder="Selecciona método" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900/95 backdrop-blur-3xl border-white/10 rounded-xl z-[10002]">
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value} className="text-white hover:bg-white/10">
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cuenta bancaria */}
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-semibold ml-1 uppercase tracking-wide flex items-center gap-2">
                <Landmark className="h-3.5 w-3.5" />
                Recibido en (Cuenta Bancaria)
              </Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-2xl">
                  <SelectValue placeholder="Selecciona cuenta bancaria" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900/95 backdrop-blur-3xl border-white/10 rounded-xl z-[10002]">
                  <SelectItem value="NONE" className="text-white hover:bg-white/10">
                    Sin especificar cuenta
                  </SelectItem>
                  {availableBankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-white hover:bg-white/10">
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium">{acc.bank}</span>
                        <span className="text-xs text-white/50">{acc.iban}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Referencia */}
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-semibold ml-1 uppercase tracking-wide">
                Nº de Referencia (Opcional)
              </Label>
              <Input
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                placeholder="Nº transferencia, recibo, etc."
                className="h-12 bg-white/5 border-white/10 text-white rounded-2xl"
              />
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-semibold ml-1 uppercase tracking-wide">
                Notas internas (Opcional)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalles adicionales sobre este cobro..."
                className="min-h-[80px] bg-white/5 border-white/10 text-white rounded-2xl resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="bg-white/[0.02] border-t border-white/5 p-6 md:p-8 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="flex-1 h-12 text-white/40 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
          >
            <Ban className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-[1.5] h-12 text-white font-bold rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${isEditing ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? "Guardando..." : "Registrando..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isEditing ? "Guardar Cambios" : "Registrar Cobro"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterPaymentDialog;
