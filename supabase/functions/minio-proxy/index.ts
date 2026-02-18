import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function error(status: number, message: string): Response {
  return json({ ok: false, error: message }, status);
}

function getS3(): S3Client {
  return new S3Client({
    region: Deno.env.get("MINIO_REGION") || "us-east-1",
    endpoint: env("MINIO_ENDPOINT"),
    forcePathStyle: true,
    credentials: { accessKeyId: env("MINIO_ACCESS_KEY"), secretAccessKey: env("MINIO_SECRET_KEY") },
    tls: (Deno.env.get("MINIO_USE_SSL") || "false") === "true",
  });
}

function getSupa(auth: string) {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { authorization: auth } },
  });
}

function getSvc() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
}

const UPLOAD_EXT = ["pdf", "xlsx", "xls", "jpg", "jpeg", "png", "webp"];
const CATALOG_EXT = ["jpg", "jpeg", "png", "webp", "pdf"];
const MAX_SIZE = 20 * 1024 * 1024;
const GET_EXP = 300;
const PUT_EXP = 600;

function sanitize(name: string): string {
  const ext = name.includes(".") ? "." + name.split(".").pop()!.toLowerCase() : "";
  const base = name.replace(/\.[^.]+$/, "");
  return (
    base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_\-\s.()]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 80) + ext
  );
}

function guessMime(fn: string): string {
  const e = fn.split(".").pop()?.toLowerCase() || "";
  const m: Record<string, string> = {
    pdf: "application/pdf",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return m[e] || "application/octet-stream";
}

async function headExists(s3: S3Client, b: string, k: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: b, Key: k }));
    return true;
  } catch (e: unknown) {
    if ((e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return false;
    throw e;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("authorization");
    if (!auth) return error(401, "Missing authorization header");

    const body = await req.json();
    const { action } = body;
    if (!action) return error(400, "Missing action");

    // Extract the JWT token from "Bearer <token>"
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return error(401, "Missing token");

    // Use service role client to verify user from token
    const svcForAuth = getSvc();
    const {
      data: { user },
      error: ae,
    } = await svcForAuth.auth.getUser(token);
    if (ae || !user) return error(401, "Invalid token");

    // Create user-scoped client for RLS queries
    const sb = getSupa(auth);

    const s3 = getS3();
    const bkt = env("MINIO_BUCKET");

    switch (action) {
      case "get_presigned_url": {
        const { file_id } = body;
        if (!file_id) return error(400, "Missing file_id");
        const { data: f, error: e } = await sb
          .from("minio_files")
          .select("key, bucket, original_name")
          .eq("id", file_id)
          .is("deleted_at", null)
          .single();
        if (e || !f) return error(404, "File not found");
        const url = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: f.bucket || bkt,
            Key: f.key,
            ResponseContentDisposition: 'attachment; filename="' + encodeURIComponent(f.original_name) + '"',
          }),
          { expiresIn: GET_EXP }
        );
        return json({ ok: true, url, original_name: f.original_name, expires_in: GET_EXP });
      }

      case "get_presigned_url_by_key": {
        const { storage_key } = body;
        if (!storage_key) return error(400, "Missing storage_key");
        const { data: f, error: e } = await sb
          .from("minio_files")
          .select("id, key, bucket, original_name")
          .eq("key", storage_key)
          .is("deleted_at", null)
          .single();
        if (e || !f) return error(404, "File not found");
        const url = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: f.bucket || bkt,
            Key: f.key,
            ResponseContentDisposition: 'attachment; filename="' + encodeURIComponent(f.original_name) + '"',
          }),
          { expiresIn: GET_EXP }
        );
        return json({ ok: true, url, file_id: f.id, original_name: f.original_name, expires_in: GET_EXP });
      }

      case "list_files": {
        const { fiscal_year, fiscal_quarter, section } = body;
        if (!fiscal_year) return error(400, "Missing fiscal_year");
        let q = sb
          .from("minio_files")
          .select(
            "id, key, original_name, document_type, document_date, size_bytes, auto_generated, checksum, created_at, fiscal_month"
          )
          .eq("fiscal_year", fiscal_year)
          .is("deleted_at", null)
          .order("document_date", { ascending: true });
        if (fiscal_quarter) q = q.eq("fiscal_quarter", fiscal_quarter);
        if (section) q = q.eq("document_type", section);
        const { data: files, error: de } = await q;
        if (de) {
          console.error("list err:", de);
          return error(500, "Error listing files");
        }
        return json({ ok: true, files: files || [] });
      }

      case "get_upload_url": {
        const { fiscal_year, quarter, model_name, extension } = body;
        if (!fiscal_year || !quarter || !model_name || !extension)
          return error(400, "Missing required fields");
        const ext = extension.toLowerCase().replace(".", "");
        if (!UPLOAD_EXT.includes(ext)) return error(400, "Extension not allowed");
        if (quarter < 1 || quarter > 4) return error(400, "Quarter 1-4");
        const sn = model_name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .substring(0, 50);
        const key = "fiscal/" + fiscal_year + "/T" + quarter + "/modelos/" + sn + "." + ext;
        if (await headExists(s3, bkt, key)) return error(409, "File exists");
        const mt =
          ext === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bkt, Key: key, ContentType: mt }), {
          expiresIn: PUT_EXP,
        });
        return json({ ok: true, url, key, content_type: mt, expires_in: PUT_EXP });
      }

      case "upload_to_custom_folder": {
        const { folder_id, filename, mime_type, size_bytes } = body;
        if (!folder_id || !filename) return error(400, "Missing folder_id/filename");
        if (size_bytes && size_bytes > MAX_SIZE) return error(400, "File too large");
        const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
        if (ext && !UPLOAD_EXT.includes(ext)) return error(400, "Extension not allowed");
        const svc = getSvc();
        const { data: folder, error: fe } = await svc
          .from("minio_custom_folders")
          .select("id, minio_prefix")
          .eq("id", folder_id)
          .single();
        if (fe || !folder) return error(404, "Folder not found");
        const sf = sanitize(filename);
        const key = folder.minio_prefix + sf;
        const rm = mime_type || guessMime(filename);
        if (await headExists(s3, bkt, key)) return error(409, "File exists in folder");
        const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bkt, Key: key, ContentType: rm }), {
          expiresIn: PUT_EXP,
        });
        const { data: rec, error: ie } = await svc
          .from("minio_files")
          .insert({
            bucket: bkt,
            key,
            original_name: filename,
            mime_type: rm,
            size_bytes: size_bytes || null,
            owner_type: "user",
            owner_id: user.id,
            document_type: null,
            status: "UPLOADING",
            created_by: user.id,
            custom_folder_id: folder.id,
          })
          .select("id")
          .single();
        if (ie || !rec) {
          console.error("ins err:", ie);
          return error(500, "Error registering file");
        }
        return json({ ok: true, url, file_id: rec.id, key, content_type: rm, expires_in: PUT_EXP });
      }

      case "upload_to_catalog_product": {
        const { product_id, filename, mime_type, size_bytes } = body;
        if (!product_id || !filename) return error(400, "Missing product_id/filename");
        if (size_bytes && size_bytes > MAX_SIZE) return error(400, "File too large");
        const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
        if (ext && !CATALOG_EXT.includes(ext)) return error(400, "Extension not allowed for catalog");
        const svc = getSvc();
        const { data: pd, error: pe } = await svc.rpc("get_catalog_product_storage_path", {
          p_product_id: product_id,
        });
        if (pe) {
          console.error("rpc err:", pe);
          return error(500, "Error resolving product");
        }
        const pp = pd as {
          ok: boolean;
          error?: string;
          sku?: string;
          category_slugs?: string[];
        };
        if (!pp || !pp.ok) return error(404, (pp && pp.error) || "Product not found");
        const slugs = (pp.category_slugs || []).map((s: string) => s.replace(/[^a-zA-Z0-9_\-]/g, ""));
        const sku = (pp.sku || "unknown").replace(/[^a-zA-Z0-9_\-]/g, "");
        const sf = sanitize(filename);
        const key = ["catalog", ...slugs, sku, sf].join("/");
        const rm = mime_type || guessMime(filename);
        if (await headExists(s3, bkt, key)) return error(409, "File exists for product");
        const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bkt, Key: key, ContentType: rm }), {
          expiresIn: PUT_EXP,
        });
        const { data: rec, error: ie } = await svc
          .from("minio_files")
          .insert({
            bucket: bkt,
            key,
            original_name: filename,
            mime_type: rm,
            size_bytes: size_bytes || null,
            owner_type: "user",
            owner_id: user.id,
            document_type: null,
            status: "UPLOADING",
            created_by: user.id,
            source_table: "catalog.products",
            source_id: product_id,
          })
          .select("id")
          .single();
        if (ie || !rec) {
          console.error("ins err:", ie);
          return error(500, "Error registering file");
        }
        return json({ ok: true, url, file_id: rec.id, key, content_type: rm, expires_in: PUT_EXP });
      }

      case "confirm_custom_upload": {
        const { file_id } = body;
        if (!file_id) return error(400, "Missing file_id");
        const svc = getSvc();
        const { data: f, error: fe } = await svc
          .from("minio_files")
          .select("id, key, status")
          .eq("id", file_id)
          .single();
        if (fe || !f) return error(404, "File record not found");
        if (f.status === "READY") return json({ ok: true, message: "Already confirmed" });
        try {
          const h = await s3.send(new HeadObjectCommand({ Bucket: bkt, Key: f.key }));
          const sz = h.ContentLength || null;
          const { error: ue } = await svc
            .from("minio_files")
            .update({ status: "READY", size_bytes: sz, updated_at: new Date().toISOString() })
            .eq("id", file_id);
          if (ue) {
            console.error("confirm err:", ue);
            return error(500, "Error confirming");
          }
          return json({ ok: true, size_bytes: sz });
        } catch (he: unknown) {
          if ((he as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
            await svc.from("minio_files").delete().eq("id", file_id);
            return error(404, "Not in storage. Cleaned up.");
          }
          throw he;
        }
      }

      case "archive_document": {
        const { source_type, source_id: docId, pdf_base64 } = body;
        if (!source_type || !docId || !pdf_base64) return error(400, "Missing source_type/source_id/pdf_base64");
        if (!["ventas", "presupuestos"].includes(source_type)) return error(400, "source_type must be ventas or presupuestos");

        const svc = getSvc();
        let docInfo: { number: string; client_name: string; issue_date: string; status: string; source_table: string } | null = null;

        if (source_type === "ventas") {
          const { data: invDirect } = await svc.rpc("finance_get_invoice", { p_invoice_id: docId });
          const invD = Array.isArray(invDirect) ? invDirect[0] : invDirect;
          if (!invD) return error(404, "Invoice not found");
          docInfo = { number: invD.invoice_number || invD.preliminary_number || "SN", client_name: invD.client_name || "cliente", issue_date: invD.issue_date, status: invD.status, source_table: "sales.invoices" };
        } else {
          const { data: qt } = await svc.rpc("get_quote", { p_quote_id: docId });
          const qd = Array.isArray(qt) ? qt[0] : qt;
          if (!qd) return error(404, "Quote not found");
          docInfo = { number: qd.quote_number || "SN", client_name: qd.client_name || "cliente", issue_date: qd.issue_date || qd.created_at?.substring(0, 10) || new Date().toISOString().substring(0, 10), status: qd.status, source_table: "quotes.quotes" };
        }

        if (!docInfo) return error(404, "Document not found");

        const docDate = new Date(docInfo.issue_date);
        const fy = docDate.getFullYear();
        const fm = docDate.getMonth() + 1;
        const fq = Math.ceil(fm / 3);
        const clientSlug = (docInfo.client_name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 30);
        const folder = source_type === "ventas" ? "ventas" : "presupuestos";
        const archiveKey = `fiscal/${fy}/T${fq}/${folder}/${docInfo.number}_${clientSlug}.pdf`;

        const pdfBytes = Uint8Array.from(atob(pdf_base64), c => c.charCodeAt(0));
        if (pdfBytes.length < 500) return error(400, "PDF too small, likely invalid");

        await s3.send(new PutObjectCommand({
          Bucket: bkt,
          Key: archiveKey,
          Body: pdfBytes,
          ContentType: "application/pdf",
        }));

        const existingQ = await svc.from("minio_files").select("id").eq("source_id", docId).eq("source_table", docInfo.source_table).is("deleted_at", null);
        if (existingQ.data && existingQ.data.length > 0) {
          for (const old of existingQ.data) {
            await svc.from("minio_files").update({ deleted_at: new Date().toISOString(), status: "REPLACED" }).eq("id", old.id);
          }
        }

        const { data: newFile, error: insErr } = await svc.from("minio_files").insert({
          bucket: bkt,
          key: archiveKey,
          original_name: `${docInfo.number} - ${docInfo.client_name}.pdf`,
          mime_type: "application/pdf",
          size_bytes: pdfBytes.length,
          owner_type: source_type === "ventas" ? "invoice" : "quote",
          owner_id: docId,
          document_type: folder,
          status: "ACTIVE",
          created_by: user.id,
          fiscal_year: fy,
          fiscal_quarter: fq,
          fiscal_month: fm,
          document_date: docInfo.issue_date,
          auto_generated: true,
          archived_from_status: docInfo.status,
          source_table: docInfo.source_table,
          source_id: docId,
        }).select("id").single();

        if (insErr) { console.error("archive ins:", insErr); return error(500, "Error inserting minio_files"); }

        if (source_type === "ventas") {
          await svc.rpc("backfill_set_invoice_storage_key", { p_id: docId, p_key: archiveKey });
        } else {
          await svc.rpc("backfill_set_quote_storage_key", { p_id: docId, p_key: archiveKey });
        }

        return json({ ok: true, key: archiveKey, file_id: newFile?.id, size_bytes: pdfBytes.length, fiscal_year: fy, fiscal_quarter: fq });
      }

      default:
        return error(400, "Unknown action: " + action);
    }
  } catch (e: unknown) {
    const m = e instanceof Error ? e.message : String(e);
    console.error("minio-proxy error:", m);
    return error(500, m);
  }
});
