# Admin Setup Troubleshooting Guide

## 🚨 Problem: Can't Make Yourself Admin

Let's fix this step by step!

## 📋 Step-by-Step Fix

### Step 1: Make Sure You Have an Account

First, you need to have created an account:

1. Start your dev server: `npm run dev`
2. Go to http://localhost:3000/signup
3. Create your account
4. You should be logged in and see the dashboard

**If signup page doesn't work** (public signup disabled):
- Go to Supabase: https://app.supabase.com/project/xorhevhwffqawrjahxjv/auth/users
- Click "Add user"
- Enter your email and password
- Create the user

### Step 2: Find Your Exact Email

1. Go to: https://app.supabase.com/project/xorhevhwffqawrjahxjv/auth/users
2. Find your user in the list
3. Copy your **exact email** (including any spaces, capitalization, etc.)
4. Also copy your **User ID** (long string like `abc123-def456-...`)

### Step 3: Run the Fix Script

1. Go to SQL Editor: https://app.supabase.com/project/xorhevhwffqawrjahxjv/sql/new
2. Open the `FIX_ADMIN_SETUP.sql` file I just created
3. Run **STEP 1** first to create the table (if needed)
4. Run **STEP 2** to see all users
5. Find your email and user ID in the results
6. Run **STEP 4 METHOD 1** - Replace `'your-email@example.com'` with YOUR actual email
7. Run **STEP 5** to verify

### Step 4: If That Didn't Work - Try Method 2

If the email method failed:

1. Use **STEP 4 ALTERNATIVE** instead
2. Replace `'paste-your-user-id-here'` with your actual User ID from Step 2
3. Run it
4. Run **STEP 5** to verify

### Step 5: If Still Not Working - RLS Issue

Sometimes RLS policies block the first admin. Try this:

1. Run **STEP 6** in the SQL file
2. This temporarily allows admin creation
3. Try **STEP 4** again
4. Then run the DROP POLICY at the end of STEP 6 to re-secure

## 🎯 Quick Copy-Paste Solution

### Option A: By Email

Replace `YOUR_EMAIL_HERE` with your actual email:

```sql
-- Create table if needed
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'receptionist')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Make yourself admin
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Check it worked
SELECT u.email, ur.role 
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'YOUR_EMAIL_HERE';
```

### Option B: By User ID

Replace `YOUR_USER_ID_HERE` with your actual user ID:

```sql
-- Create table if needed
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'receptionist')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Make yourself admin
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR_USER_ID_HERE', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Check it worked
SELECT u.email, ur.role 
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

## 🔍 Common Issues

### Issue: "Table user_roles doesn't exist"

**Solution:** Run this first:

```sql
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'receptionist')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

### Issue: "No rows returned" or "0 rows affected"

**Possible causes:**
1. Email doesn't match exactly (check for typos, spaces, capitals)
2. You haven't created your account yet
3. Wrong user ID

**Solution:** 
- Go to auth.users table and find your exact email
- Use Method 2 (by User ID) instead

### Issue: "RLS policy violation"

**Solution:** Temporarily disable RLS:

```sql
-- Disable RLS temporarily
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Make yourself admin
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Add policy for admins
CREATE POLICY "Admins can do anything" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );
```

## ✅ How to Verify It Worked

After running the SQL, check:

1. **In Supabase:**
   ```sql
   SELECT * FROM user_roles;
   ```
   Should show your user_id with role = 'admin'

2. **In Your App:**
   - Logout and login again
   - Go to http://localhost:3000
   - You should see the "Users" link in the header
   - Click it - you should be able to access the page

## 🆘 Still Not Working?

If none of this works, tell me:

1. What error message you see in Supabase
2. Result of this query:
   ```sql
   SELECT email FROM auth.users ORDER BY created_at DESC LIMIT 5;
   ```
3. Result of this query:
   ```sql
   SELECT * FROM user_roles;
   ```

And I'll help you debug further!

## 📞 Next Steps After Admin is Set

Once you're successfully set as admin:

1. ✅ Add the service role key to `.env.local`
2. ✅ Restart your dev server
3. ✅ Test creating users from the interface
4. ✅ Disable public signup in Supabase

---

**Don't worry - we'll get this working!** Just follow the steps carefully and let me know where it's failing.
