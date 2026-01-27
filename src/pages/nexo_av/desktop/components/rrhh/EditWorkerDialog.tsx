import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield, Percent } from "lucide-react";

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
  linked_employee_id: string | null;
  linked_employee_number: string | null;
}

const ssRegimeOptions = [
  { value: "RETA", label: "Autónomo (RETA propio)", description: "SS empresa = 0€" },
  { value: "SSG", label: "Régimen General (SSG)", description: "SS trabajador + SS empresa" },
];

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

interface EditWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  onSuccess: () => void;
}

export default function EditWorkerDialog({
  open,
  onOpenChange,
  workerId,
  onSuccess,
}: EditWorkerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [worker, setWorker] = useState<WorkerDetail | null>(null);

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
    ss_regime: "RETA",
    address: "",
    city: "",
    postal_code: "",
    province: "",
  });

  const fetchWorker = async () => {
    if (!workerId) return;
    setFetching(true);
    try {
      // Try get_worker_detail first, fallback to list_workers if it fails
      let w: any = null;
      
      try {
        const { data, error } = await (supabase.rpc as any)("get_worker_detail", {
          p_user_id: workerId,
        });
        if (!error && data?.[0]) {
          w = data[0];
        } else {
          throw new Error("get_worker_detail failed");
        }
      } catch (rpcError) {
        // Fallback: use list_workers and find by ID
        console.warn("get_worker_detail failed, using list_workers fallback:", rpcError);
        const { data: workersData, error: listError } = await (supabase.rpc as any)("list_workers");
        if (listError) throw listError;
        
        const foundWorker = (workersData || []).find((worker: any) => worker.id === workerId);
        if (foundWorker) {
          // Get additional details from authorized_users table if needed
          const { data: userData, error: userError } = await supabase
            .from("authorized_users")
            .select("tax_id, iban, irpf_rate, ss_regime, address, city, postal_code, province")
            .eq("id", workerId)
            .single();
          
          w = {
            ...foundWorker,
            tax_id: foundWorker.tax_id || userData?.tax_id || null,
            iban: foundWorker.iban || userData?.iban || null,
            irpf_rate: foundWorker.irpf_rate || userData?.irpf_rate || null,
            ss_regime: foundWorker.ss_regime || userData?.ss_regime || null,
            address: foundWorker.address || userData?.address || null,
            city: foundWorker.city || userData?.city || null,
            postal_code: foundWorker.postal_code || userData?.postal_code || null,
            province: foundWorker.province || userData?.province || null,
            roles: foundWorker.roles || [],
          };
        }
      }
      
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
          ss_regime: w.ss_regime || "RETA",
          address: w.address || "",
          city: w.city || "",
          postal_code: w.postal_code || "",
          province: w.province || "",
        });
      } else {
        toast.error("No se encontraron datos del trabajador");
      }
    } catch (error) {
      console.error("Error fetching worker:", error);
      toast.error("No se pudo cargar el trabajador");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (open && workerId) {
      // Always fetch fresh data when dialog opens
      fetchWorker();
    }
  }, [open, workerId]);

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setWorker(null);
      setAdminData({
        worker_type: "NONE",
        department: "COMMERCIAL",
      });
      setProfileData({
        job_position: "",
        phone: "",
        tax_id: "",
        iban: "",
        irpf_rate: "15",
        ss_regime: "RETA",
        address: "",
        city: "",
        postal_code: "",
        province: "",
      });
      setFetching(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!workerId) return;
    setLoading(true);
    try {
      // Build update parameters, only including non-empty values
      const updateParams: any = {
        p_user_id: workerId,
      };

      // Always include department - it's required and must be a valid enum value
      // Use the current value from adminData or fallback to worker's current department
      const departmentValue = adminData.department || worker?.department || "COMMERCIAL";
      if (departmentValue === "COMMERCIAL" || 
          departmentValue === "TECHNICAL" || 
          departmentValue === "ADMIN" || 
          departmentValue === "DIRECTION") {
        updateParams.p_department = departmentValue;
      }

      // Only include other fields if they have values
      if (profileData.job_position?.trim()) {
        updateParams.p_job_position = profileData.job_position.trim();
      }
      if (profileData.phone?.trim()) {
        updateParams.p_phone = profileData.phone.trim();
      }
      if (profileData.tax_id?.trim()) {
        updateParams.p_tax_id = profileData.tax_id.trim();
      }
      if (profileData.iban?.trim()) {
        updateParams.p_iban = profileData.iban.trim();
      }
      if (profileData.irpf_rate && !isNaN(parseFloat(profileData.irpf_rate))) {
        updateParams.p_irpf_rate = parseFloat(profileData.irpf_rate);
      }
      if (profileData.address?.trim()) {
        updateParams.p_address = profileData.address.trim();
      }
      if (profileData.city?.trim()) {
        updateParams.p_city = profileData.city.trim();
      }
      if (profileData.postal_code?.trim()) {
        updateParams.p_postal_code = profileData.postal_code.trim();
      }
      if (profileData.province?.trim()) {
        updateParams.p_province = profileData.province.trim();
      }
      if (profileData.ss_regime) {
        updateParams.p_ss_regime = profileData.ss_regime;
      }

      // Update worker data
      const { error: updateError } = await (supabase.rpc as any)("update_worker", updateParams);

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
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving worker:", error);
      toast.error(error.message || "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  if (!workerId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Trabajador</DialogTitle>
          <DialogDescription>
            Modifica la información del trabajador {worker?.full_name ? `- ${worker.full_name}` : ""}
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Cargando datos...</span>
          </div>
        ) : !worker ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>No se pudieron cargar los datos del trabajador</p>
            <Button variant="outline" onClick={() => fetchWorker()} className="mt-4">
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ADMIN SECTION */}
            <div className="border border-primary/20 bg-primary/5 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Configuración Admin</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

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
              </div>

              {(adminData.worker_type === "PARTNER" || adminData.worker_type === "EMPLOYEE") && (
                <>
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label className="font-medium">Cotización / Seguridad Social</Label>
                    <Select
                      value={profileData.ss_regime}
                      onValueChange={(value) => setProfileData({ ...profileData, ss_regime: value })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ssRegimeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex flex-col">
                              <span>{opt.label}</span>
                            </div>
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
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* USER PROFILE SECTION */}
            <div className="space-y-4">
              <h3 className="font-medium">Datos Profesionales</h3>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="h-11"
                    placeholder="+34 600 000 000"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-medium">Datos Fiscales</h3>
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
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-medium">Dirección</h3>
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
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
