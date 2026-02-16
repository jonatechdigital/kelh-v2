-- FIX RLS POLICIES FOR USER_ROLES TABLE
-- Run this if you still can't access the users page after logout/login

-- Drop all existing policies on user_roles
DROP POLICY IF EXISTS "Users can read their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Allow first admin creation" ON user_roles;
DROP POLICY IF EXISTS "Admins can do anything" ON user_roles;

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can read their own role (CRITICAL!)
CREATE POLICY "Users can read their own role" ON user_roles
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy 2: Admins can read ALL roles
CREATE POLICY "Admins can read all roles" ON user_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy 3: Admins can insert new roles
CREATE POLICY "Admins can insert roles" ON user_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy 4: Admins can update roles
CREATE POLICY "Admins can update roles" ON user_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy 5: Admins can delete roles
CREATE POLICY "Admins can delete roles" ON user_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- Test: Check if you can read your own role
SELECT 
  user_id,
  role,
  created_at
FROM user_roles
WHERE user_id = auth.uid();

-- This should return YOUR admin role
