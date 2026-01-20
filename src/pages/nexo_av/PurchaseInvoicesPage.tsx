import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
  Filter,
  FileText,
  FileSearch,
  Calendar,
  Building2,
  ExternalLink,
  Lock,
  Eye,
  MoreVertical,
  ChevronRight,
  TrendingDown,
  Camera,
  Upload,
  Info,
  AlertCircle,
  CheckCircle,
  CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePagination } from "@/hooks/usePagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createMobilePage } from "./MobilePageWrapper";
import PaginationControls from "./components/PaginationControls";
import RegisterPurchasePaymentDialog from "./components/RegisterPurchasePaymentDialog";

const PurchaseInvoicesPageMobile = lazy(() => import("./mobile/PurchaseInvoicesPageMobile"));
const DocumentScanner = lazy(() => import("./components/DocumentScanner"));

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  document_type: string;
  issue_date: string;
  due_date: string | null;
  tax_base: number;
  tax_amount: number; // IVA total
  retention_amount?: number; // IRPF total (retention_amount en la RPC)
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
  project_number: string | null;
  client_name: string | null;
  expense_category: string | null;
  is_locked: boolean;
  created_at: string;
  total_count: number;
}

const PurchaseInvoicesPageDesktop = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const isMobile = useIsMobile();
  const [showScanner, setShowScanner] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
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

      // Obtener el auth.uid() del usuario actual para las políticas RLS
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error("Usuario no autenticado");
      }
      const authUserId = authUser.id;

      // Validar tipo de archivo
      const isFile = fileOrBlob instanceof File;
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      const maxSize = 50 * 1024 * 1024; // 50MB

      if (isFile) {
        const file = fileOrBlob as File;
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Tipo de archivo no permitido. Solo se permiten: PDF, JPEG, PNG, WEBP`);
        }
        if (file.size > maxSize) {
          throw new Error(`El archivo es demasiado grande. Tamaño máximo: 50MB`);
        }
      }

      // Generar nombre de archivo único
      // Usar authUserId para la carpeta (requerido por políticas RLS)
      const extension = isFile 
        ? (fileOrBlob as File).name.split('.').pop()?.toLowerCase() || 'pdf'
        : 'jpg';
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `invoice_${timestamp}_${randomSuffix}.${extension}`;
      const filePath = `${authUserId}/${fileName}`;

      // Subir archivo a Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('purchase-documents')
        .upload(filePath, fileOrBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        // Si el archivo ya existe, intentar con otro nombre
        if (uploadError.message.includes('already exists')) {
          const newFileName = `invoice_${timestamp}_${Math.random().toString(36).substring(2, 10)}.${extension}`;
          const newFilePath = `${authUserId}/${newFileName}`;
          const { error: retryError } = await supabase.storage
            .from('purchase-documents')
            .upload(newFilePath, fileOrBlob);
          
          if (retryError) throw retryError;
          
          // Usar el nuevo path
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
        // Crear registro en la base de datos
        const { error: dbError } = await supabase.rpc('create_purchase_invoice', {
          p_invoice_number: `PENDIENTE-${timestamp.toString().slice(-6)}`,
          p_document_type: typeFilter === 'EXPENSE' ? 'EXPENSE' : 'INVOICE',
          p_status: 'PENDING',
          p_file_path: filePath,
          p_file_name: fileName
        });

        if (dbError) {
          // Si falla la creación en BD, eliminar el archivo subido
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(new Set(paginatedInvoices.map(i => i.id)));
    } else {
      setSelectedInvoices(new Set());
    }
  };

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    const newSelected = new Set(selectedInvoices);
    if (checked) {
      newSelected.add(invoiceId);
    } else {
      newSelected.delete(invoiceId);
    }
    setSelectedInvoices(newSelected);
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

  // Pagination (50 records per page)
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
          {/* Summary Metric Cards - Optimizado */}
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
          {/* Header - Estilo Holded */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Facturas de Compra</h1>
                <Info className="h-4 w-4 text-white/40" />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="desktop-upload"
                  className="hidden"
                  accept="application/pdf,image/*"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                      Acciones
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                    <DropdownMenuItem className="text-white hover:bg-white/10">
                      Exportar seleccionadas
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-white hover:bg-white/10">
                      Duplicar seleccionadas
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={() => isMobile ? setShowScanner(true) : document.getElementById('desktop-upload')?.click()}
                  disabled={uploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-sm font-medium"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : isMobile ? (
                    <Camera className="h-4 w-4 mr-1.5" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1.5" />
                  )}
                  Nueva factura
                  <span className="ml-2 text-xs opacity-70">N</span>
                </Button>
              </div>
            </div>

            {/* Search and Filters Bar - Estilo Holded */}
            <div className="flex items-center gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-xs border-white/20 text-white/70 hover:bg-white/10",
                      statusFilter !== "all" && "bg-white/10 text-white"
                    )}
                  >
                    {statusFilter === "all" ? "Todos" : statusFilter}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-zinc-900 border-white/10">
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("all")}
                    className={cn("text-white hover:bg-white/10", statusFilter === "all" && "bg-white/10")}
                  >
                    Todos los estados
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("PENDING")}
                    className={cn("text-white hover:bg-white/10", statusFilter === "PENDING" && "bg-white/10")}
                  >
                    Pendientes
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("REGISTERED")}
                    className={cn("text-white hover:bg-white/10", statusFilter === "REGISTERED" && "bg-white/10")}
                  >
                    Registrado
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("PARTIAL")}
                    className={cn("text-white hover:bg-white/10", statusFilter === "PARTIAL" && "bg-white/10")}
                  >
                    Pago Parcial
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("PAID")}
                    className={cn("text-white hover:bg-white/10", statusFilter === "PAID" && "bg-white/10")}
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
                      "h-8 px-3 text-xs border-white/20 text-white/70 hover:bg-white/10",
                      typeFilter !== "all" && "bg-white/10 text-white"
                    )}
                  >
                    {typeFilter === "all" ? "Tipo" : typeFilter === "INVOICE" ? "Factura" : "Gasto"}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-zinc-900 border-white/10">
                  <DropdownMenuItem
                    onClick={() => setTypeFilter("all")}
                    className={cn("text-white hover:bg-white/10", typeFilter === "all" && "bg-white/10")}
                  >
                    Todos los tipos
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setTypeFilter("INVOICE")}
                    className={cn("text-white hover:bg-white/10", typeFilter === "INVOICE" && "bg-white/10")}
                  >
                    Factura
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setTypeFilter("EXPENSE")}
                    className={cn("text-white hover:bg-white/10", typeFilter === "EXPENSE" && "bg-white/10")}
                  >
                    Gasto / Ticket
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs border-white/20 text-white/70 hover:bg-white/10"
              >
                <Filter className="h-3 w-3 mr-1" />
                Filtro
              </Button>

              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Buscar facturas..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pr-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 h-8 text-xs"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs border-white/20 text-white/70 hover:bg-white/10"
              >
                <Calendar className="h-3 w-3 mr-1" />
                01/12/2025 - 31/12/2025
              </Button>
            </div>
          </div>


          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-white/20 mb-4" />
              <p className="text-white/60">No hay facturas de compra</p>
              <p className="text-white/40 text-sm mt-1">
                Sube un documento PDF para crear una nueva factura
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm shadow-lg">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent bg-white/[0.03]">
                        <TableHead className="w-10 px-2">
                          <Checkbox
                            checked={selectedInvoices.size === paginatedInvoices.length && paginatedInvoices.length > 0}
                            onCheckedChange={handleSelectAll}
                            className="border-white/30 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 h-3.5 w-3.5"
                          />
                        </TableHead>
                        <TableHead
                          className="text-white/70 cursor-pointer hover:text-white select-none text-[10px] px-2"
                          onClick={() => handleSort("date")}
                        >
                          <div className="flex items-center gap-1">
                            Emisión
                            {sortColumn === "date" && (
                              sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="text-white/70 cursor-pointer hover:text-white select-none text-[10px] px-2"
                          onClick={() => handleSort("number")}
                        >
                          <div className="flex items-center gap-1">
                            Num
                            {sortColumn === "number" && (
                              sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="text-white/70 cursor-pointer hover:text-white select-none text-[10px] px-2"
                          onClick={() => handleSort("provider")}
                        >
                          <div className="flex items-center gap-1">
                            Proveedor
                            {sortColumn === "provider" && (
                              sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="text-white/70 cursor-pointer hover:text-white select-none text-[10px] px-2"
                          onClick={() => handleSort("project")}
                        >
                          <div className="flex items-center gap-1">
                            Proyecto
                            {sortColumn === "project" && (
                              sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="text-white/70 text-right text-[10px] px-2">Subtotal</TableHead>
                        <TableHead className="text-white/70 text-right text-[10px] px-2">IVA</TableHead>
                        <TableHead className="text-white/70 text-right text-[10px] px-2">IRPF</TableHead>
                        <TableHead
                          className="text-white/70 text-right cursor-pointer hover:text-white select-none text-[10px] px-2"
                          onClick={() => handleSort("total")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Total
                            {sortColumn === "total" && (
                              sortDirection === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="text-white/70 text-[10px] px-2">Estado</TableHead>
                        <TableHead
                          className="text-white/70 cursor-pointer hover:text-white select-none text-[10px] px-2"
                        >
                          Vencimiento
                        </TableHead>
                        <TableHead className="text-white/70 w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => {
                      const isSelected = selectedInvoices.has(invoice.id);
                      return (
                        <TableRow
                          key={invoice.id}
                          className={cn(
                            "border-white/10 cursor-pointer hover:bg-white/[0.06] transition-colors duration-200",
                            isSelected && "bg-white/10"
                          )}
                          onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/${invoice.id}`)}
                        >
                          <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                              className="border-white/30 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 h-3.5 w-3.5"
                            />
                          </TableCell>
                          <TableCell className="text-white/80 text-[10px] px-2">
                            {invoice.issue_date ? formatDate(invoice.issue_date) : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-emerald-500 font-medium text-[10px] px-2">
                            {invoice.internal_purchase_number || 
                             invoice.supplier_invoice_number || 
                             invoice.invoice_number || 
                             'Sin número'}
                          </TableCell>
                          <TableCell className="text-white text-[10px] px-2">
                            {invoice.provider_name || "-"}
                          </TableCell>
                          <TableCell className="text-white/70 text-[10px] px-2">
                            {invoice.project_id ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono text-white/90">
                                  {invoice.project_number || "-"}
                                </span>
                                {invoice.client_name && (
                                  <span className="text-white/60 text-[9px] truncate max-w-[150px]">
                                    {invoice.client_name}
                                  </span>
                                )}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right text-white/60 text-[10px] px-2">
                            {formatCurrency(invoice.tax_base || 0)}
                          </TableCell>
                          <TableCell className="text-right text-white/60 text-[10px] px-2">
                            {invoice.tax_amount > 0 ? formatCurrency(invoice.tax_amount) : "-"}
                          </TableCell>
                          <TableCell className="text-right text-white/60 text-[10px] px-2">
                            {invoice.retention_amount && invoice.retention_amount > 0 
                              ? formatCurrency(invoice.retention_amount) 
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right text-white font-medium text-[10px] px-2">
                            {formatCurrency(invoice.total || 0)}
                          </TableCell>
                          <TableCell className="px-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] px-1.5 py-0.5",
                                invoice.status === 'PAID' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                  invoice.status === 'PARTIAL' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                    invoice.status === 'PENDING' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                      "bg-white/5 text-white/40 border-white/10"
                              )}
                            >
                              {invoice.status === 'PENDING' ? 'Pendiente' : invoice.status === 'REGISTERED' ? 'Registrado' : invoice.status === 'PAID' ? 'Pagado' : 'Parcial'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white/80 text-[10px] px-2">
                            {invoice.due_date ? formatDate(invoice.due_date) : "-"}
                          </TableCell>
                          <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              {(() => {
                                const canRegisterPayment = ["CONFIRMED", "PARTIAL", "PAID"].includes(invoice.status) 
                                  && !invoice.is_locked 
                                  && invoice.pending_amount > 0;
                                
                                return canRegisterPayment ? (
                                  <RegisterPurchasePaymentDialog
                                    invoiceId={invoice.id}
                                    pendingAmount={invoice.pending_amount}
                                    onPaymentRegistered={() => {
                                      fetchInvoices();
                                    }}
                                    trigger={
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <CreditCard className="h-3 w-3 mr-1" />
                                        Pagar
                                      </Button>
                                    }
                                  />
                                ) : null;
                              })()}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10"
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                                  <DropdownMenuItem
                                    className="text-white hover:bg-white/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/nexo-av/${userId}/purchase-invoices/${invoice.id}`);
                                    }}
                                  >
                                    Ver detalle
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-white hover:bg-white/10">
                                    Duplicar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  </Table>
                </div>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalItems={totalItems}
                  canGoPrev={canGoPrev}
                  canGoNext={canGoNext}
                  onPrevPage={prevPage}
                  onNextPage={nextPage}
                  onGoToPage={goToPage}
                />
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

const PurchaseInvoicesPage = createMobilePage({
  DesktopComponent: PurchaseInvoicesPageDesktop,
  MobileComponent: PurchaseInvoicesPageMobile,
});

export default PurchaseInvoicesPage;
