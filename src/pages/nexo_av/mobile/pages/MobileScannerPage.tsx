import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  ScanLine, 
  Loader2, 
  Camera,
  FileText,
  Image,
  Upload,
  ChevronRight,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import MobileDocumentScanner from "../components/MobileDocumentScanner";

interface ScannedDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  assigned_to_id: string | null;
  assigned_to_type: string | null;
}

const MobileScannerPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      // Solo documentos sin asignar (mismo criterio que escáner desktop)
      const { data, error } = await supabase
        .from('scanned_documents')
        .select('*')
        .eq('status', 'UNASSIGNED')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleCapturePhoto = () => {
    setShowScanner(true);
  };

  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await handleUpload(file);
  };

  const handleUpload = async (fileOrBlob: File | Blob): Promise<void> => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Usuario no identificado",
        variant: "destructive",
      });
      throw new Error("Usuario no identificado");
    }

    setUploading(true);
    try {
      // Get auth user id for storage path
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        toast({
          title: "Error",
          description: "Usuario no autenticado",
          variant: "destructive",
        });
        throw new Error("Usuario no autenticado");
      }

      // Upload to storage using auth.uid() for proper RLS
      // Always use PDF extension for scanned documents
      const timestamp = Date.now();
      const fileName = `scan_${timestamp}.pdf`;
      const filePath = `${authUser.id}/scanner/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('purchase-documents')
        .upload(filePath, fileOrBlob);

      if (uploadError) throw uploadError;

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from('scanned_documents')
        .insert({
          file_path: filePath,
          file_name: fileOrBlob instanceof File && fileOrBlob.type === 'application/pdf' 
            ? fileOrBlob.name 
            : fileName,
          file_size: fileOrBlob.size,
          file_type: 'application/pdf',
          status: 'UNASSIGNED',
          created_by: userId,
        })
        .select()
        .single();

      if (docError) throw docError;

      toast({
        title: "Documento guardado",
        description: "Obligatorio para el control de gastos. Asigna tipo (ticket/factura) en la siguiente pantalla.",
      });

      fetchDocuments();
      if (docData) {
        navigate(`/nexo-av/${userId}/scanner/${docData.id}`);
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error al guardar el documento",
        description: error.message || "Es obligatorio guardar el documento para el control de gastos. Vuelve a intentarlo.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleScannerCapture = async (blob: Blob) => {
    setUploading(true);
    try {
      await handleUpload(blob);
      setShowScanner(false);
    } catch (_) {
      toast({
        title: "Documento no guardado",
        description: "Es obligatorio guardar el documento para el control de gastos. Vuelve a escanear e inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentClick = (documentId: string) => {
    navigate(`/nexo-av/${userId}/scanner/${documentId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'UNASSIGNED':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
            Sin asignar
          </span>
        );
      case 'PROCESSED':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
            Procesado
          </span>
        );
      case 'PENDING':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600">
            Pendiente
          </span>
        );
      case 'ERROR':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600">
            Error
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-600">
            {status}
          </span>
        );
    }
  };

  return (
    <>
      {showScanner && (
        <MobileDocumentScanner
          onCapture={handleScannerCapture}
          onCancel={() => setShowScanner(false)}
          title="Escanear Documento"
        />
      )}
      
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6 flex-shrink-0">
        <Button
          onClick={handleCapturePhoto}
          disabled={uploading}
          className={cn(
            "h-24 flex-col gap-2 rounded-2xl",
            "bg-primary hover:bg-primary/90"
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Camera className="h-8 w-8" />
          )}
          <span>Hacer foto</span>
        </Button>

        <Button
          onClick={handleSelectFile}
          disabled={uploading}
          variant="outline"
          className="h-24 flex-col gap-2 rounded-2xl border-2 border-dashed"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Upload className="h-8 w-8" />
          )}
          <span>Subir archivo</span>
        </Button>
      </div>

      {/* Solo documentos sin asignar (igual que escáner desktop) */}
      <div className="flex-1 min-h-0 flex flex-col">
        <h2 className="text-sm font-medium text-muted-foreground mb-3 flex-shrink-0">
          Documentos sin asignar
        </h2>
        
        <div className="flex-1 overflow-y-auto space-y-2 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <ScanLine className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">No hay documentos sin asignar</p>
              <p className="text-muted-foreground text-sm mt-1">
                Haz una foto o sube un archivo. Luego asigna tipo (ticket o factura) y proyecto si quieres.
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleDocumentClick(doc.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl",
                  "bg-card border border-border",
                  "active:scale-[0.98] transition-all duration-200",
                  "hover:border-primary/30"
                )}
                style={{ touchAction: 'manipulation' }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-muted rounded-xl">
                    {doc.file_type?.includes('pdf') ? (
                      <FileText className="h-5 w-5 text-red-500" />
                    ) : (
                      <Image className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground truncate max-w-[150px]">
                        {doc.file_name}
                      </span>
                      {getStatusBadge(doc.status)}
                    </div>
                    
                    <h3 className="font-medium text-foreground truncate text-sm">
                      {doc.notes || 'Sin descripción'}
                    </h3>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(doc.created_at)}
                    </div>
                  </div>
                  
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default MobileScannerPage;
