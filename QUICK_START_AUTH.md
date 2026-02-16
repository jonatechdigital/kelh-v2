# Quick Start: Authentication System

## 🚀 Get Started in 3 Steps

### 1️⃣ Enable Email Auth in Supabase

Go to: https://app.supabase.com/project/xorhevhwffqawrjahxjv/auth/providers

**For Development (Quick Setup):**
- Make sure **Email** provider is enabled
- Under **Email Auth** settings:
  - **Confirm email**: Toggle OFF (faster testing)
  - Save changes

**For Production:**
- Keep **Confirm email** ON
- Configure custom SMTP if needed

### 2️⃣ Update Database Security

1. Open Supabase SQL Editor: https://app.supabase.com/project/xorhevhwffqawrjahxjv/sql
2. Copy contents from `UPDATE_RLS_POLICIES.sql`
3. Paste and click **Run**

This secures your database so only authenticated users can access data.

### 3️⃣ Test It Out

```bash
npm run dev
```

Visit http://localhost:3000

- You'll be redirected to `/login`
- Click **Sign up** to create an account
- After signup, you'll be logged in automatically
- Test the **Sign Out** button in the header
- Try logging back in

## 📋 What's New

### New Pages
- `/login` - User login page
- `/signup` - User registration page

### New Features
- 🔐 All pages now require authentication
- 👤 Header shows logged-in user email
- 🚪 Sign out button in header
- 🔄 Automatic session refresh
- 🛡️ Secure Row Level Security (RLS) on database

### Protected Routes
All existing pages now require login:
- `/` - Dashboard (home)
- `/patients` - Patient management
- `/expenses/new` - Record expenses
- `/reports` - View reports
- All other pages

## 🔒 How It Works

**When you visit any page:**
1. Middleware checks if you're logged in
2. If not logged in → redirect to `/login`
3. If logged in → allow access

**When you sign up/login:**
1. Credentials sent securely to Supabase
2. Session created and stored in secure cookie
3. Redirected to dashboard

**When you sign out:**
1. Session cleared
2. Redirected to login page

## 🎯 Default User Flow

```
User visits → Not authenticated → /login
             ↓
         Sign up/Login
             ↓
      Authenticated → Dashboard (/)
             ↓
      Can access all pages
             ↓
         Sign Out → /login
```

## 🧪 Testing Checklist

After setup, verify:

- [ ] Visiting `/` without login redirects to `/login`
- [ ] Can create account at `/signup`
- [ ] Can login with account credentials
- [ ] Header shows your email when logged in
- [ ] Can access dashboard and all pages when logged in
- [ ] Sign out button works
- [ ] After sign out, redirected to login
- [ ] Can't access dashboard when logged out

## 🐛 Troubleshooting

**Can't sign up or login?**
- Check Supabase dashboard for errors
- Make sure `.env.local` has correct keys
- Check browser console for errors

**"Invalid JWT" error?**
- Clear browser cookies
- Sign out and sign back in

**Can't access data after login?**
- Make sure you ran `UPDATE_RLS_POLICIES.sql`
- Check Supabase logs for RLS errors

**Stuck in redirect loop?**
- Clear all browser cookies for localhost
- Restart dev server
- Check middleware.ts configuration

## 💡 Tips

**Development:**
- Disable email confirmation for faster testing
- Use a test email like `test@test.com`
- Create multiple test accounts if needed

**Production:**
- Enable email confirmation
- Use real email addresses
- Set up custom SMTP for branded emails
- Consider adding password reset

## 📱 User Management

**View all users:**
Go to: https://app.supabase.com/project/xorhevhwffqawrjahxjv/auth/users

**Delete a test user:**
- Go to Auth → Users in Supabase
- Click on user → Delete user

**Reset user password (as admin):**
- Go to Auth → Users
- Click on user → Send password reset email

## 🎨 Customization

**Want to change the login page design?**
Edit: `src/app/login/page.tsx`

**Want to add more fields to signup?**
Edit: `src/app/signup/page.tsx` and `src/app/actions/auth.ts`

**Want to add user roles?**
1. Add role to user metadata in `signup` action
2. Update RLS policies to check roles
3. Add role-based UI logic

## 📚 Learn More

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js Middleware Docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Ready to go!** 🎉 Your app now has secure authentication. Users must log in to access any part of the system.
