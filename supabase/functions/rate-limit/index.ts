import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Rate limit configuration
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
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
    const { action, email } = body;
    
    // Get client IP from headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    console.log(`Rate limit action: ${action}, email: ${email}, IP: ${clientIp}`);

    switch (action) {
      case 'check': {
        // Check rate limit for both email and IP
        const [emailCheck, ipCheck] = await Promise.all([
          supabaseAdmin.rpc('check_rate_limit', {
            p_identifier: email.toLowerCase(),
            p_identifier_type: 'email',
            p_max_attempts: MAX_ATTEMPTS,
            p_window_minutes: WINDOW_MINUTES
          }),
          supabaseAdmin.rpc('check_rate_limit', {
            p_identifier: clientIp,
            p_identifier_type: 'ip',
            p_max_attempts: MAX_ATTEMPTS * 3, // Allow more attempts per IP (multiple users)
            p_window_minutes: WINDOW_MINUTES
          })
        ]);

        if (emailCheck.error) {
          console.error('Email check error:', emailCheck.error);
          throw emailCheck.error;
        }
        if (ipCheck.error) {
          console.error('IP check error:', ipCheck.error);
          throw ipCheck.error;
        }

        const emailResult = emailCheck.data?.[0];
        const ipResult = ipCheck.data?.[0];

        // Block if either limit is exceeded
        const allowed = emailResult?.allowed && ipResult?.allowed;
        const retryAfter = Math.max(
          emailResult?.retry_after_seconds || 0,
          ipResult?.retry_after_seconds || 0
        );

        console.log(`Rate limit check - Email allowed: ${emailResult?.allowed}, IP allowed: ${ipResult?.allowed}`);

        return new Response(
          JSON.stringify({
            allowed,
            remaining_attempts: emailResult?.remaining_attempts || 0,
            retry_after_seconds: retryAfter,
            message: allowed 
              ? null 
              : `Demasiados intentos. Por favor espera ${Math.ceil(retryAfter / 60)} minutos.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'record': {
        const { success } = body;

        // Record attempt for both email and IP
        await Promise.all([
          supabaseAdmin.rpc('record_login_attempt', {
            p_identifier: email.toLowerCase(),
            p_identifier_type: 'email',
            p_success: success,
            p_ip_address: clientIp !== 'unknown' ? clientIp : null,
            p_user_agent: userAgent
          }),
          supabaseAdmin.rpc('record_login_attempt', {
            p_identifier: clientIp,
            p_identifier_type: 'ip',
            p_success: success,
            p_ip_address: clientIp !== 'unknown' ? clientIp : null,
            p_user_agent: userAgent
          })
        ]);

        console.log(`Recorded login attempt - email: ${email}, success: ${success}`);

        return new Response(
          JSON.stringify({ recorded: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset': {
        // Only allow reset with proper authorization (for admins)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'Authorization required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Reset rate limit for the specified email
        await supabaseAdmin.rpc('reset_rate_limit', {
          p_identifier: email.toLowerCase(),
          p_identifier_type: 'email'
        });

        console.log(`Rate limit reset for: ${email}`);

        return new Response(
          JSON.stringify({ reset: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Rate limit error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
