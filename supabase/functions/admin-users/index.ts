import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Get the authorized user for the current auth user
    console.log('Getting authorized user for auth_user_id:', user.id);
    
    const { data: authorizedUser, error: authUserError } = await supabaseAdmin
      .schema('internal')
      .from('authorized_users')
      .select('id, email, is_active')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    console.log('Authorized user:', authorizedUser, 'Error:', authUserError);

    if (!authorizedUser) {
      return new Response(
        JSON.stringify({ error: 'User not found in authorized users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

      // Build update object with only provided fields
      const updateData: Record<string, any> = {};
      if (full_name !== undefined) updateData.full_name = full_name;
      if (phone !== undefined) updateData.phone = phone;
      if (position !== undefined) updateData.job_position = position;

      const { error: updateError } = await supabaseAdmin
        .schema('internal')
        .from('authorized_users')
        .update(updateData)
        .eq('id', userId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For all other actions, check if user has admin role
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .schema('internal')
      .from('user_roles')
      .select(`
        role_id,
        roles!inner(name)
      `)
      .eq('user_id', authorizedUser.id);

    console.log('User roles:', userRoles, 'Error:', rolesError);

    const isAdmin = userRoles?.some((ur: any) => ur.roles?.name === 'admin');
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
        // List all authorized users with their roles
        const { data: users, error } = await supabaseAdmin
          .schema('internal')
          .from('authorized_users')
          .select(`
            id,
            email,
            full_name,
            phone,
            department,
            job_position,
            is_active,
            created_at,
            last_login_at,
            user_roles(
              role:roles(name)
            )
          `)
          .order('created_at', { ascending: false });

        console.log('Users fetched:', users?.length, 'Error:', error);

        if (error) throw error;

        // Transform the data to flatten roles and rename job_position to position for frontend
        const transformedUsers = users?.map(user => ({
          ...user,
          position: user.job_position, // Map job_position to position for frontend
          job_position: undefined,
          roles: user.user_roles?.map((ur: any) => ur.role?.name).filter(Boolean) || [],
          user_roles: undefined,
        }));

        console.log('Returning users:', transformedUsers?.length);

        return new Response(
          JSON.stringify({ users: transformedUsers }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list-roles': {
        const { data: roles, error } = await supabaseAdmin
          .schema('internal')
          .from('roles')
          .select('id, name, display_name, level')
          .order('level', { ascending: true });

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

        // Check if user already exists in authorized_users
        const { data: existingUser } = await supabaseAdmin
          .schema('internal')
          .from('authorized_users')
          .select('id')
          .eq('email', userData.email)
          .single();

        if (existingUser) {
          return new Response(
            JSON.stringify({ error: 'User with this email already exists' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create the auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: userData.full_name,
          }
        });

        if (authError) throw authError;

        // Create the authorized user record
        const { data: newUser, error: insertError } = await supabaseAdmin
          .schema('internal')
          .from('authorized_users')
          .insert({
            email: userData.email,
            full_name: userData.full_name,
            phone: userData.phone,
            department: userData.department || 'COMMERCIAL',
            job_position: userData.position,
            auth_user_id: authData.user?.id,
            is_active: true,
          })
          .select()
          .single();

        if (insertError) {
          // Rollback: delete the auth user if authorized_users insert fails
          await supabaseAdmin.auth.admin.deleteUser(authData.user!.id);
          throw insertError;
        }

        // Assign roles
        if (userData.roles && userData.roles.length > 0) {
          const { data: roleRecords } = await supabaseAdmin
            .schema('internal')
            .from('roles')
            .select('id, name')
            .in('name', userData.roles);

          if (roleRecords && roleRecords.length > 0) {
            const roleAssignments = roleRecords.map(role => ({
              user_id: newUser.id,
              role_id: role.id,
              assigned_by: userInfo?.id,
            }));

            await supabaseAdmin.schema('internal').from('user_roles').insert(roleAssignments);
          }
        }

        return new Response(
          JSON.stringify({ success: true, user: newUser }),
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

        // Get the user to update
        const { data: targetUser, error: fetchError } = await supabaseAdmin
          .schema('internal')
          .from('authorized_users')
          .select('id, auth_user_id')
          .eq('id', userId)
          .single();

        if (fetchError || !targetUser) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update the authorized user record
        const { error: updateError } = await supabaseAdmin
          .schema('internal')
          .from('authorized_users')
          .update({
            full_name: userData.full_name,
            phone: userData.phone,
            department: userData.department,
            job_position: userData.position,
            is_active: userData.is_active,
          })
          .eq('id', userId);

        if (updateError) throw updateError;

        // Update roles
        if (userData.roles !== undefined) {
          // Delete existing roles
          await supabaseAdmin
            .schema('internal')
            .from('user_roles')
            .delete()
            .eq('user_id', userId);

          // Assign new roles
          if (userData.roles.length > 0) {
            const { data: roleRecords } = await supabaseAdmin
              .schema('internal')
              .from('roles')
              .select('id, name')
              .in('name', userData.roles);

            if (roleRecords && roleRecords.length > 0) {
              const roleAssignments = roleRecords.map(role => ({
                user_id: userId,
                role_id: role.id,
                assigned_by: userInfo?.id,
              }));

              await supabaseAdmin.schema('internal').from('user_roles').insert(roleAssignments);
            }
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
        if (userId === userInfo?.id) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete your own account' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get the user to delete
        const { data: targetUser, error: fetchError } = await supabaseAdmin
          .schema('internal')
          .from('authorized_users')
          .select('id, auth_user_id')
          .eq('id', userId)
          .single();

        if (fetchError || !targetUser) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete roles first
        await supabaseAdmin
          .schema('internal')
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        // Delete the authorized user record
        const { error: deleteError } = await supabaseAdmin
          .schema('internal')
          .from('authorized_users')
          .delete()
          .eq('id', userId);

        if (deleteError) throw deleteError;

        // Delete the auth user if exists
        if (targetUser.auth_user_id) {
          await supabaseAdmin.auth.admin.deleteUser(targetUser.auth_user_id);
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

        // Get the user
        const { data: targetUser, error: fetchError } = await supabaseAdmin
          .schema('internal')
          .from('authorized_users')
          .select('id, auth_user_id')
          .eq('id', userId)
          .single();

        if (fetchError || !targetUser || !targetUser.auth_user_id) {
          return new Response(
            JSON.stringify({ error: 'User not found or not linked to auth' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update the password
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          targetUser.auth_user_id,
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
        if (userId === userInfo?.id && !isActive) {
          return new Response(
            JSON.stringify({ error: 'Cannot deactivate your own account' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin
          .schema('internal')
          .from('authorized_users')
          .update({ is_active: isActive })
          .eq('id', userId);

        if (updateError) throw updateError;

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
