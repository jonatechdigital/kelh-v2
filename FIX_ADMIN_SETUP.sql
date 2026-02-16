-- TROUBLESHOOTING AND FIXING ADMIN SETUP
-- Run each section one at a time to diagnose and fix the issue

-- ==========================================
-- STEP 1: Check if user_roles table exists
-- ==========================================
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'user_roles'
) AS table_exists;

-- If returns FALSE, run the CREATE TABLE below:
-- If returns TRUE, skip to STEP 2

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'receptionist')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can read their own role" ON user_roles;
CREATE POLICY "Users can read their own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
CREATE POLICY "Admins can manage all roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ==========================================
-- STEP 2: Check all registered users
-- ==========================================
-- This shows you ALL users who have signed up
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- Copy your user ID from the results above

-- ==========================================
-- STEP 3: Check current user_roles
-- ==========================================
SELECT * FROM user_roles;

-- ==========================================
-- STEP 4: Make yourself admin (METHOD 1 - By Email)
-- ==========================================
-- Replace 'your-email@example.com' with YOUR EXACT email from STEP 2

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'your-email@example.com'  -- REPLACE THIS
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';

-- ==========================================
-- STEP 4 ALTERNATIVE: Make yourself admin (METHOD 2 - By User ID)
-- ==========================================
-- If METHOD 1 didn't work, use your user ID directly from STEP 2

INSERT INTO user_roles (user_id, role)
VALUES ('paste-your-user-id-here', 'admin')  -- REPLACE THIS
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';

-- ==========================================
-- STEP 5: Verify it worked
-- ==========================================
SELECT 
  u.email,
  u.id,
  ur.role,
  ur.created_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'your-email@example.com';  -- REPLACE THIS

-- Should show your email with role = 'admin'

-- ==========================================
-- STEP 6: Fix RLS policies if needed
-- ==========================================
-- Sometimes RLS blocks the first admin from being created
-- Temporarily allow inserts, then re-enable strict policies

DROP POLICY IF EXISTS "Allow first admin creation" ON user_roles;
CREATE POLICY "Allow first admin creation" ON user_roles
  FOR INSERT WITH CHECK (true);

-- Now try STEP 4 again, then remove this policy:
DROP POLICY IF EXISTS "Allow first admin creation" ON user_roles;
