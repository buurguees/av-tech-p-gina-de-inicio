import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  ChevronLeft,
  Save,
  FileText,
  AlertCircle,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ScannedDocument {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  status: string;
  created_at: string;
}

interface Project {
  id: string;
  project_name: string;
  project_number: string;
}

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
        // Use purchase-documents bucket
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
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-2 opacity-30" />
        <p>Error al cargar el documento</p>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="w-full h-full flex flex-col min-h-[300px]">
        <iframe
          src={fileUrl}
          className="w-full flex-1 rounded-lg border border-border"
          title="PDF Preview"
        />
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="w-full flex items-center justify-center min-h-[300px]">
        <img
          src={fileUrl}
          alt="Document preview"
          className="max-w-full max-h-[600px] rounded-lg border border-border object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground">
      <FileText className="h-12 w-12 mb-2 opacity-30" />
      <p>Tipo de archivo no soportado para preview</p>
    </div>
  );
};

const MobileScannerDetailPage = () => {
  const { userId, documentId } = useParams<{ userId: string; documentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [document, setDocument] = useState<ScannedDocument | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Form state
  const [documentType, setDocumentType] = useState<"EXPENSE" | "INVOICE">("EXPENSE");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

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
      setDocument(data);
    } catch (error: any) {
      console.error("Error fetching document:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el documento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [documentId, toast]);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('list_projects', {
        p_search: null
      });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, []);

  useEffect(() => {
    fetchDocument();
    fetchProjects();
  }, [fetchDocument, fetchProjects]);

  const handleSave = async () => {
    if (!document) return;

    try {
      setSaving(true);

      // Generate invoice number based on type
      const timestamp = Date.now().toString().slice(-6);
      const invoiceNumber = documentType === "EXPENSE" 
        ? `TICKET-${timestamp}`
        : `PENDIENTE-${timestamp}`;

      // Create the purchase invoice or expense
      const { data: invoiceData, error: invoiceError } = await supabase.rpc("create_purchase_invoice", {
        p_invoice_number: invoiceNumber,
        p_document_type: documentType,
        p_status: "PENDING",
        p_project_id: selectedProjectId || null,
        p_file_path: document.file_path,
        p_file_name: document.file_name,
      });

      if (invoiceError) throw invoiceError;

      const purchaseInvoiceId = invoiceData;

      // Update scanned document status
      const { error: updateError } = await supabase
        .from("scanned_documents")
        .update({
          status: "ASSIGNED",
          assigned_to_type: documentType === "EXPENSE" ? "EXPENSE" : "PURCHASE_INVOICE",
          assigned_to_id: purchaseInvoiceId,
        })
        .eq("id", documentId);

      if (updateError) throw updateError;

      toast({
        title: "Éxito",
        description: documentType === "EXPENSE" 
          ? "Ticket creado correctamente. Pendiente de entrada de datos."
          : "Factura de compra creada correctamente. Pendiente de entrada de datos.",
      });

      // Navigate back to scanner
      navigate(`/nexo-av/${userId}/scanner`);
    } catch (error: any) {
      console.error("Error saving document:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el documento",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex-shrink-0 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/nexo-av/${userId}/scanner`)}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex-shrink-0 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/nexo-av/${userId}/scanner`)}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h2 className="text-base font-semibold">Documento no encontrado</h2>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">El documento no existe</p>
          </div>
        </div>
      </div>
    );
  }

  const isAssigned = document.status === "ASSIGNED";

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/nexo-av/${userId}/scanner`)}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold truncate">{document.file_name}</h2>
          </div>
          {!isAssigned && (
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full",
                "text-sm font-medium whitespace-nowrap leading-none",
                "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
                "text-white/90 hover:text-white hover:bg-white/15",
                "active:scale-95 transition-all duration-200",
                "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              style={{ touchAction: 'manipulation', height: '32px' }}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Guardar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Vista Previa
          </Label>
          <div className="bg-card border border-border rounded-xl p-3">
            <FilePreview filePath={document.file_path} />
          </div>
        </div>

        {!isAssigned && (
          <>
            {/* Document Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tipo de Documento
              </Label>
              <Select 
                value={documentType}
                onValueChange={(value) => setDocumentType(value as "EXPENSE" | "INVOICE")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Ticket</SelectItem>
                  <SelectItem value="INVOICE">Factura</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {documentType === "EXPENSE" 
                  ? "Se creará un gasto en estado Pendiente"
                  : "Se creará una factura de compra en estado Pendiente"}
              </p>
            </div>

            {/* Project Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Proyecto (Opcional)
              </Label>
              <Select 
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar proyecto..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No hay proyectos disponibles
                    </div>
                  ) : (
                    projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name} ({project.project_number})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {isAssigned && (
          <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Este documento ya ha sido asignado y procesado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileScannerDetailPage;
