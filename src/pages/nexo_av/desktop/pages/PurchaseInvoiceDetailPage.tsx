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
  MapPin,
  Calendar,
  Hash,
  CreditCard,
  AlertCircle,
  Check,
  X,
  ExternalLink,
  Download,
  Pencil,
  CheckCircle2,
  MoreHorizontal,
  Trash2
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
import PurchaseInvoiceLinesEditor, { PurchaseInvoiceLine } from "../components/purchases/PurchaseInvoiceLinesEditor";
import PurchaseInvoicePaymentsSection from "../components/purchases/PurchaseInvoicePaymentsSection";
import SupplierSearchInput from "../components/suppliers/SupplierSearchInput";
import { PURCHASE_INVOICE_CATEGORIES } from "@/constants/purchaseInvoiceCategories";
import { TICKET_CATEGORIES } from "@/constants/ticketCategories";
import ProjectSearchInput from "../components/projects/ProjectSearchInput";
import { cn } from "@/lib/utils";
import ArchivedPurchaseDocumentViewer from "../../shared/components/ArchivedPurchaseDocumentViewer";
import {
  archivePurchaseDocument,
  getPurchaseArchiveMetadata,
} from "../../shared/lib/purchaseDocumentArchive";

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

interface ProjectSite {
  id: string;
  site_name: string;
  city: string | null;
  is_default: boolean;
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
  manual_beneficiary_name?: string | null;
  project_id: string | null;
  project_name: string | null;
  project_number: string | null;
  site_id?: string | null;
  site_name?: string | null;
  file_path: string | null;
  file_name: string | null;
  archived_pdf_path?: string | null;
  archived_pdf_file_name?: string | null;
  sharepoint_item_id?: string | null;
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

const PURCHASE_ARCHIVABLE_STATUSES = new Set(["APPROVED", "PARTIAL", "PAID", "CANCELLED", "BLOCKED"]);

// Ruta normalizada para Storage: sin espacios ni barra inicial (evita "Object not found")
const normalizeStoragePath = (path: string): string => path.trim().replace(/^\//, '');

// Simple file preview component for uploaded documents
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
          console.error('Storage createSignedUrl: data.signedUrl vacío', { path: normalizedPath });
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
  const [retryingArchive, setRetryingArchive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
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
  const [manualBeneficiaryName, setManualBeneficiaryName] = useState("");
  
  // Project selection
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectSearchValue, setProjectSearchValue] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [projectSiteMode, setProjectSiteMode] = useState<string | null>(null);
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);

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
      if (inv.document_type === "EXPENSE") {
        navigate(`/nexo-av/${userId}/expenses/${purchaseInvoiceId}`);
        return;
      }
      let enrichedInvoice: PurchaseInvoice = {
        ...inv,
        archived_pdf_path: inv.archived_pdf_path ?? null,
        archived_pdf_file_name: inv.archived_pdf_file_name ?? null,
        sharepoint_item_id: inv.sharepoint_item_id ?? null,
      };

      try {
        const archiveMetadata = await getPurchaseArchiveMetadata(purchaseInvoiceId);
        if (archiveMetadata) {
          enrichedInvoice = {
            ...enrichedInvoice,
            archived_pdf_path: archiveMetadata.archivedFilePath ?? enrichedInvoice.archived_pdf_path ?? null,
            archived_pdf_file_name:
              archiveMetadata.archivedFileName ?? enrichedInvoice.archived_pdf_file_name ?? null,
            sharepoint_item_id: archiveMetadata.sharepointItemId ?? enrichedInvoice.sharepoint_item_id ?? null,
          };
        }
      } catch (archiveError) {
        console.warn("Error fetching purchase archive metadata:", archiveError);
      }

      setInvoice(enrichedInvoice);
      
      // Set form values
      setSupplierInvoiceNumber(inv.supplier_invoice_number || "");
      setIssueDate(inv.issue_date || "");
      setDueDate(inv.due_date || "");
      setStatus(inv.status || "PENDING");
      setExpenseCategory(inv.expense_category || "");
      setNotes(inv.notes || "");
      setInternalNotes(inv.internal_notes || "");
      
      // Set entity (tickets pueden tener concepto manual en vez de proveedor/técnico)
      if (inv.supplier_id) {
        setEntityType("SUPPLIER");
        setSelectedSupplierId(inv.supplier_id);
        setSupplierSearchValue(inv.supplier_name || "");
        setManualBeneficiaryName("");
      } else if (inv.technician_id) {
        setEntityType("TECHNICIAN");
        setSelectedTechnicianId(inv.technician_id);
        setSupplierSearchValue(inv.technician_name || "");
        setManualBeneficiaryName("");
      } else {
        setSupplierSearchValue("");
        setManualBeneficiaryName((inv as any).manual_beneficiary_name ?? inv.supplier_name ?? inv.technician_name ?? "");
      }
      
      // Set project
      if (inv.project_id) {
        setSelectedProjectId(inv.project_id);
        setProjectSearchValue(inv.project_name || "");
        setSelectedSiteId(inv.site_id || "");
      } else {
        setProjectSearchValue("");
        setSelectedSiteId("");
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

  const fetchSitesForProject = useCallback(async (projectId: string, preferredSiteId?: string | null) => {
    try {
      const { data: projectData, error: projectError } = await supabase.rpc("get_project", { p_project_id: projectId });
      if (projectError) throw projectError;
      const projectInfo = projectData?.[0];
      const siteMode = projectInfo?.site_mode || null;
      setProjectSiteMode(siteMode);

      const { data, error } = await supabase.rpc("list_project_sites", { p_project_id: projectId });
      if (error) throw error;

      const sites: ProjectSite[] = (data || [])
        .filter((s: any) => s.is_active)
        .map((s: any) => ({ id: s.id, site_name: s.site_name, city: s.city, is_default: s.is_default }));
      setProjectSites(sites);

      if (preferredSiteId && sites.some((site) => site.id === preferredSiteId)) {
        setSelectedSiteId(preferredSiteId);
        return;
      }

      if (siteMode === "SINGLE_SITE" && sites.length > 0) {
        const defaultSite = sites.find((site) => site.is_default) || sites[0];
        setSelectedSiteId(defaultSite.id);
        return;
      }

      setSelectedSiteId("");
    } catch (error) {
      console.error("Error fetching project sites:", error);
      setProjectSiteMode(null);
      setProjectSites([]);
      setSelectedSiteId("");
    }
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectSiteMode(null);
      setProjectSites([]);
      setSelectedSiteId("");
      return;
    }
    void fetchSitesForProject(selectedProjectId, selectedSiteId || null);
  }, [selectedProjectId, fetchSitesForProject]);

  // Fetch user roles for permission checks (solo Admin puede aprobar facturas de compra)
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
  const handleSave = async (): Promise<boolean> => {
    if (!purchaseInvoiceId || !invoice) return false;
    if (invoice.document_type === "EXPENSE" && !manualBeneficiaryName?.trim()) {
      toast.error("Indica el concepto del gasto (parking, peajes, dietas, gasolina, etc.).");
      return false;
    }
    if (selectedProjectId && projectSiteMode === "MULTI_SITE" && !selectedSiteId) {
      toast.error("Selecciona un sitio para este proyecto multi-sitio.");
      return false;
    }
    try {
      setSaving(true);

      const { error: updateError } = await supabase.rpc("update_purchase_invoice", {
        p_invoice_id: purchaseInvoiceId,
        p_supplier_invoice_number: supplierInvoiceNumber || null,
        p_issue_date: issueDate || null,
        p_due_date: dueDate || null,
        p_status: status,
        p_expense_category: expenseCategory || null,
        p_notes: notes || null,
        p_internal_notes: internalNotes || null,
        p_supplier_id: isTicket ? null : (entityType === "SUPPLIER" ? selectedSupplierId : null),
        p_technician_id: isTicket ? null : (entityType === "TECHNICIAN" ? selectedTechnicianId : null),
        p_project_id: selectedProjectId || null,
        p_manual_beneficiary_name: isTicket ? (manualBeneficiaryName?.trim() || null) : null,
        p_site_id: selectedProjectId ? (selectedSiteId || null) : null,
      });

      if (updateError) throw updateError;

      const { error: linesError } = await (supabase.rpc as any)("replace_purchase_invoice_lines", {
        p_invoice_id: purchaseInvoiceId,
        p_lines: lines.map((line) => ({
          concept: line.concept,
          description: line.description || null,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
          discount_percent: line.discount_percent || 0,
          withholding_tax_rate: line.withholding_tax_rate || 0,
        })),
      });

      if (linesError) throw linesError;

      toast.success("Factura guardada correctamente");
      setHasChanges(false);
      setIsEditing(false);
      await fetchInvoice();
      return true;
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      const message = error?.message || error?.error_description || "Error al guardar la factura";
      toast.error(message);
      return false;
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
        const saved = await handleSave();
        if (!saved) return;
      }
      
      // Use approve_purchase_invoice RPC which assigns definitive number (C-YY-XXXXXX)
      const { data, error: approveError } = await supabase.rpc("approve_purchase_invoice", {
        p_invoice_id: purchaseInvoiceId,
      });
      
      if (approveError) throw approveError;
      
      const newNumber = data?.[0]?.invoice_number;
      let archiveErrorMessage: string | null = null;
      try {
        await archivePurchaseDocument(purchaseInvoiceId);
      } catch (archiveError) {
        console.error("Error archiving purchase invoice:", archiveError);
        archiveErrorMessage =
          archiveError instanceof Error ? archiveError.message : "No se pudo archivar el documento en SharePoint.";
      }

      setIsEditing(false);
      await fetchInvoice();
      if (archiveErrorMessage) {
        toast.error(`Factura aprobada, pero no archivada en SharePoint: ${archiveErrorMessage}`);
      } else {
        toast.success(`Factura aprobada y archivada: ${newNumber || "OK"}`);
      }
      
    } catch (error: any) {
      console.error("Error approving invoice:", error);
      const msg = error?.message || "";
      if (msg.includes("Periodo cerrado") || msg.includes("periodo cerrado")) {
        toast.error(
          "No se puede aprobar: el mes de la factura está cerrado en Contabilidad. " +
          "Cambia la fecha de emisión a un mes abierto o reabre el periodo en Contabilidad.",
          { duration: 8000 }
        );
      } else {
        toast.error(msg || "Error al aprobar la factura");
      }
    } finally {
      setApproving(false);
    }
  };

  const handleRetryArchive = async () => {
    if (!purchaseInvoiceId || !invoice) return;

    try {
      setRetryingArchive(true);
      await archivePurchaseDocument(purchaseInvoiceId);
      await fetchInvoice();
      toast.success("Documento archivado correctamente en la biblioteca Compras.");
    } catch (error: any) {
      console.error("Error retrying purchase archive:", error);
      toast.error(error?.message || "No se pudo archivar el documento en SharePoint.");
    } finally {
      setRetryingArchive(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setHasChanges(false);
    fetchInvoice(); // Reset to original values
  };

  // Handle delete invoice/ticket
  const handleDelete = async () => {
    if (!purchaseInvoiceId || !invoice) return;
    
    try {
      setDeleting(true);
      
      const { error: deleteError } = await supabase.rpc("delete_purchase_invoice", {
        p_invoice_id: purchaseInvoiceId,
      });
      
      if (deleteError) throw deleteError;
      
      // If there's a scanned document linked, update its status back to UNASSIGNED
      if (invoice.file_path) {
        await supabase
          .from("scanned_documents")
          .update({
            status: "UNASSIGNED",
            assigned_to_type: null,
            assigned_to_id: null,
          })
          .eq("assigned_to_id", purchaseInvoiceId);
      }
      
      const docType = invoice.document_type === "EXPENSE" ? "Ticket" : "Factura";
      toast.success(`${docType} eliminado correctamente`);
      navigate(invoice.document_type === "EXPENSE" ? `/nexo-av/${userId}/expenses` : `/nexo-av/${userId}/purchase-invoices`);
      
    } catch (error: any) {
      console.error("Error deleting invoice:", error);
      toast.error("Error al eliminar: " + error.message);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
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
    setSelectedSiteId("");
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
  // Solo Admin puede aprobar. Aprobar asigna número definitivo (C-YY-XXXXXX / TICKET-YY-XXXXXX).
  const isAdmin = userRoles.includes('admin');
  const hasDefinitiveNumber = !!invoice.internal_purchase_number;
  // Permitir aprobar: DRAFT (escáner/nueva), PENDING, REGISTERED, PENDING_VALIDATION, o ya PAID pero sin nº definitivo (legacy)
  const canApprove = isAdmin && (
    (!isLocked && (invoice.status === "DRAFT" || invoice.status === "PENDING" || invoice.status === "REGISTERED" || invoice.status === "PENDING_VALIDATION")) ||
    (invoice.status === "PAID" && !hasDefinitiveNumber)
  );
  const canEdit = !isLocked;
  const canDelete = !isLocked && (invoice.status === "PENDING" || invoice.status === "PENDING_VALIDATION" || invoice.status === "DRAFT");
  const isTicket = invoice.document_type === "EXPENSE";
  const hasArchivedDocument = !!invoice.archived_pdf_path;
  const shouldHaveArchivedDocument = PURCHASE_ARCHIVABLE_STATUSES.has(invoice.status);

  return (
    <div className="flex flex-col h-full">
      <DetailNavigationBar
        pageTitle={invoice.internal_purchase_number || invoice.supplier_invoice_number || invoice.invoice_number || (isTicket ? "Ticket" : "Factura de Compra")}
        backPath={isTicket ? `/nexo-av/${userId}/expenses` : `/nexo-av/${userId}/purchase-invoices`}
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
                
                {/* More Options Menu */}
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
                          Eliminar {isTicket ? "Ticket" : "Factura"}
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
              <FileText className="h-4 w-4" />
              Documento
            </h3>
          </div>
          <div className="flex-1 overflow-hidden p-4">
            {hasArchivedDocument ? (
              <ArchivedPurchaseDocumentViewer
                documentId={invoice.id}
                filePath={invoice.archived_pdf_path!}
                fileName={invoice.archived_pdf_file_name || invoice.file_name || "documento-compra"}
                title="Documento archivado en SharePoint"
                className="h-full rounded-lg overflow-hidden border border-border bg-background"
              />
            ) : shouldHaveArchivedDocument ? (
              <div className="h-full flex flex-col gap-4">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-foreground">
                          El documento ya deberia estar archivado en SharePoint.
                        </p>
                        <p className="text-muted-foreground">
                          La fuente original sigue disponible, pero el archivo oficial debe vivir en la biblioteca Compras.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetryArchive}
                        disabled={retryingArchive}
                        className="gap-2"
                      >
                        {retryingArchive ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Reintentar archivado
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-0 rounded-lg border border-border bg-background">
                  {invoice.file_path ? (
                    <FilePreview filePath={invoice.file_path} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-muted-foreground p-4">
                      <div>
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p>Sin documento original adjunto</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : invoice.file_path ? (
              <FilePreview filePath={invoice.file_path} />
            ) : (
              <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Sin documento adjunto</p>
                </div>
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
                    <Label className="text-xs text-muted-foreground">
                      {isTicket ? "Tipo de gasto" : "Categoría"}
                    </Label>
                    <Select
                      value={expenseCategory}
                      onValueChange={(value) => {
                        setExpenseCategory(value);
                        setHasChanges(true);
                      }}
                      disabled={!isEditing || isLocked}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isTicket ? "Seleccionar tipo de gasto" : "Seleccionar categoría"} />
                      </SelectTrigger>
                      <SelectContent>
                        {isTicket
                          ? TICKET_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                <span className="flex items-center gap-2">
                                  <span>{cat.icon}</span>
                                  <span>{cat.label}</span>
                                  <span className="text-muted-foreground text-xs">({cat.accountCode})</span>
                                </span>
                              </SelectItem>
                            ))
                          : PURCHASE_INVOICE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>

                {/* Tickets: concepto manual. Facturas: proveedor o técnico */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4"
                >
                  {isTicket ? (
                    <>
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Concepto del gasto
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Indica el tipo de gasto: parking, peajes, dietas, gasolina, etc.
                      </p>
                      <Input
                        value={manualBeneficiaryName}
                        onChange={(e) => {
                          setManualBeneficiaryName(e.target.value);
                          setHasChanges(true);
                        }}
                        placeholder="Ej: Parking, Peaje A-2, Dietas, Gasolina..."
                        disabled={!isEditing || isLocked}
                        className="max-w-md"
                      />
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
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
                            setSelectedSiteId("");
                            setProjectSites([]);
                            setProjectSiteMode(null);
                            setHasChanges(true);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}

                  {selectedProjectId && projectSiteMode === "MULTI_SITE" && projectSites.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        Sitio *
                      </Label>
                      <Select
                        value={selectedSiteId || undefined}
                        onValueChange={(value) => {
                          setSelectedSiteId(value);
                          setHasChanges(true);
                        }}
                        disabled={!isEditing || isLocked}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar sitio..." />
                        </SelectTrigger>
                        <SelectContent>
                          {projectSites.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.site_name}{site.city ? ` - ${site.city}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedProjectId && projectSiteMode === "SINGLE_SITE" && projectSites.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        Sitio
                      </Label>
                      <div className="flex items-center px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm">
                        {projectSites[0]?.site_name}{projectSites[0]?.city ? ` - ${projectSites[0].city}` : ""}
                      </div>
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
                  disabled={!isEditing || isLocked}
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
                  hasDefinitiveNumber={hasDefinitiveNumber}
                  onPaymentChange={fetchInvoice}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar {isTicket ? "ticket" : "factura"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente 
              {isTicket ? " el ticket " : " la factura "}
              <strong>{invoice.supplier_invoice_number || invoice.invoice_number}</strong>
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

export default PurchaseInvoiceDetailPageDesktop;
