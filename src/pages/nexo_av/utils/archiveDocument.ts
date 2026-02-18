import { pdf } from "@react-pdf/renderer";
import { supabase } from "@/integrations/supabase/client";
import type { ReactElement } from "react";

interface ArchiveResult {
  ok: boolean;
  key?: string;
  file_id?: string;
  error?: string;
}

/**
 * Generates a PDF from a React-PDF element, converts it to base64,
 * and sends it to the minio-proxy Edge Function for immutable archiving.
 *
 * The Edge Function handles: MinIO upload, minio_files record creation,
 * storage_key update on the source record (invoice/quote), and
 * soft-deletion of any previous archive for the same document.
 */
export async function archiveDocumentToMinio(
  sourceType: "ventas" | "presupuestos",
  sourceId: string,
  pdfElement: ReactElement
): Promise<ArchiveResult> {
  const blob = await pdf(pdfElement).toBlob();

  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "No hay sesión activa" };

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/minio-proxy`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        action: "archive_document",
        source_type: sourceType,
        source_id: sourceId,
        pdf_base64: base64,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("archive_document error:", res.status, text);
    return { ok: false, error: `HTTP ${res.status}: ${text}` };
  }

  return await res.json();
}
