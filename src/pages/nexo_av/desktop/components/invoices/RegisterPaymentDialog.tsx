import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, CreditCard, Loader2, Coins, Pencil, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import "../../styles/components/common/form-dialog.css";

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
  const [bankReference, setBankReference] = useState(
    payment?.bank_reference || ""
  );

  const isEditing = !!payment;

  useEffect(() => {
    if (open && !isEditing) {
      setAmount(pendingAmount.toString());
      setPaymentDate(new Date());
      setBankReference("");
    }
  }, [open, pendingAmount, isEditing]);

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
          p_payment_method: "TRANSFER", // Default method
          p_bank_reference: bankReference || null,
          p_notes: null,
          p_company_bank_account_id: null
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
          p_payment_method: "TRANSFER", // Default method
          p_bank_reference: bankReference || null,
          p_notes: null,
          p_company_bank_account_id: null
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
      <DialogContent className="form-dialog sm:max-w-md">
        <DialogHeader className="form-dialog__header">
          <div className="form-dialog__header-icon">
            {isEditing ? <Pencil className="h-5 w-5" /> : <Coins className="h-5 w-5" />}
          </div>
          <div>
            <DialogTitle className="form-dialog__title">
              {isEditing ? "Editar Cobro" : "Registrar Cobro"}
            </DialogTitle>
            <DialogDescription className="form-dialog__description">
              {isEditing 
                ? `Modificando registro de cobro` 
                : "Los asientos contables se generarán automáticamente"}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="form-dialog__body space-y-5">
          {/* Amount context display */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">
                {isEditing ? "Total Editable" : "Saldo Pendiente"}
              </span>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(maxAllowed)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">
                Restante tras cobro
              </span>
              <p className={`text-lg font-semibold ${remainingAfterPayment <= 0 ? "text-success" : "text-foreground"}`}>
                {formatCurrency(Math.max(0, remainingAfterPayment))}
              </p>
            </div>
          </div>

          {/* Fecha del pago */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fecha del Cobro
            </Label>
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-11 justify-start text-left font-medium",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                  {paymentDate
                    ? format(paymentDate, "d 'de' MMMM, yyyy", { locale: es })
                    : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                  className="p-3"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Importe */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Importe (€)
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              className="font-mono text-lg"
              placeholder="0.00"
            />
          </div>

          {/* Nº Referencia */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nº de Referencia
            </Label>
            <Input
              value={bankReference}
              onChange={(e) => setBankReference(e.target.value)}
              placeholder="Nº transferencia, recibo, etc."
            />
          </div>
        </div>

        <DialogFooter className="form-dialog__footer gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? "Guardando..." : "Registrando..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isEditing ? "Guardar" : "Registrar Cobro"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterPaymentDialog;
