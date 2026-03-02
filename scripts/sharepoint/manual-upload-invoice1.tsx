import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { InvoicePDFDocument } from "../../src/pages/nexo_av/assets/plantillas/InvoicePDFDocument";

type EnvMap = Record<string, string>;

type InvoiceRow = {
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

function sanitizeSegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*#%&{}~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSalesPaths(issueDate: string, clientName: string, projectName?: string | null, projectNumber?: string | null) {
  const year = issueDate.slice(0, 4);
  const month = issueDate.slice(0, 7);
  return {
    primaryFolderPath: `Facturas Emitidas/${year}/${month}`,
    mirrorFolderPaths: [],
  };
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

  const data = await response.json();
  return data.access_token as string;
}

async function graphUpload(token: string, driveId: string, targetPath: string, fileName: string, pdfBuffer: Buffer) {
  const encodedPath = encodeURI(`${targetPath}/${fileName}`);
  const response = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}:/content`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/pdf",
    },
    body: pdfBuffer,
  });

  if (!response.ok) {
    throw new Error(`Graph upload failed: ${response.status} ${await response.text()}`);
  }

  return await response.json();
}

async function main() {
  const env = readEnvFile();
  const supabaseUrl = required(env, "VITE_SUPABASE_URL");
  const driveId = required(env, "MS_SHAREPOINT_VENTAS_DRIVE_ID");
  const invoiceId = process.argv[2] || "c32b5c1a-36c5-4cf3-9258-c0db2932c3ef";
  const userJwt = env.SUPABASE_USER_JWT || process.env.SUPABASE_USER_JWT;
  const supabaseKey = userJwt
    ? required(env, "VITE_SUPABASE_PUBLISHABLE_KEY")
    : required(env, "SUPABASE_SECRET_KEY");

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: userJwt ? { headers: { Authorization: `Bearer ${userJwt}` } } : undefined,
  });

  const { data: invoiceData, error: invoiceError } = await supabase.rpc("finance_get_invoice", {
    p_invoice_id: invoiceId,
  });
  if (invoiceError) throw invoiceError;

  const invoice = (Array.isArray(invoiceData) ? invoiceData[0] : invoiceData) as InvoiceRow;
  if (!invoice) {
    throw new Error(`Invoice not found for ${invoiceId}`);
  }

  const { data: linesData, error: linesError } = await supabase.rpc("finance_get_invoice_lines", {
    p_invoice_id: invoiceId,
  });
  if (linesError) throw linesError;

  const { data: clientData, error: clientError } = await supabase.rpc("get_client", {
    p_client_id: invoice.client_id,
  });
  if (clientError) throw clientError;

  const { data: companyData, error: companyError } = await supabase.rpc("get_company_settings");
  if (companyError) throw companyError;

  const { data: preferencesData, error: preferencesError } = await supabase.rpc("get_company_preferences");
  if (preferencesError) throw preferencesError;

  let project = null;
  if (invoice.project_id) {
    const { data: projectData, error: projectError } = await supabase.rpc("get_project", {
      p_project_id: invoice.project_id,
    });
    if (projectError) throw projectError;
    project = Array.isArray(projectData) ? projectData[0] : projectData;
  }

  const client = Array.isArray(clientData) ? clientData[0] : clientData;
  const company = Array.isArray(companyData) ? companyData[0] : companyData;
  const preferences = Array.isArray(preferencesData) ? preferencesData[0] : preferencesData;

  const fileNumber = invoice.invoice_number || invoice.preliminary_number || invoice.id;
  const fileName = `${sanitizeSegment(fileNumber)} - ${sanitizeSegment(invoice.client_name)} - ${invoice.issue_date}.pdf`;
  const pdfDocument = React.createElement(InvoicePDFDocument, {
    invoice,
    lines: (linesData || []).sort((a: any, b: any) => (a.line_order || 0) - (b.line_order || 0)),
    client,
    company,
    project,
    preferences: { bank_accounts: Array.isArray(preferences?.bank_accounts) ? preferences.bank_accounts : [] },
  });

  const pdfBuffer = Buffer.from(await pdf(pdfDocument).toBuffer());
  const hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
  const graphToken = await getGraphToken(env);
  const { primaryFolderPath, mirrorFolderPaths } = buildSalesPaths(
    invoice.issue_date,
    invoice.client_name,
    invoice.project_name,
    invoice.project_number,
  );

  const uploaded = [];
  for (const targetPath of [primaryFolderPath, ...mirrorFolderPaths]) {
    const item = await graphUpload(graphToken, driveId, targetPath, fileName, pdfBuffer);
    uploaded.push({ path: `${targetPath}/${fileName}` });
  }

  console.log(JSON.stringify({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    fileName,
    hash,
    uploaded,
  }, null, 2));
}

main().catch((error) => {
  if (error instanceof Error && error.message.includes("User not authorized")) {
    console.error("No se ha podido leer la factura real desde Supabase.");
    console.error("Usa SUPABASE_USER_JWT con sesion de un usuario autorizado o cambia a una service role valida para backend.");
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});
