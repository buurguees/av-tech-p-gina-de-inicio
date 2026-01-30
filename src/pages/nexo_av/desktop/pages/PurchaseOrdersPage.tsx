import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardList, 
  Edit, 
  Trash2, 
  Loader2, 
  TrendingDown,
  Clock,
  CheckCircle2,
  FileText
} from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "../components/common/PaginationControls";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { 
  getPurchaseOrderStatusInfo, 
  canDeletePurchaseOrder,
  PURCHASE_ORDER_STATUSES 
} from "@/constants/purchaseOrderStatuses";
import SearchBar from "../components/common/SearchBar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import DataList from "../components/common/DataList";

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string | null;
  supplier_name: string | null;
  technician_id: string | null;
  technician_name: string | null;
  project_id: string | null;
  project_number: string | null;
  project_name: string | null;
  client_name: string | null;
  status: string;
  issue_date: string | null;
  expected_start_date: string | null;
  expected_end_date: string | null;
  subtotal: number;
  total: number;
  linked_purchase_invoice_id: string | null;
  linked_invoice_number: string | null;
  created_at: string;
}

const PurchaseOrdersPageDesktop = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, debouncedSearchQuery]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_purchase_orders" as any, {
        p_status: statusFilter,
        p_search: debouncedSearchQuery || null,
      });

      if (error) throw error;
      setOrders((data || []) as PurchaseOrder[]);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los pedidos de compra",
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

  const handleNewOrder = () => {
    navigate(`/nexo-av/${userId}/purchase-orders/new`);
  };

  const handleDeleteClick = (e: React.MouseEvent, order: PurchaseOrder) => {
    e.stopPropagation();
    if (!canDeletePurchaseOrder(order.status)) {
      toast({
        title: "Error",
        description: "Solo se pueden eliminar pedidos en estado borrador o cancelado",
        variant: "destructive",
      });
      return;
    }
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    try {
      setDeleting(true);
      const { error } = await supabase.rpc("delete_purchase_order", {
        p_order_id: orderToDelete.id,
      });

      if (error) throw error;

      toast({
        title: "Pedido eliminado",
        description: `El pedido ${orderToDelete.po_number} ha sido eliminado`,
      });

      fetchOrders();
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    } catch (error: any) {
      console.error("Error deleting purchase order:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el pedido",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case "po_number":
        aValue = a.po_number;
        bValue = b.po_number;
        break;
      case "supplier_name":
        aValue = a.supplier_name || "";
        bValue = b.supplier_name || "";
        break;
      case "project_name":
        aValue = a.project_name || "";
        bValue = b.project_name || "";
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "total":
        aValue = a.total;
        bValue = b.total;
        break;
      case "issue_date":
        aValue = a.issue_date ? new Date(a.issue_date).getTime() : 0;
        bValue = b.issue_date ? new Date(b.issue_date).getTime() : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Estadísticas
  const stats = {
    totalEstimado: orders.reduce((sum, o) => sum + (o.total || 0), 0),
    pendientes: orders.filter(o => o.status === 'DRAFT' || o.status === 'PENDING_APPROVAL').length,
    aprobados: orders.filter(o => o.status === 'APPROVED').length,
    completados: orders.filter(o => o.status === 'COMPLETED' || o.status === 'INVOICED').length,
  };

  // Paginación
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedOrders,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(sortedOrders, { pageSize: 50 });

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-6">
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3 flex-shrink-0">
            <div className="bg-card/50 border border-white/10 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-blue-500/10 rounded text-blue-500">
                  <TrendingDown className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Coste Estimado</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(stats.totalEstimado)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({orders.length} pedidos)
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-white/10 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-orange-500/10 rounded text-orange-500">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Pendientes</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-foreground">
                  {stats.pendientes}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  por aprobar
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-white/10 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-green-500/10 rounded text-green-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Aprobados</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-foreground">
                  {stats.aprobados}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  en curso
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-white/10 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-purple-500/10 rounded text-purple-500">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Completados</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-foreground">
                  {stats.completados}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  finalizados
                </span>
              </div>
            </div>
          </div>

          {/* DetailNavigationBar */}
          <div className="mb-6 flex-shrink-0">
            <DetailNavigationBar
              pageTitle="Pedidos de Compra"
              contextInfo={
                <SearchBar
                  value={searchInput}
                  onChange={setSearchInput}
                  items={orders}
                  getSearchText={(order) => 
                    `${order.po_number} ${order.supplier_name || ''} ${order.project_name || ''} ${order.technician_name || ''}`
                  }
                  renderResult={(order) => ({
                    id: order.id,
                    label: order.po_number,
                    subtitle: `${order.supplier_name || order.technician_name || 'Sin proveedor'} - ${formatCurrency(order.total)}`,
                    icon: <ClipboardList className="h-4 w-4" />,
                    data: order,
                  })}
                  onSelectResult={(result) => {
                    navigate(`/nexo-av/${userId}/purchase-orders/${result.data.id}`);
                  }}
                  placeholder="Buscar pedidos..."
                  maxResults={8}
                  debounceMs={300}
                />
              }
              tools={
                <DetailActionButton
                  actionType="purchase-order"
                  onClick={handleNewOrder}
                />
              }
            />
          </div>

          {/* DataList */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <DataList
              data={paginatedOrders}
              columns={[
                {
                  key: "po_number",
                  label: "Nº Pedido",
                  sortable: true,
                  align: "left",
                  priority: 1,
                  render: (order) => (
                    <span className="text-foreground font-medium">
                      {order.po_number}
                    </span>
                  ),
                },
                {
                  key: "project_name",
                  label: "Proyecto",
                  sortable: true,
                  align: "left",
                  priority: 2,
                  render: (order) => (
                    <div className="flex flex-col">
                      <span className="text-foreground truncate">
                        {order.project_name || "-"}
                      </span>
                      {order.project_number && (
                        <span className="text-muted-foreground text-xs">
                          {order.project_number}
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: "supplier_name",
                  label: "Proveedor / Técnico",
                  sortable: true,
                  align: "left",
                  priority: 3,
                  render: (order) => (
                    <span className="text-foreground/80">
                      {order.supplier_name || order.technician_name || "-"}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Estado",
                  align: "center",
                  priority: 2,
                  render: (order) => {
                    const statusInfo = getPurchaseOrderStatusInfo(order.status);
                    return (
                      <div className="flex justify-center">
                        <Badge 
                          variant="outline" 
                          className={cn(statusInfo.className, "border text-[11px] px-1.5 py-0.5 w-20 justify-center")}
                        >
                          {statusInfo.label}
                        </Badge>
                      </div>
                    );
                  },
                },
                {
                  key: "issue_date",
                  label: "Fecha",
                  sortable: true,
                  align: "left",
                  priority: 5,
                  render: (order) => (
                    <span className="text-muted-foreground">
                      {formatDate(order.issue_date)}
                    </span>
                  ),
                },
                {
                  key: "expected_start_date",
                  label: "Inicio Previsto",
                  sortable: true,
                  align: "left",
                  priority: 6,
                  render: (order) => (
                    <span className="text-muted-foreground">
                      {formatDate(order.expected_start_date)}
                    </span>
                  ),
                },
                {
                  key: "subtotal",
                  label: "Base",
                  sortable: true,
                  align: "right",
                  priority: 5,
                  render: (order) => (
                    <span className="text-foreground">
                      {formatCurrency(order.subtotal)}
                    </span>
                  ),
                },
                {
                  key: "total",
                  label: "Total",
                  sortable: true,
                  align: "right",
                  priority: 4,
                  render: (order) => (
                    <span className="text-foreground font-medium">
                      {formatCurrency(order.total)}
                    </span>
                  ),
                },
                {
                  key: "linked_invoice_number",
                  label: "Factura",
                  align: "left",
                  priority: 7,
                  render: (order) => (
                    <span className="text-muted-foreground text-xs">
                      {order.linked_invoice_number || "-"}
                    </span>
                  ),
                },
              ]}
              actions={[
                {
                  label: "Editar",
                  icon: <Edit className="mr-2 h-4 w-4" />,
                  onClick: (order) => navigate(`/nexo-av/${userId}/purchase-orders/${order.id}/edit`),
                  condition: (order) => order.status === "DRAFT" || order.status === "PENDING_APPROVAL",
                },
                {
                  label: "Eliminar",
                  icon: <Trash2 className="mr-2 h-4 w-4" />,
                  variant: "destructive",
                  onClick: (order) => {
                    if (!canDeletePurchaseOrder(order.status)) {
                      toast({
                        title: "Error",
                        description: "Solo se pueden eliminar pedidos en estado borrador o cancelado",
                        variant: "destructive",
                      });
                      return;
                    }
                    setOrderToDelete(order);
                    setDeleteDialogOpen(true);
                  },
                  condition: (order) => canDeletePurchaseOrder(order.status),
                },
              ]}
              onItemClick={(order) => navigate(`/nexo-av/${userId}/purchase-orders/${order.id}`)}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              loading={loading}
              emptyMessage="No hay pedidos de compra"
              emptyIcon={<ClipboardList className="h-16 w-16 text-muted-foreground" />}
              getItemId={(order) => order.id}
            />
          </div>

          {/* Paginación */}
          {!loading && orders.length > 0 && totalPages > 1 && (
            <div className="flex-shrink-0 mt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={totalItems}
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
                onPrevPage={prevPage}
                onNextPage={nextPage}
                onGoToPage={goToPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar pedido de compra?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Esta acción eliminará permanentemente el pedido {orderToDelete?.po_number} y todas sus líneas.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              disabled={deleting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PurchaseOrdersPageDesktop;
