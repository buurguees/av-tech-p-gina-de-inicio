import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Search, Phone, Mail, MapPin, Filter, Building2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Supplier {
  id: string;
  supplier_number: string;
  company_name: string;
  legal_name: string | null;
  tax_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  city: string | null;
  province: string | null;
  payment_terms: string | null;
  status: string;
  created_at: string;
}

export default function SuppliersPageMobile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_suppliers", {
        p_search: debouncedSearch || null,
        p_status: statusFilter || null,
      });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleCardClick = (supplierId: string) => {
    navigate(`/nexo-av/${userId}/suppliers/${supplierId}`);
  };

  const clearFilters = () => {
    setStatusFilter("");
  };

  const hasActiveFilters = statusFilter;
  const activeFilterCount = statusFilter ? 1 : 0;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Activo', bgColor: 'bg-emerald-500/10', color: 'text-emerald-400' };
      case 'INACTIVE':
        return { label: 'Inactivo', bgColor: 'bg-zinc-500/10', color: 'text-zinc-400' };
      case 'BLOCKED':
        return { label: 'Bloqueado', bgColor: 'bg-red-500/10', color: 'text-red-500' };
      default:
        return { label: status, bgColor: 'bg-zinc-500/10', color: 'text-zinc-400' };
    }
  };

  return (
    <div className="flex flex-col h-full pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Proveedores</h1>
            <p className="text-sm text-muted-foreground">{suppliers.length} registrados</p>
          </div>
          <Button size="icon" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-11"
            />
          </div>
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ACTIVE">Activos</SelectItem>
                      <SelectItem value="INACTIVE">Inactivos</SelectItem>
                      <SelectItem value="BLOCKED">Bloqueados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={clearFilters}>
                    Limpiar
                  </Button>
                  <Button className="flex-1" onClick={() => setIsFilterOpen(false)}>
                    Aplicar
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Truck className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No se encontraron proveedores</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suppliers.map((supplier) => {
              const statusInfo = getStatusInfo(supplier.status);
              return (
                <Card
                  key={supplier.id}
                  className="cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => handleCardClick(supplier.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-blue-400" />
                          <span className="text-xs text-muted-foreground">{supplier.supplier_number}</span>
                        </div>
                        <h3 className="font-semibold truncate">{supplier.company_name}</h3>
                        {supplier.legal_name && supplier.legal_name !== supplier.company_name && (
                          <p className="text-sm text-muted-foreground truncate">{supplier.legal_name}</p>
                        )}
                        {supplier.tax_id && (
                          <p className="text-xs text-muted-foreground font-mono mt-1">{supplier.tax_id}</p>
                        )}
                      </div>
                      <Badge className={cn("shrink-0", statusInfo.bgColor, statusInfo.color)}>
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      {supplier.contact_phone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[150px]">{supplier.contact_phone}</span>
                        </div>
                      )}
                      {supplier.contact_email && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[150px]">{supplier.contact_email}</span>
                        </div>
                      )}
                      {supplier.city && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">{supplier.city}{supplier.province ? `, ${supplier.province}` : ''}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* TODO: CreateSupplierDialog se añadirá en FASE 3 */}
      {/* Por ahora el botón no hace nada, pero la estructura está lista */}
    </div>
  );
}
