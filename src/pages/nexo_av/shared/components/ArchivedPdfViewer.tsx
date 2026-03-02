import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Download, Eye, Loader2 } from "lucide-react";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://takvthfatlcjsqgssnta.supabase.co";

interface ArchivedPdfViewerProps {
  documentType: "invoice" | "quote";
  documentId: string;
  filePath: string;
  fileName: string;
  title?: string;
  className?: string;
}

const ArchivedPdfViewer = ({
  documentType,
  documentId,
  filePath,
  fileName,
  title = "Vista previa de PDF archivado",
  className = "",
}: ArchivedPdfViewerProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revokedUrl: string | null = null;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token;
        if (!accessToken) {
          throw new Error("No hay sesión activa para acceder al PDF archivado");
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/sharepoint-storage`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "download-sales-file",
            documentType,
            documentId,
            filePath,
          }),
        });

        if (!response.ok) {
          let backendError = "";
          try {
            const payload = await response.json();
            backendError = typeof payload?.error === "string" ? payload.error : "";
          } catch {
            // Ignore JSON parse failures and keep generic status-only message.
          }

          const suffix = backendError ? `: ${backendError}` : "";
          throw new Error(`No se pudo cargar el PDF archivado (${response.status})${suffix}`);
        }

        const pdfBlob = await response.blob();
        const nextUrl = URL.createObjectURL(pdfBlob);
        revokedUrl = nextUrl;
        setBlob(pdfBlob);
        setBlobUrl(nextUrl);
      } catch (loadError) {
        console.error("Error loading archived PDF:", loadError);
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el PDF archivado");
      } finally {
        setLoading(false);
      }
    };

    void loadPdf();

    return () => {
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [documentId, documentType, filePath]);

  const handleDownload = () => {
    if (!blobUrl || !blob) return;

    setDownloading(true);
    try {
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[320px] ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 h-full min-h-[320px] px-6 text-center ${className}`}>
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-sm text-muted-foreground">
          {error || "No se pudo cargar el PDF archivado"}
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(blobUrl, "_blank", "noopener,noreferrer")}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Ver PDF
        </Button>

        <Button
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
          className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Descargar PDF
        </Button>
      </div>

      <div className="flex-1 min-h-0 bg-zinc-800">
        <iframe
          src={blobUrl}
          title={title}
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
};

export default ArchivedPdfViewer;
