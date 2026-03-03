import { type ReactElement } from "react";
import { pdf } from "@react-pdf/renderer";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://takvthfatlcjsqgssnta.supabase.co";

type SalesDocumentType = "invoice" | "quote";

type BuildPathsResponse = {
  primaryFolderPath: string;
  mirrorFolderPaths?: string[];
};

type UploadedItem = {
  id: string;
  name: string;
  path: string;
  webUrl?: string | null;
  eTag?: string | null;
  driveId?: string | null;
  siteId?: string | null;
};

type UploadResponse = {
  uploadedItems: UploadedItem[];
};

type ArchiveSalesDocumentOptions = {
  documentType: SalesDocumentType;
  documentId: string;
  issueDate: string;
  fileName: string;
  pdfDocument: ReactElement;
  metadata: Record<string, string | number | boolean | null>;
  persistRpc: "set_invoice_archive_metadata" | "set_quote_archive_metadata";
  persistArgs: {
    p_invoice_id?: string;
    p_quote_id?: string;
  };
};

type RpcError = {
  message?: string;
};

function sanitizeSegment(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*#%&{}~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function digestSha256(input: Blob | string): Promise<string> {
  const buffer =
    typeof input === "string" ? new TextEncoder().encode(input) : await input.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("No hay sesión activa para archivar el documento");
  }

  return accessToken;
}

async function callSharePointFunction<T>(
  accessToken: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/sharepoint-storage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let backendError = "";
    try {
      const payload = await response.json();
      backendError = typeof payload?.error === "string" ? payload.error : "";
    } catch {
      // Ignore non-JSON error bodies and keep a generic message.
    }

    const suffix = backendError ? `: ${backendError}` : "";
    throw new Error(`SharePoint respondió con error (${response.status})${suffix}`);
  }

  return response.json() as Promise<T>;
}

export function buildInvoiceArchiveFileName(input: {
  invoiceNumber: string | null;
  preliminaryNumber: string | null;
  clientName: string;
  issueDate: string;
}) {
  const displayNumber = input.invoiceNumber || input.preliminaryNumber || "SIN_NUMERO";
  return `${sanitizeSegment(displayNumber)} - ${sanitizeSegment(input.clientName || "SIN_CLIENTE")} - ${input.issueDate}.pdf`;
}

export function buildQuoteArchiveFileName(input: {
  quoteNumber: string;
  clientName: string;
  issueDate: string;
}) {
  return `${sanitizeSegment(input.quoteNumber)} - ${sanitizeSegment(input.clientName || "SIN_CLIENTE")} - ${input.issueDate}.pdf`;
}

export async function archiveSalesDocument(options: ArchiveSalesDocumentOptions) {
  const accessToken = await getAccessToken();
  const issueDate = options.issueDate.slice(0, 10);

  const paths = await callSharePointFunction<BuildPathsResponse>(accessToken, {
    action: "build-sales-paths",
    documentType: options.documentType,
    issueDate,
  });

  const pdfBlob = await pdf(options.pdfDocument).toBlob();
  const pdfBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("No se pudo serializar el PDF para SharePoint"));
        return;
      }

      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("El PDF generado no contiene datos válidos"));
        return;
      }

      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer el PDF generado"));
    reader.readAsDataURL(pdfBlob);
  });

  const pdfHash = await digestSha256(pdfBlob);
  const recordHash = await digestSha256(JSON.stringify({
    type: options.documentType,
    documentId: options.documentId,
    issueDate,
    fileName: options.fileName,
    primaryFolderPath: paths.primaryFolderPath,
    pdfHash: `sha256:${pdfHash}`,
  }));

  const uploadResult = await callSharePointFunction<UploadResponse>(accessToken, {
    action: "upload-sales-pdf",
    fileName: options.fileName,
    pdfBase64,
    primaryFolderPath: paths.primaryFolderPath,
    mirrorFolderPaths: paths.mirrorFolderPaths || [],
    metadata: {
      ...options.metadata,
      HashPDF: `sha256:${pdfHash}`,
    },
  });

  const primaryItem = uploadResult.uploadedItems[0];
  if (!primaryItem?.id || !primaryItem.path) {
    throw new Error("SharePoint no devolvió la referencia del archivo principal");
  }

  const rpc = supabase.rpc as unknown as (
    fn: ArchiveSalesDocumentOptions["persistRpc"],
    args: Record<string, unknown>,
  ) => Promise<{ error: RpcError | null }>;

  const { error: persistError } = await rpc(options.persistRpc, {
    ...options.persistArgs,
    p_sharepoint_site_id: primaryItem.siteId || "",
    p_sharepoint_drive_id: primaryItem.driveId || "",
    p_sharepoint_item_id: primaryItem.id,
    p_sharepoint_web_url: primaryItem.webUrl ?? null,
    p_sharepoint_etag: primaryItem.eTag ?? null,
    p_archived_pdf_path: primaryItem.path,
    p_archived_pdf_file_name: options.fileName,
    p_archived_pdf_hash: `sha256:${pdfHash}`,
    p_archived_record_hash: `sha256:${recordHash}`,
  });

  if (persistError) {
    throw new Error(persistError.message || "No se pudo persistir la metadata documental");
  }

  return {
    path: primaryItem.path,
    fileName: options.fileName,
    sharepointItemId: primaryItem.id,
    webUrl: primaryItem.webUrl ?? null,
    pdfHash: `sha256:${pdfHash}`,
    recordHash: `sha256:${recordHash}`,
  };
}
