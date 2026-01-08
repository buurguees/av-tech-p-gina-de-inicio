import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify the requesting user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin user info
    const { data: authorizedUserData, error: authUserError } = await supabaseAdmin
      .rpc('get_authorized_user_by_auth_id', { p_auth_user_id: user.id });

    if (authUserError || !authorizedUserData || authorizedUserData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'User not authorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authorizedUser = authorizedUserData[0];

    // Check admin role
    const { data: userRoles } = await supabaseAdmin
      .rpc('get_user_roles_by_user_id', { p_user_id: authorizedUser.id });

    const isAdmin = userRoles?.some((ur: any) => ur.role_name === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, role, invitedByName, resend } = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: 'Email and role are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email domain
    if (!email.endsWith('@avtechesdeveniments.com')) {
      return new Response(
        JSON.stringify({ error: 'Email must be from @avtechesdeveniments.com domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let newUserId: string;

    if (resend) {
      // For resend, get existing user id
      const { data: existingUser, error: userError } = await supabaseAdmin
        .rpc('get_user_id_by_email', { p_email: email });
      
      if (userError || !existingUser) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      newUserId = existingUser;
      console.log('Resending invitation to existing user:', newUserId);
    } else {
      // Check if user already exists
      const { data: emailExists } = await supabaseAdmin
        .rpc('check_email_exists', { p_email: email });

      if (emailExists) {
        return new Response(
          JSON.stringify({ error: 'User with this email already exists' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate a temporary password (user will set their own later)
      const tempPassword = crypto.randomUUID() + 'Aa1!';

      // Create the auth user with email confirmation required
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          pending_setup: true,
          invited_role: role,
        }
      });

      if (authError) {
        console.error('Auth creation error:', authError);
        throw authError;
      }

      // Create the authorized user record with pending status
      const { data: userId, error: insertError } = await supabaseAdmin
        .rpc('create_authorized_user', {
          p_email: email,
          p_full_name: 'Pendiente de configurar',
          p_phone: null,
          p_department: 'COMMERCIAL',
          p_job_position: null,
          p_auth_user_id: authData.user?.id
        });

      if (insertError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user!.id);
        console.error('Insert error:', insertError);
        throw insertError;
      }

      newUserId = userId;

      // Assign the role
      await supabaseAdmin.rpc('assign_user_role', {
        p_user_id: newUserId,
        p_role_name: role,
        p_assigned_by: authorizedUser.id
      });
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store the invitation token
    const { error: tokenError } = await supabaseAdmin
      .rpc('create_invitation_token', {
        p_user_id: newUserId,
        p_token: invitationToken,
        p_expires_at: expiresAt.toISOString()
      });

    if (tokenError) {
      console.error('Token creation error:', tokenError);
      // Continue anyway, will try alternative approach
    }

    // Build the invitation URL
    const baseUrl = origin || 'https://avtechesdeveniments.com';
    const invitationUrl = `${baseUrl}/nexo-av/setup-account?token=${invitationToken}&email=${encodeURIComponent(email)}`;

    // Get role display name
    const roleDisplayNames: Record<string, string> = {
      admin: 'Administrador',
      manager: 'Manager',
      sales: 'Comercial',
      tech: 'Técnico',
      viewer: 'Visor'
    };

    const roleDisplay = roleDisplayNames[role] || role;

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: "NEXO AV <noreply@avtechesdeveniments.com>",
      to: [email],
      subject: "Invitación a NEXO AV - Configura tu cuenta",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111111; border-radius: 16px; overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%); padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #333;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                        NEXO AV
                      </h1>
                      <p style="margin: 8px 0 0; color: #888888; font-size: 14px;">
                        Sistema de Gestión Empresarial
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 22px; font-weight: 600;">
                        ¡Bienvenido al equipo!
                      </h2>
                      
                      <p style="margin: 0 0 24px; color: #aaaaaa; font-size: 15px; line-height: 1.6;">
                        ${invitedByName || 'Un administrador'} te ha invitado a unirte a <strong style="color: #ffffff;">NEXO AV</strong> 
                        con el rol de <strong style="color: #ffffff;">${roleDisplay}</strong>.
                      </p>
                      
                      <p style="margin: 0 0 32px; color: #aaaaaa; font-size: 15px; line-height: 1.6;">
                        Para comenzar, necesitas configurar tu contraseña y completar tu perfil.
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 8px 0 32px;">
                            <a href="${invitationUrl}" 
                               style="display: inline-block; background-color: #ffffff; color: #000000; 
                                      text-decoration: none; padding: 16px 40px; border-radius: 8px; 
                                      font-weight: 600; font-size: 16px; letter-spacing: -0.2px;">
                              Configurar mi cuenta
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px; color: #888888; font-size: 13px;">
                          O copia y pega este enlace en tu navegador:
                        </p>
                        <p style="margin: 0; color: #ffffff; font-size: 13px; word-break: break-all;">
                          ${invitationUrl}
                        </p>
                      </div>
                      
                      <p style="margin: 0; color: #666666; font-size: 13px; line-height: 1.5;">
                        ⏰ Este enlace expira en <strong style="color: #888888;">7 días</strong>.<br>
                        Si no solicitaste esta invitación, puedes ignorar este email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #0a0a0a; padding: 24px 40px; text-align: center; border-top: 1px solid #222;">
                      <p style="margin: 0; color: #555555; font-size: 12px;">
                        © ${new Date().getFullYear()} AVTECH Esdeveniments. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Invitation email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUserId,
        message: 'Invitation sent successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error in send-user-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
