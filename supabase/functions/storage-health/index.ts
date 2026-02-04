import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const endpoint = env("MINIO_ENDPOINT");
    const accessKeyId = env("MINIO_ACCESS_KEY");
    const secretAccessKey = env("MINIO_SECRET_KEY");
    const bucket = env("MINIO_BUCKET");
    const region = Deno.env.get("MINIO_REGION") ?? "us-east-1";
    const useSSL = (Deno.env.get("MINIO_USE_SSL") ?? "false") === "true";

    console.log(`Connecting to MinIO at ${endpoint}, bucket: ${bucket}, SSL: ${useSSL}`);

    const s3 = new S3Client({
      region,
      endpoint,
      forcePathStyle: true, // REQUIRED for MinIO
      credentials: { accessKeyId, secretAccessKey },
      tls: useSSL,
    });

    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 }));

    console.log(`Successfully listed bucket. Found ${res.Contents?.length ?? 0} objects.`);

    return new Response(
      JSON.stringify({
        ok: true,
        bucket,
        objects_sample: (res.Contents ?? []).map((o) => ({ key: o.Key, size: o.Size })),
      }),
      { headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("MinIO connection error:", errorMessage);
    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  }
});
