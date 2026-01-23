import { useState, useEffect, ReactNode } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CreditCard, Trash2, AlertCircle, TrendingUp, History, User, Pencil, Landmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import "../../styles/components/payments/payments-tab.css";

export interface Payment {
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

export interface PaymentsTabProps {
  /** Unique identifier for the entity (invoice, purchase, etc.) */
  entityId: string;
  /** Total amount of the entity */
  total: number;
  /** Amount already paid */
  paidAmount: number;
  /** Amount pending to be paid */
  pendingAmount: number;
  /** Current status of the entity */
  status: string;
  /** Whether the entity is locked for editing */
  isLocked: boolean;
  /** Callback when a payment is registered, updated or deleted */
  onPaymentChange: () => void;
  /** RPC function name to fetch payments */
  fetchPaymentsRpc: string;
  /** RPC parameter name for the entity ID */
  fetchPaymentsParam: string;
  /** RPC function name to delete a payment */
  deletePaymentRpc: string;
  /** RPC parameter name for the payment ID when deleting */
  deletePaymentParam: string;
  /** Array of statuses that allow registering payments */
  allowedPaymentStatuses: string[];
  /** Custom dialog component for registering payments */
  registerPaymentDialog: (props: {
    entityId: string;
    pendingAmount: number;
    onPaymentRegistered: () => void;
    trigger?: ReactNode;
    payment?: Payment;
  }) => ReactNode;
  /** Label for the entity type (e.g., "factura", "factura de compra") */
  entityLabel?: string;
  /** Message shown when in draft status */
  draftWarningMessage?: string;
}

const PaymentsTab = ({
  entityId,
  total,
  paidAmount,
  pendingAmount,
  status,
  isLocked,
  onPaymentChange,
  fetchPaymentsRpc,
  fetchPaymentsParam,
  deletePaymentRpc,
  deletePaymentParam,
  allowedPaymentStatuses,
  registerPaymentDialog,
  entityLabel = "factura",
  draftWarningMessage = "Debes emitir el documento antes de poder registrar pagos oficiales.",
}: PaymentsTabProps) => {
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
      setLoading(true);
      // @ts-ignore - Dynamic RPC name
      const { data, error } = await supabase.rpc(fetchPaymentsRpc, {
        [fetchPaymentsParam]: entityId,
      });

      if (error) throw error;
      setPayments((data as unknown as Payment[]) || []);
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
  }, [entityId]);

  const handleDeletePayment = async (paymentId: string) => {
    try {
      // @ts-ignore - Dynamic RPC name
      const { error } = await supabase.rpc(deletePaymentRpc, {
        [deletePaymentParam]: paymentId,
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

  const canRegisterPayment = allowedPaymentStatuses.includes(status);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="payments-tab">
      {/* Header */}
      <div className="payments-tab__header">
        <div className="payments-tab__header-left">
          <div className="payments-tab__icon-wrapper">
            <CreditCard className="payments-tab__icon" />
          </div>
          <div>
            <h3 className="payments-tab__title">Registro de Pagos</h3>
            <p className="payments-tab__subtitle">
              {payments.length} pago{payments.length !== 1 ? "s" : ""} registrado{payments.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {canRegisterPayment && pendingAmount > 0 && (
          registerPaymentDialog({
            entityId,
            pendingAmount,
            onPaymentRegistered: handlePaymentRegistered,
          })
        )}
      </div>

      {/* Stats */}
      <div className="payments-tab__stats">
        <div className="payments-tab__stat-card">
          <div className="payments-tab__stat-header">
            <span>Cobrado</span>
            <TrendingUp className="payments-tab__stat-icon payments-tab__stat-icon--success" />
          </div>
          <p className="payments-tab__stat-value">{formatCurrency(paidAmount)}</p>
          <div className="payments-tab__progress-wrapper">
            <div className="payments-tab__progress-bar">
              <div
                className="payments-tab__progress-fill"
                style={{ width: `${paymentPercentage}%` }}
              />
            </div>
            <p className="payments-tab__progress-label">
              {paymentPercentage.toFixed(1)}% del total ({formatCurrency(total)})
            </p>
          </div>
        </div>

        <div className="payments-tab__stat-card">
          <div className="payments-tab__stat-header">
            <span>Pendiente</span>
            <AlertCircle className={`payments-tab__stat-icon ${pendingAmount > 0 ? 'payments-tab__stat-icon--warning' : 'payments-tab__stat-icon--success'}`} />
          </div>
          <p className={`payments-tab__stat-value ${pendingAmount > 0 ? 'payments-tab__stat-value--warning' : 'payments-tab__stat-value--success'}`}>
            {pendingAmount > 0 ? formatCurrency(pendingAmount) : "Todo cobrado"}
          </p>
          <div style={{ paddingTop: '0.5rem' }}>
            <span className={`payments-tab__badge ${pendingAmount > 0 ? 'payments-tab__badge--warning' : 'payments-tab__badge--success'}`}>
              {pendingAmount > 0 ? "PAGO PENDIENTE" : "SALDADO"}
            </span>
          </div>
        </div>

        <div className="payments-tab__stat-card">
          <div className="payments-tab__stat-header">
            <span>Último Movimiento</span>
            <History className="payments-tab__stat-icon payments-tab__stat-icon--info" />
          </div>
          <p className="payments-tab__stat-value" style={{ fontSize: 'clamp(1rem, 1.125rem, 1.25rem)' }}>
            {payments.length > 0
              ? format(new Date(payments[0].payment_date), "dd/MM/yyyy", { locale: es })
              : "Sin movimientos"}
          </p>
          <p className="payments-tab__progress-label" style={{ textTransform: 'uppercase', letterSpacing: '0.025em' }}>
            Estado: <span style={{ color: 'hsl(var(--foreground))' }}>{status}</span>
          </p>
        </div>
      </div>

      {/* Payments Table */}
      {payments.length > 0 ? (
        <div className="payments-tab__table-container">
          <div className="payments-tab__table-scroll">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Fecha</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Importe</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Cuenta Bancaria</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Referencia</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Gestor</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wide text-right w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} className="border-border hover:bg-accent/50">
                    <TableCell className="text-foreground font-medium">
                      {format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-success font-semibold">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      {payment.company_bank_account_id && bankAccounts[payment.company_bank_account_id] ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Landmark className="h-3.5 w-3.5 text-primary" />
                          {bankAccounts[payment.company_bank_account_id]}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs italic">No especificada</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[150px] truncate text-xs">
                      {payment.bank_reference || "No ref."}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center">
                          <User className="h-2.5 w-2.5" />
                        </div>
                        {payment.registered_by_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        {isAdmin && (
                          registerPaymentDialog({
                            entityId,
                            pendingAmount,
                            payment,
                            onPaymentRegistered: handlePaymentRegistered,
                            trigger: (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-warning hover:bg-warning/10"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            ),
                          })
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar registro de pago?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará el pago de <span className="font-semibold text-foreground">{formatCurrency(payment.amount)}</span>. 
                                Esta acción es irreversible y actualizará el saldo pendiente de la {entityLabel}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePayment(payment.id)}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
        <div className="payments-tab__empty">
          <div className="payments-tab__empty-icon-wrapper">
            <CreditCard className="payments-tab__empty-icon" />
          </div>
          <h4 className="payments-tab__empty-title">Sin pagos registrados</h4>
          <p className="payments-tab__empty-description">
            Todavía no se ha registrado ningún pago para esta {entityLabel}.
          </p>
        </div>
      )}

      {/* Draft Warning */}
      {status === "DRAFT" && (
        <div className="payments-tab__warning">
          <div className="payments-tab__warning-icon-wrapper">
            <AlertCircle className="payments-tab__warning-icon" />
          </div>
          <div>
            <h5 className="payments-tab__warning-title">Documento en Borrador</h5>
            <p className="payments-tab__warning-description">{draftWarningMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsTab;
