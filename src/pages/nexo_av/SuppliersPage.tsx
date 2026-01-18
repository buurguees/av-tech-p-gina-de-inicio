import { useState, useEffect } from "react";
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
    ArrowUpDown
} from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Supplier {
    id: string;
    supplier_number: string;
    company_name: string;
    legal_name: string;
    tax_id: string;
    contact_name: string;
    phone: string;
    email: string;
    city: string;
    province: string;
    payment_terms: string;
    status: string;
    created_at: string;
}

const SuppliersPage = () => {
    const navigate = useNavigate();
    const { userId } = useParams<{ userId: string }>();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearchQuery = useDebounce(searchInput, 500);
    const [statusFilter, setStatusFilter] = useState("all");

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

    return (
        <div className="w-full">
            <div className="w-[95%] max-w-[1800px] mx-auto px-4 pb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                    <Truck className="h-6 w-6 text-blue-400" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Proveedores</h1>
                                    <p className="text-white/40 text-sm mt-0.5">Gestión de suministros y servicios externos</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={() => { }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-5 rounded-2xl shadow-lg shadow-blue-500/20 gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Plus className="h-4 w-4" />
                                    Nuevo Proveedor
                                </Button>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-sm p-4 rounded-3xl flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-2xl">
                                    <Building2 className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Total Proveedores</p>
                                    <p className="text-xl font-bold text-white">{suppliers.length}</p>
                                </div>
                            </div>

                            <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-sm p-4 rounded-3xl flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                                    <Users className="h-5 w-5 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Activos</p>
                                    <p className="text-xl font-bold text-white">
                                        {suppliers.filter(s => s.status === 'ACTIVE').length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Filters Bar */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-[2rem] backdrop-blur-md">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                                <Input
                                    placeholder="Buscar por nombre, CIF o número..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="pl-11 h-11 bg-white/5 border-white/10 text-white rounded-2xl focus:ring-blue-500/20 focus:border-blue-500/40 transition-all text-sm"
                                />
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="h-11 px-4 bg-white/5 border-white/10 text-white rounded-2xl hover:bg-white/10 gap-2 whitespace-nowrap min-w-[140px]"
                                        >
                                            <Filter className="h-4 w-4 text-white/40" />
                                            {statusFilter === "all" ? "Todos los estados" : statusFilter}
                                            <ChevronDown className="h-3 w-3 ml-auto opacity-40" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 rounded-2xl p-1 w-56">
                                        <DropdownMenuItem onClick={() => setStatusFilter("all")} className="text-white rounded-xl focus:bg-white/10">
                                            Todos los estados
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setStatusFilter("ACTIVE")} className="text-white rounded-xl focus:bg-white/10">
                                            Activos
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setStatusFilter("INACTIVE")} className="text-white rounded-xl focus:bg-white/10">
                                            Inactivos
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setStatusFilter("BLOCKED")} className="text-red-400 rounded-xl focus:bg-red-500/10">
                                            Bloqueados
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <div className="relative">
                                    <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                                    <div className="absolute inset-0 blur-lg bg-blue-500/20" />
                                </div>
                                <p className="text-white/40 font-medium animate-pulse">Cargando base de proveedores...</p>
                            </div>
                        ) : suppliers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                                <div className="p-6 bg-white/[0.03] rounded-[2.5rem] border border-white/5 mb-6">
                                    <Search className="h-12 w-12 text-white/10" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">No hay resultados</h3>
                                <p className="text-white/40 max-w-sm mb-8">
                                    No hemos encontrado ningún proveedor que coincida con tus criterios de búsqueda.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => { setSearchInput(""); setStatusFilter("all"); }}
                                    className="rounded-2xl border-white/10 text-white/60 hover:text-white"
                                >
                                    Limpiar filtros
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-white/[0.02]">
                                        <TableRow className="border-white/5 hover:bg-transparent">
                                            <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] pl-8 h-14">Proveedor</TableHead>
                                            <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] h-14">Contacto</TableHead>
                                            <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] h-14">Localización</TableHead>
                                            <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] h-14">Estado</TableHead>
                                            <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] h-14 text-right pr-8">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {suppliers.map((supplier) => (
                                            <TableRow
                                                key={supplier.id}
                                                className="group border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors h-20"
                                                onClick={() => navigate(`/nexo-av/${userId}/suppliers/${supplier.id}`)}
                                            >
                                                <TableCell className="pl-8">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-white group-hover:text-blue-400 transition-colors">
                                                            {supplier.company_name}
                                                        </span>
                                                        <span className="text-xs text-white/30 font-mono mt-1">
                                                            {supplier.supplier_number} • {supplier.tax_id}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2 text-white/60">
                                                            <Mail className="h-3 w-3 text-blue-500/50" />
                                                            <span className="text-xs truncate max-w-[180px]">{supplier.email || "—"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-white/60">
                                                            <Phone className="h-3 w-3 text-emerald-500/50" />
                                                            <span className="text-xs">{supplier.phone || "—"}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-white/80">{supplier.city || "—"}</span>
                                                        <span className="text-[10px] text-white/40 uppercase tracking-wide mt-1">{supplier.province || "—"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border-none",
                                                            supplier.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-400" :
                                                                supplier.status === 'INACTIVE' ? "bg-zinc-500/10 text-zinc-400" :
                                                                    "bg-red-500/10 text-red-500"
                                                        )}
                                                    >
                                                        {supplier.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-8">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="rounded-xl hover:bg-white/10 text-white/20 group-hover:text-white transition-all shadow-none"
                                                    >
                                                        <Info className="h-5 w-5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default SuppliersPage;
