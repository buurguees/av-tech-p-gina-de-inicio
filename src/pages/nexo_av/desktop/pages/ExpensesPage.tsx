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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrendingDown,
  AlertCircle,
  Upload,
  Loader2,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  CreditCard,
  Info,
  Trash2,
} from "lucide-react";
import { cn, toNumber } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  calculatePaymentStatus,
  getDocumentStatusInfo,
  getPaymentStatusInfo,
  normalizePurchaseDocumentStatus,
} from "@/constants/purchaseInvoiceStatuses";
import PaginationControls from "../components/common/PaginationControls";
import ConfirmActionDialog from "../components/common/ConfirmActionDialog";
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
  const [showTechnicalDrafts, setShowTechnicalDrafts] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [uploadRetryPending, setUploadRetryPending] = useState<{
    filePath: string;
    fileName: string;
  } | null>(null);
  const [retryingUpload, setRetryingUpload] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  /** Solo se pueden eliminar gastos que aún no tienen número definitivo (internal_purchase_number) */
  const canDeleteExpense = (expense: any) => !expense?.internal_purchase_number;
  const isTechnicalDraft = (expense: any) =>
    normalizePurchaseDocumentStatus(expense.status) === "DRAFT" &&
    !expense.internal_purchase_number &&
    !expense.provider_name &&
    !expense.project_name &&
    toNumber(expense.total) === 0 &&
    toNumber(expense.pending_amount) === 0;

  const getStatusFilterLabel = (value: string) => {
    switch (value) {
      case "DRAFT":
        return "Borradores";
      case "PENDING_VALIDATION":
        return "Pendientes revision";
      case "APPROVED":
        return "Aprobados";
      case "PAID":
        return "Pagados";
      case "CANCELLED":
        return "Anulados";
      default:
        return "Todos";
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [debouncedSearchQuery, statusFilter]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        p_search: debouncedSearchQuery || null,
        p_status: statusFilter === "all" ? null : statusFilter,
        p_supplier_id: null,
        p_technician_id: null,
        p_document_type: 'EXPENSE',
        p_page: 1,
        p_page_size: 5000,
      };
      const { data, error } = await supabase.rpc("list_purchase_invoices", params);
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
          const { data: ticketNum, error: numErr } = await supabase.rpc('get_next_ticket_number');
          if (numErr || !ticketNum) throw new Error(numErr?.message || 'No se pudo obtener el número');
          const { data: newInvoiceId, error: dbError } = await (supabase.rpc as any)('create_purchase_invoice', {
            p_invoice_number: ticketNum,
            p_document_type: 'EXPENSE',
            p_status: 'DRAFT',
            p_file_path: newFilePath,
            p_file_name: newFileName,
            p_site_id: null,
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
          if (newInvoiceId && userId) navigate(`/nexo-av/${userId}/expenses/${newInvoiceId}`);
          return;
        } else {
          throw uploadError;
        }
      } else {
        // Crear registro en la base de datos (nunca borrar el archivo si falla la BD)
        const { data: ticketNum, error: numErr } = await supabase.rpc('get_next_ticket_number');
        if (numErr || !ticketNum) throw new Error(numErr?.message || 'No se pudo obtener el número');
        const { data: createdId, error: dbError } = await (supabase.rpc as any)('create_purchase_invoice', {
          p_invoice_number: ticketNum,
          p_document_type: 'EXPENSE',
          p_status: 'DRAFT',
          p_file_path: filePath,
          p_file_name: fileName,
          p_site_id: null,
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
      if (newInvoiceId && userId) navigate(`/nexo-av/${userId}/expenses/${newInvoiceId}`);
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
      const { data: ticketNum, error: numErr } = await supabase.rpc("get_next_ticket_number");
      if (numErr || !ticketNum) throw new Error(numErr?.message || "No se pudo obtener el número");
      const { data: newInvoiceId, error: dbError } = await (supabase.rpc as any)("create_purchase_invoice", {
        p_invoice_number: ticketNum,
        p_document_type: "EXPENSE",
        p_status: "DRAFT",
        p_file_path: uploadRetryPending.filePath,
        p_file_name: uploadRetryPending.fileName,
        p_site_id: null,
      });
      if (dbError) throw dbError;
      setUploadRetryPending(null);
      toast({ title: "Ticket guardado", description: "Completa los datos y guarda." });
      fetchExpenses();
      if (newInvoiceId && userId) navigate(`/nexo-av/${userId}/expenses/${newInvoiceId}`);
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

  const handleRequestDeleteExpense = (e: React.MouseEvent, expense: any) => {
    e.stopPropagation();
    if (!canDeleteExpense(expense)) return;
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      setDeleting(true);
      const { error } = await supabase.rpc("delete_purchase_invoice", {
        p_invoice_id: expenseToDelete.id,
      });
      if (error) throw error;
      if (expenseToDelete.file_path) {
        await supabase.storage
          .from("purchase-documents")
          .remove([expenseToDelete.file_path]);
      }
      toast({
        title: "Gasto eliminado",
        description: "El ticket ha sido eliminado correctamente.",
      });
      fetchExpenses();
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? "No se pudo eliminar el gasto",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const selectedDeletable = expenses.filter(
    (e) => selectedExpenses.has(e.id) && canDeleteExpense(e)
  );
  const handleRequestBulkDelete = () => {
    if (selectedDeletable.length === 0) return;
    setBulkDeleteDialogOpen(true);
  };
  const handleConfirmBulkDelete = async () => {
    try {
      setDeletingBulk(true);
      let errors = 0;
      for (const expense of selectedDeletable) {
        const { error } = await supabase.rpc("delete_purchase_invoice", {
          p_invoice_id: expense.id,
        });
        if (error) {
          errors++;
          continue;
        }
        if (expense.file_path) {
          await supabase.storage
            .from("purchase-documents")
            .remove([expense.file_path]);
        }
      }
      if (errors > 0) {
        toast({
          title: "Eliminación parcial",
          description: `Se eliminaron ${selectedDeletable.length - errors} de ${selectedDeletable.length}. ${errors} no se pudieron eliminar.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Gastos eliminados",
          description: `Se han eliminado ${selectedDeletable.length} gasto(s) correctamente.`,
        });
      }
      fetchExpenses();
      setSelectedExpenses(new Set());
      setBulkDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? "No se pudo eliminar",
        variant: "destructive",
      });
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const hiddenTechnicalDraftsCount = expenses.filter((expense) => isTechnicalDraft(expense)).length;
  const visibleExpenses = showTechnicalDrafts
    ? expenses
    : expenses.filter((expense) => !isTechnicalDraft(expense));

  const sortedExpenses = [...visibleExpenses].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case "date":
        aValue = a.issue_date ? new Date(a.issue_date).getTime() : 0;
        bValue = b.issue_date ? new Date(b.issue_date).getTime() : 0;
        break;
      case "number":
        aValue = a.internal_purchase_number || a.invoice_number || "";
        bValue = b.internal_purchase_number || b.invoice_number || "";
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
    <div className="flex flex-col h-full gap-3">
        {uploadRetryPending && (
          <Alert variant="destructive" className="flex-shrink-0">
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
        {!showTechnicalDrafts && hiddenTechnicalDraftsCount > 0 && (
          <Alert className="flex-shrink-0 border-border bg-card text-foreground">
            <Info className="h-4 w-4" />
            <AlertTitle>Borradores tecnicos ocultos</AlertTitle>
            <AlertDescription>
              Se han ocultado {hiddenTechnicalDraftsCount} tickets vacios en borrador para priorizar la gestion real.
            </AlertDescription>
          </Alert>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 min-h-0 flex flex-col"
        >
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card/50 border border-border rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Gasto Total</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(visibleExpenses.reduce((sum, exp) => sum + toNumber(exp.total), 0))}
                </span>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <span>{visibleExpenses.length} tickets</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card/70 border border-border rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Pendiente de Pago</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(visibleExpenses.reduce((sum, exp) => sum + toNumber(exp.pending_amount), 0))}
                </span>
                <div className="flex items-center gap-1 mt-1 text-xs text-blue-500">
                  <span>{visibleExpenses.filter(e => e.pending_amount > 0).length} tickets pendientes</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card/70 border border-border rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Vencido</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-red-500">
                  {formatCurrency(expenses
                    .filter(exp => {
                      if (exp.status === 'PAID' || exp.status === 'DRAFT' || exp.status === 'CANCELLED') return false;
                      if (!exp.due_date) return false;
                      return new Date(exp.due_date) < new Date();
                    })
                    .reduce((sum, exp) => sum + toNumber(exp.total), 0)
                  )}
                </span>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <span>Requiere atención inmediata</span>
                </div>
              </div>
            </motion.div>
          </div>
          {/* Header - Estilo Holded */}
          <div className="mb-6 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gastos</h1>
                <Info className="h-4 w-4 text-muted-foreground" />
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
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent">
                      Acciones
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border-border">
                    <DropdownMenuItem>
                      Exportar seleccionados
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      Duplicar seleccionados
                    </DropdownMenuItem>
                    {selectedDeletable.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={handleRequestBulkDelete}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar seleccionados sin nº definitivo ({selectedDeletable.length})
                        </DropdownMenuItem>
                      </>
                    )}
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
                      "h-8 px-3 text-xs",
                      statusFilter !== "all" && "bg-accent text-accent-foreground"
                    )}
                  >
                    {getStatusFilterLabel(statusFilter)}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover border-border">
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("all")}
                    className={cn(statusFilter === "all" && "bg-accent")}
                  >
                    Todos los estados
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("DRAFT")}
                    className={cn(statusFilter === "DRAFT" && "bg-accent")}
                  >
                    Borradores
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("PENDING_VALIDATION")}
                    className={cn(statusFilter === "PENDING_VALIDATION" && "bg-accent")}
                  >
                    Pendientes revision
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("APPROVED")}
                    className={cn(statusFilter === "APPROVED" && "bg-accent")}
                  >
                    Aprobados
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("PAID")}
                    className={cn(statusFilter === "PAID" && "bg-accent")}
                  >
                    Pagado
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("CANCELLED")}
                    className={cn(statusFilter === "CANCELLED" && "bg-accent")}
                  >
                    Anulados
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 px-3 text-xs",
                  !showTechnicalDrafts && "bg-accent text-accent-foreground"
                )}
                onClick={() => setShowTechnicalDrafts((current) => !current)}
              >
                <Filter className="h-3 w-3 mr-1" />
                {showTechnicalDrafts ? "Ver todos" : `Ocultar borr. tecnicos (${hiddenTechnicalDraftsCount})`}
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
          ) : visibleExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <TrendingDown className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No hay gastos</p>
              <p className="text-muted-foreground/80 text-sm mt-1">
                Escanea un ticket o sube un documento para crear un nuevo gasto
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              {/* Desktop Table Container */}
              <div className="flex-1 min-h-0 overflow-auto bg-card rounded-2xl border border-border shadow-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent bg-muted/40">
                      <TableHead className="w-12 px-4">
                        <Checkbox
                          checked={selectedExpenses.size === paginatedExpenses.length && paginatedExpenses.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableHead>
                      <TableHead
                        className="text-muted-foreground cursor-pointer hover:text-foreground select-none"
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
                        className="text-muted-foreground cursor-pointer hover:text-foreground select-none"
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
                        className="text-muted-foreground cursor-pointer hover:text-foreground select-none"
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
                        className="text-muted-foreground cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("project")}
                      >
                        <div className="flex items-center gap-1">
                          Proyecto
                          {sortColumn === "project" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-muted-foreground text-right">Subtotal</TableHead>
                      <TableHead
                        className="text-muted-foreground text-right cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("total")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Total
                          {sortColumn === "total" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-muted-foreground">Estado</TableHead>
                      <TableHead className="text-muted-foreground w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedExpenses.map((expense) => {
                      const isSelected = selectedExpenses.has(expense.id);
                      const documentStatusInfo = getDocumentStatusInfo(expense.status);
                      const paymentStatus = calculatePaymentStatus(
                        toNumber(expense.paid_amount),
                        toNumber(expense.total),
                        expense.due_date ?? null,
                        expense.status
                      );
                      const paymentStatusInfo = getPaymentStatusInfo(paymentStatus);
                      const canRegisterPayment = Boolean(
                        paymentStatus &&
                        paymentStatus !== "PAID" &&
                        toNumber(expense.pending_amount) > 0 &&
                        expense.internal_purchase_number
                      );
                      return (
                        <TableRow
                          key={expense.id}
                          className={cn(
                            "border-border cursor-pointer hover:bg-accent/40 transition-colors duration-200",
                            isSelected && "bg-accent/60"
                          )}
                          onClick={() => navigate(`/nexo-av/${userId}/expenses/${expense.id}`)}
                        >
                          <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectExpense(expense.id, checked as boolean)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {expense.issue_date ? formatDate(expense.issue_date) : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-amber-500 font-medium text-sm">
                            {expense.internal_purchase_number || expense.invoice_number}
                          </TableCell>
                          <TableCell className="text-foreground text-sm">
                            {expense.provider_name || "-"}
                            {expense.provider_type === 'TECHNICIAN' && (
                              <Badge className="ml-2 bg-violet-500/10 text-violet-400 text-[8px] border-none">TÉCNICO</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">
                            {expense.project_name || "-"}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">
                            {formatCurrency(expense.tax_base || 0)}
                          </TableCell>
                          <TableCell className="text-right text-foreground font-medium text-sm">
                            {formatCurrency(expense.total)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              <Badge
                                variant="outline"
                                className={cn("text-xs", documentStatusInfo.className)}
                              >
                                {documentStatusInfo.label}
                              </Badge>
                              {paymentStatusInfo && (
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px]", paymentStatusInfo.className)}
                                >
                                  {paymentStatusInfo.label}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              {canRegisterPayment ? (
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
                                      className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <CreditCard className="h-3.5 w-3.5 mr-1" />
                                      Pagar
                                    </Button>
                                  }
                                />
                              ) : null}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover border-border">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/nexo-av/${userId}/expenses/${expense.id}`);
                                    }}
                                  >
                                    Ver detalle
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    Duplicar
                                  </DropdownMenuItem>
                                  {canDeleteExpense(expense) && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={(e) => handleRequestDeleteExpense(e, expense)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar (sin nº definitivo)
                                      </DropdownMenuItem>
                                    </>
                                  )}
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

      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setExpenseToDelete(null);
        }}
        title="Eliminar gasto"
        description={`¿Eliminar el ticket "${(expenseToDelete?.internal_purchase_number || expenseToDelete?.invoice_number) ?? ''}"? Solo se pueden eliminar gastos que aún no tienen número definitivo. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmDeleteExpense}
        loading={deleting}
      />

      <ConfirmActionDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Eliminar gastos sin nº definitivo"
        description={`¿Eliminar ${selectedDeletable.length} gasto(s) seleccionado(s) que no tienen número definitivo? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmBulkDelete}
        loading={deletingBulk}
      />
    </div>
  );
};

export default ExpensesPageDesktop;
