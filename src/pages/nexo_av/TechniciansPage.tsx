import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Search, Star, Phone, Mail, MapPin, Building2, User, UserCheck, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TECHNICIAN_TYPES, TECHNICIAN_STATUSES, TECHNICIAN_SPECIALTIES, getTypeInfo, getStatusInfo } from "@/constants/technicianConstants";
import { useIsMobile } from "@/hooks/use-mobile";
import PaginationControls from "./components/PaginationControls";
import CreateTechnicianDialog from "./components/CreateTechnicianDialog";

const TechniciansPageMobile = lazy(() => import("./mobile/TechniciansPageMobile"));

interface Technician {
  id: string;
  technician_number: string;
  type: string;
  company_name: string;
  legal_name: string | null;
  tax_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  city: string | null;
  province: string | null;
  specialties: string[];
  hourly_rate: number | null;
  daily_rate: number | null;
  status: string;
  rating: number | null;
  created_at: string;
}

function TechniciansPageDesktop() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);

  const { paginatedData, currentPage, totalPages, goToPage, pageSize } = usePagination(technicians, { pageSize: 15 });

  const fetchTechnicians = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_technicians", {
        p_search: debouncedSearch || null,
        p_type: typeFilter || null,
        p_status: statusFilter || null,
        p_specialty: specialtyFilter || null,
      });

      if (error) throw error;
      setTechnicians(data || []);
    } catch (err) {
      console.error("Error fetching technicians:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter, statusFilter, specialtyFilter]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  const handleRowClick = (technicianId: string) => {
    navigate(`/nexo-av/${userId}/technicians/${technicianId}`);
  };

  const clearFilters = () => {
    setTypeFilter("");
    setStatusFilter("");
    setSpecialtyFilter("");
    setSearchInput("");
  };

  const hasActiveFilters = typeFilter || statusFilter || specialtyFilter || searchInput;

  const TypeIcon = ({ type }: { type: string }) => {
    const typeInfo = getTypeInfo(type);
    const IconComponent = typeInfo.icon;
    return <IconComponent className={cn("h-4 w-4", typeInfo.color)} />;
  };

  const RatingStars = ({ rating }: { rating: number | null }) => {
    if (!rating) return <span className="text-muted-foreground text-sm">-</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-3.5 w-3.5",
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Técnicos</h1>
            <p className="text-muted-foreground text-sm">
              {technicians.length} técnicos registrados
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Técnico
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, NIF, teléfono..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {[typeFilter, statusFilter, specialtyFilter].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los tipos</SelectItem>
                  {TECHNICIAN_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  {TECHNICIAN_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Especialidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las especialidades</SelectItem>
                  {TECHNICIAN_SPECIALTIES.map((specialty) => (
                    <SelectItem key={specialty.value} value={specialty.value}>
                      {specialty.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : technicians.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">No hay técnicos</h3>
            <p className="text-muted-foreground text-sm">
              {hasActiveFilters
                ? "No se encontraron técnicos con los filtros aplicados"
                : "Añade tu primer técnico para empezar"}
            </p>
          </div>
          {!hasActiveFilters && (
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Añadir Técnico
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
                  <TableHead className="w-[100px]">Tipo</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Especialidades</TableHead>
                  <TableHead className="w-[100px]">Tarifa/día</TableHead>
                  <TableHead className="w-[100px]">Valoración</TableHead>
                  <TableHead className="w-[100px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((tech) => {
                  const statusInfo = getStatusInfo(tech.status);
                  const typeInfo = getTypeInfo(tech.type);
                  return (
                    <TableRow
                      key={tech.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(tech.id)}
                    >
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {tech.technician_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{tech.company_name}</span>
                          {tech.contact_name && (
                            <span className="text-sm text-muted-foreground">{tech.contact_name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon type={tech.type} />
                          <span className="text-sm">{typeInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {tech.contact_phone && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {tech.contact_phone}
                            </div>
                          )}
                          {tech.contact_email && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              {tech.contact_email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(tech.city || tech.province) && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {[tech.city, tech.province].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tech.specialties.slice(0, 2).map((spec) => (
                            <Badge key={spec} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                          {tech.specialties.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{tech.specialties.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {tech.daily_rate ? (
                          <span className="font-medium">
                            {tech.daily_rate.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <RatingStars rating={tech.rating} />
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1", statusInfo.bgColor, statusInfo.color, "hover:opacity-80")}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", statusInfo.dotColor)} />
                          {statusInfo.label}
                        </Badge>
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
                onPageChange={goToPage}
                totalItems={technicians.length}
                itemsPerPage={pageSize}
              />
            </div>
          )}
        </div>
      )}

      <CreateTechnicianDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {
          setIsDialogOpen(false);
          fetchTechnicians();
        }}
      />
    </div>
  );
}

export default function TechniciansPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <TechniciansPageMobile />
      </Suspense>
    );
  }

  return <TechniciansPageDesktop />;
}
