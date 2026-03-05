import { type ReactElement } from "react";
import { pdf } from "@react-pdf/renderer";
import { supabase } from "@/integrations/supabase/client";
import { forceRefreshAccessToken, getFreshAccessToken } from "./supabaseSession";

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

type PersistMetadataArgs = {
  p_sharepoint_site_id: string;
  p_sharepoint_drive_id: string;
  p_sharepoint_item_id: string;
  p_sharepoint_web_url: string | null;
  p_sharepoint_etag: string | null;
  p_archived_pdf_path: string;
  p_archived_pdf_file_name: string;
  p_archived_pdf_hash: string;
  p_archived_record_hash: string;
  p_invoice_id?: string;
  p_quote_id?: string;
};

type RpcError = { message?: string } | null;

type RpcCallResult = { error: RpcError };

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

async function callSharePointFunction<T>(
  body: Record<string, unknown>,
): Promise<T> {
  const invokeWithToken = async (token: string) => (
    await supabase.functions.invoke("sharepoint-storage", {
      body,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  );

  const isUnauthorizedError = (error: unknown): boolean => {
    const maybeError = error as { message?: string; context?: { response?: { status?: number } } };
    const status = maybeError?.context?.response?.status;
    if (status === 401 || status === 403) return true;
    const message = (maybeError?.message || "").toLowerCase();
    return message.includes("401") || message.includes("403") || message.includes("unauthorized");
  };

  const accessToken = await getFreshAccessToken();
  let { data, error } = await invokeWithToken(accessToken);

  if (error && isUnauthorizedError(error)) {
    const refreshedToken = await forceRefreshAccessToken();
    const retryResult = await invokeWithToken(refreshedToken);
    data = retryResult.data;
    error = retryResult.error;
  }

  if (error) {
    if (isUnauthorizedError(error)) {
      throw new Error(
        "No autorizado para SharePoint (401/403). Verifica que el usuario esté activo y autorizado en NEXO.",
      );
    }
    throw new Error(error.message || "SharePoint respondió con error");
  }

  return data as T;
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
  const issueDate = options.issueDate.slice(0, 10);

  const paths = await callSharePointFunction<BuildPathsResponse>({
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

  const uploadResult = await callSharePointFunction<UploadResponse>({
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

  const persistArgs: PersistMetadataArgs = {
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
  };

  const rpc = (supabase.rpc as any).bind(supabase) as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<RpcCallResult>;

  const persistWithRpcFallback = async () => {
    // Compat con despliegues que no tienen aún hashes o RPC sync_*.
    const attemptArgs: Record<string, unknown>[] = [
      persistArgs,
      (() => {
        const { p_archived_pdf_hash, p_archived_record_hash, ...legacyArgs } = persistArgs;
        return legacyArgs;
      })(),
    ];

    const attemptFunctions = [options.persistRpc, `sync_${options.persistRpc}`];
    const errors: string[] = [];

    for (const fn of attemptFunctions) {
      for (const args of attemptArgs) {
        const result = await rpc(fn, args);
        if (!result.error) return;
        errors.push(result.error.message || `${fn} failed`);
      }
    }

    throw new Error(
      errors[errors.length - 1] || "No se pudo persistir la metadata documental",
    );
  };

  try {
    await callSharePointFunction<{ ok: boolean }>({
      action: "persist-sales-metadata",
      documentType: options.documentType,
      documentId: options.documentId,
      sharepointSiteId: primaryItem.siteId || "",
      sharepointDriveId: primaryItem.driveId || "",
      sharepointItemId: primaryItem.id,
      sharepointWebUrl: primaryItem.webUrl ?? null,
      sharepointETag: primaryItem.eTag ?? null,
      archivedPdfPath: primaryItem.path,
      archivedPdfFileName: options.fileName,
      archivedPdfHash: `sha256:${pdfHash}`,
      archivedRecordHash: `sha256:${recordHash}`,
    });
  } catch {
    await persistWithRpcFallback();
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
