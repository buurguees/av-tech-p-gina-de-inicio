import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  UserRound,
  Loader2,
  Search,
  ChevronRight,
  Users,
  Star,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { getTypeInfo } from "@/constants/technicianConstants";

interface Technician {
  id: string;
  company_name: string;
  technician_number: string;
  type: string;
  specialties: string[] | null;
  city: string | null;
  province: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  rating: number | null;
  daily_rate: number | null;
  hourly_rate: number | null;
  status: string;
}

const MobileTechniciansPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [stats, setStats] = useState({ total: 0, active: 0 });

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_technicians", {
        p_search: debouncedSearch || null,
        p_status: null,
        p_type: null,
        p_specialty: null,
      });
      if (error) throw error;
      const list = ((data || []) as unknown) as Technician[];
      setTechnicians(list);

      const active = list.filter((t) => t.status === "ACTIVE").length;
      setStats({ total: list.length, active });
    } catch (e) {
      console.error("Error fetching technicians:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, [debouncedSearch]);

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              "h-3 w-3",
              i <= Math.round(rating) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header: KPIs + Search */}
      <div
        className="flex-shrink-0 py-3 px-3 w-full"
        style={{ background: "linear-gradient(0deg, rgba(0,0,0,1) 100%, rgba(255,255,255,0) 0%)", height: "fit-content" }}
      >
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <span className="text-lg text-foreground font-semibold">{stats.total}</span>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg text-green-500">
              <UserRound className="h-4 w-4" />
            </div>
            <div>
              <span className="text-lg text-foreground font-semibold">{stats.active}</span>
              <p className="text-[10px] text-muted-foreground">Activos</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar técnicos..."
              className="pl-9 h-8 bg-card border-border text-sm"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-3 pb-[80px] w-full h-full px-[15px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : technicians.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <UserRound className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay técnicos</p>
            <p className="text-muted-foreground text-sm">
              {searchInput ? "Prueba con otra búsqueda" : "Aún no se han registrado técnicos"}
            </p>
          </div>
        ) : (
          technicians.map((tech) => {
            const typeInfo = getTypeInfo(tech.type);

            return (
              <button
                key={tech.id}
                onClick={() => navigate(`/nexo-av/${userId}/technicians/${tech.id}`)}
                className={cn(
                  "w-full text-left p-4 rounded-xl",
                  "bg-card border border-border",
                  "active:scale-[0.98] transition-all duration-200",
                  "hover:border-primary/30"
                )}
                style={{ touchAction: "manipulation" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono text-muted-foreground">
                        {tech.technician_number}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", typeInfo.bgColor, typeInfo.color)}>
                        {typeInfo.label}
                      </Badge>
                    </div>

                    <h3 className="font-medium text-foreground truncate mb-1">
                      {tech.company_name}
                    </h3>

                    {/* Specialties */}
                    {tech.specialties && tech.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {tech.specialties.slice(0, 3).map((spec) => (
                          <span key={spec} className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                            {spec}
                          </span>
                        ))}
                        {tech.specialties.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{tech.specialties.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-1">
                      {tech.city && (
                        <span className="text-xs text-muted-foreground/70">
                          📍 {tech.city}
                        </span>
                      )}
                      {tech.contact_phone && (
                        <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {tech.contact_phone}
                        </span>
                      )}
                    </div>

                    {tech.rating && tech.rating > 0 && (
                      <div className="mt-1.5">
                        {renderStars(tech.rating)}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-2" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MobileTechniciansPage;
