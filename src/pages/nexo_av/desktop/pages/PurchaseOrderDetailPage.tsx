import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import TabNav, { TabItem } from "../components/navigation/TabNav";
import DetailActionButton from "../components/navigation/DetailActionButton";
import { DetailInfoBlock, DetailInfoHeader, DetailInfoSummary, MetricCard } from "../components/detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatusSelector from "../components/common/StatusSelector";
import { 
  PURCHASE_ORDER_STATUSES, 
  getPurchaseOrderStatusInfo,
  canEditPurchaseOrder,
  canApprovePurchaseOrder,
  canLinkToPurchaseInvoice
} from "@/constants/purchaseOrderStatuses";
import { useToast } from "@/hooks/use-toast";
import PurchaseOrderLinesEditor from "../components/purchases/PurchaseOrderLinesEditor";
import ConvertPOToInvoiceDialog from "../components/purchases/ConvertPOToInvoiceDialog";
import {
  LayoutDashboard,
  FileText,
  History,
  Hash,
  Building,
  Calendar,
  User,
  Truck,
  FolderKanban,
  CheckCircle,
  Clock,
  Receipt,
  TrendingDown,
  Link as LinkIcon,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PurchaseOrderDetail {
  id: string;
  po_number: string;
  supplier_id: string | null;
  technician_id: string | null;
  project_id: string | null;
  supplier_name: string | null;
  supplier_tax_id: string | null;
  status: string;
  issue_date: string | null;
  expected_start_date: string | null;
  expected_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  withholding_rate: number;
  withholding_amount: number;
  total: number;
  linked_purchase_invoice_id: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  project_number: string | null;
  project_name: string | null;
  technician_name: string | null;
}

const PurchaseOrderDetailPageDesktop = () => {
  const { userId, orderId } = useParams<{ userId: string; orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("detalle");
  const [approving, setApproving] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  const tabs: TabItem[] = [
    { value: "detalle", label: "Detalle", icon: LayoutDashboard },
    { value: "lineas", label: "Líneas", icon: FileText },
    { value: "historico", label: "Histórico", icon: History, align: "right" },
  ];

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_purchase_order", {
        p_order_id: orderId,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setOrder(data[0]);
      }
    } catch (error: any) {
      console.error("Error fetching purchase order:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el pedido de compra",
        variant: "destructive",
      });
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

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;

    try {
      const { error } = await supabase.rpc("update_purchase_order", {
        p_order_id: order.id,
        p_status: newStatus,
      });

      if (error) throw error;

      setOrder({ ...order, status: newStatus });
      toast({
        title: "Estado actualizado",
        description: `El pedido ahora está en estado "${getPurchaseOrderStatusInfo(newStatus).label}"`,
      });
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async () => {
    if (!order || !canApprovePurchaseOrder(order.status)) return;

    try {
      setApproving(true);
      const { error } = await supabase.rpc("approve_purchase_order", {
        p_order_id: order.id,
      });

      if (error) throw error;

      toast({
        title: "Pedido aprobado",
        description: "El pedido de compra ha sido aprobado correctamente",
      });
      fetchOrder();
    } catch (error: any) {
      console.error("Error approving order:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo aprobar el pedido",
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  const handleEdit = () => {
    if (order && canEditPurchaseOrder(order.status)) {
      navigate(`/nexo-av/${userId}/purchase-orders/${order.id}/edit`);
    }
  };

  const getContextInfo = () => {
    if (loading) return "Cargando...";
    if (!order) return "Pedido no encontrado";
    return order.po_number;
  };

  const statusInfo = order ? getPurchaseOrderStatusInfo(order.status) : null;

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar
        pageTitle="Pedido de Compra"
        contextInfo={getContextInfo()}
        backPath={userId ? `/nexo-av/${userId}/purchase-orders` : undefined}
        tools={
          order && canEditPurchaseOrder(order.status) ? (
            <DetailActionButton
              actionType="edit"
              onClick={handleEdit}
            />
          ) : undefined
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Columna izquierda - TabNav y contenido */}
        <div className="flex-1 flex flex-col min-w-0">
          <TabNav
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <div className="flex-1 overflow-auto">
            {activeTab === "detalle" && order && (
              <div className="p-6 space-y-6">
                {/* Info Banner - NO genera contabilidad */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-400">
                        Documento de Estimación
                      </h4>
                      <p className="text-xs text-blue-300/70 mt-1">
                        Este pedido de compra es un documento operativo para estimación de costes. 
                        <strong className="text-blue-300"> NO genera asientos contables.</strong> 
                        La contabilidad se registra únicamente cuando se crea una Factura de Compra vinculada.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Métricas principales */}
                <div className="grid grid-cols-4 gap-4">
                  <MetricCard
                    title="Base Imponible"
                    value={formatCurrency(order.subtotal)}
                    icon={TrendingDown}
                  />
                  <MetricCard
                    title="IVA"
                    value={formatCurrency(order.tax_amount)}
                    icon={Receipt}
                    subtitle={`${order.tax_rate}%`}
                  />
                  <MetricCard
                    title="Retención IRPF"
                    value={formatCurrency(order.withholding_amount)}
                    icon={Receipt}
                    subtitle={order.withholding_rate > 0 ? `${order.withholding_rate}%` : undefined}
                  />
                  <MetricCard
                    title="Total"
                    value={formatCurrency(order.total)}
                    icon={TrendingDown}
                  />
                </div>

                {/* Información del proyecto */}
                {order.project_id && (
                  <div className="bg-card/50 border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FolderKanban className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Proyecto vinculado</p>
                          <p className="font-medium">{order.project_name}</p>
                          {order.project_number && (
                            <p className="text-xs text-muted-foreground">{order.project_number}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/nexo-av/${userId}/projects/${order.project_id}`)}
                      >
                        Ver proyecto
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Factura vinculada */}
                {order.linked_purchase_invoice_id && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <LinkIcon className="h-5 w-5 text-green-400" />
                        <div>
                          <p className="text-sm text-green-300">Factura de Compra vinculada</p>
                          <p className="font-medium text-green-400">
                            Este pedido está vinculado a una factura real
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                        onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/${order.linked_purchase_invoice_id}`)}
                      >
                        Ver factura
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notas */}
                {(order.notes || order.internal_notes) && (
                  <div className="grid grid-cols-2 gap-4">
                    {order.notes && (
                      <div className="bg-card/50 border border-border rounded-lg p-4">
                        <p className="text-xs text-muted-foreground uppercase mb-2">Notas</p>
                        <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                      </div>
                    )}
                    {order.internal_notes && (
                      <div className="bg-card/50 border border-border rounded-lg p-4">
                        <p className="text-xs text-muted-foreground uppercase mb-2">Notas internas</p>
                        <p className="text-sm whitespace-pre-wrap">{order.internal_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex justify-end gap-3">
                  {/* Botón de aprobar */}
                  {canApprovePurchaseOrder(order.status) && (
                    <Button
                      onClick={handleApprove}
                      disabled={approving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {approving ? "Aprobando..." : "Aprobar Pedido"}
                    </Button>
                  )}
                  
                  {/* Botón de convertir a factura */}
                  {canLinkToPurchaseInvoice(order.status) && !order.linked_purchase_invoice_id && (
                    <Button
                      onClick={() => setConvertDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Convertir a Factura de Compra
                    </Button>
                  )}
                </div>
              </div>
            )}

            {activeTab === "lineas" && order && (
              <PurchaseOrderLinesEditor
                orderId={order.id}
                readOnly={!canEditPurchaseOrder(order.status)}
                onLinesChange={fetchOrder}
              />
            )}

            {activeTab === "historico" && (
              <div className="p-6">
                <p className="text-muted-foreground">Histórico de cambios - Se implementará próximamente</p>
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha - Info Panel */}
        <div className="w-72 xl:w-80 2xl:w-[20rem] flex-shrink-0 border-l border-border h-full">
          <div className="h-full">
            <DetailInfoBlock
              header={
                <DetailInfoHeader
                  title={order?.supplier_name || order?.technician_name || "Sin proveedor"}
                  subtitle={order?.supplier_tax_id || undefined}
                >
                  <div className="flex flex-col gap-2 mt-2">
                    {order?.po_number && (
                      <div className="flex items-center gap-2 text-sm">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Nº Pedido:</span>
                        <span className="font-medium">{order.po_number}</span>
                      </div>
                    )}
                    {order?.technician_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Técnico:</span>
                        <span className="font-medium">{order.technician_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Estado del Pedido */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex flex-col gap-2 items-center">
                      <span className="text-xs text-muted-foreground uppercase font-medium w-full text-center">
                        Estado del Pedido
                      </span>
                      <div className="w-full flex justify-center">
                        <StatusSelector
                          currentStatus={order?.status || "DRAFT"}
                          statusOptions={[...PURCHASE_ORDER_STATUSES]}
                          onStatusChange={handleStatusChange}
                          size="md"
                        />
                      </div>
                    </div>
                  </div>
                </DetailInfoHeader>
              }
              summary={
                <DetailInfoSummary
                  columns={2}
                  items={[]}
                >
                  <div className="space-y-3">
                    {/* Fechas */}
                    <div className="flex items-start gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="text-muted-foreground text-xs uppercase">Fecha emisión</span>
                        <p className="font-medium">{formatDate(order?.issue_date || null)}</p>
                      </div>
                    </div>

                    {order?.expected_start_date && (
                      <div className="flex items-start gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-muted-foreground text-xs uppercase">Inicio previsto</span>
                          <p className="font-medium">{formatDate(order.expected_start_date)}</p>
                        </div>
                      </div>
                    )}

                    {order?.expected_end_date && (
                      <div className="flex items-start gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-muted-foreground text-xs uppercase">Fin previsto</span>
                          <p className="font-medium">{formatDate(order.expected_end_date)}</p>
                        </div>
                      </div>
                    )}

                    {/* Auditoría */}
                    <div className="pt-2 border-t border-border">
                      {order?.created_by_name && (
                        <div className="flex items-start gap-2 text-sm mb-2">
                          <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="text-muted-foreground text-xs uppercase">Creado por</span>
                            <p className="font-medium">{order.created_by_name}</p>
                          </div>
                        </div>
                      )}
                      {order?.approved_by_name && (
                        <div className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                          <div>
                            <span className="text-muted-foreground text-xs uppercase">Aprobado por</span>
                            <p className="font-medium">{order.approved_by_name}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(order.approved_at)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </DetailInfoSummary>
              }
              content={
                <div className="flex flex-col gap-3">
                  <MetricCard
                    title="Base Imponible"
                    value={loading ? "Cargando..." : formatCurrency(order?.subtotal || 0)}
                    icon={TrendingDown}
                  />
                  <MetricCard
                    title="IVA"
                    value={loading ? "Cargando..." : formatCurrency(order?.tax_amount || 0)}
                    icon={Receipt}
                  />
                  <MetricCard
                    title="Retención"
                    value={loading ? "Cargando..." : formatCurrency(order?.withholding_amount || 0)}
                    icon={Receipt}
                  />
                  <MetricCard
                    title="Total"
                    value={loading ? "Cargando..." : formatCurrency(order?.total || 0)}
                    icon={TrendingDown}
                  />
                </div>
              }
            />
          </div>
        </div>
      </div>

      {/* Diálogo para convertir a Factura de Compra */}
      {order && (
        <ConvertPOToInvoiceDialog
          open={convertDialogOpen}
          onOpenChange={setConvertDialogOpen}
          purchaseOrder={{
            id: order.id,
            po_number: order.po_number,
            supplier_id: order.supplier_id,
            supplier_name: order.supplier_name,
            supplier_tax_id: order.supplier_tax_id,
            project_id: order.project_id,
            subtotal: order.subtotal,
            tax_amount: order.tax_amount,
            withholding_amount: order.withholding_amount,
            total: order.total,
          }}
          onSuccess={fetchOrder}
        />
      )}
    </div>
  );
};

export default PurchaseOrderDetailPageDesktop;
