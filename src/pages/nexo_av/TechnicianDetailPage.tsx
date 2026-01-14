import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building2,
  User,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Star,
  Euro,
  CreditCard,
  FileText,
  Edit,
  Loader2,
  Calendar,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTypeInfo, getStatusInfo, TECHNICIAN_SPECIALTIES } from "@/constants/technicianConstants";
import EditTechnicianDialog from "./components/EditTechnicianDialog";

const TechnicianDetailPageMobile = lazy(() => import("./mobile/TechnicianDetailPageMobile"));

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

function TechnicianDetailPageDesktop() {
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
      toast.error("Error al cargar los datos del técnico");
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
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Building2 className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">Técnico no encontrado</p>
        <Button onClick={() => navigate(`/nexo-av/${userId}/technicians`)}>
          Volver al listado
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
    if (!rating) return <span className="text-muted-foreground">Sin valoración</span>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-5 w-5",
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
            )}
          />
        ))}
        <span className="ml-2 font-medium">{rating}/5</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/nexo-av/${userId}/technicians`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <TypeIcon className={cn("h-5 w-5", typeInfo.color)} />
              <h1 className="text-2xl font-bold">{technician.company_name}</h1>
              <Badge className={cn(statusInfo.bgColor, statusInfo.color)}>
                <span className={cn("h-1.5 w-1.5 rounded-full mr-1", statusInfo.dotColor)} />
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {technician.technician_number} · {typeInfo.label}
            </p>
          </div>
        </div>
        <Button onClick={() => setIsEditOpen(true)} className="gap-2">
          <Edit className="h-4 w-4" />
          Editar
        </Button>
      </div>

      {/* Content */}
      <Tabs defaultValue="info" className="flex-1">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="billing">Facturación</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Datos de contacto */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Datos de contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {technician.contact_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Persona de contacto</p>
                    <p className="font-medium">{technician.contact_name}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{technician.contact_phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono secundario</p>
                    <p className="font-medium">{technician.contact_phone_secondary || "-"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{technician.contact_email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email facturación</p>
                    <p className="font-medium">{technician.billing_email || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dirección */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p className="font-medium">{technician.address || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Ciudad</p>
                    <p className="font-medium">{technician.city || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Provincia</p>
                    <p className="font-medium">{technician.province || "-"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Código postal</p>
                    <p className="font-medium">{technician.postal_code || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">País</p>
                    <p className="font-medium">{technician.country || "España"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Especialidades */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Especialidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                {technician.specialties.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {technician.specialties.map((spec) => (
                      <Badge key={spec} variant="secondary">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Sin especialidades definidas</p>
                )}
              </CardContent>
            </Card>

            {/* Valoración y tarifas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Valoración y tarifas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Valoración</p>
                  <RatingStars rating={technician.rating} />
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tarifa por hora</p>
                    <p className="text-xl font-bold">{formatCurrency(technician.hourly_rate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tarifa por día</p>
                    <p className="text-xl font-bold">{formatCurrency(technician.daily_rate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Datos de facturación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Razón social</p>
                  <p className="font-medium">{technician.legal_name || technician.company_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NIF / CIF</p>
                  <p className="font-medium font-mono">{technician.tax_id || "-"}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">IBAN</p>
                <p className="font-medium font-mono">{technician.iban || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Condiciones de pago</p>
                <p className="font-medium">{technician.payment_terms || "-"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notas internas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {technician.notes ? (
                <p className="whitespace-pre-wrap">{technician.notes}</p>
              ) : (
                <p className="text-muted-foreground">Sin notas</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Información del registro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creado</span>
                <span>
                  {new Date(technician.created_at).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "long",
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
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

export default function TechnicianDetailPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <TechnicianDetailPageMobile />
      </Suspense>
    );
  }

  return <TechnicianDetailPageDesktop />;
}
