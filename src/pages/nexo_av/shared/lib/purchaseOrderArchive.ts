/**
 * purchaseOrderArchive — Archivado de Pedidos de Compra en SharePoint
 * Ruta canónica: Compras/{año}/Pedidos de Compra/{mes}/
 * Documento operativo — NO fiscal.
 */
import { type ReactElement } from "react";
import { pdf } from "@react-pdf/renderer";
import { supabase } from "@/integrations/supabase/client";
import { getFreshAccessToken, forceRefreshAccessToken } from "./supabaseSession";

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

function sanitizeSegment(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*#%&{}~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function callSharePointFunction<T>(body: Record<string, unknown>): Promise<T> {
  const invokeWithToken = async (token: string) =>
    supabase.functions.invoke("sharepoint-storage", {
      body,
      headers: { Authorization: `Bearer ${token}` },
    });

  const isUnauthorizedError = (error: unknown): boolean => {
    const e = error as { message?: string; context?: { response?: { status?: number } } };
    const status = e?.context?.response?.status;
    if (status === 401 || status === 403) return true;
    const message = (e?.message || "").toLowerCase();
    return message.includes("401") || message.includes("403") || message.includes("unauthorized");
  };

  const accessToken = await getFreshAccessToken();
  let { data, error } = await invokeWithToken(accessToken);

  if (error && isUnauthorizedError(error)) {
    const refreshed = await forceRefreshAccessToken();
    const retry = await invokeWithToken(refreshed);
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    if (isUnauthorizedError(error)) {
      throw new Error("No autorizado para SharePoint (401/403). Verifica que el usuario esté activo.");
    }
    throw new Error(error.message || "SharePoint respondió con error");
  }

  return data as T;
}

export function buildPurchaseOrderArchiveFileName(input: {
  poNumber: string;
  issueDate: string | null;
}): string {
  const date = (input.issueDate || new Date().toISOString()).slice(0, 10);
  return `${sanitizeSegment(input.poNumber)} - ${date}.pdf`;
}

export type ArchivePurchaseOrderOptions = {
  orderId: string;
  poNumber: string;
  issueDate: string | null;
  fileName: string;
  pdfDocument: ReactElement;
  supplierName: string | null;
  projectNumber: string | null;
};

export async function archivePurchaseOrderDocument(
  options: ArchivePurchaseOrderOptions,
): Promise<{
  path: string;
  fileName: string;
  sharepointItemId: string;
  webUrl: string | null;
}> {
  const issueDate = (options.issueDate || new Date().toISOString()).slice(0, 10);
  const [year, month] = issueDate.split("-");
  const folderPath = `Compras/${year}/Pedidos de Compra/${month}`;

  // Generar PDF como blob y convertir a base64
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

  // Subir a SharePoint (drive de Compras)
  const uploadResult = await callSharePointFunction<UploadResponse>({
    action: "upload-purchase-order-pdf",
    fileName: options.fileName,
    pdfBase64,
    folderPath,
    metadata: {
      TipoDocumento: "PedidoCompra",
      NumeroDocumento: options.poNumber,
      FechaDocumento: issueDate,
      Proveedor: sanitizeSegment(options.supplierName),
      Proyecto: sanitizeSegment(options.projectNumber),
      EstadoERP: "APPROVED",
      FechaArchivado: new Date().toISOString(),
    },
  });

  const item = uploadResult.uploadedItems[0];
  if (!item?.id || !item.path) {
    throw new Error("SharePoint no devolvió la referencia del archivo");
  }

  // Persistir metadata en BD
  const { error: dbError } = await (supabase.rpc as any)(
    "update_purchase_order_archive_metadata",
    {
      p_order_id: options.orderId,
      p_pdf_path: item.path,
      p_pdf_file_name: options.fileName,
      p_item_id: item.id,
      p_web_url: item.webUrl ?? null,
    },
  );

  if (dbError) {
    throw new Error(dbError.message || "No se pudo persistir la metadata en la base de datos");
  }

  return {
    path: item.path,
    fileName: options.fileName,
    sharepointItemId: item.id,
    webUrl: item.webUrl ?? null,
  };
}
