import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  User,
  Building2,
  Percent,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import TabNav, { TabItem } from "../components/navigation/TabNav";
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

  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("informacion");

  const fetchWorker = async () => {
    if (!workerId) return;
    setLoading(true);
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
          const { data: userData } = await supabase
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
        <button
          className="px-4 py-2 text-sm border rounded-md"
          onClick={() => navigate(-1)}
        >
          Volver
        </button>
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nunca";
    return format(new Date(dateStr), "d MMM yyyy, HH:mm", { locale: es });
  };

  const getDepartmentLabel = (dept: string) => {
    const labels: Record<string, string> = {
      COMMERCIAL: "Comercial",
      TECHNICAL: "Técnico",
      ADMIN: "Administración",
      DIRECTION: "Dirección",
    };
    return labels[dept] || dept;
  };

  const tabs: TabItem[] = [
    { value: "informacion", label: "Información", icon: User },
    { value: "profesional", label: "Profesional", icon: Briefcase },
    { value: "fiscal", label: "Fiscal", icon: CreditCard },
    { value: "direccion", label: "Dirección", icon: MapPin },
    { value: "documentos", label: "Documentos", icon: FileText },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Navigation Bar */}
      <DetailNavigationBar
        pageTitle={worker.full_name}
        contextInfo={worker.email}
        backPath={`/nexo-av/${userId}/workers`}
        tools={
          <DetailActionButton
            actionType="edit"
            onClick={() => setShowEditDialog(true)}
          />
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Main content with tabs */}
        <div className="flex-1 flex flex-col min-w-0">
          <TabNav
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          
          <div className="flex-1 overflow-auto">
            {activeTab === "informacion" && (
              <div className="w-full h-full px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Sidebar - Info básica */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Información Básica
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email</span>
                          <span className="font-medium">{worker.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estado</span>
                          {worker.is_active ? (
                            <Badge className="bg-green-500/20 text-green-400">Activo</Badge>
                          ) : (
                            <Badge variant="destructive">Inactivo</Badge>
                          )}
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tipo</span>
                          <span className="font-medium">
                            {worker.worker_type === "PARTNER" ? "Socio" : 
                             worker.worker_type === "EMPLOYEE" ? "Empleado" : "Sin asignar"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Departamento</span>
                          <span className="font-medium">{getDepartmentLabel(worker.department)}</span>
                        </div>
                        {worker.linked_partner_number && (
                          <>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Nº Socio</span>
                              <span className="font-medium">{worker.linked_partner_number}</span>
                            </div>
                            {worker.linked_partner_account_code && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cuenta</span>
                                <span className="font-medium">{worker.linked_partner_account_code}</span>
                              </div>
                            )}
                          </>
                        )}
                        {worker.linked_employee_number && (
                          <>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Nº Empleado</span>
                              <span className="font-medium">{worker.linked_employee_number}</span>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Roles y permisos */}
                    {worker.roles && worker.roles.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Roles y Permisos
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {worker.roles.map((role) => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Fechas */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Fechas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fecha de alta</span>
                          <span className="font-medium">{formatDate(worker.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Último acceso</span>
                          <span className="font-medium">{formatDate(worker.last_login_at)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Main content - Configuración Admin */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Shield className="w-5 h-5 text-primary" />
                          Configuración Administrativa
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Tipo de Trabajador</p>
                            <p className="font-medium">
                              {worker.worker_type === "PARTNER" ? "Socio" : 
                               worker.worker_type === "EMPLOYEE" ? "Empleado" : "Sin asignar"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Departamento</p>
                            <p className="font-medium">{getDepartmentLabel(worker.department)}</p>
                          </div>
                        </div>
                        {(worker.worker_type === "PARTNER" || worker.worker_type === "EMPLOYEE") && (
                          <>
                            <Separator />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Cotización / Seguridad Social</p>
                                <p className="font-medium">
                                  {worker.ss_regime === "RETA" ? "Autónomo (RETA propio)" : 
                                   worker.ss_regime === "SSG" ? "Régimen General (SSG)" : 
                                   worker.ss_regime || "-"}
                                </p>
                              </div>
                              {worker.worker_type === "PARTNER" && worker.irpf_rate && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                    <Percent className="w-3 h-3" />
                                    Retención IRPF
                                  </p>
                                  <p className="font-medium">{worker.irpf_rate}%</p>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "profesional" && (
              <div className="w-full h-full px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Briefcase className="w-5 h-5" />
                      Datos Profesionales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Puesto de Trabajo</p>
                        <p className="font-medium text-base">{worker.job_position || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Teléfono
                        </p>
                        <p className="font-medium text-base">{worker.phone || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          Departamento
                        </p>
                        <p className="font-medium text-base">{getDepartmentLabel(worker.department)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Tipo de Trabajador
                        </p>
                        <p className="font-medium text-base">
                          {worker.worker_type === "PARTNER" ? "Socio" : 
                           worker.worker_type === "EMPLOYEE" ? "Empleado" : "Sin asignar"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "fiscal" && (
              <div className="w-full h-full px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CreditCard className="w-5 h-5" />
                      Datos Fiscales y Bancarios
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">NIF/DNI</p>
                        <p className="font-medium text-base">{worker.tax_id || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">IBAN</p>
                        <p className="font-medium text-base">{worker.iban || "-"}</p>
                      </div>
                      {(worker.worker_type === "PARTNER" || worker.worker_type === "EMPLOYEE") && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Régimen de Seguridad Social</p>
                            <p className="font-medium text-base">
                              {worker.ss_regime === "RETA" ? "Autónomo (RETA propio)" : 
                               worker.ss_regime === "SSG" ? "Régimen General (SSG)" : 
                               worker.ss_regime || "-"}
                            </p>
                          </div>
                          {worker.worker_type === "PARTNER" && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                <Percent className="w-3 h-3" />
                                Retención IRPF
                              </p>
                              <p className="font-medium text-base">{worker.irpf_rate ? `${worker.irpf_rate}%` : "-"}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "direccion" && (
              <div className="w-full h-full px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MapPin className="w-5 h-5" />
                      Dirección
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground mb-1">Dirección</p>
                        <p className="font-medium text-base">{worker.address || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Ciudad</p>
                        <p className="font-medium text-base">{worker.city || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Código Postal</p>
                        <p className="font-medium text-base">{worker.postal_code || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Provincia</p>
                        <p className="font-medium text-base">{worker.province || "-"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "documentos" && (
              <div className="w-full h-full px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5" />
                      Documentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <FileText className="w-12 h-12 mb-4 opacity-50" />
                      <p>La gestión de documentos se implementará próximamente</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
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
