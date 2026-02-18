import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, RefreshCw, Archive, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import "../../styles/components/common/archived-pdf-viewer.css";

interface ArchivedPDFViewerProps {
  storageKey: string;
  archivedAt: string;
  fileName: string;
  className?: string;
}

const ArchivedPDFViewer = ({
  storageKey,
  archivedAt,
  fileName,
  className = "",
}: ArchivedPDFViewerProps) => {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPresignedUrl = useCallback(async () => {
    if (!storageKey) {
      setError(true);
      setErrorMessage("No se encontró la referencia al archivo");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(false);
      setErrorMessage(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError(true);
        setErrorMessage("Sesión no válida");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/minio-proxy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
          },
          body: JSON.stringify({
            action: "get_presigned_url_by_key",
            storage_key: storageKey,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setError(true);
        setErrorMessage(result.error || "Error al obtener el documento");
        return;
      }

      setPresignedUrl(result.url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(true);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  useEffect(() => {
    fetchPresignedUrl();
  }, [fetchPresignedUrl]);

  const formattedDate = archivedAt
    ? new Date(archivedAt).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  if (loading) {
    return (
      <div className={`archived-pdf-viewer ${className}`}>
        <div className="archived-pdf-viewer__loading">
          <Loader2 className="archived-pdf-viewer__icon archived-pdf-viewer__icon--spinning" style={{ width: "2rem", height: "2rem" }} />
          <span>Cargando documento archivado...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`archived-pdf-viewer ${className}`}>
      {/* Header: badge + actions */}
      <div className="archived-pdf-viewer__header">
        <div className="archived-pdf-viewer__badge">
          <Archive className="archived-pdf-viewer__badge-icon" />
          <span>Documento archivado{formattedDate ? ` — ${formattedDate}` : ""}</span>
        </div>

        <div className="archived-pdf-viewer__actions">
          {error && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPresignedUrl}
              className="gap-1.5"
            >
              <RefreshCw className="archived-pdf-viewer__icon" />
              Recargar
            </Button>
          )}

          {presignedUrl && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(presignedUrl, "_blank")}
                className="gap-1.5"
              >
                <ExternalLink className="archived-pdf-viewer__icon" />
                <span className="hidden md:inline">Abrir</span>
              </Button>
              <Button
                size="sm"
                className="archived-pdf-viewer__download-btn gap-1.5"
                asChild
              >
                <a href={presignedUrl} download={fileName}>
                  <Download className="archived-pdf-viewer__icon" />
                  <span className="hidden md:inline">Descargar PDF</span>
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PDF Preview */}
      <div className="archived-pdf-viewer__preview">
        {error || !presignedUrl ? (
          <div className="archived-pdf-viewer__error-overlay">
            <Archive style={{ width: "3rem", height: "3rem", opacity: 0.3 }} />
            <p className="archived-pdf-viewer__error-text">
              {errorMessage || "No se pudo cargar el documento"}
            </p>
            <Button variant="outline" size="sm" onClick={fetchPresignedUrl} className="gap-1.5">
              <RefreshCw className="archived-pdf-viewer__icon" />
              Recargar enlace
            </Button>
          </div>
        ) : (
          <iframe
            src={presignedUrl}
            className="archived-pdf-viewer__iframe"
            title="Documento archivado"
            onError={() => {
              setError(true);
              setErrorMessage("El enlace ha caducado");
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ArchivedPDFViewer;
