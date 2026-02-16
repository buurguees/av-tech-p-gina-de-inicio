import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate token with anon client
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authUserId = claimsData.claims.sub as string;

    // 2. Service role client for privileged operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Get authorized_user_id
    const { data: authUser } = await serviceClient.rpc("get_authorized_user_by_auth_id", {
      p_auth_user_id: authUserId,
    });
    if (!authUser?.[0]) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = authUser[0].id;

    // 4. Parse request body
    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: "request_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Load chat request and verify ownership (use raw SQL via rpc since ai schema isn't exposed via API)
    const { data: reqRows, error: reqError } = await serviceClient.rpc('ai_get_chat_request_for_processing', {
      p_request_id: request_id,
    });

    const reqData = reqRows?.[0];
    if (reqError || !reqData) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (reqData.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Mark processing
    await serviceClient.rpc("ai_mark_request_processing", { p_request_id: request_id });

    // 7. Load latest user message
    let userMessage = "";
    if (reqData.latest_user_message_id) {
      const { data: msgRows } = await serviceClient.rpc('ai_get_message_content', {
        p_message_id: reqData.latest_user_message_id,
      });
      userMessage = msgRows?.[0]?.content || "";
    }

    // 8. Load context based on mode
    const mode = reqData.mode || "general";
    let context = {};

    const contextRpcMap: Record<string, string> = {
      general: "ai_get_context_general",
      administration: "ai_get_context_administration",
      commercial: "ai_get_context_commercial",
      marketing: "ai_get_context_marketing",
      programming: "ai_get_context_programming",
    };

    const rpcName = contextRpcMap[mode] || "ai_get_context_general";
    const { data: ctxData } = await serviceClient.rpc(rpcName, { p_user_id: userId });
    context = ctxData || {};

    // 9. Generate V1 template response (no LLM)
    const responseContent = generateTemplateResponse(mode, userMessage, context);

    // 10. Save assistant message
    await serviceClient.rpc("ai_add_assistant_message", {
      p_conversation_id: reqData.conversation_id,
      p_content: responseContent,
      p_mode: mode,
      p_metadata: { version: "v1-template", context_mode: mode },
    });

    // 11. Mark done
    await serviceClient.rpc("ai_mark_request_done", { p_request_id: request_id });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-chat-processor error:", error);

    // Try to mark as error if we have request_id
    try {
      const { request_id } = await req.clone().json().catch(() => ({}));
      if (request_id) {
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await serviceClient.rpc("ai_mark_request_error", {
          p_request_id: request_id,
          p_error: error.message || "Unknown error",
        });
      }
    } catch (_) { /* best effort */ }

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...getCorsHeaders(null), "Content-Type": "application/json" },
    });
  }
});

function generateTemplateResponse(mode: string, userMessage: string, context: any): string {
  const modeLabels: Record<string, string> = {
    general: "General",
    administration: "Administración",
    commercial: "Comercial",
    marketing: "Marketing",
    programming: "Programación",
  };

  const modeLabel = modeLabels[mode] || "General";
  const lines: string[] = [];

  lines.push(`**NEXO AI** — Modo: ${modeLabel}\n`);
  lines.push(`He recibido tu mensaje. Actualmente estoy en modo plantilla (V1) y no dispongo de un modelo de lenguaje para generar respuestas inteligentes.\n`);

  // Add context summary based on mode
  if (mode === "general" && context) {
    const ctx = context as any;
    if (ctx.user) {
      lines.push(`**Tu perfil:** ${ctx.user.name} (${ctx.user.department})`);
    }
    if (ctx.active_projects_count !== undefined) {
      lines.push(`**Proyectos activos:** ${ctx.active_projects_count}`);
    }
    if (ctx.open_quotes_count !== undefined) {
      lines.push(`**Presupuestos abiertos:** ${ctx.open_quotes_count}`);
    }
  } else if (mode === "administration" && context) {
    const ctx = context as any;
    if (ctx.pending_sale_count !== undefined) {
      lines.push(`**Facturas de venta pendientes:** ${ctx.pending_sale_count}`);
    }
    if (ctx.pending_purchase_count !== undefined) {
      lines.push(`**Facturas de compra pendientes:** ${ctx.pending_purchase_count}`);
    }
  } else if (mode === "commercial" && context) {
    const ctx = context as any;
    if (ctx.total_clients !== undefined) {
      lines.push(`**Total clientes:** ${ctx.total_clients}`);
    }
    if (ctx.open_quotes_count !== undefined) {
      lines.push(`**Presupuestos abiertos:** ${ctx.open_quotes_count}`);
    }
  } else {
    lines.push(`El contexto de **${modeLabel}** estará disponible en V2.`);
  }

  lines.push(`\n---\n*En la versión V2, NEXO AI conectará con ALB357 para respuestas inteligentes basadas en el contexto completo del ERP.*`);

  return lines.join("\n");
}
