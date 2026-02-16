-- FINAL FIX: Working RLS policies for user_roles
-- This will allow admins to work while keeping security

-- Step 1: Clean slate - remove ALL policies
DROP POLICY IF EXISTS "Users can read their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON user_roles;

-- Step 2: Enable RLS (if not already enabled)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create WORKING policies

-- Policy 1: CRITICAL - Allow ANY authenticated user to read their OWN role
-- This is what makes checkIsAdmin() work
CREATE POLICY "allow_read_own_role" ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Allow admins to read ALL roles (for viewing users list)
CREATE POLICY "allow_admin_read_all" ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy 3: Allow admins to insert new roles (when creating users)
CREATE POLICY "allow_admin_insert" ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy 4: Allow admins to update roles
CREATE POLICY "allow_admin_update" ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy 5: Allow admins to delete roles
CREATE POLICY "allow_admin_delete" ON user_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Verify all policies were created
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- Test: Check if you can read your own role (MUST WORK!)
SELECT 
  user_id,
  role,
  created_at
FROM user_roles
WHERE user_id = auth.uid();

-- This should return your admin role
-- If it returns nothing, there's still a problem
