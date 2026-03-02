import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://avtechesdeveniments.com',
  'https://www.avtechesdeveniments.com',
  'https://avtech-305e7.web.app',
  'https://avtech-305e7.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
];

const LOVABLE_PATTERN = /^https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com)$/;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Internal server error';
}

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
        persistSession: false,
      },
    });

    const body = await req.json();
    const { action } = body;

    if (action === 'validate-invitation') {
      const { token, email } = body;

      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .rpc('validate_invitation_token', { p_token: token, p_email: email });

      if (tokenError) {
        console.error('Token validation error:', tokenError);
        return new Response(
          JSON.stringify({ is_valid: false, error_message: 'Error validating token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = tokenData?.[0] || { is_valid: false, error_message: 'Token not found' };
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'setup-password') {
      const { email, token, newPassword } = body;

      const { data: tokenData } = await supabaseAdmin
        .rpc('validate_invitation_token', { p_token: token, p_email: email });

      const tokenResult = tokenData?.[0];
      if (!tokenResult?.is_valid) {
        return new Response(
          JSON.stringify({ error: tokenResult?.error_message || 'Invalid token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: authUserId } = await supabaseAdmin
        .rpc('get_user_auth_id_by_email', { p_email: email });

      if (!authUserId) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        authUserId,
        {
          password: newPassword,
          email_confirm: true,
        }
      );

      if (passwordError) {
        console.error('Password update error:', passwordError);
        throw passwordError;
      }

      await supabaseAdmin.rpc('mark_invitation_token_used', { p_token: token });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in account-setup function:', error);
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
