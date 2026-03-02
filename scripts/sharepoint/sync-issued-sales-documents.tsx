import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { InvoicePDFDocument, QuotePDFDocument } from "../../src/pages/nexo_av/assets/plantillas";

type EnvMap = Record<string, string>;

type GraphTokenResponse = {
  access_token: string;
};

type SyncTarget = "invoices" | "quotes" | "all";

type SyncOptions = {
  target: SyncTarget;
  limit: number;
  invoiceId?: string;
  quoteId?: string;
};

type InvoiceListRow = {
  id: string;
  status: string;
  invoice_number: string | null;
  preliminary_number: string | null;
  issue_date: string | null;
  sharepoint_item_id: string | null;
};

type QuoteListRow = {
  id: string;
  status: string;
  quote_number: string;
  issue_date: string | null;
  sharepoint_item_id: string | null;
};

type InvoiceDetail = {
  id: string;
  invoice_number: string | null;
  preliminary_number: string | null;
  client_id: string;
  client_name: string;
  project_id: string | null;
  project_name: string | null;
  project_number: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  status: string;
};

type QuoteDetail = {
  id: string;
  quote_number: string;
  client_id: string;
  client_name: string;
  project_id: string | null;
  project_name: string | null;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  total: number;
  issue_date: string | null;
  valid_until: string | null;
  created_at: string;
  notes: string | null;
  status: string;
};

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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*#%&{}~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseOptions(): SyncOptions {
  const args = process.argv.slice(2);
  const options: SyncOptions = {
    target: "all",
    limit: 50,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--invoices") options.target = "invoices";
    if (arg === "--quotes") options.target = "quotes";
    if (arg === "--all") options.target = "all";
    if (arg === "--limit" && next) {
      options.limit = Number.parseInt(next, 10);
      index += 1;
    }
    if (arg === "--invoice-id" && next) {
      options.invoiceId = next;
      options.target = "invoices";
      index += 1;
    }
    if (arg === "--quote-id" && next) {
      options.quoteId = next;
      options.target = "quotes";
      index += 1;
    }
  }

  return options;
}

function buildSalesFolder(documentType: "invoice" | "quote", issueDate: string): string {
  const year = issueDate.slice(0, 4);
  const month = issueDate.slice(0, 7);
  const baseFolder = documentType === "invoice" ? "Facturas Emitidas" : "Presupuestos Emitidos";
  return `${baseFolder}/${year}/${month}`;
}

function buildInvoiceFileName(invoice: InvoiceDetail): string {
  const displayNumber = invoice.invoice_number || invoice.preliminary_number || invoice.id;
  return `${sanitizeSegment(displayNumber)} - ${sanitizeSegment(invoice.client_name || "SIN_CLIENTE")} - ${invoice.issue_date}.pdf`;
}

function buildQuoteFileName(quote: QuoteDetail): string {
  const issueDate = quote.issue_date || quote.created_at.slice(0, 10);
  return `${sanitizeSegment(quote.quote_number)} - ${sanitizeSegment(quote.client_name || "SIN_CLIENTE")} - ${issueDate}.pdf`;
}

function buildRecordHash(input: Record<string, string | null | undefined>) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

async function renderPdfToBuffer(documentNode: React.ReactElement): Promise<Buffer> {
  const rendered = await pdf(documentNode).toBuffer();

  if (Buffer.isBuffer(rendered)) {
    return rendered;
  }

  if (rendered instanceof Uint8Array) {
    return Buffer.from(rendered);
  }

  if (rendered && typeof (rendered as any).on === "function") {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      (rendered as any).on("data", (chunk: Buffer | Uint8Array | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      (rendered as any).on("end", resolve);
      (rendered as any).on("error", reject);
    });
    return Buffer.concat(chunks);
  }

  throw new Error("No se pudo convertir el PDF renderizado a Buffer");
}

async function getGraphToken(env: EnvMap): Promise<string> {
  const response = await fetch(required(env, "MS_GRAPH_TOKEN_URL"), {
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

    if (existingResponse.ok) {
      continue;
    }

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
      throw new Error(`Graph folder create failed: ${createResponse.status} ${await createResponse.text()}`);
    }
  }
}

async function uploadPdfToSharePoint(
  token: string,
  driveId: string,
  folderPath: string,
  fileName: string,
  pdfBuffer: Buffer,
) {
  await ensureDriveFolderPath(token, driveId, folderPath);
  const encodedPath = encodeURI(`${folderPath}/${fileName}`);

  const response = await graphFetch(token, `/drives/${driveId}/root:/${encodedPath}:/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: pdfBuffer,
  });

  if (!response.ok) {
    throw new Error(`Graph upload failed: ${response.status} ${await response.text()}`);
  }

  return await response.json();
}

async function patchSalesMetadata(
  token: string,
  driveId: string,
  itemId: string,
  metadata: Record<string, string>,
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

async function getInvoiceCandidates(readClient: ReturnType<typeof createClient>, options: SyncOptions) {
  const { data, error } = await readClient.rpc("sync_list_invoices_for_archive", {
    p_limit: options.limit,
    p_invoice_id: options.invoiceId ?? null,
  });
  if (error) throw error;

  return (data || []) as InvoiceListRow[];
}

async function getQuoteCandidates(readClient: ReturnType<typeof createClient>, options: SyncOptions) {
  const { data, error } = await readClient.rpc("sync_list_quotes_for_archive", {
    p_limit: options.limit,
    p_quote_id: options.quoteId ?? null,
  });
  if (error) throw error;

  return (data || []) as QuoteListRow[];
}

async function syncInvoice(
  authClient: ReturnType<typeof createClient>,
  env: EnvMap,
  graphToken: string,
  invoiceId: string,
) {
  const driveId = required(env, "MS_SHAREPOINT_VENTAS_DRIVE_ID");
  const siteId = required(env, "MS_SHAREPOINT_SITE_ID");

  const { data: invoiceData, error: invoiceError } = await authClient.rpc("finance_get_invoice", {
    p_invoice_id: invoiceId,
  });
  if (invoiceError) throw invoiceError;

  const invoice = (Array.isArray(invoiceData) ? invoiceData[0] : invoiceData) as InvoiceDetail | null;
  if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);
  if (!invoice.issue_date) throw new Error(`Invoice ${invoiceId} has no issue_date`);

  const { data: linesData, error: linesError } = await authClient.rpc("sync_get_invoice_lines_for_archive", {
    p_invoice_id: invoiceId,
  });
  if (linesError) throw linesError;

  const { data: clientData, error: clientError } = await authClient.rpc("get_client", {
    p_client_id: invoice.client_id,
  });
  if (clientError) throw clientError;

  const { data: companyData, error: companyError } = await authClient.rpc("sync_get_company_settings_for_archive");
  if (companyError) throw companyError;

  const { data: preferencesData, error: preferencesError } = await authClient.rpc("get_company_preferences");
  if (preferencesError) throw preferencesError;

  let project = null;
  if (invoice.project_id) {
    const { data: projectData, error: projectError } = await authClient.rpc("sync_get_project_for_archive", {
      p_project_id: invoice.project_id,
    });
    if (projectError) throw projectError;
    project = Array.isArray(projectData) ? projectData[0] : projectData;
  }

  const client = Array.isArray(clientData) ? clientData[0] : clientData;
  const company = Array.isArray(companyData) ? companyData[0] : companyData;
  const preferences = Array.isArray(preferencesData) ? preferencesData[0] : preferencesData;

  const fileName = buildInvoiceFileName(invoice);
  const folderPath = buildSalesFolder("invoice", invoice.issue_date);

  const pdfDocument = React.createElement(InvoicePDFDocument, {
    invoice,
    lines: (linesData || []).sort((a: any, b: any) => (a.line_order || 0) - (b.line_order || 0)),
    client,
    company,
    project,
    preferences: { bank_accounts: Array.isArray(preferences?.bank_accounts) ? preferences.bank_accounts : [] },
  });

  const pdfBuffer = await renderPdfToBuffer(pdfDocument);
  const pdfHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
  const recordHash = buildRecordHash({
    type: "invoice",
    documentId: invoice.id,
    number: invoice.invoice_number || invoice.preliminary_number,
    issueDate: invoice.issue_date,
    clientName: invoice.client_name,
    pdfHash,
    folderPath,
    fileName,
  });

  const item = await uploadPdfToSharePoint(graphToken, driveId, folderPath, fileName, pdfBuffer);

  try {
    await patchSalesMetadata(graphToken, driveId, item.id, {
      DocumentoERPId: invoice.id,
      TipoDocumento: "Factura",
      Cliente: invoice.client_name,
      Proyecto: [invoice.project_number, invoice.project_name].filter(Boolean).join(" - "),
      MesFiscal: invoice.issue_date.slice(0, 7),
      EstadoERP: invoice.status,
      HashPDF: `sha256:${pdfHash}`,
    });
  } catch (error) {
    console.warn(`Metadata patch failed for invoice ${invoice.id}:`, error);
  }

  const { error: persistError } = await authClient.rpc("sync_set_invoice_archive_metadata", {
    p_invoice_id: invoice.id,
    p_sharepoint_site_id: siteId,
    p_sharepoint_drive_id: driveId,
    p_sharepoint_item_id: item.id,
    p_sharepoint_web_url: item.webUrl ?? null,
    p_sharepoint_etag: item.eTag ?? null,
    p_archived_pdf_path: `${folderPath}/${fileName}`,
    p_archived_pdf_file_name: fileName,
    p_archived_pdf_hash: `sha256:${pdfHash}`,
    p_archived_record_hash: `sha256:${recordHash}`,
  });
  if (persistError) throw persistError;

  return {
    documentType: "invoice",
    documentId: invoice.id,
    number: invoice.invoice_number || invoice.preliminary_number,
    fileName,
    folderPath,
    itemId: item.id,
    pdfHash: `sha256:${pdfHash}`,
    recordHash: `sha256:${recordHash}`,
  };
}

async function syncQuote(
  authClient: ReturnType<typeof createClient>,
  env: EnvMap,
  graphToken: string,
  quoteId: string,
) {
  const driveId = required(env, "MS_SHAREPOINT_VENTAS_DRIVE_ID");
  const siteId = required(env, "MS_SHAREPOINT_SITE_ID");

  const { data: quoteData, error: quoteError } = await authClient.rpc("get_quote", {
    p_quote_id: quoteId,
  });
  if (quoteError) throw quoteError;

  const quote = (Array.isArray(quoteData) ? quoteData[0] : quoteData) as QuoteDetail | null;
  if (!quote) throw new Error(`Quote not found: ${quoteId}`);

  const issueDate = quote.issue_date || quote.created_at.slice(0, 10);

  const { data: linesData, error: linesError } = await authClient.rpc("sync_get_quote_lines_for_archive", {
    p_quote_id: quoteId,
  });
  if (linesError) throw linesError;

  const { data: clientData, error: clientError } = await authClient.rpc("get_client", {
    p_client_id: quote.client_id,
  });
  if (clientError) throw clientError;

  const { data: companyData, error: companyError } = await authClient.rpc("sync_get_company_settings_for_archive");
  if (companyError) throw companyError;

  let project = null;
  if (quote.project_id) {
    const { data: projectData, error: projectError } = await authClient.rpc("sync_get_project_for_archive", {
      p_project_id: quote.project_id,
    });
    if (projectError) throw projectError;
    project = Array.isArray(projectData) ? projectData[0] : projectData;
  }

  const client = Array.isArray(clientData) ? clientData[0] : clientData;
  const company = Array.isArray(companyData) ? companyData[0] : companyData;

  const fileName = buildQuoteFileName(quote);
  const folderPath = buildSalesFolder("quote", issueDate);

  const pdfDocument = React.createElement(QuotePDFDocument, {
    quote: { ...quote, issue_date: issueDate },
    lines: (linesData || []).sort((a: any, b: any) => (a.line_order || 0) - (b.line_order || 0)),
    client,
    company,
    project,
  });

  const pdfBuffer = await renderPdfToBuffer(pdfDocument);
  const pdfHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
  const recordHash = buildRecordHash({
    type: "quote",
    documentId: quote.id,
    number: quote.quote_number,
    issueDate,
    clientName: quote.client_name,
    pdfHash,
    folderPath,
    fileName,
  });

  const item = await uploadPdfToSharePoint(graphToken, driveId, folderPath, fileName, pdfBuffer);

  try {
    await patchSalesMetadata(graphToken, driveId, item.id, {
      DocumentoERPId: quote.id,
      TipoDocumento: "Presupuesto",
      Cliente: quote.client_name,
      Proyecto: quote.project_name || "",
      MesFiscal: issueDate.slice(0, 7),
      EstadoERP: quote.status,
      HashPDF: `sha256:${pdfHash}`,
    });
  } catch (error) {
    console.warn(`Metadata patch failed for quote ${quote.id}:`, error);
  }

  const { error: persistError } = await authClient.rpc("sync_set_quote_archive_metadata", {
    p_quote_id: quote.id,
    p_sharepoint_site_id: siteId,
    p_sharepoint_drive_id: driveId,
    p_sharepoint_item_id: item.id,
    p_sharepoint_web_url: item.webUrl ?? null,
    p_sharepoint_etag: item.eTag ?? null,
    p_archived_pdf_path: `${folderPath}/${fileName}`,
    p_archived_pdf_file_name: fileName,
    p_archived_pdf_hash: `sha256:${pdfHash}`,
    p_archived_record_hash: `sha256:${recordHash}`,
  });
  if (persistError) throw persistError;

  return {
    documentType: "quote",
    documentId: quote.id,
    number: quote.quote_number,
    fileName,
    folderPath,
    itemId: item.id,
    pdfHash: `sha256:${pdfHash}`,
    recordHash: `sha256:${recordHash}`,
  };
}

async function main() {
  const env = readEnvFile();
  const options = parseOptions();

  const supabaseUrl = required(env, "VITE_SUPABASE_URL");
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || null;
  const serviceRoleKey = required(env, "SUPABASE_SECRET_KEY");
  const userJwt = env.SUPABASE_USER_JWT || process.env.SUPABASE_USER_JWT || null;

  const readClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authClient = userJwt && publishableKey
    ? createClient(supabaseUrl, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${userJwt}` } },
      })
    : createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

  const graphToken = await getGraphToken(env);
  const summary: Array<Record<string, unknown>> = [];

  if (options.target === "all" || options.target === "invoices") {
    const invoiceCandidates = await getInvoiceCandidates(readClient, options);
    for (const invoice of invoiceCandidates) {
      summary.push(await syncInvoice(authClient, env, graphToken, invoice.id));
    }
  }

  if (options.target === "all" || options.target === "quotes") {
    const quoteCandidates = await getQuoteCandidates(readClient, options);
    for (const quote of quoteCandidates) {
      summary.push(await syncQuote(authClient, env, graphToken, quote.id));
    }
  }

  console.log(JSON.stringify({
    syncedCount: summary.length,
    summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
