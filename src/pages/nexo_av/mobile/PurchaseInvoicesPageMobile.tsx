import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Loader2,
  Camera,
  Upload,
  FileText,
  TrendingDown,
  Building2,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import DocumentScanner from "../components/DocumentScanner";
import { cn } from "@/lib/utils";

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  document_type: string;
  issue_date: string;
  due_date: string | null;
  tax_base: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  provider_id: string;
  provider_name: string;
  provider_type: string;
  provider_tax_id: string;
  file_path: string | null;
  file_name: string | null;
  project_id: string | null;
  project_name: string | null;
  expense_category: string | null;
  is_locked: boolean;
  created_at: string;
}

const PurchaseInvoicesPageMobile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [showScanner, setShowScanner] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [debouncedSearchQuery, statusFilter, typeFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_purchase_invoices", {
        p_search: debouncedSearchQuery || null,
        p_status: statusFilter,
        p_document_type: typeFilter,
      });
      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error("Error fetching purchase invoices:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las facturas de compra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (fileOrBlob: File | Blob) => {
    if (!userId) return;
    try {
      setUploading(true);
      const isFile = fileOrBlob instanceof File;
      const extension = isFile ? (fileOrBlob as File).name.split('.').pop() : 'jpg';
      const fileName = `invoice_${Date.now()}.${extension}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('purchase-documents')
        .upload(filePath, fileOrBlob);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.rpc('create_purchase_invoice', {
        p_invoice_number: `PENDIENTE-${Date.now().toString().slice(-6)}`,
        p_document_type: typeFilter === 'EXPENSE' ? 'EXPENSE' : 'INVOICE',
        p_status: 'PENDING',
        p_file_path: filePath,
        p_file_name: fileName
      } as any);

      if (dbError) throw dbError;

      toast({
        title: "Éxito",
        description: "Documento subido correctamente. Pendiente de entrada de datos.",
      });
      setShowScanner(false);
      fetchInvoices();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Error al subir el documento: " + error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-500/10 text-emerald-400';
      case 'PARTIAL':
        return 'bg-amber-500/10 text-amber-500';
      case 'PENDING':
        return 'bg-blue-500/10 text-blue-400';
      default:
        return 'bg-zinc-500/10 text-zinc-400';
    }
  };

  const handleCardClick = (invoiceId: string) => {
    navigate(`/nexo-av/${userId}/purchase-invoices/${invoiceId}`);
  };

  const pendingCount = invoices.filter(i => i.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-3 py-3 space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Header con botón de subida */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold">Compras y Gastos</h1>
              <p className="text-xs text-muted-foreground">
                {invoices.length} documentos
                {pendingCount > 0 && (
                  <span className="ml-2 text-blue-400 font-medium">
                    • {pendingCount} pendientes
                  </span>
                )}
              </p>
            </div>
            <Button
              onClick={() => setShowScanner(true)}
              disabled={uploading}
              size="sm"
              className="h-10 px-4 gap-2"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              Escanear
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar factura, proveedor o proyecto..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-11 bg-card border-border text-foreground placeholder:text-muted-foreground h-10 text-xs"
            />
          </div>

          {/* Filters - Scrollable horizontal */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide">
            <Button
              variant={statusFilter === null ? "secondary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(null)}
              className={cn(
                "h-8 px-3 text-[10px] shrink-0",
                statusFilter === null
                  ? "bg-primary text-primary-foreground font-medium"
                  : "border-border text-muted-foreground"
              )}
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === 'PENDING' ? "secondary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter('PENDING')}
              className={cn(
                "h-8 px-3 text-[10px] shrink-0",
                statusFilter === 'PENDING'
                  ? "bg-blue-500 text-white font-medium"
                  : "border-border text-muted-foreground"
              )}
            >
              Pendientes {pendingCount > 0 && `(${pendingCount})`}
            </Button>
            <Button
              variant={statusFilter === 'REGISTERED' ? "secondary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter('REGISTERED')}
              className={cn(
                "h-8 px-3 text-[10px] shrink-0",
                statusFilter === 'REGISTERED'
                  ? "bg-primary text-primary-foreground font-medium"
                  : "border-border text-muted-foreground"
              )}
            >
              Registrado
            </Button>
            <Button
              variant={statusFilter === 'PARTIAL' ? "secondary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter('PARTIAL')}
              className={cn(
                "h-8 px-3 text-[10px] shrink-0",
                statusFilter === 'PARTIAL'
                  ? "bg-amber-500 text-white font-medium"
                  : "border-border text-muted-foreground"
              )}
            >
              Parcial
            </Button>
            <Button
              variant={statusFilter === 'PAID' ? "secondary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter('PAID')}
              className={cn(
                "h-8 px-3 text-[10px] shrink-0",
                statusFilter === 'PAID'
                  ? "bg-emerald-500 text-white font-medium"
                  : "border-border text-muted-foreground"
              )}
            >
              Pagado
            </Button>
          </div>

          {/* Type Filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide">
            <Button
              variant={typeFilter === null ? "secondary" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(null)}
              className={cn(
                "h-8 px-3 text-[10px] shrink-0",
                typeFilter === null
                  ? "bg-primary text-primary-foreground font-medium"
                  : "border-border text-muted-foreground"
              )}
            >
              Todos
            </Button>
            <Button
              variant={typeFilter === 'INVOICE' ? "secondary" : "outline"}
              size="sm"
              onClick={() => setTypeFilter('INVOICE')}
              className={cn(
                "h-8 px-3 text-[10px] shrink-0",
                typeFilter === 'INVOICE'
                  ? "bg-primary text-primary-foreground font-medium"
                  : "border-border text-muted-foreground"
              )}
            >
              Factura
            </Button>
            <Button
              variant={typeFilter === 'EXPENSE' ? "secondary" : "outline"}
              size="sm"
              onClick={() => setTypeFilter('EXPENSE')}
              className={cn(
                "h-8 px-3 text-[10px] shrink-0",
                typeFilter === 'EXPENSE'
                  ? "bg-amber-500 text-white font-medium"
                  : "border-border text-muted-foreground"
              )}
            >
              Gasto
            </Button>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No hay documentos registrados</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowScanner(true)}
              >
                <Camera className="h-4 w-4 mr-2" />
                Escanear documento
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <Card
                  key={inv.id}
                  className="cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => handleCardClick(inv.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {inv.document_type === 'INVOICE' ? (
                            <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-amber-400 shrink-0" />
                          )}
                          <span className="font-semibold text-sm truncate">{inv.invoice_number}</span>
                          {inv.status === 'PENDING' && (
                            <Badge className="bg-blue-500/10 text-blue-400 text-[9px] px-1.5 py-0 border-none">
                              Pendiente
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{inv.provider_name}</p>
                        {inv.provider_type === 'TECHNICIAN' && (
                          <Badge className="bg-violet-500/10 text-violet-400 text-[9px] px-1.5 py-0 border-none mt-1">
                            TÉCNICO
                          </Badge>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">{formatCurrency(inv.total)}</p>
                        <Badge className={cn("text-[9px] px-1.5 py-0 border-none mt-1", getStatusColor(inv.status))}>
                          {inv.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(inv.issue_date)}
                      </div>
                      {inv.project_name && (
                        <div className="flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{inv.project_name}</span>
                        </div>
                      )}
                      {inv.pending_amount > 0 && (
                        <span className="text-red-400 font-medium ml-auto">
                          Pend. {formatCurrency(inv.pending_amount)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {showScanner && (
        <DocumentScanner
          onCapture={handleUpload}
          onCancel={() => setShowScanner(false)}
          title="Escanear Factura"
        />
      )}
    </div>
  );
};

export default PurchaseInvoicesPageMobile;
