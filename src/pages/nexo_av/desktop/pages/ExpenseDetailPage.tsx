import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  Loader2, 
  Save, 
  FileText, 
  FolderKanban,
  Calendar,
  Receipt,
  AlertCircle,
  X,
  ExternalLink,
  Download,
  Pencil,
  CheckCircle2,
  MoreHorizontal,
  Trash2,
  Store,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import TicketLinesEditor, { TicketLine } from "../components/purchases/TicketLinesEditor";
import ProjectSearchInput from "../components/projects/ProjectSearchInput";
import PurchaseInvoicePaymentsSection from "../components/purchases/PurchaseInvoicePaymentsSection";
import { TICKET_CATEGORIES, getTicketCategoryInfo } from "@/constants/ticketCategories";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name?: string;
}

interface Expense {
  id: string;
  invoice_number: string;
  internal_purchase_number: string | null;
  document_type: string;
  issue_date: string;
  tax_base: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  manual_beneficiary_name: string | null;
  project_id: string | null;
  project_name: string | null;
  project_number: string | null;
  file_path: string | null;
  file_name: string | null;
  notes: string | null;
  internal_notes: string | null;
  expense_category: string | null;
  is_locked: boolean;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
}

// Ruta normalizada para Storage
const normalizeStoragePath = (path: string): string => path.trim().replace(/^\//, '');

// File preview component
const FilePreview = ({ filePath }: { filePath: string }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const normalizedPath = normalizeStoragePath(filePath);
  const isPdf = normalizedPath.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(normalizedPath);

  useEffect(() => {
    if (!normalizedPath) {
      setError(true);
      setErrorMessage('Ruta del documento vacía');
      setLoading(false);
      return;
    }
    const getSignedUrl = async () => {
      try {
        setLoading(true);
        setError(false);
        setErrorMessage(null);
        const { data, error: err } = await supabase.storage
          .from('purchase-documents')
          .createSignedUrl(normalizedPath, 3600);
        
        if (err) {
          console.error('Storage createSignedUrl error:', err.message, { path: normalizedPath });
          setErrorMessage(err.message || 'Error al obtener el documento');
          setError(true);
          return;
        }
        const url = data?.signedUrl ?? null;
        if (!url) {
          setErrorMessage('No se pudo generar el enlace al documento');
          setError(true);
          return;
        }
        setFileUrl(url);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        console.error('Error getting signed URL:', msg, err);
        setErrorMessage(msg);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    getSignedUrl();
  }, [normalizedPath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !fileUrl) {
    return (
      <div className="text-center text-muted-foreground p-4">
        <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p>Error al cargar el documento</p>
        {errorMessage && <p className="text-sm mt-1 opacity-80">{errorMessage}</p>}
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="w-full h-full flex flex-col">
        <iframe
          src={fileUrl}
          className="w-full flex-1 rounded-lg border border-border"
          title="Document preview"
        />
        <div className="flex justify-center gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(fileUrl, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-2"
          >
            <a href={fileUrl} download>
              <Download className="h-4 w-4" />
              Descargar
            </a>
          </Button>
        </div>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <img
          src={fileUrl}
          alt="Document preview"
          className="max-w-full max-h-[calc(100%-60px)] object-contain rounded-lg border border-border"
        />
        <div className="flex justify-center gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(fileUrl, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center text-muted-foreground">
      <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
      <p>Formato no soportado</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 gap-2"
        onClick={() => window.open(fileUrl, '_blank')}
      >
        <Download className="h-4 w-4" />
        Descargar
      </Button>
    </div>
  );
};

const ExpenseDetailPage = () => {
  const { userId, invoiceId } = useParams<{ userId: string; invoiceId: string }>();
  const expenseId = invoiceId;
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [lines, setLines] = useState<TicketLine[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<"datos" | "pagos">("datos");
  
  // Form state
  const [issueDate, setIssueDate] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [establishmentName, setEstablishmentName] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [priceIncludesTax, setPriceIncludesTax] = useState(true);
  
  // Project selection
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectSearchValue, setProjectSearchValue] = useState("");

  // Fetch expense data
  const fetchExpense = useCallback(async () => {
    if (!expenseId) return;
    
    try {
      setLoading(true);
      
      // Get expense details using the same RPC as purchase invoices
      const { data: expenseData, error: expenseError } = await supabase.rpc("get_purchase_invoice", {
        p_invoice_id: expenseId,
      });
      
      if (expenseError) throw expenseError;
      if (!expenseData || expenseData.length === 0) {
        toast.error("Gasto no encontrado");
        navigate(`/nexo-av/${userId}/expenses`);
        return;
      }
      
      const exp = expenseData[0] as unknown as Expense;
      setExpense(exp);
      
      // Set form values
      setIssueDate(exp.issue_date || "");
      setExpenseCategory(exp.expense_category || "");
      setEstablishmentName(exp.manual_beneficiary_name || "");
      setNotes(exp.notes || "");
      setInternalNotes(exp.internal_notes || "");
      
      // Set project
      if (exp.project_id) {
        setSelectedProjectId(exp.project_id);
        setProjectSearchValue(exp.project_name || "");
      } else {
        setProjectSearchValue("");
      }
      
      // Get lines
      const { data: linesData, error: linesError } = await supabase.rpc("get_purchase_invoice_lines", {
        p_invoice_id: expenseId,
      });
      
      if (linesError) throw linesError;
      
      setLines((linesData || []).map((l: any) => ({
        id: l.id,
        concept: l.concept,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        tax_rate: l.tax_rate,
        discount_percent: l.discount_percent || 0,
        subtotal: l.subtotal,
        tax_amount: l.tax_amount,
        total: l.total,
      })));
      
    } catch (error: any) {
      console.error("Error fetching expense:", error);
      toast.error("Error al cargar el gasto");
    } finally {
      setLoading(false);
    }
  }, [expenseId, userId, navigate]);

  useEffect(() => {
    fetchExpense();
  }, [fetchExpense]);

  // Fetch user roles
  useEffect(() => {
    const fetchUserRoles = async () => {
      try {
        const { data, error } = await supabase.rpc('get_current_user_info');
        if (!error && data && data.length > 0) {
          setUserRoles(data[0].roles || []);
        }
      } catch (err) {
        console.error('Error fetching user roles:', err);
      }
    };
    fetchUserRoles();
  }, []);

  // Handle save
  const handleSave = async () => {
    if (!expenseId || !expense) return;
    
    if (!expenseCategory) {
      toast.error("Selecciona un tipo de gasto");
      return;
    }
    
    try {
      setSaving(true);
      
      // Update expense
      const { error: updateError } = await supabase.rpc("update_purchase_invoice", {
        p_invoice_id: expenseId,
        p_supplier_invoice_number: null,
        p_issue_date: issueDate || null,
        p_due_date: null,
        p_status: expense.status,
        p_expense_category: expenseCategory,
        p_notes: notes || null,
        p_internal_notes: internalNotes || null,
        p_supplier_id: null,
        p_technician_id: null,
        p_project_id: selectedProjectId || null,
        p_manual_beneficiary_name: establishmentName?.trim() || null,
      });
      
      if (updateError) throw updateError;
      
      // Update lines - delete old and add new
      const { data: existingLines, error: getLinesError } = await supabase.rpc("get_purchase_invoice_lines", {
        p_invoice_id: expenseId,
      });
      
      if (getLinesError) throw getLinesError;
      
      // Delete all existing lines
      if (existingLines && existingLines.length > 0) {
        for (const existingLine of existingLines) {
          const { error: deleteError } = await supabase.rpc("delete_purchase_invoice_line", { 
            p_line_id: existingLine.id 
          });
          if (deleteError) throw deleteError;
        }
      }
      
      // Add all lines
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const { error: lineError } = await supabase.rpc("add_purchase_invoice_line", {
          p_invoice_id: expenseId,
          p_concept: line.concept,
          p_description: line.description || null,
          p_quantity: line.quantity,
          p_unit_price: line.unit_price,
          p_tax_rate: line.tax_rate,
          p_withholding_tax_rate: 0,
          p_discount_percent: line.discount_percent || 0,
        });
        
        if (lineError) {
          throw new Error(`Error al añadir línea ${i + 1}: ${lineError.message}`);
        }
      }
      
      toast.success("Gasto guardado correctamente");
      setHasChanges(false);
      setIsEditing(false);
      await fetchExpense();
      
    } catch (error: any) {
      console.error("Error saving expense:", error);
      toast.error(error?.message || "Error al guardar el gasto");
    } finally {
      setSaving(false);
    }
  };

  // Handle approve
  const handleApprove = async () => {
    if (!expenseId || !expense) return;
    
    try {
      setApproving(true);
      
      if (hasChanges) {
        await handleSave();
      }
      
      const { data, error: approveError } = await supabase.rpc("approve_purchase_invoice", {
        p_invoice_id: expenseId,
      });
      
      if (approveError) throw approveError;
      
      const newNumber = data?.[0]?.invoice_number;
      toast.success(`Gasto aprobado: ${newNumber || 'OK'}`);
      setIsEditing(false);
      await fetchExpense();
      
    } catch (error: any) {
      console.error("Error approving expense:", error);
      const msg = error?.message || "";
      if (msg.includes("Periodo cerrado") || msg.includes("periodo cerrado")) {
        toast.error(
          "No se puede aprobar: el mes está cerrado en Contabilidad. " +
          "Cambia la fecha a un mes abierto o reabre el periodo.",
          { duration: 8000 }
        );
      } else {
        toast.error(msg || "Error al aprobar el gasto");
      }
    } finally {
      setApproving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setHasChanges(false);
    fetchExpense();
  };

  // Handle delete
  const handleDelete = async () => {
    if (!expenseId || !expense) return;
    
    try {
      setDeleting(true);
      
      // Delete all lines first
      const { data: existingLines, error: getLinesError } = await supabase.rpc("get_purchase_invoice_lines", {
        p_invoice_id: expenseId,
      });
      
      if (getLinesError) throw getLinesError;
      
      if (existingLines && existingLines.length > 0) {
        for (const line of existingLines) {
          const { error: deleteLineError } = await supabase.rpc("delete_purchase_invoice_line", { 
            p_line_id: line.id 
          });
          if (deleteLineError) {
            console.warn("Error deleting line:", deleteLineError);
          }
        }
      }
      
      // Delete the expense
      const { error: deleteError } = await (supabase as any)
        .from("purchase_invoices")
        .delete()
        .eq("id", expenseId);
      
      if (deleteError) throw deleteError;
      
      // If there's a scanned document linked, update its status
      if (expense.file_path) {
        await supabase
          .from("scanned_documents")
          .update({
            status: "UNASSIGNED",
            assigned_to_type: null,
            assigned_to_id: null,
          })
          .eq("assigned_to_id", expenseId);
      }
      
      toast.success("Gasto eliminado correctamente");
      navigate(`/nexo-av/${userId}/expenses`);
      
    } catch (error: any) {
      console.error("Error deleting expense:", error);
      toast.error("Error al eliminar: " + error.message);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Handle project selection
  const handleSelectProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setProjectSearchValue(project.project_name);
    setHasChanges(true);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Calculate totals from lines
  const totals = {
    subtotal: lines.reduce((sum, l) => sum + l.subtotal, 0),
    tax: lines.reduce((sum, l) => sum + l.tax_amount, 0),
    total: lines.reduce((sum, l) => sum + l.total, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Gasto no encontrado</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(`/nexo-av/${userId}/expenses`)}
          >
            Volver a Gastos
          </Button>
        </div>
      </div>
    );
  }

  const isLocked = expense.is_locked || expense.status === "APPROVED" || expense.status === "PAID";
  const isAdmin = userRoles.includes('admin');
  const hasDefinitiveNumber = !!expense.internal_purchase_number;
  const canApprove = isAdmin && (
    (!isLocked && (expense.status === "DRAFT" || expense.status === "PENDING" || expense.status === "REGISTERED" || expense.status === "PENDING_VALIDATION")) ||
    (expense.status === "PAID" && !hasDefinitiveNumber)
  );
  const canEdit = !isLocked;
  const canDelete = !isLocked && (expense.status === "PENDING" || expense.status === "PENDING_VALIDATION" || expense.status === "DRAFT");
  
  const categoryInfo = getTicketCategoryInfo(expense.expense_category || "");

  // Status badge
  const getStatusBadge = () => {
    switch (expense.status) {
      case "APPROVED":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Aprobado</Badge>;
      case "PAID":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Pagado</Badge>;
      case "PENDING":
      case "PENDING_VALIDATION":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pendiente</Badge>;
      case "DRAFT":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Borrador</Badge>;
      default:
        return <Badge variant="outline">{expense.status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <DetailNavigationBar
        pageTitle={expense.internal_purchase_number || `Ticket ${categoryInfo?.icon || '📋'}`}
        backPath={`/nexo-av/${userId}/expenses`}
        contextInfo={
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {categoryInfo && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                {categoryInfo.icon} {categoryInfo.label}
              </Badge>
            )}
          </div>
        }
        tools={
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2 bg-amber-600 hover:bg-amber-700"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar
                </Button>
              </>
            ) : (
              <>
                {canEdit && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                )}
                {canApprove && (
                  <Button
                    onClick={handleApprove}
                    disabled={approving}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {approving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Aprobar
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setShowDeleteDialog(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar Gasto
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-hidden flex">
        {/* Left side - Document viewer */}
        <div className="w-[35%] min-w-[300px] border-r border-border bg-muted/30 flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Ticket
            </h3>
          </div>
          <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
            {expense.file_path ? (
              <FilePreview filePath={expense.file_path} />
            ) : (
              <div className="text-center text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Sin documento adjunto</p>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Form */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Section tabs */}
          <div className="border-b border-border px-4 py-2 flex gap-2">
            <Button
              variant={activeSection === "datos" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSection("datos")}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Datos del gasto
            </Button>
            <Button
              variant={activeSection === "pagos" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSection("pagos")}
              className="gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Pagos
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeSection === "datos" ? (
              <>
                {/* Tipo de gasto */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card/50 border border-amber-500/20 rounded-xl p-5"
                >
                  <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide flex items-center gap-2">
                    <span className="text-amber-500">📋</span>
                    Tipo de Gasto *
                  </h4>
                  
                  <Select
                    value={expenseCategory}
                    onValueChange={(value) => {
                      setExpenseCategory(value);
                      setHasChanges(true);
                    }}
                    disabled={!isEditing || isLocked}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Seleccionar tipo de gasto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                            <span className="text-muted-foreground text-xs">({cat.accountCode})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {categoryInfo && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Cuenta contable: {categoryInfo.accountCode}
                    </p>
                  )}
                </motion.div>

                {/* Fecha y Establecimiento */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-card/50 border border-border rounded-xl p-5"
                >
                  <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Datos del Ticket
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Fecha del Ticket</Label>
                      <Input
                        type="date"
                        value={issueDate}
                        onChange={(e) => {
                          setIssueDate(e.target.value);
                          setHasChanges(true);
                        }}
                        disabled={!isEditing || isLocked}
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        <Store className="h-3 w-3 inline mr-1" />
                        Establecimiento (opcional)
                      </Label>
                      <Input
                        value={establishmentName}
                        onChange={(e) => {
                          setEstablishmentName(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="Ej: Gasolinera Repsol, Restaurante..."
                        disabled={!isEditing || isLocked}
                        className="bg-background/50"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-3">
                    El establecimiento es informativo. No se creará un proveedor en el sistema.
                  </p>
                </motion.div>

                {/* Proyecto */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-card/50 border border-border rounded-xl p-5"
                >
                  <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide flex items-center gap-2">
                    <FolderKanban className="h-4 w-4" />
                    Proyecto (Opcional)
                  </h4>

                  <ProjectSearchInput
                    value={projectSearchValue}
                    onChange={setProjectSearchValue}
                    onSelectProject={handleSelectProject}
                    placeholder="Buscar proyecto..."
                    showDropdown={isEditing && !isLocked}
                  />

                  {selectedProjectId && (
                    <div className="flex items-center gap-2 p-2 bg-accent/50 rounded-lg mt-3">
                      <FolderKanban className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{projectSearchValue}</span>
                      {isEditing && !isLocked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-6 w-6 p-0"
                          onClick={() => {
                            setSelectedProjectId(null);
                            setProjectSearchValue("");
                            setHasChanges(true);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </motion.div>

                {/* Líneas del ticket */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-card/50 border border-border rounded-xl p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Líneas del Ticket
                    </h4>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="price-includes-tax" className="text-xs text-muted-foreground cursor-pointer">
                        Precio con IVA incluido
                      </Label>
                      <Switch
                        id="price-includes-tax"
                        checked={priceIncludesTax}
                        onCheckedChange={setPriceIncludesTax}
                        disabled={!isEditing || isLocked}
                      />
                    </div>
                  </div>
                  
                  <TicketLinesEditor
                    lines={lines}
                    onChange={(newLines) => {
                      setLines(newLines);
                      setHasChanges(true);
                    }}
                    priceIncludesTax={priceIncludesTax}
                    onPriceIncludesTaxChange={setPriceIncludesTax}
                    disabled={!isEditing || isLocked}
                  />
                </motion.div>

                {/* Notas */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-card/50 border border-border rounded-xl p-5"
                >
                  <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
                    Notas
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Notas</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => {
                          setNotes(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="Notas sobre este gasto..."
                        rows={2}
                        disabled={!isEditing || isLocked}
                        className="bg-background/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Notas internas</Label>
                      <Textarea
                        value={internalNotes}
                        onChange={(e) => {
                          setInternalNotes(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="Notas internas..."
                        rows={2}
                        disabled={!isEditing || isLocked}
                        className="bg-background/50"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Resumen de totales */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5"
                >
                  <h4 className="text-sm font-semibold text-amber-400 mb-4 uppercase tracking-wide">
                    Resumen
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base imponible</span>
                      <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA</span>
                      <span className="font-medium">{formatCurrency(totals.tax)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-amber-500/30">
                      <span className="text-amber-400">Total</span>
                      <span className="text-amber-400">{formatCurrency(totals.total)}</span>
                    </div>
                    {expense.pending_amount > 0 && (
                      <div className="flex justify-between text-sm pt-2 border-t border-amber-500/30">
                        <span className="text-muted-foreground">Pendiente de pago</span>
                        <span className="text-amber-400 font-medium">{formatCurrency(expense.pending_amount)}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            ) : (
              /* Sección de pagos */
              <PurchaseInvoicePaymentsSection 
                invoiceId={expenseId!}
                total={totals.total}
                paidAmount={expense.paid_amount}
                pendingAmount={expense.pending_amount}
                status={expense.status}
                isLocked={isLocked}
                hasDefinitiveNumber={hasDefinitiveNumber}
                onPaymentChange={fetchExpense}
              />
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente 
              el gasto <strong>{categoryInfo?.label || 'ticket'}</strong>
              {" "}y todas sus líneas asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpenseDetailPage;
