-- Create a view that shows user emails with their roles
-- This makes it easy to display user information

CREATE OR REPLACE VIEW user_roles_with_email AS
SELECT 
  ur.user_id,
  ur.role,
  ur.created_at,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id;

-- Grant access to authenticated users
GRANT SELECT ON user_roles_with_email TO authenticated;

-- Enable RLS on the view
ALTER VIEW user_roles_with_email SET (security_invoker = true);

-- Test it
SELECT * FROM user_roles_with_email ORDER BY created_at DESC;
