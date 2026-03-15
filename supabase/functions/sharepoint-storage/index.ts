import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://avtechesdeveniments.com",
  "https://www.avtechesdeveniments.com",
  "https://avtech-305e7.web.app",
  "https://avtech-305e7.firebaseapp.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
];

const LOVABLE_PATTERN = /^https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com)$/;
const PURCHASE_ARCHIVABLE_STATUSES = new Set(["APPROVED", "PARTIAL", "PAID", "CANCELLED", "BLOCKED"]);

type AuthorizedUser = {
  id: string;
  email: string;
};

type GraphToken = {
  access_token: string;
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type UploadSalesPdfRequest = {
  action: "upload-sales-pdf";
  fileName: string;
  pdfBase64: string;
  primaryFolderPath: string;
  mirrorFolderPaths?: string[];
  metadata?: Record<string, string | number | boolean | null>;
};

type DownloadSalesFileRequest = {
  action: "download-sales-file";
  documentType: "invoice" | "quote";
  documentId: string;
  filePath: string;
};

type BuildSalesPathsRequest = {
  action: "build-sales-paths";
  documentType: "invoice" | "quote";
  issueDate: string;
};

type GetSalesMetadataRequest = {
  action: "get-sales-metadata";
  documentType: "invoice" | "quote";
  documentId: string;
};

type PersistSalesMetadataRequest = {
  action: "persist-sales-metadata";
  documentType: "invoice" | "quote";
  documentId: string;
  sharepointSiteId: string;
  sharepointDriveId: string;
  sharepointItemId: string;
  sharepointWebUrl?: string | null;
  sharepointETag?: string | null;
  archivedPdfPath: string;
  archivedPdfFileName: string;
  archivedPdfHash: string;
  archivedRecordHash: string;
};

type PurchaseDocumentType = "INVOICE" | "EXPENSE";

type PurchaseArchiveRecord = {
  id: string;
  invoice_number: string | null;
  internal_purchase_number: string | null;
  document_type: string | null;
  status: string | null;
  issue_date: string | null;
  supplier_name: string | null;
  technician_name: string | null;
  manual_beneficiary_name: string | null;
  expense_category: string | null;
  project_name: string | null;
  project_number: string | null;
  site_name: string | null;
  site_city: string | null;
  file_path: string | null;
  file_name: string | null;
};

type GetPurchaseMetadataRequest = {
  action: "get-purchase-metadata";
  documentId: string;
};

type DownloadPurchaseFileRequest = {
  action: "download-purchase-file";
  documentId: string;
  filePath: string;
};

type ArchivePurchaseDocumentRequest = {
  action: "archive-purchase-document";
  documentId: string;
};

type RequestBody =
  | UploadSalesPdfRequest
  | DownloadSalesFileRequest
  | BuildSalesPathsRequest
  | GetSalesMetadataRequest
  | PersistSalesMetadataRequest
  | GetPurchaseMetadataRequest
  | DownloadPurchaseFileRequest
  | ArchivePurchaseDocumentRequest;

function getCorsHeaders(origin: string | null): Record<string, string> {
  let allowedOrigin = ALLOWED_ORIGINS[0];

  if (origin) {
    const normalizedOrigin = origin.toLowerCase();
    const matchedOrigin = ALLOWED_ORIGINS.find((item) => item.toLowerCase() === normalizedOrigin);

    if (matchedOrigin) {
      allowedOrigin = origin;
    } else if (LOVABLE_PATTERN.test(origin)) {
      allowedOrigin = origin;
    }
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

function jsonResponse(
  corsHeaders: Record<string, string>,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing env var ${name}`);
  }
  return value;
}

function sanitizeSegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*#%&{}~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSalesPaths(
  documentType: "invoice" | "quote",
  issueDate: string,
) {
  const year = issueDate.slice(0, 4);
  const month = issueDate.slice(0, 7);
  const baseFolder = documentType === "invoice" ? "Facturas Emitidas" : "Presupuestos Emitidos";
  const primaryFolderPath = `${baseFolder}/${year}/${month}`;
  return { primaryFolderPath, mirrorFolderPaths: [] };
}

async function getPurchasesDriveId(token: string): Promise<string> {
  const configuredDriveId =
    Deno.env.get("MS_SHAREPOINT_COMPRAS_DRIVE_ID") ||
    Deno.env.get("MS_SHAREPOINT_PURCHASES_DRIVE_ID");

  if (configuredDriveId) {
    return configuredDriveId;
  }

  const siteId = getRequiredEnv("MS_SHAREPOINT_SITE_ID");
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

function getFileExtension(fileName: string | null | undefined, filePath: string | null | undefined): string {
  const source = fileName || filePath || "";
  const basename = source.split("/").at(-1) || source;
  const dotIndex = basename.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === basename.length - 1) {
    return ".pdf";
  }

  return basename.slice(dotIndex).toLowerCase();
}

function inferContentType(fileName: string): string {
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

function normalizePurchaseDocumentType(value: string | null | undefined): PurchaseDocumentType {
  return value === "INVOICE" ? "INVOICE" : "EXPENSE";
}

function resolvePurchaseCounterpartyType(record: PurchaseArchiveRecord): "SUPPLIER" | "TECHNICIAN" | "BENEFICIARY" {
  if (record.technician_name) {
    return "TECHNICIAN";
  }

  if (record.supplier_name) {
    return "SUPPLIER";
  }

  return "BENEFICIARY";
}

function resolvePurchaseCounterpartyName(record: PurchaseArchiveRecord): string {
  const raw =
    record.supplier_name ||
    record.technician_name ||
    record.manual_beneficiary_name ||
    "";
  return sanitizeSegment(raw) || "";
}

function buildPurchaseProjectSegment(record: PurchaseArchiveRecord): string {
  return sanitizeSegment(
    [record.project_number, record.project_name, record.site_name]
      .filter(Boolean)
      .join(" - "),
  );
}

function buildPurchasePaths(record: PurchaseArchiveRecord) {
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

function buildPurchaseArchiveFileName(record: PurchaseArchiveRecord): string {
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

function buildPurchaseMetadata(record: PurchaseArchiveRecord, archivedByEmail: string, hash: string) {
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
    Proveedor: counterparty || null,
    Beneficiario: normalizePurchaseDocumentType(record.document_type) === "EXPENSE" ? counterparty || null : null,
    CategoriaGasto: record.expense_category || null,
    Proyecto: projectSegment || null,
    EstadoERP: mapPurchaseStatus(record.status),
    ArchivadoPor: archivedByEmail,
    ArchivadoEn: new Date().toISOString(),
    HashPDF: `sha256:${hash}`,
  };
}

async function getAuthorizedUser(req: Request): Promise<AuthorizedUser> {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    throw new Error("No authorization header");
  }

  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    throw new Error("No authorization header");
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user: authUser },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !authUser) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabaseAdmin.rpc("get_authorized_user_by_auth_id", {
    p_auth_user_id: authUser.id,
  });

  if (!error && data && data.length > 0) {
    return { id: data[0].id, email: data[0].email };
  }

  // Fallback seguro: si el vínculo auth_user_id quedó desalineado tras
  // recrear usuario en Auth, permitimos recuperar el usuario autorizado por email.
  const authEmail = authUser.email?.trim().toLowerCase();
  if (!authEmail) {
    throw new Error("User not authorized");
  }

  const { data: byEmailRows, error: byEmailError } = await supabaseAdmin
    .schema("internal")
    .from("authorized_users")
    .select("id, email, auth_user_id, is_active")
    .eq("is_active", true)
    .ilike("email", authEmail)
    .limit(1);

  if (
    byEmailError ||
    !Array.isArray(byEmailRows) ||
    byEmailRows.length === 0
  ) {
    throw new Error("User not authorized");
  }

  const authorizedByEmail = byEmailRows[0] as {
    id: string;
    email: string;
    auth_user_id?: string | null;
  };

  if (!authorizedByEmail.auth_user_id || authorizedByEmail.auth_user_id !== authUser.id) {
    const { error: relinkError } = await supabaseAdmin
      .schema("internal")
      .from("authorized_users")
      .update({ auth_user_id: authUser.id })
      .eq("id", authorizedByEmail.id);

    if (relinkError) {
      throw new Error("User not authorized");
    }
  }

  return { id: authorizedByEmail.id, email: authorizedByEmail.email };
}

function createUserScopedClient(req: Request) {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const anonKey = getRequiredEnv("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    throw new HttpError(401, "Unauthorized");
  }

  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function createAdminClient() {
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(
    getRequiredEnv("SUPABASE_URL"),
    serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
    },
  );
}

function isSafeArchivedPdfPath(filePath: string): boolean {
  if (!filePath || filePath.includes("..") || filePath.startsWith("/") || filePath.endsWith("/")) {
    return false;
  }

  const segments = filePath.split("/");
  if (segments.length < 4) {
    return false;
  }

  const [baseFolder, year, month, ...rest] = segments;
  if (!["Facturas Emitidas", "Presupuestos Emitidos"].includes(baseFolder)) {
    return false;
  }

  if (!/^\d{4}$/.test(year) || !/^\d{4}-\d{2}$/.test(month)) {
    return false;
  }

  return rest.every((segment) => segment.length > 0 && sanitizeSegment(segment) === segment) &&
    rest.at(-1)?.toLowerCase().endsWith(".pdf") === true;
}

function isSafeArchivedPurchasePath(filePath: string): boolean {
  if (!filePath || filePath.includes("..") || filePath.startsWith("/") || filePath.endsWith("/")) {
    return false;
  }

  return filePath
    .split("/")
    .every((segment) => segment.length > 0 && sanitizeSegment(segment) === segment);
}

async function getExpectedArchivedPath(
  req: Request,
  body: DownloadSalesFileRequest,
): Promise<string | null> {
  const supabaseClient = createUserScopedClient(req);

  const fetchArchiveMetadata = async (
    fn: "get_invoice_archive_metadata" | "sync_get_invoice_archive_metadata" | "get_quote_archive_metadata" | "sync_get_quote_archive_metadata",
    args: Record<string, unknown>,
  ) => {
    const { data, error } = await supabaseClient.rpc(fn, args);
    return { data, error };
  };

  if (body.documentType === "invoice") {
    let { data, error } = await fetchArchiveMetadata("get_invoice_archive_metadata", {
      p_invoice_id: body.documentId,
    });

    if (error?.message?.includes("Could not find the function public.get_invoice_archive_metadata")) {
      const fallback = await fetchArchiveMetadata("sync_get_invoice_archive_metadata", {
        p_invoice_id: body.documentId,
      });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw new Error("Access denied");
    }

    return Array.isArray(data) && data.length > 0 ? data[0].archived_pdf_path ?? null : null;
  }

  let { data, error } = await fetchArchiveMetadata("get_quote_archive_metadata", {
    p_quote_id: body.documentId,
  });

  if (error?.message?.includes("Could not find the function public.get_quote_archive_metadata")) {
    const fallback = await fetchArchiveMetadata("sync_get_quote_archive_metadata", {
      p_quote_id: body.documentId,
    });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    // Compat fallback: some environments miss sales.can_access_quote() dependency
    // used by get_quote_archive_metadata. In that case, verify quote access with
    // get_quote (user-scoped) and resolve canonical archive path with service-role.
    if (error.message?.includes("sales.can_access_quote")) {
      const { data: quoteData, error: quoteError } = await supabaseClient.rpc("get_quote", {
        p_quote_id: body.documentId,
      });

      if (quoteError || !Array.isArray(quoteData) || quoteData.length === 0) {
        throw new Error("Access denied");
      }

      const supabaseAdmin = createAdminClient();

      const { data: syncRows, error: syncError } = await supabaseAdmin.rpc("sync_list_quotes_for_archive", {
        p_limit: 1,
        p_quote_id: body.documentId,
      });

      if (syncError) {
        throw new Error("Access denied");
      }

      return Array.isArray(syncRows) && syncRows.length > 0 ? syncRows[0].archived_pdf_path ?? null : null;
    }

    throw new Error("Access denied");
  }

  return Array.isArray(data) && data.length > 0 ? data[0].archived_pdf_path ?? null : null;
}

async function getPurchaseRecordForUser(req: Request, documentId: string): Promise<PurchaseArchiveRecord> {
  const supabaseClient = createUserScopedClient(req);
  const { data, error } = await supabaseClient.rpc("get_purchase_invoice", {
    p_invoice_id: documentId,
  });

  if (error || !Array.isArray(data) || data.length === 0) {
    throw new HttpError(403, "Access denied");
  }

  return data[0] as PurchaseArchiveRecord;
}

async function getStoredPurchaseMetadata(documentId: string) {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .schema("sales")
    .from("purchase_invoices")
    .select("sharepoint_item_id, archived_pdf_path, archived_pdf_file_name, sharepoint_web_url")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "Could not resolve purchase archive metadata");
  }

  return data;
}

async function getExpectedPurchaseArchivedPath(req: Request, documentId: string): Promise<string | null> {
  await getPurchaseRecordForUser(req, documentId);
  const metadata = await getStoredPurchaseMetadata(documentId);
  return metadata?.archived_pdf_path ?? null;
}

async function getGraphAccessToken(): Promise<string> {
  // Backward-compatible fallback: if MS_GRAPH_TOKEN_URL is not configured
  // in Edge Function secrets, build it from MS_TENANT_ID.
  const tokenUrl =
    Deno.env.get("MS_GRAPH_TOKEN_URL") ||
    `https://login.microsoftonline.com/${getRequiredEnv("MS_TENANT_ID")}/oauth2/v2.0/token`;
  const tenantClientId = getRequiredEnv("MS_GRAPH_CLIENT_ID");
  const tenantClientSecret = getRequiredEnv("MS_GRAPH_CLIENT_SECRET");
  const scope = getRequiredEnv("MS_GRAPH_SCOPE");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: tenantClientId,
      client_secret: tenantClientSecret,
      scope,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error(`Graph token request failed with status ${response.status}`);
  }

  const data = (await response.json()) as GraphToken;
  return data.access_token;
}

async function graphFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
}

async function uploadFileToDrive(
  token: string,
  driveId: string,
  folderPath: string,
  fileName: string,
  fileBytes: Uint8Array,
  contentType: string,
) {
  await ensureDriveFolderPath(token, driveId, folderPath);
  const encodedPath = encodeURI(`${folderPath}/${fileName}`);
  const response = await graphFetch(token, `/drives/${driveId}/root:/${encodedPath}:/content`, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: fileBytes,
  });

  if (!response.ok) {
    throw new Error(`Graph upload failed with status ${response.status}`);
  }

  return await response.json();
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
    const encodedCurrentPath = encodeURI(currentPath);

    const existingResponse = await graphFetch(
      token,
      `/drives/${driveId}/root:/${encodedCurrentPath}`,
    );

    if (existingResponse.ok) {
      continue;
    }

    if (existingResponse.status !== 404) {
      throw new Error(`Graph folder lookup failed with status ${existingResponse.status}`);
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
      throw new Error(`Graph folder create failed with status ${createResponse.status}`);
    }
  }
}

async function patchDriveItemMetadata(
  token: string,
  driveId: string,
  itemId: string,
  metadata: Record<string, string | number | boolean | null>,
) {
  const response = await graphFetch(token, `/drives/${driveId}/items/${itemId}/listItem/fields`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    throw new Error(`Graph metadata update failed with status ${response.status}`);
  }

  return await response.json();
}

function hexFromBuffer(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: ArrayBuffer | string): Promise<string> {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  return hexFromBuffer(await crypto.subtle.digest("SHA-256", bytes));
}

async function persistSalesMetadata(
  body: PersistSalesMetadataRequest,
) {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const baseArgs = {
    p_sharepoint_site_id: body.sharepointSiteId || "",
    p_sharepoint_drive_id: body.sharepointDriveId || "",
    p_sharepoint_item_id: body.sharepointItemId,
    p_sharepoint_web_url: body.sharepointWebUrl ?? null,
    p_sharepoint_etag: body.sharepointETag ?? null,
    p_archived_pdf_path: body.archivedPdfPath,
    p_archived_pdf_file_name: body.archivedPdfFileName,
    p_archived_pdf_hash: body.archivedPdfHash,
    p_archived_record_hash: body.archivedRecordHash,
  };

  if (body.documentType === "invoice") {
    const sync = await supabaseAdmin.rpc("sync_set_invoice_archive_metadata", {
      p_invoice_id: body.documentId,
      ...baseArgs,
    });
    if (!sync.error) return;

    const fallback = await supabaseAdmin.rpc("set_invoice_archive_metadata", {
      p_invoice_id: body.documentId,
      ...baseArgs,
    });
    if (!fallback.error) return;

    throw new Error(sync.error.message || fallback.error.message || "Could not persist invoice archive metadata");
  }

  const sync = await supabaseAdmin.rpc("sync_set_quote_archive_metadata", {
    p_quote_id: body.documentId,
    ...baseArgs,
  });
  if (!sync.error) return;

  const fallback = await supabaseAdmin.rpc("set_quote_archive_metadata", {
    p_quote_id: body.documentId,
    ...baseArgs,
  });
  if (!fallback.error) return;

  throw new Error(sync.error.message || fallback.error.message || "Could not persist quote archive metadata");
}

async function archivePurchaseDocument(
  req: Request,
  authorizedUser: AuthorizedUser,
  documentId: string,
) {
  const record = await getPurchaseRecordForUser(req, documentId);
  const status = record.status || "";

  if (!PURCHASE_ARCHIVABLE_STATUSES.has(status)) {
    throw new HttpError(409, `Solo se puede archivar una compra aprobada o cerrada. Estado actual: ${status || "UNKNOWN"}`);
  }

  if (!record.file_path) {
    throw new HttpError(409, "La compra no tiene fichero fuente en purchase-documents");
  }

  const supabaseAdmin = createAdminClient();
  const { data: sourceBlob, error: downloadError } = await supabaseAdmin.storage
    .from("purchase-documents")
    .download(record.file_path);

  if (downloadError || !sourceBlob) {
    throw new HttpError(404, "No se pudo leer el documento fuente desde purchase-documents");
  }

  const fileBuffer = await sourceBlob.arrayBuffer();
  if (fileBuffer.byteLength === 0) {
    throw new HttpError(409, "El documento fuente esta vacio");
  }

  const fileName = buildPurchaseArchiveFileName(record);
  const { primaryFolderPath, mirrorFolderPaths } = buildPurchasePaths(record);
  const contentType = inferContentType(fileName);
  const fileBytes = new Uint8Array(fileBuffer);
  const pdfHash = await sha256Hex(fileBuffer);
  const recordHash = await sha256Hex(JSON.stringify({
    type: normalizePurchaseDocumentType(record.document_type),
    documentId: record.id,
    number: record.internal_purchase_number || record.invoice_number,
    issueDate: record.issue_date,
    fileName,
    primaryFolderPath,
    hash: `sha256:${pdfHash}`,
  }));

  const graphToken = await getGraphAccessToken();
  const driveId = await getPurchasesDriveId(graphToken);
  const siteId = getRequiredEnv("MS_SHAREPOINT_SITE_ID");
  const metadata = buildPurchaseMetadata(record, authorizedUser.email, pdfHash);
  let primaryItem: any = null;

  for (const targetPath of [primaryFolderPath, ...mirrorFolderPaths]) {
    const item = await uploadFileToDrive(graphToken, driveId, targetPath, fileName, fileBytes, contentType);

    if (!primaryItem) {
      primaryItem = item;
    }

    if (item.id) {
      try {
        await patchDriveItemMetadata(graphToken, driveId, item.id, metadata);
      } catch (metadataError) {
        console.warn("SharePoint purchase metadata patch skipped:", metadataError);
      }
    }
  }

  if (!primaryItem?.id) {
    throw new HttpError(502, "SharePoint no devolvio la referencia del archivo principal");
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

  const syncPersist = await supabaseAdmin.rpc("sync_set_purchase_invoice_archive_metadata", persistArgs);
  if (syncPersist.error && !syncPersist.error.message?.includes("Could not find the function")) {
    throw new HttpError(500, syncPersist.error.message || "No se pudo persistir la metadata documental de compras");
  }

  if (syncPersist.error) {
    const persist = await supabaseAdmin.rpc("set_purchase_invoice_archive_metadata", persistArgs);
    if (persist.error) {
      throw new HttpError(500, persist.error.message || "No se pudo persistir la metadata documental de compras");
    }
  }

  return {
    path: `${primaryFolderPath}/${fileName}`,
    fileName,
    sharepointItemId: primaryItem.id,
    sharepointWebUrl: primaryItem.webUrl ?? null,
    pdfHash: `sha256:${pdfHash}`,
    recordHash: `sha256:${recordHash}`,
    mirrorCount: mirrorFolderPaths.length,
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authorizedUser = await getAuthorizedUser(req);

    const body = (await req.json()) as RequestBody;

    if (body.action === "build-sales-paths") {
      return jsonResponse(corsHeaders, buildSalesPaths(
        body.documentType,
        body.issueDate,
      ));
    }

    if (body.action === "persist-sales-metadata") {
      await persistSalesMetadata(body);
      return jsonResponse(corsHeaders, { ok: true }, 200);
    }

    if (body.action === "get-sales-metadata") {
      const supabaseClient = createUserScopedClient(req);
      const supabaseAdmin = createAdminClient();

      if (body.documentType === "quote") {
        const { data: quoteData, error: quoteError } = await supabaseClient.rpc("get_quote", {
          p_quote_id: body.documentId,
        });

        if (quoteError || !Array.isArray(quoteData) || quoteData.length === 0) {
          throw new HttpError(403, "Access denied");
        }

        const { data: syncRows, error: syncError } = await supabaseAdmin.rpc("sync_list_quotes_for_archive", {
          p_limit: 1,
          p_quote_id: body.documentId,
        });

        if (syncError) {
          throw new HttpError(500, "Could not resolve quote archive metadata");
        }

        const row = Array.isArray(syncRows) && syncRows.length > 0 ? syncRows[0] : null;
        const archivedPdfPath = row?.archived_pdf_path ?? null;
        const archivedPdfFileName = archivedPdfPath ? archivedPdfPath.split("/").at(-1) ?? null : null;

        return jsonResponse(corsHeaders, {
          archivedPdfPath,
          archivedPdfFileName,
          sharepointItemId: row?.sharepoint_item_id ?? null,
        }, 200);
      }

      const { data: invoiceData, error: invoiceError } = await supabaseClient.rpc("finance_get_invoice", {
        p_invoice_id: body.documentId,
      });

      if (invoiceError || !Array.isArray(invoiceData) || invoiceData.length === 0) {
        throw new HttpError(403, "Access denied");
      }

      const { data: syncRows, error: syncError } = await supabaseAdmin.rpc("sync_list_invoices_for_archive", {
        p_limit: 1,
        p_invoice_id: body.documentId,
      });

      if (syncError) {
        throw new HttpError(500, "Could not resolve invoice archive metadata");
      }

      const row = Array.isArray(syncRows) && syncRows.length > 0 ? syncRows[0] : null;
      const archivedPdfPath = row?.archived_pdf_path ?? null;
      const archivedPdfFileName = archivedPdfPath ? archivedPdfPath.split("/").at(-1) ?? null : null;

      return jsonResponse(corsHeaders, {
        archivedPdfPath,
        archivedPdfFileName,
        sharepointItemId: row?.sharepoint_item_id ?? null,
      }, 200);
    }

    if (body.action === "get-purchase-metadata") {
      await getPurchaseRecordForUser(req, body.documentId);
      const metadata = await getStoredPurchaseMetadata(body.documentId);

      return jsonResponse(corsHeaders, {
        archivedFilePath: metadata?.archived_pdf_path ?? null,
        archivedFileName: metadata?.archived_pdf_file_name ?? null,
        sharepointItemId: metadata?.sharepoint_item_id ?? null,
        sharepointWebUrl: metadata?.sharepoint_web_url ?? null,
      }, 200);
    }

    if (body.action === "archive-purchase-document") {
      const result = await archivePurchaseDocument(req, authorizedUser, body.documentId);
      return jsonResponse(corsHeaders, result, 201);
    }

    if (body.action === "download-sales-file") {
      if (!isSafeArchivedPdfPath(body.filePath)) {
        throw new HttpError(400, "Invalid archived file path");
      }

      const expectedPath = await getExpectedArchivedPath(req, body);
      if (!expectedPath || expectedPath !== body.filePath) {
        throw new HttpError(403, "Access denied");
      }

      const encodedPath = encodeURI(body.filePath);
      const response = await graphFetch(
        await getGraphAccessToken(),
        `/drives/${getRequiredEnv("MS_SHAREPOINT_VENTAS_DRIVE_ID")}/root:/${encodedPath}:/content`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new HttpError(404, "Archived file not found in SharePoint");
        }
        throw new HttpError(502, `Graph download failed with status ${response.status}`);
      }

      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": response.headers.get("Content-Type") || "application/pdf",
          "Cache-Control": "private, max-age=60",
        },
      });
    }

    if (body.action === "download-purchase-file") {
      if (!isSafeArchivedPurchasePath(body.filePath)) {
        throw new HttpError(400, "Invalid archived file path");
      }

      const expectedPath = await getExpectedPurchaseArchivedPath(req, body.documentId);
      if (!expectedPath || expectedPath !== body.filePath) {
        throw new HttpError(403, "Access denied");
      }

      const graphToken = await getGraphAccessToken();
      const driveId = await getPurchasesDriveId(graphToken);
      const response = await graphFetch(
        graphToken,
        `/drives/${driveId}/root:/${encodeURI(body.filePath)}:/content`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new HttpError(404, "Archived purchase file not found in SharePoint");
        }
        throw new HttpError(502, `Graph download failed with status ${response.status}`);
      }

      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": response.headers.get("Content-Type") || inferContentType(body.filePath),
          "Cache-Control": "private, max-age=60",
        },
      });
    }

    if (body.action === "upload-sales-pdf") {
      const graphToken = await getGraphAccessToken();
      const driveId = getRequiredEnv("MS_SHAREPOINT_VENTAS_DRIVE_ID");
      const fileBytes = Uint8Array.from(atob(body.pdfBase64), (char) => char.charCodeAt(0));
      const uploadTargets = [body.primaryFolderPath, ...(body.mirrorFolderPaths || [])];
      const uploadedItems: Array<Record<string, unknown>> = [];
      const siteId = getRequiredEnv("MS_SHAREPOINT_SITE_ID");

      for (const targetPath of uploadTargets) {
        const item = await uploadFileToDrive(graphToken, driveId, targetPath, body.fileName, fileBytes, "application/pdf");

        if (body.metadata && item.id) {
          try {
            await patchDriveItemMetadata(graphToken, driveId, item.id, body.metadata);
          } catch (metadataError) {
            console.warn("SharePoint metadata patch skipped:", metadataError);
          }
        }

        uploadedItems.push({
          id: item.id,
          name: item.name,
          path: `${targetPath}/${body.fileName}`,
          webUrl: item.webUrl ?? null,
          eTag: item.eTag ?? null,
          driveId,
          siteId,
        });
      }

      return jsonResponse(corsHeaders, { uploadedItems }, 201);
    }

    return jsonResponse(corsHeaders, { error: "Unsupported action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("sharepoint-storage error:", message);
    const status = error instanceof HttpError
      ? error.status
      : message === "Unauthorized" || message === "No authorization header"
        ? 401
        : message === "Access denied"
          ? 403
          : 500;
    return jsonResponse(corsHeaders, { error: message }, status);
  }
});
