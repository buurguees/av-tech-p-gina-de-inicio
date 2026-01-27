import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNexoAvTheme } from "../hooks/useNexoAvTheme";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  CreditCard,
  MapPin,
  UserCheck,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  { value: "PARTNER", label: "Socio" },
  { value: "EMPLOYEE", label: "Empleado" },
];

export default function WorkerDetailPage() {
  const { userId, workerId } = useParams<{ userId: string; workerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  useNexoAvTheme();

  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    department: "",
    job_position: "",
    phone: "",
    tax_id: "",
    iban: "",
    address: "",
    city: "",
    postal_code: "",
    province: "",
    worker_type: "",
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
        setFormData({
          department: w.department || "",
          job_position: w.job_position || "",
          phone: w.phone || "",
          tax_id: w.tax_id || "",
          iban: w.iban || "",
          address: w.address || "",
          city: w.city || "",
          postal_code: w.postal_code || "",
          province: w.province || "",
          worker_type: w.worker_type || "",
        });
      }
    } catch (error) {
      console.error("Error fetching worker:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el trabajador",
        variant: "destructive",
      });
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
        p_department: formData.department || null,
        p_job_position: formData.job_position || null,
        p_phone: formData.phone || null,
        p_tax_id: formData.tax_id || null,
        p_iban: formData.iban || null,
        p_address: formData.address || null,
        p_city: formData.city || null,
        p_postal_code: formData.postal_code || null,
        p_province: formData.province || null,
      });

      if (updateError) throw updateError;

      // If worker type changed, assign it
      if (formData.worker_type && formData.worker_type !== worker?.worker_type) {
        const { error: assignError } = await (supabase.rpc as any)("assign_worker_type", {
          p_user_id: workerId,
          p_worker_type: formData.worker_type,
          p_tax_id: formData.tax_id || null,
          p_iban: formData.iban || null,
        });

        if (assignError) throw assignError;
      }

      toast({
        title: "Guardado",
        description: "Los datos del trabajador se han actualizado correctamente",
      });

      fetchWorker();
    } catch (error: any) {
      console.error("Error saving worker:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar",
        variant: "destructive",
      });
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

  return (
    <div className="w-full h-full flex flex-col p-6 gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
            <span className="text-lg font-semibold text-primary">{initials}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{worker.full_name}</h1>
            <p className="text-muted-foreground">{worker.email}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
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
            {worker.linked_partner_account_code && ` (Cuenta ${worker.linked_partner_account_code})`}
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
            {role}
          </Badge>
        ))}
        {!worker.is_active && (
          <Badge variant="destructive">Inactivo</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos Laborales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="w-5 h-5" />
              Datos Laborales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Trabajador</Label>
              <Select
                value={formData.worker_type}
                onValueChange={(value) => setFormData({ ...formData, worker_type: value })}
              >
                <SelectTrigger>
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
                Al asignar como Socio o Empleado se creará automáticamente su ficha vinculada
              </p>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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

            <div className="space-y-2">
              <Label htmlFor="job_position">Puesto de Trabajo</Label>
              <Input
                id="job_position"
                value={formData.job_position}
                onChange={(e) => setFormData({ ...formData, job_position: e.target.value })}
                placeholder="Ej: Director Comercial"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10"
                  placeholder="+34 600 000 000"
                />
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
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax_id">NIF/DNI</Label>
              <Input
                id="tax_id"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                placeholder="12345678A"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                placeholder="ES00 0000 0000 0000 0000 0000"
              />
            </div>
          </CardContent>
        </Card>

        {/* Dirección */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5" />
              Dirección
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Calle, número, piso..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code">C.P.</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
