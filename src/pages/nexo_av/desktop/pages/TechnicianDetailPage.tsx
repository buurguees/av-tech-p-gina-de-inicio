import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Edit,
  PhoneCall,
  Send,
  LayoutDashboard,
  FolderKanban,
  Receipt,
  ShoppingCart,
  Phone,
  MapPin,
  Briefcase,
  ChevronDown,
  Loader2,
  BarChart3,
  Mail,
  FileText,
  Star,
  CreditCard,
  Clock,
  Wrench,
  Building2,
  User,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import TabNav, { TabItem } from "../components/navigation/TabNav";
import { DetailInfoBlock, DetailInfoHeader, DetailInfoSummary, MetricCard } from "../components/detail";
import EditTechnicianDialog from "../components/technicians/EditTechnicianDialog";
import {
  TECHNICIAN_TYPES,
  TECHNICIAN_STATUSES,
  TECHNICIAN_SPECIALTIES,
  getTypeInfo,
  getStatusInfo,
} from "@/constants/technicianConstants";

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
  vat_rate?: number | null;
  withholding_tax_rate?: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
  INACTIVE: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  BLOCKED: "bg-red-500/20 text-red-400 border-red-500/30",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  COMPANY: Building2,
  FREELANCER: User,
  EMPLOYEE: UserCheck,
};

const TechnicianDetailPageDesktop = () => {
  const { userId, technicianId } = useParams<{ userId: string; technicianId: string }>();
  const [loading, setLoading] = useState(true);
  const [technician, setTechnician] = useState<TechnicianDetail | null>(null);
  const [activeTab, setActiveTab] = useState("resumen");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [stats, setStats] = useState({
    projectsCount: 0,
    purchaseInvoicesCount: 0,
    purchaseOrdersCount: 0,
    totalInvoiced: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  const navigate = useNavigate();
  const { toast } = useToast();

  const tabs: TabItem[] = [
    { value: "resumen", label: "Resumen", icon: LayoutDashboard },
    { value: "proyectos", label: "Proyectos", icon: FolderKanban },
    { value: "facturas-compra", label: "Facturas de Compra", icon: Receipt },
    { value: "pedidos-compra", label: "Pedidos de Compra", icon: ShoppingCart },
  ];

  const fetchTechnician = async () => {
    if (!technicianId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_technician", {
        p_technician_id: technicianId,
      });
      if (error) throw error;
      if (data && data.length > 0) {
        setTechnician(data[0]);
      } else {
        toast({ title: "Error", description: "Técnico no encontrado", variant: "destructive" });
        navigate(`/nexo-av/${userId}/technicians`);
      }
    } catch (err) {
      console.error("Error fetching technician:", err);
      toast({ title: "Error", description: "No se pudo cargar el técnico", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!technicianId) return;
    try {
      setSummaryLoading(true);

      const { data: projectsData } = await supabase.rpc("get_technician_projects_count", {
        p_technician_id: technicianId,
      });

      const { data: invoicesData } = await supabase.rpc("list_purchase_invoices", {
        p_search: null,
        p_status: null,
        p_document_type: null,
      });
      const techInvoices = (invoicesData || []).filter(
        (inv: any) => inv.technician_id === technicianId
      );
      const totalInvoiced = techInvoices.reduce(
        (sum: number, inv: any) => sum + (inv.total || inv.base_amount || 0),
        0
      );

      const { data: ordersData } = await supabase.rpc("list_purchase_orders", {
        p_search: null,
        p_status: null,
      });
      const techOrders = (ordersData || []).filter(
        (o: any) => o.technician_id === technicianId
      );

      setStats({
        projectsCount: typeof projectsData === "number" ? projectsData : (projectsData?.[0]?.count ?? 0),
        purchaseInvoicesCount: techInvoices.length,
        purchaseOrdersCount: techOrders.length,
        totalInvoiced,
      });
    } catch (err) {
      console.error("Error fetching technician stats:", err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!technician) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase.rpc("update_technician", {
        p_technician_id: technician.id,
        p_company_name: technician.company_name,
        p_type: technician.type,
        p_legal_name: technician.legal_name,
        p_tax_id: technician.tax_id,
        p_contact_name: technician.contact_name,
        p_contact_phone: technician.contact_phone,
        p_contact_phone_secondary: technician.contact_phone_secondary,
        p_contact_email: technician.contact_email,
        p_billing_email: technician.billing_email,
        p_address: technician.address,
        p_city: technician.city,
        p_province: technician.province,
        p_postal_code: technician.postal_code,
        p_specialties: technician.specialties,
        p_hourly_rate: technician.hourly_rate,
        p_daily_rate: technician.daily_rate,
        p_iban: technician.iban,
        p_payment_terms: technician.payment_terms,
        p_status: newStatus,
        p_rating: technician.rating,
        p_notes: technician.notes,
      });

      if (error) throw error;

      setTechnician({ ...technician, status: newStatus });
      const label = TECHNICIAN_STATUSES.find((s) => s.value === newStatus)?.label || newStatus;
      toast({ title: "Estado actualizado", description: `El técnico ahora está "${label}"` });
    } catch (err) {
      console.error("Error updating status:", err);
      toast({ title: "Error", description: "No se pudo actualizar el estado", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    fetchTechnician();
    fetchStats();
  }, [technicianId]);

  if (loading || !technician) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusInfo = getStatusInfo(technician.status);
  const typeInfo = getTypeInfo(technician.type);
  const statusColor = STATUS_COLORS[technician.status] || STATUS_COLORS.ACTIVE;
  const TypeIcon = TYPE_ICONS[technician.type] || User;

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return value.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground text-xs">Sin valoración</span>;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn("h-3.5 w-3.5", i < rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">({rating}/5)</span>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar
        pageTitle="Detalle de Técnico"
        contextInfo={
          <div className="flex items-center gap-2">
            <TypeIcon className="h-4 w-4 text-muted-foreground" />
            <span>{technician.company_name}</span>
            <Badge variant="outline" className="text-[10px] gap-1">
              {typeInfo.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={updatingStatus}>
                <button
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors",
                    statusColor,
                    updatingStatus && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {updatingStatus ? "Actualizando..." : statusInfo.label}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px] bg-zinc-900 border-white/10">
                {TECHNICIAN_STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s.value}
                    onClick={() => handleStatusChange(s.value)}
                    className={cn(
                      "cursor-pointer text-white hover:bg-white/10",
                      s.value === technician.status && "bg-accent"
                    )}
                  >
                    <span className={cn("inline-block w-2 h-2 rounded-full mr-2", s.dotColor)} />
                    <span>{s.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
        backPath={userId ? `/nexo-av/${userId}/technicians` : undefined}
        tools={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2 text-[10px] font-medium gap-2"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit className="h-3 w-3" />
              Editar
            </Button>
            {technician.contact_phone && (
              <Button variant="outline" size="sm" className="h-9 px-2 text-[10px] font-medium gap-2" asChild>
                <a href={`tel:${technician.contact_phone}`}>
                  <PhoneCall className="h-3 w-3" />
                  Llamar
                </a>
              </Button>
            )}
            {technician.contact_email && (
              <Button variant="outline" size="sm" className="h-9 px-2 text-[10px] font-medium gap-2" asChild>
                <a href={`mailto:${technician.contact_email}`}>
                  <Send className="h-3 w-3" />
                  Email
                </a>
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="flex-1 overflow-auto">
            {activeTab === "resumen" && (
              <div className="w-full h-full px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <div className="bg-card/50 border border-border rounded-lg p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1 bg-blue-500/10 rounded text-blue-600">
                        <FolderKanban className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Proyectos</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">
                      {summaryLoading ? "..." : stats.projectsCount}
                    </span>
                  </div>
                  <div className="bg-card/50 border border-border rounded-lg p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1 bg-green-500/10 rounded text-green-600">
                        <Receipt className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Facturas compra</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">
                      {summaryLoading ? "..." : stats.purchaseInvoicesCount}
                    </span>
                  </div>
                  <div className="bg-card/50 border border-border rounded-lg p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1 bg-orange-500/10 rounded text-orange-600">
                        <ShoppingCart className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Pedidos compra</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">
                      {summaryLoading ? "..." : stats.purchaseOrdersCount}
                    </span>
                  </div>
                  <div className="bg-card/50 border border-border rounded-lg p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1 bg-purple-500/10 rounded text-purple-600">
                        <BarChart3 className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Total facturado</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">
                      {summaryLoading ? "..." : formatCurrency(stats.totalInvoiced)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1 space-y-3">
                    {/* Contacto */}
                    {(technician.contact_email || technician.contact_phone || technician.contact_name) && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            Contacto
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5 text-sm pb-4">
                          {technician.contact_name && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Persona de contacto</p>
                              <p className="font-medium">{technician.contact_name}</p>
                            </div>
                          )}
                          {technician.contact_email && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                              <a href={`mailto:${technician.contact_email}`} className="text-primary hover:underline break-all">
                                {technician.contact_email}
                              </a>
                            </div>
                          )}
                          {technician.billing_email && technician.billing_email !== technician.contact_email && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Email facturación</p>
                              <a href={`mailto:${technician.billing_email}`} className="text-primary hover:underline break-all">
                                {technician.billing_email}
                              </a>
                            </div>
                          )}
                          {technician.contact_phone && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Teléfono</p>
                              <a href={`tel:${technician.contact_phone}`} className="text-primary hover:underline font-medium">
                                {technician.contact_phone}
                              </a>
                            </div>
                          )}
                          {technician.contact_phone_secondary && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Teléfono secundario</p>
                              <a href={`tel:${technician.contact_phone_secondary}`} className="text-primary hover:underline font-medium">
                                {technician.contact_phone_secondary}
                              </a>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Ubicación */}
                    {(technician.address || technician.city) && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            Ubicación
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm pb-4">
                          {technician.address && <p className="font-medium">{technician.address}</p>}
                          <p className="text-muted-foreground">
                            {[technician.postal_code, technician.city].filter(Boolean).join(" ") || "—"}
                          </p>
                          <p className="text-muted-foreground">
                            {[technician.province, technician.country || "España"].filter(Boolean).join(", ")}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Información fiscal */}
                    {(technician.tax_id || technician.legal_name) && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            Información fiscal
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5 text-sm pb-4">
                          {technician.tax_id && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">NIF / CIF</p>
                              <p className="font-mono">{technician.tax_id}</p>
                            </div>
                          )}
                          {technician.legal_name && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Razón Social</p>
                              <p className="font-medium">{technician.legal_name}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Tarifas */}
                    {(technician.hourly_rate || technician.daily_rate) && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            Tarifas
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5 text-sm pb-4">
                          {technician.hourly_rate != null && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Tarifa por hora</p>
                              <p className="font-semibold">{formatCurrency(technician.hourly_rate)}</p>
                            </div>
                          )}
                          {technician.daily_rate != null && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Tarifa por día</p>
                              <p className="font-semibold">{formatCurrency(technician.daily_rate)}</p>
                            </div>
                          )}
                          {technician.payment_terms && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Condiciones de pago</p>
                              <p className="font-medium">{technician.payment_terms}</p>
                            </div>
                          )}
                          {technician.iban && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">IBAN</p>
                              <p className="font-mono text-xs">{technician.iban}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Especialidades */}
                    {technician.specialties && technician.specialties.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            Especialidades
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
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
                  </div>

                  {/* Columna derecha - Notas y más info */}
                  <div className="lg:col-span-2 space-y-3">
                    {/* Valoración */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Star className="h-4 w-4 text-muted-foreground" />
                          Valoración
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        {renderStars(technician.rating)}
                      </CardContent>
                    </Card>

                    {/* Notas */}
                    {technician.notes && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            Notas internas
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{technician.notes}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Info de registro */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          Registro
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm pb-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Número</span>
                          <span className="font-mono font-medium">{technician.technician_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Creado</span>
                          <span>{new Date(technician.created_at).toLocaleDateString("es-ES")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Actualizado</span>
                          <span>{new Date(technician.updated_at).toLocaleDateString("es-ES")}</span>
                        </div>
                        {technician.created_by_name && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Creado por</span>
                            <span>{technician.created_by_name}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "proyectos" && (
              <TechnicianProjectsTab technicianId={technician.id} />
            )}

            {activeTab === "facturas-compra" && (
              <TechnicianPurchaseInvoicesTab technicianId={technician.id} userId={userId} />
            )}

            {activeTab === "pedidos-compra" && (
              <TechnicianPurchaseOrdersTab technicianId={technician.id} userId={userId} />
            )}
          </div>
        </div>

        {/* Panel lateral derecho */}
        <div className="w-[20rem] flex-shrink-0 border-l border-border h-full">
          <div className="h-full">
            <DetailInfoBlock
              header={
                <DetailInfoHeader
                  title={technician.company_name}
                  subtitle={technician.legal_name && technician.legal_name !== technician.company_name ? technician.legal_name : undefined}
                  badge={
                    <Badge variant="outline" className={cn("text-[10px]", statusColor)}>
                      {statusInfo.label}
                    </Badge>
                  }
                >
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <TypeIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="font-medium">{typeInfo.label}</span>
                    </div>
                    {technician.tax_id && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">CIF:</span>
                        <span className="font-medium">{technician.tax_id}</span>
                      </div>
                    )}
                    {technician.contact_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium truncate">{technician.contact_email}</span>
                      </div>
                    )}
                    {technician.contact_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Tel:</span>
                        <span className="font-medium">{technician.contact_phone}</span>
                      </div>
                    )}
                  </div>
                </DetailInfoHeader>
              }
              summary={
                <DetailInfoSummary
                  columns={2}
                  items={[
                    {
                      label: "Proyectos",
                      value: summaryLoading ? "..." : `${stats.projectsCount}`,
                      icon: <FolderKanban className="w-4 h-4" />,
                    },
                    {
                      label: "Facturas compra",
                      value: summaryLoading ? "..." : `${stats.purchaseInvoicesCount}`,
                      icon: <Receipt className="w-4 h-4" />,
                    },
                    {
                      label: "Total facturado",
                      value: summaryLoading ? "..." : formatCurrency(stats.totalInvoiced),
                      icon: <BarChart3 className="w-4 h-4" />,
                    },
                  ]}
                />
              }
              content={
                <div className="flex flex-col gap-3">
                  <MetricCard
                    title="Proyectos asignados"
                    value={summaryLoading ? "..." : `${stats.projectsCount}`}
                    icon={FolderKanban}
                  />
                  <MetricCard
                    title="Total facturado"
                    value={summaryLoading ? "..." : formatCurrency(stats.totalInvoiced)}
                    icon={Receipt}
                  />
                  <MetricCard
                    title="Tarifa/hora"
                    value={technician.hourly_rate ? formatCurrency(technician.hourly_rate) : "-"}
                    icon={Clock}
                  />
                </div>
              }
            />
          </div>
        </div>
      </div>

      <EditTechnicianDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        technician={technician as any}
        onSuccess={() => {
          setEditDialogOpen(false);
          fetchTechnician();
          fetchStats();
        }}
      />
    </div>
  );
};

/* ── Tab: Proyectos del técnico ── */
function TechnicianProjectsTab({ technicianId }: { technicianId: string }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase.rpc("list_projects", { p_search: null, p_status: null });
        const all = data || [];
        const filtered: any[] = [];
        for (const proj of all) {
          const { data: techs } = await supabase.rpc("list_project_technicians", { p_project_id: proj.id });
          if ((techs || []).some((t: any) => t.technician_id === technicianId)) {
            filtered.push(proj);
          }
        }
        setProjects(filtered);
      } catch (err) {
        console.error("Error loading projects:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [technicianId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FolderKanban className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Este técnico no tiene proyectos asignados</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Número</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Nombre</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Estado</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Ciudad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {projects.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/nexo-av/${userId}/projects/${p.id}`)}
              >
                <td className="px-4 py-2.5 font-mono text-xs">{p.project_number}</td>
                <td className="px-4 py-2.5 font-medium">{p.name}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{p.city || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Tab: Facturas de compra del técnico ── */
function TechnicianPurchaseInvoicesTab({ technicianId, userId }: { technicianId: string; userId?: string }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase.rpc("list_purchase_invoices", {
          p_search: null,
          p_status: null,
          p_document_type: null,
        });
        setInvoices((data || []).filter((inv: any) => inv.technician_id === technicianId));
      } catch (err) {
        console.error("Error loading purchase invoices:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [technicianId]);

  const formatCurrency = (v: number | null) =>
    v != null ? v.toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : "-";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Receipt className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Este técnico no tiene facturas de compra</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Número</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Fecha</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Estado</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/${inv.id}`)}
              >
                <td className="px-4 py-2.5 font-mono text-xs">{inv.invoice_number}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString("es-ES") : "-"}
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className="text-[10px]">{inv.status}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right font-medium">
                  {formatCurrency(inv.total || inv.base_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Tab: Pedidos de compra del técnico ── */
function TechnicianPurchaseOrdersTab({ technicianId, userId }: { technicianId: string; userId?: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase.rpc("list_purchase_orders", {
          p_search: null,
          p_status: null,
        });
        setOrders((data || []).filter((o: any) => o.technician_id === technicianId));
      } catch (err) {
        console.error("Error loading purchase orders:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [technicianId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ShoppingCart className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Este técnico no tiene pedidos de compra</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Número</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Fecha</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Estado</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Proyecto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((o) => (
              <tr
                key={o.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/nexo-av/${userId}/purchase-orders/${o.id}`)}
              >
                <td className="px-4 py-2.5 font-mono text-xs">{o.po_number}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {o.issue_date ? new Date(o.issue_date).toLocaleDateString("es-ES") : "-"}
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{o.project_name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TechnicianDetailPageDesktop;
