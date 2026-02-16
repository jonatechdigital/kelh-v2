# KELH V2 - Deployment Guide

## Required Environment Variables

To deploy KELH V2 to production (Vercel, etc.), you **MUST** configure these environment variables:

### 1. NEXT_PUBLIC_SUPABASE_URL
- **Value:** Your Supabase project URL
- **Example:** `https://xorhevhwffqawrjahxjv.supabase.co`
- **Where to find:** Supabase Dashboard → Settings → API → Project URL

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Value:** Your Supabase anonymous/public key
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find:** Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

### 3. SUPABASE_SERVICE_ROLE_KEY ⚠️ **CRITICAL**
- **Value:** Your Supabase service role key (secret)
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find:** Supabase Dashboard → Settings → API → Project API keys → `service_role` `secret`
- **⚠️ WARNING:** This key has full admin access. NEVER commit it to Git or expose it publicly!
- **Required for:** Creating users, deleting users, resetting passwords

---

## Deploying to Vercel

### Step 1: Push Your Code to GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Click "Import"

### Step 3: Configure Environment Variables
Before deploying, add the environment variables:

1. In the "Configure Project" screen, expand **"Environment Variables"**
2. Add each variable:

   **Variable 1:**
   - **Name:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** `https://xorhevhwffqawrjahxjv.supabase.co` (your actual URL)
   - **Environments:** Production, Preview, Development (all checked)

   **Variable 2:**
   - **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** Your anon key from Supabase
   - **Environments:** Production, Preview, Development (all checked)

   **Variable 3:** ⚠️ **CRITICAL**
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Your service role key from Supabase
   - **Environments:** Production, Preview, Development (all checked)

3. Click **"Deploy"**

### Step 4: Update Environment Variables (If Already Deployed)
If your app is already deployed but missing variables:

1. Go to your Vercel project dashboard
2. Click **"Settings"** tab
3. Click **"Environment Variables"** in the sidebar
4. Add the missing `SUPABASE_SERVICE_ROLE_KEY`:
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: Your service role key
   - Environments: Production, Preview, Development
5. Click **"Save"**
6. Go to **"Deployments"** tab
7. Click the 3 dots (•••) on the latest deployment
8. Click **"Redeploy"**
9. Check **"Use existing Build Cache"**
10. Click **"Redeploy"**

---

## Verifying the Deployment

After deployment:

1. Open your deployed app URL
2. Log in with an admin account
3. Go to **User Management** (`/admin/users`)
4. Try creating a test user

### ✅ Success Indicators:
- User creation completes successfully
- No "Creating User..." stuck state
- No "SUPABASE_SERVICE_ROLE_KEY is missing" error

### ❌ If It's Still Not Working:
1. Check Vercel deployment logs:
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the latest deployment
   - Check "Function Logs" for errors
2. Verify environment variables are set correctly:
   - Settings → Environment Variables
   - Make sure `SUPABASE_SERVICE_ROLE_KEY` exists
3. Check Supabase logs:
   - Supabase Dashboard → Logs → API Logs
   - Look for authentication errors

---

## Security Best Practices

### 🔒 Service Role Key Security
- **NEVER** commit `.env.local` to Git (it's in `.gitignore`)
- **NEVER** share the service role key publicly
- Only add it to secure environment variable systems (Vercel, Railway, etc.)
- Rotate the key if it's ever exposed

### 🔐 Production Security Checklist
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Admin role checked before user creation
- ✅ Service role key stored only in environment variables
- ✅ HTTPS enabled (automatic with Vercel)
- ✅ Auth tokens use secure cookies

---

## Getting Your Supabase Keys

### Finding Your Project Keys:
1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Click **Settings** (gear icon) in the sidebar
4. Click **API**
5. Scroll to **Project API keys**

You'll see:
- **URL:** Copy the "Project URL"
- **anon public:** This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role secret:** This is your `SUPABASE_SERVICE_ROLE_KEY` ⚠️

---

## Troubleshooting Common Issues

### Issue: "Creating User..." Stuck Forever
**Cause:** Missing `SUPABASE_SERVICE_ROLE_KEY` environment variable

**Solution:**
1. Add the service role key to Vercel environment variables
2. Redeploy the application
3. Clear browser cache and try again

### Issue: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing"
**Cause:** Environment variable not set in deployment

**Solution:**
1. Go to Vercel → Settings → Environment Variables
2. Add `SUPABASE_SERVICE_ROLE_KEY` with your service role key
3. Redeploy

### Issue: "Only admins can create users"
**Cause:** Current user doesn't have admin role

**Solution:**
1. Run the `CREATE_ADMIN_USER.sql` script in Supabase SQL Editor
2. Make sure your user email is set as admin in `user_roles` table

### Issue: "User created but role assignment failed"
**Cause:** RLS policy blocking role insertion

**Solution:**
1. Run the `UPDATE_RLS_POLICIES.sql` script
2. Verify `user_roles` table has proper RLS policies

---

## Additional Resources

- [Vercel Environment Variables Documentation](https://vercel.com/docs/projects/environment-variables)
- [Supabase Auth Admin Documentation](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
- [Next.js Environment Variables](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables)

---

## Support

If you continue to experience issues:
1. Check the browser console for errors
2. Check Vercel function logs
3. Check Supabase logs
4. Verify all environment variables are set correctly
5. Try redeploying after clearing build cache
