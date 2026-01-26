import { useState, useEffect } from "react";
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
import { Loader2, Building2, Calendar } from "lucide-react";
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

interface BankOpeningEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccounts: BankAccount[];
  onSuccess: () => void;
}

const BankOpeningEntryDialog = ({
  open,
  onOpenChange,
  bankAccounts,
  onSuccess,
}: BankOpeningEntryDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      // Reset balances when dialog opens
      const initialBalances: Record<string, string> = {};
      bankAccounts.forEach(acc => {
        initialBalances[acc.id] = "";
      });
      setBalances(initialBalances);
    }
  }, [open, bankAccounts]);

  const handleBalanceChange = (accountId: string, value: string) => {
    setBalances(prev => ({ ...prev, [accountId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build bank balances array
    const bankBalances = bankAccounts
      .filter(acc => balances[acc.id] && parseFloat(balances[acc.id].replace(",", ".")) !== 0)
      .map(acc => ({
        bank_account_id: acc.id,
        bank_name: acc.bank,
        iban: acc.iban,
        balance: parseFloat(balances[acc.id].replace(",", "."))
      }));

    if (bankBalances.length === 0) {
      toast({
        title: "Error",
        description: "Introduce al menos un saldo",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await (supabase.rpc as any)("create_bank_opening_entry", {
        p_bank_balances: bankBalances,
        p_entry_date: entryDate,
        p_notes: "Asiento de apertura - Saldos iniciales de bancos"
      });

      if (error) throw error;

      const result = data?.[0];
      const totalAmount = result?.total_amount || 0;

      toast({
        title: "Asiento de apertura registrado",
        description: `Asiento ${result?.entry_number} - Total: ${formatCurrency(totalAmount)}`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating opening entry:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el asiento de apertura",
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

  const totalBalance = Object.values(balances).reduce((sum, val) => {
    const parsed = parseFloat(val?.replace(",", ".") || "0");
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Asiento de Apertura
          </DialogTitle>
          <DialogDescription>
            Registra los saldos iniciales de tus cuentas bancarias. Se creará un único asiento contable balanceado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="entryDate">Fecha del Asiento</Label>
            <Input
              id="entryDate"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>

          {/* Lista de bancos */}
          <div className="space-y-3">
            <Label>Saldos por Banco</Label>
            {bankAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{account.bank}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {account.iban ? `${account.iban.slice(0, 4)} •••• ${account.iban.slice(-4)}` : "Sin IBAN"}
                  </p>
                </div>
                <div className="w-32">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={balances[account.id] || ""}
                    onChange={(e) => handleBalanceChange(account.id, e.target.value)}
                    className="font-mono text-right"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
            <span className="font-semibold">Total Apertura:</span>
            <span className={`font-bold text-lg ${totalBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(totalBalance)}
            </span>
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
            <Button type="submit" disabled={isSubmitting || totalBalance === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Asiento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BankOpeningEntryDialog;
