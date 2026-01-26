import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, 
  Save, 
  FileText, 
  AlertCircle,
  ExternalLink,
  Download,
  ArrowRight,
  CheckCircle2,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import PurchaseInvoiceLinesEditor, { PurchaseInvoiceLine } from "../components/purchases/PurchaseInvoiceLinesEditor";
import SupplierSearchInput from "../components/suppliers/SupplierSearchInput";
import ProjectSearchInput from "../components/projects/ProjectSearchInput";
import { cn } from "@/lib/utils";

interface ScannedDocument {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  status: string;
  assigned_to_type: string | null;
  assigned_to_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

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

const EXPENSE_CATEGORIES = [
  { value: "MATERIAL", label: "Material" },
  { value: "SERVICE", label: "Servicio" },
  { value: "TRAVEL", label: "Viaje" },
  { value: "RENT", label: "Alquiler" },
  { value: "UTILITIES", label: "Suministros" },
  { value: "OTHER", label: "Otros" },
];

// File preview component
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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-2 opacity-30" />
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
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <FileText className="h-12 w-12 mb-2 opacity-30" />
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

const ScannerDetailPage = () => {
  const { userId, documentId } = useParams<{ userId: string; documentId: string }>();
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [document, setDocument] = useState<ScannedDocument | null>(null);
  const [lines, setLines] = useState<PurchaseInvoiceLine[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Form state
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [notes, setNotes] = useState("");
  
  // Entity selection
  const [entityType, setEntityType] = useState<"SUPPLIER" | "TECHNICIAN">("SUPPLIER");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [supplierSearchValue, setSupplierSearchValue] = useState("");
  
  // Project selection
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectSearchValue, setProjectSearchValue] = useState("");

  // Fetch document
  const fetchDocument = useCallback(async () => {
    if (!documentId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("scanned_documents")
        .select("*")
        .eq("id", documentId)
        .single();
      
      if (error) throw error;
      if (!data) {
        toast.error("Documento no encontrado");
        navigate(`/nexo-av/${userId}/scanner`);
        return;
      }
      
      setDocument(data as ScannedDocument);
      setNotes(data.notes || "");
      
    } catch (error: any) {
      console.error("Error fetching document:", error);
      toast.error("Error al cargar el documento");
    } finally {
      setLoading(false);
    }
  }, [documentId, userId, navigate]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

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

  // Update document notes
  const handleSaveNotes = async () => {
    if (!documentId) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from("scanned_documents")
        .update({ notes })
        .eq("id", documentId);
      
      if (error) throw error;
      toast.success("Notas guardadas");
      setHasChanges(false);
      
    } catch (error: any) {
      console.error("Error saving notes:", error);
      toast.error("Error al guardar notas");
    } finally {
      setSaving(false);
    }
  };

  // Create purchase invoice from this document
  const handleCreatePurchaseInvoice = async () => {
    if (!document) return;
    
    // Validate required fields
    if (!selectedSupplierId && !selectedTechnicianId) {
      toast.error("Selecciona un proveedor o técnico");
      return;
    }
    
    if (!supplierInvoiceNumber.trim()) {
      toast.error("Introduce el número de factura del proveedor");
      return;
    }
    
    try {
      setCreatingInvoice(true);
      
      // Create the purchase invoice
      const { data: invoiceData, error: invoiceError } = await supabase.rpc("create_purchase_invoice", {
        p_invoice_number: `PENDIENTE-${Date.now().toString().slice(-6)}`,
        p_supplier_invoice_number: supplierInvoiceNumber,
        p_supplier_id: entityType === "SUPPLIER" ? selectedSupplierId : null,
        p_technician_id: entityType === "TECHNICIAN" ? selectedTechnicianId : null,
        p_project_id: selectedProjectId || null,
        p_issue_date: issueDate || null,
        p_due_date: dueDate || null,
        p_expense_category: expenseCategory || null,
        p_notes: notes || null,
        p_file_path: document.file_path,
        p_file_name: document.file_name,
        p_status: "PENDING",
        p_document_type: "INVOICE",
      });
      
      if (invoiceError) throw invoiceError;
      
      const purchaseInvoiceId = invoiceData;
      
      // Add lines
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
      
      // Update scanned document status
      await supabase
        .from("scanned_documents")
        .update({
          status: "ASSIGNED",
          assigned_to_type: "PURCHASE_INVOICE",
          assigned_to_id: purchaseInvoiceId,
        })
        .eq("id", documentId);
      
      toast.success("Factura de compra creada correctamente");
      
      // Navigate to the new purchase invoice
      navigate(`/nexo-av/${userId}/purchase-invoices/${purchaseInvoiceId}`);
      
    } catch (error: any) {
      console.error("Error creating purchase invoice:", error);
      toast.error("Error al crear factura de compra: " + error.message);
    } finally {
      setCreatingInvoice(false);
    }
  };

  // Calculate totals
  const totals = {
    subtotal: lines.reduce((sum, l) => sum + l.subtotal, 0),
    tax: lines.reduce((sum, l) => sum + l.tax_amount, 0),
    total: lines.reduce((sum, l) => sum + l.total, 0),
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Documento no encontrado</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(`/nexo-av/${userId}/scanner`)}
          >
            Volver al Escáner
          </Button>
        </div>
      </div>
    );
  }

  const isAssigned = document.status === "ASSIGNED";

  return (
    <div className="flex flex-col h-full">
      <DetailNavigationBar
        pageTitle={document.file_name}
        backPath={`/nexo-av/${userId}/scanner`}
        contextInfo={
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                isAssigned 
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                  : "bg-amber-500/20 text-amber-400 border-amber-500/30"
              )}
            >
              {isAssigned ? "Asignado" : "Sin asignar"}
            </Badge>
          </div>
        }
        tools={
          !isAssigned && (
            <Button
              onClick={handleCreatePurchaseInvoice}
              disabled={creatingInvoice || (!selectedSupplierId && !selectedTechnicianId)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {creatingInvoice ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Crear Factura de Compra
            </Button>
          )
        }
      />

      {/* Split View */}
      <div className="flex-1 grid grid-cols-2 gap-6 p-6 overflow-hidden">
        {/* Left: Document Preview */}
        <div className="bg-card/50 border border-border rounded-xl p-4 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <ScanLine className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Vista previa</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <FilePreview filePath={document.file_path} />
          </div>
        </div>

        {/* Right: Form */}
        <div className="overflow-y-auto pr-2 space-y-6">
          {isAssigned ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Documento asignado
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Este documento ya ha sido asignado a una factura de compra.
              </p>
              {document.assigned_to_id && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/${document.assigned_to_id}`)}
                  className="gap-2"
                >
                  Ver Factura
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Provider Section */}
              <div className="bg-card/50 border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
                  Proveedor / Técnico
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setEntityType("SUPPLIER")}
                      className={cn(
                        "px-4 py-2 text-sm rounded-lg transition-all",
                        entityType === "SUPPLIER"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Proveedor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntityType("TECHNICIAN")}
                      className={cn(
                        "px-4 py-2 text-sm rounded-lg transition-all",
                        entityType === "TECHNICIAN"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Técnico
                    </button>
                  </div>

                  <SupplierSearchInput
                    value={supplierSearchValue}
                    onChange={(val) => {
                      setSupplierSearchValue(val);
                      if (!val) {
                        setSelectedSupplierId(null);
                        setSelectedTechnicianId(null);
                      }
                    }}
                    onSelectSupplier={handleSelectSupplier}
                    onSelectTechnician={handleSelectTechnician}
                    entityType={entityType}
                    placeholder={`Buscar ${entityType === "SUPPLIER" ? "proveedor" : "técnico"}...`}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Invoice Data Section */}
              <div className="bg-card/50 border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
                  Datos de la Factura
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs mb-1.5 block">
                      Nº Factura Proveedor *
                    </Label>
                    <Input
                      value={supplierInvoiceNumber}
                      onChange={(e) => {
                        setSupplierInvoiceNumber(e.target.value);
                        setHasChanges(true);
                      }}
                      placeholder="Ej: FA-2026-001"
                      className="bg-background/50"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs mb-1.5 block">
                      Categoría
                    </Label>
                    <Select value={expenseCategory} onValueChange={(val) => {
                      setExpenseCategory(val);
                      setHasChanges(true);
                    }}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Seleccionar..." />
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
                  <div>
                    <Label className="text-muted-foreground text-xs mb-1.5 block">
                      Fecha Emisión
                    </Label>
                    <Input
                      type="date"
                      value={issueDate}
                      onChange={(e) => {
                        setIssueDate(e.target.value);
                        setHasChanges(true);
                      }}
                      className="bg-background/50"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs mb-1.5 block">
                      Fecha Vencimiento
                    </Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        setHasChanges(true);
                      }}
                      className="bg-background/50"
                    />
                  </div>
                </div>
              </div>

              {/* Project Section */}
              <div className="bg-card/50 border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
                  Proyecto (Opcional)
                </h3>
                <ProjectSearchInput
                  value={projectSearchValue}
                  onChange={(val) => {
                    setProjectSearchValue(val);
                    if (!val) setSelectedProjectId(null);
                  }}
                  onSelectProject={handleSelectProject}
                  placeholder="Buscar proyecto..."
                  className="w-full"
                />
              </div>

              {/* Lines Section */}
              <div className="bg-card/50 border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
                  Líneas de la Factura
                </h3>
                <PurchaseInvoiceLinesEditor
                  lines={lines}
                  onChange={(newLines) => {
                    setLines(newLines);
                    setHasChanges(true);
                  }}
                />
              </div>

              {/* Notes Section */}
              <div className="bg-card/50 border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Notas
                  </h3>
                  {hasChanges && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveNotes}
                      disabled={saving}
                      className="text-xs gap-1"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Guardar notas
                    </Button>
                  )}
                </div>
                <Textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Añade notas sobre este documento..."
                  className="bg-background/50 min-h-[100px]"
                />
              </div>

              {/* Summary */}
              {lines.length > 0 && (
                <div className="bg-card/50 border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
                    Resumen
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base imponible:</span>
                      <span className="text-foreground font-medium">{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA:</span>
                      <span className="text-foreground font-medium">{formatCurrency(totals.tax)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                      <span className="text-foreground">Total:</span>
                      <span className="text-foreground">{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScannerDetailPage;
