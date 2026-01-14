import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Star,
  Edit,
  Loader2,
  Wrench,
  FileText,
  CreditCard,
  Euro,
  Clock,
  Banknote,
  PhoneCall,
  Send,
  Plus,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTypeInfo, getStatusInfo } from "@/constants/technicianConstants";
import EditTechnicianDialog from "../components/EditTechnicianDialog";

interface TechnicianDetail {
  id: string;
  technician_number: string;
  type: string;
  company_name: string;
  legal_name: string | null;
  tax_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_phone_secondary: string | null;
  contact_email: string | null;
  billing_email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  specialties: string[];
  hourly_rate: number | null;
  daily_rate: number | null;
  iban: string | null;
  payment_terms: string | null;
  status: string;
  rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  created_by_name: string | null;
}

export default function TechnicianDetailPageMobile() {
  const { userId, technicianId } = useParams<{ userId: string; technicianId: string }>();
  const navigate = useNavigate();
  const [technician, setTechnician] = useState<TechnicianDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchTechnician = useCallback(async () => {
    if (!technicianId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_technician", {
        p_technician_id: technicianId,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setTechnician(data[0]);
      }
    } catch (err) {
      console.error("Error fetching technician:", err);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  }, [technicianId]);

  useEffect(() => {
    fetchTechnician();
  }, [fetchTechnician]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
        <Building2 className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">Técnico no encontrado</p>
        <Button onClick={() => navigate(`/nexo-av/${userId}/technicians`)}>
          Volver
        </Button>
      </div>
    );
  }

  const typeInfo = getTypeInfo(technician.type);
  const statusInfo = getStatusInfo(technician.status);
  const TypeIcon = typeInfo.icon;

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return value.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  };

  const RatingStars = ({ rating }: { rating: number | null }) => {
    if (!rating) {
      return <span className="text-sm text-muted-foreground">Sin valoración</span>;
    }
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-4 w-4",
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30",
            )}
          />
        ))}
        <span className="ml-1 text-sm text-muted-foreground">{rating.toFixed(1)}/5</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full pb-20">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate(`/nexo-av/${userId}/technicians`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <TypeIcon className={cn("h-4 w-4 shrink-0", typeInfo.color)} />
              <h1 className="font-semibold text-base truncate">{technician.company_name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{technician.technician_number}</span>
              <Badge
                className={cn(
                  "text-xs px-2 py-0.5",
                  statusInfo.bgColor,
                  statusInfo.color,
                )}
              >
                {statusInfo.label}
              </Badge>
            </div>
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9"
            onClick={() => setIsEditOpen(true)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-2 mt-3">
          {technician.contact_phone && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              asChild
            >
              <a href={`tel:${technician.contact_phone}`}>
                <PhoneCall className="h-4 w-4" />
                Llamar
              </a>
            </Button>
          )}
          {technician.contact_email && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              asChild
            >
              <a href={`mailto:${technician.contact_email}`}>
                <Send className="h-4 w-4" />
                Email
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
          >
            <Plus className="h-4 w-4" />
            Tarea
          </Button>
        </div>
      </div>

      {/* Content scrollable */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Valoración y tarifas destacadas */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Valoración media</p>
                  <RatingStars rating={technician.rating} />
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Tarifa por día</p>
                  <p className="text-xl font-bold">{formatCurrency(technician.daily_rate)}</p>
                </div>
              </div>
              {technician.hourly_rate && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Tarifa por hora</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(technician.hourly_rate)}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {technician.contact_name && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Persona de contacto</p>
                <p className="font-medium">{technician.contact_name}</p>
              </div>
            )}
            {technician.contact_phone && (
              <a
                href={`tel:${technician.contact_phone}`}
                className="flex items-center gap-2 text-primary active:opacity-70"
              >
                <Phone className="h-4 w-4" />
                {technician.contact_phone}
              </a>
            )}
            {technician.contact_phone_secondary && (
              <a
                href={`tel:${technician.contact_phone_secondary}`}
                className="flex items-center gap-2 text-primary active:opacity-70"
              >
                <Phone className="h-4 w-4" />
                {technician.contact_phone_secondary}
              </a>
            )}
            {technician.contact_email && (
              <a
                href={`mailto:${technician.contact_email}`}
                className="flex items-center gap-2 text-primary active:opacity-70 break-all"
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span className="text-sm">{technician.contact_email}</span>
              </a>
            )}
          </CardContent>
        </Card>

        {/* Dirección */}
        {(technician.address || technician.city) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Dirección
              </CardTitle>
            </CardHeader>
            <CardContent>
              {technician.address && <p className="font-medium mb-1">{technician.address}</p>}
              <p className="text-sm text-muted-foreground">
                {[technician.postal_code, technician.city, technician.province]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {technician.country && (
                <p className="text-sm text-muted-foreground mt-1">{technician.country}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Especialidades */}
        {technician.specialties.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Especialidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {technician.specialties.map((spec) => (
                  <Badge key={spec} variant="secondary" className="text-xs">
                    {spec}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Datos de facturación */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Facturación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {technician.tax_id && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">NIF/CIF</p>
                  <p className="font-mono text-sm">{technician.tax_id}</p>
                </div>
              )}
              {technician.legal_name && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Razón social</p>
                  <p className="text-sm font-medium">{technician.legal_name}</p>
                </div>
              )}
            </div>
            {technician.iban && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">IBAN</p>
                <p className="font-mono text-sm break-all">{technician.iban}</p>
              </div>
            )}
            {technician.payment_terms && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Condiciones de pago</p>
                <p className="text-sm font-medium">{technician.payment_terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notas */}
        {technician.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{technician.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Información del registro */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Información del registro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creado</span>
              <span>
                {new Date(technician.created_at).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            {technician.created_by_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creado por</span>
                <span>{technician.created_by_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Última actualización</span>
              <span>
                {new Date(technician.updated_at).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <EditTechnicianDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        technician={technician}
        onSuccess={() => {
          setIsEditOpen(false);
          fetchTechnician();
        }}
      />
    </div>
  );
}