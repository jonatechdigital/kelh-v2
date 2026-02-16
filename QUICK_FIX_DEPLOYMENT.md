# 🚨 QUICK FIX: "Creating User..." Stuck Issue

## The Problem
Your deployed app gets stuck on "Creating User..." because the **`SUPABASE_SERVICE_ROLE_KEY`** environment variable is missing.

## The Solution (5 Minutes)

### Step 1: Get Your Service Role Key
1. Go to [supabase.com](https://supabase.com) and open your project
2. Click **Settings** (⚙️) → **API**
3. Find **"service_role"** under "Project API keys"
4. Click **"Copy"** to copy the key (starts with `eyJhbGciOiJIUzI1NiI...`)

### Step 2: Add to Vercel
1. Go to [vercel.com](https://vercel.com) and open your project
2. Click **Settings** → **Environment Variables**
3. Click **"Add New"**
4. Fill in:
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Paste your service role key
   - **Environments:** Check all (Production, Preview, Development)
5. Click **"Save"**

### Step 3: Redeploy
1. Click **"Deployments"** tab
2. Click the 3 dots (•••) on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete (1-2 minutes)

### Step 4: Test
1. Open your deployed app
2. Log in as admin
3. Go to User Management
4. Try creating a user
5. ✅ Should work now!

---

## Still Not Working?

### Check if the variable is set:
```bash
# In your terminal
vercel env ls
```

You should see `SUPABASE_SERVICE_ROLE_KEY` listed.

### View deployment logs:
1. Vercel Dashboard → Deployments → Latest
2. Click "View Function Logs"
3. Look for error messages

### Common errors and fixes:

**Error:** "SUPABASE_SERVICE_ROLE_KEY is missing"
- ✅ Follow steps above to add the environment variable

**Error:** "Only admins can create users"
- ✅ Run `CREATE_ADMIN_USER.sql` in Supabase to make yourself admin

**Error:** Network timeout
- ✅ Check if your Supabase project is paused (free tier)
- ✅ Verify the service role key is correct

---

## ⚠️ Security Warning
**NEVER:**
- ❌ Commit the service role key to Git
- ❌ Share it publicly
- ❌ Use it in client-side code

**ALWAYS:**
- ✅ Keep it in environment variables only
- ✅ Rotate it if exposed

---

## Need More Help?
See `DEPLOYMENT_GUIDE.md` for complete deployment instructions.
