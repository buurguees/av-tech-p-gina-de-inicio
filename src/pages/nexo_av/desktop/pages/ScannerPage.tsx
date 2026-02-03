import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Upload,
  FileText,
  Loader2,
  Trash2,
  Eye,
  Search,
  ScanLine,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ScannedDocument {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  status: string;
  assigned_to_type: string | null;
  assigned_to_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

const ScannerPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDoc, setPreviewDoc] = useState<ScannedDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unassigned" | "assigned">("unassigned");

  useEffect(() => {
    fetchDocuments();
  }, [userId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      // Solo obtenemos documentos no asignados por defecto
      const { data, error } = await supabase
        .from("scanned_documents")
        .select("*")
        .eq("status", "UNASSIGNED")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as ScannedDocument[]);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast.error("Error al cargar documentos");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Solo se permiten archivos PDF, JPG o PNG");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("El archivo no puede superar los 50MB");
      return;
    }

    try {
      setUploading(true);

      // Get auth user id for storage path
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        toast.error("Usuario no autenticado");
        return;
      }

      // Upload to storage using auth.uid() for proper RLS
      const extension = file.name.split(".").pop();
      const fileName = `scan_${Date.now()}.${extension}`;
      const filePath = `${authUser.id}/scanner/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("purchase-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { error: dbError } = await supabase.from("scanned_documents").insert({
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        status: "UNASSIGNED",
        created_by: userId || null,
      });

      if (dbError) throw dbError;

      toast.success("Documento subido correctamente");
      fetchDocuments();
      
      // Reset input
      e.target.value = "";
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Error al subir el documento: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: ScannedDocument) => {
    if (doc.status === "ASSIGNED") {
      toast.error("No se puede eliminar un documento asignado");
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("purchase-documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("scanned_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      toast.success("Documento eliminado");
      fetchDocuments();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Error al eliminar: " + error.message);
    }
  };

  const handlePreview = async (doc: ScannedDocument) => {
    try {
      const path = doc.file_path.trim().replace(/^\//, '');
      if (!path) {
        toast.error("Documento sin ruta");
        return;
      }
      const { data, error } = await supabase.storage
        .from("purchase-documents")
        .createSignedUrl(path, 3600);

      if (error) throw error;

      const url = data?.signedUrl ?? null;
      if (!url) throw new Error("No se pudo generar el enlace");
      setPreviewUrl(url);
      setPreviewDoc(doc);
    } catch (error: any) {
      console.error("Preview error:", error);
      toast.error("Error al previsualizar: " + (error?.message ?? "Error desconocido"));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.file_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "unassigned" && doc.status === "UNASSIGNED") ||
      (filter === "assigned" && doc.status === "ASSIGNED");
    return matchesSearch && matchesFilter;
  });

  const unassignedCount = documents.filter(
    (d) => d.status === "UNASSIGNED"
  ).length;

  return (
    <div className="w-full h-full px-6 py-6">
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <ScanLine className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                Escáner
              </h1>
              <p className="text-sm text-muted-foreground">
                Bandeja de entrada de documentos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              id="scanner-upload"
              className="hidden"
              onChange={handleUpload}
              accept="application/pdf,image/jpeg,image/png"
              disabled={uploading}
            />
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-11 px-6 gap-2"
              disabled={uploading}
            >
              <label htmlFor="scanner-upload" className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Subir Documento
              </label>
            </Button>
          </div>
        </div>

        {/* Stats & Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl"
              />
            </div>

            <div className="flex items-center bg-muted/50 rounded-xl p-1">
              {[
                { id: "all", label: "Todos" },
                { id: "unassigned", label: "Sin asignar" },
                { id: "assigned", label: "Asignados" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                    filter === f.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {unassignedCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-xl">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {unassignedCount} documento{unassignedCount !== 1 ? "s" : ""} sin asignar
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50 bg-muted/20 rounded-3xl p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="p-6 bg-muted/50 rounded-[2rem] mb-6">
              <ScanLine className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              {searchTerm || filter !== "all"
                ? "No se encontraron documentos"
                : "Sin documentos escaneados"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mb-6">
              {searchTerm || filter !== "all"
                ? "Prueba con otros filtros de búsqueda"
                : "Sube facturas o tickets de compra aquí. Se guardarán hasta que los asignes a una factura o gasto."}
            </p>
            {!searchTerm && filter === "all" && (
              <Button
                asChild
                className="bg-primary hover:bg-primary/90 rounded-xl h-11 px-6 gap-2"
              >
                <label htmlFor="scanner-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Subir primer documento
                </label>
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredDocuments.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <Card
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border transition-all hover:shadow-lg cursor-pointer",
                    doc.status === "ASSIGNED"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                  onClick={() => navigate(`/nexo-av/${userId}/scanner/${doc.id}`)}
                >
                  {/* File Icon */}
                  <div className="p-6 flex flex-col items-center">
                    <div
                      className={cn(
                        "p-4 rounded-2xl mb-4 transition-colors",
                        doc.status === "ASSIGNED"
                          ? "bg-emerald-500/10"
                          : "bg-muted/50 group-hover:bg-primary/10"
                      )}
                    >
                      <FileText
                        className={cn(
                          "h-8 w-8",
                          doc.status === "ASSIGNED"
                            ? "text-emerald-500"
                            : "text-muted-foreground group-hover:text-primary"
                        )}
                      />
                    </div>

                    <p className="text-sm font-medium text-foreground text-center truncate w-full max-w-[180px]">
                      {doc.file_name}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(doc.created_at), "dd MMM", {
                          locale: es,
                        })}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div
                      className={cn(
                        "mt-4 px-3 py-1 rounded-full text-xs font-medium",
                        doc.status === "ASSIGNED"
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {doc.status === "ASSIGNED" ? "Asignado" : "Sin asignar"}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handlePreview(doc)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Previsualizar
                        </DropdownMenuItem>
                        {doc.status === "UNASSIGNED" && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(doc)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              {previewDoc?.file_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-6 pt-4 overflow-hidden">
            {previewUrl && previewDoc?.file_type === "application/pdf" ? (
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-xl border"
                title="Preview"
              />
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt={previewDoc?.file_name}
                className="max-w-full max-h-full object-contain mx-auto rounded-xl"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScannerPage;
