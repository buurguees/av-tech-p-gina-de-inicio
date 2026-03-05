import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Download, Eye, Loader2 } from "lucide-react";
import { forceRefreshAccessToken, getFreshAccessToken } from "../lib/supabaseSession";

interface ArchivedPdfViewerProps {
  documentType: "invoice" | "quote";
  documentId: string;
  filePath: string;
  fileName: string;
  title?: string;
  className?: string;
}

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://takvthfatlcjsqgssnta.supabase.co";

type SharePointCallResult<T> = {
  data: T | null;
  status: number;
  error: string | null;
};

async function callSharePointJson<T>(
  token: string,
  body: Record<string, unknown>,
): Promise<SharePointCallResult<T>> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/sharepoint-storage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage: string | null = null;
    try {
      const payload = await response.json();
      if (typeof payload?.error === "string") {
        errorMessage = payload.error;
      }
    } catch {
      // ignore non-json error responses
    }
    return { data: null, status: response.status, error: errorMessage };
  }

  const payload = (await response.json()) as T;
  return { data: payload, status: response.status, error: null };
}

async function callSharePointBlob(
  token: string,
  body: Record<string, unknown>,
): Promise<SharePointCallResult<Blob>> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/sharepoint-storage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage: string | null = null;
    try {
      const payload = await response.json();
      if (typeof payload?.error === "string") {
        errorMessage = payload.error;
      }
    } catch {
      // ignore non-json error responses
    }
    return { data: null, status: response.status, error: errorMessage };
  }

  const payload = await response.blob();
  return { data: payload, status: response.status, error: null };
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

    const isAuthStatus = (status: number) => status === 401 || status === 403;

    const downloadArchivedFile = async (token: string, targetPath: string) =>
      await callSharePointBlob(token, {
        action: "download-sales-file",
        documentType,
        documentId,
        filePath: targetPath,
      });

    const getSalesMetadata = async (token: string) =>
      await callSharePointJson<{ archivedPdfPath?: string | null; archived_pdf_path?: string | null }>(token, {
        action: "get-sales-metadata",
        documentType,
        documentId,
      });

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        let activeToken = await getFreshAccessToken();
        let activePath = filePath;

        let download = await downloadArchivedFile(activeToken, activePath);

        if (isAuthStatus(download.status)) {
          activeToken = await forceRefreshAccessToken();
          download = await downloadArchivedFile(activeToken, activePath);
        }

        // Fallback: path persisted in ERP can be stale; resolve canonical path and retry.
        if (!download.data && (download.status === 400 || download.status === 403 || download.status === 404)) {
            let metadata = await getSalesMetadata(activeToken);

            if (isAuthStatus(metadata.status)) {
              activeToken = await forceRefreshAccessToken();
              metadata = await getSalesMetadata(activeToken);
            }

            if (metadata.data) {
              const resolvedPath =
                metadata.data.archivedPdfPath ??
                metadata.data.archived_pdf_path ??
                null;

              if (resolvedPath && typeof resolvedPath === "string" && resolvedPath !== activePath) {
                activePath = resolvedPath;
                download = await downloadArchivedFile(activeToken, activePath);
              }
            }
        }

        if (!download.data) {
          const reason = download.error || "No se pudo cargar el PDF archivado";
          throw new Error(`${reason} (${download.status})`);
        }

        if (!(download.data instanceof Blob)) {
          throw new Error("La respuesta del archivado no devolvió un PDF válido");
        }

        const pdfBlob = download.data;
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
