import { useState, useRef } from "react";
import { Upload, X, Image, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { UploadDocumentParams } from "../hooks/useInstallationDocuments";

// ─── Constants ────────────────────────────────────────────────────────────────

type Phase = "PRE_INSTALLATION" | "INSTALLATION" | "POST_INSTALLATION" | "DELIVERY";

const PHASES: { value: Phase; label: string }[] = [
  { value: "PRE_INSTALLATION", label: "Pre-Instalación" },
  { value: "INSTALLATION", label: "Instalación" },
  { value: "POST_INSTALLATION", label: "Post-Instalación" },
  { value: "DELIVERY", label: "Entrega" },
];

const MAX_SIZE_MB = 30;
const ACCEPTED = "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx";

// ─── Props ────────────────────────────────────────────────────────────────────

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  defaultPhase?: Phase;
  uploading: boolean;
  onUpload: (params: UploadDocumentParams) => Promise<boolean>;
}

// ─── Component ────────────────────────────────────────────────────────────────

const UploadDocumentDialog = ({
  open,
  onOpenChange,
  siteId,
  defaultPhase = "INSTALLATION",
  uploading,
  onUpload,
}: UploadDocumentDialogProps) => {
  const [phase, setPhase] = useState<Phase>(defaultPhase);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setCaption("");
    setPhase(defaultPhase);
    setDragOver(false);
  };

  const handleClose = () => {
    if (uploading) return;
    reset();
    onOpenChange(false);
  };

  const handleFile = (f: File) => {
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`El archivo excede el tamaño máximo de ${MAX_SIZE_MB} MB.`);
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    const success = await onUpload({ siteId, phase, file, caption: caption.trim() || undefined });
    if (success) {
      reset();
      onOpenChange(false);
    }
  };

  const isImage = file ? file.type.startsWith("image/") : false;
  const preview = file && isImage ? URL.createObjectURL(file) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Phase selector */}
          <div className="space-y-1.5">
            <Label>Fase</Label>
            <Select value={phase} onValueChange={(v) => setPhase(v as Phase)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHASES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File drop zone */}
          <div className="space-y-1.5">
            <Label>Archivo</Label>
            <div
              className={cn(
                "relative border-2 border-dashed rounded-lg transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-border/80",
                file ? "p-3" : "p-8"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !file && inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />

              {file ? (
                <div className="flex items-center gap-3">
                  {preview ? (
                    <img src={preview} className="w-14 h-14 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-7 h-7 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground cursor-pointer">
                  <Upload className="w-8 h-8" />
                  <p className="text-sm">Arrastra un archivo o haz clic para seleccionar</p>
                  <p className="text-xs">Imágenes, PDF, documentos · máx {MAX_SIZE_MB} MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Caption */}
          <div className="space-y-1.5">
            <Label>Descripción <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Descripción del documento..."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Subir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadDocumentDialog;
