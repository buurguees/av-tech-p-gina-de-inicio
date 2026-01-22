import { useState, useEffect, Suspense, lazy } from "react";
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
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";
import PaginationControls from "../components/common/PaginationControls";

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

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  REGISTERED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PARTIAL: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  PAID: "bg-green-500/20 text-green-400 border-green-500/30",
  CANCELLED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  DRAFT: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  REGISTERED: "Registrado",
  PARTIAL: "Pago Parcial",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
  DRAFT: "Borrador",
};

const PurchaseInvoicesPageDesktop = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [showScanner, setShowScanner] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchInvoices();
  }, [debouncedSearchQuery, statusFilter, typeFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_purchase_invoices", {
        p_search: debouncedSearchQuery || null,
        p_status: statusFilter === "all" ? null : statusFilter,
        p_document_type: typeFilter === "all" ? null : typeFilter,
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
          
          const { error: dbError } = await supabase.rpc('create_purchase_invoice', {
            p_invoice_number: `PENDIENTE-${timestamp.toString().slice(-6)}`,
            p_document_type: typeFilter === 'EXPENSE' ? 'EXPENSE' : 'INVOICE',
            p_status: 'PENDING',
            p_file_path: newFilePath,
            p_file_name: newFileName
          });

          if (dbError) throw dbError;
        } else {
          throw uploadError;
        }
      } else {
        const { error: dbError } = await supabase.rpc('create_purchase_invoice', {
          p_invoice_number: `PENDIENTE-${timestamp.toString().slice(-6)}`,
          p_document_type: typeFilter === 'EXPENSE' ? 'EXPENSE' : 'INVOICE',
          p_status: 'PENDING',
          p_file_path: filePath,
          p_file_name: fileName
        });

        if (dbError) {
          await supabase.storage
            .from('purchase-documents')
            .remove([filePath]);
          throw dbError;
        }
      }

      toast({
        title: "Éxito",
        description: "Documento subido correctamente. Pendiente de entrada de datos.",
      });
      setShowScanner(false);
      fetchInvoices();
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
    <div className="w-full h-full">
      <div className="w-full px-6 py-6">
        <div>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-red-500/10 rounded text-red-500">
                  <TrendingDown className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Gasto Total</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.total || 0), 0))}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({invoices.length} documentos)
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-blue-500/10 rounded text-blue-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Pendiente de Pago</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.pending_amount || 0), 0))}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({invoices.filter(i => i.pending_amount > 0).length} facturas)
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-red-500/10 rounded text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">Vencido</span>
              </div>
              <div>
                <span className="text-base font-bold text-red-500">
                  {formatCurrency(invoices
                    .filter(inv => {
                      if (inv.status === 'PAID' || inv.status === 'DRAFT' || inv.status === 'CANCELLED') return false;
                      if (!inv.due_date) return false;
                      return new Date(inv.due_date) < new Date();
                    })
                    .reduce((sum, inv) => sum + (inv.total || 0), 0)
                  )}
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
                    {statusFilter === "all" ? "Todos" : STATUS_LABELS[statusFilter] || statusFilter}
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
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("PENDING")}
                    className={cn(statusFilter === "PENDING" && "bg-accent")}
                  >
                    Pendientes
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("REGISTERED")}
                    className={cn(statusFilter === "REGISTERED" && "bg-accent")}
                  >
                    Registrado
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("PARTIAL")}
                    className={cn(statusFilter === "PARTIAL" && "bg-accent")}
                  >
                    Pago Parcial
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("PAID")}
                    className={cn(statusFilter === "PAID" && "bg-accent")}
                  >
                    Pagado
                  </DropdownMenuItem>
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

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
              >
                <Filter className="h-3 w-3 mr-1" />
                Filtro
              </Button>

              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar facturas..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pr-11 h-8 text-xs"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                01/12/2025 - 31/12/2025
              </Button>
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
              <div className="rounded-lg border border-border overflow-hidden bg-card/30">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead 
                        className="text-muted-foreground text-xs font-medium cursor-pointer"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1">
                          Fecha
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-muted-foreground text-xs font-medium cursor-pointer"
                        onClick={() => handleSort("number")}
                      >
                        <div className="flex items-center gap-1">
                          Número
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-muted-foreground text-xs font-medium cursor-pointer"
                        onClick={() => handleSort("provider")}
                      >
                        <div className="flex items-center gap-1">
                          Proveedor
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-muted-foreground text-xs font-medium cursor-pointer"
                        onClick={() => handleSort("project")}
                      >
                        <div className="flex items-center gap-1">
                          Proyecto
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-muted-foreground text-xs font-medium cursor-pointer"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center gap-1">
                          Estado
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-muted-foreground text-xs font-medium text-right cursor-pointer"
                        onClick={() => handleSort("total")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Total
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium text-right">
                        Pendiente
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className="border-border hover:bg-accent/50 cursor-pointer"
                        onClick={() => navigate(`/nexo/${userId}/purchase-invoices/${invoice.id}`)}
                      >
                        <TableCell className="text-foreground text-sm py-3">
                          {formatDate(invoice.issue_date)}
                        </TableCell>
                        <TableCell className="text-sm py-3">
                          <div>
                            <span className="text-foreground font-medium">
                              {invoice.internal_purchase_number || invoice.invoice_number || "—"}
                            </span>
                            {invoice.supplier_invoice_number && (
                              <span className="text-muted-foreground text-xs ml-1">
                                ({invoice.supplier_invoice_number})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground text-sm py-3">
                          {invoice.provider_name || "Sin proveedor"}
                        </TableCell>
                        <TableCell className="text-sm py-3">
                          {invoice.project_name ? (
                            <span className="text-foreground">{invoice.project_name}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-2 py-0.5", STATUS_STYLES[invoice.status])}
                          >
                            {STATUS_LABELS[invoice.status] || invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground text-sm font-medium text-right py-3">
                          {formatCurrency(invoice.total)}
                        </TableCell>
                        <TableCell className="text-sm text-right py-3">
                          {invoice.pending_amount > 0 ? (
                            <span className="text-orange-400 font-medium">
                              {formatCurrency(invoice.pending_amount)}
                            </span>
                          ) : (
                            <span className="text-green-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/nexo/${userId}/purchase-invoices/${invoice.id}`);
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
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
    </div>
  );
};

export default PurchaseInvoicesPageDesktop;
