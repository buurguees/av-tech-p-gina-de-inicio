import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CreditCard, Trash2, AlertCircle, TrendingUp, History, User, Pencil, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPaymentMethodLabel } from "@/constants/financeStatuses";
import RegisterPaymentDialog from "./RegisterPaymentDialog";

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  bank_reference: string | null;
  notes: string | null;
  is_confirmed: boolean;
  registered_by_name: string;
  created_at: string;
  company_bank_account_id?: string;
}

interface BankAccount {
  id: string;
  bank: string;
}

interface InvoicePaymentsSectionProps {
  invoiceId: string;
  total: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
  isLocked: boolean;
  onPaymentChange: () => void;
}

const InvoicePaymentsSection = ({
  invoiceId,
  total,
  paidAmount,
  pendingAmount,
  status,
  isLocked,
  onPaymentChange,
}: InvoicePaymentsSectionProps) => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const paymentPercentage = total > 0 ? (paidAmount / total) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase.rpc('get_company_preferences');
      if (error) throw error;
      if (data && data.length > 0 && data[0].bank_accounts) {
        const accs = data[0].bank_accounts as unknown as BankAccount[];
        const map: Record<string, string> = {};
        accs.forEach(a => map[a.id] = a.bank);
        setBankAccounts(map);
      }
    } catch (err) {
      console.error("Error fetching bank accounts:", err);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase.rpc("finance_get_invoice_payments", {
        p_invoice_id: invoiceId,
      });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchBankAccounts();
  }, [invoiceId]);

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase.rpc("finance_delete_payment", {
        p_payment_id: paymentId,
      });

      if (error) throw error;

      toast({
        title: "Pago eliminado",
        description: "El pago ha sido eliminado correctamente",
      });

      fetchPayments();
      onPaymentChange();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo eliminar el pago",
      });
    }
  };

  const handlePaymentRegistered = () => {
    fetchPayments();
    onPaymentChange();
  };

  // Solo permitir pagos en facturas ISSUED, PARTIAL u OVERDUE
  const canRegisterPayment = ["ISSUED", "PARTIAL", "OVERDUE"].includes(status);

  return (
    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-xl overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-inner">
            <CreditCard className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Registro de Pagos</h3>
            <p className="text-sm text-white/40 font-medium">
              {payments.length} pago{payments.length !== 1 ? "s" : ""} registrado{payments.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {canRegisterPayment && pendingAmount > 0 && (
          <RegisterPaymentDialog
            invoiceId={invoiceId}
            pendingAmount={pendingAmount}
            onPaymentRegistered={handlePaymentRegistered}
          />
        )}
      </div>

      {/* Stats and Progress Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
        <div className="bg-white/5 border border-white/5 rounded-[1.5rem] p-5 space-y-2">
          <div className="flex justify-between items-center text-xs uppercase tracking-wider text-white/30 font-bold">
            <span>Cobrado</span>
            <TrendingUp className="h-3 w-3 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white leading-none">
            {formatCurrency(paidAmount)}
          </p>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-emerald-500 h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              style={{ width: `${paymentPercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-white/40 font-semibold">{paymentPercentage.toFixed(1)}% del total ({formatCurrency(total)})</p>
        </div>

        <div className={`bg-white/5 border border-white/5 rounded-[1.5rem] p-5 space-y-2 ${pendingAmount > 0 ? 'border-amber-500/10' : 'border-emerald-500/10'}`}>
          <div className="flex justify-between items-center text-xs uppercase tracking-wider text-white/30 font-bold">
            <span>Pendiente</span>
            <AlertCircle className={`h-3 w-3 ${pendingAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
          </div>
          <p className={`text-2xl font-bold leading-none ${pendingAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {pendingAmount > 0 ? formatCurrency(pendingAmount) : "Todo cobrado"}
          </p>
          <div className="pt-3">
            <Badge className={`rounded-full px-3 py-0.5 text-[10px] font-bold ${pendingAmount > 0 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}>
              {pendingAmount > 0 ? "PAGO PENDIENTE" : "SALDADO"}
            </Badge>
          </div>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-[1.5rem] p-5 space-y-2">
          <div className="flex justify-between items-center text-xs uppercase tracking-wider text-white/30 font-bold">
            <span>Último Movimiento</span>
            <History className="h-3 w-3 text-blue-400" />
          </div>
          <p className="text-lg font-bold text-white/80 leading-tight">
            {payments.length > 0
              ? format(new Date(payments[0].payment_date), "dd/MM/yyyy", { locale: es })
              : "Sin movimientos"}
          </p>
          <p className="text-[10px] text-white/30 font-medium uppercase tracking-tight">Estado: <span className="text-white/60">{status}</span></p>
        </div>
      </div>

      {/* Payments history table */}
      {payments.length > 0 ? (
        <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] overflow-hidden shadow-2xl relative z-10">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent bg-white/[0.03]">
                  <TableHead className="text-white/40 font-bold uppercase text-[10px] tracking-widest pl-6">Fecha</TableHead>
                  <TableHead className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Importe</TableHead>
                  <TableHead className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Método / Banco</TableHead>
                  <TableHead className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Referencia</TableHead>
                  <TableHead className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Gestor</TableHead>
                  <TableHead className="text-white/40 w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow
                    key={payment.id}
                    className="border-white/5 hover:bg-white/[0.04] transition-colors group/row"
                  >
                    <TableCell className="text-white font-medium pl-6">
                      {format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-emerald-400 font-bold">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="bg-white/5 border-white/10 text-white/70 text-[10px] rounded-lg w-fit">
                          {getPaymentMethodLabel(payment.payment_method)}
                        </Badge>
                        {payment.company_bank_account_id && bankAccounts[payment.company_bank_account_id] && (
                          <div className="flex items-center gap-1.5 text-[9px] text-white/40 font-medium">
                            <Landmark className="h-2.5 w-2.5" />
                            {bankAccounts[payment.company_bank_account_id]}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-white/40 max-w-[150px] truncate text-xs italic">
                      {payment.bank_reference || "No ref."}
                    </TableCell>
                    <TableCell className="text-white/50 text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                          <User className="h-2.5 w-2.5" />
                        </div>
                        {payment.registered_by_name}
                      </div>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center gap-1 justify-end">
                        <RegisterPaymentDialog
                          invoiceId={invoiceId}
                          pendingAmount={pendingAmount}
                          payment={payment}
                          onPaymentRegistered={handlePaymentRegistered}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-white/20 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-zinc-900 border-white/10 text-white rounded-[2rem] shadow-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-bold">
                                ¿Eliminar registro de pago?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-white/50">
                                Se eliminará el pago de <span className="text-white font-bold">{formatCurrency(payment.amount)}</span>. Esta acción es irreversible y actualizará el saldo pendiente de la factura.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-3">
                              <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-2xl h-11">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePayment(payment.id)}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-2xl h-11"
                              >
                                Eliminar Pago
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white/[0.02] rounded-[1.5rem] border border-white/5 relative z-10">
          <div className="w-16 h-16 bg-white/[0.03] rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-white/5">
            <CreditCard className="h-8 w-8 text-white/20" />
          </div>
          <h4 className="text-white font-semibold">Sin pagos registrados</h4>
          <p className="text-sm text-white/30 max-w-[200px] mx-auto mt-1">Todavía no se ha registrado ningún abono para esta factura.</p>
        </div>
      )}

      {/* Warning for DRAFT */}
      {status === "DRAFT" && (
        <div className="mt-6 flex items-start gap-4 p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl relative z-10 animate-in fade-in slide-in-from-top-2">
          <div className="p-2 bg-amber-500/20 rounded-xl">
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h5 className="text-amber-500 font-bold text-sm uppercase tracking-wider">Factura en Borrador</h5>
            <p className="text-sm text-amber-500/70 mt-1 font-medium">
              Debes emitir la factura antes de poder registrar pagos oficiales. Por ahora puedes editar las líneas y el cliente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicePaymentsSection;
