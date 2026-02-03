import { useState, useEffect, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { motion, AnimatePresence } from "framer-motion";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrendingDown,
  AlertCircle,
  Upload,
  Camera,
  Loader2,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  CreditCard,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PaginationControls from "../components/common/PaginationControls";
import DocumentScanner from "../components/common/DocumentScanner";
import RegisterPurchasePaymentDialog from "../components/purchases/RegisterPurchasePaymentDialog";

const ExpensesPageDesktop = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [uploadRetryPending, setUploadRetryPending] = useState<{
    filePath: string;
    fileName: string;
  } | null>(null);
  const [retryingUpload, setRetryingUpload] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, [debouncedSearchQuery, statusFilter]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_purchase_invoices", {
        p_search: debouncedSearchQuery || null,
        p_document_type: 'EXPENSE',
        p_status: statusFilter === "all" ? null : statusFilter,
        p_page: 1,
        p_page_size: 5000,
      });
      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      console.error("Error fetching expenses:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los gastos",
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

      // Obtener el auth.uid() del usuario actual para las políticas RLS
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error("Usuario no autenticado");
      }
      const authUserId = authUser.id;

      // Generar nombre de archivo único
      // Usar authUserId para la carpeta (requerido por políticas RLS)
      const extension = isFile 
        ? (fileOrBlob as File).name.split('.').pop()?.toLowerCase() || 'pdf'
        : 'jpg';
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `expense_${timestamp}_${randomSuffix}.${extension}`;
      const filePath = `${authUserId}/${fileName}`;
      let newInvoiceId: string | null = null;

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
          const newFileName = `expense_${timestamp}_${Math.random().toString(36).substring(2, 10)}.${extension}`;
          const newFilePath = `${authUserId}/${newFileName}`;
          const { error: retryError } = await supabase.storage
            .from('purchase-documents')
            .upload(newFilePath, fileOrBlob);
          
          if (retryError) throw retryError;
          
          // Usar el nuevo path
          const { data: ticketNum, error: numErr } = await supabase.rpc('get_next_ticket_number', {});
          if (numErr || !ticketNum) throw new Error(numErr?.message || 'No se pudo obtener el número');
          const { data: newInvoiceId, error: dbError } = await supabase.rpc('create_purchase_invoice', {
            p_invoice_number: ticketNum,
            p_document_type: 'EXPENSE',
            p_status: 'PENDING',
            p_file_path: newFilePath,
            p_file_name: newFileName
          });

          if (dbError) {
            setUploadRetryPending({ filePath: newFilePath, fileName: newFileName });
            toast({
              title: "Error al guardar el registro",
              description: "El documento se subió pero no se pudo guardar. Usa «Reintentar guardado».",
              variant: "destructive",
            });
            return;
          }
          setUploadRetryPending(null);
          toast({
            title: "Ticket guardado",
            description: "Completa los datos del ticket (proveedor, líneas, etc.) y guarda.",
          });
          setShowScanner(false);
          fetchExpenses();
          if (newInvoiceId && userId) navigate(`/nexo-av/${userId}/purchase-invoices/${newInvoiceId}`);
          return;
        } else {
          throw uploadError;
        }
      } else {
        // Crear registro en la base de datos (nunca borrar el archivo si falla la BD)
        const { data: ticketNum, error: numErr } = await supabase.rpc('get_next_ticket_number', {});
        if (numErr || !ticketNum) throw new Error(numErr?.message || 'No se pudo obtener el número');
        const { data: createdId, error: dbError } = await supabase.rpc('create_purchase_invoice', {
          p_invoice_number: ticketNum,
          p_document_type: 'EXPENSE',
          p_status: 'PENDING',
          p_file_path: filePath,
          p_file_name: fileName
        });

        if (dbError) {
          setUploadRetryPending({ filePath, fileName });
          toast({
            title: "Error al guardar el registro",
            description: "El documento se subió pero no se pudo guardar en la base de datos. No se ha borrado el archivo. Usa «Reintentar guardado».",
            variant: "destructive",
          });
          return;
        }
        newInvoiceId = createdId ?? null;
      }

      setUploadRetryPending(null);
      toast({
        title: "Ticket guardado",
        description: "Completa los datos del ticket (proveedor, líneas, etc.) y guarda.",
      });
      setShowScanner(false);
      fetchExpenses();
      if (newInvoiceId && userId) navigate(`/nexo-av/${userId}/purchase-invoices/${newInvoiceId}`);
    } catch (error: any) {
      console.error("Upload error:", error);
      let errorMessage = "Error al subir el ticket";
      
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
      const { data: ticketNum, error: numErr } = await supabase.rpc("get_next_ticket_number", {});
      if (numErr || !ticketNum) throw new Error(numErr?.message || "No se pudo obtener el número");
      const { data: newInvoiceId, error: dbError } = await supabase.rpc("create_purchase_invoice", {
        p_invoice_number: ticketNum,
        p_document_type: "EXPENSE",
        p_status: "PENDING",
        p_file_path: uploadRetryPending.filePath,
        p_file_name: uploadRetryPending.fileName,
      });
      if (dbError) throw dbError;
      setUploadRetryPending(null);
      toast({ title: "Ticket guardado", description: "Completa los datos y guarda." });
      fetchExpenses();
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExpenses(new Set(paginatedExpenses.map(e => e.id)));
    } else {
      setSelectedExpenses(new Set());
    }
  };

  const handleSelectExpense = (expenseId: string, checked: boolean) => {
    const newSelected = new Set(selectedExpenses);
    if (checked) {
      newSelected.add(expenseId);
    } else {
      newSelected.delete(expenseId);
    }
    setSelectedExpenses(newSelected);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
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
    paginatedData: paginatedExpenses,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(sortedExpenses, { pageSize: 50 });

  return (
    <div className="w-full h-full p-6">
      <div className="w-full h-full">
        {uploadRetryPending && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ticket subido pero no guardado</AlertTitle>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <span className="text-white/60 text-sm font-medium">Gasto Total</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-white">
                  {formatCurrency(expenses.reduce((sum, exp) => sum + (exp.total || 0), 0))}
                </span>
                <div className="flex items-center gap-1 mt-1 text-xs text-white/40">
                  <span>{expenses.length} tickets</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <span className="text-white/60 text-sm font-medium">Pendiente de Pago</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-white">
                  {formatCurrency(expenses.reduce((sum, exp) => sum + (exp.pending_amount || 0), 0))}
                </span>
                <div className="flex items-center gap-1 mt-1 text-xs text-blue-400">
                  <span>{expenses.filter(e => e.pending_amount > 0).length} tickets pendientes</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <span className="text-white/60 text-sm font-medium">Vencido</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-red-500">
                  {formatCurrency(expenses
                    .filter(exp => {
                      if (exp.status === 'PAID' || exp.status === 'DRAFT' || exp.status === 'CANCELLED') return false;
                      if (!exp.due_date) return false;
                      return new Date(exp.due_date) < new Date();
                    })
                    .reduce((sum, exp) => sum + (exp.total || 0), 0)
                  )}
                </span>
                <div className="flex items-center gap-1 mt-1 text-xs text-red-400/80">
                  <span>Requiere atención inmediata</span>
                </div>
              </div>
            </motion.div>
          </div>
          {/* Header - Estilo Holded */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Gastos</h1>
                <Info className="h-4 w-4 text-white/40" />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="desktop-upload-expense"
                  className="hidden"
                  accept="image/*,application/pdf"
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
                      Exportar seleccionados
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-white hover:bg-white/10">
                      Duplicar seleccionados
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={() => document.getElementById('desktop-upload-expense')?.click()}
                  disabled={uploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-sm font-medium"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1.5" />
                  )}
                  Nuevo gasto
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

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs border-white/20 text-white/70 hover:bg-white/10"
              >
                <Filter className="h-3 w-3 mr-1" />
                Filtro
              </Button>

              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar gastos..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pr-11"
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
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <TrendingDown className="h-16 w-16 text-white/20 mb-4" />
              <p className="text-white/60">No hay gastos</p>
              <p className="text-white/40 text-sm mt-1">
                Escanea un ticket o sube un documento para crear un nuevo gasto
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm shadow-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent bg-white/[0.03]">
                      <TableHead className="w-12 px-4">
                        <Checkbox
                          checked={selectedExpenses.size === paginatedExpenses.length && paginatedExpenses.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="border-white/30 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-white select-none"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1">
                          Emisión
                          {sortColumn === "date" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-white select-none"
                        onClick={() => handleSort("number")}
                      >
                        <div className="flex items-center gap-1">
                          Num
                          {sortColumn === "number" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-white select-none"
                        onClick={() => handleSort("provider")}
                      >
                        <div className="flex items-center gap-1">
                          Proveedor
                          {sortColumn === "provider" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-white select-none"
                        onClick={() => handleSort("project")}
                      >
                        <div className="flex items-center gap-1">
                          Proyecto
                          {sortColumn === "project" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-white/70 text-right">Subtotal</TableHead>
                      <TableHead
                        className="text-white/70 text-right cursor-pointer hover:text-white select-none"
                        onClick={() => handleSort("total")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Total
                          {sortColumn === "total" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-white/70">Estado</TableHead>
                      <TableHead className="text-white/70 w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedExpenses.map((expense) => {
                      const isSelected = selectedExpenses.has(expense.id);
                      return (
                        <TableRow
                          key={expense.id}
                          className={cn(
                            "border-white/10 cursor-pointer hover:bg-white/[0.06] transition-colors duration-200",
                            isSelected && "bg-white/10"
                          )}
                          onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/${expense.id}`)}
                        >
                          <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectExpense(expense.id, checked as boolean)}
                              className="border-white/30 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                          </TableCell>
                          <TableCell className="text-white/80 text-xs">
                            {expense.issue_date ? formatDate(expense.issue_date) : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-amber-500 font-medium text-sm">
                            {expense.invoice_number}
                          </TableCell>
                          <TableCell className="text-white text-sm">
                            {expense.provider_name || "-"}
                            {expense.provider_type === 'TECHNICIAN' && (
                              <Badge className="ml-2 bg-violet-500/10 text-violet-400 text-[8px] border-none">TÉCNICO</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-white/70 font-mono text-sm">
                            {expense.project_name || "-"}
                          </TableCell>
                          <TableCell className="text-right text-white/60 text-sm">
                            {formatCurrency(expense.tax_base || 0)}
                          </TableCell>
                          <TableCell className="text-right text-white font-medium text-sm">
                            {formatCurrency(expense.total)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                expense.status === 'PAID' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                  expense.status === 'PARTIAL' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                    expense.status === 'PENDING' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                      "bg-white/5 text-white/40 border-white/10"
                              )}
                            >
                              {expense.status === 'PENDING' ? 'Pendiente' : expense.status === 'REGISTERED' ? 'Registrado' : expense.status === 'PAID' ? 'Pagado' : 'Parcial'}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              {(() => {
                                const canRegisterPayment = ["CONFIRMED", "PARTIAL", "PAID"].includes(expense.status) 
                                  && !expense.is_locked 
                                  && expense.pending_amount > 0;
                                
                                return canRegisterPayment ? (
                                  <RegisterPurchasePaymentDialog
                                    invoiceId={expense.id}
                                    pendingAmount={expense.pending_amount}
                                    onPaymentRegistered={() => {
                                      fetchExpenses();
                                    }}
                                    trigger={
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <CreditCard className="h-3.5 w-3.5 mr-1" />
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
                                    className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                                  <DropdownMenuItem
                                    className="text-white hover:bg-white/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/nexo-av/${userId}/purchase-invoices/${expense.id}`);
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
        </motion.div>
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
              title="Escanear Ticket de Gasto"
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpensesPageDesktop;
