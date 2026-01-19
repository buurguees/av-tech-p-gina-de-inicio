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
    MoreVertical
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createMobilePage } from "./MobilePageWrapper";
import CreateSupplierDialog from "./components/CreateSupplierDialog";

const SuppliersPageMobile = lazy(() => import("./mobile/SuppliersPageMobile"));

interface Supplier {
    id: string;
    supplier_number: string;
    company_name: string;
    tax_id: string | null;
    contact_phone: string | null;
    contact_email: string | null;
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
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    useEffect(() => {
        fetchSuppliers();
    }, [debouncedSearchQuery, statusFilter]);

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.rpc("list_suppliers", {
                p_search: debouncedSearchQuery || null,
                p_status: statusFilter === "all" ? null : statusFilter,
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

    return (
        <div className="w-full h-full px-6 py-6">
            <div className="w-full max-w-none mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-card/50 border border-border rounded-xl p-4"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <span className="text-muted-foreground text-sm font-medium">Total Proveedores</span>
                            </div>
                            <div className="mt-2">
                                <span className="text-3xl font-bold text-foreground">
                                    {suppliers.length}
                                </span>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-card/50 border border-border rounded-xl p-4"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
                                    <Users className="h-5 w-5" />
                                </div>
                                <span className="text-muted-foreground text-sm font-medium">Activos</span>
                            </div>
                            <div className="mt-2">
                                <span className="text-3xl font-bold text-foreground">
                                    {suppliers.filter(s => s.status === 'ACTIVE').length}
                                </span>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-card/50 border border-border rounded-xl p-4"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-zinc-500/10 rounded-lg text-zinc-600">
                                    <Truck className="h-5 w-5" />
                                </div>
                                <span className="text-muted-foreground text-sm font-medium">Inactivos</span>
                            </div>
                            <div className="mt-2">
                                <span className="text-3xl font-bold text-foreground">
                                    {suppliers.filter(s => s.status === 'INACTIVE').length}
                                </span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Header - Estilo ProjectsPage */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Proveedores</h1>
                                <Info className="h-4 w-4 text-muted-foreground" />
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => setIsCreateDialogOpen(true)}
                                    className="h-9 px-4 text-sm font-medium"
                                >
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    Nuevo proveedor
                                </Button>
                            </div>
                        </div>

                        {/* Search Bar - Estilo ProjectsPage */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 min-w-[200px] max-w-md">
                                <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar proveedores..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="pr-11 h-8 text-xs"
                                />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8">
                                        <Filter className="h-3 w-3 mr-1.5" />
                                        {statusFilter === "all" ? "Todos" : statusFilter}
                                        <ChevronDown className="h-3 w-3 ml-1" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                                        Todos los estados
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter("ACTIVE")}>
                                        Activos
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter("INACTIVE")}>
                                        Inactivos
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter("BLOCKED")}>
                                        Bloqueados
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : suppliers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Truck className="h-16 w-16 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No hay proveedores</p>
                            <p className="text-muted-foreground/70 text-sm mt-1">
                                Crea tu primer proveedor para comenzar
                            </p>
                        </div>
                    ) : (
                        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent bg-muted/30">
                                        <TableHead className="text-white/70">Proveedor</TableHead>
                                        <TableHead className="text-white/70">Contacto</TableHead>
                                        <TableHead className="text-white/70">Localización</TableHead>
                                        <TableHead className="text-white/70">Estado</TableHead>
                                        <TableHead className="text-white/70 w-12"></TableHead>
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
                                                        <span className="font-medium text-white text-sm">
                                                            {supplier.company_name}
                                                        </span>
                                                        <span className="text-xs text-white/50 font-mono mt-0.5">
                                                            {supplier.supplier_number} {supplier.tax_id && `• ${supplier.tax_id}`}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {supplier.contact_email && (
                                                            <div className="flex items-center gap-1.5 text-white/70 text-xs">
                                                                <Mail className="h-3 w-3" />
                                                                <span className="truncate max-w-[200px]">{supplier.contact_email}</span>
                                                            </div>
                                                        )}
                                                        {supplier.contact_phone && (
                                                            <div className="flex items-center gap-1.5 text-white/70 text-xs">
                                                                <Phone className="h-3 w-3" />
                                                                <span>{supplier.contact_phone}</span>
                                                            </div>
                                                        )}
                                                        {!supplier.contact_email && !supplier.contact_phone && (
                                                            <span className="text-white/50 text-xs">—</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-white/70 text-sm">
                                                    {supplier.city || supplier.province ? (
                                                        <span>{[supplier.city, supplier.province].filter(Boolean).join(", ")}</span>
                                                    ) : (
                                                        <span>—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn(statusInfo.color, "border text-xs")}>
                                                        {statusInfo.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
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
                </motion.div>
            </div>

            <CreateSupplierDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSuccess={handleSupplierCreated}
            />
        </div>
    );
};

const SuppliersPage = createMobilePage({
  DesktopComponent: SuppliersPageDesktop,
  MobileComponent: SuppliersPageMobile,
});

export default SuppliersPage;
