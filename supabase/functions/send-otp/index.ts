import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

// CORS configuration
const ALLOWED_ORIGINS = [
  'https://avtechesdeveniments.com',
  'https://www.avtechesdeveniments.com',
  'https://avtech-305e7.web.app',
  'https://avtech-305e7.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

const LOVABLE_PATTERN = /^https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com)$/;

function getCorsHeaders(origin: string | null): Record<string, string> {
  let allowedOrigin = ALLOWED_ORIGINS[0];
  
  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin) || LOVABLE_PATTERN.test(origin)) {
      allowedOrigin = origin;
    }
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const resend = new Resend(Deno.env.get("RESEND_OTP_API_KEY"));

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || null;
    const userAgent = req.headers.get('user-agent') || null;

    console.log(`Generating OTP for: ${email}`);

    // Generate OTP code
    const { data: otpCode, error: otpError } = await supabaseAdmin.rpc('generate_otp', {
      p_email: email.toLowerCase(),
      p_ip_address: clientIp,
      p_user_agent: userAgent
    });

    if (otpError) {
      console.error('Error generating OTP:', otpError);
      throw otpError;
    }

    console.log(`OTP generated for ${email}: ${otpCode}`);

    // Send email with Resend
    const emailResponse = await resend.emails.send({
      from: "NexoAV Security <noreply@avtechesdeveniments.com>",
      to: [email],
      subject: "Tu código de verificación - NexoAV",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
            
            <!-- Logo Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="background: #000000; border-radius: 16px; padding: 24px; display: inline-block; margin-bottom: 16px; border: 1px solid #333;">
                <img 
                  src="https://avtechesdeveniments.com/images/nexoav-logo.png" 
                  alt="NexoAV Logo" 
                  width="80" 
                  height="80" 
                  style="display: block; width: 80px; height: 80px;"
                />
              </div>
              <h1 style="color: #fff; font-size: 20px; margin: 0 0 8px 0; font-weight: 600;">NexoAV</h1>
              <div style="display: inline-block;">
                <span style="color: #00d4ff; font-size: 11px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; background: #00d4ff15; padding: 4px 12px; border-radius: 4px; border: 1px solid #00d4ff30;">
                  SECURITY
                </span>
              </div>
            </div>
            
            <!-- OTP Code Section -->
            <div style="text-align: center; margin-bottom: 32px;">
              <p style="color: #ccc; font-size: 16px; margin-bottom: 24px;">
                Tu código de verificación es:
              </p>
              <div style="background: #0f0f1a; border-radius: 12px; padding: 24px; display: inline-block; border: 1px solid #00d4ff33;">
                <span style="font-family: 'SF Mono', 'Courier New', monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #00d4ff;">
                  ${otpCode}
                </span>
              </div>
            </div>
            
            <!-- Expiration Info -->
            <div style="text-align: center; color: #888; font-size: 13px;">
              <div style="background: #ffffff08; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="margin: 0; color: #fff;">
                  ⏱️ Este código expira en <strong style="color: #00d4ff;">10 minutos</strong>
                </p>
              </div>
              <p style="margin-bottom: 0;">
                Si no solicitaste este código, puedes ignorar este mensaje.
              </p>
            </div>
            
            <!-- Security Notice -->
            <div style="background: #ff444410; border: 1px solid #ff444430; border-radius: 8px; padding: 12px; margin-top: 24px; text-align: center;">
              <p style="color: #ff8888; font-size: 11px; margin: 0;">
                🔒 Nunca compartas este código. El equipo de NexoAV nunca te lo pedirá.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #333; margin-top: 32px; padding-top: 24px; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} AVTECH Esdeveniments. Todos los derechos reservados.
              </p>
              <p style="color: #444; font-size: 10px; margin-top: 8px;">
                Sistema de Gestión NexoAV
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("OTP email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Código enviado correctamente' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
