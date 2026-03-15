import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CreditCard,
  Trash2,
  AlertCircle,
  TrendingUp,
  History,
  User,
  Pencil,
  Landmark,
  ArrowDownCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
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
  /** Si tiene número definitivo (aprobado). Solo entonces se permite registrar pagos. */
  hasDefinitiveNumber?: boolean;
  onPaymentChange: () => void;
}

const PurchaseInvoicePaymentsSection = ({
  invoiceId,
  total,
  paidAmount,
  pendingAmount,
  status,
  isLocked,
  hasDefinitiveNumber = true,
  onPaymentChange,
}: PurchaseInvoicePaymentsSectionProps) => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Detectar si es factura negativa (nota de crédito / devolución)
  const isNegativeInvoice = total < 0;

  // Para facturas negativas, trabajar con valores absolutos para el porcentaje
  const absTotal = Math.abs(total);
  const absPaidAmount = Math.abs(paidAmount);
  const absPendingAmount = Math.abs(pendingAmount);
  const paymentPercentage = absTotal > 0 ? (absPaidAmount / absTotal) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const checkUserRole = async () => {
    try {
      const { data, error } = await supabase.rpc("get_current_user_info");
      if (error) throw error;

      if (data && data.length > 0) {
        const roles = (data[0].roles || []).map((r: string) => r.toLowerCase());
        setIsAdmin(roles.includes("admin"));
      }
    } catch (err) {
      console.error("Error checking user role:", err);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase.rpc("get_company_preferences");
      if (error) throw error;
      if (data && data.length > 0 && data[0].bank_accounts) {
        const accs = data[0].bank_accounts as unknown as BankAccount[];
        const map: Record<string, string> = {};
        accs.forEach((a) => (map[a.id] = a.bank));
        setBankAccounts(map);
      }
    } catch (err) {
      console.error("Error fetching bank accounts:", err);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase.rpc(
        "get_purchase_invoice_payments",
        {
          p_invoice_id: invoiceId,
        },
      );

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

  // Mismo flujo que facturas de compra: primero aprobar (número definitivo), luego registrar pagos
  const canRegisterPaymentByStatus = [
    "CONFIRMED",
    "PARTIAL",
    "PAID",
    "REGISTERED",
    "APPROVED",
    "PENDING_VALIDATION",
    "PENDING",
    "DRAFT",
  ].includes(status);
  const canRegisterPayment = canRegisterPaymentByStatus && hasDefinitiveNumber;

  // Permitir registrar pagos si hay saldo pendiente (positivo o negativo)
  const hasPendingBalance = Math.abs(pendingAmount) > 0.01;

  // Mensaje cuando hay pendiente pero no se puede pagar por no tener nº definitivo
  const showApproveFirstMessage =
    hasPendingBalance && canRegisterPaymentByStatus && !hasDefinitiveNumber;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/95 p-6 shadow-xl backdrop-blur-xl md:p-8">
      <div
        className={cn(
          "absolute inset-0 pointer-events-none",
          isNegativeInvoice
            ? "bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent"
            : "bg-gradient-to-br from-red-500/5 via-transparent to-transparent",
        )}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "p-3 rounded-2xl shadow-inner",
              isNegativeInvoice
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-red-500/10 border border-red-500/20",
            )}
          >
            {isNegativeInvoice ? (
              <ArrowDownCircle className="h-6 w-6 text-emerald-400" />
            ) : (
              <CreditCard className="h-6 w-6 text-[hsl(var(--status-error))]" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">
              {isNegativeInvoice
                ? "Registro de Reembolsos"
                : "Registro de Pagos"}
            </h3>
            <p className="text-sm font-medium text-muted-foreground">
              {payments.length} {isNegativeInvoice ? "reembolso" : "pago"}
              {payments.length !== 1 ? "s" : ""} registrado
              {payments.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {showApproveFirstMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--status-warning)/0.25)] bg-[hsl(var(--status-warning-bg))] px-4 py-2.5 text-sm text-[hsl(var(--status-warning))]">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              Aprobar primero la factura o ticket para asignar el número
              definitivo y poder registrar pagos.
            </span>
          </div>
        )}
        {canRegisterPayment &&
          hasPendingBalance &&
          !showApproveFirstMessage && (
            <RegisterPurchasePaymentDialog
              invoiceId={invoiceId}
              pendingAmount={pendingAmount}
              totalAmount={total}
              onPaymentRegistered={handlePaymentRegistered}
            />
          )}
      </div>

      {/* Stats and Progress Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
        <div className="space-y-2 rounded-[1.5rem] border border-border/80 bg-muted/45 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>{isNegativeInvoice ? "Recibido" : "Pagado"}</span>
          </div>
          <p
            className={cn(
              "text-2xl font-bold",
              isNegativeInvoice
                ? "text-emerald-500"
                : "text-[hsl(var(--status-error))]",
            )}
          >
            {formatCurrency(absPaidAmount)}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>{paymentPercentage.toFixed(1)}% del total</span>
          </div>
        </div>

        <div className="space-y-2 rounded-[1.5rem] border border-border/80 bg-muted/45 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>{isNegativeInvoice ? "Por Recibir" : "Pendiente"}</span>
          </div>
          <p className="text-2xl font-bold text-amber-500">
            {absPendingAmount < 0.01
              ? isNegativeInvoice
                ? "Todo recibido"
                : "Todo pagado"
              : formatCurrency(absPendingAmount)}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            <span>{formatCurrency(absPendingAmount)} restante</span>
          </div>
        </div>

        <div className="space-y-2 rounded-[1.5rem] border border-border/80 bg-muted/45 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Total</span>
          </div>
          <p
            className={cn(
              "text-2xl font-bold",
              isNegativeInvoice ? "text-emerald-500" : "text-foreground",
            )}
          >
            {formatCurrency(total)}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <History className="h-3 w-3" />
            <span>
              Último:{" "}
              {payments.length > 0
                ? format(new Date(payments[0].payment_date), "dd/MM/yyyy", {
                    locale: es,
                  })
                : "Sin movimientos"}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8 relative z-10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            {isNegativeInvoice ? "Progreso de reembolso" : "Progreso de pago"}
          </span>
          <span className="text-xs font-bold text-foreground/70">
            {paymentPercentage.toFixed(1)}%
          </span>
        </div>
        <Progress
          value={paymentPercentage}
          className={cn(
            "h-2 bg-muted",
            isNegativeInvoice && "[&>div]:bg-emerald-500",
          )}
        />
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">
          {isNegativeInvoice ? "Cargando reembolsos..." : "Cargando pagos..."}
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-muted/20 py-8 text-center text-muted-foreground">
          {isNegativeInvoice ? (
            <ArrowDownCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
          ) : (
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-20" />
          )}
          <p className="text-sm">
            {isNegativeInvoice
              ? "No hay reembolsos registrados"
              : "No hay pagos registrados"}
          </p>
        </div>
      ) : (
        <div className="relative z-10 overflow-x-auto rounded-[1.5rem] border border-border/80 bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                  Fecha
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">
                  Importe
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                  Método
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                  Referencia
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                  Registrado por
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow
                  key={payment.id}
                  className="border-border hover:bg-muted/35"
                >
                  <TableCell className="font-medium text-foreground">
                    {format(new Date(payment.payment_date), "dd/MM/yyyy", {
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-border bg-muted/40 text-foreground"
                    >
                      {getPaymentMethodLabel(payment.payment_method)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {payment.bank_reference || "-"}
                    {payment.company_bank_account_id &&
                      bankAccounts[payment.company_bank_account_id] && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Landmark className="h-3 w-3 text-primary" />
                          {bankAccounts[payment.company_bank_account_id]}
                        </div>
                      )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
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
                              className="h-8 w-8 text-[hsl(var(--status-error))] hover:bg-[hsl(var(--status-error-bg))]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                ¿Eliminar pago?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará
                                el registro de pago de{" "}
                                {formatCurrency(payment.amount)}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
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
