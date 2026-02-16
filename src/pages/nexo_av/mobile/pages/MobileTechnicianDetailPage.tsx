import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Star,
  Euro,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTypeInfo, getStatusInfo } from "@/constants/technicianConstants";

interface TechnicianDetail {
  id: string;
  company_name: string;
  technician_number: string;
  type: string;
  status: string;
  specialties: string[] | null;
  city: string | null;
  province: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_name: string | null;
  daily_rate: number | null;
  hourly_rate: number | null;
  rating: number | null;
  tax_id: string | null;
  legal_name: string | null;
}

const MobileTechnicianDetailPage = () => {
  const { userId, technicianId } = useParams<{ userId: string; technicianId: string }>();
  const navigate = useNavigate();

  const [technician, setTechnician] = useState<TechnicianDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!technicianId) return;

    const fetchTechnician = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc("list_technicians", {
          p_search: null,
          p_status: null,
          p_type: null,
          p_specialty: null,
        });
        if (error) throw error;
        const found = ((data || []) as unknown as TechnicianDetail[]).find((t) => t.id === technicianId);
        setTechnician(found || null);
      } catch (e) {
        console.error("Error fetching technician:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchTechnician();
  }, [technicianId]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i <= Math.round(rating) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"
          )}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">({rating.toFixed(1)})</span>
    </div>
  );

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">Técnico no encontrado</p>
        <button onClick={() => navigate(`/nexo-av/${userId}/technicians`)} className="text-primary underline">
          Volver a técnicos
        </button>
      </div>
    );
  }

  const typeInfo = getTypeInfo(technician.type);
  const statusInfo = getStatusInfo(technician.status);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/nexo-av/${userId}/technicians`)}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
              "text-white/90 hover:text-white hover:bg-white/15",
              "active:scale-95 transition-all duration-200",
              "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]"
            )}
            style={{ touchAction: "manipulation" }}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Atrás</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium text-foreground truncate leading-tight">
              {technician.company_name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono text-muted-foreground">{technician.technician_number}</span>
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", typeInfo.bgColor, typeInfo.color)}>
                {typeInfo.label}
              </Badge>
              <span className={cn("h-2 w-2 rounded-full", statusInfo.dotColor)} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-[80px] space-y-4">
        {/* Contact Actions */}
        <div className="grid grid-cols-2 gap-2">
          {technician.contact_phone && (
            <a
              href={`tel:${technician.contact_phone}`}
              className={cn(
                "flex items-center justify-center gap-2 p-3 rounded-xl",
                "bg-green-500/10 border border-green-500/20 text-green-500",
                "active:scale-95 transition-all"
              )}
              style={{ touchAction: "manipulation" }}
            >
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">Llamar</span>
            </a>
          )}
          {technician.contact_email && (
            <a
              href={`mailto:${technician.contact_email}`}
              className={cn(
                "flex items-center justify-center gap-2 p-3 rounded-xl",
                "bg-blue-500/10 border border-blue-500/20 text-blue-500",
                "active:scale-95 transition-all"
              )}
              style={{ touchAction: "manipulation" }}
            >
              <Mail className="h-4 w-4" />
              <span className="text-sm font-medium">Email</span>
            </a>
          )}
        </div>

        {/* Rating */}
        {technician.rating && technician.rating > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Valoración</p>
            {renderStars(technician.rating)}
          </div>
        )}

        {/* Info */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          {technician.contact_name && (
            <div>
              <p className="text-xs text-muted-foreground">Persona de contacto</p>
              <p className="text-sm text-foreground">{technician.contact_name}</p>
            </div>
          )}
          {technician.legal_name && technician.legal_name !== technician.company_name && (
            <div>
              <p className="text-xs text-muted-foreground">Razón social</p>
              <p className="text-sm text-foreground">{technician.legal_name}</p>
            </div>
          )}
          {technician.tax_id && (
            <div>
              <p className="text-xs text-muted-foreground">CIF/NIF</p>
              <p className="text-sm text-foreground">{technician.tax_id}</p>
            </div>
          )}
          {(technician.city || technician.province) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Ubicación</p>
                <p className="text-sm text-foreground">
                  {[technician.city, technician.province].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Specialties */}
        {technician.specialties && technician.specialties.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Especialidades</p>
            <div className="flex flex-wrap gap-1.5">
              {technician.specialties.map((spec) => (
                <Badge key={spec} variant="outline" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Rates */}
        {(technician.daily_rate || technician.hourly_rate) && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Tarifas</p>
            <div className="grid grid-cols-2 gap-3">
              {technician.daily_rate && (
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(technician.daily_rate)}</p>
                    <p className="text-[10px] text-muted-foreground">/ día</p>
                  </div>
                </div>
              )}
              {technician.hourly_rate && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(technician.hourly_rate)}</p>
                    <p className="text-[10px] text-muted-foreground">/ hora</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileTechnicianDetailPage;
