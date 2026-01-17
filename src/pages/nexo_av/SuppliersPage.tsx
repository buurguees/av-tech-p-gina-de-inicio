import React, { useState, useEffect, useCallback, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Search, Phone, Mail, MapPin, Building2, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import PaginationControls from "./components/PaginationControls";

// const SuppliersPageMobile = lazy(() => import("./mobile/SuppliersPageMobile"));

interface Supplier {
    id: string;
    supplier_number: string;
    company_name: string;
    tax_id: string | null;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    province: string | null;
    payment_terms: string | null;
    created_at: string;
}

function SuppliersPageDesktop() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const debouncedSearch = useDebounce(searchInput, 300);

    const { paginatedData, currentPage, totalPages, goToPage, nextPage, prevPage, canGoNext, canGoPrev, startIndex, endIndex, totalItems } = usePagination(suppliers, { pageSize: 15 });

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc("list_suppliers", {
                p_search: debouncedSearch || null,
            });

            if (error) throw error;
            setSuppliers(data || []);
        } catch (err) {
            console.error("Error fetching suppliers:", err);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch]);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const handleRowClick = (supplierId: string) => {
        navigate(`/nexo-av/${userId}/suppliers/${supplierId}`);
    };

    const clearFilters = () => {
        setSearchInput("");
    };

    const hasActiveFilters = searchInput;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Proveedores</h1>
                        <p className="text-muted-foreground text-sm">
                            {suppliers.length} proveedores registrados
                        </p>
                    </div>
                    <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nuevo Proveedor
                    </Button>
                </div>

                {/* Search */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, NIF, teléfono..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="pl-11"
                            />
                        </div>
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                                <X className="h-4 w-4" />
                                Limpiar
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : suppliers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">No hay proveedores</h3>
                        <p className="text-muted-foreground text-sm">
                            {hasActiveFilters
                                ? "No se encontraron proveedores con los filtros aplicados"
                                : "Añade tu primer proveedor para empezar"}
                        </p>
                    </div>
                    {!hasActiveFilters && (
                        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Añadir Proveedor
                        </Button>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-auto border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[100px]">Número</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>NIF</TableHead>
                                    <TableHead>Contacto</TableHead>
                                    <TableHead>Ubicación</TableHead>
                                    <TableHead>Condiciones de pago</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.map((supplier) => {
                                    return (
                                        <TableRow
                                            key={supplier.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleRowClick(supplier.id)}
                                        >
                                            <TableCell className="font-mono text-sm text-muted-foreground">
                                                {supplier.supplier_number}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{supplier.company_name}</span>
                                                    {supplier.contact_name && (
                                                        <span className="text-sm text-muted-foreground">{supplier.contact_name}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-sm">{supplier.tax_id || "-"}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    {supplier.phone && (
                                                        <div className="flex items-center gap-1.5 text-sm">
                                                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {supplier.phone}
                                                        </div>
                                                    )}
                                                    {supplier.email && (
                                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                            <Mail className="h-3.5 w-3.5" />
                                                            {supplier.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {(supplier.city || supplier.province) && (
                                                    <div className="flex items-center gap-1.5 text-sm">
                                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {[supplier.city, supplier.province].filter(Boolean).join(", ")}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{supplier.payment_terms || "-"}</span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-4">
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
            )}

            {/* TODO: Create CreateSupplierDialog component */}
            {/* <CreateSupplierDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {
          setIsDialogOpen(false);
          fetchSuppliers();
        }}
      /> */}
        </div>
    );
}

export default function SuppliersPage() {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                <SuppliersPageMobile />
            </Suspense>
        );
    }

    return <SuppliersPageDesktop />;
}
