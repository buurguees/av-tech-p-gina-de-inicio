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
import RegisterPurchasePaymentDialog from "./RegisterPurchasePaymentDialog";

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  bank_reference: string | null;
  notes: string | null;
  is_confirmed?: boolean;
  registered_by_name: string;
  created_at: string;
  company_bank_account_id?: string;
}

interface BankAccount {
  id: string;
  bank: string;
}

interface PurchaseInvoicePaymentsSectionProps {
  invoiceId: string;
  total: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
  isLocked: boolean;
  onPaymentChange: () => void;
}

const PurchaseInvoicePaymentsSection = ({
  invoiceId,
  total,
  paidAmount,
  pendingAmount,
  status,
  isLocked,
  onPaymentChange,
}: PurchaseInvoicePaymentsSectionProps) => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const paymentPercentage = total > 0 ? (paidAmount / total) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const checkUserRole = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_user_info');
      if (error) throw error;

      if (data && data.length > 0) {
        const roles = (data[0].roles || []).map((r: string) => r.toLowerCase());
        setIsAdmin(roles.includes('admin'));
      }
    } catch (err) {
      console.error("Error checking user role:", err);
    }
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
      const { data, error } = await supabase.rpc("get_purchase_invoice_payments", {
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
    checkUserRole();
  }, [invoiceId]);

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase.rpc("delete_purchase_payment", {
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

  // Permitir pagos en facturas CONFIRMED, PARTIAL o PAID
  // isLocked solo impide editar la factura, no registrar pagos
  const canRegisterPayment = ["CONFIRMED", "PARTIAL", "PAID", "REGISTERED"].includes(status);

  return (
    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-xl overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 shadow-inner">
            <CreditCard className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Registro de Pagos</h3>
            <p className="text-sm text-white/40 font-medium">
              {payments.length} pago{payments.length !== 1 ? "s" : ""} registrado{payments.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {canRegisterPayment && pendingAmount > 0 && (
          <RegisterPurchasePaymentDialog
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
            <span>Pagado</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(paidAmount)}</p>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <TrendingUp className="h-3 w-3" />
            <span>{paymentPercentage.toFixed(1)}% del total</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-[1.5rem] p-5 space-y-2">
          <div className="flex justify-between items-center text-xs uppercase tracking-wider text-white/30 font-bold">
            <span>Pendiente</span>
          </div>
          <p className="text-2xl font-bold text-amber-500">
            {pendingAmount > 0 ? formatCurrency(pendingAmount) : "Todo pagado"}
          </p>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <AlertCircle className="h-3 w-3" />
            <span>{formatCurrency(total - paidAmount)} restante</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-[1.5rem] p-5 space-y-2">
          <div className="flex justify-between items-center text-xs uppercase tracking-wider text-white/30 font-bold">
            <span>Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(total)}</p>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <History className="h-3 w-3" />
            <span>Último: {payments.length > 0 ? format(new Date(payments[0].payment_date), "dd/MM/yyyy", { locale: es }) : "Sin movimientos"}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8 relative z-10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-white/40 font-medium">Progreso de pago</span>
          <span className="text-xs text-white/60 font-bold">{paymentPercentage.toFixed(1)}%</span>
        </div>
        <Progress value={paymentPercentage} className="h-2 bg-white/5" />
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="text-center py-8 text-white/40">Cargando pagos...</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-8 text-white/40">
          <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">No hay pagos registrados</p>
        </div>
      ) : (
        <div className="relative z-10 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-white/5">
                <TableHead className="text-white/60 text-xs font-semibold uppercase">Fecha</TableHead>
                <TableHead className="text-white/60 text-xs font-semibold uppercase text-right">Importe</TableHead>
                <TableHead className="text-white/60 text-xs font-semibold uppercase">Método</TableHead>
                <TableHead className="text-white/60 text-xs font-semibold uppercase">Referencia</TableHead>
                <TableHead className="text-white/60 text-xs font-semibold uppercase">Registrado por</TableHead>
                <TableHead className="text-white/60 text-xs font-semibold uppercase text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id} className="border-white/5 hover:bg-white/5">
                  <TableCell className="text-white font-medium">
                    {format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="text-white font-bold text-right">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-white/80">
                      {getPaymentMethodLabel(payment.payment_method)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/60 text-sm">
                    {payment.bank_reference || "-"}
                    {payment.company_bank_account_id && bankAccounts[payment.company_bank_account_id] && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-white/40">
                        <Landmark className="h-3 w-3" />
                        {bankAccounts[payment.company_bank_account_id]}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-white/60 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {payment.registered_by_name || "Desconocido"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-zinc-900/95 backdrop-blur-3xl border-white/10 text-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar pago?</AlertDialogTitle>
                              <AlertDialogDescription className="text-white/60">
                                Esta acción no se puede deshacer. Se eliminará el registro de pago de {formatCurrency(payment.amount)}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePayment(payment.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default PurchaseInvoicePaymentsSection;
