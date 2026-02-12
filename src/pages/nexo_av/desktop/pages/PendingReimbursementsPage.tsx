import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useNexoAvTheme } from "../hooks/useNexoAvTheme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, HandCoins, User, Landmark, CheckCircle2 } from "lucide-react";

interface PendingReimbursement {
  payment_id: string;
  purchase_invoice_id: string;
  invoice_number: string;
  supplier_name: string;
  amount: number;
  payment_date: string;
  payer_person_id: string;
  payer_name: string;
  partner_number: string;
  notes: string | null;
  created_at: string;
}

interface BankAccount {
  id: string;
  bank: string;
  iban: string;
}

function PendingReimbursementsPage() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  useNexoAvTheme();

  const [items, setItems] = useState<PendingReimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reimbRes, bankRes] = await Promise.all([
        supabase.rpc("list_pending_reimbursements"),
        supabase.rpc("get_company_preferences"),
      ]);

      if (reimbRes.error) throw reimbRes.error;
      setItems((reimbRes.data as unknown as PendingReimbursement[]) || []);

      if (bankRes.data && bankRes.data.length > 0 && bankRes.data[0].bank_accounts) {
        setBankAccounts(bankRes.data[0].bank_accounts as unknown as BankAccount[]);
      }
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los reembolsos pendientes" });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

  const handleReimburse = async (paymentId: string) => {
    const bankId = selectedBank[paymentId];
    if (!bankId) {
      toast({ variant: "destructive", title: "Error", description: "Selecciona una cuenta bancaria para el reembolso" });
      return;
    }
    setProcessing(paymentId);
    try {
      const { error } = await supabase.rpc("reimburse_personal_purchase", {
        p_payment_id: paymentId,
        p_bank_account_id: bankId,
      });
      if (error) throw error;
      toast({ title: "Reembolso registrado", description: "El reembolso se ha contabilizado correctamente" });
      fetchData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "No se pudo procesar el reembolso" });
    } finally {
      setProcessing(null);
    }
  };

  const totalPending = items.reduce((sum, i) => sum + i.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reembolsos Pendientes</h1>
            <p className="text-sm text-muted-foreground">
              Gastos pagados por socios con medios personales pendientes de reembolso
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total pendiente</p>
          <p className="text-2xl font-bold text-warning">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <HandCoins className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium text-foreground">Sin reembolsos pendientes</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No hay gastos personales de socios pendientes de reembolso
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Socio</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>Cuenta Reembolso</TableHead>
                  <TableHead className="text-right w-[120px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.payment_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.payer_name}</p>
                          <p className="text-xs text-muted-foreground">{item.partner_number}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {item.invoice_number}
                    </TableCell>
                    <TableCell className="text-sm">{item.supplier_name}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(item.payment_date), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="font-semibold text-warning">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={selectedBank[item.payment_id] || ""}
                        onValueChange={(v) => setSelectedBank((prev) => ({ ...prev, [item.payment_id]: v }))}
                      >
                        <SelectTrigger className="w-[200px] h-8 text-xs">
                          <SelectValue placeholder="Seleccionar banco" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              <div className="flex items-center gap-2">
                                <Landmark className="h-3 w-3" />
                                {acc.bank}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            disabled={!selectedBank[item.payment_id] || processing === item.payment_id}
                            className="gap-1"
                          >
                            {processing === item.payment_id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Reembolsar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Reembolso</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se reembolsarán <span className="font-semibold text-foreground">{formatCurrency(item.amount)}</span> a{" "}
                              <span className="font-semibold text-foreground">{item.payer_name}</span> desde la cuenta bancaria seleccionada.
                              Se generará el asiento contable correspondiente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleReimburse(item.payment_id)}>
                              Confirmar Reembolso
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PendingReimbursementsPage;
