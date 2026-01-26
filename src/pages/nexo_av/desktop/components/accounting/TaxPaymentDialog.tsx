import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Receipt, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BankAccount {
  id: string;
  holder: string;
  bank: string;
  iban: string;
  notes: string;
}

interface TaxPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccounts: BankAccount[];
  onSuccess: () => void;
}

const TAX_TYPES = [
  { value: "IVA", label: "IVA (Modelo 303)", description: "Liquidación trimestral de IVA" },
  { value: "IRPF", label: "IRPF (Modelo 111)", description: "Retenciones a trabajadores y profesionales" },
  { value: "IS", label: "Impuesto de Sociedades", description: "Pago a cuenta o liquidación anual" },
];

const TaxPaymentDialog = ({
  open,
  onOpenChange,
  bankAccounts,
  onSuccess,
}: TaxPaymentDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [taxType, setTaxType] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [period, setPeriod] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  const selectedBank = bankAccounts.find(acc => acc.id === selectedBankId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBankId || !taxType || !amount) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    const amountValue = parseFloat(amount.replace(",", "."));
    if (isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: "Error",
        description: "El importe debe ser un número positivo",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await (supabase.rpc as any)("create_tax_payment", {
        p_bank_account_id: selectedBankId,
        p_bank_name: selectedBank?.bank || "",
        p_tax_type: taxType,
        p_amount: amountValue,
        p_payment_date: paymentDate,
        p_period: period || null,
        p_notes: notes || null,
      });

      if (error) throw error;

      const result = data?.[0];

      toast({
        title: "Pago de impuesto registrado",
        description: `Asiento ${result?.entry_number} - ${taxType} ${formatCurrency(amountValue)}`,
      });

      // Reset form
      setSelectedBankId("");
      setTaxType("");
      setAmount("");
      setPeriod("");
      setNotes("");
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
      
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating tax payment:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el pago",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Pago de Impuesto
          </DialogTitle>
          <DialogDescription>
            Registra un pago de impuestos (IVA, IRPF, IS). Se creará un asiento contable automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Impuesto */}
          <div className="space-y-2">
            <Label>Tipo de Impuesto *</Label>
            <Select value={taxType} onValueChange={setTaxType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de impuesto" />
              </SelectTrigger>
              <SelectContent className="z-[99999]">
                {TAX_TYPES.map((tax) => (
                  <SelectItem key={tax.value} value={tax.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{tax.label}</span>
                      <span className="text-xs text-muted-foreground">{tax.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Banco */}
          <div className="space-y-2">
            <Label>Cuenta Bancaria *</Label>
            <Select value={selectedBankId} onValueChange={setSelectedBankId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la cuenta de pago" />
              </SelectTrigger>
              <SelectContent className="z-[99999]">
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{account.bank}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Importe */}
          <div className="space-y-2">
            <Label htmlFor="amount">Importe (€) *</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono text-right"
            />
          </div>

          {/* Período */}
          <div className="space-y-2">
            <Label htmlFor="period">Período (opcional)</Label>
            <Input
              id="period"
              type="text"
              placeholder="Ej: Q4-2025, 2025, Enero 2026"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Indica el período fiscal al que corresponde el pago
            </p>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Fecha del Pago</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales sobre el pago"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedBankId || !taxType || !amount}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaxPaymentDialog;
