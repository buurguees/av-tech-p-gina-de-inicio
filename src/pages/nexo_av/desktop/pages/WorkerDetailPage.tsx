import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNexoAvTheme } from "../hooks/useNexoAvTheme";
import { toast } from "sonner";
// Worker detail page for managing worker profiles and assignments
import {
  Loader2,
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  CreditCard,
  MapPin,
  UserCheck,
  Save,
  Shield,
  Percent,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

const departmentOptions = [
  { value: "COMMERCIAL", label: "Comercial" },
  { value: "TECHNICAL", label: "Técnico" },
  { value: "ADMIN", label: "Administración" },
  { value: "DIRECTION", label: "Dirección" },
];

const workerTypeOptions = [
  { value: "NONE", label: "Sin asignar" },
  { value: "PARTNER", label: "Socio" },
  { value: "EMPLOYEE", label: "Empleado" },
];

export default function WorkerDetailPage() {
  const { userId, workerId } = useParams<{ userId: string; workerId: string }>();
  const navigate = useNavigate();
  useNexoAvTheme();

  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Admin fields (only admin can change)
  const [adminData, setAdminData] = useState({
    worker_type: "NONE",
    department: "COMMERCIAL",
  });

  // User profile fields (user fills in, admin can view/edit)
  const [profileData, setProfileData] = useState({
    job_position: "",
    phone: "",
    tax_id: "",
    iban: "",
    irpf_rate: "15",
    address: "",
    city: "",
    postal_code: "",
    province: "",
  });

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
        setAdminData({
          worker_type: w.worker_type || "NONE",
          department: w.department || "COMMERCIAL",
        });
        setProfileData({
          job_position: w.job_position || "",
          phone: w.phone || "",
          tax_id: w.tax_id || "",
          iban: w.iban || "",
          irpf_rate: w.irpf_rate?.toString() || "15",
          address: w.address || "",
          city: w.city || "",
          postal_code: w.postal_code || "",
          province: w.province || "",
        });
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

  const handleSave = async () => {
    if (!workerId) return;
    setSaving(true);
    try {
      // Update worker data
      const { error: updateError } = await (supabase.rpc as any)("update_worker", {
        p_user_id: workerId,
        p_department: adminData.department || null,
        p_job_position: profileData.job_position || null,
        p_phone: profileData.phone || null,
        p_tax_id: profileData.tax_id || null,
        p_iban: profileData.iban || null,
        p_irpf_rate: profileData.irpf_rate ? parseFloat(profileData.irpf_rate) : null,
        p_address: profileData.address || null,
        p_city: profileData.city || null,
        p_postal_code: profileData.postal_code || null,
        p_province: profileData.province || null,
      });

      if (updateError) throw updateError;

      // If worker type changed, assign it
      if (adminData.worker_type !== worker?.worker_type && adminData.worker_type !== "NONE") {
        if (adminData.worker_type) {
          const { error: assignError } = await (supabase.rpc as any)("assign_worker_type", {
            p_user_id: workerId,
            p_worker_type: adminData.worker_type,
            p_tax_id: profileData.tax_id || null,
            p_iban: profileData.iban || null,
          });

          if (assignError) throw assignError;
        }
      }

      toast.success("Datos del trabajador actualizados correctamente");
      fetchWorker();
    } catch (error: any) {
      console.error("Error saving worker:", error);
      toast.error(error.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

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
    <div className="w-full h-full flex flex-col p-6 gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
            <span className="text-xl font-semibold text-primary">{initials}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{worker.full_name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{worker.email}</span>
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-2 flex-wrap">
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
            <CardDescription>
              Solo el administrador puede modificar esta sección
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="font-medium">Tipo de Trabajador</Label>
              <Select
                value={adminData.worker_type}
                onValueChange={(value) => setAdminData({ ...adminData, worker_type: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {workerTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {adminData.worker_type === "PARTNER" 
                  ? "Se creará una ficha de socio con cuenta contable para retribuciones"
                  : adminData.worker_type === "EMPLOYEE"
                  ? "Se creará una ficha de empleado para nóminas"
                  : "El usuario no tiene asignación laboral"}
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="font-medium">Departamento</Label>
              <Select
                value={adminData.department}
                onValueChange={(value) => setAdminData({ ...adminData, department: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar departamento..." />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {adminData.worker_type === "PARTNER" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="irpf_rate" className="font-medium flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Retención IRPF
                  </Label>
                  <div className="relative">
                    <Input
                      id="irpf_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={profileData.irpf_rate}
                      onChange={(e) => setProfileData({ ...profileData, irpf_rate: e.target.value })}
                      className="h-11 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Porcentaje de retención para el modelo 111
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* USER PROFILE SECTION - Right columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos de Contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="w-5 h-5" />
                Datos Profesionales
              </CardTitle>
              <CardDescription>
                Información del puesto y contacto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job_position">Puesto de Trabajo</Label>
                  <Input
                    id="job_position"
                    value={profileData.job_position}
                    onChange={(e) => setProfileData({ ...profileData, job_position: e.target.value })}
                    placeholder="Ej: Director Comercial"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    El título del puesto lo define el usuario
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="h-11 pl-10"
                      placeholder="+34 600 000 000"
                    />
                  </div>
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
              <CardDescription>
                Información fiscal y bancaria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_id">NIF/DNI</Label>
                  <Input
                    id="tax_id"
                    value={profileData.tax_id}
                    onChange={(e) => setProfileData({ ...profileData, tax_id: e.target.value })}
                    placeholder="12345678A"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={profileData.iban}
                    onChange={(e) => setProfileData({ ...profileData, iban: e.target.value })}
                    placeholder="ES00 0000 0000 0000 0000 0000"
                    className="h-11"
                  />
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
              <CardDescription>
                Domicilio fiscal del trabajador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    placeholder="Calle, número, piso..."
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postal_code">C.P.</Label>
                  <Input
                    id="postal_code"
                    value={profileData.postal_code}
                    onChange={(e) => setProfileData({ ...profileData, postal_code: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province">Provincia</Label>
                  <Input
                    id="province"
                    value={profileData.province}
                    onChange={(e) => setProfileData({ ...profileData, province: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
