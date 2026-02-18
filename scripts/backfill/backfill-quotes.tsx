/**
 * Backfill: Render quotes as PDFs and upload to MinIO.
 * Uses @react-pdf/renderer renderToBuffer() for visual consistency.
 *
 * Run from project root:
 *   npx tsx scripts/backfill/backfill-quotes.tsx --dry-run
 *   npx tsx scripts/backfill/backfill-quotes.tsx
 *   npx tsx scripts/backfill/backfill-quotes.tsx --force   (overwrite existing)
 */
import React from "react";
(globalThis as any).React = React;
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createHash } from "crypto";
import { QuotePDFDocument } from "../../src/pages/nexo_av/assets/plantillas/QuotePDFDocument";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 3000;

const SUPABASE_URL = "https://takvthfatlcjsqgssnta.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const MINIO_ENDPOINT = "http://100.117.250.115:9000";
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || "nexo-worker";
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || "";
const MINIO_BUCKET = "nexo-prod";

if (!SUPABASE_SERVICE_KEY || !MINIO_SECRET_KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY and MINIO_SECRET_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: MINIO_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: MINIO_ACCESS_KEY, secretAccessKey: MINIO_SECRET_KEY },
  tls: false,
});

function sha256(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}
function quarter(month: number) {
  return Math.ceil(month / 3);
}
function sanitize(name: string) {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 30);
}

async function objectExists(bucket: string, key: string) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err: any) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}

async function main() {
  console.log("=== BACKFILL: Quotes -> MinIO (renderToBuffer) ===");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"} | Force: ${FORCE}`);
  console.log(`MinIO: ${MINIO_ENDPOINT} / ${MINIO_BUCKET}\n`);

  const { data: quotes, error: fetchErr } = await supabase.rpc("backfill_list_quotes_to_migrate");
  if (fetchErr) { console.error("Fetch error:", fetchErr); process.exit(1); }
  console.log(`Found ${quotes.length} quotes to migrate\n`);
  if (quotes.length === 0) { console.log("Nothing to do."); return; }

  const { data: companyArr } = await supabase.rpc("get_company_settings");
  const company = companyArr?.[0] || null;
  console.log(`Company: ${company?.legal_name || "NOT FOUND"}\n`);

  let success = 0, skip = 0, errors = 0;

  for (let i = 0; i < quotes.length; i += BATCH_SIZE) {
    const batch = quotes.slice(i, i + BATCH_SIZE);
    console.log(`--- Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} quotes) ---`);

    for (const q of batch) {
      const number = q.quote_number || "SN";
      try {
        const { data: fullQuote, error: qErr } = await supabase.rpc("get_quote", { p_quote_id: q.id });
        if (qErr) throw new Error(`RPC get_quote: ${qErr.message}`);
        const quote = Array.isArray(fullQuote) ? fullQuote[0] : fullQuote;
        if (!quote) throw new Error("Quote data not found from RPC");

        const { data: linesData, error: linesErr } = await supabase.rpc("get_quote_lines", { p_quote_id: q.id });
        if (linesErr) throw new Error(`RPC get_quote_lines: ${linesErr.message}`);
        const lines = (linesData || []).sort((a: any, b: any) => (a.line_order || 0) - (b.line_order || 0));

        let client = null;
        if (quote.client_id) {
          const { data: cData } = await supabase.rpc("get_client", { p_client_id: quote.client_id });
          client = Array.isArray(cData) ? cData[0] : cData;
        }

        let project = null;
        if (quote.project_id) {
          const { data: pData } = await supabase.rpc("get_project", { p_project_id: quote.project_id });
          const pInfo = Array.isArray(pData) ? pData[0] : pData;
          if (pInfo) {
            project = {
              project_number: pInfo.project_number,
              project_name: pInfo.project_name,
              project_address: pInfo.project_address || null,
              project_city: pInfo.project_city || null,
              local_name: pInfo.local_name || null,
              client_order_number: pInfo.client_order_number || null,
              site_name: quote.site_name || null,
            };
          }
        }

        const date = new Date(quote.issue_date || quote.created_at);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const qtr = quarter(month);
        const clientSlug = sanitize(client?.company_name || quote.client_name || "cliente");
        const key = `fiscal/${year}/T${qtr}/presupuestos/${number}_${clientSlug}.pdf`;

        if (!FORCE && await objectExists(MINIO_BUCKET, key)) {
          console.log(`  SKIP: ${number} -> ${key} (exists, use --force to overwrite)`);
          skip++;
          continue;
        }

        if (DRY_RUN) {
          console.log(`  DRY: ${number} -> ${key} (lines: ${lines.length}, client: ${client?.company_name || "?"})`);
          success++;
          continue;
        }

        console.log(`  Rendering ${number} (${lines.length} lines, client: ${client?.company_name || "?"})...`);

        const pdfBuffer = await renderToBuffer(
          React.createElement(QuotePDFDocument, {
            quote,
            lines,
            client,
            company,
            project,
          })
        );
        const buffer = Buffer.from(pdfBuffer);

        if (buffer.length < 1000) {
          console.warn(`  WARNING: ${number} PDF is only ${buffer.length} bytes - possible rendering issue`);
        }

        const checksum = sha256(buffer);

        await s3.send(new PutObjectCommand({
          Bucket: MINIO_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: "application/pdf",
        }));

        const { error: insertErr } = await supabase.from("minio_files").insert({
          bucket: MINIO_BUCKET,
          key,
          original_name: `${number} - ${client?.company_name || quote.client_name || "cliente"}.pdf`,
          mime_type: "application/pdf",
          size_bytes: buffer.length,
          checksum,
          owner_type: "quote",
          owner_id: q.id,
          document_type: "presupuestos",
          status: "ACTIVE",
          created_by: "00000000-0000-0000-0000-000000000000",
          fiscal_year: year,
          fiscal_quarter: qtr,
          fiscal_month: month,
          document_date: (quote.issue_date || quote.created_at || "").substring(0, 10),
          auto_generated: true,
          archived_from_status: quote.status,
          source_table: "quotes.quotes",
          source_id: q.id,
        });
        if (insertErr) throw new Error(`minio_files: ${insertErr.message}`);

        const { error: upErr } = await supabase.rpc("backfill_set_quote_storage_key", { p_id: q.id, p_key: key });
        if (upErr) throw new Error(`storage_key: ${upErr.message}`);

        console.log(`  OK: ${number} -> ${key} (${buffer.length} bytes)`);
        success++;
      } catch (err: any) {
        console.error(`  ERROR: ${number}: ${err.message}`);
        errors++;
      }
    }

    if (i + BATCH_SIZE < quotes.length) {
      console.log(`  Waiting ${BATCH_DELAY_MS}ms...`);
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`\n=== SUMMARY ===\n  Success: ${success}\n  Skipped: ${skip}\n  Errors: ${errors}\n  Total: ${quotes.length}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
