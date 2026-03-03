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
import DataList, { DataListAction, DataListFooterCell } from "../components/common/DataList";
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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  if (typeof error === "object" && error !== null && "error" in error && typeof (error as { error: unknown }).error === "string") {
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
  const [uploadRetryPending, setUploadRetryPending] = useState<{ filePath: string; fileName: string } | null>(null);
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
      toast({ title: "Error", description: "No se pudieron cargar los gastos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, statusFilter, toast]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const createDraftInvoice = async (filePath: string, fileName: string) => {
    const { data: ticketNum, error: numErr } = await supabase.rpc("get_next_ticket_number");
    if (numErr || !ticketNum) throw new Error(numErr?.message || "No se pudo obtener el numero");
    return (supabase.rpc as unknown as { (name: string, args: Record<string, unknown>): Promise<{ data: string | null; error: unknown }> })("create_purchase_invoice", {
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
        if (!allowedTypes.includes(file.type)) throw new Error("Tipo de archivo no permitido. Solo se permiten: PDF, JPEG, PNG, WEBP");
        if (file.size > maxSize) throw new Error("El archivo es demasiado grande. Tamano maximo: 50MB");
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Usuario no autenticado");

      const extension = isFile ? (fileOrBlob as File).name.split(".").pop()?.toLowerCase() || "pdf" : "jpg";
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `expense_${timestamp}_${randomSuffix}.${extension}`;
      const filePath = `${authUser.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("purchase-documents").upload(filePath, fileOrBlob, { cacheControl: "3600", upsert: false });

      let finalPath = filePath;
      let finalName = fileName;
      if (uploadError) {
        if (!uploadError.message.includes("already exists")) throw uploadError;
        finalName = `expense_${timestamp}_${Math.random().toString(36).substring(2, 10)}.${extension}`;
        finalPath = `${authUser.id}/${finalName}`;
        const { error: retryError } = await supabase.storage.from("purchase-documents").upload(finalPath, fileOrBlob);
        if (retryError) throw retryError;
      }

      const { data: createdId, error: dbError } = await createDraftInvoice(finalPath, finalName);
      if (dbError) {
        setUploadRetryPending({ filePath: finalPath, fileName: finalName });
        toast({ title: "Error al guardar el registro", description: "El documento se subio pero no se pudo guardar. Usa Reintentar guardado.", variant: "destructive" });
        return;
      }

      setUploadRetryPending(null);
      toast({ title: "Ticket guardado", description: "Completa los datos del ticket y guarda." });
      setShowScanner(false);
      await fetchExpenses();
      if (createdId && userId) navigate(`/nexo-av/${userId}/expenses/${createdId}`);
    } catch (error: unknown) {
      console.error("Upload error:", error);
      toast({ title: "Error", description: getErrorMessage(error, "Error al subir el ticket"), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };
  const handleRetryPendingUpload = async () => {
    if (!uploadRetryPending) return;
    try {
      setRetryingUpload(true);
      const { data: createdId, error: dbError } = await createDraftInvoice(uploadRetryPending.filePath, uploadRetryPending.fileName);
      if (dbError) throw dbError;
      setUploadRetryPending(null);
      toast({ title: "Ticket guardado", description: "Completa los datos y guarda." });
      await fetchExpenses();
      if (createdId && userId) navigate(`/nexo-av/${userId}/expenses/${createdId}`);
    } catch (error: unknown) {
      console.error("Retry upload error:", error);
      toast({ title: "Error al reintentar", description: getErrorMessage(error, "No se pudo guardar. Vuelve a intentarlo mas tarde."), variant: "destructive" });
    } finally {
      setRetryingUpload(false);
    }
  };

  const handleSelectExpense = (expenseId: string, checked: boolean) => {
    setSelectedExpenses((current) => {
      const next = new Set(current);
      if (checked) next.add(expenseId);
      else next.delete(expenseId);
      return next;
    });
  };

  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      setDeleting(true);
      const { error } = await supabase.rpc("delete_purchase_invoice", { p_invoice_id: expenseToDelete.id });
      if (error) throw error;
      if (expenseToDelete.file_path) {
        await supabase.storage.from("purchase-documents").remove([expenseToDelete.file_path]);
      }
      toast({ title: "Gasto eliminado", description: "El ticket ha sido eliminado correctamente." });
      await fetchExpenses();
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "No se pudo eliminar el gasto"), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }
    setSortColumn(column);
    setSortDirection("asc");
  };

  const hiddenTechnicalDraftsCount = expenses.filter((expense) => isTechnicalDraft(expense)).length;
  const visibleExpenses = showTechnicalDrafts ? expenses : expenses.filter((expense) => !isTechnicalDraft(expense));

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

  const { currentPage, totalPages, paginatedData: paginatedExpenses, goToPage, nextPage, prevPage, canGoNext, canGoPrev, startIndex, endIndex, totalItems } = usePagination(sortedExpenses, { pageSize: 50 });

  const allVisibleOnPageSelected = paginatedExpenses.length > 0 && paginatedExpenses.every((expense) => selectedExpenses.has(expense.id));

  const handleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedExpenses(new Set());
      return;
    }
    setSelectedExpenses(new Set(paginatedExpenses.map((expense) => expense.id)));
  };

  const selectedDeletable = visibleExpenses.filter((expense) => selectedExpenses.has(expense.id) && canDeleteExpense(expense));

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
        toast({ title: "Eliminacion parcial", description: `Se eliminaron ${selectedDeletable.length - errors} de ${selectedDeletable.length}. ${errors} no se pudieron eliminar.`, variant: "destructive" });
      } else {
        toast({ title: "Gastos eliminados", description: `Se han eliminado ${selectedDeletable.length} gasto(s) correctamente.` });
      }
      await fetchExpenses();
      setSelectedExpenses(new Set());
      setBulkDeleteDialogOpen(false);
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "No se pudo eliminar"), variant: "destructive" });
    } finally {
      setDeletingBulk(false);
    }
  };

  const expenseActions: DataListAction<ExpenseRow>[] = [
    { label: "Ver detalle", onClick: (expense) => navigate(`/nexo-av/${userId}/expenses/${expense.id}`) },
    { label: "Duplicar", onClick: () => undefined },
    { label: "Eliminar (sin n. definitivo)", icon: <Trash2 className="mr-2 h-4 w-4" />, variant: "destructive", condition: (expense) => canDeleteExpense(expense), onClick: (expense) => { setExpenseToDelete(expense); setDeleteDialogOpen(true); } },
  ];

  const footerCells: DataListFooterCell[] = [
    { key: "number", value: <span className="text-muted-foreground text-xs uppercase">Total ({visibleExpenses.length})</span>, align: "left" },
    { key: "subtotal", value: <span>{formatCurrency(visibleExpenses.reduce((sum, expense) => sum + toNumber(expense.tax_base), 0))}</span>, align: "right" },
    { key: "total", value: <span>{formatCurrency(visibleExpenses.reduce((sum, expense) => sum + toNumber(expense.total), 0))}</span>, align: "right" },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-6">
      <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
        {uploadRetryPending && <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Ticket subido pero no guardado</AlertTitle><AlertDescription className="mt-1 flex flex-wrap items-center gap-2"><span>El archivo esta en el servidor. Puedes reintentar guardar el registro sin volver a subir.</span><Button size="sm" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={handleRetryPendingUpload} disabled={retryingUpload}>{retryingUpload ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reintentar guardado"}</Button></AlertDescription></Alert>}
        {!showTechnicalDrafts && hiddenTechnicalDraftsCount > 0 && <Alert className="mb-4 border-border bg-card text-foreground"><Info className="h-4 w-4" /><AlertTitle>Borradores tecnicos ocultos</AlertTitle><AlertDescription>Se han ocultado {hiddenTechnicalDraftsCount} tickets vacios en borrador para priorizar la gestion real.</AlertDescription></Alert>}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card/50 p-4"><div className="mb-2 flex items-center gap-3"><div className="rounded-lg bg-amber-500/10 p-2 text-amber-500"><TrendingDown className="h-5 w-5" /></div><span className="text-sm font-medium text-muted-foreground">Gasto Total</span></div><div><span className="text-2xl font-bold text-foreground">{formatCurrency(visibleExpenses.reduce((sum, expense) => sum + toNumber(expense.total), 0))}</span><div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><span>{visibleExpenses.length} tickets</span></div></div></div>
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card/70 p-4"><div className="mb-2 flex items-center gap-3"><div className="rounded-lg bg-blue-500/10 p-2 text-blue-500"><AlertCircle className="h-5 w-5" /></div><span className="text-sm font-medium text-muted-foreground">Pendiente de Pago</span></div><div><span className="text-2xl font-bold text-foreground">{formatCurrency(visibleExpenses.reduce((sum, expense) => sum + toNumber(expense.pending_amount), 0))}</span><div className="mt-1 flex items-center gap-1 text-xs text-blue-500"><span>{visibleExpenses.filter((expense) => expense.pending_amount > 0).length} tickets pendientes</span></div></div></div>
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card/70 p-4"><div className="mb-2 flex items-center gap-3"><div className="rounded-lg bg-red-500/10 p-2 text-red-500"><AlertCircle className="h-5 w-5" /></div><span className="text-sm font-medium text-muted-foreground">Vencido</span></div><div><span className="text-2xl font-bold text-red-500">{formatCurrency(visibleExpenses.filter((expense) => { const paymentStatus = calculatePaymentStatus(toNumber(expense.paid_amount), toNumber(expense.total), expense.due_date ?? null, expense.status); if (normalizePurchaseDocumentStatus(expense.status) !== "APPROVED") return false; if (paymentStatus === "PAID") return false; if (!expense.due_date) return false; return new Date(expense.due_date) < new Date(); }).reduce((sum, expense) => sum + toNumber(expense.total), 0))}</span><div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><span>Requiere atencion inmediata</span></div></div></div>
          </div>
          <div className="mb-6"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-foreground md:text-3xl">Gastos</h1><Info className="h-4 w-4 text-muted-foreground" /></div><div className="flex items-center gap-2"><input type="file" id="desktop-upload-expense" className="hidden" accept="image/*,application/pdf" onChange={(event) => event.target.files?.[0] && handleUpload(event.target.files[0])} /><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-accent hover:text-foreground">Acciones<ChevronDown className="ml-1 h-3 w-3" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="bg-popover border-border"><DropdownMenuItem>Exportar seleccionados</DropdownMenuItem><DropdownMenuItem>Duplicar seleccionados</DropdownMenuItem>{selectedDeletable.length > 0 && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setBulkDeleteDialogOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Eliminar seleccionados sin n. definitivo ({selectedDeletable.length})</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu><Button onClick={() => document.getElementById("desktop-upload-expense")?.click()} disabled={uploading} className="h-9 bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700">{uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}Nuevo gasto<span className="ml-2 text-xs opacity-70">N</span></Button></div></div><div className="flex flex-wrap items-center gap-2"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className={cn("h-8 px-3 text-xs", statusFilter !== "all" && "bg-accent text-accent-foreground")}>{getStatusFilterLabel(statusFilter)}<ChevronDown className="ml-1 h-3 w-3" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="bg-popover border-border"><DropdownMenuItem onClick={() => setStatusFilter("all")} className={cn(statusFilter === "all" && "bg-accent")}>Todos los estados</DropdownMenuItem><DropdownMenuItem onClick={() => setStatusFilter("DRAFT")} className={cn(statusFilter === "DRAFT" && "bg-accent")}>Borradores</DropdownMenuItem><DropdownMenuItem onClick={() => setStatusFilter("PENDING_VALIDATION")} className={cn(statusFilter === "PENDING_VALIDATION" && "bg-accent")}>Pendientes revision</DropdownMenuItem><DropdownMenuItem onClick={() => setStatusFilter("APPROVED")} className={cn(statusFilter === "APPROVED" && "bg-accent")}>Aprobados</DropdownMenuItem><DropdownMenuItem onClick={() => setStatusFilter("PAID")} className={cn(statusFilter === "PAID" && "bg-accent")}>Pagado</DropdownMenuItem><DropdownMenuItem onClick={() => setStatusFilter("CANCELLED")} className={cn(statusFilter === "CANCELLED" && "bg-accent")}>Anulados</DropdownMenuItem></DropdownMenuContent></DropdownMenu><Button variant="outline" size="sm" className={cn("h-8 px-3 text-xs", !showTechnicalDrafts && "bg-accent text-accent-foreground")} onClick={() => setShowTechnicalDrafts((current) => !current)}><Filter className="mr-1 h-3 w-3" />{showTechnicalDrafts ? "Ver todos" : `Ocultar borr. tecnicos (${hiddenTechnicalDraftsCount})`}</Button><div className="relative min-w-[200px] max-w-md flex-1"><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar gastos..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="pr-11" /></div><Button variant="outline" size="sm" className="h-8 px-3 text-xs"><Calendar className="mr-1 h-3 w-3" />01/12/2025 - 31/12/2025</Button></div></div>
          {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : visibleExpenses.length === 0 ? <div className="flex flex-col items-center justify-center py-12"><TrendingDown className="mb-4 h-16 w-16 text-muted-foreground/40" /><p className="text-muted-foreground">No hay gastos</p><p className="mt-1 text-sm text-muted-foreground/80">Escanea un ticket o sube un documento para crear un nuevo gasto</p></div> : <><div className="flex-1 min-h-0 overflow-hidden"><DataList data={paginatedExpenses} columns={[{ key: "select", label: <Checkbox checked={allVisibleOnPageSelected} onCheckedChange={handleSelectAll} aria-label="Seleccionar todos" className="data-[state=checked]:border-primary data-[state=checked]:bg-primary" />, align: "center", width: "40px", priority: 1, render: (expense: ExpenseRow) => <div onClick={(event) => event.stopPropagation()}><Checkbox checked={selectedExpenses.has(expense.id)} onCheckedChange={(checked) => handleSelectExpense(expense.id, checked as boolean)} aria-label={`Seleccionar gasto ${expense.internal_purchase_number || expense.invoice_number}`} className="data-[state=checked]:border-primary data-[state=checked]:bg-primary" /></div> }, { key: "number", label: "Nº", sortable: true, align: "left", priority: 1, render: (expense: ExpenseRow) => <span className="font-mono text-foreground/80">{expense.internal_purchase_number || expense.invoice_number}</span> }, { key: "provider", label: "Proveedor", sortable: true, align: "left", priority: 3, render: (expense: ExpenseRow) => <div className="flex items-center gap-2"><span className="truncate text-foreground">{expense.provider_name || "-"}</span>{expense.provider_type === "TECHNICIAN" && <Badge className="border-none bg-violet-500/10 text-[8px] text-violet-400">TECNICO</Badge>}</div> }, { key: "project", label: "Proyecto", sortable: true, align: "left", priority: 4, render: (expense: ExpenseRow) => <span className="text-muted-foreground">{expense.project_name || "-"}</span> }, { key: "status", label: "Estado doc.", sortable: true, align: "center", priority: 2, render: (expense: ExpenseRow) => { const documentStatusInfo = getDocumentStatusInfo(expense.status); return <div className="flex justify-center"><Badge variant="outline" className={cn(documentStatusInfo.className, "w-28 justify-center border px-1.5 py-0.5 text-[11px]")}>{documentStatusInfo.label}</Badge></div>; } }, { key: "payment_status", label: "Estado pago", align: "center", priority: 5, render: (expense: ExpenseRow) => { const paymentStatus = calculatePaymentStatus(toNumber(expense.paid_amount), toNumber(expense.total), expense.due_date ?? null, expense.status); const paymentStatusInfo = getPaymentStatusInfo(paymentStatus); if (!paymentStatusInfo) return <span className="text-muted-foreground">-</span>; return <div className="flex justify-center"><Badge variant="outline" className={cn(paymentStatusInfo.className, "w-24 justify-center border px-1.5 py-0.5 text-[10px]")}>{paymentStatusInfo.label}</Badge></div>; } }, { key: "date", label: "Emision", sortable: true, align: "left", priority: 5, render: (expense: ExpenseRow) => <span className="text-muted-foreground">{formatDate(expense.issue_date)}</span> }, { key: "subtotal", label: "Subtotal", align: "right", priority: 6, render: (expense: ExpenseRow) => <span className="text-muted-foreground">{formatCurrency(toNumber(expense.tax_base))}</span> }, { key: "total", label: "Total", sortable: true, align: "right", priority: 4, render: (expense: ExpenseRow) => <span className="text-foreground">{formatCurrency(toNumber(expense.total))}</span> }, { key: "payment", label: "Pago", align: "center", priority: 6, width: "120px", render: (expense: ExpenseRow) => { const paymentStatus = calculatePaymentStatus(toNumber(expense.paid_amount), toNumber(expense.total), expense.due_date ?? null, expense.status); const canRegisterPayment = Boolean(paymentStatus && paymentStatus !== "PAID" && toNumber(expense.pending_amount) > 0 && expense.internal_purchase_number); if (!canRegisterPayment) return <span className="text-muted-foreground">-</span>; return <div onClick={(event) => event.stopPropagation()}><RegisterPurchasePaymentDialog invoiceId={expense.id} pendingAmount={expense.pending_amount} onPaymentRegistered={fetchExpenses} trigger={<Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700" onClick={(event) => event.stopPropagation()}><CreditCard className="mr-1 h-3.5 w-3.5" />Pagar</Button>} /></div>; } }]} actions={expenseActions} onItemClick={(expense) => navigate(`/nexo-av/${userId}/expenses/${expense.id}`)} rowClassName={(expense) => selectedExpenses.has(expense.id) ? "bg-accent/60" : undefined} sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} loading={loading} emptyMessage="No hay gastos" emptyIcon={<TrendingDown className="h-16 w-16 text-muted-foreground" />} getItemId={(expense) => expense.id} footerCells={footerCells} /></div>{totalPages > 1 && <div className="mt-4"><PaginationControls currentPage={currentPage} totalPages={totalPages} startIndex={startIndex} endIndex={endIndex} totalItems={totalItems} canGoPrev={canGoPrev} canGoNext={canGoNext} onPrevPage={prevPage} onNextPage={nextPage} onGoToPage={goToPage} /></div>}</>}
        </motion.div>
      </div>
      <AnimatePresence>{showScanner && <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}><DocumentScanner onCapture={handleUpload} onCancel={() => setShowScanner(false)} title="Escanear Ticket de Gasto" /></Suspense>}</AnimatePresence>
      <ConfirmActionDialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setExpenseToDelete(null); }} title="Eliminar gasto" description={`Eliminar el ticket "${(expenseToDelete?.internal_purchase_number || expenseToDelete?.invoice_number) ?? ""}"? Solo se pueden eliminar gastos que aun no tienen numero definitivo.`} confirmLabel="Eliminar" cancelLabel="Cancelar" variant="destructive" onConfirm={handleConfirmDeleteExpense} loading={deleting} />
      <ConfirmActionDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen} title="Eliminar gastos sin n. definitivo" description={`Eliminar ${selectedDeletable.length} gasto(s) seleccionado(s) que no tienen numero definitivo? Esta accion no se puede deshacer.`} confirmLabel="Eliminar" cancelLabel="Cancelar" variant="destructive" onConfirm={handleConfirmBulkDelete} loading={deletingBulk} />
    </div>
  );
};

export default ExpensesPageDataList;

