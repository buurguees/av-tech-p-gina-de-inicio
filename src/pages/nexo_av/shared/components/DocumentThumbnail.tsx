import { useState } from "react";
import { Image, FileText, Loader2, Trash2 } from "lucide-react";
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentThumbnailProps {
  document: InstallationDocument;
  onClick?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  size?: "sm" | "md";
}

// ─── Component ────────────────────────────────────────────────────────────────

const DocumentThumbnail = ({
  document: doc,
  onClick,
  onDelete,
  canDelete = false,
  size = "md",
}: DocumentThumbnailProps) => {
  const [imgError, setImgError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const img = isImage(doc.mime_type, doc.file_name);
  const imgUrl = doc.sharepoint_web_url || (img ? getStorageUrl(doc.file_path) : null);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  const sizeClass = size === "sm" ? "w-24 h-24" : "w-full aspect-square";

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden border border-border bg-muted/20 cursor-pointer group",
        "transition-all duration-200 hover:border-primary/40 hover:shadow-sm",
        sizeClass
      )}
      onClick={onClick}
    >
      {/* Thumbnail content */}
      {img && imgUrl && !imgError ? (
        <img
          src={imgUrl}
          alt={doc.caption || doc.file_name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : img ? (
        <div className="w-full h-full flex items-center justify-center">
          <Image className="w-8 h-8 text-muted-foreground/40" />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-2">
          <FileText className="w-8 h-8 text-muted-foreground/40" />
          <span className="text-[10px] text-muted-foreground text-center truncate w-full leading-tight">
            {doc.file_name}
          </span>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex flex-col justify-end">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
          {doc.caption && (
            <p className="text-white text-[10px] leading-tight line-clamp-2">{doc.caption}</p>
          )}
          <p className="text-white/60 text-[10px] leading-tight mt-0.5">
            {formatDate(doc.taken_at || doc.created_at)}
          </p>
          {doc.technician_name && (
            <p className="text-white/60 text-[10px] leading-tight truncate">{doc.technician_name}</p>
          )}
        </div>
      </div>

      {/* Source badge */}
      {doc.source === "WHATSAPP" && (
        <div className="absolute top-1 left-1 bg-green-500/90 rounded px-1 py-0.5">
          <span className="text-white text-[9px] font-medium leading-none">WA</span>
        </div>
      )}

      {/* Delete button */}
      {canDelete && (
        <button
          className={cn(
            "absolute top-1 right-1 w-6 h-6 rounded flex items-center justify-center",
            "bg-destructive/90 text-white opacity-0 group-hover:opacity-100",
            "transition-opacity duration-200 hover:bg-destructive"
          )}
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Trash2 className="w-3 h-3" />
          )}
        </button>
      )}
    </div>
  );
};

export default DocumentThumbnail;
