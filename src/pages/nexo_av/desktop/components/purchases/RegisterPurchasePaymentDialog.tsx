import { useState, useEffect } from "react";
import { parseDecimalInput } from "@/pages/nexo_av/utils/parseDecimalInput";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, CreditCard, Loader2, Coins, ArrowRight, Ban, CheckCircle2, Landmark, Pencil, ArrowDownCircle } from "lucide-react";
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

interface RegisterPurchasePaymentDialogProps {
  invoiceId: string;
  pendingAmount: number;
  totalAmount?: number; // Para detectar si es factura negativa
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

const RegisterPurchasePaymentDialog = ({
  invoiceId,
  pendingAmount,
  totalAmount,
  onPaymentRegistered,
  trigger,
  payment,
}: RegisterPurchasePaymentDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date>(
    payment ? new Date(payment.payment_date) : new Date()
  );

  // Detectar si es factura negativa (nota de crédito / devolución)
  const isNegativeInvoice = (totalAmount !== undefined ? totalAmount : pendingAmount) < 0;
  
  // Para facturas negativas, trabajamos con el valor absoluto en el input
  const [amount, setAmount] = useState(
    payment ? Math.abs(payment.amount).toString() : Math.abs(pendingAmount).toString()
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
        setAmount(Math.abs(pendingAmount).toString());
        setPaymentDate(new Date());
      }
    }
  }, [open, pendingAmount]);

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

  const currentAmount = parseDecimalInput(amount);
  // Trabajar siempre con valores absolutos para la lógica
  const absPendingAmount = Math.abs(pendingAmount);
  const absPaymentAmount = payment ? Math.abs(payment.amount) : 0;
  const maxAllowed = isEditing ? (absPendingAmount + absPaymentAmount) : absPendingAmount;
  const remainingAfterPayment = Math.max(0, maxAllowed - currentAmount);

  const handleSubmit = async () => {
    const numAmount = parseDecimalInput(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El importe debe ser mayor a 0",
      });
      return;
    }

    if (numAmount > (maxAllowed + 0.01)) {
      const confirmMsg = isNegativeInvoice
        ? `El importe (${formatCurrency(numAmount)}) supera el reembolso pendiente (${formatCurrency(maxAllowed)}). ¿Deseas registrarlo de todos modos?`
        : `El importe (${formatCurrency(numAmount)}) supera el pendiente (${formatCurrency(maxAllowed)}). ¿Deseas registrarlo de todos modos?`;
      const confirmResult = window.confirm(confirmMsg);
      if (!confirmResult) return;
    }

    // Para facturas negativas, el pago registrado debe ser negativo
    const finalAmount = isNegativeInvoice ? -numAmount : numAmount;

    setLoading(true);
    try {
      if (isEditing) {
        // TODO: Implementar update_purchase_payment si es necesario
        toast({
          variant: "destructive",
          title: "Error",
          description: "La edición de pagos aún no está implementada",
        });
      } else {
        const { error } = await supabase.rpc("register_purchase_payment", {
          p_invoice_id: invoiceId,
          p_amount: finalAmount,
          p_payment_date: format(paymentDate, "yyyy-MM-dd"),
          p_payment_method: paymentMethod,
          p_bank_reference: bankReference || null,
          p_notes: notes || null,
          p_company_bank_account_id: bankAccountId === "NONE" ? null : bankAccountId
        });
        if (error) throw error;
        toast({
          title: isNegativeInvoice ? "Reembolso registrado" : "Pago registrado",
          description: isNegativeInvoice 
            ? `Se ha registrado un reembolso recibido de ${formatCurrency(numAmount)}`
            : `Se ha registrado un pago de ${formatCurrency(numAmount)}`,
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
          <Button className={cn(
            "text-white rounded-2xl shadow-lg gap-2 transition-all hover:scale-105 active:scale-95",
            isNegativeInvoice 
              ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
              : "bg-red-500 hover:bg-red-600 shadow-red-500/20"
          )}>
            {isNegativeInvoice ? <ArrowDownCircle className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
            {isNegativeInvoice ? "Registrar Reembolso" : "Registrar Pago"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-900/90 backdrop-blur-3xl border-white/10 text-white max-w-md rounded-[2.5rem] shadow-2xl p-0 overflow-hidden">
        <div className={cn(
          "absolute inset-0 pointer-events-none",
          isNegativeInvoice 
            ? "bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/5"
            : "bg-gradient-to-br from-red-500/10 via-transparent to-blue-500/5"
        )} />

        <div className="p-6 md:p-8 space-y-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-2xl shadow-inner",
                isEditing 
                  ? "bg-amber-500/10 border border-amber-500/20"
                  : isNegativeInvoice 
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-red-500/10 border border-red-500/20"
              )}>
                {isEditing ? (
                  <Pencil className="h-5 w-5 text-amber-400" />
                ) : isNegativeInvoice ? (
                  <ArrowDownCircle className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Coins className="h-5 w-5 text-red-400" />
                )}
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {isEditing 
                  ? (isNegativeInvoice ? "Editar Reembolso" : "Editar Pago") 
                  : (isNegativeInvoice ? "Registrar Reembolso Recibido" : "Registrar Pago")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-white/50 text-sm pl-0.5">
              {isEditing 
                ? `Modificando registro #${payment.id.slice(0, 8)}` 
                : isNegativeInvoice 
                  ? "Esta es una nota de crédito. Registra el reembolso recibido del proveedor."
                  : "Introduce los detalles del pago realizado"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1">
                {isEditing ? "Total Editable" : isNegativeInvoice ? "Reembolso Pendiente" : "Saldo Pendiente"}
              </span>
              <p className={cn(
                "text-lg font-bold leading-none",
                isNegativeInvoice ? "text-emerald-400" : "text-white"
              )}>
                {formatCurrency(maxAllowed)}
              </p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1">
                {isNegativeInvoice ? "Restante por recibir" : "Restante tras pago"}
              </span>
              <p className={`text-lg font-bold leading-none ${remainingAfterPayment < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {formatCurrency(Math.max(0, remainingAfterPayment))}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-semibold ml-1 uppercase tracking-wide">Fecha del Movimiento</Label>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 justify-start text-left font-medium bg-white/5 border-white/10 text-white rounded-2xl hover:bg-white/10 transition-all",
                      !paymentDate && "text-white/40"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 text-red-400" />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Importe (€)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={handleAmountChange}
                  className="font-mono text-lg"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Método</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Método" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {isNegativeInvoice ? "Recibido en (Cuenta Banco)" : "Pagado desde (Cuenta Banco)"}
              </Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona cuenta bancaria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Ninguna cuenta específica</SelectItem>
                  {availableBankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-medium">{acc.bank}</span>
                        <span className="text-xs text-muted-foreground">{acc.iban}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Referencia (Opcional)</Label>
              <Input
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                placeholder="Nº transferencia, ticket, etc."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas internas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalles sobre este pago..."
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
            className={cn(
              "flex-[1.5] h-12 text-white font-bold rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
              isEditing 
                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30" 
                : isNegativeInvoice
                  ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
                  : "bg-red-500 hover:bg-red-600 shadow-red-500/30"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? "Actualizando..." : "Registrando..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isEditing 
                  ? "Guardar Cambios" 
                  : isNegativeInvoice 
                    ? "Registrar Reembolso" 
                    : "Registrar Pago"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterPurchasePaymentDialog;
