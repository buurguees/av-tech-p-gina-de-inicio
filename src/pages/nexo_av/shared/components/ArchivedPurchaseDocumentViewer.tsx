import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Download, ExternalLink, Loader2 } from "lucide-react";
import { forceRefreshAccessToken, getFreshAccessToken } from "../lib/supabaseSession";

interface ArchivedPurchaseDocumentViewerProps {
  documentId: string;
  filePath: string;
  fileName: string;
  title?: string;
  className?: string;
}

type SharePointCallResult<T> = {
  data: T | null;
  status: number;
  error: string | null;
};

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://takvthfatlcjsqgssnta.supabase.co";

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
      // ignore non-json responses
    }
    return { data: null, status: response.status, error: errorMessage };
  }

  return { data: (await response.json()) as T, status: response.status, error: null };
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
      // ignore non-json responses
    }
    return { data: null, status: response.status, error: errorMessage };
  }

  return { data: await response.blob(), status: response.status, error: null };
}

function detectMimeType(fileName: string, blob: Blob) {
  if (blob.type) {
    return blob.type;
  }

  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  return "application/octet-stream";
}

const ArchivedPurchaseDocumentViewer = ({
  documentId,
  filePath,
  fileName,
  title = "Vista previa del documento archivado",
  className = "",
}: ArchivedPurchaseDocumentViewerProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState<string>("application/octet-stream");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revokedUrl: string | null = null;
    const isAuthStatus = (status: number) => status === 401 || status === 403;

    const downloadArchivedFile = async (token: string, targetPath: string) =>
      await callSharePointBlob(token, {
        action: "download-purchase-file",
        documentId,
        filePath: targetPath,
      });

    const getPurchaseMetadata = async (token: string) =>
      await callSharePointJson<{ archivedFilePath?: string | null; archivedFileName?: string | null }>(token, {
        action: "get-purchase-metadata",
        documentId,
      });

    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);

        let activeToken = await getFreshAccessToken();
        let activePath = filePath;
        let activeFileName = fileName;
        let download = await downloadArchivedFile(activeToken, activePath);

        if (isAuthStatus(download.status)) {
          activeToken = await forceRefreshAccessToken();
          download = await downloadArchivedFile(activeToken, activePath);
        }

        if (!download.data && (download.status === 400 || download.status === 403 || download.status === 404)) {
          let metadata = await getPurchaseMetadata(activeToken);

          if (isAuthStatus(metadata.status)) {
            activeToken = await forceRefreshAccessToken();
            metadata = await getPurchaseMetadata(activeToken);
          }

          const resolvedPath = metadata.data?.archivedFilePath ?? null;
          const resolvedFileName = metadata.data?.archivedFileName ?? null;

          if (resolvedPath && resolvedPath !== activePath) {
            activePath = resolvedPath;
            activeFileName = resolvedFileName || activeFileName;
            download = await downloadArchivedFile(activeToken, activePath);
          }
        }

        if (!download.data || !(download.data instanceof Blob) || download.data.size === 0) {
          throw new Error(download.error || "No se pudo cargar el documento archivado");
        }

        const nextMimeType = detectMimeType(activeFileName, download.data);
        const normalizedBlob = new Blob([download.data], { type: nextMimeType });
        const nextUrl = URL.createObjectURL(normalizedBlob);
        revokedUrl = nextUrl;
        setBlob(normalizedBlob);
        setMimeType(nextMimeType);
        setBlobUrl(nextUrl);
      } catch (loadError) {
        console.error("Error loading archived purchase document:", loadError);
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el documento archivado");
      } finally {
        setLoading(false);
      }
    };

    void loadDocument();

    return () => {
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [documentId, fileName, filePath]);

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
          {error || "No se pudo cargar el documento archivado"}
        </p>
      </div>
    );
  }

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");

  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(blobUrl, "_blank", "noopener,noreferrer")}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir
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
          Descargar
        </Button>
      </div>

      <div className="flex-1 min-h-0 bg-zinc-800">
        {isPdf ? (
          <iframe
            src={blobUrl}
            title={title}
            className="w-full h-full border-0"
          />
        ) : isImage ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={blobUrl}
              alt={title}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Este formato no tiene vista previa embebida. Usa "Abrir" o "Descargar".
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivedPurchaseDocumentViewer;
