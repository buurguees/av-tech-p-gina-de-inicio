import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

type EnvMap = Record<string, string>;

type GraphTokenResponse = {
  access_token: string;
};

type SyncTarget = "invoices" | "tickets" | "all";

type SyncOptions = {
  target: SyncTarget;
  limit: number;
  invoiceId?: string;
  dryRun: boolean;
};

type PurchaseRecord = {
  id: string;
  invoice_number: string | null;
  internal_purchase_number: string | null;
  supplier_invoice_number: string | null;
  document_type: string | null;
  issue_date: string | null;
  status: string | null;
  supplier_id?: string | null;
  technician_id?: string | null;
  supplier_name: string | null;
  technician_name: string | null;
  manual_beneficiary_name: string | null;
  expense_category: string | null;
  project_id?: string | null;
  project_name: string | null;
  project_number: string | null;
  site_id?: string | null;
  site_name: string | null;
  file_path: string | null;
  file_name: string | null;
  sharepoint_item_id: string | null;
  archived_pdf_path: string | null;
};

type UploadSummary = {
  documentType: string;
  documentId: string;
  number: string | null;
  fileName: string;
  primaryFolderPath: string;
  mirrorFolderPaths: string[];
  sharepointItemId?: string;
  pdfHash: string;
  recordHash: string;
};

const PURCHASE_ARCHIVABLE_STATUSES = new Set(["APPROVED", "PARTIAL", "PAID", "CANCELLED", "BLOCKED"]);

function readEnvFile(): EnvMap {
  const envPath = path.resolve(process.cwd(), ".env");
  const raw = fs.readFileSync(envPath, "utf8");
  const entries = raw
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map((line) => {
      const separatorIndex = line.indexOf("=");
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "");
      return [key, value] as const;
    });

  return Object.fromEntries(entries);
}

function required(env: EnvMap, key: string): string {
  const value = env[key] || process.env[key];
  if (!value) {
    throw new Error(`Missing env var ${key}`);
  }
  return value;
}

function sanitizeSegment(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")       // strip accents
    .replace(/[<>:"/\\|?*#%&{}~]/g, " ")   // replace invalid chars
    .replace(/\s+/g, " ")                   // collapse whitespace
    .trim()
    .replace(/\.+$/, "")                    // trailing dots (SharePoint rejects them)
    .trim()                                 // trim again after removing dots
    .slice(0, 128);                         // max 128 chars per SharePoint segment limit
}

function parseOptions(): SyncOptions {
  const args = process.argv.slice(2);
  const options: SyncOptions = {
    target: "all",
    limit: 5000,
    dryRun: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--invoices") options.target = "invoices";
    if (arg === "--tickets") options.target = "tickets";
    if (arg === "--all") options.target = "all";
    if (arg === "--dry-run") options.dryRun = true;
    if (arg === "--limit" && next) {
      options.limit = Number.parseInt(next, 10);
      index += 1;
    }
    if (arg === "--invoice-id" && next) {
      options.invoiceId = next;
      index += 1;
    }
  }

  return options;
}

function normalizePurchaseDocumentType(value: string | null | undefined): "INVOICE" | "EXPENSE" {
  return value === "INVOICE" ? "INVOICE" : "EXPENSE";
}

function resolvePurchaseCounterpartyType(record: PurchaseRecord): "SUPPLIER" | "TECHNICIAN" | "BENEFICIARY" {
  if (record.technician_name) return "TECHNICIAN";
  if (record.supplier_name) return "SUPPLIER";
  return "BENEFICIARY";
}

function resolvePurchaseCounterpartyName(record: PurchaseRecord): string {
  return sanitizeSegment(
    record.supplier_name ||
    record.technician_name ||
    record.manual_beneficiary_name ||
    "",
  );
}

function buildPurchaseProjectSegment(record: PurchaseRecord): string {
  return sanitizeSegment(
    [record.project_number, record.project_name, record.site_name]
      .filter(Boolean)
      .join(" - "),
  );
}

function getFileExtension(fileName: string | null | undefined, filePath: string | null | undefined): string {
  const source = fileName || filePath || "";
  const basename = source.split("/").at(-1) || source;
  const dotIndex = basename.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === basename.length - 1) return ".pdf";
  return basename.slice(dotIndex).toLowerCase();
}

function inferContentType(fileName: string) {
  switch (getFileExtension(fileName, fileName)) {
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".heic":
      return "image/heic";
    case ".heif":
      return "image/heif";
    default:
      return "application/octet-stream";
  }
}

function buildPurchasePaths(record: PurchaseRecord) {
  const issueDate = (record.issue_date || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const year = issueDate.slice(0, 4);
  const month = issueDate.slice(0, 7);
  const documentType = normalizePurchaseDocumentType(record.document_type);
  const mirrorFolderPaths = new Set<string>();

  if (documentType === "INVOICE") {
    const counterpartyType = resolvePurchaseCounterpartyType(record);
    const counterpartySegment = resolvePurchaseCounterpartyName(record);
    const invoiceBaseFolder = counterpartyType === "TECHNICIAN"
      ? `Compras/${year}/Facturas de Compra/Tecnicos`
      : `Compras/${year}/Facturas de Compra/Proveedores`;

    if (counterpartySegment) {
      mirrorFolderPaths.add(`${invoiceBaseFolder}/${counterpartySegment}/${month}`);
    }

    return {
      primaryFolderPath: `${invoiceBaseFolder}/${month}`,
      mirrorFolderPaths: Array.from(mirrorFolderPaths),
    };
  }

  const beneficiarySegment = resolvePurchaseCounterpartyName(record);
  const projectSegment = buildPurchaseProjectSegment(record);

  if (beneficiarySegment) {
    mirrorFolderPaths.add(`Compras/${year}/Tickets/Por Beneficiario/${beneficiarySegment}/${month}`);
  }

  if (projectSegment) {
    mirrorFolderPaths.add(`Compras/${year}/Tickets/Por Proyecto/${projectSegment}`);
  }

  return {
    primaryFolderPath: `Compras/${year}/Tickets/${month}`,
    mirrorFolderPaths: Array.from(mirrorFolderPaths),
  };
}

function buildPurchaseArchiveFileName(record: PurchaseRecord): string {
  const issueDate = (record.issue_date || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const extension = getFileExtension(record.file_name, record.file_path);
  const internalNumber = sanitizeSegment(record.internal_purchase_number || record.invoice_number || record.id);
  const counterparty = resolvePurchaseCounterpartyName(record);

  if (normalizePurchaseDocumentType(record.document_type) === "INVOICE") {
    return `${internalNumber} - ${sanitizeSegment(counterparty || "SIN_PROVEEDOR")} - ${issueDate}${extension}`;
  }

  const category = sanitizeSegment(record.expense_category || "SIN_CATEGORIA");
  return `${internalNumber} - ${category} - ${sanitizeSegment(counterparty || "SIN_BENEFICIARIO")} - ${issueDate}${extension}`;
}

function mapPurchaseStatus(status: string | null | undefined): string {
  switch (status) {
    case "DRAFT":
    case "PENDING":
    case "SCANNED":
    case "PENDING_VALIDATION":
      return "Pendiente Validacion";
    case "REGISTERED":
    case "APPROVED":
      return "Validada";
    case "PARTIAL":
      return "Parcialmente Pagada";
    case "PAID":
      return "Pagada";
    case "CANCELLED":
    case "BLOCKED":
      return "Anulada";
    default:
      return sanitizeSegment(status || "Desconocido") || "Desconocido";
  }
}

function buildPurchaseMetadata(record: PurchaseRecord, archivedByEmail: string, hash: string) {
  const issueDate = (record.issue_date || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const month = issueDate.slice(0, 7);
  const year = issueDate.slice(0, 4);
  const counterparty = resolvePurchaseCounterpartyName(record);
  const projectSegment = buildPurchaseProjectSegment(record);
  const counterpartyType = resolvePurchaseCounterpartyType(record);
  const isTechnicianInvoice =
    normalizePurchaseDocumentType(record.document_type) === "INVOICE" && counterpartyType === "TECHNICIAN";

  return {
    DocumentoERPId: record.id,
    TipoDocumento: normalizePurchaseDocumentType(record.document_type) === "INVOICE"
      ? (isTechnicianInvoice ? "Factura Compra Tecnico" : "Factura Compra Proveedor")
      : "Ticket",
    TipoTerceroCompra: counterpartyType === "TECHNICIAN"
      ? "Tecnico"
      : counterpartyType === "SUPPLIER"
      ? "Proveedor"
      : "Beneficiario",
    RequiereRevisionIRPF: isTechnicianInvoice ? "Si" : "No",
    NumeroDocumento: record.internal_purchase_number || record.invoice_number || record.id,
    FechaDocumento: issueDate,
    MesFiscal: month,
    AnoFiscal: year,
    Proveedor: counterpartyType !== "BENEFICIARY" ? counterparty || null : null,
    Beneficiario: normalizePurchaseDocumentType(record.document_type) === "EXPENSE" ? counterparty || null : null,
    CategoriaGasto: record.expense_category || null,
    Proyecto: projectSegment || null,
    EstadoERP: mapPurchaseStatus(record.status),
    ArchivadoPor: archivedByEmail,
    ArchivadoEn: new Date().toISOString(),
    HashPDF: `sha256:${hash}`,
  };
}

function buildRecordHash(input: Record<string, string | null | undefined>) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

async function getGraphToken(env: EnvMap): Promise<string> {
  const tokenUrl = env.MS_GRAPH_TOKEN_URL
    || `https://login.microsoftonline.com/${required(env, "MS_TENANT_ID")}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: required(env, "MS_GRAPH_CLIENT_ID"),
      client_secret: required(env, "MS_GRAPH_CLIENT_SECRET"),
      scope: required(env, "MS_GRAPH_SCOPE"),
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error(`Graph token request failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as GraphTokenResponse;
  return data.access_token;
}

async function graphFetch(token: string, graphPath: string, init?: RequestInit) {
  return fetch(`https://graph.microsoft.com/v1.0${graphPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
}

async function getPurchasesDriveId(env: EnvMap, token: string): Promise<string> {
  const configuredDriveId = env.MS_SHAREPOINT_COMPRAS_DRIVE_ID || env.MS_SHAREPOINT_PURCHASES_DRIVE_ID;
  if (configuredDriveId) {
    return configuredDriveId;
  }

  const siteId = required(env, "MS_SHAREPOINT_SITE_ID");
  const response = await graphFetch(token, `/sites/${siteId}/drives?$select=id,name`);
  if (!response.ok) {
    throw new Error(`Could not resolve Compras drive id: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json() as { value?: Array<{ id?: string; name?: string }> };
  const comprasDrive = payload.value?.find((drive) => (drive.name || "").trim().toLowerCase() === "compras");
  if (!comprasDrive?.id) {
    throw new Error("SharePoint library 'Compras' was not found on the configured site");
  }

  return comprasDrive.id;
}

async function ensureDriveFolderPath(token: string, driveId: string, folderPath: string) {
  const segments = folderPath
    .split("/")
    .map((segment) => sanitizeSegment(segment))
    .filter(Boolean);

  let currentPath = "";

  for (const segment of segments) {
    const parentPath = currentPath;
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    const existingResponse = await graphFetch(token, `/drives/${driveId}/root:/${encodeURI(currentPath)}`);

    if (existingResponse.ok) continue;
    if (existingResponse.status !== 404) {
      throw new Error(`Graph folder lookup failed: ${existingResponse.status} ${await existingResponse.text()}`);
    }

    const parentEndpoint = parentPath
      ? `/drives/${driveId}/root:/${encodeURI(parentPath)}:/children`
      : `/drives/${driveId}/root/children`;

    const createResponse = await graphFetch(token, parentEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: segment,
        folder: {},
        "@microsoft.graph.conflictBehavior": "replace",
      }),
    });

    if (!createResponse.ok && createResponse.status !== 409) {
      throw new Error(`Graph folder create failed on segment "${segment}" (path: "${currentPath}"): ${createResponse.status} ${await createResponse.text()}`);
    }
  }
}

async function uploadFileToSharePoint(
  token: string,
  driveId: string,
  folderPath: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string,
) {
  await ensureDriveFolderPath(token, driveId, folderPath);
  const encodedPath = encodeURI(`${folderPath}/${fileName}`);

  const response = await graphFetch(token, `/drives/${driveId}/root:/${encodedPath}:/content`, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: new Uint8Array(fileBuffer),
  });

  if (!response.ok) {
    throw new Error(`Graph upload failed: ${response.status} ${await response.text()}`);
  }

  return await response.json();
}

async function patchSharePointMetadata(
  token: string,
  driveId: string,
  itemId: string,
  metadata: Record<string, string | null>,
) {
  const response = await graphFetch(token, `/drives/${driveId}/items/${itemId}/listItem/fields`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    throw new Error(`Graph metadata patch failed: ${response.status} ${await response.text()}`);
  }
}

async function getCandidates(client: any, options: SyncOptions): Promise<PurchaseRecord[]> {
  const pageSize = Math.min(options.limit, 5000);
  const rows: any[] = [];
  let page = 1;

  while (rows.length < options.limit) {
    const params: Record<string, unknown> = {
      p_search: null,
      p_status: null,
      p_supplier_id: null,
      p_technician_id: null,
      p_project_id: null,
      p_page: page,
      p_page_size: pageSize,
      p_document_type:
        options.target === "invoices"
          ? "INVOICE"
          : options.target === "tickets"
          ? "EXPENSE"
          : null,
    };

    const { data, error } = await (client.rpc as any)("list_purchase_invoices", params);
    if (error) throw error;

    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);

    if (batch.length < pageSize || options.invoiceId) {
      break;
    }

    page += 1;
  }

  const detailRows: PurchaseRecord[] = [];

  for (const row of rows) {
    if (options.invoiceId && row.id !== options.invoiceId) {
      continue;
    }

    if (!row.status || !PURCHASE_ARCHIVABLE_STATUSES.has(row.status) || !row.file_path || row.sharepoint_item_id) {
      continue;
    }

    const { data: detailData, error: detailError } = await (client.rpc as any)("get_purchase_invoice", {
      p_invoice_id: row.id,
    });

    if (detailError) throw detailError;

    const detail = Array.isArray(detailData) ? detailData[0] : null;
    if (!detail) {
      continue;
    }

    detailRows.push({
      id: detail.id,
      invoice_number: detail.invoice_number ?? null,
      internal_purchase_number: detail.internal_purchase_number ?? null,
      supplier_invoice_number: detail.supplier_invoice_number ?? null,
      document_type: detail.document_type ?? null,
      issue_date: detail.issue_date ?? null,
      status: detail.status ?? null,
      supplier_id: detail.supplier_id ?? null,
      technician_id: detail.technician_id ?? null,
      supplier_name: detail.supplier_name ?? null,
      technician_name: detail.technician_name ?? null,
      manual_beneficiary_name: detail.manual_beneficiary_name ?? null,
      expense_category: detail.expense_category ?? null,
      project_id: detail.project_id ?? null,
      project_name: detail.project_name ?? null,
      project_number: detail.project_number ?? null,
      site_id: detail.site_id ?? null,
      site_name: detail.site_name ?? null,
      file_path: detail.file_path ?? null,
      file_name: detail.file_name ?? null,
      sharepoint_item_id: row.sharepoint_item_id ?? null,
      archived_pdf_path: null,
    });
  }

  return detailRows;
}

async function syncPurchaseRecord(
  client: any,
  env: EnvMap,
  graphToken: string,
  archivedByEmail: string,
  record: PurchaseRecord,
  dryRun: boolean,
): Promise<UploadSummary> {
  if (!record.file_path) {
    throw new Error(`Purchase ${record.id} has no source file`);
  }

  const driveId = await getPurchasesDriveId(env, graphToken);
  const siteId = required(env, "MS_SHAREPOINT_SITE_ID");
  const fileName = buildPurchaseArchiveFileName(record);
  const { primaryFolderPath, mirrorFolderPaths } = buildPurchasePaths(record);
  const contentType = inferContentType(fileName);

  const { data: sourceBlob, error: downloadError } = await client.storage
    .from("purchase-documents")
    .download(record.file_path);

  if (downloadError || !sourceBlob) {
    throw new Error(`Could not download source file for ${record.id}: ${downloadError?.message || "unknown error"}`);
  }

  const fileBuffer = Buffer.from(await sourceBlob.arrayBuffer());
  const pdfHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const recordHash = buildRecordHash({
    type: normalizePurchaseDocumentType(record.document_type),
    documentId: record.id,
    number: record.internal_purchase_number || record.invoice_number,
    issueDate: record.issue_date,
    fileName,
    primaryFolderPath,
    hash: `sha256:${pdfHash}`,
  });

  if (dryRun) {
    return {
      documentType: normalizePurchaseDocumentType(record.document_type),
      documentId: record.id,
      number: record.internal_purchase_number || record.invoice_number,
      fileName,
      primaryFolderPath,
      mirrorFolderPaths,
      pdfHash: `sha256:${pdfHash}`,
      recordHash: `sha256:${recordHash}`,
    };
  }

  let primaryItem: any = null;
  const metadata = buildPurchaseMetadata(record, archivedByEmail, pdfHash);

  for (const targetPath of [primaryFolderPath, ...mirrorFolderPaths]) {
    const item = await uploadFileToSharePoint(graphToken, driveId, targetPath, fileName, fileBuffer, contentType);
    if (!primaryItem) primaryItem = item;

    if (item.id) {
      try {
        await patchSharePointMetadata(graphToken, driveId, item.id, metadata);
      } catch (metadataError) {
        console.warn(`Metadata patch failed for purchase ${record.id}:`, metadataError);
      }
    }
  }

  if (!primaryItem?.id) {
    throw new Error(`SharePoint did not return primary item for ${record.id}`);
  }

  const persistArgs = {
    p_invoice_id: record.id,
    p_sharepoint_site_id: siteId,
    p_sharepoint_drive_id: driveId,
    p_sharepoint_item_id: primaryItem.id,
    p_sharepoint_web_url: primaryItem.webUrl ?? null,
    p_sharepoint_etag: primaryItem.eTag ?? null,
    p_archived_pdf_path: `${primaryFolderPath}/${fileName}`,
    p_archived_pdf_file_name: fileName,
    p_archived_pdf_hash: `sha256:${pdfHash}`,
    p_archived_record_hash: `sha256:${recordHash}`,
  };

  let persistResult = await (client.rpc as any)("sync_set_purchase_invoice_archive_metadata", persistArgs);
  if (persistResult.error?.message?.includes("Could not find the function")) {
    persistResult = await (client.rpc as any)("set_purchase_invoice_archive_metadata", persistArgs);
  }
  if (persistResult.error) throw persistResult.error;

  return {
    documentType: normalizePurchaseDocumentType(record.document_type),
    documentId: record.id,
    number: record.internal_purchase_number || record.invoice_number,
    fileName,
    primaryFolderPath,
    mirrorFolderPaths,
    sharepointItemId: primaryItem.id,
    pdfHash: `sha256:${pdfHash}`,
    recordHash: `sha256:${recordHash}`,
  };
}

async function main() {
  const env = readEnvFile();
  const options = parseOptions();

  const supabaseUrl = required(env, "VITE_SUPABASE_URL");
  const serviceRoleKey = required(env, "SUPABASE_SECRET_KEY");
  const archivedByEmail =
    env.SHAREPOINT_ARCHIVE_ACTOR_EMAIL ||
    env.SUPABASE_ARCHIVE_ACTOR_EMAIL ||
    env.MS_NOTIFICATION_EMAIL ||
    "nexo@local";

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
  });

  const graphToken = await getGraphToken(env);
  const candidates = await getCandidates(client, options);
  const summary: UploadSummary[] = [];
  const errors: Array<{ id: string; number: string | null; error: string }> = [];

  for (const candidate of candidates) {
    try {
      const result = await syncPurchaseRecord(client, env, graphToken, archivedByEmail, candidate, options.dryRun);
      summary.push(result);
      console.error(`[OK] ${result.number || candidate.id} → ${result.primaryFolderPath}/${result.fileName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ id: candidate.id, number: candidate.internal_purchase_number || candidate.invoice_number, error: message });
      console.error(`[ERROR] ${candidate.internal_purchase_number || candidate.invoice_number || candidate.id}: ${message}`);
    }
  }

  console.log(JSON.stringify({
    dryRun: options.dryRun,
    syncedCount: summary.length,
    errorCount: errors.length,
    summary,
    errors,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
