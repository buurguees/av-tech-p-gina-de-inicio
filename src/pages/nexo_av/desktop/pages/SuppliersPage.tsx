import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Building2,
  Mail,
  Phone,
  Euro,
  TrendingUp,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";
import CreateSupplierDialog from "../components/suppliers/CreateSupplierDialog";
import PaginationControls from "../components/common/PaginationControls";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import DataList from "../components/common/DataList";
import SearchBar from "../components/common/SearchBar";
import { getCategoryInfo } from "@/constants/supplierConstants";
import CompactKpiCard from "../components/common/CompactKpiCard";

interface Supplier {
  id: string;
  supplier_number: string;
  company_name: string;
  category: string | null;
  tax_id: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  email?: string | null;
  city: string | null;
  province: string | null;
  payment_terms: string | null;
  status: string;
  created_at: string;
}

const SUPPLIER_STATUSES = [
  { value: "ACTIVE", label: "Activo", color: "bg-status-success-bg text-status-success border-status-success/20" },
  { value: "INACTIVE", label: "Inactivo", color: "bg-status-neutral-bg text-status-neutral border-border" },
  { value: "BLOCKED", label: "Bloqueado", color: "bg-status-error-bg text-status-error border-status-error/20" },
];

const getStatusInfo = (status: string) => {
  return SUPPLIER_STATUSES.find((item) => item.value === status) || SUPPLIER_STATUSES[1];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const SuppliersPageDesktop = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [supplierKPIs, setSupplierKPIs] = useState({
    byStatus: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    monthlyCosts: 0,
    avgInvoicesPerSupplier: 0,
    avgInvoiceTicket: 0,
    totalPendingPayments: 0,
    avgCostPerSupplier: 0,
    topSuppliersCount: 0,
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedSuppliers = [...suppliers].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: string = "";
    let bValue: string = "";

    switch (sortColumn) {
      case "supplier_number":
        aValue = a.supplier_number || "";
        bValue = b.supplier_number || "";
        break;
      case "company_name":
        aValue = a.company_name || "";
        bValue = b.company_name || "";
        break;
      case "category":
        aValue = a.category || "";
        bValue = b.category || "";
        break;
      case "status":
        aValue = a.status || "";
        bValue = b.status || "";
        break;
      case "city":
        aValue = a.city || "";
        bValue = b.city || "";
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedSuppliers,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(sortedSuppliers, { pageSize: 50 });

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, statusFilter, categoryFilter]);

  useEffect(() => {
    if (suppliers.length > 0) {
      calculateSupplierKPIs();
    } else {
      setSupplierKPIs({
        byStatus: {},
        byCategory: {},
        monthlyCosts: 0,
        avgInvoicesPerSupplier: 0,
        avgInvoiceTicket: 0,
        totalPendingPayments: 0,
        avgCostPerSupplier: 0,
        topSuppliersCount: 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliers]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_suppliers", {
        p_search: debouncedSearchQuery || null,
        p_status: statusFilter === "all" ? null : statusFilter,
        p_category: categoryFilter === "all" ? null : categoryFilter,
      });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      console.error("Error fetching suppliers:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los proveedores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierCreated = () => {
    setIsCreateDialogOpen(false);
    fetchSuppliers();
  };

  const calculateSupplierKPIs = async () => {
    try {
      const byStatus: Record<string, number> = {
        ACTIVE: suppliers.filter((supplier) => supplier.status === "ACTIVE").length,
        INACTIVE: suppliers.filter((supplier) => supplier.status === "INACTIVE").length,
        BLOCKED: suppliers.filter((supplier) => supplier.status === "BLOCKED").length,
      };

      const byCategory: Record<string, number> = {};
      suppliers.forEach((supplier) => {
        const category = supplier.category || "SIN_CATEGORIA";
        byCategory[category] = (byCategory[category] || 0) + 1;
      });

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const params: Record<string, unknown> = {
        p_search: null,
        p_status: null,
        p_supplier_id: null,
        p_technician_id: null,
        p_document_type: null,
        p_page: 1,
        p_page_size: 10000,
      };

      const { data: purchaseInvoicesData, error: invoicesError } = await supabase.rpc("list_purchase_invoices", params);

      if (invoicesError) {
        console.error("Error fetching purchase invoices:", invoicesError);
        return;
      }

      const monthlyInvoices = (purchaseInvoicesData || []).filter((inv: any) => {
        if (!inv.issue_date || !inv.provider_id) return false;
        const invoiceDate = new Date(inv.issue_date);
        return (
          invoiceDate >= firstDayOfMonth &&
          invoiceDate <= lastDayOfMonth &&
          (inv.status === "CONFIRMED" || inv.status === "PAID" || inv.status === "REGISTERED") &&
          inv.provider_type === "SUPPLIER"
        );
      });

      const monthlyCosts = monthlyInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

      const invoicesBySupplier = new Map<string, number[]>();
      (purchaseInvoicesData || []).forEach((inv: any) => {
        if (
          inv.provider_id &&
          inv.total &&
          inv.provider_type === "SUPPLIER" &&
          inv.status !== "CANCELLED" &&
          inv.status !== "PENDING"
        ) {
          const supplierInvoices = invoicesBySupplier.get(inv.provider_id) || [];
          supplierInvoices.push(inv.total);
          invoicesBySupplier.set(inv.provider_id, supplierInvoices);
        }
      });

      const totalInvoices = Array.from(invoicesBySupplier.values()).reduce((sum, list) => sum + list.length, 0);
      const suppliersWithInvoices = invoicesBySupplier.size;
      const avgInvoicesPerSupplier = suppliersWithInvoices > 0 ? totalInvoices / suppliersWithInvoices : 0;

      const allInvoiceTotals: number[] = [];
      invoicesBySupplier.forEach((invoices) => {
        allInvoiceTotals.push(...invoices);
      });

      const avgInvoiceTicket =
        allInvoiceTotals.length > 0
          ? allInvoiceTotals.reduce((sum, total) => sum + total, 0) / allInvoiceTotals.length
          : 0;

      const pendingInvoices = (purchaseInvoicesData || []).filter((inv: any) => {
        return (
          inv.provider_type === "SUPPLIER" &&
          (inv.status === "REGISTERED" || inv.status === "CONFIRMED" || inv.status === "PARTIAL") &&
          inv.pending_amount &&
          inv.pending_amount > 0
        );
      });

      const totalPendingPayments = pendingInvoices.reduce((sum: number, inv: any) => sum + (inv.pending_amount || 0), 0);

      const activeSuppliers = suppliers.filter((supplier) => supplier.status === "ACTIVE");
      const activeSupplierIds = activeSuppliers.map((supplier) => supplier.id);
      const activeSupplierInvoices = monthlyInvoices.filter((inv: any) => activeSupplierIds.includes(inv.provider_id));
      const activeSupplierCosts = activeSupplierInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
      const avgCostPerSupplier = activeSuppliers.length > 0 ? activeSupplierCosts / activeSuppliers.length : 0;

      const supplierInvoiceCounts = Array.from(invoicesBySupplier.entries())
        .map(([id, invoices]) => ({ id, count: invoices.length }))
        .sort((a, b) => b.count - a.count);

      const topSuppliersCount =
        supplierInvoiceCounts.length > 0
          ? supplierInvoiceCounts.slice(0, 5).reduce((sum, supplier) => sum + supplier.count, 0)
          : 0;

      setSupplierKPIs({
        byStatus,
        byCategory,
        monthlyCosts,
        avgInvoicesPerSupplier,
        avgInvoiceTicket,
        totalPendingPayments,
        avgCostPerSupplier,
        topSuppliersCount,
      });
    } catch (error) {
      console.error("Error calculating supplier KPIs:", error);
    }
  };

  if (loading && suppliers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
          {/* KPIs — fila única compacta */}
          <div className="grid grid-cols-5 gap-2 flex-shrink-0">
            <CompactKpiCard label="Total proveedores" value={String(suppliers.length)} color="blue" delay={0} />
            <CompactKpiCard label="Activos" value={String(supplierKPIs.byStatus.ACTIVE || 0)} color="emerald" delay={0.05} />
            <CompactKpiCard label="Costes mensuales" value={formatCurrency(supplierKPIs.monthlyCosts)} color="amber" delay={0.1} />
            <CompactKpiCard label="Ticket medio" value={formatCurrency(supplierKPIs.avgInvoiceTicket)} color="cyan" delay={0.15} />
            <CompactKpiCard label="Pend. de pago" value={formatCurrency(supplierKPIs.totalPendingPayments)} color={supplierKPIs.totalPendingPayments > 0 ? 'destructive' : 'emerald'} delay={0.2} />
          </div>

          <div className="flex-shrink-0">
            <DetailNavigationBar
              pageTitle="Proveedores"
              contextInfo={
                <SearchBar
                  value={searchInput}
                  onChange={setSearchInput}
                  items={suppliers}
                  getSearchText={(supplier) =>
                    `${supplier.company_name} ${supplier.contact_email || supplier.email || ""} ${supplier.contact_phone || supplier.phone || ""} ${supplier.supplier_number || ""} ${supplier.tax_id || ""}`
                  }
                  renderResult={(supplier) => ({
                    id: supplier.id,
                    label: supplier.company_name,
                    subtitle: supplier.contact_email || supplier.email || supplier.contact_phone || supplier.phone || undefined,
                    icon: <Truck className="h-4 w-4" />,
                    data: supplier,
                  })}
                  onSelectResult={(result) => {
                    navigate(`/nexo-av/${userId}/suppliers/${result.data.id}`);
                  }}
                  placeholder="Buscar proveedores..."
                  maxResults={8}
                  debounceMs={300}
                />
              }
              tools={
                <DetailActionButton actionType="new_supplier" onClick={() => setIsCreateDialogOpen(true)} />
              }
            />
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <DataList
              data={paginatedSuppliers}
              columns={[
                {
                  key: "supplier_number",
                  label: "Nº",
                  sortable: true,
                  align: "left",
                  priority: 1,
                  render: (supplier) => (
                    <span className="text-foreground/80 text-[10px]">{supplier.supplier_number || "-"}</span>
                  ),
                },
                {
                  key: "company_name",
                  label: "Proveedor",
                  sortable: true,
                  align: "left",
                  priority: 3,
                  render: (supplier) => (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted/30">
                        <Truck className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-foreground font-medium text-[10px]">{supplier.company_name}</p>
                        {supplier.tax_id && <p className="text-muted-foreground text-[9px]">{supplier.tax_id}</p>}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "category",
                  label: "Categoría",
                  sortable: true,
                  align: "center",
                  priority: 2,
                  render: (supplier) => {
                    const categoryInfo = getCategoryInfo(supplier.category);
                    return (
                      <div className="flex justify-center">
                        {categoryInfo ? (
                          <Badge
                            variant="outline"
                            className={cn(categoryInfo.bgColor, categoryInfo.color, "border text-[9px] px-1.5 py-0.5 w-24 justify-center")}
                          >
                            {categoryInfo.label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[9px]">-</span>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: "status",
                  label: "Estado",
                  sortable: true,
                  align: "center",
                  priority: 4,
                  render: (supplier) => {
                    const statusInfo = getStatusInfo(supplier.status);
                    return (
                      <div className="flex justify-center">
                        <Badge variant="outline" className={cn(statusInfo.color, "border text-[9px] px-1.5 py-0.5 w-20 justify-center")}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    );
                  },
                },
                {
                  key: "contact_email",
                  label: "Email",
                  align: "left",
                  priority: 5,
                  render: (supplier) => {
                    const email = supplier.contact_email || supplier.email;
                    return email ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[9px]">
                        <Mail className="h-2.5 w-2.5" />
                        <span className="truncate max-w-[200px]">{email}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[9px]">-</span>
                    );
                  },
                },
                {
                  key: "contact_phone",
                  label: "Teléfono",
                  align: "left",
                  priority: 6,
                  render: (supplier) => {
                    const phone = supplier.contact_phone || supplier.phone;
                    return phone ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[9px]">
                        <Phone className="h-2.5 w-2.5" />
                        {phone}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[9px]">-</span>
                    );
                  },
                },
                {
                  key: "city",
                  label: "Ciudad",
                  sortable: true,
                  align: "left",
                  priority: 7,
                  render: (supplier) => (
                    <span className="text-muted-foreground text-[9px]">
                      {[supplier.city, supplier.province].filter(Boolean).join(", ") || "-"}
                    </span>
                  ),
                },
              ]}
              actions={[
                {
                  label: "Ver detalle",
                  onClick: (supplier) => navigate(`/nexo-av/${userId}/suppliers/${supplier.id}`),
                },
              ]}
              onItemClick={(supplier) => navigate(`/nexo-av/${userId}/suppliers/${supplier.id}`)}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              loading={loading}
              emptyMessage="No hay proveedores"
              emptyIcon={<Truck className="h-16 w-16 text-muted-foreground" />}
              getItemId={(supplier) => supplier.id}
            />
          </div>

          {!loading && suppliers.length > 0 && totalPages > 1 && (
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
          )}

      <CreateSupplierDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleSupplierCreated}
      />
    </div>
  );
};

export default SuppliersPageDesktop;


