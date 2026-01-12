import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CreditCard, Trash2, AlertCircle } from "lucide-react";
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
  const [loading, setLoading] = useState(true);

  const paymentPercentage = total > 0 ? (paidAmount / total) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
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
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <CreditCard className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Pagos</h3>
            <p className="text-sm text-white/50">
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

      {/* Progress bar */}
      <div className="mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Cobrado</span>
          <span className="text-white font-medium">
            {formatCurrency(paidAmount)} / {formatCurrency(total)}
          </span>
        </div>
        <Progress
          value={paymentPercentage}
          className="h-3 bg-white/10"
        />
        <div className="flex justify-between text-sm">
          <span className="text-white/60">
            {paymentPercentage.toFixed(1)}% cobrado
          </span>
          {pendingAmount > 0 ? (
            <span className="text-amber-400">
              Pendiente: {formatCurrency(pendingAmount)}
            </span>
          ) : (
            <span className="text-emerald-400">✓ Factura cobrada</span>
          )}
        </div>
      </div>

      {/* Payments table */}
      {payments.length > 0 ? (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60">Fecha</TableHead>
                <TableHead className="text-white/60">Importe</TableHead>
                <TableHead className="text-white/60">Método</TableHead>
                <TableHead className="text-white/60">Referencia</TableHead>
                <TableHead className="text-white/60">Registrado por</TableHead>
                <TableHead className="text-white/60 w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow
                  key={payment.id}
                  className="border-white/10 hover:bg-white/5"
                >
                  <TableCell className="text-white">
                    {format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="text-emerald-400 font-medium">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="text-white/80">
                    {getPaymentMethodLabel(payment.payment_method)}
                  </TableCell>
                  <TableCell className="text-white/60 max-w-[150px] truncate">
                    {payment.bank_reference || "-"}
                  </TableCell>
                  <TableCell className="text-white/60">
                    {payment.registered_by_name}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#1a1a2e] border-white/10">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">
                            ¿Eliminar pago?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-white/60">
                            Se eliminará el pago de {formatCurrency(payment.amount)} del{" "}
                            {format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: es })}.
                            Esta acción actualizará el estado de la factura.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/10">
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePayment(payment.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-white/40">
          <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay pagos registrados</p>
        </div>
      )}

      {/* Warning for DRAFT */}
      {status === "DRAFT" && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-400">
            Para registrar pagos, primero debe emitir la factura (cambiar de Borrador a Emitida).
          </p>
        </div>
      )}
    </div>
  );
};

export default InvoicePaymentsSection;
