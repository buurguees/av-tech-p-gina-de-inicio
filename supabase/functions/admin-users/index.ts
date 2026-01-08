import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS configuration - restrict to allowed origins
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

// Pattern for Lovable preview URLs
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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create regular client to verify the requesting user
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

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the authorized user using RPC function
    console.log('Getting authorized user for auth_user_id:', user.id);
    
    const { data: authorizedUserData, error: authUserError } = await supabaseAdmin
      .rpc('get_authorized_user_by_auth_id', { p_auth_user_id: user.id });

    console.log('Authorized user:', authorizedUserData, 'Error:', authUserError);

    if (authUserError || !authorizedUserData || authorizedUserData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'User not found in authorized users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authorizedUser = authorizedUserData[0];

    const body = await req.json();
    const { action } = body;

    console.log('Action requested:', action);

    // Handle update_own_info action - doesn't require admin
    if (action === 'update_own_info') {
      const { userId, full_name, phone, position } = body;

      // Verify user is updating their own info
      if (userId !== authorizedUser.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Can only update your own information' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await supabaseAdmin
        .rpc('update_own_user_info', { 
          p_user_id: userId,
          p_full_name: full_name || null,
          p_phone: phone || null,
          p_job_position: position || null
        });

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For all other actions, check if user has admin role
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .rpc('get_user_roles_by_user_id', { p_user_id: authorizedUser.id });

    console.log('User roles:', userRoles, 'Error:', rolesError);

    const isAdmin = userRoles?.some((ur: any) => ur.role_name === 'admin');
    console.log('Is admin:', isAdmin);

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store userInfo for later use
    const userInfo = { id: authorizedUser.id, email: authorizedUser.email };

    switch (action) {
      case 'list': {
        console.log('Fetching users list...');
        
        const { data: users, error } = await supabaseAdmin.rpc('list_authorized_users');

        console.log('Users fetched:', users?.length, 'Error:', error);

        if (error) throw error;

        // Transform the data to rename job_position to position for frontend
        const transformedUsers = users?.map((user: any) => ({
          ...user,
          position: user.job_position,
          setup_completed: user.setup_completed ?? true,
          invitation_sent_at: user.invitation_sent_at || null,
          invitation_expires_at: user.invitation_expires_at || null,
          invitation_days_remaining: user.invitation_days_remaining ?? null,
        }));

        console.log('Returning users:', transformedUsers?.length);

        return new Response(
          JSON.stringify({ users: transformedUsers }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list-roles': {
        const { data: roles, error } = await supabaseAdmin.rpc('list_roles');

        if (error) throw error;

        return new Response(
          JSON.stringify({ roles }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        const { userData } = body;
        
        if (!userData.email || !userData.password || !userData.full_name) {
          return new Response(
            JSON.stringify({ error: 'Email, password and full_name are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate email domain
        if (!userData.email.endsWith('@avtechesdeveniments.com')) {
          return new Response(
            JSON.stringify({ error: 'Email must be from @avtechesdeveniments.com domain' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if user already exists
        const { data: emailExists } = await supabaseAdmin
          .rpc('check_email_exists', { p_email: userData.email });

        if (emailExists) {
          return new Response(
            JSON.stringify({ error: 'User with this email already exists' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create the auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            full_name: userData.full_name,
          }
        });

        if (authError) throw authError;

        // Create the authorized user record
        const { data: newUserId, error: insertError } = await supabaseAdmin
          .rpc('create_authorized_user', {
            p_email: userData.email,
            p_full_name: userData.full_name,
            p_phone: userData.phone || null,
            p_department: userData.department || 'COMMERCIAL',
            p_job_position: userData.position || null,
            p_auth_user_id: authData.user?.id
          });

        if (insertError) {
          // Rollback: delete the auth user if authorized_users insert fails
          await supabaseAdmin.auth.admin.deleteUser(authData.user!.id);
          throw insertError;
        }

        // Assign roles
        if (userData.roles && userData.roles.length > 0) {
          for (const roleName of userData.roles) {
            await supabaseAdmin.rpc('assign_user_role', {
              p_user_id: newUserId,
              p_role_name: roleName,
              p_assigned_by: userInfo.id
            });
          }
        }

        return new Response(
          JSON.stringify({ success: true, userId: newUserId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        const { userId, userData } = body;

        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update the authorized user record
        const { error: updateError } = await supabaseAdmin
          .rpc('update_authorized_user', {
            p_user_id: userId,
            p_full_name: userData.full_name,
            p_phone: userData.phone || null,
            p_department: userData.department,
            p_job_position: userData.position || null,
            p_is_active: userData.is_active
          });

        if (updateError) throw updateError;

        // Update roles
        if (userData.roles !== undefined) {
          // Clear existing roles
          await supabaseAdmin.rpc('clear_user_roles', { p_user_id: userId });

          // Assign new roles
          for (const roleName of userData.roles) {
            await supabaseAdmin.rpc('assign_user_role', {
              p_user_id: userId,
              p_role_name: roleName,
              p_assigned_by: userInfo.id
            });
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const { userId } = body;

        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prevent self-deletion
        if (userId === userInfo.id) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete your own account' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete the user and get auth_user_id
        const { data: authUserId, error: deleteError } = await supabaseAdmin
          .rpc('delete_authorized_user', { p_user_id: userId });

        if (deleteError) throw deleteError;

        // Delete the auth user if exists
        if (authUserId) {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset-password': {
        const { userId, newPassword } = body;

        if (!userId || !newPassword) {
          return new Response(
            JSON.stringify({ error: 'userId and newPassword are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get the auth_user_id
        const { data: authUserId, error: fetchError } = await supabaseAdmin
          .rpc('get_user_auth_id', { p_user_id: userId });

        if (fetchError || !authUserId) {
          return new Response(
            JSON.stringify({ error: 'User not found or not linked to auth' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update the password
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          authUserId,
          { password: newPassword }
        );

        if (passwordError) throw passwordError;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'toggle-status': {
        const { userId, isActive } = body;

        if (!userId || isActive === undefined) {
          return new Response(
            JSON.stringify({ error: 'userId and isActive are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prevent self-deactivation
        if (userId === userInfo.id && !isActive) {
          return new Response(
            JSON.stringify({ error: 'Cannot deactivate your own account' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin
          .rpc('toggle_user_status', { p_user_id: userId, p_is_active: isActive });

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'validate-invitation': {
        const { token, email } = body;
        
        const { data: tokenData, error: tokenError } = await supabaseAdmin
          .rpc('validate_invitation_token', { p_token: token, p_email: email });
        
        if (tokenError) {
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

      case 'setup-password': {
        const { email, token, newPassword } = body;
        
        // Validate token
        const { data: tokenData } = await supabaseAdmin
          .rpc('validate_invitation_token', { p_token: token, p_email: email });
        
        const tokenResult = tokenData?.[0];
        if (!tokenResult?.is_valid) {
          return new Response(
            JSON.stringify({ error: tokenResult?.error_message || 'Invalid token' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get auth user id
        const { data: authUserId } = await supabaseAdmin
          .rpc('get_user_auth_id_by_email', { p_email: email });
        
        if (!authUserId) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Update password AND confirm email
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          authUserId,
          { 
            password: newPassword,
            email_confirm: true  // ✅ Confirmar email manualmente
          }
        );
        
        if (passwordError) throw passwordError;
        
        // Mark token as used
        await supabaseAdmin.rpc('mark_invitation_token_used', { p_token: token });
        
        return new Response(
          JSON.stringify({ success: true }),
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
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
