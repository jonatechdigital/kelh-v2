# Secure User Registration Setup

## 🚨 Important: Disable Public Signup

Your hospital management system should **NOT** allow anyone to sign up. Here's how to secure it:

## 🔒 Step-by-Step Security Setup

### Step 1: Disable Public Signup in Supabase (CRITICAL)

1. Go to your Supabase Dashboard: https://app.supabase.com/project/xorhevhwffqawrjahxjv
2. Navigate to **Authentication** → **Providers**
3. Click on **Email** provider
4. Scroll to find **"Enable sign ups"**
5. **Toggle it OFF** ❌

**Result:** Now only you (as admin) can create user accounts. The public signup page will no longer work.

### Step 2: Create Role Management System

1. Open Supabase SQL Editor: https://app.supabase.com/project/xorhevhwffqawrjahxjv/sql
2. Run the `SECURE_REGISTRATION.sql` script
3. This creates:
   - `user_roles` table (admin, staff, receptionist)
   - `admin_invitations` table (invite-only system)
   - Role-based permissions

### Step 3: Create Your First Admin Account

**Option A: Via Website (Before Disabling Signup)**
1. Go to http://localhost:3000/signup
2. Create your account with your email
3. Then run `CREATE_ADMIN_USER.sql` in Supabase (replace email with yours)
4. This makes your account an admin

**Option B: Via Supabase Dashboard (After Disabling Signup)**
1. Go to Supabase Dashboard → Authentication → Users
2. Click **"Add user"**
3. Enter your email and password
4. Click **"Create user"**
5. Run `CREATE_ADMIN_USER.sql` to make yourself admin

### Step 4: Disable Public Signup (if you haven't already)

Now that you have an admin account, disable public signup following Step 1 above.

## 🎯 How It Works Now

### Old (Insecure) Flow:
```
Anyone → Signup Page → Create Account → Access System ❌
```

### New (Secure) Flow:
```
Admin → Invite User via Email → User Creates Account → Access System ✅
```

## 👥 User Management Options

### Option 1: Invite-Only System (Recommended)

**For Admins:**
1. Visit `/admin/users` (admin-only page)
2. Enter user's email and role
3. Click "Send Invitation"
4. User receives invitation link
5. User creates account via invitation

**For New Users:**
1. Receive invitation email
2. Click link to signup page
3. Create account with invited email
4. Get role assigned automatically

### Option 2: Manual User Creation (Simple)

**As Admin:**
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" manually
3. Enter email, password, and send to user
4. Run SQL to assign role:
   ```sql
   INSERT INTO user_roles (user_id, role)
   SELECT id, 'staff'  -- or 'admin', 'receptionist'
   FROM auth.users
   WHERE email = 'newuser@hospital.com';
   ```

### Option 3: Temporary Public Signup (Not Recommended)

If you must allow open signup temporarily:
1. Keep public signup enabled
2. Set all new users to "pending" role
3. Manually approve each user
4. This is less secure and requires constant monitoring

## 🛡️ User Roles Explained

### Admin
- Full system access
- Can invite/manage users
- Can delete records
- Can view all reports
- Can configure system

### Staff
- Can manage patients
- Can record transactions
- Can view reports
- Cannot manage users
- Cannot delete records

### Receptionist
- Can check-in patients
- Can search patients
- Limited reporting access
- Cannot record expenses
- Cannot manage users

## 🔐 Security Best Practices

### ✅ DO:
- Disable public signup in production
- Use invite-only system
- Assign appropriate roles
- Review user list regularly
- Remove inactive users
- Use strong passwords
- Enable two-factor authentication (future enhancement)

### ❌ DON'T:
- Leave public signup enabled
- Give everyone admin access
- Share admin credentials
- Use weak passwords
- Skip role assignment
- Allow unauthorized access

## 📋 Admin Checklist

- [ ] Disabled public signup in Supabase
- [ ] Ran `SECURE_REGISTRATION.sql`
- [ ] Created your admin account
- [ ] Ran `CREATE_ADMIN_USER.sql` with your email
- [ ] Tested admin access
- [ ] Invited first team member
- [ ] Tested user creation flow
- [ ] Documented user credentials securely

## 🧪 Testing Your Security

### Test 1: Public Signup Blocked
1. Open incognito/private browser
2. Visit http://localhost:3000/signup
3. Try to create account
4. Should fail with error ❌

### Test 2: Admin Can Invite
1. Login as admin
2. Visit `/admin/users`
3. Invite a test user
4. Check invitation created ✅

### Test 3: Role Permissions Work
1. Create user with "staff" role
2. Login as that user
3. Verify they can't access admin pages
4. Verify they can access staff functions ✅

## 🆘 Troubleshooting

### "I locked myself out!"

**Solution:** Create new admin via Supabase Dashboard:
1. Go to Authentication → Users → Add user
2. Create new account
3. Run `CREATE_ADMIN_USER.sql` with new email

### "Users can still sign up!"

**Solution:** You didn't disable public signup:
1. Go to Authentication → Providers → Email
2. Turn OFF "Enable sign ups"

### "Invitation system not working"

**Solution:** Check if you ran `SECURE_REGISTRATION.sql`:
1. Go to SQL Editor
2. Check if `admin_invitations` table exists
3. Re-run the script if needed

## 📱 User Management Page

Access at: http://localhost:3000/admin/users

Features:
- Invite new users
- View all users
- See user roles
- Manage permissions

## 🚀 Next Steps

1. **Now:** Disable public signup ✅
2. **Now:** Create your admin account ✅
3. **Now:** Test the security ✅
4. **Soon:** Invite your team members
5. **Later:** Add role-based UI features
6. **Future:** Add two-factor authentication

## 📞 Need Help?

- Check Supabase auth logs for errors
- Verify RLS policies are active
- Test with different user roles
- Review SQL query results

---

**Remember:** A healthcare system must be secure by default. Never leave public signup enabled in production!
