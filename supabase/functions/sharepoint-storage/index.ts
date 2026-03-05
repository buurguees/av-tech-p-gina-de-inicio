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

type RequestBody =
  | UploadSalesPdfRequest
  | DownloadSalesFileRequest
  | BuildSalesPathsRequest
  | GetSalesMetadataRequest
  | PersistSalesMetadataRequest;

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

async function getExpectedArchivedPath(
  req: Request,
  body: DownloadSalesFileRequest,
): Promise<string | null> {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const anonKey = getRequiredEnv("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    throw new Error("No authorization header");
  }

  const supabaseClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

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

      const supabaseAdmin = createClient(supabaseUrl, getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
        auth: { autoRefreshToken: false, persistSession: false },
      });

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

async function uploadPdfToDrive(
  token: string,
  driveId: string,
  folderPath: string,
  fileName: string,
  fileBytes: Uint8Array,
) {
  await ensureDriveFolderPath(token, driveId, folderPath);
  const encodedPath = encodeURI(`${folderPath}/${fileName}`);
  const response = await graphFetch(token, `/drives/${driveId}/root:/${encodedPath}:/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
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

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await getAuthorizedUser(req);

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
      const supabaseUrl = getRequiredEnv("SUPABASE_URL");
      const anonKey = getRequiredEnv("SUPABASE_ANON_KEY");
      const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new HttpError(401, "Unauthorized");
      }

      const supabaseClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

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

    const graphToken = await getGraphAccessToken();
    const driveId = getRequiredEnv("MS_SHAREPOINT_VENTAS_DRIVE_ID");

    if (body.action === "download-sales-file") {
      if (!isSafeArchivedPdfPath(body.filePath)) {
        throw new HttpError(400, "Invalid archived file path");
      }

      const expectedPath = await getExpectedArchivedPath(req, body);
      if (!expectedPath || expectedPath !== body.filePath) {
        throw new HttpError(403, "Access denied");
      }

      const encodedPath = encodeURI(body.filePath);
      const response = await graphFetch(graphToken, `/drives/${driveId}/root:/${encodedPath}:/content`);

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

    if (body.action === "upload-sales-pdf") {
      const fileBytes = Uint8Array.from(atob(body.pdfBase64), (char) => char.charCodeAt(0));
      const uploadTargets = [body.primaryFolderPath, ...(body.mirrorFolderPaths || [])];
      const uploadedItems: Array<Record<string, unknown>> = [];
      const siteId = getRequiredEnv("MS_SHAREPOINT_SITE_ID");

      for (const targetPath of uploadTargets) {
        const item = await uploadPdfToDrive(graphToken, driveId, targetPath, body.fileName, fileBytes);

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
