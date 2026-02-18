/**
 * Backfill script: Migrate purchase invoices from Supabase Storage to MinIO.
 *
 * Usage:
 *   node backfill-purchases.mjs              # Run migration
 *   node backfill-purchases.mjs --dry-run    # Preview only, no writes
 */

import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { createHash } from "crypto";
import { readFileSync } from "fs";

// Load .env
try {
  const envContent = readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
} catch {}

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 2000;

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: env("MINIO_ENDPOINT"),
  forcePathStyle: true,
  credentials: {
    accessKeyId: env("MINIO_ACCESS_KEY"),
    secretAccessKey: env("MINIO_SECRET_KEY"),
  },
  tls: false,
});

const MINIO_BUCKET = env("MINIO_BUCKET");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function getFiscalQuarter(month) {
  return Math.ceil(month / 3);
}

function sanitizeName(name) {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 30);
}

function buildStorageKey(invoice) {
  const date = new Date(invoice.issue_date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const quarter = getFiscalQuarter(month);
  const number = (invoice.internal_purchase_number || invoice.invoice_number || "SN").replace(/\//g, "-");
  const supplier = sanitizeName(invoice.supplier_name || invoice.technician_name || "proveedor");
  return `fiscal/${year}/T${quarter}/compras/${number}_${supplier}.pdf`;
}

function normalizeStoragePath(path) {
  return path.trim().replace(/^\//, "");
}

async function downloadFromSupabase(filePath) {
  const normalizedPath = normalizeStoragePath(filePath);
  const { data, error } = await supabase.storage
    .from("purchase-documents")
    .download(normalizedPath);
  if (error) throw new Error(`Supabase download error: ${error.message} (path: ${normalizedPath})`);
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function objectExists(bucket, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}

async function uploadToMinio(bucket, key, buffer, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/pdf",
    })
  );
}

async function main() {
  console.log("=== BACKFILL: Purchase Invoices -> MinIO ===");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`MinIO: ${env("MINIO_ENDPOINT")} / ${MINIO_BUCKET}`);
  console.log("");

  // Fetch purchase invoices needing migration via RPC
  const { data: invoices, error: fetchErr } = await supabase.rpc("backfill_list_purchase_invoices_to_migrate");

  if (fetchErr) {
    console.error("Error fetching invoices:", fetchErr);
    process.exit(1);
  }

  console.log(`Found ${invoices.length} purchase invoices to migrate`);
  if (invoices.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Get supplier/technician names
  const supplierIds = [...new Set(invoices.filter((i) => i.supplier_id).map((i) => i.supplier_id))];
  const technicianIds = [...new Set(invoices.filter((i) => i.technician_id).map((i) => i.technician_id))];

  const supplierMap = {};
  const technicianMap = {};

  for (const sid of supplierIds) {
    const { data } = await supabase.rpc("backfill_get_supplier_name", { p_id: sid });
    if (data) supplierMap[sid] = data;
  }

  for (const tid of technicianIds) {
    const { data } = await supabase.rpc("backfill_get_technician_name", { p_id: tid });
    if (data) technicianMap[tid] = data;
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
    const batch = invoices.slice(i, i + BATCH_SIZE);
    console.log(`\n--- Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} invoices) ---`);

    for (const inv of batch) {
      const supplierName = inv.supplier_id ? supplierMap[inv.supplier_id] : null;
      const technicianName = inv.technician_id ? technicianMap[inv.technician_id] : null;
      const enriched = { ...inv, supplier_name: supplierName, technician_name: technicianName };
      const key = buildStorageKey(enriched);
      const number = inv.internal_purchase_number || inv.invoice_number;

      try {
        if (await objectExists(MINIO_BUCKET, key)) {
          console.log(`  SKIP (exists): ${number} -> ${key}`);
          skipCount++;
          continue;
        }

        if (DRY_RUN) {
          console.log(`  DRY: ${number} -> ${key} (from ${inv.file_path})`);
          successCount++;
          continue;
        }

        // Download from Supabase Storage
        const buffer = await downloadFromSupabase(inv.file_path);
        const checksum = sha256(buffer);

        // Upload to MinIO
        await uploadToMinio(MINIO_BUCKET, key, buffer);

        // Fiscal metadata
        const date = new Date(inv.issue_date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const quarter = getFiscalQuarter(month);

        // Insert into minio_files (public schema, accessible)
        const { error: insertErr } = await supabase.from("minio_files").insert({
          bucket: MINIO_BUCKET,
          key,
          original_name: inv.file_name || `${number}.pdf`,
          mime_type: "application/pdf",
          size_bytes: buffer.length,
          checksum,
          owner_type: "purchase_invoice",
          owner_id: inv.id,
          document_type: "compras",
          status: "ACTIVE",
          created_by: "00000000-0000-0000-0000-000000000000",
          fiscal_year: year,
          fiscal_quarter: quarter,
          fiscal_month: month,
          document_date: inv.issue_date,
          auto_generated: true,
          archived_from_status: inv.status,
          source_table: "sales.purchase_invoices",
          source_id: inv.id,
        });

        if (insertErr) throw new Error(`minio_files insert: ${insertErr.message}`);

        // Update storage_key via RPC
        const { error: updateErr } = await supabase.rpc("backfill_set_purchase_invoice_storage_key", {
          p_id: inv.id,
          p_key: key,
        });

        if (updateErr) throw new Error(`storage_key update: ${updateErr.message}`);

        console.log(`  OK: ${number} -> ${key} (${buffer.length} bytes, sha256:${checksum.substring(0, 12)}...)`);
        successCount++;
      } catch (err) {
        console.error(`  ERROR: ${number}: ${err.message}`);
        errorCount++;
      }
    }

    if (i + BATCH_SIZE < invoices.length) {
      console.log(`  Waiting ${BATCH_DELAY_MS}ms...`);
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(`  Success: ${successCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  Errors:  ${errorCount}`);
  console.log(`  Total:   ${invoices.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
