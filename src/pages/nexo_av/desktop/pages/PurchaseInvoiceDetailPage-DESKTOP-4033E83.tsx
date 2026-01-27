import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  Loader2, 
  Save, 
  FileText, 
  Building2, 
  UserRound, 
  FolderKanban,
  Calendar,
  Hash,
  CreditCard,
  AlertCircle,
  Check,
  X,
  ExternalLink,
  Download,
  Pencil,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PURCHASE_INVOICE_CATEGORIES } from "@/constants/purchaseInvoiceCategories";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import PurchaseInvoiceLinesEditor, { PurchaseInvoiceLine } from "../components/purchases/PurchaseInvoiceLinesEditor";
import PurchaseInvoicePaymentsSection from "../components/purchases/PurchaseInvoicePaymentsSection";
import SupplierSearchInput from "../components/suppliers/SupplierSearchInput";
import ProjectSearchInput from "../components/projects/ProjectSearchInput";
import { cn } from "@/lib/utils";

interface Supplier {
  id: string;
  company_name: string;
  tax_id: string | null;
}

interface Technician {
  id: string;
  company_name: string;
  tax_id: string | null;
  withholding_tax_rate: number | null;
}

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name?: string;
}

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
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_number: string | null;
  supplier_tax_id: string | null;
  technician_id: string | null;
  technician_name: string | null;
  technician_number: string | null;
  technician_tax_id: string | null;
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

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pendiente", color: "status-warning" },
  { value: "REGISTERED", label: "Registrada", color: "status-info" },
  { value: "APPROVED", label: "Aprobada", color: "status-success" },
  { value: "PAID", label: "Pagada", color: "status-success" },
  { value: "CANCELLED", label: "Anulada", color: "status-error" },
];

const EXPENSE_CATEGORIES = PURCHASE_INVOICE_CATEGORIES;

// Simple file preview component for uploaded documents
const FilePreview = ({ filePath }: { filePath: string }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const isPdf = filePath.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filePath);

  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.storage
          .from('purchase-documents')
          .createSignedUrl(filePath, 3600);
        
        if (error) throw error;
        setFileUrl(data.signedUrl);
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    getSignedUrl();
  }, [filePath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !fileUrl) {
    return (
      <div className="text-center text-muted-foreground">
        <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p>Error al cargar el documento</p>
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
            Abrir en nueva pestaña
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
            Abrir en nueva pestaña
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center text-muted-foreground">
      <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
      <p>Formato no soportado para vista previa</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 gap-2"
        onClick={() => window.open(fileUrl, '_blank')}
      >
        <Download className="h-4 w-4" />
        Descargar archivo
      </Button>
    </div>
  );
};

const PurchaseInvoiceDetailPageDesktop = () => {
  const { userId, invoiceId } = useParams<{ userId: string; invoiceId: string }>();
  const purchaseInvoiceId = invoiceId;
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [lines, setLines] = useState<PurchaseInvoiceLine[]>([]);
  const [activeTab, setActiveTab] = useState("datos");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Form state
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  
  // Entity selection
  const [entityType, setEntityType] = useState<"SUPPLIER" | "TECHNICIAN">("SUPPLIER");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [supplierSearchValue, setSupplierSearchValue] = useState("");
  
  // Project selection
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectSearchValue, setProjectSearchValue] = useState("");

  // Fetch invoice data
  const fetchInvoice = useCallback(async () => {
    if (!purchaseInvoiceId) return;
    
    try {
      setLoading(true);
      
      // Get invoice details
      const { data: invoiceData, error: invoiceError } = await supabase.rpc("get_purchase_invoice", {
        p_invoice_id: purchaseInvoiceId,
      });
      
      if (invoiceError) throw invoiceError;
      if (!invoiceData || invoiceData.length === 0) {
        toast.error("Factura no encontrada");
        navigate(`/nexo-av/${userId}/purchase-invoices`);
        return;
      }
      
      const inv = invoiceData[0] as PurchaseInvoice;
      setInvoice(inv);
      
      // Set form values
      setSupplierInvoiceNumber(inv.supplier_invoice_number || "");
      setIssueDate(inv.issue_date || "");
      setDueDate(inv.due_date || "");
      setStatus(inv.status || "PENDING");
      setExpenseCategory(inv.expense_category || "");
      setNotes(inv.notes || "");
      setInternalNotes(inv.internal_notes || "");
      
      // Set entity
      if (inv.supplier_id) {
        setEntityType("SUPPLIER");
        setSelectedSupplierId(inv.supplier_id);
        setSupplierSearchValue(inv.supplier_name || "");
      } else if (inv.technician_id) {
        setEntityType("TECHNICIAN");
        setSelectedTechnicianId(inv.technician_id);
        setSupplierSearchValue(inv.technician_name || "");
      } else {
        setSupplierSearchValue("");
      }
      
      // Set project
      if (inv.project_id) {
        setSelectedProjectId(inv.project_id);
        setProjectSearchValue(inv.project_name || "");
      } else {
        setProjectSearchValue("");
      }
      
      // Get lines
      const { data: linesData, error: linesError } = await supabase.rpc("get_purchase_invoice_lines", {
        p_invoice_id: purchaseInvoiceId,
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
        withholding_tax_rate: l.withholding_tax_rate || 0,
        subtotal: l.subtotal,
        tax_amount: l.tax_amount,
        withholding_amount: l.withholding_amount || 0,
        total: l.total,
      })));
      
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      toast.error("Error al cargar la factura");
    } finally {
      setLoading(false);
    }
  }, [purchaseInvoiceId, userId, navigate]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Handle save
  const handleSave = async () => {
    if (!purchaseInvoiceId || !invoice) return;
    
    try {
      setSaving(true);
      
      // Update invoice
      const { error: updateError } = await supabase.rpc("update_purchase_invoice", {
        p_invoice_id: purchaseInvoiceId,
        p_supplier_invoice_number: supplierInvoiceNumber || null,
        p_issue_date: issueDate || null,
        p_due_date: dueDate || null,
        p_status: status,
        p_expense_category: expenseCategory || null,
        p_notes: notes || null,
        p_internal_notes: internalNotes || null,
        p_supplier_id: entityType === "SUPPLIER" ? selectedSupplierId : null,
        p_technician_id: entityType === "TECHNICIAN" ? selectedTechnicianId : null,
        p_project_id: selectedProjectId || null,
      });
      
      if (updateError) throw updateError;
      
      // Update lines - delete old and add new
      // First, delete all existing lines
      for (const line of invoice ? lines.filter(l => l.id) : []) {
        if (line.id) {
          await supabase.rpc("delete_purchase_invoice_line", { p_line_id: line.id });
        }
      }
      
      // Add all lines
      for (const line of lines) {
        await supabase.rpc("add_purchase_invoice_line", {
          p_invoice_id: purchaseInvoiceId,
          p_concept: line.concept,
          p_description: line.description || null,
          p_quantity: line.quantity,
          p_unit_price: line.unit_price,
          p_tax_rate: line.tax_rate,
        });
      }
      
      toast.success("Factura guardada correctamente");
      setHasChanges(false);
      setIsEditing(false);
      await fetchInvoice();
      
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast.error("Error al guardar la factura");
    } finally {
      setSaving(false);
    }
  };

  // Handle approve invoice
  const handleApprove = async () => {
    if (!purchaseInvoiceId || !invoice) return;
    
    try {
      setApproving(true);
      
      // First save any pending changes
      if (hasChanges) {
        await handleSave();
      }
      
      // Use the new approve_purchase_invoice RPC which assigns definitive number
      const { data, error: approveError } = await (supabase.rpc as any)("approve_purchase_invoice", {
        p_invoice_id: purchaseInvoiceId,
      });
      
      if (approveError) throw approveError;
      
      const newNumber = data?.[0]?.invoice_number;
      toast.success(`Factura aprobada: ${newNumber || 'OK'}`);
      setIsEditing(false);
      await fetchInvoice();
      
    } catch (error: any) {
      console.error("Error approving invoice:", error);
      toast.error(error.message || "Error al aprobar la factura");
    } finally {
      setApproving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setHasChanges(false);
    fetchInvoice(); // Reset to original values
  };

  // Handle supplier selection
  const handleSelectSupplier = (supplier: Supplier) => {
    setSelectedSupplierId(supplier.id);
    setSelectedTechnicianId(null);
    setEntityType("SUPPLIER");
    setSupplierSearchValue(supplier.company_name);
    setHasChanges(true);
  };

  // Handle technician selection
  const handleSelectTechnician = (technician: Technician) => {
    setSelectedTechnicianId(technician.id);
    setSelectedSupplierId(null);
    setEntityType("TECHNICIAN");
    setSupplierSearchValue(technician.company_name);
    setHasChanges(true);
  };

  // Handle project selection
  const handleSelectProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setProjectSearchValue(project.project_name);
    setHasChanges(true);
  };

  // Get status info
  const getStatusInfo = (statusValue: string) => {
    return STATUS_OPTIONS.find(s => s.value === statusValue) || STATUS_OPTIONS[0];
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

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Factura no encontrada</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices`)}
          >
            Volver a Facturas de Compra
          </Button>
        </div>
      </div>
    );
  }

  const isLocked = invoice.is_locked || invoice.status === "APPROVED" || invoice.status === "PAID";
  const statusInfo = getStatusInfo(invoice.status);
  const canApprove = !isLocked && (invoice.status === "PENDING" || invoice.status === "REGISTERED");
  const canEdit = !isLocked;

  return (
    <div className="flex flex-col h-full">
      <DetailNavigationBar
        pageTitle={invoice.supplier_invoice_number || invoice.invoice_number || "Factura de Compra"}
        backPath={`/nexo-av/${userId}/purchase-invoices`}
        contextInfo={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
            {invoice.internal_purchase_number && (
              <span className="text-sm text-muted-foreground font-mono">
                {invoice.internal_purchase_number}
              </span>
            )}
          </div>
        }
        tools={
          <div className="flex items-center gap-2">
            {/* Edit Mode Controls */}
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
                  className="gap-2"
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
                {/* View Mode Controls */}
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
                    className="gap-2 status-success"
                  >
                    {approving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Aprobar
                  </Button>
                )}
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
              <FileText className="h-4 w-4" />
              Documento
            </h3>
          </div>
          <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
            {invoice.file_path ? (
              <FilePreview filePath={invoice.file_path} />
            ) : (
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Sin documento adjunto</p>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Form */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-border px-4">
              <TabsList className="h-11 bg-transparent">
                <TabsTrigger value="datos" className="data-[state=active]:bg-accent">
                  Datos
                </TabsTrigger>
                <TabsTrigger value="lineas" className="data-[state=active]:bg-accent">
                  Líneas ({lines.length})
                </TabsTrigger>
                <TabsTrigger value="pagos" className="data-[state=active]:bg-accent">
                  Pagos
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="datos" className="m-0 p-4 space-y-6">
                {/* Basic info */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Información del Documento
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Nº Factura Proveedor</Label>
                      <Input
                        value={supplierInvoiceNumber}
                        onChange={(e) => {
                          setSupplierInvoiceNumber(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="Número de factura del proveedor"
                        disabled={!isEditing || isLocked}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Estado</Label>
                      <Select
                        value={status}
                        onValueChange={(value) => {
                          setStatus(value);
                          setHasChanges(true);
                        }}
                        disabled={!isEditing || isLocked}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Fecha Emisión</Label>
                      <Input
                        type="date"
                        value={issueDate}
                        onChange={(e) => {
                          setIssueDate(e.target.value);
                          setHasChanges(true);
                        }}
                        disabled={!isEditing || isLocked}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Fecha Vencimiento</Label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => {
                          setDueDate(e.target.value);
                          setHasChanges(true);
                        }}
                        disabled={!isEditing || isLocked}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Categoría</Label>
                    <Select
                      value={expenseCategory}
                      onValueChange={(value) => {
                        setExpenseCategory(value);
                        setHasChanges(true);
                      }}
                      disabled={!isEditing || isLocked}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>

                {/* Provider */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4"
                >
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    {entityType === "SUPPLIER" ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      <UserRound className="h-4 w-4" />
                    )}
                    Proveedor / Técnico
                  </h4>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={entityType === "SUPPLIER" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setEntityType("SUPPLIER");
                          setSelectedTechnicianId(null);
                          setHasChanges(true);
                        }}
                        disabled={!isEditing || isLocked}
                        className="gap-2"
                      >
                        <Building2 className="h-4 w-4" />
                        Proveedor
                      </Button>
                      <Button
                        type="button"
                        variant={entityType === "TECHNICIAN" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setEntityType("TECHNICIAN");
                          setSelectedSupplierId(null);
                          setHasChanges(true);
                        }}
                        disabled={!isEditing || isLocked}
                        className="gap-2"
                      >
                        <UserRound className="h-4 w-4" />
                        Técnico
                      </Button>
                    </div>

                    <SupplierSearchInput
                      value={supplierSearchValue}
                      onChange={setSupplierSearchValue}
                      onSelectSupplier={handleSelectSupplier}
                      onSelectTechnician={handleSelectTechnician}
                      entityType={entityType === "SUPPLIER" ? "SUPPLIER" : "TECHNICIAN"}
                      placeholder={`Escribe @ para buscar ${entityType === "SUPPLIER" ? "proveedores" : "técnicos"}`}
                      disabled={!isEditing || isLocked}
                    />

                    {(selectedSupplierId || selectedTechnicianId) && (
                      <div className="flex items-center gap-2 p-2 bg-accent/50 rounded-lg">
                        {entityType === "SUPPLIER" ? (
                          <Building2 className="h-4 w-4 text-primary" />
                        ) : (
                          <UserRound className="h-4 w-4 text-primary" />
                        )}
                        <span className="text-sm font-medium">{supplierSearchValue}</span>
                        {isEditing && !isLocked && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-6 w-6 p-0"
                            onClick={() => {
                              setSelectedSupplierId(null);
                              setSelectedTechnicianId(null);
                              setSupplierSearchValue("");
                              setHasChanges(true);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Project */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-4"
                >
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <FolderKanban className="h-4 w-4" />
                    Proyecto (Opcional)
                  </h4>

                  <ProjectSearchInput
                    value={projectSearchValue}
                    onChange={setProjectSearchValue}
                    onSelectProject={handleSelectProject}
                    placeholder="Seleccionar proyecto o @buscar"
                    showDropdown={isEditing && !isLocked}
                  />

                  {selectedProjectId && (
                    <div className="flex items-center gap-2 p-2 bg-accent/50 rounded-lg">
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

                {/* Notes */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-4"
                >
                  <h4 className="text-sm font-medium text-foreground">Notas</h4>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Notas públicas</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        setHasChanges(true);
                      }}
                      placeholder="Notas visibles en el documento..."
                      rows={2}
                      disabled={!isEditing || isLocked}
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
                      placeholder="Notas solo visibles internamente..."
                      rows={2}
                      disabled={!isEditing || isLocked}
                    />
                  </div>
                </motion.div>

                {/* Totals summary */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-accent/30 rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base imponible</span>
                    <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA</span>
                    <span className="font-medium">{formatCurrency(totals.tax)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                    <span>Total</span>
                    <span>{formatCurrency(totals.total)}</span>
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="lineas" className="m-0 p-4">
                <PurchaseInvoiceLinesEditor
                  lines={lines}
                  onChange={(newLines) => {
                    setLines(newLines);
                    setHasChanges(true);
                  }}
                  disabled={isLocked}
                />
              </TabsContent>

              <TabsContent value="pagos" className="m-0 p-4">
                <PurchaseInvoicePaymentsSection 
                  invoiceId={purchaseInvoiceId!}
                  total={totals.total}
                  paidAmount={invoice.paid_amount}
                  pendingAmount={invoice.pending_amount}
                  status={invoice.status}
                  isLocked={isLocked}
                  onPaymentChange={fetchInvoice}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PurchaseInvoiceDetailPageDesktop;
