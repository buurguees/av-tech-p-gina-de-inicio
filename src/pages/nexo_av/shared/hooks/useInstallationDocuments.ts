import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstallationDocument {
  id: string;
  site_id: string;
  phase: "PRE_INSTALLATION" | "INSTALLATION" | "POST_INSTALLATION" | "DELIVERY";
  document_type: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  sharepoint_web_url: string | null;
  sharepoint_item_id: string | null;
  source: string;
  uploaded_by_technician_id: string | null;
  technician_name: string | null;
  uploaded_by_user_id: string | null;
  caption: string | null;
  taken_at: string | null;
  created_at: string;
}

export interface WorkLogEntry {
  id: string;
  site_id: string;
  technician_id: string;
  technician_name: string | null;
  work_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_declared: boolean;
  check_out_declared: boolean;
  total_hours: number | null;
  notes: string | null;
  created_at: string;
}

export interface QAEntry {
  id: string;
  site_id: string;
  technician_id: string;
  technician_name: string | null;
  session_date: string;
  question_text: string;
  question_at: string;
  escalated_to: string | null;
  escalated_to_name: string | null;
  escalated_at: string | null;
  answer_text: string | null;
  answered_at: string | null;
  answered_by_type: string | null;
  sent_to_technician: boolean;
  topic_tags: string[];
  created_at: string;
}

export interface PhaseSummary {
  phase: string;
  doc_count: number;
  latest_at: string | null;
}

export interface DocumentationSummary {
  phases: PhaseSummary[];
  pending_qa: number;
  work_log_entries: number;
  total_documents: number;
}

export interface UploadDocumentParams {
  siteId: string;
  phase: "PRE_INSTALLATION" | "INSTALLATION" | "POST_INSTALLATION" | "DELIVERY";
  file: File;
  caption?: string;
}

export interface UseInstallationDocumentsResult {
  documents: InstallationDocument[];
  workLog: WorkLogEntry[];
  qaEntries: QAEntry[];
  summary: DocumentationSummary | null;
  loading: boolean;
  uploading: boolean;
  uploadDocument: (params: UploadDocumentParams) => Promise<boolean>;
  deleteDocument: (documentId: string, filePath: string) => Promise<boolean>;
  refresh: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInstallationDocuments(siteId: string | null): UseInstallationDocumentsResult {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<InstallationDocument[]>([]);
  const [workLog, setWorkLog] = useState<WorkLogEntry[]>([]);
  const [qaEntries, setQAEntries] = useState<QAEntry[]>([]);
  const [summary, setSummary] = useState<DocumentationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!siteId) return;

    setLoading(true);
    try {
      const [docsRes, workLogRes, qaRes, summaryRes] = await Promise.all([
        supabase.rpc("list_site_installation_documents", { p_site_id: siteId }),
        supabase.rpc("list_site_work_log", { p_site_id: siteId }),
        supabase.rpc("list_site_qa", { p_site_id: siteId, p_pending_only: false }),
        supabase.rpc("get_site_documentation_summary", { p_site_id: siteId }),
      ]);

      if (docsRes.error) throw docsRes.error;
      if (workLogRes.error) throw workLogRes.error;
      if (qaRes.error) throw qaRes.error;

      setDocuments((docsRes.data as InstallationDocument[]) || []);
      setWorkLog((workLogRes.data as WorkLogEntry[]) || []);
      setQAEntries((qaRes.data as QAEntry[]) || []);

      if (!summaryRes.error && summaryRes.data) {
        const raw = summaryRes.data as any;
        const phases: PhaseSummary[] = (raw.phases || []).map((p: any) => ({
          phase: p.phase,
          doc_count: p.doc_count ?? 0,
          latest_at: p.latest_at ?? null,
        }));
        setSummary({
          phases,
          pending_qa: raw.pending_qa ?? 0,
          work_log_entries: raw.work_log_entries ?? 0,
          total_documents: phases.reduce((sum, p) => sum + p.doc_count, 0),
        });
      }
    } catch (err: any) {
      console.error("[useInstallationDocuments] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uploadDocument = useCallback(
    async ({ siteId: sid, phase, file, caption }: UploadDocumentParams): Promise<boolean> => {
      setUploading(true);
      try {
        // 1. Upload to Supabase Storage
        const ext = file.name.split(".").pop() ?? "bin";
        const storagePath = `${sid}/${phase}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

        const { error: storageError } = await supabase.storage
          .from("installation-uploads")
          .upload(storagePath, file, { upsert: false });

        if (storageError) {
          toast({
            title: "Error al subir archivo",
            description: storageError.message,
            variant: "destructive",
          });
          return false;
        }

        // 2. Register document via RPC
        const { error: rpcError } = await supabase.rpc("register_installation_document", {
          p_site_id: sid,
          p_phase: phase,
          p_file_name: file.name,
          p_file_path: storagePath,
          p_file_size_bytes: file.size,
          p_mime_type: file.type || null,
          p_source: "MANUAL_UPLOAD",
          p_caption: caption ?? null,
          p_uploaded_by_user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
          p_uploaded_by_technician_id: null,
          p_sharepoint_item_id: null,
          p_sharepoint_web_url: null,
          p_sharepoint_drive_id: null,
          p_sharepoint_folder_path: null,
          p_taken_at: null,
          p_metadata: null,
        });

        if (rpcError) {
          // Clean up storage on RPC failure
          await supabase.storage.from("installation-uploads").remove([storagePath]);
          toast({
            title: "Error al registrar documento",
            description: rpcError.message,
            variant: "destructive",
          });
          return false;
        }

        toast({ title: "Documento subido correctamente" });
        await fetchData();
        return true;
      } catch (err: any) {
        toast({ title: "Error inesperado", description: err.message, variant: "destructive" });
        return false;
      } finally {
        setUploading(false);
      }
    },
    [fetchData, toast]
  );

  const deleteDocument = useCallback(
    async (documentId: string, filePath: string): Promise<boolean> => {
      try {
        // Remove from storage
        if (filePath) {
          await supabase.storage.from("installation-uploads").remove([filePath]);
        }

        // Delete from DB via direct table operation (RLS allows admin/manager)
        // Using rpc workaround since table is in projects schema
        const { error } = await supabase.rpc("delete_installation_document", {
          p_document_id: documentId,
        });

        if (error) {
          toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
          return false;
        }

        toast({ title: "Documento eliminado" });
        await fetchData();
        return true;
      } catch (err: any) {
        toast({ title: "Error inesperado", description: err.message, variant: "destructive" });
        return false;
      }
    },
    [fetchData, toast]
  );

  return {
    documents,
    workLog,
    qaEntries,
    summary,
    loading,
    uploading,
    uploadDocument,
    deleteDocument,
    refresh: fetchData,
  };
}
