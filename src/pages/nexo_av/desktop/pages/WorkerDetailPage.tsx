import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNexoAvTheme } from "../hooks/useNexoAvTheme";
import { toast } from "sonner";
// Worker detail page for managing worker profiles and assignments
import {
  Loader2,
  Mail,
  Phone,
  Briefcase,
  CreditCard,
  MapPin,
  UserCheck,
  Shield,
  Calendar,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import EditWorkerDialog from "../components/rrhh/EditWorkerDialog";

interface WorkerDetail {
  id: string;
  email: string;
  full_name: string;
  department: string;
  job_position: string | null;
  phone: string | null;
  is_active: boolean;
  worker_type: string | null;
  tax_id: string | null;
  iban: string | null;
  irpf_rate: number | null;
  ss_regime: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  linked_partner_id: string | null;
  linked_partner_number: string | null;
  linked_partner_account_code: string | null;
  linked_employee_id: string | null;
  linked_employee_number: string | null;
  created_at: string;
  last_login_at: string | null;
  roles: string[];
}

export default function WorkerDetailPage() {
  const { userId, workerId } = useParams<{ userId: string; workerId: string }>();
  const navigate = useNavigate();
  useNexoAvTheme();

  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const fetchWorker = async () => {
    if (!workerId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("get_worker_detail", {
        p_user_id: workerId,
      });
      if (error) throw error;
      const w = data?.[0];
      if (w) {
        setWorker(w);
      }
    } catch (error) {
      console.error("Error fetching worker:", error);
      toast.error("No se pudo cargar el trabajador");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorker();
  }, [workerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Trabajador no encontrado</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    );
  }

  const initials = worker.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nunca";
    return format(new Date(dateStr), "d MMM yyyy, HH:mm", { locale: es });
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Navigation Bar */}
      <DetailNavigationBar
        pageTitle={worker?.full_name || "Trabajador"}
        contextInfo={worker?.email}
        backPath={`/nexo-av/${userId}/workers`}
        tools={
          <DetailActionButton
            actionType="edit"
            onClick={() => setShowEditDialog(true)}
          />
        }
      />

      <div className="flex-1 overflow-y-auto p-6">

        {/* Status Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {worker.linked_partner_number && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              <UserCheck className="w-3 h-3 mr-1" />
              Socio: {worker.linked_partner_number}
              {worker.linked_partner_account_code && ` · Cuenta ${worker.linked_partner_account_code}`}
            </Badge>
          )}
          {worker.linked_employee_number && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              <Briefcase className="w-3 h-3 mr-1" />
              Empleado: {worker.linked_employee_number}
            </Badge>
          )}
          {worker.roles?.map((role) => (
            <Badge key={role} variant="secondary" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              {role}
            </Badge>
          ))}
          {!worker.is_active && (
            <Badge variant="destructive">Inactivo</Badge>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Alta: {formatDate(worker.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Último acceso: {formatDate(worker.last_login_at)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ADMIN SECTION - Left column */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-primary" />
                Configuración Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tipo de Trabajador</p>
                <p className="font-medium">
                  {worker.worker_type === "PARTNER" ? "Socio" : worker.worker_type === "EMPLOYEE" ? "Empleado" : "Sin asignar"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Departamento</p>
                <p className="font-medium">
                  {worker.department === "COMMERCIAL" ? "Comercial" : 
                   worker.department === "TECHNICAL" ? "Técnico" :
                   worker.department === "ADMIN" ? "Administración" :
                   worker.department === "DIRECTION" ? "Dirección" : worker.department}
                </p>
              </div>
              {(worker.worker_type === "PARTNER" || worker.worker_type === "EMPLOYEE") && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Cotización / Seguridad Social</p>
                    <p className="font-medium">
                      {worker.ss_regime === "RETA" ? "Autónomo (RETA propio)" : "Régimen General (SSG)"}
                    </p>
                  </div>
                  {worker.worker_type === "PARTNER" && worker.irpf_rate && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Retención IRPF</p>
                        <p className="font-medium">{worker.irpf_rate}%</p>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* USER PROFILE SECTION - Right columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos Profesionales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Briefcase className="w-5 h-5" />
                  Datos Profesionales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Puesto de Trabajo</p>
                    <p className="font-medium">{worker.job_position || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Teléfono</p>
                    <p className="font-medium">{worker.phone || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Datos Fiscales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="w-5 h-5" />
                  Datos Fiscales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">NIF/DNI</p>
                    <p className="font-medium">{worker.tax_id || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">IBAN</p>
                    <p className="font-medium">{worker.iban || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dirección */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5" />
                  Dirección
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Dirección</p>
                    <p className="font-medium">{worker.address || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ciudad</p>
                    <p className="font-medium">{worker.city || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">C.P.</p>
                    <p className="font-medium">{worker.postal_code || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Provincia</p>
                    <p className="font-medium">{worker.province || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {workerId && (
        <EditWorkerDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          workerId={workerId}
          onSuccess={() => {
            fetchWorker();
          }}
        />
      )}
    </div>
  );
}
