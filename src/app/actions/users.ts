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
  // Check if current user is admin
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { error: 'Only admins can create users' };
  }

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;
  const role = formData.get('role') as string;

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
    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'Failed to create user' };
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
  // Check if current user is admin
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { error: 'Only admins can delete users' };
  }

  // Import admin client
  const { createAdminClient } = await import('@/utils/supabase/server');
  const adminClient = await createAdminClient();

  // Delete user from auth (this will cascade delete the role)
  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/users');
  return { success: true, message: 'User deleted successfully' };
}

/**
 * Reset user password
 */
export async function resetUserPassword(userId: string, newPassword: string) {
  // Check if current user is admin
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { error: 'Only admins can reset passwords' };
  }

  // Import admin client
  const { createAdminClient } = await import('@/utils/supabase/server');
  const adminClient = await createAdminClient();

  // Update user password
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  return { 
    success: true, 
    message: 'Password reset successfully',
    newPassword: newPassword // Return so admin can share it
  };
}
