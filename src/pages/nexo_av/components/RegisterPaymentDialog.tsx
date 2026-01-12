import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, CreditCard, Loader2 } from "lucide-react";
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

interface RegisterPaymentDialogProps {
  invoiceId: string;
  pendingAmount: number;
  onPaymentRegistered: () => void;
  trigger?: React.ReactNode;
}

const RegisterPaymentDialog = ({
  invoiceId,
  pendingAmount,
  onPaymentRegistered,
  trigger,
}: RegisterPaymentDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState(pendingAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState("TRANSFER");
  const [bankReference, setBankReference] = useState("");
  const [notes, setNotes] = useState("");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

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

    if (numAmount > pendingAmount) {
      const confirm = window.confirm(
        `El importe (${formatCurrency(numAmount)}) supera el pendiente (${formatCurrency(pendingAmount)}). ¿Continuar de todos modos?`
      );
      if (!confirm) return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc("finance_register_payment", {
        p_invoice_id: invoiceId,
        p_amount: numAmount,
        p_payment_date: format(paymentDate, "yyyy-MM-dd"),
        p_payment_method: paymentMethod,
        p_bank_reference: bankReference || null,
        p_notes: notes || null,
      });

      if (error) throw error;

      toast({
        title: "Pago registrado",
        description: `Se ha registrado un pago de ${formatCurrency(numAmount)}`,
      });

      setOpen(false);
      resetForm();
      onPaymentRegistered();
    } catch (error: any) {
      console.error("Error registering payment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo registrar el pago",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPaymentDate(new Date());
    setAmount(pendingAmount.toString());
    setPaymentMethod("TRANSFER");
    setBankReference("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <CreditCard className="h-4 w-4" />
            Registrar Pago
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-400" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Pendiente de cobro: {formatCurrency(pendingAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Fecha de pago */}
          <div className="space-y-2">
            <Label>Fecha de pago</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white",
                    !paymentDate && "text-white/50"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate
                    ? format(paymentDate, "dd/MM/yyyy", { locale: es })
                    : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#1a1a2e] border-white/10">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Importe */}
          <div className="space-y-2">
            <Label>Importe (€)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="0.00"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-emerald-400 hover:text-emerald-300 p-0 h-auto"
              onClick={() => setAmount(pendingAmount.toString())}
            >
              Usar importe pendiente ({formatCurrency(pendingAmount)})
            </Button>
          </div>

          {/* Método de pago */}
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10">
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem
                    key={method.value}
                    value={method.value}
                    className="text-white hover:bg-white/10"
                  >
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Referencia bancaria */}
          <div className="space-y-2">
            <Label>Referencia bancaria (opcional)</Label>
            <Input
              value={bankReference}
              onChange={(e) => setBankReference(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Nº transferencia, ticket, etc."
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-white/5 border-white/10 text-white resize-none"
              placeholder="Observaciones sobre el pago..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-white/60 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              "Registrar Pago"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterPaymentDialog;
