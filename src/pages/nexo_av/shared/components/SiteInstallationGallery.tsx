import { useState } from "react";
import { Plus, Loader2, ImageOff, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DocumentThumbnail from "./DocumentThumbnail";
import DocumentLightbox from "./DocumentLightbox";
import UploadDocumentDialog from "./UploadDocumentDialog";
import type {
  InstallationDocument,
  UploadDocumentParams,
} from "../hooks/useInstallationDocuments";

// ─── Constants ────────────────────────────────────────────────────────────────

type Phase = "PRE_INSTALLATION" | "INSTALLATION" | "POST_INSTALLATION" | "DELIVERY";

const PHASES: { value: Phase; label: string; shortLabel: string }[] = [
  { value: "PRE_INSTALLATION", label: "Pre-Instalación", shortLabel: "Pre" },
  { value: "INSTALLATION", label: "Instalación", shortLabel: "Inst" },
  { value: "POST_INSTALLATION", label: "Post-Instalación", shortLabel: "Post" },
  { value: "DELIVERY", label: "Entrega", shortLabel: "Entrega" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SiteInstallationGalleryProps {
  siteId: string;
  documents: InstallationDocument[];
  loading: boolean;
  uploading: boolean;
  canUpload?: boolean;
  canDelete?: boolean;
  onUpload: (params: UploadDocumentParams) => Promise<boolean>;
  onDelete: (id: string, filePath: string) => Promise<boolean>;
  compact?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PhaseStatus({ count }: { count: number }) {
  if (count === 0) return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/50" />;
  if (count < 2) return <Clock className="w-3.5 h-3.5 text-amber-500" />;
  return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SiteInstallationGallery = ({
  siteId,
  documents,
  loading,
  uploading,
  canUpload = false,
  canDelete = false,
  onUpload,
  onDelete,
  compact = false,
}: SiteInstallationGalleryProps) => {
  const [activePhase, setActivePhase] = useState<Phase>("PRE_INSTALLATION");
  const [lightboxDoc, setLightboxDoc] = useState<InstallationDocument | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<Phase>("INSTALLATION");

  const byPhase = (phase: Phase) => documents.filter((d) => d.phase === phase);
  const phaseDocs = byPhase(activePhase);

  const openUpload = (phase: Phase) => {
    setUploadPhase(phase);
    setUploadOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Phase tabs */}
      <div className="flex gap-1 border-b border-border pb-0 overflow-x-auto scrollbar-hide">
        {PHASES.map((p) => {
          const count = byPhase(p.value).length;
          return (
            <button
              key={p.value}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors",
                activePhase === p.value
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActivePhase(p.value)}
            >
              <PhaseStatus count={count} />
              <span>{compact ? p.shortLabel : p.label}</span>
              {count > 0 && (
                <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 leading-none">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="pt-3">
        {phaseDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
            <ImageOff className="w-10 h-10 opacity-30" />
            <p className="text-sm">Sin documentos en esta fase</p>
            {canUpload && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openUpload(activePhase)}
                disabled={uploading}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Subir documento
              </Button>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-2",
              compact
                ? "grid-cols-3 sm:grid-cols-4"
                : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
            )}
          >
            {phaseDocs.map((doc) => (
              <DocumentThumbnail
                key={doc.id}
                document={doc}
                onClick={() => setLightboxDoc(doc)}
                onDelete={canDelete ? () => onDelete(doc.id, doc.file_path) : undefined}
                canDelete={canDelete}
              />
            ))}
            {canUpload && (
              <button
                className={cn(
                  "aspect-square rounded-lg border-2 border-dashed border-border",
                  "flex flex-col items-center justify-center gap-1",
                  "text-muted-foreground hover:border-primary/50 hover:text-primary",
                  "transition-colors duration-200"
                )}
                onClick={() => openUpload(activePhase)}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px]">Añadir</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxDoc && (
        <DocumentLightbox
          document={lightboxDoc}
          documents={phaseDocs}
          onClose={() => setLightboxDoc(null)}
          onNavigate={(doc) => setLightboxDoc(doc)}
        />
      )}

      {/* Upload dialog */}
      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        siteId={siteId}
        defaultPhase={uploadPhase}
        uploading={uploading}
        onUpload={onUpload}
      />
    </>
  );
};

export default SiteInstallationGallery;
