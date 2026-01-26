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
import { Loader2, TrendingDown, TrendingUp, Building2 } from "lucide-react";
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

interface ManualMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccounts: BankAccount[];
  movementType: "EXPENSE" | "INCOME";
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES = [
  { code: "626000", name: "Servicios bancarios y similares" },
  { code: "627000", name: "Publicidad, propaganda y RRPP" },
  { code: "628000", name: "Suministros" },
  { code: "629000", name: "Otros servicios" },
  { code: "631000", name: "Otros tributos" },
  { code: "649000", name: "Otros gastos sociales" },
  { code: "659000", name: "Otros gastos financieros" },
  { code: "669000", name: "Otros gastos financieros" },
];

const INCOME_CATEGORIES = [
  { code: "759000", name: "Ingresos por servicios diversos" },
  { code: "769000", name: "Otros ingresos financieros" },
  { code: "778000", name: "Ingresos excepcionales" },
  { code: "779000", name: "Ingresos y beneficios diversos" },
];

const ManualMovementDialog = ({
  open,
  onOpenChange,
  bankAccounts,
  movementType,
  onSuccess,
}: ManualMovementDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [movementDate, setMovementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");

  const selectedBank = bankAccounts.find(acc => acc.id === selectedBankId);
  const isExpense = movementType === "EXPENSE";
  const categories = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBankId || !category || !amount || !description) {
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
      const { data, error } = await (supabase.rpc as any)("create_manual_bank_movement", {
        p_bank_account_id: selectedBankId,
        p_bank_name: selectedBank?.bank || "",
        p_amount: amountValue,
        p_movement_type: movementType,
        p_category: category,
        p_movement_date: movementDate,
        p_description: description,
      });

      if (error) throw error;

      const result = data?.[0];

      toast({
        title: isExpense ? "Gasto registrado" : "Ingreso registrado",
        description: `Asiento ${result?.entry_number} - ${formatCurrency(amountValue)}`,
      });

      // Reset form
      setSelectedBankId("");
      setCategory("");
      setAmount("");
      setDescription("");
      setMovementDate(format(new Date(), "yyyy-MM-dd"));
      
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating manual movement:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el movimiento",
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
            {isExpense ? (
              <TrendingDown className="h-5 w-5 text-red-500" />
            ) : (
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            )}
            {isExpense ? "Gasto sin Factura" : "Ingreso sin Factura"}
          </DialogTitle>
          <DialogDescription>
            Registra un {isExpense ? "gasto" : "ingreso"} que no tiene factura asociada (comisiones, intereses, etc.)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cuenta Bancaria */}
          <div className="space-y-2">
            <Label>Cuenta Bancaria *</Label>
            <Select value={selectedBankId} onValueChange={setSelectedBankId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la cuenta" />
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

          {/* Categoría */}
          <div className="space-y-2">
            <Label>Categoría Contable *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la categoría" />
              </SelectTrigger>
              <SelectContent className="z-[99999]">
                {categories.map((cat) => (
                  <SelectItem key={cat.code} value={cat.code}>
                    <div className="flex flex-col">
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{cat.code}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Input
              id="description"
              type="text"
              placeholder={isExpense ? "Ej: Comisión bancaria mensual" : "Ej: Intereses cuenta"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
            <Label htmlFor="movementDate">Fecha</Label>
            <Input
              id="movementDate"
              type="date"
              value={movementDate}
              onChange={(e) => setMovementDate(e.target.value)}
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
              disabled={isSubmitting || !selectedBankId || !category || !amount || !description}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar {isExpense ? "Gasto" : "Ingreso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ManualMovementDialog;
