-- URGENT FIX: Allow users to read their own role
-- This is what's blocking you from accessing the Users page

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

-- CRITICAL: Allow users to read their own role
-- This MUST work for admin check to work
CREATE POLICY "Users can read their own role" ON user_roles
  FOR SELECT 
  USING (user_id = auth.uid());

-- Allow admins to read all roles
CREATE POLICY "Admins can read all roles" ON user_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Allow admins to insert roles
CREATE POLICY "Admins can insert roles" ON user_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Allow admins to update roles
CREATE POLICY "Admins can update roles" ON user_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Allow admins to delete roles
CREATE POLICY "Admins can delete roles" ON user_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'user_roles';

-- Test if you can now read your own role
-- This should return your admin role
SELECT 
  user_id,
  role,
  created_at
FROM user_roles
WHERE user_id = auth.uid();

-- If above returns nothing, there's still an issue
-- Check what user Supabase thinks you are
SELECT auth.uid() AS my_user_id;

-- Check if your role exists
SELECT * FROM user_roles;
