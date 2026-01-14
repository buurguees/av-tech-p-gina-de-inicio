import React, {
  useState,
  useEffect,
  useCallback,
  lazy,
  Suspense,
} from "react";
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
  Phone,
  Mail,
  MapPin,
  Star,
  CreditCard,
  FileText,
  Edit,
  Loader2,
  Calendar,
  Wrench,
  PhoneCall,
  Send,
  Plus,
  Building2,
  TrendingUp,
  Receipt,
  Euro,
  Clock,
  Banknote,
  User,
  CheckCircle2,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTypeInfo, getStatusInfo } from "@/constants/technicianConstants";
import EditTechnicianDialog from "./components/EditTechnicianDialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  ResponsiveContainer,
  Legend,
} from "recharts";

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

// TODO: Reemplazar con datos reales desde Supabase
const purchaseFlowData = [
  { mes: "Ene", compras: 1200 },
  { mes: "Feb", compras: 1800 },
  { mes: "Mar", compras: 1500 },
  { mes: "Abr", compras: 2200 },
  { mes: "May", compras: 1900 },
  { mes: "Jun", compras: 2500 },
  { mes: "Jul", compras: 2100 },
  { mes: "Ago", compras: 2800 },
  { mes: "Sep", compras: 2400 },
  { mes: "Oct", compras: 3000 },
  { mes: "Nov", compras: 2700 },
  { mes: "Dic", compras: 3200 },
];

const billingData = [
  { mes: "Ene", facturado: 1452, iva: 304.92, irpf: 0 },
  { mes: "Feb", facturado: 2178, iva: 457.38, irpf: 0 },
  { mes: "Mar", facturado: 1815, iva: 381.15, irpf: 0 },
  { mes: "Abr", facturado: 2662, iva: 559.02, irpf: 0 },
  { mes: "May", facturado: 2299, iva: 482.79, irpf: 0 },
  { mes: "Jun", facturado: 3025, iva: 635.25, irpf: 0 },
  { mes: "Jul", facturado: 2541, iva: 533.61, irpf: 0 },
  { mes: "Ago", facturado: 3388, iva: 711.48, irpf: 0 },
  { mes: "Sep", facturado: 2904, iva: 609.84, irpf: 0 },
  { mes: "Oct", facturado: 3630, iva: 762.30, irpf: 0 },
  { mes: "Nov", facturado: 3267, iva: 686.07, irpf: 0 },
  { mes: "Dic", facturado: 3872, iva: 813.12, irpf: 0 },
];

const latestProjectsMock = [
  {
    id: "1",
    fecha: "05/01/2026",
    proyecto: "Evento corporativo - Cliente Demo 1",
    precio_facturado: 5600,
  },
  {
    id: "2",
    fecha: "08/01/2026",
    proyecto: "Concierto - Cliente Demo 2",
    precio_facturado: 7000,
  },
  {
    id: "3",
    fecha: "10/01/2026",
    proyecto: "Instalación fija - Cliente Demo 3",
    precio_facturado: 4200,
  },
  {
    id: "4",
    fecha: "12/01/2026",
    proyecto: "Feria comercial - Cliente Demo 4",
    precio_facturado: 8500,
  },
  {
    id: "5",
    fecha: "15/01/2026",
    proyecto: "Evento privado - Cliente Demo 5",
    precio_facturado: 3200,
  },
];

const purchaseChartConfig: ChartConfig = {
  compras: {
    label: "Compras",
    color: "hsl(var(--status-info))",
  },
};

const billingChartConfig: ChartConfig = {
  facturado: {
    label: "Total Facturado",
    color: "hsl(var(--status-success))",
  },
  iva: {
    label: "IVA",
    color: "hsl(var(--status-warning))",
  },
  irpf: {
    label: "IRPF",
    color: "hsl(var(--status-error))",
  },
};

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
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center shadow-sm">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">Técnico no encontrado</p>
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header superior compacto */}
      <header className="flex-shrink-0 border-b bg-card px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate(`/nexo-av/${userId}/technicians`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                CRM · Técnico
              </p>
              <h1 className="text-base font-semibold leading-none mt-0.5">
                {technician.company_name}
              </h1>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setIsEditOpen(true)}
          >
            <Edit className="h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      </header>

      {/* Contenido principal con scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Tabs defaultValue="summary" className="space-y-4">
            {/* Hero Section - Información principal */}
            <div className="mb-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-9 w-9 rounded-md flex items-center justify-center border shrink-0"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--status-info-bg)), hsl(var(--status-success-bg)))",
                    }}
                  >
                    <TypeIcon className={cn("h-4 w-4", typeInfo.color)} />
                  </div>
                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold leading-tight">{technician.company_name}</h2>
                    <Badge
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-medium rounded-full border status-badge",
                        statusInfo.bgColor,
                        statusInfo.color,
                      )}
                    >
                      <span
                        className={cn("status-dot mr-1", statusInfo.dotColor)}
                      />
                      {statusInfo.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{technician.technician_number}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{typeInfo.label}</span>
                  </div>
                </div>

                {/* Acciones rápidas + Tabs en la misma línea */}
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-2"
                      onClick={() => setIsEditOpen(true)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Editar ficha
                    </Button>
                    {technician.contact_phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        asChild
                      >
                        <a href={`tel:${technician.contact_phone}`}>
                          <PhoneCall className="h-3.5 w-3.5" />
                          Llamar
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Crear tarea
                    </Button>
                  </div>
                  {/* Tabs nav alineado horizontalmente con los botones */}
                  <TabsList className="bg-muted/60">
                    <TabsTrigger value="summary">Resumen</TabsTrigger>
                    <TabsTrigger value="billing">Facturación</TabsTrigger>
                    <TabsTrigger value="notes">Notas</TabsTrigger>
                  </TabsList>
                </div>
              </div>

              {/* Mini KPIs con color usando la paleta global */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                className="rounded-md border px-3 py-2 flex flex-col gap-1"
                style={{
                  backgroundColor: "hsl(var(--status-success-bg))",
                  borderColor: "hsl(var(--status-success-border))",
                }}
              >
                <span className="text-[11px] font-medium" style={{ color: "hsl(var(--status-success-text))" }}>
                  Proyectos facturados (mock)
                </span>
                <span className="text-sm font-semibold" style={{ color: "hsl(var(--status-success))" }}>
                  12 este año
                </span>
              </div>
              <div
                className="rounded-md border px-3 py-2 flex flex-col gap-1"
                style={{
                  backgroundColor: "hsl(var(--status-info-bg))",
                  borderColor: "hsl(var(--status-info-border))",
                }}
              >
                <span className="text-[11px] font-medium" style={{ color: "hsl(var(--status-info-text))" }}>
                  Importe comprado (mock)
                </span>
                <span className="text-sm font-semibold" style={{ color: "hsl(var(--status-info))" }}>
                  32.400 €
                </span>
              </div>
              <div
                className="rounded-md border px-3 py-2 flex flex-col gap-1"
                style={{
                  backgroundColor: "hsl(var(--status-warning-bg))",
                  borderColor: "hsl(var(--status-warning-border))",
                }}
              >
                <span className="text-[11px] font-medium" style={{ color: "hsl(var(--status-warning-text))" }}>
                  Última colaboración
                </span>
                <span className="text-sm font-semibold" style={{ color: "hsl(var(--status-warning))" }}>
                  Hace 3 semanas
                </span>
              </div>
            </div>
          </div>


            {/* Grid de información principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Columna izquierda - Información de contacto y ubicación */}
              <div className="lg:col-span-1 space-y-4">
                {/* Contacto */}
                <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {technician.contact_name && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Persona de contacto</p>
                      <p className="font-medium">{technician.contact_name}</p>
                    </div>
                  )}
                  {technician.contact_email && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                      <a
                        href={`mailto:${technician.contact_email}`}
                        className="text-primary hover:underline break-all"
                      >
                        {technician.contact_email}
                      </a>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {technician.contact_phone && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
                        <a
                          href={`tel:${technician.contact_phone}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {technician.contact_phone}
                        </a>
                      </div>
                    )}
                    {technician.contact_phone_secondary && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Teléfono secundario</p>
                        <a
                          href={`tel:${technician.contact_phone_secondary}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {technician.contact_phone_secondary}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Ubicación */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Ubicación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {technician.address && (
                    <p className="font-medium">{technician.address}</p>
                  )}
                  <p className="text-muted-foreground">
                    {[technician.postal_code, technician.city].filter(Boolean).join(" ") || "—"}
                  </p>
                  <p className="text-muted-foreground">
                    {[technician.province, technician.country || "España"]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </CardContent>
              </Card>

              {/* Tarifas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    Tarifas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Por hora</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(technician.hourly_rate)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Por día</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(technician.daily_rate)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Especialidades */}
              {technician.specialties.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
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
            </div>

            {/* Columna derecha - Contenido de pestañas alineado con la columna izquierda */}
            <div className="lg:col-span-2">
              {/* TAB RESUMEN */}
              <TabsContent value="summary" className="space-y-4 mt-0">
                {/* Gráficos */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        Flujo de compra por meses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={purchaseChartConfig}
                        className="h-64 w-full"
                      >
                        <LineChart data={purchaseFlowData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="mes"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                          />
                          <ChartTooltip
                            content={<ChartTooltipContent />}
                            cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="compras"
                            stroke="var(--color-compras)"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        Total Facturado, IVA e IRPF
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={billingChartConfig}
                        className="h-64 w-full"
                      >
                        <BarChart data={billingData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="mes"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar
                            dataKey="facturado"
                            radius={[4, 4, 0, 0]}
                            fill="var(--color-facturado)"
                          />
                          <Bar
                            dataKey="iva"
                            radius={[4, 4, 0, 0]}
                            fill="var(--color-iva)"
                          />
                          <Bar
                            dataKey="irpf"
                            radius={[4, 4, 0, 0]}
                            fill="var(--color-irpf)"
                          />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Últimos proyectos */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">
                      Últimos Proyectos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {latestProjectsMock.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        Aún no hay proyectos registrados para este técnico.
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/60">
                            <TableRow>
                              <TableHead className="text-xs">Fecha</TableHead>
                              <TableHead className="text-xs">Proyecto</TableHead>
                              <TableHead className="text-xs text-right">Precio Facturado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {latestProjectsMock.map((project) => (
                              <TableRow key={project.id} className="text-xs">
                                <TableCell>{project.fecha}</TableCell>
                                <TableCell className="max-w-[400px] truncate">
                                  {project.proyecto}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {project.precio_facturado.toLocaleString("es-ES", {
                                    style: "currency",
                                    currency: "EUR",
                                  })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB FACTURACIÓN */}
              <TabsContent value="billing" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      Datos de facturación
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Razón social</p>
                        <p className="font-medium">
                          {technician.legal_name || technician.company_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">NIF / CIF</p>
                        <p className="font-mono text-sm">
                          {technician.tax_id || "—"}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">IBAN</p>
                        <p className="font-mono text-sm">
                          {technician.iban || "Sin IBAN definido"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Condiciones de pago</p>
                        <p className="text-sm font-medium">
                          {technician.payment_terms || "No especificadas"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB NOTAS */}
              <TabsContent value="notes" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Notas internas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {technician.notes ? (
                      <p className="whitespace-pre-wrap">{technician.notes}</p>
                    ) : (
                      <p className="text-muted-foreground">
                        Este técnico aún no tiene notas internas. Úsalas para registrar
                        información relevante de proyectos, incidencias o preferencias.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Información del registro
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
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
            </div>
          </div>
        </Tabs>
        </div>
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

export default function TechnicianDetailPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <TechnicianDetailPageMobile />
      </Suspense>
    );
  }

  return <TechnicianDetailPageDesktop />;
}