import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ExternalLink, Download, Image, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { InstallationDocument } from "../hooks/useInstallationDocuments";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStorageUrl(filePath: string): string {
  const { data } = supabase.storage.from("installation-uploads").getPublicUrl(filePath);
  return data.publicUrl;
}

function isImage(mimeType: string | null, fileName: string): boolean {
  if (mimeType) return mimeType.startsWith("image/");
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"].includes(ext);
}

const PHASE_LABELS: Record<string, string> = {
  PRE_INSTALLATION: "Pre-Instalación",
  INSTALLATION: "Instalación",
  POST_INSTALLATION: "Post-Instalación",
  DELIVERY: "Entrega",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentLightboxProps {
  document: InstallationDocument | null;
  documents: InstallationDocument[];
  onClose: () => void;
  onNavigate: (doc: InstallationDocument) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const DocumentLightbox = ({ document: doc, documents, onClose, onNavigate }: DocumentLightboxProps) => {
  if (!doc) return null;

  const currentIndex = documents.findIndex((d) => d.id === doc.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < documents.length - 1;

  const img = isImage(doc.mime_type, doc.file_name);
  const imgUrl = doc.sharepoint_web_url || (img ? getStorageUrl(doc.file_path) : null);
  const viewUrl = doc.sharepoint_web_url || (img ? getStorageUrl(doc.file_path) : null);

  const goTo = useCallback(
    (direction: "prev" | "next") => {
      if (direction === "prev" && hasPrev) onNavigate(documents[currentIndex - 1]);
      if (direction === "next" && hasNext) onNavigate(documents[currentIndex + 1]);
    },
    [currentIndex, documents, hasPrev, hasNext, onNavigate]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goTo("prev");
      if (e.key === "ArrowRight") goTo("next");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goTo]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      {documents.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white/80 text-sm px-3 py-1 rounded-full">
          {currentIndex + 1} / {documents.length}
        </div>
      )}

      {/* Prev */}
      {hasPrev && (
        <button
          className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); goTo("prev"); }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Content */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {img && imgUrl ? (
          <img
            src={imgUrl}
            alt={doc.caption || doc.file_name}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <div className="w-48 h-48 flex flex-col items-center justify-center gap-3 bg-white/5 rounded-xl border border-white/10">
            <FileText className="w-16 h-16 text-white/40" />
            <span className="text-white/60 text-sm text-center px-4 leading-tight">{doc.file_name}</span>
          </div>
        )}

        {/* Meta */}
        <div className="text-center space-y-1">
          <p className="text-white/90 text-sm font-medium">
            {PHASE_LABELS[doc.phase] || doc.phase}
          </p>
          {doc.caption && (
            <p className="text-white/70 text-sm">{doc.caption}</p>
          )}
          <div className="flex items-center justify-center gap-4 text-white/50 text-xs">
            <span>{formatDate(doc.taken_at || doc.created_at)}</span>
            {doc.technician_name && <span>· {doc.technician_name}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {viewUrl && (
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
                "bg-white/10 hover:bg-white/20 text-white transition-colors"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir</span>
            </a>
          )}
        </div>
      </div>

      {/* Next */}
      {hasNext && (
        <button
          className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); goTo("next"); }}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default DocumentLightbox;
