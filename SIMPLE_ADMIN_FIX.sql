-- SIMPLE FIX: Create a function to check admin status
-- This bypasses the circular RLS issue

-- Step 1: Create a function that checks if user is admin
-- This runs with SECURITY DEFINER so it bypasses RLS
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = is_admin.user_id
    AND role = 'admin'
  );
END;
$$;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "allow_read_own_role" ON user_roles;
DROP POLICY IF EXISTS "allow_admin_read_all" ON user_roles;
DROP POLICY IF EXISTS "allow_admin_insert" ON user_roles;
DROP POLICY IF EXISTS "allow_admin_update" ON user_roles;
DROP POLICY IF EXISTS "allow_admin_delete" ON user_roles;
DROP POLICY IF EXISTS "Users can read their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;

-- Step 3: Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Simple policies using the function

-- Policy 1: Let users read their own role (CRITICAL)
CREATE POLICY "read_own_role" ON user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Let admins read ALL roles (using function)
CREATE POLICY "admin_read_all" ON user_roles
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Policy 3: Let admins insert roles
CREATE POLICY "admin_insert" ON user_roles
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Policy 4: Let admins update roles
CREATE POLICY "admin_update" ON user_roles
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- Policy 5: Let admins delete roles
CREATE POLICY "admin_delete" ON user_roles
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Test the function
SELECT is_admin(auth.uid()) AS am_i_admin;

-- Test reading your own role
SELECT * FROM user_roles WHERE user_id = auth.uid();

-- Both should work now!
