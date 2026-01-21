import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Edit,
  Loader2,
  FileText,
  CreditCard,
  PhoneCall,
  Send,
  Plus,
  Building2,
  Truck,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function SupplierDetailPageMobile() {
  const { userId, supplierId } = useParams<{ userId: string; supplierId: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Activo', bgColor: 'bg-emerald-500/10', color: 'text-emerald-400' };
      case 'INACTIVE':
        return { label: 'Inactivo', bgColor: 'bg-zinc-500/10', color: 'text-zinc-400' };
      case 'BLOCKED':
        return { label: 'Bloqueado', bgColor: 'bg-red-500/10', color: 'text-red-500' };
      default:
        return { label: status, bgColor: 'bg-zinc-500/10', color: 'text-zinc-400' };
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

      // Fetch purchase invoices for this supplier
      const { data: invoicesData, error: invoicesError } = await supabase.rpc("list_purchase_invoices", {
        p_search: null,
        p_status: null,
        p_document_type: null,
      });
      if (!invoicesError && invoicesData) {
        const supplierInvoices = invoicesData.filter((inv: any) => inv.provider_id === supplierId);
        setPurchaseInvoices(supplierInvoices);
      }
    } catch (err) {
      console.error("Error fetching supplier:", err);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    fetchSupplier();
  }, [fetchSupplier]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
        <Truck className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">Proveedor no encontrado</p>
        <Button onClick={() => navigate(`/nexo-av/${userId}/suppliers`)}>
          Volver
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
    <div className="flex flex-col h-full pb-20">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate(`/nexo-av/${userId}/suppliers`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="h-4 w-4 shrink-0 text-blue-400" />
              <h1 className="font-semibold text-base truncate">{supplier.company_name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{supplier.supplier_number}</span>
              <Badge
                className={cn(
                  "text-xs px-2 py-0.5",
                  statusInfo.bgColor,
                  statusInfo.color,
                )}
              >
                {statusInfo.label}
              </Badge>
            </div>
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9"
            onClick={() => {
              // TODO: Implementar EditSupplierDialog en FASE 3
              toast.info("Funcionalidad de edición en desarrollo");
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-2 mt-3">
          {supplier.contact_phone && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              asChild
            >
              <a href={`tel:${supplier.contact_phone}`}>
                <PhoneCall className="h-4 w-4" />
                Llamar
              </a>
            </Button>
          )}
          {supplier.contact_email && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              asChild
            >
              <a href={`mailto:${supplier.contact_email}`}>
                <Send className="h-4 w-4" />
                Email
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/new?supplier_id=${supplier.id}`)}
          >
            <Plus className="h-4 w-4" />
            Factura
          </Button>
        </div>
      </div>

      {/* Content scrollable */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Contacto */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {supplier.contact_phone && (
              <a
                href={`tel:${supplier.contact_phone}`}
                className="flex items-center gap-2 text-primary active:opacity-70"
              >
                <Phone className="h-4 w-4" />
                {supplier.contact_phone}
              </a>
            )}
            {supplier.contact_email && (
              <a
                href={`mailto:${supplier.contact_email}`}
                className="flex items-center gap-2 text-primary active:opacity-70 break-all"
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span className="text-sm">{supplier.contact_email}</span>
              </a>
            )}
          </CardContent>
        </Card>

        {/* Dirección */}
        {(supplier.city || supplier.province) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {[supplier.city, supplier.province]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Datos de facturación */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Facturación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Razón social</p>
              <p className="text-sm font-medium">{supplier.company_name}</p>
            </div>
            {supplier.tax_id && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">NIF/CIF</p>
                <p className="font-mono text-sm">{supplier.tax_id}</p>
              </div>
            )}
            {supplier.payment_terms && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Condiciones de pago</p>
                <p className="text-sm font-medium">{supplier.payment_terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Facturas de compra */}
        {purchaseInvoices.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Facturas de Compra ({purchaseInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {purchaseInvoices.slice(0, 5).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer active:opacity-70"
                  onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/${invoice.id}`)}
                >
                  <div>
                    <p className="font-medium text-sm">{invoice.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(invoice.issue_date).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(invoice.total)}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {purchaseInvoices.length > 5 && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => {
                    // TODO: Navegar a lista filtrada por proveedor
                    navigate(`/nexo-av/${userId}/purchase-invoices`);
                  }}
                >
                  Ver todas las facturas
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Información del registro */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Información del registro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creado</span>
              <span>
                {new Date(supplier.created_at).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
