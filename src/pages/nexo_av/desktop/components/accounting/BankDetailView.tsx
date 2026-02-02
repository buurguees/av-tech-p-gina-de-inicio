import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Receipt,
  Settings,
  Eye,
  DollarSign,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import BankBalanceAdjustmentDialog from "./BankBalanceAdjustmentDialog";
import BankOpeningEntryDialog from "./BankOpeningEntryDialog";
import BankTransferDialog from "./BankTransferDialog";
import TaxPaymentDialog from "./TaxPaymentDialog";
import ManualMovementDialog from "./ManualMovementDialog";

interface BankAccount {
  id: string;
  holder: string;
  bank: string;
  iban: string;
  notes: string;
}

interface BankMovement {
  id: string;
  entry_number: string;
  entry_date: string;
  entry_type: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  reference_id: string | null;
  reference_type: string | null;
}

interface BankDetailViewProps {
  bankAccount: BankAccount;
  accountCode: string;
  balance: number;
  periodStart: string;
  periodEnd: string;
  balanceDate: string;
  onRefresh: () => void;
  allBankAccounts: BankAccount[];
}

const BankDetailView = ({
  bankAccount,
  accountCode,
  balance,
  periodStart,
  periodEnd,
  balanceDate,
  onRefresh,
  allBankAccounts,
}: BankDetailViewProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState<BankMovement[]>([]);

  // Diálogos
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [openingDialogOpen, setOpeningDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [taxPaymentDialogOpen, setTaxPaymentDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);

  const fetchMovements = async () => {
    if (!accountCode) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("list_bank_account_movements", {
        p_account_code: accountCode,
        p_start_date: periodStart,
        p_end_date: periodEnd,
      });
      
      if (error) throw error;
      setMovements(data || []);
    } catch (error: any) {
      console.error("Error fetching bank movements:", error);
      // Si el RPC no existe aún, mostrar lista vacía
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [accountCode, periodStart, periodEnd]);

  const handleDialogSuccess = () => {
    fetchMovements();
    onRefresh();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getEntryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PAYMENT_RECEIVED: "Cobro",
      PAYMENT_MADE: "Pago",
      BANK_TRANSFER: "Traspaso",
      TAX_PAYMENT: "Impuesto",
      BANK_OPENING: "Apertura",
      MANUAL_INCOME: "Ingreso",
      MANUAL_EXPENSE: "Gasto",
      ADJUSTMENT: "Ajuste",
    };
    return labels[type] || type;
  };

  const getEntryTypeIcon = (type: string) => {
    switch (type) {
      case "PAYMENT_RECEIVED":
      case "MANUAL_INCOME":
        return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
      case "PAYMENT_MADE":
      case "MANUAL_EXPENSE":
        return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
      case "BANK_TRANSFER":
        return <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500" />;
      case "TAX_PAYMENT":
        return <Receipt className="h-3.5 w-3.5 text-orange-500" />;
      default:
        return <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con info del banco y acciones */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{bankAccount.bank}</h2>
            <p className="text-sm text-muted-foreground font-mono">
              {bankAccount.iban || "Sin IBAN configurado"}
            </p>
            {bankAccount.holder && (
              <p className="text-xs text-muted-foreground">{bankAccount.holder}</p>
            )}
            {accountCode && (
              <Badge variant="outline" className="mt-1 font-mono text-xs">
                Cuenta {accountCode}
              </Badge>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">Saldo contable</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrency(balance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Al {format(new Date(balanceDate), "dd/MM/yyyy")}
          </p>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAdjustmentDialogOpen(true)}
        >
          <Settings className="h-3.5 w-3.5 mr-1.5" />
          Ajustar Saldo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpeningDialogOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Asiento Apertura
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTransferDialogOpen(true)}
        >
          <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
          Traspaso
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTaxPaymentDialogOpen(true)}
        >
          <Receipt className="h-3.5 w-3.5 mr-1.5" />
          Pago Impuesto
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIncomeDialogOpen(true)}
        >
          <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
          Ingreso
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpenseDialogOpen(true)}
        >
          <TrendingDown className="h-3.5 w-3.5 mr-1.5" />
          Gasto
        </Button>
      </div>

      {/* Tabla de movimientos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Movimientos</CardTitle>
          <CardDescription>
            Del {format(new Date(periodStart), "dd/MM/yyyy")} al {format(new Date(periodEnd), "dd/MM/yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No hay movimientos en el período seleccionado</p>
              <p className="text-xs mt-1">
                Registra un asiento de apertura o un movimiento para empezar
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[90px]">Fecha</TableHead>
                    <TableHead className="w-[100px]">Tipo</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right w-[100px]">Entrada</TableHead>
                    <TableHead className="text-right w-[100px]">Salida</TableHead>
                    <TableHead className="text-right w-[110px]">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(mov.entry_date), "dd/MM/yy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getEntryTypeIcon(mov.entry_type)}
                          <span className="text-xs">{getEntryTypeLabel(mov.entry_type)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{mov.description}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-600">
                        {mov.debit_amount > 0 ? formatCurrency(mov.debit_amount) : ""}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-red-600">
                        {mov.credit_amount > 0 ? formatCurrency(mov.credit_amount) : ""}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm font-semibold ${mov.running_balance >= 0 ? "text-foreground" : "text-red-600"}`}>
                        {formatCurrency(mov.running_balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogos */}
      <BankBalanceAdjustmentDialog
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
        bankAccounts={allBankAccounts}
        currentTotalBalance={balance}
        onSuccess={handleDialogSuccess}
      />

      <BankOpeningEntryDialog
        open={openingDialogOpen}
        onOpenChange={setOpeningDialogOpen}
        bankAccounts={allBankAccounts}
        onSuccess={handleDialogSuccess}
      />

      <BankTransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      <TaxPaymentDialog
        open={taxPaymentDialogOpen}
        onOpenChange={setTaxPaymentDialogOpen}
        bankAccounts={allBankAccounts}
        onSuccess={handleDialogSuccess}
        defaultBankId={bankAccount.id}
      />

      <ManualMovementDialog
        open={incomeDialogOpen}
        onOpenChange={setIncomeDialogOpen}
        bankAccounts={allBankAccounts}
        movementType="INCOME"
        onSuccess={handleDialogSuccess}
      />

      <ManualMovementDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        bankAccounts={allBankAccounts}
        movementType="EXPENSE"
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
};

export default BankDetailView;
