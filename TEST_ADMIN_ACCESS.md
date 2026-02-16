# Test Admin Access - Step by Step

## ✅ Your admin role is set! Now let's test access.

### Step 1: Logout and Login (REQUIRED!)

The app caches your session, so you MUST logout and login:

1. Go to http://localhost:3000
2. Click **"Sign Out"** button (top right)
3. You'll be redirected to `/login`
4. Enter your credentials
5. Click **"Sign In"**

### Step 2: Check the Header

After logging in, look at the top right of the page. You should see:

```
[Your Email] [👥 Users] [🚪 Sign Out]
```

**Do you see the "Users" link?**
- ✅ **YES** → Great! Click it and you should access the page
- ❌ **NO** → Continue to Step 3

### Step 3: Check Browser Console

If you don't see the Users link:

1. Press **F12** to open Developer Tools
2. Click **Console** tab
3. Refresh the page
4. Look for any error messages
5. **Copy and paste** any errors you see

You should see messages like:
```
Checking admin status for user: your@email.com
User role: admin
```

**What do you see?**

### Step 4: If Still Not Working - Fix RLS Policies

Run the `FIX_USER_ROLES_POLICIES.sql` script in Supabase:

1. Go to: https://app.supabase.com/project/xorhevhwffqawrjahxjv/sql/new
2. Copy all content from `FIX_USER_ROLES_POLICIES.sql`
3. Click **Run**
4. Look at the results - should show your policies created
5. **Then logout and login again**

### Step 5: Manual Test in Supabase

Test if you can read your role directly:

```sql
-- This should return your admin role
SELECT 
  u.email,
  ur.role,
  ur.user_id
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'your@email.com';
```

**Expected result:** Your email with role = 'admin'

### Step 6: Debug Checklist

Check these in order:

- [ ] My admin role is in the database (verified in Step 5)
- [ ] I logged out and logged back in
- [ ] I see "Users" link in the header
- [ ] Clicking "Users" takes me to the page
- [ ] I can see the create user form

**Where did it fail?**

## 🚨 Common Issues

### Issue: "Users" link not showing

**Cause:** You haven't logged out and back in.

**Fix:** 
1. Click Sign Out
2. Log back in
3. Header should refresh with Users link

### Issue: "Access Denied" or redirect to dashboard

**Cause:** RLS policies are blocking role lookup.

**Fix:** 
1. Run `FIX_USER_ROLES_POLICIES.sql`
2. Logout and login again

### Issue: Console shows "Error fetching role"

**Cause:** RLS policy blocking your own role lookup.

**Fix:**
```sql
-- Allow users to read their own role
DROP POLICY IF EXISTS "Users can read their own role" ON user_roles;
CREATE POLICY "Users can read their own role" ON user_roles
  FOR SELECT 
  USING (auth.uid() = user_id);
```

## 💡 Quick Debug Commands

Run these in Supabase SQL Editor to check everything:

```sql
-- 1. Check if you're admin
SELECT 
  u.email,
  ur.role
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'your@email.com';

-- 2. Check all policies on user_roles
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'user_roles';

-- 3. Test if SELECT works with RLS
SET request.jwt.claims.sub = 'your-user-id';
SELECT * FROM user_roles WHERE user_id = 'your-user-id';
```

## ✅ Success Indicators

You'll know it's working when:

1. ✅ You see "Users" link in header
2. ✅ Clicking it loads the user management page
3. ✅ You see "Create New User" form
4. ✅ No errors in browser console

---

**Still stuck? Let me know:**
1. Did you logout and login?
2. Do you see "Users" link in header?
3. What errors (if any) in browser console?
4. What shows when you run the SQL tests above?
