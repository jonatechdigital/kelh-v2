'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Check if current user is an admin
 */
export async function checkIsAdmin() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return false;
    }

    console.log('Checking admin status for user:', user.email);

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError) {
      console.error('Error fetching role:', roleError);
      return false;
    }

    console.log('User role:', userRole?.role);
    return userRole?.role === 'admin';
  } catch (error) {
    console.error('Error in checkIsAdmin:', error);
    return false;
  }
}

/**
 * Create a new user with email and password
 */
export async function createUser(formData: FormData) {
  try {
    // Check if current user is admin
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      return { error: 'Only admins can create users' };
    }

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('full_name') as string;
    const role = formData.get('role') as string;

    // Validate required fields
    if (!email || !password) {
      return { error: 'Email and password are required' };
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      return { 
        error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY environment variable is missing. Please contact your system administrator.' 
      };
    }

    // Import admin client
    const { createAdminClient } = await import('@/utils/supabase/server');
    const adminClient = await createAdminClient();

    // Create the user using auth.admin API
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    });

    if (error) {
      console.error('Error creating user:', error);
      return { error: error.message };
    }

    if (!data.user) {
      return { error: 'Failed to create user - no user data returned' };
    }

    // Assign role to the new user
    const regularClient = await createClient();
    const { error: roleError } = await regularClient
      .from('user_roles')
      .insert({
        user_id: data.user.id,
        role: role,
      });

    if (roleError) {
      console.error('Role assignment error:', roleError);
      return { error: `User created but role assignment failed: ${roleError.message}` };
    }

    revalidatePath('/admin/users');
    return { 
      success: true, 
      message: `User created successfully!`,
      email: email,
      password: password, // Return password so admin can share it
      role: role
    };
  } catch (error) {
    console.error('Unexpected error in createUser:', error);
    return { 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, role: string) {
  const supabase = await createClient();
  
  // Check if current user is admin
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { error: 'Only admins can update roles' };
  }

  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role: role }, { onConflict: 'user_id' });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string) {
  try {
    // Check if current user is admin
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      return { error: 'Only admins can delete users' };
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { 
        error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing.' 
      };
    }

    // Import admin client
    const { createAdminClient } = await import('@/utils/supabase/server');
    const adminClient = await createAdminClient();

    // Delete user from auth (this will cascade delete the role)
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Error deleting user:', error);
      return { error: error.message };
    }

    revalidatePath('/admin/users');
    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Unexpected error in deleteUser:', error);
    return { 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Reset user password
 */
export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    // Check if current user is admin
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      return { error: 'Only admins can reset passwords' };
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { 
        error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing.' 
      };
    }

    // Import admin client
    const { createAdminClient } = await import('@/utils/supabase/server');
    const adminClient = await createAdminClient();

    // Update user password
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error('Error resetting password:', error);
      return { error: error.message };
    }

    return { 
      success: true, 
      message: 'Password reset successfully',
      newPassword: newPassword // Return so admin can share it
    };
  } catch (error) {
    console.error('Unexpected error in resetUserPassword:', error);
    return { 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}
