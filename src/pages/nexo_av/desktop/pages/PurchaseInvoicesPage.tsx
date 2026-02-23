import { useState, useEffect, useMemo, Suspense, lazy } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Search,
  Loader2,
  FileText,
  TrendingDown,
  AlertCircle,
  Info,
  Upload,
  Camera,
  ChevronDown,
  Filter,
  Calendar,
  ExternalLink,
  ArrowUpDown,
  MoreVertical,
  Trash2,
  Eye,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { cn, toNumber } from "@/lib/utils";
import PaginationControls from "../components/common/PaginationControls";
import ConfirmActionDialog from "../components/common/ConfirmActionDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  getDocumentStatusInfo,
  calculatePaymentStatus,
  getPaymentStatusInfo,
  PURCHASE_DOCUMENT_STATUSES,
} from "@/constants/purchaseInvoiceStatuses";

const DocumentScanner = lazy(() => import("../components/common/DocumentScanner"));

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  internal_purchase_number: string | null;
  supplier_invoice_number: string | null;
  document_type: string;
  issue_date: string;
  due_date: string | null;
  tax_base: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  provider_id: string | null;
  provider_name: string | null;
  provider_type: string | null;
  provider_tax_id: string | null;
  file_path: string | null;
  file_name: string | null;
  project_id: string | null;
  project_name: string | null;
  project_number: string | null;
  client_name: string | null;
  expense_category: string | null;
  is_locked: boolean;
  created_at: string;
}

const PurchaseInvoicesPageDesktop = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invoicesFromServer, setInvoicesFromServer] = useState<PurchaseInvoice[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [showScanner, setShowScanner] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("INVOICE"); // Por defecto solo Facturas de compra (no tickets; tickets en Gastos)
  const [paymentFilter, setPaymentFilter] = useState("all"); // all, pending, paid, partial
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<PurchaseInvoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** Si falla el guardado en BD tras subir el archivo, guardamos datos para reintentar sin borrar el documento */
  const [uploadRetryPending, setUploadRetryPending] = useState<{
    filePath: string;
    fileName: string;
    documentType: "INVOICE" | "EXPENSE";
  } | null>(null);
  const [retryingUpload, setRetryingUpload] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [debouncedSearchQuery, statusFilter, typeFilter, paymentFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        p_search: debouncedSearchQuery || null,
        p_status: statusFilter === "all" ? null : statusFilter,
        p_supplier_id: null,
        p_technician_id: null,
        p_document_type: typeFilter === "all" ? null : typeFilter,
        p_page: 1,
        p_page_size: 5000,
      };
      const { data, error } = await supabase.rpc("list_purchase_invoices", params);
      if (error) throw error;

      // Aplicar filtro de estado de pago
      let filteredData = (data || []) as any[];
      if (paymentFilter === "pending") {
        // Pendiente de pago: tiene saldo pendiente > 0
        filteredData = filteredData.filter((inv: any) => inv.pending_amount > 0);
      } else if (paymentFilter === "paid") {
        // Pagado completamente: pending_amount = 0 o negativo (para facturas negativas)
        filteredData = filteredData.filter((inv: any) =>
          inv.pending_amount <= 0 || inv.status === 'PAID'
        );
      } else if (paymentFilter === "partial") {
        // Parcialmente pagado: tiene pagos pero no está completo
        filteredData = filteredData.filter((inv: any) =>
          inv.paid_amount > 0 && inv.pending_amount > 0
        );
      }

      setInvoicesFromServer(filteredData as PurchaseInvoice[]);
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
    if (!userId) {
      toast({
        title: "Error",
        description: "No se ha identificado al usuario",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error("Usuario no autenticado");
      }
      const authUserId = authUser.id;

      const isFile = fileOrBlob instanceof File;
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      const maxSize = 50 * 1024 * 1024;

      if (isFile) {
        const file = fileOrBlob as File;
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Tipo de archivo no permitido. Solo se permiten: PDF, JPEG, PNG, WEBP`);
        }
        if (file.size > maxSize) {
          throw new Error(`El archivo es demasiado grande. Tamaño máximo: 50MB`);
        }
      }

      const extension = isFile
        ? (fileOrBlob as File).name.split('.').pop()?.toLowerCase() || 'pdf'
        : 'jpg';
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `invoice_${timestamp}_${randomSuffix}.${extension}`;
      const filePath = `${authUserId}/${fileName}`;
      let newInvoiceId: string | null = null;

      const { error: uploadError } = await supabase.storage
        .from('purchase-documents')
        .upload(filePath, fileOrBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        if (uploadError.message.includes('already exists')) {
          const newFileName = `invoice_${timestamp}_${Math.random().toString(36).substring(2, 10)}.${extension}`;
          const newFilePath = `${authUserId}/${newFileName}`;
          const { error: retryError } = await supabase.storage
            .from('purchase-documents')
            .upload(newFilePath, fileOrBlob);

          if (retryError) throw retryError;

          const { data: provNum, error: numErr } = await supabase.rpc('get_next_provisional_purchase_number', {});
          if (numErr || !provNum) throw new Error(numErr?.message || 'No se pudo obtener el número');
          const { data: createdId, error: dbError } = await (supabase.rpc as any)('create_purchase_invoice', {
            p_invoice_number: provNum,
            p_document_type: 'INVOICE',
            p_status: 'PENDING',
            p_file_path: newFilePath,
            p_file_name: newFileName,
            p_site_id: null,
          });

          if (dbError) {
            setUploadRetryPending({
              filePath: newFilePath,
              fileName: newFileName,
              documentType: typeFilter === 'EXPENSE' ? 'EXPENSE' : 'INVOICE',
            });
            toast({
              title: "Error al guardar el registro",
              description: "El documento se subió pero no se pudo guardar. Usa «Reintentar guardado».",
              variant: "destructive",
            });
            return;
          }
          newInvoiceId = createdId ?? null;
          setUploadRetryPending(null);
          toast({
            title: "Documento guardado",
            description: "Completa los datos de la factura (proveedor, líneas, etc.) y guarda.",
          });
          setShowScanner(false);
          fetchInvoices();
          if (newInvoiceId && userId) navigate(`/nexo-av/${userId}/purchase-invoices/${newInvoiceId}`);
          return;
        } else {
          throw uploadError;
        }
      } else {
        const { data: provNum, error: numErr } = await supabase.rpc('get_next_provisional_purchase_number', {});
        if (numErr || !provNum) throw new Error(numErr?.message || 'No se pudo obtener el número');
        const { data: createdId, error: dbError } = await (supabase.rpc as any)('create_purchase_invoice', {
          p_invoice_number: provNum,
          p_document_type: 'INVOICE',
          p_status: 'PENDING',
          p_file_path: filePath,
          p_file_name: fileName,
          p_site_id: null,
        });

        if (dbError) {
          // NUNCA borrar el archivo: si falla la BD el documento sigue en el servidor y se puede reintentar
          setUploadRetryPending({
            filePath,
            fileName,
            documentType: typeFilter === "EXPENSE" ? "EXPENSE" : "INVOICE",
          });
          toast({
            title: "Error al guardar el registro",
            description: "El documento se subió correctamente pero no se pudo guardar en la base de datos. No se ha borrado el archivo. Usa «Reintentar guardado» para intentar de nuevo.",
            variant: "destructive",
          });
          return;
        }
        newInvoiceId = createdId ?? null;
      }

      setUploadRetryPending(null);
      toast({
        title: "Documento guardado",
        description: "Completa los datos de la factura (proveedor, líneas, etc.) y guarda.",
      });
      setShowScanner(false);
      fetchInvoices();
      if (newInvoiceId && userId) navigate(`/nexo-av/${userId}/purchase-invoices/${newInvoiceId}`);
    } catch (error: any) {
      console.error("Upload error:", error);
      let errorMessage = "Error al subir el documento";

      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRetryPendingUpload = async () => {
    if (!uploadRetryPending) return;
    try {
      setRetryingUpload(true);
      const { data: provNum, error: numErr } = await supabase.rpc("get_next_provisional_purchase_number", {});
      if (numErr || !provNum) throw new Error(numErr?.message || "No se pudo obtener el número");
      const { data: newInvoiceId, error: dbError } = await (supabase.rpc as any)("create_purchase_invoice", {
        p_invoice_number: provNum,
        p_document_type: "INVOICE",
        p_status: "PENDING",
        p_file_path: uploadRetryPending.filePath,
        p_file_name: uploadRetryPending.fileName,
        p_site_id: null,
      });
      if (dbError) throw dbError;
      setUploadRetryPending(null);
      toast({
        title: "Documento guardado",
        description: "Completa los datos de la factura y guarda.",
      });
      fetchInvoices();
      if (newInvoiceId && userId) navigate(`/nexo-av/${userId}/purchase-invoices/${newInvoiceId}`);
    } catch (error: any) {
      console.error("Retry upload error:", error);
      toast({
        title: "Error al reintentar",
        description: error?.message ?? "No se pudo guardar. Vuelve a intentarlo más tarde.",
        variant: "destructive",
      });
    } finally {
      setRetryingUpload(false);
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

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const canDeleteInvoice = (invoice: PurchaseInvoice) => {
    return invoice.status === "DRAFT" || invoice.status === "PENDING";
  };

  const handleDeleteClick = (invoice: PurchaseInvoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return;

    try {
      setDeleting(true);

      // Delete the purchase invoice using RPC
      const { error } = await supabase.rpc("delete_purchase_invoice", {
        p_invoice_id: invoiceToDelete.id,
      });

      if (error) throw error;

      // Also delete the file from storage if it exists
      if (invoiceToDelete.file_path) {
        await supabase.storage
          .from("purchase-documents")
          .remove([invoiceToDelete.file_path]);
      }

      toast({
        title: "Factura eliminada",
        description: "La factura de compra ha sido eliminada correctamente.",
      });

      fetchInvoices();
    } catch (error: any) {
      console.error("Error deleting purchase invoice:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la factura",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  // Filtro por fecha de factura (issue_date) — aplicado en cliente
  const invoices = useMemo(() => {
    let list = invoicesFromServer;
    if (dateFrom) {
      list = list.filter((inv) => inv.issue_date && inv.issue_date >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((inv) => inv.issue_date && inv.issue_date <= dateTo);
    }
    return list;
  }, [invoicesFromServer, dateFrom, dateTo]);

  const sortedInvoices = [...invoices].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case "date":
        aValue = a.issue_date ? new Date(a.issue_date).getTime() : 0;
        bValue = b.issue_date ? new Date(b.issue_date).getTime() : 0;
        break;
      case "number":
        aValue = a.invoice_number || "";
        bValue = b.invoice_number || "";
        break;
      case "provider":
        aValue = a.provider_name || "";
        bValue = b.provider_name || "";
        break;
      case "project":
        aValue = a.project_name || "";
        bValue = b.project_name || "";
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "total":
        aValue = a.total;
        bValue = b.total;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedInvoices,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(sortedInvoices, { pageSize: 50 });

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-6">
      <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
        {uploadRetryPending && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Documento subido pero no guardado</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2 mt-1">
              <span>El archivo está en el servidor. Puedes reintentar guardar el registro sin volver a subir.</span>
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={handleRetryPendingUpload}
                disabled={retryingUpload}
              >
                {retryingUpload ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reintentar guardado"}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <div>
          {/* Summary Metric Cards - Clickable Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <div
              className={cn(
                "border rounded-lg p-2 cursor-pointer transition-all",
                paymentFilter === "all" && statusFilter === "all"
                  ? "bg-card/50 border-border"
                  : "bg-card/30 border-border/30 opacity-60 hover:opacity-80"
              )}
              onClick={() => { setPaymentFilter("all"); setStatusFilter("all"); }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-red-500/10 rounded text-red-500">
                  <TrendingDown className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Total Compras</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">
                  {invoices.length}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1">documentos</span>
              </div>
            </div>

            <div
              className={cn(
                "border rounded-lg p-2 cursor-pointer transition-all",
                paymentFilter === "pending"
                  ? "bg-card/50 border-amber-500/30 ring-1 ring-amber-500/20"
                  : "bg-card/30 border-border/30 opacity-60 hover:opacity-80"
              )}
              onClick={() => { setPaymentFilter("pending"); setStatusFilter("all"); }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-amber-500/10 rounded text-amber-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Pendiente de Pago</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">
                  {invoices.filter(i => i.pending_amount > 0 && i.status !== 'DRAFT' && i.status !== 'CANCELLED').length}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1">facturas</span>
              </div>
            </div>

            <div
              className={cn(
                "border rounded-lg p-2 cursor-pointer transition-all",
                "bg-card/30 border-border/30 opacity-60 hover:opacity-80"
              )}
              onClick={() => { setPaymentFilter("all"); setStatusFilter("all"); }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-red-500/10 rounded text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Vencido</span>
              </div>
              <div>
                <span className="text-base font-bold text-red-500">
                  {invoices.filter(inv => {
                    if (inv.status === 'PAID' || inv.status === 'DRAFT' || inv.status === 'CANCELLED') return false;
                    if (!inv.due_date || inv.pending_amount <= 0) return false;
                    return new Date(inv.due_date) < new Date();
                  }).length}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1">
                  Requiere atención
                </span>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Facturas de Compra</h1>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="desktop-upload"
                  className="hidden"
                  accept="application/pdf,image/*"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                <Button
                  onClick={() => document.getElementById('desktop-upload')?.click()}
                  disabled={uploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-sm font-medium"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1.5" />
                  )}
                  Nueva factura
                  <span className="ml-2 text-xs opacity-70">N</span>
                </Button>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-xs",
                      statusFilter !== "all" && "bg-accent"
                    )}
                  >
                    {statusFilter === "all"
                      ? "Todos"
                      : PURCHASE_DOCUMENT_STATUSES.find(s => s.value === statusFilter)?.label || statusFilter}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("all")}
                    className={cn(statusFilter === "all" && "bg-accent")}
                  >
                    Todos los estados
                  </DropdownMenuItem>
                  {PURCHASE_DOCUMENT_STATUSES.map((status) => (
                    <DropdownMenuItem
                      key={status.value}
                      onClick={() => setStatusFilter(status.value)}
                      className={cn(statusFilter === status.value && "bg-accent")}
                    >
                      {status.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-xs",
                      typeFilter !== "all" && "bg-accent"
                    )}
                  >
                    {typeFilter === "all" ? "Tipo" : typeFilter === "INVOICE" ? "Factura" : "Gasto"}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => setTypeFilter("all")}
                    className={cn(typeFilter === "all" && "bg-accent")}
                  >
                    Todos los tipos
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setTypeFilter("INVOICE")}
                    className={cn(typeFilter === "INVOICE" && "bg-accent")}
                  >
                    Factura
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setTypeFilter("EXPENSE")}
                    className={cn(typeFilter === "EXPENSE" && "bg-accent")}
                  >
                    Gasto / Ticket
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Filtro de Estado de Pago */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-xs",
                      paymentFilter !== "all" && "bg-amber-500/20 border-amber-500/50 text-amber-400"
                    )}
                  >
                    {paymentFilter === "all"
                      ? "Pagos"
                      : paymentFilter === "pending"
                        ? "Pendiente"
                        : paymentFilter === "partial"
                          ? "Parcial"
                          : "Pagado"}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => setPaymentFilter("all")}
                    className={cn(paymentFilter === "all" && "bg-accent")}
                  >
                    Todos los pagos
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setPaymentFilter("pending")}
                    className={cn(
                      paymentFilter === "pending" && "bg-accent",
                      "text-amber-400"
                    )}
                  >
                    🔴 Pendiente de pago
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setPaymentFilter("partial")}
                    className={cn(
                      paymentFilter === "partial" && "bg-accent",
                      "text-orange-400"
                    )}
                  >
                    🟠 Parcialmente pagado
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setPaymentFilter("paid")}
                    className={cn(
                      paymentFilter === "paid" && "bg-accent",
                      "text-emerald-400"
                    )}
                  >
                    🟢 Pagado
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar facturas..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pr-11"
                />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-xs",
                      (dateFrom || dateTo) && "bg-accent"
                    )}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    {dateFrom && dateTo
                      ? `${dateFrom} — ${dateTo}`
                      : dateFrom
                        ? `Desde ${dateFrom}`
                        : dateTo
                          ? `Hasta ${dateTo}`
                          : "Fechas"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Desde</Label>
                      <Input
                        type="date"
                        value={dateFrom ?? ""}
                        onChange={(e) => setDateFrom(e.target.value || null)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hasta</Label>
                      <Input
                        type="date"
                        value={dateTo ?? ""}
                        onChange={(e) => setDateTo(e.target.value || null)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs w-full"
                      onClick={() => {
                        setDateFrom(null);
                        setDateTo(null);
                      }}
                    >
                      Limpiar fechas
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay facturas de compra</p>
              <p className="text-muted-foreground text-sm mt-1">
                Sube una factura para comenzar
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border bg-card/30">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead
                        className="text-muted-foreground text-xs font-medium cursor-pointer w-[90px]"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1">
                          Fecha
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-muted-foreground text-xs font-medium cursor-pointer w-[260px]"
                        title="PENDIENTE/C-BORR (borrador) o C-YY-XXXXXX (aprobada). Tickets: TICKET-BORR / TICKET-YY-XXXXXX en Gastos."
                        onClick={() => handleSort("number")}
                      >
                        <div className="flex items-center gap-1">
                          Nº compra
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-muted-foreground text-xs font-medium cursor-pointer w-[180px]"
                        onClick={() => handleSort("provider")}
                      >
                        <div className="flex items-center gap-1">
                          Proveedor
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-muted-foreground text-xs font-medium cursor-pointer w-[100px]"
                        onClick={() => handleSort("project")}
                      >
                        <div className="flex items-center gap-1">
                          Proyecto
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-muted-foreground text-xs font-medium cursor-pointer w-[160px]"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center gap-1">
                          Estado
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium w-[90px]">
                        Vencimiento
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium w-[80px]">
                        Pagos
                      </TableHead>
                      <TableHead
                        className="text-muted-foreground text-xs font-medium text-right cursor-pointer w-[90px]"
                        onClick={() => handleSort("total")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Total
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium text-right w-[90px]">
                        Pendiente
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => {
                      const docStatusInfo = getDocumentStatusInfo(invoice.status);
                      const paymentStatus = calculatePaymentStatus(
                        invoice.paid_amount,
                        invoice.total,
                        invoice.due_date,
                        invoice.status
                      );
                      const paymentStatusInfo = getPaymentStatusInfo(paymentStatus);

                      return (
                        <TableRow
                          key={invoice.id}
                          className="border-border hover:bg-accent/50 cursor-pointer"
                          onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/${invoice.id}`)}
                        >
                          <TableCell className="text-foreground text-sm py-3 w-[90px]">
                            {formatDate(invoice.issue_date)}
                          </TableCell>
                          <TableCell className="text-sm py-3 w-[260px] max-w-[260px]">
                            <div className="truncate">
                              <span className="text-foreground font-medium">
                                {invoice.internal_purchase_number || invoice.invoice_number || "—"}
                              </span>
                              {!(invoice.internal_purchase_number) && invoice.invoice_number && (invoice.invoice_number.startsWith("PENDIENTE-") || invoice.invoice_number.startsWith("TICKET-BORR-") || invoice.invoice_number.startsWith("C-BORR-")) && (
                                <span className="text-muted-foreground text-xs ml-1">(borrador)</span>
                              )}
                              {invoice.supplier_invoice_number && (
                                <span className="text-muted-foreground text-xs ml-1">
                                  ({invoice.supplier_invoice_number})
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm py-3 w-[180px] max-w-[180px]">
                            <span className="text-foreground truncate block">
                              {invoice.provider_name || "Sin proveedor"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm py-3 w-[100px]">
                            {invoice.project_number ? (
                              <span className="text-foreground font-mono text-xs">{invoice.project_number}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 w-[160px]">
                            <div className="purchase-status-badges">
                              <Badge
                                variant="outline"
                                className={cn("purchase-status-badge purchase-status-badge--document", docStatusInfo.className)}
                              >
                                {docStatusInfo.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm py-3 w-[90px]">
                            <span className={cn(
                              "text-foreground",
                              invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.pending_amount > 0 && "text-destructive font-medium"
                            )}>
                              {formatDate(invoice.due_date)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 w-[80px]">
                            {paymentStatusInfo ? (
                              <Badge
                                variant="outline"
                                className={cn("purchase-status-badge purchase-status-badge--payment", paymentStatusInfo.className)}
                              >
                                {paymentStatusInfo.label}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-foreground text-sm font-medium text-right py-3">
                            {formatCurrency(invoice.total)}
                          </TableCell>
                          <TableCell className="text-sm text-right py-3">
                            {invoice.pending_amount > 0 ? (
                              <span className="text-muted-foreground font-medium">
                                {formatCurrency(invoice.pending_amount)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
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
                                  onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/${invoice.id}`)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalles
                                </DropdownMenuItem>
                                {canDeleteInvoice(invoice) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => handleDeleteClick(invoice, e)}
                                      className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/50">
                      <td className="text-xs font-bold text-muted-foreground py-2.5 px-3 uppercase" colSpan={7}>
                        Totales ({invoices.length})
                      </td>
                      <td className="text-sm font-bold text-foreground text-right py-2.5 px-3">
                        {formatCurrency(invoices.reduce((s, i) => s + toNumber(i.total), 0))}
                      </td>
                      <td className="text-sm font-bold text-muted-foreground text-right py-2.5 px-3">
                        {formatCurrency(invoices.reduce((s, i) => s + toNumber(i.pending_amount), 0))}
                      </td>
                      <td className="py-2.5 px-3"></td>
                    </tr>
                  </tfoot>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onGoToPage={goToPage}
                    onNextPage={nextPage}
                    onPrevPage={prevPage}
                    canGoNext={canGoNext}
                    canGoPrev={canGoPrev}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    totalItems={totalItems}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showScanner && (
          <Suspense fallback={
            <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          }>
            <DocumentScanner
              onCapture={handleUpload}
              onCancel={() => setShowScanner(false)}
              title="Escanear Factura"
            />
          </Suspense>
        )}
      </AnimatePresence>

      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar factura de compra"
        description={`¿Estás seguro de que deseas eliminar la factura "${invoiceToDelete?.internal_purchase_number || invoiceToDelete?.invoice_number || ''}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </div>
  );
};

export default PurchaseInvoicesPageDesktop;
