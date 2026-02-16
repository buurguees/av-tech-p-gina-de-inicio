import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  ChevronRight,
  Hash,
  CreditCard,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryInfo, getSupplierStatusInfo } from "@/constants/supplierConstants";
import { getDocumentStatusInfo } from "@/constants/purchaseInvoiceStatuses";

interface SupplierDetail {
  id: string;
  company_name: string;
  legal_name: string | null;
  supplier_number: string;
  category: string | null;
  status: string;
  tax_id: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  province: string | null;
  payment_terms: string | null;
  created_at: string;
}

interface LinkedInvoice {
  id: string;
  internal_purchase_number: string;
  invoice_number: string;
  total: number;
  status: string;
  issue_date: string;
  project_name: string | null;
}

const MobileSupplierDetailPage = () => {
  const { userId, supplierId } = useParams<{ userId: string; supplierId: string }>();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [invoices, setInvoices] = useState<LinkedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  useEffect(() => {
    if (!supplierId) return;

    const fetchSupplier = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc("list_suppliers", {
          p_search: null,
          p_status: null,
          p_category: null,
          p_page: 1,
          p_page_size: 500,
        });
        if (error) throw error;
        const found = ((data || []) as unknown as SupplierDetail[]).find((s) => s.id === supplierId);
        setSupplier(found || null);
      } catch (e) {
        console.error("Error fetching supplier:", e);
      } finally {
        setLoading(false);
      }
    };

    const fetchInvoices = async () => {
      try {
        setLoadingInvoices(true);
        const { data, error } = await supabase.rpc("list_purchase_invoices", {
          p_search: null,
          p_status: null,
          p_supplier_id: supplierId,
          p_technician_id: null,
          p_document_type: null,
          p_page: 1,
          p_page_size: 100,
        });
        if (error) throw error;
        setInvoices(((data || []) as unknown) as LinkedInvoice[]);
      } catch (e) {
        console.error("Error fetching supplier invoices:", e);
      } finally {
        setLoadingInvoices(false);
      }
    };

    fetchSupplier();
    fetchInvoices();
  }, [supplierId]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">Proveedor no encontrado</p>
        <button onClick={() => navigate(`/nexo-av/${userId}/suppliers`)} className="text-primary underline">
          Volver a proveedores
        </button>
      </div>
    );
  }

  const catInfo = getCategoryInfo(supplier.category);
  const statusInfo = getSupplierStatusInfo(supplier.status);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/nexo-av/${userId}/suppliers`)}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
              "text-white/90 hover:text-white hover:bg-white/15",
              "active:scale-95 transition-all duration-200",
              "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]"
            )}
            style={{ touchAction: "manipulation" }}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Atrás</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium text-foreground truncate leading-tight">
              {supplier.company_name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono text-muted-foreground">{supplier.supplier_number}</span>
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusInfo.bgColor, statusInfo.color)}>
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-[80px] space-y-4">
        {/* Category */}
        {catInfo && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Categoría</p>
            <Badge variant="outline" className={cn("text-xs", catInfo.bgColor, catInfo.color)}>
              {catInfo.label}
            </Badge>
          </div>
        )}

        {/* Contact Actions */}
        <div className="grid grid-cols-2 gap-2">
          {supplier.phone && (
            <a
              href={`tel:${supplier.phone}`}
              className={cn(
                "flex items-center justify-center gap-2 p-3 rounded-xl",
                "bg-green-500/10 border border-green-500/20 text-green-500",
                "active:scale-95 transition-all"
              )}
              style={{ touchAction: "manipulation" }}
            >
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">Llamar</span>
            </a>
          )}
          {supplier.email && (
            <a
              href={`mailto:${supplier.email}`}
              className={cn(
                "flex items-center justify-center gap-2 p-3 rounded-xl",
                "bg-blue-500/10 border border-blue-500/20 text-blue-500",
                "active:scale-95 transition-all"
              )}
              style={{ touchAction: "manipulation" }}
            >
              <Mail className="h-4 w-4" />
              <span className="text-sm font-medium">Email</span>
            </a>
          )}
        </div>

        {/* Info */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          {supplier.legal_name && supplier.legal_name !== supplier.company_name && (
            <div>
              <p className="text-xs text-muted-foreground">Razón social</p>
              <p className="text-sm text-foreground">{supplier.legal_name}</p>
            </div>
          )}
          {supplier.tax_id && (
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">CIF/NIF</p>
                <p className="text-sm text-foreground">{supplier.tax_id}</p>
              </div>
            </div>
          )}
          {(supplier.city || supplier.province) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Ubicación</p>
                <p className="text-sm text-foreground">
                  {[supplier.city, supplier.province].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          )}
          {supplier.payment_terms && (
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Condiciones de pago</p>
                <p className="text-sm text-foreground">{supplier.payment_terms}</p>
              </div>
            </div>
          )}
        </div>

        {/* Linked Invoices */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Facturas de compra
          </h2>
          {loadingInvoices ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin facturas vinculadas</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const docStatus = getDocumentStatusInfo(inv.status);
                return (
                  <button
                    key={inv.id}
                    onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/${inv.id}`)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl",
                      "bg-card border border-border",
                      "active:scale-[0.98] transition-all duration-200"
                    )}
                    style={{ touchAction: "manipulation" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {inv.internal_purchase_number || inv.invoice_number}
                          </span>
                          <Badge variant="outline" className={cn(docStatus.className, "text-[10px] px-1.5 py-0")}>
                            {docStatus.label}
                          </Badge>
                        </div>
                        {inv.project_name && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">📁 {inv.project_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(inv.total)}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileSupplierDetailPage;
