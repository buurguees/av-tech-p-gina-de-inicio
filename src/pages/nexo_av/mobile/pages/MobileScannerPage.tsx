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

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scanned_documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

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
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
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

    setUploading(true);
    try {
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('scanned-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from('scanned_documents')
        .insert({
          file_name: file.name,
          file_path: uploadData.path,
          file_type: file.type,
          status: 'PENDING',
          uploaded_by: userId,
        })
        .select()
        .single();

      if (docError) throw docError;

      toast({
        title: "Documento subido",
        description: "El documento se está procesando...",
      });

      // Refresh list
      fetchDocuments();

      // Navigate to detail page
      if (docData) {
        navigate(`/nexo-av/${userId}/scanner/${docData.id}`);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el documento",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

      {/* Recent Documents */}
      <div className="flex-1 min-h-0 flex flex-col">
        <h2 className="text-sm font-medium text-muted-foreground mb-3 flex-shrink-0">
          Documentos recientes
        </h2>
        
        <div className="flex-1 overflow-y-auto space-y-2 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ScanLine className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay documentos escaneados</p>
              <p className="text-muted-foreground text-sm">
                Haz una foto o sube un archivo para empezar
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
  );
};

export default MobileScannerPage;
