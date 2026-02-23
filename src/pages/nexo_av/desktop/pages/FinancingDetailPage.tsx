import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CreditCard,
  FileText,
  Hash,
  Building2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CreditOperationDetail {
  id: string;
  provider_name: string | null;
  contract_reference: string | null;
  gross_amount: number;
  num_installments: number;
  total_paid: number;
  total_pending: number;
  status: string;
  accounting_code: string | null;
}

interface Installment {
  id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  principal: number;
  interest: number;
  outstanding: number;
  status: string;
  paid_date: string | null;
  bank_name: string | null;
}

interface CreditDetailResponse {
  operation: CreditOperationDetail;
  installments: Installment[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

const getInstallmentStatusBadge = (inst: Installment) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = inst.status !== "PAID" && new Date(inst.due_date) < today;

  if (inst.status === "PAID") {
    return (
      <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
        Pagado
      </Badge>
    );
  }
  if (isOverdue) {
    return (
      <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/40">
        Vencido
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/40">
      Pendiente
    </Badge>
  );
};

const FinancingDetailPageDesktop = () => {
  const { userId, operationId } = useParams<{ userId: string; operationId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CreditDetailResponse | null>(null);

  useEffect(() => {
    if (!operationId) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const { data: rpcData, error } = await (supabase.rpc as any)("credit_get_operation_detail", {
          p_operation_id: operationId,
        });
        if (error) throw error;
        const parsed = rpcData as unknown as CreditDetailResponse;
        if (parsed?.operation) {
          setData(parsed);
        } else {
          setData(null);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "No se pudo cargar la operación";
        console.error("Error fetching credit operation detail:", error);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [operationId, toast]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden p-6">
        <DetailNavigationBar
          pageTitle="Financiación"
          backPath={userId ? `/nexo-av/${userId}/financing` : undefined}
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data?.operation) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden p-6">
        <DetailNavigationBar
          pageTitle="Financiación"
          backPath={userId ? `/nexo-av/${userId}/financing` : undefined}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <AlertCircle className="h-12 w-12 opacity-50" />
          <p>No se encontró la operación de crédito.</p>
        </div>
      </div>
    );
  }

  const op = data.operation;
  const installments = data.installments ?? [];
  const paidRatio = op.gross_amount > 0 ? op.total_paid / op.gross_amount : 0;
  const progressPercent = Math.round(paidRatio * 100);

  const getOperationStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "COMPLETED":
        return "bg-zinc-500/20 text-zinc-300 border-zinc-500/40";
      case "DEFAULT":
        return "bg-red-500/20 text-red-400 border-red-500/40";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/40";
    }
  };

  const statusLabel =
    op.status === "ACTIVE"
      ? "Activo"
      : op.status === "COMPLETED"
        ? "Completado"
        : op.status === "DEFAULT"
          ? "Impago"
          : op.status;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-6">
      <DetailNavigationBar
        pageTitle="Financiación"
        backPath={userId ? `/nexo-av/${userId}/financing` : undefined}
      />

      <div className="flex-1 overflow-auto space-y-6 mt-4">
        {/* Operation header */}
        <div className="rounded-lg border border-border bg-zinc-900/30 p-4">
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Proveedor</p>
                <p className="font-medium text-foreground">{op.provider_name ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Referencia contrato</p>
                <p className="font-medium font-mono text-foreground">{op.contract_reference ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Importe total</p>
                <p className="font-medium text-foreground">{formatCurrency(op.gross_amount)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cuotas</p>
              <p className="font-medium text-foreground">{op.num_installments ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge variant="outline" className={cn("border", getOperationStatusBadge(op.status))}>
                {statusLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Hash className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Código contable</p>
                <p className="font-mono text-sm text-foreground">{op.accounting_code ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Pagado {formatCurrency(op.total_paid)}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Installments table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-zinc-900/50">
            <h2 className="font-semibold text-foreground">Cuotas</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">#</TableHead>
                  <TableHead className="text-muted-foreground">Vencimiento</TableHead>
                  <TableHead className="text-muted-foreground text-right">Importe</TableHead>
                  <TableHead className="text-muted-foreground text-right">Principal</TableHead>
                  <TableHead className="text-muted-foreground text-right">Interés</TableHead>
                  <TableHead className="text-muted-foreground text-right">Pendiente</TableHead>
                  <TableHead className="text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-muted-foreground">F. pago</TableHead>
                  <TableHead className="text-muted-foreground">Banco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No hay cuotas
                    </TableCell>
                  </TableRow>
                ) : (
                  installments.map((inst) => (
                    <TableRow key={inst.id} className="border-border">
                      <TableCell className="font-mono">{inst.installment_number}</TableCell>
                      <TableCell>{formatDate(inst.due_date)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(inst.amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(inst.principal)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(inst.interest)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(inst.outstanding)}</TableCell>
                      <TableCell>{getInstallmentStatusBadge(inst)}</TableCell>
                      <TableCell>{formatDate(inst.paid_date)}</TableCell>
                      <TableCell className="text-muted-foreground">{inst.bank_name ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancingDetailPageDesktop;
