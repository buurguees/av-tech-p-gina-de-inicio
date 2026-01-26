import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2, 
  CreditCard, 
  Banknote, 
  Building2,
  Users,
  Wrench,
  ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CashMovement {
  movement_id: string;
  entry_id: string;
  entry_number: string;
  entry_date: string;
  entry_type: string;
  movement_type: string;
  amount: number;
  bank_account_code: string;
  bank_account_name: string;
  counterpart_account_code: string;
  counterpart_account_name: string;
  third_party_id: string | null;
  third_party_type: string | null;
  third_party_name: string | null;
  description: string | null;
  payment_method: string | null;
  bank_reference: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_locked: boolean;
  created_at: string;
}

interface CashMovementsTableProps {
  startDate: string;
  endDate: string;
  onNavigate: (type: string, id: string) => void;
}

const CashMovementsTable = ({ startDate, endDate, onNavigate }: CashMovementsTableProps) => {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  useEffect(() => {
    fetchMovements();
  }, [startDate, endDate]);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      // Use raw RPC call with type assertion
      const { data: movData, error: movError } = await supabase.rpc("list_cash_movements" as any, {
        p_start_date: startDate,
        p_end_date: endDate,
        p_limit: 500,
      });
      
      if (movError) {
        console.error("Error fetching movements:", movError);
        setMovements([]);
        return;
      }
      
      const movs: CashMovement[] = (movData || []).map((m: any) => ({
        movement_id: m.movement_id,
        entry_id: m.entry_id,
        entry_number: m.entry_number,
        entry_date: m.entry_date,
        entry_type: m.entry_type,
        movement_type: m.movement_type,
        amount: m.amount,
        bank_account_code: m.bank_account_code,
        bank_account_name: m.bank_account_name,
        counterpart_account_code: m.counterpart_account_code,
        counterpart_account_name: m.counterpart_account_name,
        third_party_id: m.third_party_id,
        third_party_type: m.third_party_type,
        third_party_name: m.third_party_name,
        description: m.description,
        payment_method: m.payment_method,
        bank_reference: m.bank_reference,
        reference_id: m.reference_id,
        reference_type: m.reference_type,
        is_locked: m.is_locked,
        created_at: m.created_at,
      }));
      
      setMovements(movs);
      
      // Calculate totals
      const income = movs.filter(m => m.movement_type === 'INCOME').reduce((sum, m) => sum + m.amount, 0);
      const expense = movs.filter(m => m.movement_type === 'EXPENSE').reduce((sum, m) => sum + m.amount, 0);
      setTotalIncome(income);
      setTotalExpense(expense);
    } catch (error) {
      console.error("Error fetching cash movements:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getThirdPartyIcon = (type: string | null) => {
    switch (type) {
      case "CLIENT":
        return <Users className="h-3.5 w-3.5 text-blue-500" />;
      case "SUPPLIER":
        return <Building2 className="h-3.5 w-3.5 text-orange-500" />;
      case "TECHNICIAN":
        return <Wrench className="h-3.5 w-3.5 text-purple-500" />;
      default:
        return null;
    }
  };

  const getThirdPartyLabel = (type: string | null) => {
    switch (type) {
      case "CLIENT":
        return "Cliente";
      case "SUPPLIER":
        return "Proveedor";
      case "TECHNICIAN":
        return "Técnico";
      default:
        return "Otro";
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "-";
    const labels: Record<string, string> = {
      TRANSFER: "Transferencia",
      CASH: "Efectivo",
      CARD: "Tarjeta",
      CHECK: "Cheque",
      BIZUM: "Bizum",
    };
    return labels[method] || method;
  };

  const getPaymentMethodIcon = (method: string | null) => {
    switch (method) {
      case "CARD":
        return <CreditCard className="h-3.5 w-3.5" />;
      case "CASH":
        return <Banknote className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Cargando movimientos de caja...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Cobros</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pagos</p>
                <p className="text-xl font-bold text-rose-600">{formatCurrency(totalExpense)}</p>
              </div>
              <div className="p-2 bg-rose-500/10 rounded-lg">
                <ArrowUpRight className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Saldo Neto</p>
                <p className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-foreground' : 'text-rose-600'}`}>
                  {formatCurrency(totalIncome - totalExpense)}
                </p>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Libro de Caja</CardTitle>
              <CardDescription>
                {movements.length} movimientos · Del {format(new Date(startDate), "dd/MM/yyyy")} al {format(new Date(endDate), "dd/MM/yyyy")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {movements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay movimientos de caja en el período seleccionado</p>
            </div>
          ) : (
            <div className="border-t">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[100px] text-xs font-semibold">Fecha</TableHead>
                    <TableHead className="w-[120px] text-xs font-semibold">Nº Asiento</TableHead>
                    <TableHead className="text-xs font-semibold">Cuenta Banco</TableHead>
                    <TableHead className="text-xs font-semibold">Tercero</TableHead>
                    <TableHead className="text-xs font-semibold">Descripción</TableHead>
                    <TableHead className="w-[100px] text-xs font-semibold">Método</TableHead>
                    <TableHead className="w-[110px] text-xs font-semibold text-right">Entrada</TableHead>
                    <TableHead className="w-[110px] text-xs font-semibold text-right">Salida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.movement_id} className="hover:bg-muted/20">
                      <TableCell className="text-sm py-3">
                        {format(new Date(movement.entry_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="font-mono text-xs py-3">
                        {movement.entry_number}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{movement.bank_account_name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{movement.bank_account_code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {movement.third_party_name ? (
                          <div className="flex items-center gap-2">
                            {getThirdPartyIcon(movement.third_party_type)}
                            <div className="flex flex-col">
                              <span className="text-sm font-medium truncate max-w-[180px]">{movement.third_party_name}</span>
                              <span className="text-xs text-muted-foreground">{getThirdPartyLabel(movement.third_party_type)}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm text-foreground truncate block max-w-[200px]">
                          {movement.description || "-"}
                        </span>
                        {movement.bank_reference && (
                          <span className="text-xs text-muted-foreground font-mono">
                            Ref: {movement.bank_reference}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        {movement.payment_method ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            {getPaymentMethodIcon(movement.payment_method)}
                            {getPaymentMethodLabel(movement.payment_method)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        {movement.movement_type === "INCOME" ? (
                          <span className="text-emerald-600 font-semibold text-sm">
                            {formatCurrency(movement.amount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        {movement.movement_type === "EXPENSE" ? (
                          <span className="text-rose-600 font-semibold text-sm">
                            {formatCurrency(movement.amount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CashMovementsTable;
