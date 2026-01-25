import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Search,
    Loader2,
    Plus,
    ChevronDown,
    Info,
    Filter,
    Users,
    Truck,
    Building2,
    Mail,
    Phone,
    MoreVertical,
    Euro,
    TrendingUp,
    BarChart3,
    AlertCircle,
    CheckCircle,
    XCircle,
    Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import CreateSupplierDialog from "../components/suppliers/CreateSupplierDialog";
import { SUPPLIER_CATEGORIES, getCategoryInfo } from "@/constants/supplierConstants";


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
    const [supplierKPIs, setSupplierKPIs] = useState({
        byStatus: {} as Record<string, number>,
        byCategory: {} as Record<string, number>,
        monthlyCosts: 0,
        avgInvoicesPerSupplier: 0,
        avgInvoiceTicket: 0,
        totalPendingPayments: 0,
        avgCostPerSupplier: 0,
        topSuppliersCount: 0
    });

    useEffect(() => {
        fetchSuppliers();
    }, [debouncedSearchQuery, statusFilter, categoryFilter]);

    useEffect(() => {
        if (suppliers.length > 0) {
            calculateSupplierKPIs();
        }
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return { label: 'Activo', color: 'bg-green-100 text-green-700 border-green-300' };
            case 'INACTIVE':
                return { label: 'Inactivo', color: 'bg-zinc-100 text-zinc-700 border-zinc-300' };
            case 'BLOCKED':
                return { label: 'Bloqueado', color: 'bg-red-100 text-red-700 border-red-300' };
            default:
                return { label: status, color: 'bg-zinc-100 text-zinc-700 border-zinc-300' };
        }
    };

    const calculateSupplierKPIs = async () => {
        try {
            // Contar proveedores por estado
            const byStatus: Record<string, number> = {
                'ACTIVE': suppliers.filter(s => s.status === 'ACTIVE').length,
                'INACTIVE': suppliers.filter(s => s.status === 'INACTIVE').length,
                'BLOCKED': suppliers.filter(s => s.status === 'BLOCKED').length
            };

            // Contar proveedores por categoría
            const byCategory: Record<string, number> = {};
            suppliers.forEach(supplier => {
                const category = supplier.category || 'SIN_CATEGORIA';
                byCategory[category] = (byCategory[category] || 0) + 1;
            });

            // Obtener facturas de compra del mes actual
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const { data: purchaseInvoicesData, error: invoicesError } = await supabase.rpc('list_purchase_invoices', {
                p_search: null,
                p_status: null,
                p_document_type: null,
                p_page: 1,
                p_page_size: 10000
            });

            if (invoicesError) {
                console.error('Error fetching purchase invoices:', invoicesError);
                return;
            }

            // Filtrar facturas del mes actual y aprobadas/pagadas
            const monthlyInvoices = (purchaseInvoicesData || []).filter((inv: any) => {
                if (!inv.issue_date || !inv.provider_id) return false;
                const invoiceDate = new Date(inv.issue_date);
                return invoiceDate >= firstDayOfMonth && invoiceDate <= lastDayOfMonth &&
                       (inv.status === 'CONFIRMED' || inv.status === 'PAID' || inv.status === 'REGISTERED') &&
                       inv.provider_type === 'SUPPLIER';
            });

            const monthlyCosts = monthlyInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

            // Calcular facturas por proveedor
            const invoicesBySupplier = new Map<string, number[]>();
            (purchaseInvoicesData || []).forEach((inv: any) => {
                if (inv.provider_id && inv.total && inv.provider_type === 'SUPPLIER' && 
                    inv.status !== 'CANCELLED' && inv.status !== 'PENDING') {
                    const supplierInvoices = invoicesBySupplier.get(inv.provider_id) || [];
                    supplierInvoices.push(inv.total);
                    invoicesBySupplier.set(inv.provider_id, supplierInvoices);
                }
            });

            // Media de facturas por proveedor
            const activeSuppliers = suppliers.filter(s => s.status === 'ACTIVE');
            const suppliersWithInvoices = Array.from(invoicesBySupplier.keys()).length;
            const avgInvoicesPerSupplier = suppliersWithInvoices > 0 
                ? invoicesBySupplier.size / suppliersWithInvoices 
                : 0;

            // Ticket medio de factura
            const allInvoiceTotals: number[] = [];
            invoicesBySupplier.forEach((invoices) => {
                allInvoiceTotals.push(...invoices);
            });

            const avgInvoiceTicket = allInvoiceTotals.length > 0
                ? allInvoiceTotals.reduce((sum, total) => sum + total, 0) / allInvoiceTotals.length
                : 0;

            // Pagos pendientes
            const pendingInvoices = (purchaseInvoicesData || []).filter((inv: any) => {
                return inv.provider_type === 'SUPPLIER' && 
                       (inv.status === 'REGISTERED' || inv.status === 'CONFIRMED' || inv.status === 'PARTIAL') &&
                       inv.pending_amount && inv.pending_amount > 0;
            });

            const totalPendingPayments = pendingInvoices.reduce((sum: number, inv: any) => 
                sum + (inv.pending_amount || 0), 0);

            // Media de coste por proveedor activo
            const activeSupplierIds = activeSuppliers.map(s => s.id);
            const activeSupplierInvoices = monthlyInvoices.filter((inv: any) => 
                activeSupplierIds.includes(inv.provider_id)
            );
            const activeSupplierCosts = activeSupplierInvoices.reduce((sum: number, inv: any) => 
                sum + (inv.total || 0), 0);
            const avgCostPerSupplier = activeSuppliers.length > 0 
                ? activeSupplierCosts / activeSuppliers.length 
                : 0;

            // Top proveedores (proveedores con más facturas)
            const supplierInvoiceCounts = Array.from(invoicesBySupplier.entries())
                .map(([id, invoices]) => ({ id, count: invoices.length }))
                .sort((a, b) => b.count - a.count);
            const topSuppliersCount = supplierInvoiceCounts.length > 0 
                ? supplierInvoiceCounts.slice(0, 5).reduce((sum, s) => sum + s.count, 0) 
                : 0;

            setSupplierKPIs({
                byStatus,
                byCategory,
                monthlyCosts,
                avgInvoicesPerSupplier,
                avgInvoiceTicket,
                totalPendingPayments,
                avgCostPerSupplier,
                topSuppliersCount
            });
        } catch (error) {
            console.error('Error calculating supplier KPIs:', error);
        }
    };

    return (
        <div className="w-full h-full p-6">
            <div className="w-full h-full">
                <div>
                    {/* KPIs Cards - Recuento por Estado - Optimizado */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        <div className="bg-card/50 border border-border rounded-lg p-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1 bg-blue-500/10 rounded text-blue-600">
                                    <Building2 className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Total</span>
                            </div>
                            <div>
                                <span className="text-lg font-bold text-foreground">
                                    {suppliers.length}
                                </span>
                            </div>
                        </div>

                        <div className="bg-card/50 border border-border rounded-lg p-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1 bg-green-500/10 rounded text-green-600">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Activos</span>
                            </div>
                            <div>
                                <span className="text-lg font-bold text-foreground">
                                    {supplierKPIs.byStatus['ACTIVE'] || 0}
                                </span>
                            </div>
                        </div>

                        <div className="bg-card/50 border border-border rounded-lg p-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1 bg-zinc-500/10 rounded text-zinc-600">
                                    <XCircle className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Inactivos</span>
                            </div>
                            <div>
                                <span className="text-lg font-bold text-foreground">
                                    {supplierKPIs.byStatus['INACTIVE'] || 0}
                                </span>
                            </div>
                        </div>

                        <div className="bg-card/50 border border-border rounded-lg p-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1 bg-red-500/10 rounded text-red-600">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Bloqueados</span>
                            </div>
                            <div>
                                <span className="text-lg font-bold text-foreground">
                                    {supplierKPIs.byStatus['BLOCKED'] || 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* KPIs Cards - Métricas de Costes - Optimizado */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        <div className="bg-card/50 border border-border rounded-lg p-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1 bg-orange-500/10 rounded text-orange-600">
                                    <Euro className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Costes Mensuales</span>
                            </div>
                            <div>
                                <span className="text-base font-bold text-foreground">
                                    {formatCurrency(supplierKPIs.monthlyCosts)}
                                </span>
                            </div>
                        </div>

                        <div className="bg-card/50 border border-border rounded-lg p-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1 bg-purple-500/10 rounded text-purple-600">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Media Coste/Prov.</span>
                            </div>
                            <div>
                                <span className="text-base font-bold text-foreground">
                                    {formatCurrency(supplierKPIs.avgCostPerSupplier)}
                                </span>
                            </div>
                        </div>

                        <div className="bg-card/50 border border-border rounded-lg p-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1 bg-cyan-500/10 rounded text-cyan-600">
                                    <BarChart3 className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Ticket Medio</span>
                            </div>
                            <div>
                                <span className="text-base font-bold text-foreground">
                                    {formatCurrency(supplierKPIs.avgInvoiceTicket)}
                                </span>
                            </div>
                        </div>

                        <div className="bg-card/50 border border-border rounded-lg p-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1 bg-red-500/10 rounded text-red-600">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Pendientes</span>
                            </div>
                            <div>
                                <span className="text-base font-bold text-foreground">
                                    {formatCurrency(supplierKPIs.totalPendingPayments)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Header - Estilo ProjectsPage */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Proveedores</h1>
                                <Info className="h-3 w-3 text-muted-foreground" />
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => setIsCreateDialogOpen(true)}
                                    className="h-9 px-2 text-[10px] font-medium"
                                >
                                    <Plus className="h-3 w-3 mr-1.5" />
                                    Nuevo proveedor
                                    <span className="ml-2 text-[9px] px-1.5 py-0.5 opacity-70">N</span>
                                </Button>
                            </div>
                        </div>

                        {/* Search Bar - Estilo Holded */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 min-w-[200px] max-w-md">
                                <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar proveedores..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="pr-11"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : suppliers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Truck className="h-16 w-16 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No hay proveedores</p>
                            <p className="text-muted-foreground/70 text-[10px] mt-1">
                                Crea tu primer proveedor para comenzar
                            </p>
                        </div>
                    ) : (
                        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md w-full">
                            <Table className="w-full">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent bg-muted/30">
                                        <TableHead className="text-white/70 text-[10px] px-2">Proveedor</TableHead>
                                        <TableHead className="text-white/70 text-[10px] px-2">Categoría</TableHead>
                                        <TableHead className="text-white/70 text-[10px] px-2">Contacto</TableHead>
                                        <TableHead className="text-white/70 text-[10px] px-2">Localización</TableHead>
                                        <TableHead className="text-white/70 text-[10px] px-2 text-center">Estado</TableHead>
                                        <TableHead className="text-white/70 w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {suppliers.map((supplier) => {
                                        const statusInfo = getStatusInfo(supplier.status);
                                        return (
                                            <TableRow
                                                key={supplier.id}
                                                className={cn(
                                                    "border-white/10 cursor-pointer hover:bg-white/[0.06] transition-colors duration-200"
                                                )}
                                                onClick={() => navigate(`/nexo-av/${userId}/suppliers/${supplier.id}`)}
                                            >
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-white text-[10px]">
                                                            {supplier.company_name}
                                                        </span>
                                                        <span className="text-[13px] font-semibold text-white/70 font-mono mt-0.5">
                                                            {supplier.supplier_number} {supplier.tax_id && `• ${supplier.tax_id}`}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {supplier.category ? (
                                                        (() => {
                                                            const categoryInfo = getCategoryInfo(supplier.category);
                                                            return categoryInfo ? (
                                                                <Badge variant="outline" className={cn(categoryInfo.bgColor, categoryInfo.color, "border text-[9px] px-1.5 py-0.5")}>
                                                                    {categoryInfo.label}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-white/50 text-[9px] px-1.5 py-0.5">—</span>
                                                            );
                                                        })()
                                                    ) : (
                                                        <span className="text-white/50 text-[9px] px-1.5 py-0.5">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {supplier.contact_email && (
                                                            <div className="flex items-center gap-1.5 text-white/70 text-[9px] px-1.5 py-0.5">
                                                                <Mail className="h-2.5 w-2.5" />
                                                                <span className="truncate max-w-[200px]">{supplier.contact_email}</span>
                                                            </div>
                                                        )}
                                                        {supplier.contact_phone && (
                                                            <div className="flex items-center gap-1.5 text-white/70 text-[9px] px-1.5 py-0.5">
                                                                <Phone className="h-2.5 w-2.5" />
                                                                <span>{supplier.contact_phone}</span>
                                                            </div>
                                                        )}
                                                        {!supplier.contact_email && !supplier.contact_phone && (
                                                            <span className="text-white/50 text-[9px] px-1.5 py-0.5">—</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-white/70 text-[10px]">
                                                    {supplier.city || supplier.province ? (
                                                        <span>{[supplier.city, supplier.province].filter(Boolean).join(", ")}</span>
                                                    ) : (
                                                        <span>—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center">
                                                        <Badge variant="outline" className={cn(statusInfo.color, "border text-[9px] px-1.5 py-0.5 w-20 justify-center")}>
                                                            {statusInfo.label}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10"
                                                            >
                                                                <MoreVertical className="h-3 w-3" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                                                            <DropdownMenuItem
                                                                className="text-white hover:bg-white/10"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(`/nexo-av/${userId}/suppliers/${supplier.id}`);
                                                                }}
                                                            >
                                                                Ver detalle
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>

            <CreateSupplierDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSuccess={handleSupplierCreated}
            />
        </div>
    );
};

export default SuppliersPageDesktop;
