import { useCallback, useEffect, useState, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  CreditCard,
  Filter,
  Info,
  Loader2,
  Search,
  TrendingDown,
  Trash2,
  Upload,
} from "lucide-react";
import { cn, toNumber } from "@/lib/utils";
import {
  calculatePaymentStatus,
  getDocumentStatusInfo,
  getPaymentStatusInfo,
  normalizePurchaseDocumentStatus,
} from "@/constants/purchaseInvoiceStatuses";
import PaginationControls from "../components/common/PaginationControls";
import ConfirmActionDialog from "../components/common/ConfirmActionDialog";
import DataList, { DataListAction, DataListColumn, DataListFooterCell } from "../components/common/DataList";
import CompactKpiCard from "../components/common/CompactKpiCard";
import DocumentScanner from "../components/common/DocumentScanner";
import RegisterPurchasePaymentDialog from "../components/purchases/RegisterPurchasePaymentDialog";

interface ExpenseRow {
  id: string;
  invoice_number: string;
  internal_purchase_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  total: number;
  tax_base: number | null;
  paid_amount: number;
  pending_amount: number;
  status: string;
  provider_name: string | null;
  provider_type: string | null;
  project_name: string | null;
  file_path?: string | null;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof (error as { error: unknown }).error === "string"
  ) {
    return (error as { error: string }).error;
  }
  return fallback;
};

const ExpensesPageDataList = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
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
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  const canDeleteExpense = (expense: ExpenseRow) => !expense.internal_purchase_number;

  const isTechnicalDraft = (expense: ExpenseRow) =>
    normalizePurchaseDocumentStatus(expense.status) === "DRAFT" &&
    !expense.internal_purchase_number &&
    !expense.provider_name &&
    !expense.project_name &&
    toNumber(expense.total) === 0 &&
    toNumber(expense.pending_amount) === 0;

  const getStatusFilterLabel = (value: string) => {
    switch (value) {
      case "DRAFT":             return "Borradores";
      case "PENDING_VALIDATION": return "Pendientes revisión";
      case "APPROVED":          return "Aprobados";
      case "PAID":              return "Pagados";
      case "CANCELLED":         return "Anulados";
      default:                  return "Todos";
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_purchase_invoices", {
        p_search: debouncedSearchQuery || null,
        p_status: statusFilter === "all" ? null : statusFilter,
        p_supplier_id: null,
        p_technician_id: null,
        p_document_type: "EXPENSE",
        p_page: 1,
        p_page_size: 5000,
      });
      if (error) throw error;
      setExpenses(((data || []) as unknown) as ExpenseRow[]);
    } catch (error: unknown) {
      console.error("Error fetching expenses:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los gastos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, statusFilter, toast]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // ── Upload helpers ────────────────────────────────────────────────────────

  const createDraftInvoice = async (filePath: string, fileName: string) => {
    const { data: ticketNum, error: numErr } = await supabase.rpc("get_next_ticket_number");
    if (numErr || !ticketNum) throw new Error(numErr?.message || "No se pudo obtener el número");
    return (
      supabase.rpc as unknown as {
        (name: string, args: Record<string, unknown>): Promise<{ data: string | null; error: unknown }>;
      }
    )("create_purchase_invoice", {
      p_invoice_number: ticketNum,
      p_document_type: "EXPENSE",
      p_status: "DRAFT",
      p_file_path: filePath,
      p_file_name: fileName,
      p_site_id: null,
    });
  };

  const handleUpload = async (fileOrBlob: File | Blob) => {
    if (!userId) {
      toast({ title: "Error", description: "No se ha identificado al usuario", variant: "destructive" });
      return;
    }
    try {
      setUploading(true);
      const isFile = fileOrBlob instanceof File;
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      const maxSize = 50 * 1024 * 1024;

      if (isFile) {
        const file = fileOrBlob as File;
        if (!allowedTypes.includes(file.type))
          throw new Error("Tipo de archivo no permitido. Solo se permiten: PDF, JPEG, PNG, WEBP");
        if (file.size > maxSize) throw new Error("El archivo es demasiado grande. Tamaño máximo: 50MB");
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Usuario no autenticado");

      const extension = isFile ? (fileOrBlob as File).name.split(".").pop()?.toLowerCase() || "pdf" : "jpg";
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `expense_${timestamp}_${randomSuffix}.${extension}`;
      const filePath = `${authUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("purchase-documents")
        .upload(filePath, fileOrBlob, { cacheControl: "3600", upsert: false });

      let finalPath = filePath;
      let finalName = fileName;
      if (uploadError) {
        if (!uploadError.message.includes("already exists")) throw uploadError;
        finalName = `expense_${timestamp}_${Math.random().toString(36).substring(2, 10)}.${extension}`;
        finalPath = `${authUser.id}/${finalName}`;
        const { error: retryError } = await supabase.storage
          .from("purchase-documents")
          .upload(finalPath, fileOrBlob);
        if (retryError) throw retryError;
      }

      const { data: createdId, error: dbError } = await createDraftInvoice(finalPath, finalName);
      if (dbError) {
        setUploadRetryPending({ filePath: finalPath, fileName: finalName });
        toast({
          title: "Error al guardar el registro",
          description: "El documento se subió pero no se pudo guardar. Usa «Reintentar guardado».",
          variant: "destructive",
        });
        return;
      }

      setUploadRetryPending(null);
      toast({ title: "Ticket guardado", description: "Completa los datos del ticket y guarda." });
      setShowScanner(false);
      await fetchExpenses();
      if (createdId && userId) navigate(`/nexo-av/${userId}/expenses/${createdId}`);
    } catch (error: unknown) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Error al subir el ticket"),
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
      const { data: createdId, error: dbError } = await createDraftInvoice(
        uploadRetryPending.filePath,
        uploadRetryPending.fileName
      );
      if (dbError) throw dbError;
      setUploadRetryPending(null);
      toast({ title: "Ticket guardado", description: "Completa los datos y guarda." });
      await fetchExpenses();
      if (createdId && userId) navigate(`/nexo-av/${userId}/expenses/${createdId}`);
    } catch (error: unknown) {
      console.error("Retry upload error:", error);
      toast({
        title: "Error al reintentar",
        description: getErrorMessage(error, "No se pudo guardar. Vuelve a intentarlo más tarde."),
        variant: "destructive",
      });
    } finally {
      setRetryingUpload(false);
    }
  };

  // ── Selection ─────────────────────────────────────────────────────────────

  const handleSelectExpense = (expenseId: string, checked: boolean) => {
    setSelectedExpenses((current) => {
      const next = new Set(current);
      if (checked) next.add(expenseId);
      else next.delete(expenseId);
      return next;
    });
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      setDeleting(true);
      const { error } = await supabase.rpc("delete_purchase_invoice", {
        p_invoice_id: expenseToDelete.id,
      });
      if (error) throw error;
      if (expenseToDelete.file_path) {
        await supabase.storage.from("purchase-documents").remove([expenseToDelete.file_path]);
      }
      toast({ title: "Gasto eliminado", description: "El ticket ha sido eliminado correctamente." });
      await fetchExpenses();
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo eliminar el gasto"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    try {
      setDeletingBulk(true);
      let errors = 0;
      for (const expense of selectedDeletable) {
        const { error } = await supabase.rpc("delete_purchase_invoice", { p_invoice_id: expense.id });
        if (error) {
          errors++;
          continue;
        }
        if (expense.file_path) {
          await supabase.storage.from("purchase-documents").remove([expense.file_path]);
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
      await fetchExpenses();
      setSelectedExpenses(new Set());
      setBulkDeleteDialogOpen(false);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "No se pudo eliminar"),
        variant: "destructive",
      });
    } finally {
      setDeletingBulk(false);
    }
  };

  // ── Sorting & filtering ───────────────────────────────────────────────────

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }
    setSortColumn(column);
    setSortDirection("asc");
  };

  const hiddenTechnicalDraftsCount = expenses.filter(isTechnicalDraft).length;
  const visibleExpenses = showTechnicalDrafts
    ? expenses
    : expenses.filter((e) => !isTechnicalDraft(e));

  const sortedExpenses = [...visibleExpenses].sort((a, b) => {
    if (!sortColumn) return 0;
    let aValue: string | number = 0;
    let bValue: string | number = 0;
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
        aValue = normalizePurchaseDocumentStatus(a.status);
        bValue = normalizePurchaseDocumentStatus(b.status);
        break;
      case "total":
        aValue = toNumber(a.total);
        bValue = toNumber(b.total);
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

  const allVisibleOnPageSelected =
    paginatedExpenses.length > 0 &&
    paginatedExpenses.every((e) => selectedExpenses.has(e.id));

  const handleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedExpenses(new Set());
      return;
    }
    setSelectedExpenses(new Set(paginatedExpenses.map((e) => e.id)));
  };

  const selectedDeletable = visibleExpenses.filter(
    (e) => selectedExpenses.has(e.id) && canDeleteExpense(e)
  );

  // ── DataList config ───────────────────────────────────────────────────────

  const columns: DataListColumn<ExpenseRow>[] = [
    {
      key: "select",
      label: (
        <Checkbox
          checked={allVisibleOnPageSelected}
          onCheckedChange={handleSelectAll}
          aria-label="Seleccionar todos"
          className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        />
      ),
      align: "center",
      width: "40px",
      priority: 1,
      render: (expense) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedExpenses.has(expense.id)}
            onCheckedChange={(checked) => handleSelectExpense(expense.id, checked as boolean)}
            aria-label={`Seleccionar ${expense.internal_purchase_number || expense.invoice_number}`}
            className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
        </div>
      ),
    },
    {
      key: "number",
      label: "Nº",
      sortable: true,
      align: "left",
      priority: 1,
      render: (expense) => (
        <span className="font-mono text-amber-500 font-medium">
          {expense.internal_purchase_number || expense.invoice_number}
        </span>
      ),
    },
    {
      key: "date",
      label: "Emisión",
      sortable: true,
      align: "left",
      priority: 2,
      render: (expense) => (
        <span className="text-muted-foreground">{formatDate(expense.issue_date)}</span>
      ),
    },
    {
      key: "provider",
      label: "Establecimiento",
      sortable: true,
      align: "left",
      priority: 3,
      render: (expense) => (
        <div className="flex items-center gap-2">
          <span className="truncate text-foreground">{expense.provider_name || "-"}</span>
          {expense.provider_type === "TECHNICIAN" && (
            <Badge className="border-none bg-violet-500/10 text-[8px] text-violet-400">TÉCNICO</Badge>
          )}
        </div>
      ),
    },
    {
      key: "project",
      label: "Proyecto",
      sortable: true,
      align: "left",
      priority: 4,
      render: (expense) => (
        <span className="text-muted-foreground font-mono text-sm">{expense.project_name || "-"}</span>
      ),
    },
    {
      key: "status",
      label: "Estado doc.",
      sortable: true,
      align: "center",
      priority: 2,
      render: (expense) => {
        const info = getDocumentStatusInfo(expense.status);
        return (
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className={cn(info.className, "w-28 justify-center border px-1.5 py-0.5 text-[11px]")}
            >
              {info.label}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "payment_status",
      label: "Estado pago",
      align: "center",
      priority: 5,
      render: (expense) => {
        const ps = calculatePaymentStatus(
          toNumber(expense.paid_amount),
          toNumber(expense.total),
          expense.due_date ?? null,
          expense.status
        );
        const info = getPaymentStatusInfo(ps);
        if (!info) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className={cn(info.className, "w-24 justify-center border px-1.5 py-0.5 text-[10px]")}
            >
              {info.label}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "subtotal",
      label: "Subtotal",
      align: "right",
      priority: 6,
      render: (expense) => (
        <span className="text-muted-foreground">{formatCurrency(toNumber(expense.tax_base))}</span>
      ),
    },
    {
      key: "total",
      label: "Total",
      sortable: true,
      align: "right",
      priority: 4,
      render: (expense) => (
        <span className="font-medium text-foreground">{formatCurrency(toNumber(expense.total))}</span>
      ),
    },
    {
      key: "payment",
      label: "Pago",
      align: "center",
      priority: 6,
      width: "120px",
      render: (expense) => {
        const ps = calculatePaymentStatus(
          toNumber(expense.paid_amount),
          toNumber(expense.total),
          expense.due_date ?? null,
          expense.status
        );
        const canRegisterPayment =
          !!ps &&
          ps !== "PAID" &&
          toNumber(expense.pending_amount) > 0 &&
          !!expense.internal_purchase_number;
        if (!canRegisterPayment) return <span className="text-muted-foreground">-</span>;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <RegisterPurchasePaymentDialog
              invoiceId={expense.id}
              pendingAmount={expense.pending_amount}
              onPaymentRegistered={fetchExpenses}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CreditCard className="mr-1 h-3.5 w-3.5" />
                  Pagar
                </Button>
              }
            />
          </div>
        );
      },
    },
  ];

  const expenseActions: DataListAction<ExpenseRow>[] = [
    {
      label: "Ver detalle",
      onClick: (expense) => navigate(`/nexo-av/${userId}/expenses/${expense.id}`),
    },
    {
      label: "Duplicar",
      onClick: () => undefined,
    },
    {
      label: "Eliminar (sin nº definitivo)",
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      variant: "destructive",
      condition: canDeleteExpense,
      onClick: (expense) => {
        setExpenseToDelete(expense);
        setDeleteDialogOpen(true);
      },
    },
  ];

  const footerCells: DataListFooterCell[] = [
    {
      key: "number",
      value: (
        <span className="text-muted-foreground text-xs uppercase">
          Total ({visibleExpenses.length})
        </span>
      ),
      align: "left",
    },
    {
      key: "subtotal",
      value: (
        <span>
          {formatCurrency(visibleExpenses.reduce((sum, e) => sum + toNumber(e.tax_base), 0))}
        </span>
      ),
      align: "right",
    },
    {
      key: "total",
      value: (
        <span>
          {formatCurrency(visibleExpenses.reduce((sum, e) => sum + toNumber(e.total), 0))}
        </span>
      ),
      align: "right",
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Alertas */}
      {uploadRetryPending && (
        <Alert variant="destructive" className="flex-shrink-0 mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ticket subido pero no guardado</AlertTitle>
          <AlertDescription className="mt-1 flex flex-wrap items-center gap-2">
            <span>El archivo está en el servidor. Puedes reintentar guardar sin volver a subir.</span>
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
        <Alert className="flex-shrink-0 mb-2 border-border bg-card text-foreground">
          <Info className="h-4 w-4" />
          <AlertTitle>Borradores técnicos ocultos</AlertTitle>
          <AlertDescription>
            Se han ocultado {hiddenTechnicalDraftsCount} tickets vacíos en borrador.
          </AlertDescription>
        </Alert>
      )}

      {/* Contenido principal con animación de entrada */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col min-h-0 gap-3"
      >
        {/* KPIs */}
        <div className="flex-shrink-0 grid grid-cols-3 gap-2">
          <CompactKpiCard
            label="Gasto total"
            value={formatCurrency(visibleExpenses.reduce((sum, e) => sum + toNumber(e.total), 0))}
            sub={`${visibleExpenses.length} tickets`}
            color="amber"
            delay={0.05}
          />
          <CompactKpiCard
            label="Pendiente de pago"
            value={formatCurrency(
              visibleExpenses.reduce((sum, e) => sum + toNumber(e.pending_amount), 0)
            )}
            sub={`${visibleExpenses.filter((e) => e.pending_amount > 0).length} tickets pendientes`}
            color="blue"
            delay={0.1}
          />
          <CompactKpiCard
            label="Vencido"
            value={formatCurrency(
              visibleExpenses
                .filter((e) => {
                  const ps = calculatePaymentStatus(
                    toNumber(e.paid_amount),
                    toNumber(e.total),
                    e.due_date ?? null,
                    e.status
                  );
                  return (
                    normalizePurchaseDocumentStatus(e.status) === "APPROVED" &&
                    ps !== "PAID" &&
                    !!e.due_date &&
                    new Date(e.due_date) < new Date()
                  );
                })
                .reduce((sum, e) => sum + toNumber(e.total), 0)
            )}
            sub="Requiere atención inmediata"
            color="destructive"
            delay={0.15}
          />
        </div>

        {/* Cabecera: título + acciones */}
        <div className="flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Gastos</h1>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Acciones
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
                <DropdownMenuItem>Exportar seleccionados</DropdownMenuItem>
                <DropdownMenuItem>Duplicar seleccionados</DropdownMenuItem>
                {selectedDeletable.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setBulkDeleteDialogOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar seleccionados sin nº definitivo ({selectedDeletable.length})
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => document.getElementById("desktop-upload-expense")?.click()}
              disabled={uploading}
              className="h-9 bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {uploading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-4 w-4" />
              )}
              Nuevo gasto
              <span className="ml-2 text-xs opacity-70">N</span>
            </Button>
          </div>
        </div>

        {/* Barra de filtros */}
        <div className="flex-shrink-0 flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-8 px-3 text-xs", statusFilter !== "all" && "bg-accent text-accent-foreground")}
              >
                {getStatusFilterLabel(statusFilter)}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover border-border">
              {["all", "DRAFT", "PENDING_VALIDATION", "APPROVED", "PAID", "CANCELLED"].map((v) => (
                <DropdownMenuItem
                  key={v}
                  onClick={() => setStatusFilter(v)}
                  className={cn(statusFilter === v && "bg-accent")}
                >
                  {getStatusFilterLabel(v)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 px-3 text-xs",
              !showTechnicalDrafts && "bg-accent text-accent-foreground"
            )}
            onClick={() => setShowTechnicalDrafts((v) => !v)}
          >
            <Filter className="mr-1 h-3 w-3" />
            {showTechnicalDrafts
              ? "Ver todos"
              : `Ocultar borr. técnicos (${hiddenTechnicalDraftsCount})`}
          </Button>

          <div className="relative min-w-[200px] max-w-md flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar gastos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pr-11"
            />
          </div>

          <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
            <Calendar className="mr-1 h-3 w-3" />
            Todas las fechas
          </Button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : visibleExpenses.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12">
            <TrendingDown className="mb-4 h-16 w-16 text-muted-foreground/40" />
            <p className="text-muted-foreground">No hay gastos</p>
            <p className="mt-1 text-sm text-muted-foreground/80">
              Escanea un ticket o sube un documento para crear un nuevo gasto
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-hidden">
              <DataList
                data={paginatedExpenses}
                columns={columns}
                actions={expenseActions}
                onItemClick={(expense) => navigate(`/nexo-av/${userId}/expenses/${expense.id}`)}
                rowClassName={(expense) =>
                  selectedExpenses.has(expense.id) ? "bg-accent/60" : undefined
                }
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                loading={loading}
                emptyMessage="No hay gastos"
                emptyIcon={<TrendingDown className="h-16 w-16 text-muted-foreground" />}
                getItemId={(expense) => expense.id}
                footerCells={footerCells}
              />
            </div>
            {totalPages > 1 && (
              <div className="flex-shrink-0">
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
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Scanner */}
      <AnimatePresence>
        {showScanner && (
          <Suspense
            fallback={
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            }
          >
            <DocumentScanner
              onCapture={handleUpload}
              onCancel={() => setShowScanner(false)}
              title="Escanear Ticket de Gasto"
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Diálogos */}
      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setExpenseToDelete(null);
        }}
        title="Eliminar gasto"
        description={`¿Eliminar el ticket "${(expenseToDelete?.internal_purchase_number || expenseToDelete?.invoice_number) ?? ""}"? Solo se pueden eliminar gastos que aún no tienen número definitivo. Esta acción no se puede deshacer.`}
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

export default ExpensesPageDataList;
