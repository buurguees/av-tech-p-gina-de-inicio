import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactFormRequest {
  nombre: string;
  empresa?: string;
  email: string;
  telefono?: string;
  tipoSolicitud: "presupuesto" | "visita";
  tipoEspacio?: "retail" | "corporativo" | "evento" | "otro";
  mensaje?: string;
}

// Validación básica
function validateInput(data: ContactFormRequest): string | null {
  if (!data.nombre || data.nombre.trim().length < 2) {
    return "El nombre es requerido (mínimo 2 caracteres)";
  }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return "Email inválido";
  }
  if (!data.tipoSolicitud || !["presupuesto", "visita"].includes(data.tipoSolicitud)) {
    return "Tipo de solicitud inválido";
  }
  if (data.nombre.length > 100 || (data.empresa && data.empresa.length > 200) || 
      (data.mensaje && data.mensaje.length > 2000)) {
    return "Uno o más campos exceden la longitud máxima";
  }
  return null;
}

// Formatear tipo de espacio para email
function formatTipoEspacio(tipo?: string): string {
  const tipos: Record<string, string> = {
    retail: "Retail / Punto de venta",
    corporativo: "Corporativo / Oficinas",
    evento: "Evento / Feria",
    otro: "Otro"
  };
  return tipo ? tipos[tipo] || tipo : "No especificado";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ContactFormRequest = await req.json();
    
    // Validar input
    const validationError = validateInput(data);
    if (validationError) {
      console.error("Validation error:", validationError);
      return new Response(
        JSON.stringify({ error: validationError }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Obtener metadata de la request
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                      req.headers.get("cf-connecting-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    console.log("Processing contact form submission:", {
      nombre: data.nombre,
      email: data.email,
      tipoSolicitud: data.tipoSolicitud
    });

    // Crear cliente Supabase con service role para bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Insertar en la base de datos usando RPC (el schema crm no está expuesto via PostgREST)
    const { data: messageId, error: dbError } = await supabaseAdmin.rpc("insert_contact_message", {
      _nombre: data.nombre.trim(),
      _empresa: data.empresa?.trim() || null,
      _email: data.email.trim().toLowerCase(),
      _telefono: data.telefono?.trim() || null,
      _tipo_solicitud: data.tipoSolicitud,
      _tipo_espacio: data.tipoEspacio || null,
      _mensaje: data.mensaje?.trim() || null,
      _ip_address: ipAddress,
      _user_agent: userAgent
    });

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Error al guardar el mensaje" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const insertedMessage = { id: messageId };

    console.log("Message saved to database:", insertedMessage?.id);

    // Registrar en auditoría
    await supabaseAdmin.rpc("log_action", {
      _action: "INSERT",
      _table_name: "crm.contact_messages",
      _record_id: insertedMessage?.id,
      _ip_address: ipAddress,
      _user_agent: userAgent,
      _new_data: data,
      _metadata: { source: "web_form" }
    });

    // Enviar email de notificación al equipo
    const tipoSolicitudLabel = data.tipoSolicitud === "presupuesto" 
      ? "📋 Solicitud de Presupuesto" 
      : "📅 Solicitud de Visita";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a1a; color: white; padding: 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 20px; background: #f9f9f9; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
          .value { font-size: 16px; color: #333; margin-top: 4px; }
          .message-box { background: white; padding: 15px; border-left: 4px solid #1a1a1a; margin-top: 15px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: bold; }
          .badge-presupuesto { background: #e3f2fd; color: #1565c0; }
          .badge-visita { background: #f3e5f5; color: #7b1fa2; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Nuevo Lead - AV TECH</h1>
          </div>
          <div class="content">
            <p style="text-align: center; margin-bottom: 20px;">
              <span class="badge ${data.tipoSolicitud === 'presupuesto' ? 'badge-presupuesto' : 'badge-visita'}">
                ${tipoSolicitudLabel}
              </span>
            </p>
            
            <div class="field">
              <div class="label">Nombre</div>
              <div class="value">${data.nombre}</div>
            </div>
            
            ${data.empresa ? `
            <div class="field">
              <div class="label">Empresa</div>
              <div class="value">${data.empresa}</div>
            </div>
            ` : ''}
            
            <div class="field">
              <div class="label">Email</div>
              <div class="value"><a href="mailto:${data.email}">${data.email}</a></div>
            </div>
            
            ${data.telefono ? `
            <div class="field">
              <div class="label">Teléfono</div>
              <div class="value"><a href="tel:${data.telefono}">${data.telefono}</a></div>
            </div>
            ` : ''}
            
            <div class="field">
              <div class="label">Tipo de Espacio</div>
              <div class="value">${formatTipoEspacio(data.tipoEspacio)}</div>
            </div>
            
            ${data.mensaje ? `
            <div class="message-box">
              <div class="label">Mensaje</div>
              <div class="value" style="white-space: pre-wrap;">${data.mensaje}</div>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Este mensaje fue enviado desde el formulario de contacto de la web.</p>
            <p>ID: ${insertedMessage?.id}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "AV TECH Web <onboarding@resend.dev>",
      to: ["info@avtechesdeveniments.com"],
      subject: `${tipoSolicitudLabel} - ${data.nombre}${data.empresa ? ` (${data.empresa})` : ''}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Email error:", emailError);
      // No fallamos la request si el email falla, el mensaje ya está guardado
    } else {
      console.log("Email sent successfully to info@avtechesdeveniments.com");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Mensaje enviado correctamente" 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Error inesperado. Por favor, inténtalo de nuevo." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
