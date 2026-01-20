import React, {
  useState,
  useEffect,
  useCallback,
  lazy,
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
  CreditCard,
  FileText,
  Edit,
  Loader2,
  Calendar,
  Building2,
  PhoneCall,
  Plus,
  Truck,
  Receipt,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { createMobilePage } from "./MobilePageWrapper";

const SupplierDetailPageMobile = lazy(() => import("./mobile/SupplierDetailPageMobile"));

interface SupplierDetail {
  id: string;
  supplier_number: string;
  company_name: string;
  tax_id: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  city: string | null;
  province: string | null;
  payment_terms: string | null;
  status: string;
  created_at: string;
}

function SupplierDetailPageDesktop() {
  const { userId, supplierId } = useParams<{ userId: string; supplierId: string }>();
  const navigate = useNavigate();
interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier_invoice_number: string | null;
  internal_purchase_number: string | null;
  document_type: string;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  withholding_amount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  project_id: string | null;
  project_name: string | null;
  project_number: string | null;
  client_name: string | null;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
}

  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Activo', bgColor: 'bg-emerald-500/10', color: 'text-emerald-400', dotColor: 'bg-emerald-400' };
      case 'INACTIVE':
        return { label: 'Inactivo', bgColor: 'bg-zinc-500/10', color: 'text-zinc-400', dotColor: 'bg-zinc-400' };
      case 'BLOCKED':
        return { label: 'Bloqueado', bgColor: 'bg-red-500/10', color: 'text-red-500', dotColor: 'bg-red-500' };
      default:
        return { label: status, bgColor: 'bg-zinc-500/10', color: 'text-zinc-400', dotColor: 'bg-zinc-400' };
    }
  };

  const fetchSupplier = useCallback(async () => {
    if (!supplierId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_supplier", {
        p_supplier_id: supplierId,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setSupplier(data[0]);
      }
    } catch (err) {
      console.error("Error fetching supplier:", err);
      toast.error("Error al cargar los datos del proveedor");
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  const fetchPurchaseInvoices = useCallback(async () => {
    if (!supplierId) return;

    setLoadingInvoices(true);
    try {
      const { data, error } = await supabase.rpc("get_provider_purchase_invoices", {
        p_provider_id: supplierId,
        p_provider_type: "SUPPLIER",
      });

      if (error) throw error;
      if (data) {
        setPurchaseInvoices(data as PurchaseInvoice[]);
      }
    } catch (err) {
      console.error("Error fetching purchase invoices:", err);
    } finally {
      setLoadingInvoices(false);
    }
  }, [supplierId]);

  useEffect(() => {
    fetchSupplier();
    fetchPurchaseInvoices();
  }, [fetchSupplier, fetchPurchaseInvoices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center shadow-sm">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">Proveedor no encontrado</p>
        <Button onClick={() => navigate(`/nexo-av/${userId}/suppliers`)}>
          Volver al listado
        </Button>
      </div>
    );
  }

  const statusInfo = getStatusInfo(supplier.status);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
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
              onClick={() => navigate(`/nexo-av/${userId}/suppliers`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                CRM · Proveedor
              </p>
              <h1 className="text-base font-semibold leading-none mt-0.5">
                {supplier.company_name}
              </h1>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              // TODO: Implementar EditSupplierDialog en FASE 3
              toast.info("Funcionalidad de edición en desarrollo");
            }}
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
            {/* Hero Section */}
            <div className="mb-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-9 w-9 rounded-md flex items-center justify-center border shrink-0 bg-blue-500/10">
                    <Truck className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold leading-tight">{supplier.company_name}</h2>
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
                    <span className="text-xs text-muted-foreground">{supplier.supplier_number}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    {supplier.contact_phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        asChild
                      >
                        <a href={`tel:${supplier.contact_phone}`}>
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
                      Nueva factura
                    </Button>
                  </div>
                  <TabsList className="bg-muted/60">
                    <TabsTrigger value="summary">Resumen</TabsTrigger>
                    <TabsTrigger value="invoices">Facturas</TabsTrigger>
                  </TabsList>
                </div>
              </div>
            </div>

            {/* Grid de información principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Columna izquierda - Información de contacto */}
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
                    {supplier.contact_email && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Email</p>
                        <a
                          href={`mailto:${supplier.contact_email}`}
                          className="text-primary hover:underline break-all"
                        >
                          {supplier.contact_email}
                        </a>
                      </div>
                    )}
                    {supplier.contact_phone && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
                        <a
                          href={`tel:${supplier.contact_phone}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {supplier.contact_phone}
                        </a>
                      </div>
                    )}
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
                    <p className="text-muted-foreground">
                      {supplier.city || "—"}
                    </p>
                    <p className="text-muted-foreground">
                      {supplier.province || "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Columna derecha - Contenido de pestañas */}
              <div className="lg:col-span-2">
                {/* TAB RESUMEN */}
                <TabsContent value="summary" className="space-y-4 mt-0">
                  {/* Datos fiscales */}
                  <Card>
                    <CardHeader className="pb-3">
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
                            {supplier.company_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">NIF / CIF</p>
                          <p className="font-mono text-sm">
                            {supplier.tax_id || "—"}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Condiciones de pago</p>
                        <p className="text-sm font-medium">
                          {supplier.payment_terms || "No especificadas"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB FACTURAS */}
                <TabsContent value="invoices" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        Facturas de Compra
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingInvoices ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : purchaseInvoices.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          Aún no hay facturas de compra registradas para este proveedor.
                        </div>
                      ) : (
                        <div className="border rounded-md overflow-hidden">
                          <Table>
                            <TableHeader className="bg-muted/60">
                              <TableRow>
                                <TableHead className="text-xs">N° Factura</TableHead>
                                <TableHead className="text-xs">N° Interno</TableHead>
                                <TableHead className="text-xs">Fecha</TableHead>
                                <TableHead className="text-xs">Proyecto</TableHead>
                                <TableHead className="text-xs text-right">Total</TableHead>
                                <TableHead className="text-xs text-right">Pagado</TableHead>
                                <TableHead className="text-xs text-right">Pendiente</TableHead>
                                <TableHead className="text-xs text-center">Estado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {purchaseInvoices.map((invoice) => (
                                <TableRow 
                                  key={invoice.id} 
                                  className="text-xs cursor-pointer hover:bg-muted/50"
                                  onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/${invoice.id}`)}
                                >
                                  <TableCell className="font-medium">
                                    {invoice.supplier_invoice_number || invoice.invoice_number}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {invoice.internal_purchase_number || "—"}
                                  </TableCell>
                                  <TableCell>
                                    {new Date(invoice.issue_date).toLocaleDateString("es-ES", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })}
                                  </TableCell>
                                  <TableCell>
                                    {invoice.project_number || "—"}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatCurrency(invoice.total)}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    {formatCurrency(invoice.paid_amount)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {invoice.pending_amount > 0 ? (
                                      <span className="font-medium text-amber-600">
                                        {formatCurrency(invoice.pending_amount)}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-xs",
                                        invoice.status === "CONFIRMED" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                        invoice.status === "REGISTERED" && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                        invoice.status === "CANCELLED" && "bg-red-500/10 text-red-400 border-red-500/20"
                                      )}
                                    >
                                      {invoice.status === "CONFIRMED" ? "Confirmada" :
                                       invoice.status === "REGISTERED" ? "Registrada" :
                                       invoice.status === "CANCELLED" ? "Cancelada" :
                                       invoice.status}
                                    </Badge>
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

                {/* Información del registro */}
                <Card className="mt-4">
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
                        {new Date(supplier.created_at).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

const SupplierDetailPage = createMobilePage({
  DesktopComponent: SupplierDetailPageDesktop,
  MobileComponent: SupplierDetailPageMobile,
});

export default SupplierDetailPage;
