import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmActionDialog from "../components/common/ConfirmActionDialog";
import {
  Plus,
  Loader2,
  User,
  Receipt,
  CreditCard,
  FileText,
  Check,
  Clock,
  AlertCircle,
  Lock,
  Briefcase,
  MapPin,
  Phone,
  Shield,
  Calendar,
  Percent,
  Building2,
  UserCheck,
  ArrowLeft,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import TabNav, { TabItem } from "../components/navigation/TabNav";
import CreatePartnerPayrollDialog from "../components/rrhh/CreatePartnerPayrollDialog";
import RegisterPartnerPayrollPaymentDialog from "../components/rrhh/RegisterPartnerPayrollPaymentDialog";
import EditWorkerDialog from "../components/rrhh/EditWorkerDialog";

interface Partner {
  id: string;
  partner_number: string;
  full_name: string;
  tax_id: string | null;
  status: string;
  created_at: string;
}

interface PartnerPayroll {
  id: string;
  compensation_number: string;
  period_year: number;
  period_month: number;
  gross_amount: number;
  irpf_rate: number;
  irpf_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
  partner_name: string;
  partner_number: string;
  journal_entry_id?: string | null;
  journal_entry_number?: string | null;
  notes?: string;
}

// Datos extendidos del socio para el formulario de nómina y visualización
interface PartnerFullData {
  full_name: string;
  tax_id: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  province?: string;
  iban?: string;
  irpf_rate: number;
  ss_regime: string;
  department?: string;
  job_position?: string;
  worker_type?: string;
  roles?: string[];
  created_at?: string;
  last_login_at?: string;
  linked_partner_account_code?: string;
}

function PartnerDetailPage() {
  const navigate = useNavigate();
  const { userId, partnerId } = useParams<{ userId: string; partnerId: string }>();
  const { toast } = useToast();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [payrolls, setPayrolls] = useState<PartnerPayroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("informacion");
  const [showCreatePayrollDialog, setShowCreatePayrollDialog] = useState(false);
  const [selectedPayrollForPayment, setSelectedPayrollForPayment] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [linkedWorkerId, setLinkedWorkerId] = useState<string | null>(null);
  const [selectedPayrollForEdit, setSelectedPayrollForEdit] = useState<PartnerPayroll | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [payrollToDelete, setPayrollToDelete] = useState<PartnerPayroll | null>(null);
  
  // Datos completos del socio para el formulario de nómina y visualización
  const [partnerFullData, setPartnerFullData] = useState<PartnerFullData>({
    full_name: "",
    tax_id: "",
    irpf_rate: 19,
    ss_regime: "RETA",
  });

  const fetchPartner = async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      // Get partner from list
      const { data, error } = await supabase.rpc("list_partners", {
        p_status: "ACTIVE",
      });

      if (error) throw error;
      const found = (data || []).find((p: any) => p.id === partnerId);
      if (found) {
        setPartner(found);
        
        // Fetch the full worker data (IRPF, address, etc.) from the linked authorized_user
        const { data: workersData } = await supabase.rpc("list_workers");
        const linkedUser = (workersData || []).find(
          (w: any) => w.linked_partner_id === partnerId
        );
        
        if (linkedUser) {
          setLinkedWorkerId(linkedUser.id);
          
          // Try to get full worker detail
          let workerDetail: any = null;
          try {
            const { data: detailData } = await (supabase.rpc as any)("get_worker_detail", {
              p_user_id: linkedUser.id,
            });
            if (detailData?.[0]) {
              workerDetail = detailData[0];
            }
          } catch (rpcError) {
            // Fallback: use data from list_workers
            console.warn("get_worker_detail failed, using list_workers data:", rpcError);
          }
          
          const wd = workerDetail || linkedUser;
          setPartnerFullData({
            full_name: found.full_name,
            tax_id: found.tax_id || wd.tax_id || "",
            email: wd.email || null,
            phone: wd.phone || null,
            address: wd.address || null,
            city: wd.city || null,
            postal_code: wd.postal_code || null,
            province: wd.province || null,
            iban: wd.iban || null,
            irpf_rate: wd.irpf_rate || 19,
            ss_regime: wd.ss_regime || "RETA",
            department: wd.department || null,
            job_position: wd.job_position || null,
            worker_type: wd.worker_type || null,
            roles: wd.roles || [],
            created_at: wd.created_at || found.created_at,
            last_login_at: wd.last_login_at || null,
            linked_partner_account_code: wd.linked_partner_account_code || null,
          });
        } else {
          setLinkedWorkerId(null);
          // No linked worker, use partner data with default IRPF
          setPartnerFullData({
            full_name: found.full_name,
            tax_id: found.tax_id || "",
            irpf_rate: 19,
            ss_regime: "RETA",
            created_at: found.created_at,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching partner:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrolls = async () => {
    if (!partnerId) return;
    try {
      const { data, error } = await supabase.rpc("list_partner_compensation_runs", {
        p_partner_id: partnerId,
      });

      if (error) throw error;
      setPayrolls(data || []);
    } catch (error) {
      console.error("Error fetching payrolls:", error);
    }
  };

  useEffect(() => {
    fetchPartner();
    fetchPayrolls();
  }, [partnerId]);

  const handleConfirmPayroll = async (payrollId: string) => {
    try {
      const { error } = await supabase.rpc("post_partner_compensation_run", {
        p_compensation_run_id: payrollId,
      });

      if (error) throw error;

      toast({
        title: "Nómina confirmada",
        description: "El asiento contable se ha generado correctamente",
      });

      fetchPayrolls();
    } catch (error: any) {
      console.error("Error confirming payroll:", error);
      toast({
        title: "Error",
        description: error.message || "Error al confirmar la nómina",
        variant: "destructive",
      });
    }
  };

  const handleDeletePayroll = async () => {
    if (!payrollToDelete) return;
    
    try {
      const { error } = await (supabase.rpc as any)("delete_partner_compensation_run", {
        p_compensation_run_id: payrollToDelete.id,
      });

      if (error) throw error;

      toast({
        title: "Nómina eliminada",
        description: "La nómina se ha eliminado correctamente",
      });

      setDeleteDialogOpen(false);
      setPayrollToDelete(null);
      fetchPayrolls();
    } catch (error: any) {
      console.error("Error deleting payroll:", error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la nómina",
        variant: "destructive",
      });
    }
  };

  const handleEditPayroll = (payroll: PartnerPayroll) => {
    setSelectedPayrollForEdit(payroll);
    setShowCreatePayrollDialog(true);
  };

  const handleViewPayrollDetail = (payroll: PartnerPayroll) => {
    // Por ahora, mostrar un modal o navegar a una página de detalle
    // Por simplicidad, mostraremos la información en un toast
    toast({
      title: `Nómina ${payroll.compensation_number}`,
      description: `${getMonthName(payroll.period_month)} ${payroll.period_year} - ${formatCurrency(payroll.net_amount)} neto`,
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(val);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nunca";
    return format(new Date(dateStr), "d MMM yyyy, HH:mm", { locale: es });
  };

  const getMonthName = (month: number) => {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return months[month - 1];
  };

  // Extrae resumen de conceptos/pluses del desglose en notes
  const getConceptsSummary = (notes: string | undefined): string => {
    if (!notes) return "—";
    const breakdownMatch = notes.match(/Desglose:\s*(.+)/s);
    if (!breakdownMatch) return "—";
    const breakdown = breakdownMatch[1];
    const parts = breakdown.split("|").map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return "—";
    // Mostrar solo los conceptos con valor (ej: "Neto Base: 1.200€", "Plus Horas: 150€")
    const concepts = parts.map(p => {
      const m = p.match(/(.+?):\s*[\d,\.]+\s*(?:€\s*)?neto/i);
      return m ? m[1].trim() : null;
    }).filter(Boolean) as string[];
    return concepts.length > 0 ? concepts.join(", ") : "—";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Borrador</Badge>;
      case "POSTED":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Lock className="w-3 h-3 mr-1" />Confirmada</Badge>;
      case "PARTIAL":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><AlertCircle className="w-3 h-3 mr-1" />Parcial</Badge>;
      case "PAID":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Lock className="w-3 h-3 mr-1" />Pagada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDepartmentLabel = (dept: string | null | undefined) => {
    if (!dept) return "-";
    const labels: Record<string, string> = {
      COMMERCIAL: "Comercial",
      TECHNICAL: "Técnico",
      ADMIN: "Administración",
      DIRECTION: "Dirección",
    };
    return labels[dept] || dept;
  };

  const ytdStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearPayrolls = payrolls.filter(p => p.period_year === currentYear && p.status !== "DRAFT");
    return {
      totalGross: yearPayrolls.reduce((acc, p) => acc + p.gross_amount, 0),
      totalIrpf: yearPayrolls.reduce((acc, p) => acc + p.irpf_amount, 0),
      totalNet: yearPayrolls.reduce((acc, p) => acc + p.net_amount, 0),
      count: yearPayrolls.length,
    };
  }, [payrolls]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Socio no encontrado</p>
        <Button variant="outline" onClick={() => navigate(`/nexo-av/${userId}/partners`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  const tabs: TabItem[] = [
    { value: "informacion", label: "Información", icon: User },
    { value: "profesional", label: "Profesional", icon: Briefcase },
    { value: "fiscal", label: "Fiscal", icon: CreditCard },
    { value: "direccion", label: "Dirección", icon: MapPin },
    { value: "nominas", label: "Nóminas", icon: Receipt },
    { value: "documentos", label: "Documentos", icon: FileText },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Navigation Bar */}
      <DetailNavigationBar
        pageTitle={partner.full_name}
        contextInfo={partner.partner_number}
        backPath={`/nexo-av/${userId}/partners`}
        tools={
          linkedWorkerId ? (
            <DetailActionButton
              actionType="edit"
              onClick={() => setShowEditDialog(true)}
            />
          ) : null
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
                          <span className="text-muted-foreground">Nº Socio</span>
                          <span className="font-medium">{partner.partner_number}</span>
                        </div>
                        {partnerFullData.linked_partner_account_code && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cuenta Contable</span>
                            <span className="font-medium">{partnerFullData.linked_partner_account_code}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estado</span>
                          {partner.status === "ACTIVE" ? (
                            <Badge className="bg-green-500/20 text-green-400">Activo</Badge>
                          ) : (
                            <Badge variant="secondary">Inactivo</Badge>
                          )}
                        </div>
                        {partnerFullData.email && (
                          <>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Email</span>
                              <span className="font-medium">{partnerFullData.email}</span>
                            </div>
                          </>
                        )}
                        {partnerFullData.worker_type && (
                          <>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tipo</span>
                              <span className="font-medium">
                                {partnerFullData.worker_type === "PARTNER" ? "Socio" : 
                                 partnerFullData.worker_type === "EMPLOYEE" ? "Empleado" : "Sin asignar"}
                              </span>
                            </div>
                          </>
                        )}
                        {partnerFullData.department && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Departamento</span>
                            <span className="font-medium">{getDepartmentLabel(partnerFullData.department)}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Roles y permisos */}
                    {partnerFullData.roles && partnerFullData.roles.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Roles y Permisos
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {partnerFullData.roles.map((role) => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* YTD Stats */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <Receipt className="w-4 h-4" />
                          Resumen Anual ({new Date().getFullYear()})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Nóminas</span>
                          <span className="text-xl font-bold">{ytdStats.count}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Bruto Total</span>
                          <span className="font-medium">{formatCurrency(ytdStats.totalGross)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">IRPF Retenido</span>
                          <span className="font-medium text-orange-400">{formatCurrency(ytdStats.totalIrpf)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-border/50">
                          <span className="text-sm text-muted-foreground">Neto Total</span>
                          <span className="font-bold text-green-400">{formatCurrency(ytdStats.totalNet)}</span>
                        </div>
                      </CardContent>
                    </Card>

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
                          <span className="font-medium">{formatDate(partnerFullData.created_at || partner.created_at)}</span>
                        </div>
                        {partnerFullData.last_login_at && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Último acceso</span>
                            <span className="font-medium">{formatDate(partnerFullData.last_login_at)}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Main content - Configuración */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Shield className="w-5 h-5 text-primary" />
                          Configuración del Socio
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Número de Socio</p>
                            <p className="font-medium">{partner.partner_number}</p>
                          </div>
                          {partnerFullData.linked_partner_account_code && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Cuenta Contable</p>
                              <p className="font-medium">{partnerFullData.linked_partner_account_code}</p>
                            </div>
                          )}
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Régimen de Seguridad Social</p>
                            <p className="font-medium">
                              {partnerFullData.ss_regime === "RETA" ? "Autónomo (RETA propio)" : 
                               partnerFullData.ss_regime === "SSG" ? "Régimen General (SSG)" : 
                               partnerFullData.ss_regime || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              Retención IRPF
                            </p>
                            <p className="font-medium">{partnerFullData.irpf_rate ? `${partnerFullData.irpf_rate}%` : "-"}</p>
                          </div>
                        </div>
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
                      {partnerFullData.job_position && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Puesto de Trabajo</p>
                          <p className="font-medium text-base">{partnerFullData.job_position}</p>
                        </div>
                      )}
                      {partnerFullData.phone && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            Teléfono
                          </p>
                          <p className="font-medium text-base">{partnerFullData.phone}</p>
                        </div>
                      )}
                      {partnerFullData.department && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Departamento
                          </p>
                          <p className="font-medium text-base">{getDepartmentLabel(partnerFullData.department)}</p>
                        </div>
                      )}
                      {partnerFullData.worker_type && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            Tipo de Trabajador
                          </p>
                          <p className="font-medium text-base">
                            {partnerFullData.worker_type === "PARTNER" ? "Socio" : 
                             partnerFullData.worker_type === "EMPLOYEE" ? "Empleado" : "Sin asignar"}
                          </p>
                        </div>
                      )}
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
                        <p className="font-medium text-base">{partner.tax_id || partnerFullData.tax_id || "-"}</p>
                      </div>
                      {partnerFullData.iban && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">IBAN</p>
                          <p className="font-medium text-base">{partnerFullData.iban}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Régimen de Seguridad Social</p>
                        <p className="font-medium text-base">
                          {partnerFullData.ss_regime === "RETA" ? "Autónomo (RETA propio)" : 
                           partnerFullData.ss_regime === "SSG" ? "Régimen General (SSG)" : 
                           partnerFullData.ss_regime || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                          <Percent className="w-3 h-3" />
                          Retención IRPF
                        </p>
                        <p className="font-medium text-base">{partnerFullData.irpf_rate ? `${partnerFullData.irpf_rate}%` : "-"}</p>
                      </div>
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
                      {partnerFullData.address && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-muted-foreground mb-1">Dirección</p>
                          <p className="font-medium text-base">{partnerFullData.address}</p>
                        </div>
                      )}
                      {partnerFullData.city && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Ciudad</p>
                          <p className="font-medium text-base">{partnerFullData.city}</p>
                        </div>
                      )}
                      {partnerFullData.postal_code && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Código Postal</p>
                          <p className="font-medium text-base">{partnerFullData.postal_code}</p>
                        </div>
                      )}
                      {partnerFullData.province && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Provincia</p>
                          <p className="font-medium text-base">{partnerFullData.province}</p>
                        </div>
                      )}
                    </div>
                    {!partnerFullData.address && !partnerFullData.city && !partnerFullData.postal_code && !partnerFullData.province && (
                      <p className="text-muted-foreground text-center py-8">No hay dirección registrada</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "nominas" && (
              <div className="w-full h-full px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Nóminas del Socio</h2>
                  <Button onClick={() => {
                    setSelectedPayrollForEdit(null);
                    setShowCreatePayrollDialog(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Nómina
                  </Button>
                </div>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-muted-foreground text-xs font-medium">Nº Nómina</TableHead>
                          <TableHead className="text-muted-foreground text-xs font-medium">Período</TableHead>
                          <TableHead className="text-muted-foreground text-xs font-medium text-right">Bruto</TableHead>
                          <TableHead className="text-muted-foreground text-xs font-medium text-right">IRPF Retenido</TableHead>
                          <TableHead className="text-muted-foreground text-xs font-medium text-right">Neto</TableHead>
                          <TableHead className="text-muted-foreground text-xs font-medium min-w-[140px]">Conceptos / Pluses</TableHead>
                          <TableHead className="text-muted-foreground text-xs font-medium text-center">Estado</TableHead>
                          <TableHead className="text-muted-foreground text-xs font-medium w-[120px]">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payrolls.map((payroll) => (
                          <TableRow
                            key={payroll.id}
                            className="border-border hover:bg-accent/50"
                          >
                            <TableCell className="py-3">
                              <p className="font-mono font-medium text-sm">{payroll.compensation_number}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(new Date(payroll.created_at), "d MMM yyyy", { locale: es })}
                              </p>
                              {payroll.journal_entry_number && (
                                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                                  Asiento: {payroll.journal_entry_number}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              <p className="font-medium text-sm">{getMonthName(payroll.period_month)} {payroll.period_year}</p>
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <span className="font-medium text-sm">{formatCurrency(payroll.gross_amount)}</span>
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <span className="text-orange-400 text-sm font-medium">
                                -{formatCurrency(payroll.irpf_amount)}
                              </span>
                              <p className="text-xs text-muted-foreground mt-0.5">({payroll.irpf_rate}%)</p>
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <span className="font-bold text-green-400 text-sm">{formatCurrency(payroll.net_amount)}</span>
                            </TableCell>
                            <TableCell className="py-3">
                              <span className="text-xs text-muted-foreground line-clamp-2" title={payroll.notes}>
                                {getConceptsSummary(payroll.notes)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {getStatusBadge(payroll.status)}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-1">
                                {/* Aprobar - solo si está en DRAFT */}
                                {payroll.status === "DRAFT" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => handleConfirmPayroll(payroll.id)}
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Aprobar
                                  </Button>
                                )}
                                {/* Pagar - solo si está POSTED o PARTIAL */}
                                {(payroll.status === "POSTED" || payroll.status === "PARTIAL") && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setSelectedPayrollForPayment(payroll.id)}
                                  >
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    Pagar
                                  </Button>
                                )}
                                {/* Menú de acciones adicionales */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                    >
                                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 z-[9999] bg-card border border-border shadow-lg">
                                    <DropdownMenuItem
                                      onClick={() => handleViewPayrollDetail(payroll)}
                                      className="cursor-pointer"
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver detalle
                                    </DropdownMenuItem>
                                    {payroll.status === "DRAFT" && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => handleEditPayroll(payroll)}
                                          className="cursor-pointer"
                                        >
                                          <Edit className="h-4 w-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setPayrollToDelete(payroll);
                                            setDeleteDialogOpen(true);
                                          }}
                                          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Eliminar
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {payrolls.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                              No hay nóminas registradas para este socio
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
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

      {/* Dialogs */}
      <CreatePartnerPayrollDialog
        open={showCreatePayrollDialog}
        onOpenChange={(open) => {
          setShowCreatePayrollDialog(open);
          if (!open) {
            setSelectedPayrollForEdit(null);
          }
        }}
        partnerId={partnerId!}
        partnerData={partnerFullData}
        payrollToEdit={selectedPayrollForEdit}
        onSuccess={fetchPayrolls}
      />

      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar nómina"
        description={`¿Estás seguro de que quieres eliminar la nómina ${payrollToDelete?.compensation_number}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDeletePayroll}
        variant="destructive"
      />

      {selectedPayrollForPayment && (
        <RegisterPartnerPayrollPaymentDialog
          open={!!selectedPayrollForPayment}
          onOpenChange={(open) => !open && setSelectedPayrollForPayment(null)}
          payrollId={selectedPayrollForPayment}
          onSuccess={fetchPayrolls}
        />
      )}

      {/* Edit Worker Dialog */}
      {linkedWorkerId && (
        <EditWorkerDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          workerId={linkedWorkerId}
          onSuccess={() => {
            fetchPartner();
          }}
        />
      )}
    </div>
  );
}

export default PartnerDetailPage;
