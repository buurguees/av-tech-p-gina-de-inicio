import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// CORS headers for webhook
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Allowed file types for processing
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg", 
  "image/png",
];

interface ResendEmailEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    attachments?: Array<{
      filename: string;
      content_type: string;
      size: number;
    }>;
  };
}

interface ResendAttachment {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  download_url: string;
}

/**
 * Verify Resend webhook signature using svix pattern
 */
async function verifyWebhookSignature(
  payload: string,
  headers: Headers
): Promise<boolean> {
  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  
  if (!webhookSecret) {
    console.error("RESEND_WEBHOOK_SECRET not configured");
    return false;
  }

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("Missing svix headers");
    return false;
  }

  // Check timestamp to prevent replay attacks (5 minute tolerance)
  const timestamp = parseInt(svixTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    console.error("Webhook timestamp too old or in the future");
    return false;
  }

  try {
    // Create the signed payload
    const signedPayload = `${svixId}.${svixTimestamp}.${payload}`;
    
    // Get the secret without the whsec_ prefix if present
    const secretBytes = webhookSecret.startsWith("whsec_") 
      ? webhookSecret.substring(6) 
      : webhookSecret;
    
    // Decode base64 secret
    const key = await crypto.subtle.importKey(
      "raw",
      Uint8Array.from(atob(secretBytes), c => c.charCodeAt(0)),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Sign the payload
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signedPayload)
    );

    // Convert to base64
    const expectedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signatureBytes))
    );

    // Extract signatures from header (format: v1,signature1 v1,signature2)
    const signatures = svixSignature.split(" ").map((sig) => {
      const [version, signature] = sig.split(",");
      return { version, signature };
    });

    // Check if any signature matches
    return signatures.some(
      ({ version, signature }) => version === "v1" && signature === expectedSignature
    );
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

/**
 * Fetch attachments from Resend API
 */
async function fetchAttachments(emailId: string): Promise<ResendAttachment[]> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const response = await fetch(
    `https://api.resend.com/emails/${emailId}/attachments`,
    {
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch attachments: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Download attachment content from Resend
 */
async function downloadAttachment(downloadUrl: string): Promise<ArrayBuffer> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download attachment: ${response.status}`);
  }

  return response.arrayBuffer();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(rawBody, req.headers);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the event
    const event: ResendEmailEvent = JSON.parse(rawBody);
    console.log("Received Resend webhook event:", event.type);

    // Only process email.received events
    if (event.type !== "email.received") {
      console.log(`Ignoring event type: ${event.type}`);
      return new Response(JSON.stringify({ message: "Event ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email_id, from, subject } = event.data;
    console.log(`Processing email from: ${from}, subject: ${subject}`);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch attachments from Resend API
    const attachments = await fetchAttachments(email_id);
    console.log(`Found ${attachments.length} attachments`);

    // Filter for allowed file types
    const validAttachments = attachments.filter((att) =>
      ALLOWED_MIME_TYPES.includes(att.content_type.toLowerCase())
    );
    console.log(`Valid attachments (PDF/images): ${validAttachments.length}`);

    if (validAttachments.length === 0) {
      console.log("No valid attachments found in email");
      return new Response(
        JSON.stringify({ 
          message: "No valid attachments", 
          total: attachments.length,
          valid: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const uploadedDocuments: string[] = [];
    const errors: string[] = [];

    // Process each valid attachment
    for (const attachment of validAttachments) {
      try {
        console.log(`Processing attachment: ${attachment.filename}`);

        // Download the attachment
        const fileContent = await downloadAttachment(attachment.download_url);
        
        // Generate unique file path: email-inbox/{email_id}/{filename}
        const sanitizedFilename = attachment.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `email-inbox/${email_id}/${sanitizedFilename}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("scanned-documents")
          .upload(filePath, fileContent, {
            contentType: attachment.content_type,
            upsert: false,
          });

        if (uploadError) {
          console.error(`Upload error for ${attachment.filename}:`, uploadError);
          errors.push(`Upload failed: ${attachment.filename}`);
          continue;
        }

        // Create record in scanned_documents
        const { error: dbError } = await supabase
          .from("scanned_documents")
          .insert({
            file_path: filePath,
            file_name: attachment.filename,
            file_size: attachment.size,
            file_type: attachment.content_type,
            status: "UNASSIGNED",
            notes: `📧 De: ${from} | Asunto: ${subject || "(sin asunto)"}`,
            created_by: null, // System automated
          });

        if (dbError) {
          console.error(`Database error for ${attachment.filename}:`, dbError);
          errors.push(`DB insert failed: ${attachment.filename}`);
          continue;
        }

        uploadedDocuments.push(attachment.filename);
        console.log(`Successfully processed: ${attachment.filename}`);
      } catch (attachmentError) {
        console.error(`Error processing attachment ${attachment.filename}:`, attachmentError);
        errors.push(`Processing failed: ${attachment.filename}`);
      }
    }

    console.log(`Completed: ${uploadedDocuments.length} uploaded, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        uploaded: uploadedDocuments,
        errors: errors,
        email_id,
        from,
        subject,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
