-- CREATE YOUR FIRST ADMIN USER
-- Run this AFTER you create your first account through the signup page

-- STEP 1: First, sign up through the website (/signup) to create your account
-- STEP 2: Then run this query, replacing 'your-email@example.com' with your actual email

-- Make your account an admin
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'your-email@example.com'  -- ← REPLACE WITH YOUR EMAIL
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Verify it worked
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'your-email@example.com';  -- ← REPLACE WITH YOUR EMAIL
