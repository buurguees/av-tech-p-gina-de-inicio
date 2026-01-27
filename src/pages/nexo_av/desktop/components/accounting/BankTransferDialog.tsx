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
import { Loader2, ArrowRightLeft, Building2 } from "lucide-react";
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

interface BankTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccounts: BankAccount[];
  onSuccess: () => void;
}

const BankTransferDialog = ({
  open,
  onOpenChange,
  bankAccounts,
  onSuccess,
}: BankTransferDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [sourceBankId, setSourceBankId] = useState<string>("");
  const [targetBankId, setTargetBankId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [transferDate, setTransferDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  const sourceBank = bankAccounts.find(acc => acc.id === sourceBankId);
  const targetBank = bankAccounts.find(acc => acc.id === targetBankId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceBankId || !targetBankId || !amount) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (sourceBankId === targetBankId) {
      toast({
        title: "Error",
        description: "El banco origen y destino deben ser diferentes",
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
      const { data, error } = await supabase.rpc("create_bank_transfer", {
        p_source_bank_id: sourceBankId,
        p_source_bank_name: sourceBank?.bank || "",
        p_target_bank_id: targetBankId,
        p_target_bank_name: targetBank?.bank || "",
        p_amount: amountValue,
        p_transfer_date: transferDate,
        p_notes: notes || null,
      });

      if (error) throw error;

      const result = data?.[0];

      toast({
        title: "Traspaso registrado",
        description: `Asiento ${result?.entry_number} - ${formatCurrency(amountValue)}`,
      });

      // Reset form
      setSourceBankId("");
      setTargetBankId("");
      setAmount("");
      setNotes("");
      setTransferDate(format(new Date(), "yyyy-MM-dd"));
      
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating bank transfer:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el traspaso",
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
            <ArrowRightLeft className="h-5 w-5" />
            Traspaso entre Bancos
          </DialogTitle>
          <DialogDescription>
            Registra un traspaso de fondos entre cuentas bancarias. Se creará un asiento contable automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Banco Origen */}
          <div className="space-y-2">
            <Label>Banco Origen *</Label>
            <Select value={sourceBankId} onValueChange={setSourceBankId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona banco origen" />
              </SelectTrigger>
              <SelectContent className="z-[99999]">
                {bankAccounts.map((account) => (
                  <SelectItem 
                    key={account.id} 
                    value={account.id}
                    disabled={account.id === targetBankId}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{account.bank}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Banco Destino */}
          <div className="space-y-2">
            <Label>Banco Destino *</Label>
            <Select value={targetBankId} onValueChange={setTargetBankId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona banco destino" />
              </SelectTrigger>
              <SelectContent className="z-[99999]">
                {bankAccounts.map((account) => (
                  <SelectItem 
                    key={account.id} 
                    value={account.id}
                    disabled={account.id === sourceBankId}
                  >
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

          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="transferDate">Fecha del Traspaso</Label>
            <Input
              id="transferDate"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Ej: Traspaso para pagos internacionales"
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
              disabled={isSubmitting || !sourceBankId || !targetBankId || !amount}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Traspaso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BankTransferDialog;
