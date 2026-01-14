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
import { Loader2, Plus, Search, Star, Phone, Mail, MapPin, Filter, Building2, User, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { TECHNICIAN_TYPES, TECHNICIAN_STATUSES, TECHNICIAN_SPECIALTIES, getTypeInfo, getStatusInfo } from "@/constants/technicianConstants";
import CreateTechnicianDialog from "../components/CreateTechnicianDialog";

interface Technician {
  id: string;
  technician_number: string;
  type: string;
  company_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  city: string | null;
  specialties: string[];
  daily_rate: number | null;
  status: string;
  rating: number | null;
}

export default function TechniciansPageMobile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);

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

  const handleCardClick = (technicianId: string) => {
    navigate(`/nexo-av/${userId}/technicians/${technicianId}`);
  };

  const clearFilters = () => {
    setTypeFilter("");
    setStatusFilter("");
    setSpecialtyFilter("");
  };

  const hasActiveFilters = typeFilter || statusFilter || specialtyFilter;
  const activeFilterCount = [typeFilter, statusFilter, specialtyFilter].filter(Boolean).length;

  const TypeIcon = ({ type }: { type: string }) => {
    const typeInfo = getTypeInfo(type);
    const IconComponent = typeInfo.icon;
    return <IconComponent className={cn("h-4 w-4", typeInfo.color)} />;
  };

  return (
    <div className="flex flex-col h-full pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Técnicos</h1>
            <p className="text-sm text-muted-foreground">{technicians.length} registrados</p>
          </div>
          <Button size="icon" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
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
                  <label className="text-sm font-medium">Tipo</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {TECHNICIAN_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {TECHNICIAN_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Especialidad</label>
                  <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las especialidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      {TECHNICIAN_SPECIALTIES.map((specialty) => (
                        <SelectItem key={specialty.value} value={specialty.value}>
                          {specialty.label}
                        </SelectItem>
                      ))}
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
        ) : technicians.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No se encontraron técnicos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {technicians.map((tech) => {
              const statusInfo = getStatusInfo(tech.status);
              const typeInfo = getTypeInfo(tech.type);
              return (
                <Card
                  key={tech.id}
                  className="cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => handleCardClick(tech.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TypeIcon type={tech.type} />
                          <span className="text-xs text-muted-foreground">{tech.technician_number}</span>
                        </div>
                        <h3 className="font-semibold truncate">{tech.company_name}</h3>
                        {tech.contact_name && (
                          <p className="text-sm text-muted-foreground truncate">{tech.contact_name}</p>
                        )}
                      </div>
                      <Badge className={cn("shrink-0", statusInfo.bgColor, statusInfo.color)}>
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      {tech.contact_phone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {tech.contact_phone}
                        </div>
                      )}
                      {tech.city && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {tech.city}
                        </div>
                      )}
                    </div>

                    {tech.specialties.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {tech.specialties.slice(0, 3).map((spec) => (
                          <Badge key={spec} variant="secondary" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                        {tech.specialties.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{tech.specialties.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      {tech.daily_rate ? (
                        <span className="text-sm font-medium">
                          {tech.daily_rate.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}/día
                        </span>
                      ) : (
                        <span />
                      )}
                      {tech.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{tech.rating}</span>
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
