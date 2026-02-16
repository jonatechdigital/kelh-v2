-- SECURE REGISTRATION SETUP
-- This disables public signup and requires admin approval

-- Step 1: Disable public signup in Supabase
-- Go to: Authentication → Providers → Email
-- Toggle OFF: "Enable sign ups"

-- Step 2: Create a user_roles table to manage permissions
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'receptionist')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read roles
CREATE POLICY "Users can read their own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Only admins can manage roles
CREATE POLICY "Admins can manage all roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Step 3: Create admin_invitations table for invite-only system
CREATE TABLE IF NOT EXISTS admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'receptionist')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Enable RLS on invitations
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invitations
CREATE POLICY "Admins can manage invitations" ON admin_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Anyone can view their own invitation (for signup)
CREATE POLICY "Users can view their invitation" ON admin_invitations
  FOR SELECT USING (email = auth.jwt()->>'email');

-- Step 4: Function to check if user has required role
CREATE OR REPLACE FUNCTION has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update RLS policies to check roles (optional - for role-based access)
-- Example: Only admins can delete patients
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON patients;
CREATE POLICY "Enable delete access for admins only" ON patients
  FOR DELETE USING (has_role('admin'));

-- View all current users (for admin reference)
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  COALESCE(ur.role, 'no role assigned') as role
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;
