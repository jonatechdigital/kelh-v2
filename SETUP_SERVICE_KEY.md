# Add Service Role Key for User Management

## 🔑 Required: Add Supabase Service Role Key

To allow admins to create users from the interface (without going to Supabase), you need to add the **Service Role Key** to your `.env.local` file.

## Steps:

### 1. Get Your Service Role Key

1. Go to: https://app.supabase.com/project/xorhevhwffqawrjahxjv/settings/api
2. Scroll down to **"Project API keys"**
3. Find **"service_role"** key (NOT the anon key)
4. Click the eye icon to reveal it
5. Click copy

**⚠️ IMPORTANT:** This key is SECRET - never commit it to git or share it publicly!

### 2. Add to .env.local

Open your `.env.local` file and add this line:

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Your `.env.local` should now look like:

```
NEXT_PUBLIC_SUPABASE_URL=https://xorhevhwffqawrjahxjv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_CvpTFWd7eQQhwOBTftWN-A_qJw9rsAU
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_from_supabase
```

### 3. Restart Your Dev Server

```bash
# Stop the server (Ctrl+C)
npm run dev
```

### 4. Test It

1. Go to http://localhost:3000
2. Click "Users" in the header
3. Fill out the "Create New User" form
4. Click "Create User"
5. User should be created instantly! ✅

## What This Enables:

✅ Create users from the app (no Supabase access needed)  
✅ Assign roles automatically during creation  
✅ Hospital owner can manage users easily  
✅ All done with proper admin authentication

## Security:

- Only admins can access the user management page
- Service role key is server-side only (never exposed to browser)
- All operations check admin permissions first

---

**Ready to test!** Just add that service role key and restart your server.
