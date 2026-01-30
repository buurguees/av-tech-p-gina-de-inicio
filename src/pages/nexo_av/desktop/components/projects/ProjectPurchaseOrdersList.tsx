import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Loader2, Plus, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPurchaseOrderStatusInfo } from "@/constants/purchaseOrderStatuses";

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string | null;
  technician_name: string | null;
  status: string;
  issue_date: string | null;
  expected_start_date: string | null;
  expected_end_date: string | null;
  subtotal: number;
  total: number;
  linked_purchase_invoice_id: string | null;
  linked_invoice_number: string | null;
}

interface ProjectPurchaseOrdersListProps {
  projectId: string;
}

const ProjectPurchaseOrdersList = ({ projectId }: ProjectPurchaseOrdersListProps) => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [projectId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_project_purchase_orders" as any, {
        p_project_id: projectId,
      });

      if (error) throw error;
      setOrders((data || []) as PurchaseOrder[]);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleNewOrder = () => {
    navigate(`/nexo-av/${userId}/purchase-orders/new?projectId=${projectId}`);
  };

  const handleRowClick = (orderId: string) => {
    navigate(`/nexo-av/${userId}/purchase-orders/${orderId}`);
  };

  // Calcular totales
  const totals = {
    estimated: orders.reduce((sum, o) => sum + (o.total || 0), 0),
    count: orders.length,
    pending: orders.filter(o => o.status === 'DRAFT' || o.status === 'PENDING_APPROVAL').length,
    approved: orders.filter(o => o.status === 'APPROVED').length,
    invoiced: orders.filter(o => o.status === 'INVOICED').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header con resumen y botón */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h3 className="text-lg font-semibold">Pedidos de Compra</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {totals.count} pedidos • <span className="text-foreground font-medium">{formatCurrency(totals.estimated)}</span> estimado
            </span>
            {totals.pending > 0 && (
              <Badge variant="outline" className="status-warning">
                {totals.pending} pendientes
              </Badge>
            )}
            {totals.approved > 0 && (
              <Badge variant="outline" className="status-success">
                {totals.approved} aprobados
              </Badge>
            )}
            {totals.invoiced > 0 && (
              <Badge variant="outline" className="status-invoiced">
                {totals.invoiced} facturados
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={handleNewOrder} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <p className="text-xs text-blue-300">
          <strong>Nota:</strong> Los Pedidos de Compra son estimaciones de coste para planificación.
          NO generan contabilidad. La contabilidad se activa cuando se crea una Factura de Compra real.
        </p>
      </div>

      {/* Lista o mensaje vacío */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No hay pedidos de compra para este proyecto</p>
          <p className="text-sm text-muted-foreground mb-4">
            Crea un pedido para estimar costes de técnicos o proveedores
          </p>
          <Button onClick={handleNewOrder} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Crear primer pedido
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Proveedor / Técnico</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Inicio Previsto</TableHead>
                <TableHead className="text-right">Total Estimado</TableHead>
                <TableHead>Factura Vinculada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const statusInfo = getPurchaseOrderStatusInfo(order.status);
                return (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => handleRowClick(order.id)}
                  >
                    <TableCell className="font-medium">{order.po_number}</TableCell>
                    <TableCell>{order.supplier_name || order.technician_name || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(statusInfo.className, "text-[11px]")}
                      >
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(order.issue_date)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(order.expected_start_date)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>
                      {order.linked_invoice_number ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/nexo-av/${userId}/purchase-invoices/${order.linked_purchase_invoice_id}`);
                          }}
                        >
                          {order.linked_invoice_number}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ProjectPurchaseOrdersList;
