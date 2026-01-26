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
import { Loader2, Building2, AlertCircle } from "lucide-react";
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

interface BankBalanceAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccounts: BankAccount[];
  currentTotalBalance: number;
  onSuccess: () => void;
}

const BankBalanceAdjustmentDialog = ({
  open,
  onOpenChange,
  bankAccounts,
  currentTotalBalance,
  onSuccess,
}: BankBalanceAdjustmentDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [newBalance, setNewBalance] = useState<string>("");
  const [adjustmentDate, setAdjustmentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  const selectedAccount = bankAccounts.find(acc => acc.id === selectedAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAccountId || !newBalance) {
      toast({
        title: "Error",
        description: "Selecciona una cuenta e indica el nuevo saldo",
        variant: "destructive",
      });
      return;
    }

    const balanceValue = parseFloat(newBalance.replace(",", "."));
    if (isNaN(balanceValue)) {
      toast({
        title: "Error",
        description: "El saldo debe ser un número válido",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Use any type to bypass strict RPC typing for new function
      const { data, error } = await (supabase.rpc as any)("create_bank_balance_adjustment", {
        p_bank_account_id: selectedAccountId,
        p_bank_name: selectedAccount?.bank || "Cuenta bancaria",
        p_new_balance: balanceValue,
        p_adjustment_date: adjustmentDate,
        p_notes: notes || null,
      });

      if (error) throw error;

      const result = data?.[0];
      const adjustmentAmount = result?.adjustment_amount || 0;
      const sign = adjustmentAmount >= 0 ? "+" : "";

      toast({
        title: "Ajuste registrado",
        description: `Se ha creado el asiento ${result?.entry_number} (${sign}${adjustmentAmount.toFixed(2)} €)`,
      });

      // Reset form
      setSelectedAccountId("");
      setNewBalance("");
      setNotes("");
      setAdjustmentDate(format(new Date(), "yyyy-MM-dd"));
      
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating bank balance adjustment:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el ajuste",
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
            <Building2 className="h-5 w-5" />
            Ajustar Saldo Bancario
          </DialogTitle>
          <DialogDescription>
            Registra el saldo real de una cuenta bancaria a día de hoy. Se generará un asiento contable de ajuste automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info del saldo actual */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertCircle className="h-4 w-4" />
              Saldo contable actual (total bancos)
            </div>
            <p className={`font-bold text-lg ${currentTotalBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(currentTotalBalance)}
            </p>
          </div>

          {/* Selección de cuenta */}
          <div className="space-y-2">
            <Label htmlFor="account">Cuenta Bancaria *</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una cuenta" />
              </SelectTrigger>
              <SelectContent className="z-[99999]">
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{account.bank}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {account.iban ? `${account.iban.slice(0, 4)} •••• ${account.iban.slice(-4)}` : "Sin IBAN"}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nuevo saldo */}
          <div className="space-y-2">
            <Label htmlFor="newBalance">Nuevo Saldo Real (€) *</Label>
            <Input
              id="newBalance"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              className="font-mono text-right"
            />
            <p className="text-xs text-muted-foreground">
              Indica el saldo que aparece en tu extracto bancario
            </p>
          </div>

          {/* Fecha del ajuste */}
          <div className="space-y-2">
            <Label htmlFor="adjustmentDate">Fecha del Ajuste</Label>
            <Input
              id="adjustmentDate"
              type="date"
              value={adjustmentDate}
              onChange={(e) => setAdjustmentDate(e.target.value)}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Ej: Saldo inicial al comenzar a usar el sistema"
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
            <Button type="submit" disabled={isSubmitting || !selectedAccountId || !newBalance}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Ajuste
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BankBalanceAdjustmentDialog;
