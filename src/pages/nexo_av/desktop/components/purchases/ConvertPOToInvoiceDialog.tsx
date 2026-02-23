import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  CalendarIcon, 
  Loader2, 
  Upload, 
  FileText, 
  FolderOpen,
  Receipt,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ScannedDocument {
  id: string;
  file_name: string;
  file_path: string;
  created_at: string;
}

interface ConvertPOToInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: {
    id: string;
    po_number: string;
    supplier_id: string | null;
    supplier_name: string | null;
    supplier_tax_id: string | null;
    project_id: string | null;
    subtotal: number;
    tax_amount: number;
    withholding_amount: number;
    total: number;
  };
  onSuccess?: () => void;
}

const ConvertPOToInvoiceDialog = ({
  open,
  onOpenChange,
  purchaseOrder,
  onSuccess,
}: ConvertPOToInvoiceDialogProps) => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>("upload");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  
  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  
  // Scanned documents
  const [scannedDocuments, setScannedDocuments] = useState<ScannedDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [selectedScannedDoc, setSelectedScannedDoc] = useState<ScannedDocument | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab("upload");
      setSupplierInvoiceNumber("");
      setIssueDate(new Date());
      setDueDate(undefined);
      setNotes("");
      setSelectedFile(null);
      setUploadedFilePath(null);
      setUploadedFileName(null);
      setSelectedScannedDoc(null);
      fetchScannedDocuments();
    }
  }, [open]);

  const fetchScannedDocuments = async () => {
    try {
      setLoadingDocuments(true);
      // Obtener documentos escaneados no asignados
      const { data, error } = await supabase
        .from("scanned_documents")
        .select("id, file_name, file_path, created_at")
        .eq("status", "UNASSIGNED")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setScannedDocuments(data || []);
    } catch (error) {
      console.error("Error fetching scanned documents:", error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedScannedDoc(null);
    }
  };

  const uploadFile = async (): Promise<{ path: string; name: string } | null> => {
    if (!selectedFile) return null;

    try {
      setUploading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const extension = selectedFile.name.split('.').pop()?.toLowerCase() || 'pdf';
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `invoice_${timestamp}_${randomSuffix}.${extension}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('purchase-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      return { path: filePath, name: fileName };
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo subir el archivo",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!supplierInvoiceNumber.trim()) {
      toast({
        title: "Error",
        description: "El número de factura del proveedor es obligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Determinar archivo a usar
      let filePath: string | null = null;
      let fileName: string | null = null;

      if (activeTab === "upload" && selectedFile) {
        const uploaded = await uploadFile();
        if (uploaded) {
          filePath = uploaded.path;
          fileName = uploaded.name;
        }
      } else if (activeTab === "scanner" && selectedScannedDoc) {
        filePath = selectedScannedDoc.file_path;
        fileName = selectedScannedDoc.file_name;
      }

      // Crear la factura de compra con todos los datos
      const { data: invoiceId, error: createError } = await (supabase.rpc as any)("create_purchase_invoice", {
        p_invoice_number: supplierInvoiceNumber,
        p_supplier_id: purchaseOrder.supplier_id,
        p_project_id: purchaseOrder.project_id,
        p_document_type: "INVOICE",
        p_issue_date: issueDate.toISOString().split("T")[0],
        p_due_date: dueDate ? dueDate.toISOString().split("T")[0] : null,
        p_notes: notes || null,
        p_file_path: filePath,
        p_file_name: fileName,
        p_status: "PENDING",
        p_supplier_invoice_number: supplierInvoiceNumber,
        p_site_id: null,
      });

      if (createError) throw createError;

      // Vincular el PO a la factura
      const { error: linkError } = await supabase.rpc("link_po_to_purchase_invoice" as any, {
        p_order_id: purchaseOrder.id,
        p_invoice_id: invoiceId,
      });

      if (linkError) throw linkError;

      // Si usamos un documento escaneado, marcarlo como asignado
      if (selectedScannedDoc) {
        await supabase
          .from("scanned_documents")
          .update({
            status: "ASSIGNED",
            assigned_to_type: "purchase_invoice",
            assigned_to_id: invoiceId,
          })
          .eq("id", selectedScannedDoc.id);
      }

      toast({
        title: "Factura creada",
        description: `La factura de compra se ha creado y vinculado al pedido ${purchaseOrder.po_number}`,
      });

      onOpenChange(false);
      onSuccess?.();

      // Navegar a la factura creada
      navigate(`/nexo-av/${userId}/purchase-invoices/${invoiceId}`);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la factura",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Convertir a Factura de Compra
          </DialogTitle>
          <DialogDescription>
            Convierte el pedido <strong>{purchaseOrder.po_number}</strong> en una factura de compra real.
            Esta acción registrará el gasto en contabilidad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info del PO */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Proveedor:</span>
              <span className="font-medium">{purchaseOrder.supplier_name || "Sin proveedor"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base imponible:</span>
              <span>{formatCurrency(purchaseOrder.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA:</span>
              <span>{formatCurrency(purchaseOrder.tax_amount)}</span>
            </div>
            {purchaseOrder.withholding_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Retención IRPF:</span>
                <span className="text-red-400">-{formatCurrency(purchaseOrder.withholding_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
              <span>Total estimado:</span>
              <span>{formatCurrency(purchaseOrder.total)}</span>
            </div>
          </div>

          {/* Aviso contable */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5" />
              <p className="text-xs text-amber-300">
                <strong>Importante:</strong> Al crear la factura de compra, se generarán los asientos contables correspondientes.
                Los importes reales pueden diferir de los estimados en el pedido.
              </p>
            </div>
          </div>

          {/* Datos de la factura */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplierInvoiceNumber">Nº Factura Proveedor *</Label>
              <Input
                id="supplierInvoiceNumber"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                placeholder="Ej: F-2024-001234"
              />
            </div>
            <div>
              <Label>Fecha de factura</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !issueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {issueDate ? format(issueDate, "PPP", { locale: es }) : "Seleccionar..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={issueDate}
                    onSelect={(date) => date && setIssueDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha de vencimiento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP", { locale: es }) : "Seleccionar..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          {/* Tabs para documento */}
          <div>
            <Label className="mb-2 block">Documento de la factura</Label>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Subir archivo
                </TabsTrigger>
                <TabsTrigger value="scanner" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Escáner
                </TabsTrigger>
                <TabsTrigger value="none" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Sin documento
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="application/pdf,image/*"
                    onChange={handleFileChange}
                  />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileText className="h-10 w-10 mx-auto text-green-500" />
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        Cambiar archivo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">Arrastra un archivo o</p>
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        Seleccionar archivo
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        PDF, JPG, PNG (max. 50MB)
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="scanner" className="mt-4">
                {loadingDocuments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : scannedDocuments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No hay documentos escaneados disponibles</p>
                    <p className="text-xs">Los documentos aparecerán aquí cuando los escanees</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                    {scannedDocuments.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          setSelectedScannedDoc(doc);
                          setSelectedFile(null);
                        }}
                        className={cn(
                          "p-3 rounded-lg border text-left transition-colors",
                          selectedScannedDoc?.id === doc.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-accent/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString("es-ES")}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="none" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Crear factura sin documento adjunto</p>
                  <p className="text-xs">Podrás añadir el documento más tarde</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading || uploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || uploading || !supplierInvoiceNumber.trim()}
          >
            {loading || uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploading ? "Subiendo..." : "Creando..."}
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4 mr-2" />
                Crear Factura de Compra
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConvertPOToInvoiceDialog;
