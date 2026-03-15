import { supabase } from "@/integrations/supabase/client";
import { forceRefreshAccessToken, getFreshAccessToken } from "./supabaseSession";

type PurchaseArchiveMetadata = {
  archivedFilePath: string | null;
  archivedFileName: string | null;
  sharepointItemId: string | null;
  sharepointWebUrl?: string | null;
};

type ArchivePurchaseDocumentResult = {
  path: string;
  fileName: string;
  sharepointItemId: string;
  sharepointWebUrl?: string | null;
  pdfHash: string;
  recordHash: string;
  mirrorCount: number;
};

type InvokeResult<T> = {
  data: T | null;
  error: { message?: string; context?: { response?: { status?: number } } } | null;
};

function isUnauthorized(error: InvokeResult<unknown>["error"]) {
  const status = error?.context?.response?.status;
  const message = (error?.message || "").toLowerCase();
  return status === 401 || status === 403 || message.includes("401") || message.includes("403") || message.includes("unauthorized");
}

async function callSharePointFunction<T>(body: Record<string, unknown>): Promise<T> {
  const invoke = async (token: string) =>
    await supabase.functions.invoke("sharepoint-storage", {
      body,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }) as InvokeResult<T>;

  let token = await getFreshAccessToken();
  let result = await invoke(token);

  if (result.error && isUnauthorized(result.error)) {
    token = await forceRefreshAccessToken();
    result = await invoke(token);
  }

  if (result.error) {
    throw new Error(result.error.message || "SharePoint respondió con error");
  }

  return result.data as T;
}

export async function archivePurchaseDocument(documentId: string) {
  return await callSharePointFunction<ArchivePurchaseDocumentResult>({
    action: "archive-purchase-document",
    documentId,
  });
}

export async function getPurchaseArchiveMetadata(documentId: string) {
  return await callSharePointFunction<PurchaseArchiveMetadata>({
    action: "get-purchase-metadata",
    documentId,
  });
}
